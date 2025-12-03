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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-600 font-semibold">Control center</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">Plan every event effortlessly</h1>
          <p className="text-slate-600 max-w-3xl">Create, edit, and monitor events from a single responsive dashboard. Switch between the calendar and list views for a perfect overview across all devices.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px] items-start">
          {/* Left: Form */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{isEditing ? 'Edit event' : 'Create event'}</h2>
              <p className="text-sm text-slate-500">Fill in the details below to {isEditing ? 'update' : 'schedule'} an event.</p>
            </div>

            <form onSubmit={isEditing ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  placeholder="Meeting with team"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition resize-none"
                  placeholder="Optional"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="flex-1 min-w-[140px] justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md hover:shadow-lg hover:scale-[1.01] transition active:scale-[0.99]"
                >
                  {isEditing ? 'Save changes' : 'Add event'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            </form>

            <div className="flex items-center justify-between text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <div>
                <span className="font-semibold text-slate-900">{events.length}</span> event{events.length !== 1 ? 's' : ''}
              </div>
              {loading && (
                <div className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></span>
                  Loading
                </div>
              )}
            </div>
          </div>

          {/* Middle: Calendar */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 sm:p-6 w-full min-h-[520px]">
            <ScheduleXCalendar calendarApp={calendar} />
          </div>

          {/* Right: List with edit/delete */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 space-y-4 w-full xl:w-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Events list</h3>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                Live sync
              </span>
            </div>

            <div className="relative">
              <div className="overflow-auto max-h-[460px] rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 text-slate-600">
                    <tr>
                      <th className="text-left p-3 font-medium">Title</th>
                      <th className="text-left p-3 font-medium">Start</th>
                      <th className="text-left p-3 font-medium">End</th>
                      <th className="p-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {events.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">No events yet</td>
                      </tr>
                    ) : events.map(ev => (
                      <tr key={ev.id}>
                        <td className="p-3 align-top font-medium text-slate-800">{ev.title}</td>
                        <td className="p-3 align-top text-slate-600">{dateOnlyFromIso(ev.startDate)}</td>
                        <td className="p-3 align-top text-slate-600">{dateOnlyFromIso(ev.endDate)}</td>
                        <td className="p-3 align-top">
                          <div className="flex flex-wrap gap-2 justify-center">
                            <button
                              onClick={() => startEdit(ev)}
                              className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-800 text-xs font-semibold hover:bg-yellow-200 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition"
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
        </div>
      </div>
    </div>
  )
}
