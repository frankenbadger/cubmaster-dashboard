import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

const DENS = ['Lions','Tigers','Wolves','Bears','Webelos','AOL']

export default function Report() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [form, setForm]   = useState({})
  const [denUpdates, setDenUpdates] = useState({})
  const [extraSections, setExtraSections] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => { loadReport() }, [year, month])

  async function loadReport() {
    try {
      const { data } = await api.get(`/reports/${year}/${month}`)
      setForm(data)
      setDenUpdates(data.den_updates ? JSON.parse(data.den_updates) : {})
      setExtraSections(data.extra_sections ? JSON.parse(data.extra_sections) : [])
    } catch {}
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/reports/${year}/${month}`, {
        year, month, ...form,
        den_updates: JSON.stringify(denUpdates),
        extra_sections: JSON.stringify(extraSections),
      })
      setSaved(true)
    } finally { setSaving(false) }
  }

  async function download() {
    await save()
    const res = await api.get(`/reports/${year}/${month}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `Pack44_Report_${MONTH_NAMES[month]}_${year}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  function addSection(after) {
    setExtraSections(s => [...s, { title: '', content: '', after }])
    setSaved(false)
  }

  function updateSection(idx, field, value) {
    setExtraSections(s => s.map((x, i) => i === idx ? { ...x, [field]: value } : x))
    setSaved(false)
  }

  function removeSection(idx) {
    setExtraSections(s => s.filter((_, i) => i !== idx))
    setSaved(false)
  }

  // Renders extra sections that belong after a fixed section number, plus the add button
  function extrasAfter(after) {
    const mine = extraSections
      .map((s, i) => ({ ...s, _idx: i }))
      .filter(s => (s.after ?? 5) === after)

    return (
      <>
        {mine.map(sec => (
          <div key={sec._idx} className="card" style={{ marginBottom: '0.75rem', position: 'relative' }}>
            <button
              onClick={() => removeSection(sec._idx)}
              title="Remove section"
              style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1, padding: '0 4px' }}>
              ×
            </button>
            <div style={{ marginBottom: 8, paddingRight: 28 }}>
              <input
                value={sec.title}
                onChange={e => updateSection(sec._idx, 'title', e.target.value)}
                placeholder="Section title…"
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6,
                  border: '0.5px solid var(--border)', background: 'var(--card-bg)',
                  color: 'var(--text)', fontWeight: 600, fontSize: 14 }}
              />
            </div>
            <textarea
              rows={4}
              value={sec.content}
              onChange={e => updateSection(sec._idx, 'content', e.target.value)}
              placeholder="One item per line…"
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6,
                border: '0.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
            />
          </div>
        ))}
        <button
          onClick={() => addSection(after)}
          style={{ width: '100%', padding: '7px', borderRadius: 8, border: '1.5px dashed var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', fontSize: 12,
            cursor: 'pointer', marginBottom: '0.75rem' }}>
          + Add section here
        </button>
      </>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Monthly Report</h1>
        <select value={month} onChange={e => setMonth(+e.target.value)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--border)' }}>
          {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={e => setYear(+e.target.value)} style={{ width: 72, fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--border)' }} />
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}</button>
        <button className="btn btn-primary" onClick={download}>Download .docx</button>
      </div>

      <Section title="1. Last Pack Meeting">
        <Field label="Summary" value={form.last_meeting_summary} onChange={v => set('last_meeting_summary', v)} />
        <Field label="Attendance" value={form.last_meeting_attendance} onChange={v => set('last_meeting_attendance', v)} placeholder="e.g. 48 Cars / 10 Family Cars" />
        <Field label="Went Well" value={form.last_meeting_went_well} onChange={v => set('last_meeting_went_well', v)} multiline placeholder="One item per line" />
        <Field label="Needs Improvement" value={form.last_meeting_needs_improvement} onChange={v => set('last_meeting_needs_improvement', v)} multiline placeholder="One item per line" />
      </Section>
      {extrasAfter(1)}

      <Section title="2. Upcoming Pack Meeting">
        <Field label="Program" value={form.upcoming_meeting_program} onChange={v => set('upcoming_meeting_program', v)} placeholder="e.g. Blue and Gold Banquet" />
        <Field label="Agenda notes" value={form.upcoming_meeting_agenda} onChange={v => set('upcoming_meeting_agenda', v)} multiline />
      </Section>
      {extrasAfter(2)}

      <Section title="3. Upcoming Events">
        <Field label="Events" value={form.upcoming_events} onChange={v => set('upcoming_events', v)} multiline placeholder="One event per line" />
      </Section>
      {extrasAfter(3)}

      <Section title="4. Den Updates">
        {DENS.map(den => (
          <div key={den} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>{den}</label>
            <textarea
              rows={2}
              value={denUpdates[den] || ''}
              onChange={e => { setDenUpdates(d => ({ ...d, [den]: e.target.value })); setSaved(false) }}
              placeholder={`${den} den notes…`}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
            />
          </div>
        ))}
      </Section>
      {extrasAfter(4)}

      <Section title="5. Notes">
        <Field label="" value={form.notes} onChange={v => set('notes', v)} multiline rows={5} />
      </Section>
      {extrasAfter(5)}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="card-title">{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, multiline, placeholder, rows = 3 }) {
  const style = { width: '100%', padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', marginBottom: 10 }
  return (
    <div>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>{label}</label>}
      {multiline
        ? <textarea rows={rows} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />
        : <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />}
    </div>
  )
}
