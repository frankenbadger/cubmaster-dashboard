import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../hooks/useAuth'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
const UNASSIGNED = 'Other'

function groupByWeek(tasks) {
  const groups = {}
  for (const task of tasks) {
    const week = WEEKS.includes(task.due_reminder) ? task.due_reminder : UNASSIGNED
    if (!groups[week]) groups[week] = []
    groups[week].push(task)
  }
  return groups
}

function SubtaskList({ subtasks, onChange }) {
  const items = (() => { try { return JSON.parse(subtasks || '[]') } catch { return [] } })()
  const [newLabel, setNewLabel] = useState('')

  function toggle(idx) {
    const updated = items.map((it, i) => i === idx ? { ...it, done: !it.done } : it)
    onChange(JSON.stringify(updated))
  }

  function add() {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    onChange(JSON.stringify([...items, { label: trimmed, done: false }]))
    setNewLabel('')
  }

  function remove(idx) {
    onChange(JSON.stringify(items.filter((_, i) => i !== idx)))
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
        Subtasks
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '0.5px solid var(--border)' }}>
          <div
            onClick={() => toggle(i)}
            style={{
              width: 16, height: 16, borderRadius: 3, border: '0.5px solid var(--border)',
              background: item.done ? '#EAF3DE' : 'transparent', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#2E7D32', cursor: 'pointer',
            }}
          >
            {item.done ? '✓' : ''}
          </div>
          <span style={{ flex: 1, fontSize: 12, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-secondary)' : 'var(--text)' }}>
            {item.label}
          </span>
          <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add subtask…"
          style={{ flex: 1, padding: '4px 7px', borderRadius: 5, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
        />
        <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={add}>+ Add</button>
      </div>
    </div>
  )
}

function TaskCard({ task, onToggle, onSaveNotes, highlight }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(task.notes || '')
  const [subtasks, setSubtasks] = useState(task.subtasks || '[]')
  const [saving, setSaving] = useState(false)
  const cardRef = useRef()

  useEffect(() => {
    if (highlight) {
      setExpanded(true)
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight])

  async function saveNotes() {
    setSaving(true)
    try {
      await onSaveNotes(task.id, { notes, subtasks })
    } finally {
      setSaving(false)
    }
  }

  function handleSubtasksChange(val) {
    setSubtasks(val)
  }

  async function handleSubtasksBlur(val) {
    await onSaveNotes(task.id, { notes, subtasks: val })
  }

  return (
    <div
      ref={cardRef}
      style={{
        background: 'var(--card-bg)',
        border: highlight ? '1.5px solid var(--navy)' : '0.5px solid var(--border)',
        borderRadius: 8,
        marginBottom: 6,
        overflow: 'hidden',
        transition: 'box-shadow .15s',
        boxShadow: highlight ? '0 0 0 3px rgba(0,48,135,0.1)' : 'none',
      }}
    >
      {/* Collapsed row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', cursor: 'pointer' }}>
        <div
          onClick={e => { e.stopPropagation(); onToggle(task) }}
          style={{
            width: 20, height: 20, borderRadius: 4, border: '0.5px solid var(--border)',
            background: task.done ? '#EAF3DE' : 'transparent', flexShrink: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#2E7D32',
          }}
        >
          {task.done ? '✓' : ''}
        </div>
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setExpanded(e => !e)}>
          <div style={{ fontSize: 14, textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.55 : 1 }}>
            {task.label}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {task.urgent && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#C62828', background: '#FFEBEE', padding: '1px 6px', borderRadius: 99, border: '0.5px solid #FFCDD2' }}>
                ! Urgent
              </span>
            )}
            <span style={{ fontSize: 11, color: task.urgent ? '#C62828' : 'var(--text-secondary)', fontWeight: task.urgent ? 600 : 400 }}>
              {task.tag}
            </span>
          </div>
        </div>
        <div onClick={() => setExpanded(e => !e)} style={{ color: 'var(--text-secondary)', fontSize: 14, transition: 'transform .15s', transform: expanded ? 'rotate(90deg)' : 'none', paddingTop: 2 }}>
          ›
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '0.5px solid var(--border)' }}>
          {task.due_reminder && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', background: 'rgba(0,48,135,0.08)', padding: '2px 8px', borderRadius: 99 }}>
                {task.due_reminder}
              </span>
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
              Notes
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add notes, context, or reminders…"
              style={{
                width: '100%', padding: '6px 8px', borderRadius: 6, minHeight: 70,
                border: '0.5px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 13, resize: 'vertical',
              }}
            />
            {saving && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Saving…</div>}
          </div>

          <SubtaskList
            subtasks={subtasks}
            onChange={async val => {
              setSubtasks(val)
              await handleSubtasksBlur(val)
            }}
          />

          {!task.done && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 12, fontSize: 12, padding: '5px 12px' }}
              onClick={() => onToggle(task)}
            >
              Mark Complete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function WeekGroup({ week, tasks, collapsedDefault, onToggle, onSaveNotes, highlightId }) {
  const [collapsed, setCollapsed] = useState(false)
  const done = tasks.filter(t => t.done).length
  const urgent = tasks.some(t => t.urgent && !t.done)

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.urgent && !b.urgent) return -1
    if (!a.urgent && b.urgent) return 1
    return 0
  })

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{week}</div>
        <span style={{
          fontSize: 11, padding: '1px 7px', borderRadius: 99, fontWeight: 500,
          background: done === tasks.length ? '#EAF3DE' : 'var(--bg)',
          color: done === tasks.length ? '#2E7D32' : 'var(--text-secondary)',
          border: '0.5px solid var(--border)',
        }}>
          {done}/{tasks.length}
        </span>
        {urgent && (
          <span style={{ fontSize: 11, color: '#C62828', fontWeight: 700 }}>!</span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: 13, transition: 'transform .15s', transform: collapsed ? 'none' : 'rotate(90deg)' }}>›</span>
      </div>
      {!collapsed && sortedTasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onToggle={onToggle}
          onSaveNotes={onSaveNotes}
          highlight={task.id === highlightId}
        />
      ))}
    </div>
  )
}

export default function Tasks() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight') ? parseInt(searchParams.get('highlight')) : null

  useEffect(() => { load() }, [year, month])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/tasks/${year}/${month}/initialize`)
      setTasks(data)
    } catch {
      // fallback to regular get
      try {
        const { data } = await api.get(`/tasks/${year}/${month}`)
        setTasks(data)
      } catch {}
    }
    setLoading(false)
  }

  async function toggleTask(task) {
    try {
      const { data } = await api.patch(`/tasks/${task.id}`, { done: !task.done })
      setTasks(ts => ts.map(t => t.id === task.id ? data : t))
    } catch {}
  }

  async function saveNotes(taskId, payload) {
    try {
      const { data } = await api.patch(`/tasks/${taskId}/notes`, payload)
      setTasks(ts => ts.map(t => t.id === taskId ? data : t))
    } catch {}
  }

  const done = tasks.filter(t => t.done).length
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0
  const groups = groupByWeek(tasks)
  const weekOrder = [...WEEKS.filter(w => groups[w]), ...(groups[UNASSIGNED] ? [UNASSIGNED] : [])]

  const yearOpts = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, flex: 1 }}>{MONTH_NAMES[month]} Tasks</h1>
        <select
          value={month}
          onChange={e => setMonth(parseInt(e.target.value))}
          style={{ padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
        >
          {MONTH_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
        </select>
        <select
          value={year}
          onChange={e => setYear(parseInt(e.target.value))}
          style={{ padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
        >
          {yearOpts.map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
          <span>{done} of {tasks.length} tasks done</span>
          <span style={{ fontWeight: 600, color: pct >= 75 ? '#2E7D32' : pct >= 40 ? '#E65100' : '#C62828' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 99, transition: 'width .3s',
            background: pct >= 75 ? '#4CAF50' : pct >= 40 ? '#FF9800' : '#F44336',
          }} />
        </div>
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading tasks…</p>}

      {!loading && tasks.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          No tasks for this month.
        </div>
      )}

      {weekOrder.map(week => (
        <WeekGroup
          key={week}
          week={week}
          tasks={groups[week]}
          onToggle={toggleTask}
          onSaveNotes={saveNotes}
          highlightId={highlightId}
        />
      ))}
    </div>
  )
}
