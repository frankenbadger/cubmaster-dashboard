import { useState, useEffect, useRef } from 'react'
import { api } from '../hooks/useAuth'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

const INPUT_STYLE = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  border: '0.5px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 13,
}

function LogoUploader({ onUploaded }) {
  const [info, setInfo] = useState(null)   // {exists, filename, size_kb}
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => { loadInfo() }, [])

  async function loadInfo() {
    try {
      const { data } = await api.get('/newsletters/logo')
      setInfo(data)
    } catch {}
  }

  async function handleFile(file) {
    if (!file) return
    setError('')
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      await api.post('/newsletters/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      await loadInfo()
      if (onUploaded) onUploaded()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removeLogo() {
    if (!window.confirm('Remove the pack logo?')) return
    try {
      await api.delete('/newsletters/logo')
      setInfo({ exists: false })
      if (onUploaded) onUploaded()
    } catch {}
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.gif,.svg,.webp"
        style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

      {info?.exists ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/api/newsletters/logo/file"
            alt="Pack logo"
            style={{ maxHeight: 56, maxWidth: 100, objectFit: 'contain',
              border: '0.5px solid var(--border)', borderRadius: 6, padding: 4, background: '#fff' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {info.filename}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{info.size_kb} KB</div>
          </div>
          <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }}
            onClick={() => fileRef.current?.click()} disabled={uploading}>
            Replace
          </button>
          <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }}
            onClick={removeLogo}>
            Remove
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', flex: 1 }}>
            No logo uploaded — using the CSS diamond placeholder
          </div>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 10px', whiteSpace: 'nowrap' }}
            onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload Logo'}
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#C62828' }}>{error}</div>
      )}
      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
        PNG, JPG, SVG, or WebP · max 4 MB · stored once, used in all newsletters
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
      textTransform: 'uppercase', letterSpacing: '.05em',
      marginBottom: 8, paddingBottom: 6, borderBottom: '0.5px solid var(--border)',
    }}>
      {children}
    </div>
  )
}

function EventList({ value, onChange }) {
  const items = (() => { try { return JSON.parse(value || '[]') } catch { return [] } })()

  function update(idx, field, val) {
    const updated = items.map((it, i) => i === idx ? { ...it, [field]: val } : it)
    onChange(JSON.stringify(updated))
  }

  function addItem() {
    onChange(JSON.stringify([...items, { date: '', time: '', name: '', location: '' }]))
  }

  function removeItem(idx) {
    onChange(JSON.stringify(items.filter((_, i) => i !== idx)))
  }

  return (
    <div>
      {items.map((ev, i) => (
        <div key={i} style={{ marginBottom: 10, padding: 10, background: 'var(--bg)', borderRadius: 8, border: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input placeholder="Date (e.g. Dec 5)" style={{ ...INPUT_STYLE, flex: 1 }} value={ev.date || ''} onChange={e => update(i, 'date', e.target.value)} />
            <input placeholder="Time" style={{ ...INPUT_STYLE, flex: 1 }} value={ev.time || ''} onChange={e => update(i, 'time', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input placeholder="Event Name" style={{ ...INPUT_STYLE, flex: 2 }} value={ev.name || ''} onChange={e => update(i, 'name', e.target.value)} />
            <input placeholder="Location" style={{ ...INPUT_STYLE, flex: 2 }} value={ev.location || ''} onChange={e => update(i, 'location', e.target.value)} />
            <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, padding: '0 4px' }}>✕</button>
          </div>
        </div>
      ))}
      <button className="btn" style={{ fontSize: 12 }} onClick={addItem}>+ Add Event</button>
    </div>
  )
}

function BulletList({ value, onChange, placeholder }) {
  const items = (() => { try { return JSON.parse(value || '[]') } catch { return [] } })()

  function update(idx, val) {
    onChange(JSON.stringify(items.map((it, i) => i === idx ? val : it)))
  }

  function addItem() {
    onChange(JSON.stringify([...items, '']))
  }

  function removeItem(idx) {
    onChange(JSON.stringify(items.filter((_, i) => i !== idx)))
  }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            style={{ ...INPUT_STYLE, flex: 1 }}
            value={item}
            onChange={e => update(i, e.target.value)}
            placeholder={placeholder || 'Item…'}
          />
          <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, padding: '0 4px' }}>✕</button>
        </div>
      ))}
      <button className="btn" style={{ fontSize: 12 }} onClick={addItem}>+ Add Item</button>
    </div>
  )
}

export default function Newsletter() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [form, setForm] = useState({
    date_range_label: '',
    monthly_notes: '',
    events: '[]',
    fundraising_items: '[]',
    update_items: '[]',
    extra_calendar_events: '[]',
    band_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const iframeRef = useRef()

  useEffect(() => { load() }, [year, month])

  async function load() {
    try {
      const { data } = await api.get(`/newsletters/${year}/${month}`)
      setForm({
        date_range_label: data.date_range_label || '',
        monthly_notes: data.monthly_notes || '',
        events: data.events || '[]',
        fundraising_items: data.fundraising_items || '[]',
        update_items: data.update_items || '[]',
        extra_calendar_events: data.extra_calendar_events || '[]',
        band_url: data.band_url || '',
      })
    } catch {}
  }

  function set(field) {
    return val => setForm(f => ({ ...f, [field]: typeof val === 'string' ? val : val.target.value }))
  }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/newsletters/${year}/${month}`, form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function refreshPreview() {
    if (iframeRef.current) {
      iframeRef.current.src = `/api/newsletters/${year}/${month}/preview?t=${Date.now()}`
    }
  }

  async function saveAndRefresh() {
    await save()
    refreshPreview()
  }

  async function downloadHtml() {
    const resp = await api.get(`/newsletters/${year}/${month}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'text/html' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `Pack44_Newsletter_${MONTH_NAMES[month]}_${year}.html`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const yearOpts = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', maxWidth: '100%' }}>
      {/* ── Editor panel ── */}
      <div style={{ flex: '0 0 420px', minWidth: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: '1rem' }}>Newsletter Generator</h1>

        {/* Logo */}
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <SectionLabel>Pack Logo</SectionLabel>
          <LogoUploader onUploaded={refreshPreview} />
        </div>

        {/* Month/year selector */}
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <select style={{ ...INPUT_STYLE, width: 'auto' }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {MONTH_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
            <select style={{ ...INPUT_STYLE, width: 'auto' }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {yearOpts.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>Date Range Label</div>
            <input style={INPUT_STYLE} value={form.date_range_label} onChange={set('date_range_label')} placeholder="e.g. Dec 2025 – Jan 2026" />
          </div>
        </div>

        {/* Monthly Notes */}
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <SectionLabel>Monthly Notes</SectionLabel>
          <textarea
            style={{ ...INPUT_STYLE, minHeight: 100 }}
            value={form.monthly_notes}
            onChange={set('monthly_notes')}
            placeholder="Your monthly message to families…"
          />
        </div>

        {/* Upcoming Events */}
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <SectionLabel>Upcoming Events (Page 1)</SectionLabel>
          <EventList value={form.events} onChange={set('events')} />
        </div>

        {/* Fundraising */}
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <SectionLabel>Fundraising</SectionLabel>
          <BulletList value={form.fundraising_items} onChange={set('fundraising_items')} placeholder="Fundraising item…" />
        </div>

        {/* Important Updates */}
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <SectionLabel>Important Updates</SectionLabel>
          <BulletList value={form.update_items} onChange={set('update_items')} placeholder="Update item…" />
        </div>

        {/* Extra calendar events (page 2 only) */}
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <SectionLabel>Extra Calendar Events (Page 2 only)</SectionLabel>
          <EventList value={form.extra_calendar_events} onChange={set('extra_calendar_events')} />
        </div>

        {/* Band URL */}
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <SectionLabel>Band Group URL</SectionLabel>
          <input style={INPUT_STYLE} value={form.band_url} onChange={set('band_url')} placeholder="https://band.us/..." />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
          <button className="btn" onClick={downloadHtml}>Download HTML</button>
          <button className="btn" onClick={saveAndRefresh}>Refresh Preview</button>
          <a
            href={`/api/newsletters/${year}/${month}/preview`}
            target="_blank"
            rel="noreferrer"
            className="btn"
            style={{ textDecoration: 'none' }}
          >
            Open Preview ↗
          </a>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
          Print from your browser to save as PDF (Ctrl+P / Cmd+P)
        </p>
      </div>

      {/* ── Preview panel ── */}
      <div style={{ flex: 1, minWidth: 0, position: 'sticky', top: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Preview</div>
          <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={saveAndRefresh}>Refresh</button>
        </div>
        <iframe
          ref={iframeRef}
          src={`/api/newsletters/${year}/${month}/preview`}
          style={{
            width: '100%',
            height: '80vh',
            border: '0.5px solid var(--border)',
            borderRadius: 8,
            background: 'white',
          }}
          title="Newsletter Preview"
        />
      </div>
    </div>
  )
}
