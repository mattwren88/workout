# Cadence Training Tracker

Local-first training app for cycling + strength. Built with Next.js, Prisma, SQLite, and Tailwind.

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Optional seed data:

```bash
npx prisma db seed
```

## Key Routes

- `/` overview
- `/log` quick logging (Strength A/B, KB, Ride, Daily Check-in)
- `/sessions` history + edit
- `/import` cycling CSV import
- `/dashboard/strength` strength analytics
- `/dashboard/cycling` cycling analytics
- `/plan` weekly plan + compliance
- `/settings` units and schedule

## CSV Import

- Upload a `.csv` export of rides.
- The importer treats values as raw SI units, even if headers imply otherwise:
  - Distance in meters
  - Duration in seconds (or `HH:MM:SS` strings)
  - Elevation in meters
  - Avg speed in m/s
- If headers do not match, use the column mapping UI.
- Duplicates are detected by a fingerprint of start time + duration + distance + activity name and skipped.

## Assumptions

- Single-user, local-only app.
- Strength and KB templates match the provided program.
- Units are stored internally in SI (meters, seconds, kilograms). The UI toggles metric/imperial display.

## Prisma + Migrations

```bash
npx prisma migrate dev --name init
npx prisma studio
```

## Tests

```bash
npm test
```

## Notes

- SQLite database stored at `prisma/dev.db`.
- Update defaults (strength days, ride targets) in `/settings`.
