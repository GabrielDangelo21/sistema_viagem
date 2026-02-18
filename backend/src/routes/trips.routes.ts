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
        const { activeWorkspace, dbUser } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        // Fetch trips where:
        // 1. The trip belongs to the active workspace (Owner/Legacy behavior)
        // 2. OR the user is a participant in the trip (Invited)
        const trips = await app.prisma.trip.findMany({
            where: {
                OR: [
                    { workspaceId: activeWorkspace.id },
                    dbUser ? { participants: { some: { userId: dbUser.id } } } : {}
                ]
            },
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
                startDate: z.string().refine(isValidIsoDate, 'Data inválida (ISO Date)'),
                endDate: z.string().refine(isValidIsoDate, 'Data inválida (ISO Date)'),
                coverImageUrl: z.string().optional(),
                defaultCurrency: z.enum(['BRL', 'USD', 'EUR', 'GBP']).default('BRL'),
            })
        }
    }, async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const { name, destination, startDate, endDate, coverImageUrl, defaultCurrency } = request.body;

        // Validation: endDate >= startDate
        if (endDate < startDate) {
            throw new ApiError('VALIDATION_ERROR', 'A data de término deve ser posterior ou igual à data de início');
        }

        const today = new Date().toISOString().split('T')[0] as string;

        // Check Plan Limits (REMOVED FOR TESTING - ALL ARE PRO)
        /*
        if (activeWorkspace.planId === 'free') {
            const activeTripsCount = await app.prisma.trip.count({
                where: {
                    workspaceId: activeWorkspace.id,
                    endDate: { gte: today }
                }
            });

            if (activeTripsCount >= 2) {
                throw new ApiError('PLAN_LIMIT_REACHED', 'Plano gratuito limitado a 2 viagens ativas', 403);
            }
        }
        */

        return await app.prisma.$transaction(async (tx) => {
            const trip = await tx.trip.create({
                data: {
                    name,
                    destination,
                    startDate,
                    endDate,
                    coverImageUrl,
                    defaultCurrency,
                    workspaceId: activeWorkspace.id
                }
            });

            // Add Owner as Participant
            if (activeWorkspace.ownerUserId) {
                await tx.participant.create({
                    data: {
                        tripId: trip.id,
                        userId: activeWorkspace.ownerUserId,
                        name: request.dbUser?.name || 'Organizador',
                        email: request.dbUser?.email || '',
                        isOwner: true
                    }
                });
            }

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

            await tx.itineraryDay.createMany({ data: daysData });

            return {
                ...trip,
                status: deriveTripStatus(trip.startDate, trip.endDate)
            };
        });
    });

    // Get Trip
    zApp.get('/:id', {
        schema: {
            params: z.object({ id: z.string().uuid() })
        }
    }, async (request) => {
        const { id } = request.params;
        const { activeWorkspace, dbUser } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const trip = await app.prisma.trip.findUnique({
            where: { id },
            include: {
                itineraryDays: { include: { activities: true } },
                reservations: { orderBy: { startDateTime: 'asc' } },
                participants: true // Include participants to check access
            }
        });

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        // Access Check: Owner Workspace OR Participant
        const isOwnerWorkspace = trip.workspaceId === activeWorkspace.id;
        const isParticipant = dbUser && trip.participants.some(p => p.userId === dbUser.id);

        if (!isOwnerWorkspace && !isParticipant) {
            throw new ApiError('FORBIDDEN', 'Acesso negado', 403);
        }

        const { participants, ...tripData } = trip; // Remove participants from response if not needed, or keep? 
        // Keeping it might be useful, but let's stick to TripUI interface. 
        // Actually api.ts expects specific structure.
        return { ...tripData, status: deriveTripStatus(trip.startDate, trip.endDate) };
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
                defaultCurrency: z.enum(['BRL', 'USD', 'EUR', 'GBP']).optional(),
            })
        }
    }, async (request) => {
        const { id } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const oldTrip = await app.prisma.trip.findUnique({ where: { id } });
        if (!oldTrip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);
        if (oldTrip.workspaceId !== activeWorkspace.id) throw new ApiError('FORBIDDEN', 'Acesso negado', 403);

        const { startDate, endDate, name, destination, coverImageUrl, defaultCurrency } = request.body;

        // Validation: endDate >= startDate (considering updates)
        const effectiveStart = startDate || oldTrip.startDate;
        const effectiveEnd = endDate || oldTrip.endDate;

        if (effectiveEnd < effectiveStart) {
            throw new ApiError('VALIDATION_ERROR', 'A data de término deve ser posterior ou igual à data de início');
        }

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
                coverImageUrl,
                defaultCurrency
            }
        });

        if (shouldRegenerateDays) {
            // Delete old days (cascade deletes activities)
            await app.prisma.itineraryDay.deleteMany({ where: { tripId: id } });

            // Create new days
            const s = new Date(effectiveStart);
            const e = new Date(effectiveEnd);
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

        console.log(`[DeleteTrip] Attempting to delete trip ${id} for workspace ${activeWorkspace?.id}`);

        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const trip = await app.prisma.trip.findUnique({
            where: { id },
            include: { itineraryDays: { include: { activities: true } }, reservations: true }
        });

        if (!trip) {
            console.warn(`[DeleteTrip] Trip ${id} not found`);
            throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);
        }

        if (trip.workspaceId !== activeWorkspace.id) {
            console.warn(`[DeleteTrip] Trip ${id} does not belong to workspace ${activeWorkspace.id}`);
            throw new ApiError('FORBIDDEN', 'Acesso negado', 403);
        }

        try {
            console.log(`[DeleteTrip] Deleting trip ${id} from DB...`);
            await app.prisma.trip.delete({ where: { id } });
            console.log(`[DeleteTrip] Success!`);
        } catch (dbErr) {
            console.error(`[DeleteTrip] Database crash:`, dbErr);
            throw dbErr;
        }

        return { message: 'Viagem deletada' };
    });
}
