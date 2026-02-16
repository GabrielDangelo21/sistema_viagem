import * as jwt from 'jsonwebtoken';
import { request } from 'undici';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const BASE_URL = 'http://localhost:3333';

if (!SUPABASE_JWT_SECRET) {
    console.error('Missing SUPABASE_JWT_SECRET');
    process.exit(1);
}

// Mock Supabase JWT
const token = jwt.sign({
    sub: '123e4567-e89b-12d3-a456-426614174000', // Random UUID
    email: 'test@example.com',
    role: 'authenticated'
}, SUPABASE_JWT_SECRET, { expiresIn: '1h' });

const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

async function run() {
    console.log('🚀 Starting Tests...\n');

    try {
        // 1. GET /me (Should create User + Workspace)
        console.log('--- 1. GET /me ---');
        const meRes = await request(`${BASE_URL}/api/me`, { headers });
        console.log('Status:', meRes.statusCode);
        const meBody = await meRes.body.json();
        console.log('Body:', JSON.stringify(meBody, null, 2));

        if (meRes.statusCode !== 200) throw new Error('Failed GET /me');
        const workspaceId = (meBody as any).workspace.id;

        // 2. Create Trip
        console.log('\n--- 2. Create Trip ---');
        const tripRes = await request(`${BASE_URL}/api/trips`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: 'EuroTrip 2024',
                destination: 'Europe',
                startDate: '2024-06-01',
                endDate: '2024-06-15',
                coverImageUrl: 'http://example.com/cover.jpg'
            })
        });
        console.log('Status:', tripRes.statusCode);
        const tripBody = await tripRes.body.json();
        console.log('Body:', JSON.stringify(tripBody, null, 2));
        const tripId = (tripBody as any).id;

        // 3. Create Activity (on Day 1)
        console.log('\n--- 3. Create Activity ---');
        // Need dayId from trip
        // In our implementation, we return trip with days?
        // Let's check GET /trips/:id or assumes we returned days in POST (we did: `include: { itineraryDays: true }` No, POST returned trip, but generated days in background. Wait, POST implementation: `return { ...trip, status }` - it dind't include days in response?
        // Let's check trips.routes.ts POST response.
        // It returns `trip` object + status. `trip` from `prisma.trip.create` -> It does NOT include days (create only returns created object).
        // AND we generated days separately `createMany`.
        // So they are NOT in the returned object.
        // We need to fetch the trip or days.
        // Let's fetch the trip details.

        const getTripRes = await request(`${BASE_URL}/api/trips/${tripId}`, { headers });
        const getTripBody = await getTripRes.body.json();
        const firstDayId = (getTripBody as any).days?.[0]?.id || (getTripBody as any).itineraryDays?.[0]?.id; // We renamed to itineraryDays

        console.log('First Day ID:', firstDayId);

        if (firstDayId) {
            const actRes = await request(`${BASE_URL}/api/activities`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    dayId: firstDayId,
                    title: 'Eiffel Tower',
                    timeStart: '10:00',
                    cost: 50.0
                })
            });
            console.log('Activity Status:', actRes.statusCode);
            console.log('Activity Body:', await actRes.body.text());
        }

        // 4. Create Reservation
        console.log('\n--- 4. Create Reservation ---');
        const resRes = await request(`${BASE_URL}/api/reservations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                tripId,
                title: 'Hotel Paris',
                type: 'hotel',
                status: 'confirmed',
                startDateTime: '2024-06-01T14:00:00Z',
                price: 200,
                currency: 'EUR'
            })
        });
        console.log('Reservation Status:', resRes.statusCode);
        console.log('Reservation Body:', await resRes.body.text());

    } catch (err) {
        console.error('❌ Test Failed:', err);
    }
}

run();
