
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from './api'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({
                data: { session: { access_token: 'fake-token' } }
            })
        }
    }
}))

// Mock Global Fetch
const globalFetch = global.fetch;
const mockFetch = vi.fn();

describe('API Service', () => {
    beforeEach(() => {
        global.fetch = mockFetch
        mockFetch.mockClear()
    })

    afterEach(() => {
        global.fetch = globalFetch
    })

    it('getMe should return user and plan', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: { id: 'user-1', email: 'test@example.com' },
                workspace: { id: 'ws-1', planId: 'pro' }
            })
        })

        const result = await api.getMe()

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/me'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer fake-token'
                })
            })
        )
        expect(result).toEqual({
            id: 'user-1',
            email: 'test@example.com',
            plan: 'pro'
        })
    })

    it('createTrip should post data and return result', async () => {
        const payload = {
            name: 'Test Trip',
            destination: 'Paris',
            startDate: '2024-01-01',
            endDate: '2024-01-10'
        }

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'trip-1', ...payload })
        })

        const result = await api.createTrip(payload)

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/trips'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(payload)
            })
        )
        expect(result).toHaveProperty('id', 'trip-1')
    })
})
