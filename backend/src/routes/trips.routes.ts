import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { deriveTripStatus, isValidIsoDate } from '../lib/date.js';

export async function tripsRoutes(app: FastifyInstance) {
    const zApp = app.withTypeProvider<ZodTypeProvider>();
    zApp.addHook('onRequest', app.authenticate);

    // List Trips
    zApp.get('/', async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'No workspace', 401);

        const trips = await app.prisma.trip.findMany({
            where: { workspaceId: activeWorkspace.id },
            include: { itineraryDays: true },
            orderBy: { startDate: 'asc' }
        });

        return trips.map(t => ({
            ...t,
            status: deriveTripStatus(t.startDate, t.endDate)
        }));
    });

    // Create Trip
    zApp.post('/', {
        schema: {
            body: z.object({
                name: z.string().min(1),
                destination: z.string().min(1),
                startDate: z.string().refine(isValidIsoDate, 'Invalid ISO Date'),
                endDate: z.string().refine(isValidIsoDate, 'Invalid ISO Date'),
                coverImageUrl: z.string().optional(),
            })
        }
    }, async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'No workspace', 401);

        const { name, destination, startDate, endDate, coverImageUrl } = request.body;
        const today = new Date().toISOString().split('T')[0] as string;

        // Check Plan Limits
        // Free plan: max 2 active trips (planned or ongoing)
        if (activeWorkspace.planId === 'free') {
            const activeTripsCount = await app.prisma.trip.count({
                where: {
                    workspaceId: activeWorkspace.id,
                    endDate: { gte: today }
                }
            });

            if (activeTripsCount >= 2) {
                throw new ApiError('PLAN_LIMIT_REACHED', 'Free plan limited to 2 active trips', 403);
            }
        }

        const trip = await app.prisma.trip.create({
            data: {
                name,
                destination,
                startDate,
                endDate,
                coverImageUrl,
                workspaceId: activeWorkspace.id
            }
        });

        // Generate Days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const daysData = Array.from({ length: diffDays }).map((_, i) => {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            return {
                tripId: trip.id,
                date: date.toISOString().split('T')[0] as string
            };
        });

        await app.prisma.itineraryDay.createMany({ data: daysData });

        return {
            ...trip,
            status: deriveTripStatus(trip.startDate, trip.endDate)
        };
    });

    // Get Trip
    zApp.get('/:id', {
        schema: {
            params: z.object({ id: z.string().uuid() })
        }
    }, async (request) => {
        const { id } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'No workspace', 401);

        const trip = await app.prisma.trip.findUnique({
            where: { id },
            include: { itineraryDays: { include: { activities: true } } }
        });

        if (!trip) throw new ApiError('NOT_FOUND', 'Trip not found', 404);
        if (trip.workspaceId !== activeWorkspace.id) throw new ApiError('FORBIDDEN', 'Access denied', 403);

        return { ...trip, status: deriveTripStatus(trip.startDate, trip.endDate) };
    });

    // Update Trip
    zApp.patch('/:id', {
        schema: {
            params: z.object({ id: z.string().uuid() }),
            body: z.object({
                name: z.string().optional(),
                destination: z.string().optional(),
                startDate: z.string().refine(isValidIsoDate).optional(),
                endDate: z.string().refine(isValidIsoDate).optional(),
                coverImageUrl: z.string().optional(),
            })
        }
    }, async (request) => {
        const { id } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'No workspace', 401);

        const oldTrip = await app.prisma.trip.findUnique({ where: { id } });
        if (!oldTrip) throw new ApiError('NOT_FOUND', 'Trip not found', 404);
        if (oldTrip.workspaceId !== activeWorkspace.id) throw new ApiError('FORBIDDEN', 'Access denied', 403);

        const { startDate, endDate, name, destination, coverImageUrl } = request.body;

        let shouldRegenerateDays = false;
        if ((startDate && startDate !== oldTrip.startDate) || (endDate && endDate !== oldTrip.endDate)) {
            shouldRegenerateDays = true;
        }

        const updatedTrip = await app.prisma.trip.update({
            where: { id },
            data: {
                name,
                destination,
                startDate,
                endDate,
                coverImageUrl
            }
        });

        if (shouldRegenerateDays) {
            const newStart = startDate || oldTrip.startDate;
            const newEnd = endDate || oldTrip.endDate;

            // Delete old days (cascade deletes activities)
            await app.prisma.itineraryDay.deleteMany({ where: { tripId: id } });

            // Create new days
            const s = new Date(newStart);
            const e = new Date(newEnd);
            const diff = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            const days = Array.from({ length: diff }).map((_, i) => {
                const d = new Date(s);
                d.setDate(d.getDate() + i);
                return {
                    tripId: id,
                    date: d.toISOString().split('T')[0] as string
                };
            });
            await app.prisma.itineraryDay.createMany({ data: days });
        }

        return {
            ...updatedTrip,
            status: deriveTripStatus(updatedTrip.startDate, updatedTrip.endDate)
        };
    });

    // Delete Trip
    zApp.delete('/:id', {
        schema: { params: z.object({ id: z.string().uuid() }) }
    }, async (request) => {
        const { id } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'No workspace', 401);

        const trip = await app.prisma.trip.findUnique({ where: { id } });
        if (!trip) throw new ApiError('NOT_FOUND', 'Trip not found', 404);
        if (trip.workspaceId !== activeWorkspace.id) throw new ApiError('FORBIDDEN', 'Access denied', 403);

        await app.prisma.trip.delete({ where: { id } });

        return { message: 'Trip deleted' };
    });
}
