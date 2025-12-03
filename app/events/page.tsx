'use client'

import { ScheduleXCalendar, useNextCalendarApp } from '@schedule-x/react'
import { useEffect, useState, FormEvent } from 'react'
import {
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
} from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import 'temporal-polyfill/global'
import '@schedule-x/theme-default/dist/index.css'

type DbEvent = {
  id: number
  title: string
  description?: string | null
  startDate: string 
  endDate: string   
}

function dateOnlyFromIso(iso?: string | null) {
  if (!iso) return ''
  return iso.slice(0, 10) 
}

function toScheduleXEvent(e: DbEvent) {
  const dateOnly = (iso: string) => (iso ? iso.slice(0, 10) : iso)
  return {
    id: String(e.id),
    title: e.title,
    start: Temporal.PlainDate.from(dateOnly(e.startDate)),
    end: Temporal.PlainDate.from(dateOnly(e.endDate)),
  }
}

export default function EventsPage() {
  const eventsService = useState(() => createEventsServicePlugin())[0]

  const calendar = useNextCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()],
    events: [],
    plugins: [eventsService],
  })

  // local list state (keeps server-synced events for the list & edit form)
  const [events, setEvents] = useState<DbEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // form state (shared for create & edit)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('') 
  const [endDate, setEndDate] = useState('')     

  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // load events from server, populate local list and calendar
  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch('/api/events')
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load events')
        const data: DbEvent[] = await res.json()
        if (!mounted) return
        setEvents(data)
        // update calendar store
        eventsService.set(data.map(toScheduleXEvent))
      })
      .catch(err => {
        console.error(err)
        if (mounted) setError('Failed to load events')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [eventsService])

  // helper: refresh calendar from current local events 
  function refreshCalendarFromLocalEvents(latest: DbEvent[]) {
    eventsService.set(latest.map(toScheduleXEvent))
  }

  // clear form
  function clearForm() {
    setTitle('')
    setDescription('')
    setStartDate('')
    setEndDate('')
    setIsEditing(false)
    setEditingId(null)
    setError(null)
  }

  // CREATE
  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title || !startDate || !endDate) {
      setError('Please provide title, startDate and endDate.')
      return
    }

    const payload = { title, description, startDate, endDate }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Create failed')
      }
      const created: DbEvent = await res.json()

      const next = [...events, created].sort((a, b) => a.startDate.localeCompare(b.startDate))
      setEvents(next)
      refreshCalendarFromLocalEvents(next)
      clearForm()
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? 'Failed to create event')
    }
  }

  // PREPARE EDIT
  function startEdit(ev: DbEvent) {
    setIsEditing(true)
    setEditingId(ev.id)
    setTitle(ev.title)
    setDescription(ev.description ?? '')
    setStartDate(dateOnlyFromIso(ev.startDate))
    setEndDate(dateOnlyFromIso(ev.endDate))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // UPDATE
  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!editingId) {
      setError('No event selected for editing')
      return
    }
    if (!title || !startDate || !endDate) {
      setError('Please provide title, startDate and endDate.')
      return
    }

    const payload = { title, description, startDate, endDate }

    try {
      const res = await fetch(`/api/events?id=${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Update failed')
      }
      const updated: DbEvent = await res.json()
      const next = events.map(ev => (ev.id === updated.id ? updated : ev)).sort((a, b) => a.startDate.localeCompare(b.startDate))
      setEvents(next)
      refreshCalendarFromLocalEvents(next)
      clearForm()
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? 'Failed to update event')
    }
  }

  // DELETE
  async function handleDelete(id: number) {
    const ok = confirm('Delete this event?')
    if (!ok) return
    setError(null)

    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Delete failed')
      }
      const next = events.filter(ev => ev.id !== id)
      setEvents(next)
      refreshCalendarFromLocalEvents(next)
      // if user deleted the one being edited, clear form
      if (editingId === id) clearForm()
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? 'Failed to delete event')
    }
  }

  return (
    <div className="flex gap-6 p-4">
      {/* Left: Form */}
      <div className="w-80 flex-shrink-0">
        <h2 className="text-lg font-medium mb-2">{isEditing ? 'Edit event' : 'Create event'}</h2>

        <form onSubmit={isEditing ? handleUpdate : handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1 block w-full border rounded px-2 py-1"
              placeholder="Meeting with team"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 block w-full border rounded px-2 py-1"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="mt-1 block w-full border rounded px-2 py-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="mt-1 block w-full border rounded px-2 py-1"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">
              {isEditing ? 'Save changes' : 'Add'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={clearForm}
                className="px-3 py-1 rounded bg-gray-200"
              >
                Cancel
              </button>
            )}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </form>

        {/* quick stats */}
        <div className="mt-4 text-sm text-gray-600">
          <div>{events.length} event{events.length !== 1 ? 's' : ''}</div>
          {loading && <div>Loading...</div>}
        </div>
      </div>

      {/* Middle: Calendar */}
      <div className="flex-1 min-h-[590px]">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>

      {/* Right: List with edit/delete */}
      <div className="w-96 flex-shrink-0">
        <h3 className="text-lg font-medium mb-2">Events list</h3>

        <div className="bg-white rounded shadow overflow-auto max-h-[560px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2">Title</th>
                <th className="text-left p-2">Start</th>
                <th className="text-left p-2">End</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {events.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">No events</td>
                </tr>
              ) : events.map(ev => (
                <tr key={ev.id} className="border-b last:border-b-0">
                  <td className="p-2 align-top">{ev.title}</td>
                  <td className="p-2 align-top">{dateOnlyFromIso(ev.startDate)}</td>
                  <td className="p-2 align-top">{dateOnlyFromIso(ev.endDate)}</td>
                  <td className="p-2 align-top">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(ev)}
                        className="px-2 py-1 rounded bg-yellow-300 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="px-2 py-1 rounded bg-red-500 text-white text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
