

# Calify – Modern Event Management Web App

Calify is a sleek, full-stack event scheduling application built with Next.js, Prisma, PostgreSQL, NextAuth, and ScheduleX Calendar.
Users can authenticate securely, manage their events, and visualize them on an interactive calendar.

## Website Interface
<img width="1918" height="931" alt="image" src="https://github.com/user-attachments/assets/7dece667-62ab-407a-b149-a8897f958e13" />

<img width="1919" height="931" alt="image" src="https://github.com/user-attachments/assets/56558a1e-23d5-435c-870c-d39ca4a28cc7" />



## Tech Stack
Frontend

Next.js 14 / App Router

React 18

ScheduleX Calendar UI

Temporal API (polyfilled)

TailwindCSS (optional)

Backend

Next.js Route Handlers

Prisma ORM

PostgreSQL

Authentication

NextAuth.js (Google OAuth)

Prisma Adapter + DB-backed sessions

## Features

- Google Authentication (NextAuth)

- Full CRUD for Events

- Beautiful ScheduleX Calendar

- Recurring event fields supported

- Instant calendar updates

-� Prisma ORM + PostgreSQL

- Clean API endpoints using App Router

- Simple & clean UI

## Project Structure
/
├── app/
│   ├── api/
│   │   └── events/route.ts        # Event CRUD API
│   │   └── auth/[...nextauth]/    # NextAuth route
│   ├── page.tsx                   # Homepage (Calendar + Auth UI)
│   └── events/page.tsx            # Event CRUD page
│
├── components/
│   └── Monthly.tsx                # Monthly calendar component
│
├── prisma/
│   └── schema.prisma              # Database schema
│
├── lib/
│   ├── prisma.ts                  # Prisma client singleton
│   └── auth.ts (optional)         # NextAuth config for server
│
├── .env.local
└── README.md

## Setup Instructions
1. Clone repository
git clone https://github.com/Ishagi-Yoichi/calify.git
cd calify

2. Install dependencies
npm install

3. Create .env.local
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="yourRandomSecretKey"

GOOGLE_CLIENT_ID="yourGoogleClientID"
GOOGLE_CLIENT_SECRET="yourGoogleClientSecret"


Generate a secure secret:

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

4. Run database migrations
npx prisma migrate dev
npx prisma generate

5. Start dev server
npm run dev


Now open:
- http://localhost:3000

- Event CRUD API
Create Event

POST /api/events
(Body: title, startDate, endDate, description)

Get Events

GET /api/events

Update Event

PUT /api/events?id={id}

Delete Event

DELETE /api/events?id={id}

API file:
app/api/events/route.ts

- Authentication (NextAuth.js)

Uses Google OAuth (no password needed)

Sessions stored in PostgreSQL using Prisma Adapter

Server-side session support through getServerSession

Automatically creates User, Account, Session tables

Auth route:
app/api/auth/[...nextauth]/route.ts

- Calendar Integration (ScheduleX)

The calendar reads events from database and displays them in:

Month Grid

Month Agenda

Week View

Day View

Event transformation:

function toScheduleXEvent(e) {
  return {
    id: String(e.id),
    title: e.title,
    start: Temporal.PlainDate.from(e.startDate.slice(0,10)),
    end: Temporal.PlainDate.from(e.endDate.slice(0,10)),
  };
}


After CRUD operations, the calendar updates instantly.


## Future Enhancements

Drag & Drop event moving

Time-based scheduling (HH:mm)

Full recurring events engine (RRULE)

Per-user event visibility

Team calendars

Event sharing & invites

Reminders & notifications

🙌 Contributing

Pull requests are welcome.
For major changes, please open an issue first to discuss your idea.

📄 License

MIT License – free for personal & commercial use.

## For any Queries please Contact to: 
https://x.com/NIKUNJ_TIWARI_
