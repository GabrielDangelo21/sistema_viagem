# TripNest Backend

Backend implementation for TripNest using Fastify, Prisma, and Supabase Auth.

## Prerequisites

- Node.js (v18+)
- PostgreSQL (database)
- Supabase Project (for Auth & Storage)

## Setup

1.  **Install Dependencies**
    ```bash
    cd backend
    npm install
    ```

2.  **Environment Variables**
    Copy `.env.example` to `.env` and fill in your details:
    ```bash
    cp .env.example .env
    ```
    Update `.env`:
    - `DATABASE_URL`: Your PostgreSQL connection string.
    - `SUPABASE_JWT_SECRET`: Your Supabase Project JWT Secret (Settings > API).

3.  **Database Migration**
    Run Prisma migrations to create tables:
    ```bash
    npx prisma migrate dev --name init
    ```

4.  **Run Server**
    Development mode:
    ```bash
    npm run dev
    # or
    npx tsx src/server.ts
    ```
    The server runs at `http://localhost:3333`.

## Verification

A manual test script is included in `scripts/test-manual.ts`.
To run it, ensure the server is running and you have configured `.env` correctly.

```bash
npx tsx scripts/test-manual.ts
```

## API Endpoints

-   `GET /api/me` - Get/Create User & Workspace
-   `GET /api/trips` - List Trips
-   `POST /api/trips` - Create Trip
-   `GET /api/trips/:id` - Get Trip Details
-   `PATCH /api/trips/:id` - Update Trip (re-calculates itinerary)
-   `DELETE /api/trips/:id` - Delete Trip
-   `POST /api/activities` - Add Activity
-   `POST /api/reservations` - Add Reservation
-   `PATCH /api/reservations/:id` - Update Reservation
-   `DELETE /api/reservations/:id` - Delete Reservation

## Structure

-   `src/server.ts`: Entry point.
-   `src/plugins/`: Fastify plugins (Auth, Prisma).
-   `src/routes/`: API route handlers.
-   `src/lib/`: Shared logic (Date helpers, Error handling).
