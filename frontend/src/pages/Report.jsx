import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

const DENS = ['Lions', 'Tigers', 'Wolves', 'Bears', 'Webelos', 'AOL']

const OUTING_TYPES = ['Day Trip', 'Overnight', 'Camping', 'Service Project', 'Activity', 'Other']

const OPTIONAL_SECTIONS = {
  '1.2': { label: '1.2 Additional Meeting Notes', group: 1 },
  '1.3': { label: '1.3 Training / Leader Development', group: 1 },
  '2.1': { label: '2.1 Den Assignments', group: 2 },
  '3.1': { label: '3.1 Council Events of Interest', group: 3 },
  '5.1': { label: '5.1 Membership & Recruitment', group: 5 },
  '5.2': { label: '5.2 Financial Notes', group: 5 },
}

function parseNotesField(raw) {
  if (!raw || !raw.startsWith('__sections__')) return { added: [], content: {}, notes: raw || '' }
  const rest = raw.slice('__sections__'.length)
  const nl = rest.indexOf('\n')
  const jsonStr = nl === -1 ? rest : rest.slice(0, nl)
  const notes  = nl === -1 ? '' : rest.slice(nl + 1)
  try {
    const { added = [], ...content } = JSON.parse(jsonStr)
    return { added, content, notes }
  } catch {
    return { added: [], content: {}, notes: raw }
  }
}

function buildNotesField(added, content, notes) {
  if (!added.length) return notes
  const data = { added }
  for (const k of added) data[k] = content[k] || ''
  return `__sections__${JSON.stringify(data)}\n${notes}`
}

export default function Report() {
  const now = new Date()
  const [year, setYear]     = useState(now.getFullYear())
  const [month, setMonth]   = useState(now.getMonth())
  const [form, setForm]     = useState({})
  const [denUpdates, setDenUpdates]       = useState({})
  const [addedSections, setAddedSections] = useState([])
  const [sectionContent, setSectionContent] = useState({})
  const [plainNotes, setPlainNotes]       = useState('')
  const [outings, setOutings]             = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [openDropdown, setOpenDropdown]   = useState(null)

  useEffect(() => { loadReport() }, [year, month])

  async function loadReport() {
    try {
      const { data } = await api.get(`/reports/${year}/${month}`)
      setForm(data)
      setDenUpdates(data.den_updates ? JSON.parse(data.den_updates) : {})
      const { added, content, notes } = parseNotesField(data.notes)
      setAddedSections(added)
      setSectionContent(content)
      setPlainNotes(notes)
      setOutings(data.potential_outings ? JSON.parse(data.potential_outings) : [])
    } catch {}
  }

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); setSaved(false) }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/reports/${year}/${month}`, {
        year, month, ...form,
        den_updates:       JSON.stringify(denUpdates),
        notes:             buildNotesField(addedSections, sectionContent, plainNotes),
        potential_outings: JSON.stringify(outings),
      })
      setSaved(true)
    } finally { setSaving(false) }
  }

  async function download() {
    await save()
    const res = await api.get(`/reports/${year}/${month}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url; a.download = `Cubmasters_Report_${MONTH_NAMES[month]}_${year}.docx`; a.click()
    URL.revokeObjectURL(url)
  }

  function addSection(key) { setAddedSections(a => [...a, key]); setOpenDropdown(null); setSaved(false) }
  function removeSection(key) {
    setAddedSections(a => a.filter(k => k !== key))
    setSectionContent(c => { const n = { ...c }; delete n[key]; return n })
    setSaved(false)
  }
  function updateSectionContent(key, val) { setSectionContent(c => ({ ...c, [key]: val })); setSaved(false) }

  function addOuting() {
    setOutings(o => [...o, { name: '', type: 'Day Trip', timeframe: '', cost: '', notes: '' }])
    setSaved(false)
  }
  function updateOuting(i, field, val) { setOutings(o => o.map((x, idx) => idx === i ? { ...x, [field]: val } : x)); setSaved(false) }
  function removeOuting(i) { setOutings(o => o.filter((_, idx) => idx !== i)); setSaved(false) }

  function availableForGroup(group) {
    return Object.entries(OPTIONAL_SECTIONS)
      .filter(([key, s]) => s.group === group && !addedSections.includes(key))
      .map(([key, s]) => ({ key, label: s.label }))
  }

  const inputStyle = {
    width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 13,
    border: '0.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)',
  }

  // Renders any added optional sections for a group + the dropdown add button
  function addSectionControls(group) {
    const available = availableForGroup(group)
    const mine = addedSections.filter(k => OPTIONAL_SECTIONS[k]?.group === group)
    const isOpen = openDropdown === group
    return (
      <div key={`ctrl-${group}`}>
        {mine.map(key => (
          <div key={key} className="card" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{OPTIONAL_SECTIONS[key].label}</div>
              <button onClick={() => removeSection(key)}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
            <textarea rows={4} value={sectionContent[key] || ''}
              onChange={e => updateSectionContent(key, e.target.value)}
              placeholder="Notes…"
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        ))}
        {available.length > 0 && (
          <div style={{ position: 'relative', marginBottom: '0.75rem', display: 'inline-block' }}
            onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpenDropdown(isOpen ? null : group)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px dashed var(--border)',
                background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
              + Add Section ▾
            </button>
            {isOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: 4,
                background: 'var(--card-bg)', border: '0.5px solid var(--border)',
                borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 260, overflow: 'hidden' }}>
                {available.map(({ key, label }) => (
                  <button key={key} onClick={() => addSection(key)}
                    style={{ width: '100%', padding: '9px 14px', textAlign: 'left',
                      background: 'none', border: 'none', borderBottom: '0.5px solid var(--border)',
                      cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const cardStyle = { marginBottom: '0.75rem' }
  const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }

  return (
    <div onClick={() => setOpenDropdown(null)}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Monthly Report</h1>
        <select value={month} onChange={e => setMonth(+e.target.value)}
          style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--border)' }}>
          {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={e => setYear(+e.target.value)}
          style={{ width: 72, fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--border)' }} />
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
        <button className="btn btn-primary" onClick={download}>Download .docx</button>
      </div>

      {/* 1. Monthly Review */}
      <div className="card" style={cardStyle}>
        <div className="card-title">1. Monthly Review</div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: 'var(--text)' }}>
          1.1 Last Pack Meeting{form.last_meeting_name ? ` – ${form.last_meeting_name}` : ''}
        </div>
        <Field label="Meeting Name / Theme" value={form.last_meeting_name}
          onChange={v => set('last_meeting_name', v)} placeholder="e.g. Pinewood Derby" />
        <Field label="Summary" value={form.last_meeting_summary}
          onChange={v => set('last_meeting_summary', v)} />
        <Field label="Attendance" value={form.last_meeting_attendance}
          onChange={v => set('last_meeting_attendance', v)} placeholder="e.g. 48 Scouts / 10 Family Cars" />
        <Field label="Went Well" value={form.last_meeting_went_well}
          onChange={v => set('last_meeting_went_well', v)} multiline placeholder="One item per line" />
        <Field label="Needs Improvement" value={form.last_meeting_needs_improvement}
          onChange={v => set('last_meeting_needs_improvement', v)} multiline placeholder="One item per line" />
      </div>
      {addSectionControls(1)}

      {/* 2. Upcoming Pack Meeting */}
      <div className="card" style={cardStyle}>
        <div className="card-title">2. Upcoming Pack Meeting</div>
        <Field label="Program" value={form.upcoming_meeting_program}
          onChange={v => set('upcoming_meeting_program', v)} placeholder="e.g. Blue and Gold Banquet" />
        <Field label="Agenda Notes" value={form.upcoming_meeting_agenda}
          onChange={v => set('upcoming_meeting_agenda', v)} multiline />
      </div>
      {addSectionControls(2)}

      {/* 3. Upcoming Events */}
      <div className="card" style={cardStyle}>
        <div className="card-title">3. Upcoming Events</div>
        <Field label="" value={form.upcoming_events}
          onChange={v => set('upcoming_events', v)} multiline placeholder="One event per line" />
      </div>
      {addSectionControls(3)}

      {/* 4. Den Updates */}
      <div className="card" style={cardStyle}>
        <div className="card-title">4. Den Updates</div>
        {DENS.map(den => (
          <div key={den} style={{ marginBottom: 12 }}>
            <label style={{ ...labelStyle, fontWeight: 600, fontSize: 13 }}>{den}</label>
            <textarea rows={4} value={denUpdates[den] || ''}
              onChange={e => { setDenUpdates(d => ({ ...d, [den]: e.target.value })); setSaved(false) }}
              placeholder="e.g. Kids doing great with hands-on stuff. Craig out for baseball — already coordinated."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        ))}
      </div>

      {/* 5. Notes */}
      <div className="card" style={cardStyle}>
        <div className="card-title">5. Notes</div>
        <textarea rows={5} value={plainNotes}
          onChange={e => { setPlainNotes(e.target.value); setSaved(false) }}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      {addSectionControls(5)}

      {/* 6. Potential Outings */}
      <div className="card" style={cardStyle}>
        <div className="card-title">6. Potential Outings</div>
        {outings.map((outing, i) => (
          <div key={i} style={{ border: '0.5px solid var(--border)', borderRadius: 8,
            padding: 12, marginBottom: 10, position: 'relative' }}>
            <button onClick={() => removeOuting(i)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1, padding: '0 4px' }}>
              ×
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', paddingRight: 28 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Name / Title</label>
                <input value={outing.name || ''} onChange={e => updateOuting(i, 'name', e.target.value)}
                  placeholder="e.g. Hawk Mountain Hike" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={outing.type || 'Day Trip'} onChange={e => updateOuting(i, 'type', e.target.value)}
                  style={inputStyle}>
                  {OUTING_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Suggested Timeframe</label>
                <input value={outing.timeframe || ''} onChange={e => updateOuting(i, 'timeframe', e.target.value)}
                  placeholder="e.g. Spring 2026" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Est. Cost / Scout</label>
                <input value={outing.cost || ''} onChange={e => updateOuting(i, 'cost', e.target.value)}
                  placeholder="e.g. $15–20" style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notes / Why It Would Be Good</label>
                <textarea rows={2} value={outing.notes || ''} onChange={e => updateOuting(i, 'notes', e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          </div>
        ))}
        <button onClick={addOuting}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1.5px dashed var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
          + Add Outing Idea
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, multiline, placeholder, rows = 3 }) {
  const style = {
    width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 13, marginBottom: 10,
    border: '0.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)',
  }
  return (
    <div>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>{label}</label>}
      {multiline
        ? <textarea rows={rows} value={value || ''} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} style={{ ...style, resize: 'vertical' }} />
        : <input value={value || ''} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} style={style} />}
    </div>
  )
}
