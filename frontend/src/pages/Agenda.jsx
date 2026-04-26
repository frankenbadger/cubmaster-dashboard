import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

export default function Agenda() {
  const now = new Date()
  const [year, setYear]     = useState(now.getFullYear())
  const [month, setMonth]   = useState(now.getMonth())
  const [agenda, setAgenda] = useState([])
  const [theme, setTheme]   = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => { load() }, [year, month])

  async function load() {
    try {
      const { data } = await api.get(`/agenda/${year}/${month}`)
      setAgenda(data.agenda_json ? JSON.parse(data.agenda_json) : [])
      setTheme(data.theme || '')
      setMeetingDate(data.meeting_date || '')
      setNotes(data.notes || '')
    } catch {}
  }

  function updateItem(idx, field, value) {
    setAgenda(a => a.map((item, i) => i === idx ? { ...item, [field]: value } : item))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/agenda/${year}/${month}`, {
        year, month, theme, notes,
        meeting_date: meetingDate || null,
        agenda_json: JSON.stringify(agenda),
      })
      setSaved(true)
    } finally { setSaving(false) }
  }

  async function print() {
    await save()
    window.print()
  }

  const totalTime = agenda.reduce((s, a) => s + (parseInt(a.duration) || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Pack Meeting Agenda</h1>
        <select value={month} onChange={e => { setMonth(+e.target.value); setSaved(false) }}
          style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--border)' }}>
          {MONTH_NAMES.map((m,i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={e => { setYear(+e.target.value); setSaved(false) }}
          style={{ width: 72, fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--border)' }} />
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}</button>
        <button className="btn btn-primary" onClick={print}>Print</button>
      </div>

      <div className="card">
        <div className="card-title">Meeting details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Date</label>
            <input type="date" value={meetingDate} onChange={e => { setMeetingDate(e.target.value); setSaved(false) }}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Theme / program</label>
            <input value={theme} onChange={e => { setTheme(e.target.value); setSaved(false) }}
              placeholder="e.g. Blue and Gold Banquet"
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div className="card-title" style={{ margin: 0 }}>7-Part Agenda</div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total: {totalTime} min</span>
        </div>

        {agenda.map((item, idx) => (
          <div key={idx} style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--navy)', color: 'white',
                fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.part}
              </span>
              <input value={item.title} onChange={e => updateItem(idx, 'title', e.target.value)}
                style={{ flex: 1, fontWeight: 500, fontSize: 14, border: 'none', background: 'transparent', color: 'var(--text)', padding: 0 }} />
              <input type="number" value={item.duration} onChange={e => updateItem(idx, 'duration', e.target.value)}
                style={{ width: 48, fontSize: 12, textAlign: 'right', border: '0.5px solid var(--border)', borderRadius: 4, padding: '2px 6px', background: 'var(--card-bg)', color: 'var(--text)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>min</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingLeft: 32 }}>
              <input value={item.owner} onChange={e => updateItem(idx, 'owner', e.target.value)}
                placeholder="Owner"
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 5, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              <input value={item.notes} onChange={e => updateItem(idx, 'notes', e.target.value)}
                placeholder="Notes"
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 5, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Additional notes</div>
        <textarea rows={4} value={notes} onChange={e => { setNotes(e.target.value); setSaved(false) }}
          placeholder="Anything else for this meeting…"
          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
      </div>
    </div>
  )
}
