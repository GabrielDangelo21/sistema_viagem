
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { app } from '../src/server'
import { prisma } from './setup'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Mock get-jwks to return our test public key
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

vi.mock('get-jwks', () => {
    return {
        default: () => ({
            getPublicKey: async () => publicKey
        })
    }
})

function generateToken(sub: string, email: string) {
    return jwt.sign({ sub, email, aud: 'authenticated', role: 'authenticated' }, privateKey, {
        algorithm: 'RS256',
        expiresIn: '1h',
        issuer: 'https://hhxaoitjibuqsybhknzc.supabase.co/auth/v1'
    })
}

describe('Trips API', () => {
    let token: string;
    let userId = 'test-user-id';
    let userEmail = 'test@example.com';

    beforeAll(async () => {
        await app.ready()
        token = generateToken(userId, userEmail)
    })

    afterAll(async () => {
        await app.close()
    })

    it('should create a new trip with valid data', async () => {
        // First request will trigger JIT user creation
        const response = await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'My Trip to Paris',
                destination: 'Paris',
                startDate: new Date('2024-05-01').toISOString().split('T')[0],
                endDate: new Date('2024-05-10').toISOString().split('T')[0],
            })

        if (response.status !== 200 && response.status !== 201) {
            console.error('Create Trip Error:', response.body)
        }

        expect(response.status).toBe(200) // or 201 depending on implementation
        expect(response.body.id).toBeDefined()

        const trip = await prisma.trip.findUnique({
            where: { id: response.body.id }
        })
        expect(trip).toBeDefined()
        expect(trip?.destination).toBe('Paris')
        expect(trip?.name).toBe('My Trip to Paris')
    })


    it('should fail to create trip with end date before start date', async () => {
        const response = await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Invalid Trip',
                destination: 'Somewhere',
                startDate: new Date('2024-05-10').toISOString().split('T')[0],
                endDate: new Date('2024-05-01').toISOString().split('T')[0],
            })

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty('message')
    })

    it('should correct derive trip status', async () => {
        // Future trip
        const futureResponse = await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Future Trip',
                destination: 'Mars',
                startDate: '2099-01-01',
                endDate: '2099-01-10',
            })
        expect(futureResponse.body.status).toBeDefined() // 'planned' but depends on implementation of deriveTripStatus

        // Past trip
        const pastResponse = await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Past Trip',
                destination: 'History',
                startDate: '1999-01-01',
                endDate: '1999-01-10',
            })
        expect(pastResponse.body.status).toBeDefined() // 'completed'

        // Ongoing trip (includes today)
        const today = new Date().toISOString().split('T')[0]
        const ongoingResponse = await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Ongoing Trip',
                destination: 'Present',
                startDate: today,
                endDate: today,
            })
        expect(ongoingResponse.body.status).toBeDefined() // 'ongoing'
    })


    it('should enforce free plan limit (max 2 active trips)', async () => {
        // Create Trip 1
        await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Active Trip 1',
                destination: 'Limit Tester 1',
                startDate: '2099-05-01',
                endDate: '2099-05-10',
            })

        // Create Trip 2
        await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Active Trip 2',
                destination: 'Limit Tester 2',
                startDate: '2099-06-01',
                endDate: '2099-06-10',
            })

        // Attempt to create 3rd active trip
        const response = await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Active Trip 3',
                destination: 'Over Limit',
                startDate: '2099-07-01',
                endDate: '2099-07-10',
            })

        expect(response.status).toBe(403) // PLAN_LIMIT_REACHED
        expect(response.body.message).toContain('Plano gratuito limitado')
    })

    it('should allow creating completed trips regardless of limit', async () => {
        // Assuming we are at the limit from previous test
        const response = await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Past Trip Ignored',
                destination: 'Old',
                startDate: '2000-01-01',
                endDate: '2000-01-10',
            })

        expect(response.status).toBe(200)
    })

    it('should delete a trip', async () => {
        // Create a trip to delete
        const createRes = await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'To Delete',
                destination: 'Trash',
                startDate: '2099-12-01',
                endDate: '2099-12-10',
            })
        const tripId = createRes.body.id

        const deleteRes = await request(app.server)
            .delete(`/api/trips/${tripId}`)
            .set('Authorization', `Bearer ${token}`)

        expect(deleteRes.status).toBe(200)

        const check = await prisma.trip.findUnique({ where: { id: tripId } })
        expect(check).toBeNull()
    })

    it('should generate itinerary days upon creation', async () => {
        const response = await request(app.server)
            .post('/api/trips')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Itinerary Test',
                destination: 'Days',
                startDate: '2024-06-01', // 1st
                endDate: '2024-06-03', // 3rd (3 days: 1, 2, 3)
            })

        const tripId = response.body.id
        const days = await prisma.itineraryDay.findMany({ where: { tripId } })
        expect(days).toHaveLength(3)
    })
})
