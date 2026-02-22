# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TripNest** — a travel planning web app. Frontend is React/Vite; backend is a Fastify REST API. Both are in the same repository: frontend at the root, backend under `backend/`.

---

## Commands

### Frontend (root)
```bash
npm run dev       # Dev server on port 3000
npm run build     # Production build
npx vitest run    # Run frontend tests (once)
npx vitest        # Run frontend tests (watch)
```

### Backend (`backend/` directory)
```bash
npm run dev       # tsx watch src/server.ts, port 3333
npm start         # prisma db push + run compiled server
npm test          # Run backend tests (vitest)
npx prisma studio # View/edit DB in browser
npx prisma db push # Sync schema to database (dev)
npx prisma migrate deploy # Apply migrations (prod)
```

### Run a single test file
```bash
# Frontend
npx vitest run services/api.test.ts

# Backend (from backend/)
npx vitest run tests/trips.test.ts
```

---

## Architecture

### Frontend (root)

Custom client-side router — no React Router. `App.tsx` holds an `appState` object with `currentRoute` and `params`, and a `navigate()` function passed as `onNavigate` props down to pages/components.

**Routing flow:** `App.tsx` → `switch(currentRoute)` → page component.

Key layers:
- `types.ts` — all shared TypeScript types. **Must stay in sync with `CONTRACT.md`.**
- `services/api.ts` — single service layer for all HTTP calls. Gets Supabase JWT, sends it as `Authorization: Bearer` header to the backend.
- `lib/supabase.ts` — Supabase client (auth only; no direct DB access from frontend).
- `components/` — shared UI (`Layout`, `UI`, `FinanceModule`, `ItineraryTab`, `ParticipantsList`, `StayModal`).
- `pages/` — full-page components (`Trips`, `TripDetails`, `Login`, `Profile`, `Upgrade`).

Tailwind is configured with a `brand-*` color scale (sky blue). Always use `brand-*` classes instead of generic blue.

### Backend (`backend/src/`)

Fastify server with Zod validation (`fastify-type-provider-zod`). Prisma ORM targets a Supabase-hosted PostgreSQL database.

**Auth flow:** Every protected route uses `fastify.authenticate`. The auth plugin (`plugins/auth.ts`) verifies the Supabase JWT (supports HS256 via secret and RS256/JWKS), then auto-provisions the user+workspace in the DB if first login.

Route files live in `backend/src/routes/`, one file per domain:
`trips`, `activities`, `reservations`, `stays`, `participants`, `expenses`, `checklist`, `uploads`, `auth`.

---

## Key Contract Rules (`CONTRACT.md`)

`CONTRACT.md` is the canonical source of truth for all data schemas. **Do not change field names, enum values, or add fields without bumping the contract version.**

Critical rules:
- **`TripStatus` is derived, never stored.** Compute it: `startDate > today → planned`, `startDate ≤ today ≤ endDate → ongoing`, `endDate < today → completed`.
- Dates use `ISO_DATE` (`YYYY-MM-DD`) for date-only fields, `ISO_DATETIME` for timestamps.
- Enum `"canceled"` (not `"cancelled"`).
- Times use `HH:mm` 24h format.

---

## Environment Variables

**Frontend (`.env.local`):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- `VITE_API_URL` — Backend API base URL (e.g. `http://localhost:3333/api`)
- `VITE_GOOGLE_MAPS_KEY` — Google Maps API key (optional)

**Backend (`backend/.env`):**
- `DATABASE_URL` — PostgreSQL connection string (pooled, for Prisma)
- `DIRECT_URL` — Direct PostgreSQL URL (for migrations)
- `SUPABASE_URL` — Supabase project URL (for JWKS verification)
- `SUPABASE_JWT_SECRET` — Supabase JWT secret (for HS256 verification)
- `PORT` — Server port (default: 3333)
