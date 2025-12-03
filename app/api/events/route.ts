// app/api/events/route.ts
export const runtime = 'nodejs'; // ensure Node runtime (Prisma doesn't run on Edge)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // adjust path if needed

type ApiError = { error: string };

// helper to serialize Prisma Date -> ISO (safe null checks)
function serializeEvent(e: any) {
  return {
    ...e,
    startDate: e.startDate ? e.startDate.toISOString() : null,
    endDate: e.endDate ? e.endDate.toISOString() : null,
    createdAt: e.createdAt ? e.createdAt.toISOString() : null,
    updatedAt: e.updatedAt ? e.updatedAt.toISOString() : null,
  };
}

// GET handler - list or single by id / with optional date range filters
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const from = url.searchParams.get('from'); // ISO date string or YYYY-MM-DD
    const to = url.searchParams.get('to');

    if (id) {
      const numericId = Number(id);
      if (Number.isNaN(numericId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
      const event = await prisma.event.findUnique({ where: { id: numericId } });
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      return NextResponse.json(serializeEvent(event));
    }

    // Build where clause for optional date filtering
    const where: any = {};
    if (from || to) {
      where.AND = [];
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) return NextResponse.json({ error: 'Invalid from date' }, { status: 400 });
        where.AND.push({ startDate: { gte: fromDate } });
      }
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate.getTime())) return NextResponse.json({ error: 'Invalid to date' }, { status: 400 });
        where.AND.push({ endDate: { lte: toDate } });
      }
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json(events.map(serializeEvent));
  } catch (err) {
    console.error('GET /api/events error', err);
    return NextResponse.json({ error: 'Failed to fetch events' } as ApiError, { status: 500 });
  }
}

// POST handler - create a new event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // basic validation
    if (!body || !body.title || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: 'Missing required fields: title, startDate, endDate' }, { status: 400 });
    }

    // parse dates
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const created = await prisma.event.create({
      data: {
        title: String(body.title),
        description: body.description ?? null,
        startDate: start,
        endDate: end,
        isRecurring: body.isRecurring ?? false,
        frequency: body.frequency ?? null,
        daysOfWeek: body.daysOfWeek ?? null,
      },
    });

    return NextResponse.json(serializeEvent(created), { status: 201 });
  } catch (err) {
    console.error('POST /api/events error', err);
    return NextResponse.json({ error: 'Failed to create event' } as ApiError, { status: 500 });
  }
}

// PUT handler - update event by id (id from query param or body.id)
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queryId = url.searchParams.get('id');

    const body = await req.json();
    const id = queryId ? Number(queryId) : body?.id;
    if (!id || Number.isNaN(Number(id))) {
      return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
    }

    // build patch object
    const data: any = {};
    if (body.title !== undefined) data.title = String(body.title);
    if (body.description !== undefined) data.description = body.description ?? null;
    if (body.startDate !== undefined) {
      const d = new Date(body.startDate);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
      data.startDate = d;
    }
    if (body.endDate !== undefined) {
      const d = new Date(body.endDate);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
      data.endDate = d;
    }
    if (body.isRecurring !== undefined) data.isRecurring = Boolean(body.isRecurring);
    if (body.frequency !== undefined) data.frequency = body.frequency ?? null;
    if (body.daysOfWeek !== undefined) data.daysOfWeek = body.daysOfWeek ?? null;

    const updated = await prisma.event.update({
      where: { id: Number(id) },
      data,
    });

    return NextResponse.json(serializeEvent(updated));
  } catch (err: any) {
    console.error('PUT /api/events error', err);
    // Prisma will throw if record doesn't exist
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE handler - delete event by id query param or JSON body { id }
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queryId = url.searchParams.get('id');

    // see if id was passed in query or body
    let id: number | undefined = undefined;
    if (queryId) id = Number(queryId);
    else {
      const body = await req.json().catch(() => null);
      if (body?.id) id = Number(body.id);
    }

    if (!id || Number.isNaN(id)) return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });

    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/events error', err);
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
