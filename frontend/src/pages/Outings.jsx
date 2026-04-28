import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'
import { format } from 'date-fns'

const OUTING_TYPES = ['Day Trip', 'Overnight', 'Camping', 'Service Project', 'Activity', 'Other']
const STATUSES = ['planning', 'confirmed', 'completed', 'cancelled']

const STATUS_STYLES = {
  planning:  { color: '#7B5800', background: '#FFF8E1', border: '#FFD54F' },
  confirmed: { color: '#1B5E20', background: '#E8F5E9', border: '#A5D6A7' },
  completed: { color: '#424242', background: '#F5F5F5', border: '#BDBDBD' },
  cancelled: { color: '#B71C1C', background: '#FFEBEE', border: '#FFCDD2' },
}

const DEFAULT_CHECKLIST = [
  { label: 'Choose and confirm location', done: false },
  { label: 'Get council/charter org approval if needed', done: false },
  { label: 'Set date and time', done: false },
  { label: 'Create permission slip', done: false },
  { label: 'Send info to families (Band post)', done: false },
  { label: 'Collect permission slips', done: false },
  { label: 'Confirm headcount', done: false },
  { label: 'Arrange transportation', done: false },
  { label: 'First aid kit assigned', done: false },
  { label: 'Emergency contact list printed', done: false },
]

function Badge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.planning
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      color: s.color, background: s.background, border: `0.5px solid ${s.border}`,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}

function TypeBadge({ type }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
      color: 'var(--navy)', background: 'rgba(0,48,135,0.08)',
      border: '0.5px solid rgba(0,48,135,0.15)', whiteSpace: 'nowrap',
    }}>
      {type}
    </span>
  )
}

function GearList({ value, onChange }) {
  const items = (() => { try { return JSON.parse(value || '[]') } catch { return [] } })()
  const [input, setInput] = useState('')

  function addItem() {
    const trimmed = input.trim()
    if (!trimmed) return
    onChange(JSON.stringify([...items, trimmed]))
    setInput('')
  }

  function removeItem(idx) {
    onChange(JSON.stringify(items.filter((_, i) => i !== idx)))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {items.map((item, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'var(--bg)', border: '0.5px solid var(--border)',
            borderRadius: 99, padding: '3px 10px', fontSize: 12,
          }}>
            {item}
            <button onClick={() => removeItem(i)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: 0, fontSize: 13, lineHeight: 1,
            }}>✕</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Add item..."
          style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
        />
        <button className="btn" style={{ fontSize: 12, padding: '5px 10px' }} onClick={addItem}>+ Add</button>
      </div>
    </div>
  )
}

function ChecklistEditor({ value, onChange }) {
  const items = (() => { try { return JSON.parse(value || '[]') } catch { return [] } })()
  const [newLabel, setNewLabel] = useState('')

  function toggle(idx) {
    const updated = items.map((it, i) => i === idx ? { ...it, done: !it.done } : it)
    onChange(JSON.stringify(updated))
  }

  function addItem() {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    onChange(JSON.stringify([...items, { label: trimmed, done: false }]))
    setNewLabel('')
  }

  function removeItem(idx) {
    onChange(JSON.stringify(items.filter((_, i) => i !== idx)))
  }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--border)' }}>
          <div
            onClick={() => toggle(i)}
            style={{
              width: 18, height: 18, borderRadius: 3, border: '0.5px solid var(--border)',
              background: item.done ? '#EAF3DE' : 'transparent', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#2E7D32', cursor: 'pointer',
            }}
          >
            {item.done ? '✓' : ''}
          </div>
          <span style={{ flex: 1, fontSize: 13, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-secondary)' : 'var(--text)' }}>
            {item.label}
          </span>
          <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Add checklist item..."
          style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
        />
        <button className="btn" style={{ fontSize: 12, padding: '5px 10px' }} onClick={addItem}>+ Add</button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10, paddingBottom: 6, borderBottom: '0.5px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function FormRow({ label, children, half }) {
  return (
    <div style={{ marginBottom: 10, flex: half ? '1 1 48%' : '1 1 100%', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  )
}

const INPUT_STYLE = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  border: '0.5px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 13,
}

const SELECT_STYLE = { ...INPUT_STYLE }

function OutingForm({ outing, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    outing_type: 'Day Trip',
    status: 'planning',
    date_start: '',
    date_end: '',
    location_name: '',
    location_address: '',
    meeting_time: '',
    return_time: '',
    cost_scout: '',
    cost_adult: '',
    cost_notes: '',
    max_participants: '',
    min_participants: '',
    transportation: '',
    gear_needed: '[]',
    permission_slip_needed: true,
    permission_slip_notes: '',
    medical_form_needed: false,
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    reservation_url: '',
    reservation_confirmation: '',
    notes: '',
    checklist: JSON.stringify(DEFAULT_CHECKLIST),
    ...outing,
  })
  const [saving, setSaving] = useState(false)
  const [sgModal, setSgModal] = useState(null)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }
  function setCheck(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.checked }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        ...form,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        min_participants: form.min_participants ? parseInt(form.min_participants) : null,
        date_start: form.date_start || null,
        date_end: form.date_end || null,
      }
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  async function handleSGClick() {
    if (!outing?.id) return
    const { data } = await api.get(`/outings/${outing.id}/signup-genius-url`)
    window.open(data.signup_genius_url, '_blank')
    setSgModal(data.prefill_text)
  }

  async function handleHandout() {
    if (!outing?.id) return
    const resp = await api.get(`/outings/${outing.id}/handout`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([resp.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.name.replace(/\s+/g, '_')}_Info.docx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div style={{ background: 'var(--card-bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
      {sgModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setSgModal(null)}>
          <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 24, maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Copy these details into SignupGenius:</div>
            <pre style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 12 }}>{sgModal}</pre>
            <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(sgModal); setSgModal(null) }}>Copy & Close</button>
          </div>
        </div>
      )}

      <Section title="Basics">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 12px' }}>
          <FormRow label="Outing Name" >
            <input style={INPUT_STYLE} value={form.name} onChange={set('name')} placeholder="e.g. Bald Eagle State Park Day Hike" />
          </FormRow>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <FormRow label="Type" half>
              <select style={SELECT_STYLE} value={form.outing_type} onChange={set('outing_type')}>
                {OUTING_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Status" half>
              <select style={SELECT_STYLE} value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </FormRow>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <FormRow label="Start Date" half>
              <input type="date" style={INPUT_STYLE} value={form.date_start || ''} onChange={set('date_start')} />
            </FormRow>
            <FormRow label="End Date" half>
              <input type="date" style={INPUT_STYLE} value={form.date_end || ''} onChange={set('date_end')} />
            </FormRow>
          </div>
        </div>
      </Section>

      <Section title="Location & Timing">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <FormRow label="Location Name">
            <input style={INPUT_STYLE} value={form.location_name} onChange={set('location_name')} />
          </FormRow>
          <FormRow label="Address">
            <input style={INPUT_STYLE} value={form.location_address} onChange={set('location_address')} />
          </FormRow>
          <FormRow label="Meeting Time" half>
            <input style={INPUT_STYLE} value={form.meeting_time} onChange={set('meeting_time')} placeholder="e.g. 8:00 AM" />
          </FormRow>
          <FormRow label="Return Time" half>
            <input style={INPUT_STYLE} value={form.return_time} onChange={set('return_time')} placeholder="e.g. 4:00 PM" />
          </FormRow>
        </div>
      </Section>

      <Section title="Costs & Participants">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <FormRow label="Cost per Scout" half>
            <input style={INPUT_STYLE} value={form.cost_scout} onChange={set('cost_scout')} placeholder="e.g. $15" />
          </FormRow>
          <FormRow label="Cost per Adult" half>
            <input style={INPUT_STYLE} value={form.cost_adult} onChange={set('cost_adult')} />
          </FormRow>
          <FormRow label="Cost Notes">
            <input style={INPUT_STYLE} value={form.cost_notes} onChange={set('cost_notes')} />
          </FormRow>
          <FormRow label="Min Participants" half>
            <input type="number" style={INPUT_STYLE} value={form.min_participants} onChange={set('min_participants')} />
          </FormRow>
          <FormRow label="Max Participants" half>
            <input type="number" style={INPUT_STYLE} value={form.max_participants} onChange={set('max_participants')} />
          </FormRow>
        </div>
      </Section>

      <Section title="Logistics">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <FormRow label="Transportation">
            <input style={INPUT_STYLE} value={form.transportation} onChange={set('transportation')} />
          </FormRow>
          <FormRow label="Reservation URL">
            <input style={INPUT_STYLE} value={form.reservation_url} onChange={set('reservation_url')} />
          </FormRow>
          <FormRow label="Reservation Confirmation #">
            <input style={INPUT_STYLE} value={form.reservation_confirmation} onChange={set('reservation_confirmation')} />
          </FormRow>
          <FormRow label="Contact Name" half>
            <input style={INPUT_STYLE} value={form.contact_name} onChange={set('contact_name')} />
          </FormRow>
          <FormRow label="Contact Phone" half>
            <input style={INPUT_STYLE} value={form.contact_phone} onChange={set('contact_phone')} />
          </FormRow>
          <FormRow label="Contact Email">
            <input style={INPUT_STYLE} value={form.contact_email} onChange={set('contact_email')} />
          </FormRow>
        </div>
      </Section>

      <Section title="Requirements">
        <div style={{ display: 'flex', gap: 24, marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.permission_slip_needed} onChange={setCheck('permission_slip_needed')} />
            Permission slip needed
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.medical_form_needed} onChange={setCheck('medical_form_needed')} />
            Medical form needed
          </label>
        </div>
        {form.permission_slip_needed && (
          <FormRow label="Permission Slip Notes">
            <input style={INPUT_STYLE} value={form.permission_slip_notes} onChange={set('permission_slip_notes')} />
          </FormRow>
        )}
      </Section>

      <Section title="Gear List">
        <GearList value={form.gear_needed} onChange={v => setForm(f => ({ ...f, gear_needed: v }))} />
      </Section>

      <Section title="Planning Checklist">
        <ChecklistEditor value={form.checklist} onChange={v => setForm(f => ({ ...f, checklist: v }))} />
      </Section>

      <Section title="Notes">
        <textarea
          style={{ ...INPUT_STYLE, minHeight: 80 }}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Any additional notes..."
        />
      </Section>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: '0.5px solid var(--border)' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {outing?.id && (
          <>
            <button className="btn" onClick={handleHandout}>Download Info Sheet</button>
            <button className="btn" onClick={handleSGClick}>SignupGenius ↗</button>
          </>
        )}
        <button className="btn" onClick={onCancel}>Cancel</button>
        {outing?.id && (
          <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => onDelete(outing.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

export default function Outings() {
  const [outings, setOutings] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)  // null=list, 'new'=new form, {id,...}=edit
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/outings/')
      setOutings(data)
    } catch {}
    setLoading(false)
  }

  const filtered = statusFilter === 'All'
    ? outings
    : outings.filter(o => o.status === statusFilter.toLowerCase())

  async function handleSave(formData) {
    try {
      if (selected?.id) {
        const { data } = await api.patch(`/outings/${selected.id}`, formData)
        setOutings(os => os.map(o => o.id === data.id ? data : o))
        setSelected(data)
      } else {
        const { data } = await api.post('/outings/', formData)
        setOutings(os => [data, ...os])
        setSelected(data)
      }
    } catch (e) {
      alert('Save failed: ' + (e?.response?.data?.detail || e.message))
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this outing? This cannot be undone.')) return
    await api.delete(`/outings/${id}`)
    setOutings(os => os.filter(o => o.id !== id))
    setSelected(null)
  }

  function fmtDate(d) {
    if (!d) return ''
    return format(new Date(d + 'T12:00:00'), 'MMM d, yyyy')
  }

  if (selected !== null) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
          <button className="btn" onClick={() => setSelected(null)}>← Back</button>
          <h1 style={{ fontSize: 18, fontWeight: 500 }}>
            {selected === 'new' ? 'New Outing' : selected.name}
          </h1>
        </div>
        <OutingForm
          outing={selected === 'new' ? null : selected}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={() => setSelected(null)}
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, flex: 1 }}>Outing Planner</h1>
        <button className="btn btn-primary" onClick={() => setSelected('new')}>+ New Outing</button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['All', 'Planning', 'Confirmed', 'Completed', 'Cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
              border: '0.5px solid var(--border)', cursor: 'pointer',
              background: statusFilter === s ? 'var(--navy)' : 'var(--card-bg)',
              color: statusFilter === s ? 'white' : 'var(--text)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          {statusFilter === 'All' ? 'No outings yet. Create one to get started.' : `No ${statusFilter.toLowerCase()} outings.`}
        </div>
      )}

      {filtered.map(o => (
        <div
          key={o.id}
          className="card"
          style={{ cursor: 'pointer', marginBottom: '0.75rem' }}
          onClick={() => setSelected(o)}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{o.name}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                <TypeBadge type={o.outing_type} />
                <Badge status={o.status} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                {o.date_start && <span>{fmtDate(o.date_start)}{o.date_end && o.date_end !== o.date_start ? ` – ${fmtDate(o.date_end)}` : ''} · </span>}
                {o.location_name && <span>{o.location_name} · </span>}
                {o.cost_scout && <span>{o.cost_scout}/scout</span>}
              </div>
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: 16 }}>›</span>
          </div>
        </div>
      ))}
    </div>
  )
}
