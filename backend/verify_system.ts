import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const API_URL = 'http://localhost:3333'
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'your-supabase-jwt-secret'

async function verify() {
    console.log('🚀 Starting System Verification with Auth...')

    // Generate Test Token
    const testUserEmail = `test-${Date.now()}@example.com`
    const testUserId = `test-user-${Date.now()}`

    const token = jwt.sign({
        sub: testUserId,
        email: testUserEmail,
        role: 'authenticated',
        aud: 'authenticated'
    }, JWT_SECRET)

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }

    // 1. Authenticate & Create User/Workspace (via /api/me)
    console.log('\nTesting Authentication & Setup (/api/me)...')
    const meRes = await fetch(`${API_URL}/api/me`, {
        method: 'GET',
        headers
    })

    if (!meRes.ok) {
        console.error('❌ Failed to authenticate:', meRes.status, await meRes.text())
        process.exit(1)
    }

    const { user, workspace } = await meRes.json()
    console.log('✅ User authenticated:', user.id)
    console.log('✅ Workspace found/created:', workspace.id)

    const workspaceId = workspace.id

    // 2. Create Valid Trip
    console.log('\nTesting Valid Trip Creation...')
    const validTripRes = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            workspaceId,
            name: 'Valid Trip',
            destination: 'Paris',
            startDate: '2025-07-20',
            endDate: '2025-07-25',
            coverImageUrl: 'http://example.com/image.jpg'
        })
    })

    if (!validTripRes.ok) {
        console.error('❌ Failed to create valid trip:', await validTripRes.text())
    } else {
        const tripData = await validTripRes.json()
        console.log('✅ Valid trip created:', tripData.tripId)
    }

    // 3. Test Invalid Date (Feb 31st) - strict check
    console.log('\nTesting Invalid Date Trip (2025-02-31)...')
    const invalidTripRes = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            workspaceId,
            name: 'Invalid Trip',
            destination: 'Nowhere',
            startDate: '2025-02-31', // Invalid
            endDate: '2025-03-05'
        })
    })

    if (invalidTripRes.status === 400) {
        console.log('✅ Invalid date correctly rejected (Status 400)')
        const err = await invalidTripRes.json()
        console.log('   Error:', err)
    } else {
        console.error('❌ Failed: Invalid date was accepted or unexpected error:', invalidTripRes.status, await invalidTripRes.text())
    }
}

verify().catch(console.error)
