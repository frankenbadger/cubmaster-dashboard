import { useState, useEffect, useRef } from 'react'
import { api } from '../hooks/useAuth'
import { format, differenceInDays } from 'date-fns'

function Field({ label, value, field, docId, onSave, multiline }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')

  useEffect(() => { setVal(value || '') }, [value])

  function handleBlur() {
    setEditing(false)
    if (val !== (value || '')) onSave(docId, { [field]: val || null })
  }

  const style = {
    width: '100%', padding: '4px 6px', borderRadius: 5,
    border: '0.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
  }

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
      {editing ? (
        multiline
          ? <textarea rows={3} value={val} onChange={e => setVal(e.target.value)} onBlur={handleBlur}
              autoFocus style={{ ...style, resize: 'vertical' }} />
          : <input value={val} onChange={e => setVal(e.target.value)} onBlur={handleBlur}
              autoFocus style={style} />
      ) : (
        <div onClick={() => setEditing(true)}
          style={{ fontSize: 13, minHeight: 22, padding: '3px 6px', borderRadius: 5, cursor: 'text',
            border: '0.5px solid transparent', color: val ? 'var(--text)' : 'var(--text-secondary)',
            fontStyle: val ? 'normal' : 'italic' }}
          title="Click to edit">
          {val || `Add ${label.toLowerCase()}…`}
        </div>
      )}
    </div>
  )
}

export default function Documents() {
  const [docs, setDocs] = useState([])
  const [fullDocs, setFullDocs] = useState({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  useEffect(() => { loadList() }, [])

  async function loadList() {
    try {
      const r = await api.get('/documents/')
      setDocs(r.data)
    } catch {}
    setLoading(false)
  }

  async function loadFull(id) {
    if (fullDocs[id]) return
    try {
      const r = await api.get(`/documents/${id}`)
      setFullDocs(fd => ({ ...fd, [id]: r.data }))
    } catch {}
  }

  useEffect(() => {
    docs.forEach(d => loadFull(d.id))
  }, [docs])

  async function handleFile(file) {
    if (!file) return
    setUploadError('')
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await api.post('/documents/parse', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocs(ds => [{ id: data.id, filename: data.filename, event_name: data.event_name, start_date: data.start_date, uploaded_at: data.uploaded_at }, ...ds])
      setFullDocs(fd => ({ ...fd, [data.id]: data }))
    } catch (err) {
      setUploadError(err?.response?.data?.detail || 'Upload failed. Check the file and try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function patchDoc(id, patch) {
    try {
      const { data } = await api.patch(`/documents/${id}`, patch)
      setFullDocs(fd => ({ ...fd, [id]: data }))
      setDocs(ds => ds.map(d => d.id === id ? { ...d, event_name: data.event_name, start_date: data.start_date } : d))
    } catch {}
  }

  async function deleteDoc(id) {
    if (!window.confirm('Delete this document? This cannot be undone.')) return
    await api.delete(`/documents/${id}`)
    setDocs(ds => ds.filter(d => d.id !== id))
    setFullDocs(fd => { const copy = { ...fd }; delete copy[id]; return copy })
  }

  async function downloadHandout(doc) {
    try {
      const resp = await api.get(`/documents/${doc.id}/handout`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${(doc.event_name || 'handout').replace(/\s+/g, '_')}_Handout.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {}
  }

  function deadlineColor(d) {
    if (!d) return 'var(--text)'
    const days = differenceInDays(new Date(d + 'T12:00:00'), new Date())
    return days <= 14 ? '#C62828' : 'var(--text)'
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Documents</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Upload scouting docs to extract key info and generate family handouts
      </p>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{ border: `2px dashed ${dragOver ? 'var(--navy)' : 'var(--border)'}`,
          borderRadius: 10, padding: '2rem', textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
          marginBottom: '1rem', transition: 'border-color .15s',
          background: dragOver ? 'rgba(0,48,135,0.04)' : 'var(--card-bg)' }}>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
        {uploading ? (
          <div>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Parsing document…</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>This may take 10–20 seconds</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Drop a PDF or image here, or click to browse</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Accepts .pdf, .jpg, .png</div>
          </div>
        )}
      </div>

      {uploadError && (
        <div style={{ background: '#FFEBEE', border: '0.5px solid #FFCDD2', borderRadius: 8,
          padding: '10px 14px', marginBottom: '1rem', fontSize: 13, color: '#C62828' }}>
          {uploadError}
        </div>
      )}

      {!loading && docs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          No documents yet. Upload a camp packet or event flyer to get started.
        </div>
      )}

      {docs.map(summary => {
        const doc = fullDocs[summary.id]
        if (!doc) return (
          <div key={summary.id} className="card" style={{ marginBottom: '0.75rem', opacity: 0.6 }}>
            <div style={{ fontWeight: 500 }}>{summary.event_name || summary.filename}</div>
          </div>
        )

        const notes = (() => { try { return JSON.parse(doc.key_notes || '[]') } catch { return [] } })()
        const deadlineSoon = doc.registration_deadline && differenceInDays(new Date(doc.registration_deadline + 'T12:00:00'), new Date()) <= 14

        return (
          <div key={doc.id} className="card" style={{ marginBottom: '0.75rem' }}>
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{doc.event_name || doc.filename}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {doc.event_type && <span style={{ marginRight: 8 }}>{doc.event_type}</span>}
                  Uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                  {doc.uploaded_by && ` by ${doc.uploaded_by}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}
                  onClick={() => downloadHandout(summary)}>
                  Download Handout
                </button>
                <button className="btn btn-danger" style={{ fontSize: 12, padding: '5px 10px' }}
                  onClick={() => deleteDoc(doc.id)}>
                  Delete
                </button>
              </div>
            </div>

            {/* Editable fields grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
              <Field label="Event Name"  field="event_name"  value={doc.event_name}  docId={doc.id} onSave={patchDoc} />
              <Field label="Event Type"  field="event_type"  value={doc.event_type}  docId={doc.id} onSave={patchDoc} />
              <Field label="Start Date"  field="start_date"  value={doc.start_date}  docId={doc.id} onSave={patchDoc} />
              <Field label="End Date"    field="end_date"    value={doc.end_date}    docId={doc.id} onSave={patchDoc} />
              <Field label="Location"    field="location"    value={doc.location}    docId={doc.id} onSave={patchDoc} />
              <Field label="Address"     field="address"     value={doc.address}     docId={doc.id} onSave={patchDoc} />
              <Field label="Scout Cost"  field="cost_scout"  value={doc.cost_scout}  docId={doc.id} onSave={patchDoc} />
              <Field label="Adult Cost"  field="cost_adult"  value={doc.cost_adult}  docId={doc.id} onSave={patchDoc} />
              <Field label="Contact"     field="contact_name" value={doc.contact_name} docId={doc.id} onSave={patchDoc} />
              <Field label="Email"       field="contact_email" value={doc.contact_email} docId={doc.id} onSave={patchDoc} />
              <Field label="Phone"       field="contact_phone" value={doc.contact_phone} docId={doc.id} onSave={patchDoc} />
              <Field label="Register At" field="registration_url" value={doc.registration_url} docId={doc.id} onSave={patchDoc} />
              <Field label="Age Requirements" field="age_requirements" value={doc.age_requirements} docId={doc.id} onSave={patchDoc} />
            </div>

            {/* Registration deadline — highlighted if soon */}
            {doc.registration_deadline && (
              <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 6,
                background: deadlineSoon ? '#FFEBEE' : 'var(--bg)',
                border: `0.5px solid ${deadlineSoon ? '#FFCDD2' : 'var(--border)'}` }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: deadlineSoon ? '#C62828' : 'var(--text-secondary)' }}>
                  {deadlineSoon ? '⚠ ' : ''}Registration deadline: {format(new Date(doc.registration_deadline + 'T12:00:00'), 'MMMM d, yyyy')}
                  {deadlineSoon && ` — ${differenceInDays(new Date(doc.registration_deadline + 'T12:00:00'), new Date())} days away`}
                </span>
              </div>
            )}

            {/* Key notes */}
            {notes.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
                  Key Notes
                </div>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {notes.map((note, i) => (
                    <li key={i} style={{ fontSize: 13, marginBottom: 2 }}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Family summary */}
            {doc.family_summary && (
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8,
                background: 'var(--bg)', border: '0.5px solid var(--border)', fontStyle: 'italic', fontSize: 13 }}>
                {doc.family_summary}
              </div>
            )}

            {/* What to bring */}
            {doc.what_to_bring && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                  What to Bring
                </div>
                <div style={{ fontSize: 13 }}>{doc.what_to_bring}</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
