'use client'

import { ScheduleXCalendar, useNextCalendarApp } from '@schedule-x/react'
import { useState, useEffect } from 'react'
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
  startDate: string   // ISO from server
  endDate: string     // ISO from server
  isRecurring?: boolean | null
  frequency?: string | null
  daysOfWeek?: string | null
}

// safe helper: take ISO or YYYY-MM-DD and return YYYY-MM-DD or null
function toDateOnly(iso?: string | null) {
  if (!iso) return null
  // if already date-only (YYYY-MM-DD), length 10 -> return directly
  if (iso.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  // otherwise slice date portion (first 10 chars)
  const candidate = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null
}

function toScheduleXEvent(e: DbEvent) {
  try {
    const startDateOnly = toDateOnly(e.startDate)
    const endDateOnly = toDateOnly(e.endDate)

    if (!startDateOnly || !endDateOnly) {
      // If dates are invalid, throw to be caught below
      throw new Error(`Invalid date for event id=${e.id}`)
    }

    return {
      id: String(e.id),
      title: e.title,
      start: Temporal.PlainDate.from(startDateOnly),
      end: Temporal.PlainDate.from(endDateOnly),
    }
  } catch (err) {
    console.error('Failed to convert event to ScheduleX format', e, err)
    // return null so caller can filter it out
    return null
  }
}

function CalendarApp() {
  const eventsService = useState(() => createEventsServicePlugin())[0]

  const calendar = useNextCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()],
    events: [],
    plugins: [eventsService],
  })

  useEffect(() => {
    let mounted = true

    async function loadEvents() {
      try {
        const res = await fetch('/api/events')
        if (!res.ok) {
          console.error('Failed to fetch /api/events', res.status)
          return
        }
        const data: DbEvent[] = await res.json()
        console.log('Loaded events from server:', data)

        // map to schedule-x events, filter out any nulls
        const scheduleEvents = data
          .map(toScheduleXEvent)
          .filter((x): x is NonNullable<typeof x> => x !== null)

        if (!mounted) return
        // set events into eventsService
        eventsService.set(scheduleEvents)
      } catch (err) {
        console.error('Error loading events:', err)
      }
    }

    loadEvents()

    return () => {
      mounted = false
    }
  }, [eventsService])

  return (
    <div>
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  )
}

export default function Monthly() {
  return (
    <div className="h-[590px] w-[1050px]">
      <CalendarApp />
    </div>
  )
}
