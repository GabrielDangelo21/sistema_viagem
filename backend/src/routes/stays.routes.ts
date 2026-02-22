import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { requireRole } from '../lib/permissions.js';
import { logAction } from '../lib/auditLog.js';

export async function staysRoutes(app: FastifyInstance) {
    const zApp = app.withTypeProvider<ZodTypeProvider>();
    zApp.addHook('onRequest', app.authenticate);

    // List stays for a trip
    zApp.get('/', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
        }
    }, async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);
        const { tripId } = request.params;

        // Verify Trip belongs to user's workspace OR user is participant
        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId },
            include: { participants: true }
        });

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        const isOwner = trip.workspaceId === activeWorkspace.id;
        const isParticipant = request.dbUser && trip.participants.some(p => p.userId === request.dbUser?.id);

        if (!isOwner && !isParticipant) {
            throw new ApiError('FORBIDDEN', 'Acesso negado', 403);
        }

        const stays = await app.prisma.stay.findMany({
            where: { tripId },
            orderBy: { startDate: 'asc' }
        });

        return stays;
    });

    // Create a stay
    zApp.post('/', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
            body: z.object({
                name: z.string().min(1),
                startDate: z.string(), // ISO_DATE
                endDate: z.string() // ISO_DATE
            })
        }
    }, async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);
        const { tripId } = request.params;
        const data = request.body;

        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId },
            include: { participants: true }
        });

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        if (trip.workspaceId !== activeWorkspace.id) {
            await requireRole(app, tripId, request.dbUser?.id, 'editor');
        }

        const stay = await app.prisma.stay.create({
            data: {
                tripId,
                ...data
            }
        });

        return stay;
    });

    // Update a stay
    zApp.put('/:stayId', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
                stayId: z.string().uuid(),
            }),
            body: z.object({
                name: z.string().min(1).optional(),
                startDate: z.string().optional(), // ISO_DATE
                endDate: z.string().optional() // ISO_DATE
            })
        }
    }, async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);
        const { tripId, stayId } = request.params;
        const data = request.body;

        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId },
            include: { participants: true }
        });

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        if (trip.workspaceId !== activeWorkspace.id) {
            await requireRole(app, tripId, request.dbUser?.id, 'editor');
        }

        const existingStay = await app.prisma.stay.findUnique({
            where: { id: stayId, tripId }
        });

        if (!existingStay) throw new ApiError('NOT_FOUND', 'Estadia não encontrada', 404);

        const stay = await app.prisma.stay.update({
            where: { id: stayId },
            data
        });

        return stay;
    });

    // Delete a stay
    zApp.delete('/:stayId', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
                stayId: z.string().uuid(),
            })
        }
    }, async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);
        const { tripId, stayId } = request.params;

        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId },
            include: { participants: true }
        });

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        if (trip.workspaceId !== activeWorkspace.id) {
            await requireRole(app, tripId, request.dbUser?.id, 'editor');
        }

        const existingStay = await app.prisma.stay.findUnique({
            where: { id: stayId, tripId }
        });

        if (!existingStay) throw new ApiError('NOT_FOUND', 'Estadia não encontrada', 404);

        await app.prisma.stay.delete({
            where: { id: stayId }
        });

        await logAction(app.prisma, {
            tripId,
            userId: request.dbUser?.id,
            userName: request.dbUser?.name,
            action: 'stay_deleted',
            entity: 'stay',
            entityId: stayId,
            details: `Estadia '${existingStay.name}' excluída`
        });

        return { success: true };
    });
}
