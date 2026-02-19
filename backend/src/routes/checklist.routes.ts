
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';

export async function checklistRoutes(app: FastifyInstance) {
    const zApp = app.withTypeProvider<ZodTypeProvider>();
    zApp.addHook('onRequest', app.authenticate);

    // Get Checklist Items for Trip
    zApp.get('/trips/:tripId/checklist', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { activeWorkspace, dbUser } = request;

        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId },
            include: { participants: true }
        });

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada');

        // Access Check: Owner Workspace or Participant
        const isOwnerWorkspace = trip.workspaceId === activeWorkspace?.id;
        const isParticipant = dbUser && trip.participants.some(p => p.userId === dbUser.id);

        if (!isOwnerWorkspace && !isParticipant) {
            throw new ApiError('FORBIDDEN', 'Sem permissão para acessar esta viagem');
        }

        const items = await app.prisma.checklistItem.findMany({
            where: { tripId },
            orderBy: { createdAt: 'asc' }
        });

        return items;
    });

    // Create Checklist Item
    zApp.post('/trips/:tripId/checklist', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
            body: z.object({
                text: z.string().min(1),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { text } = request.body;
        const { activeWorkspace, dbUser } = request;

        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId },
            include: { participants: true }
        });

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada');

        // Access Check (Write): Same as Read for now
        const isOwnerWorkspace = trip.workspaceId === activeWorkspace?.id;
        const isParticipant = dbUser && trip.participants.some(p => p.userId === dbUser.id);

        if (!isOwnerWorkspace && !isParticipant) {
            throw new ApiError('FORBIDDEN', 'Sem permissão para modificar esta viagem');
        }

        const item = await app.prisma.checklistItem.create({
            data: {
                tripId,
                text,
                isChecked: false
            }
        });

        return item;
    });

    // Toggle Checklist Item
    zApp.patch('/checklist/:id', {
        schema: {
            params: z.object({
                id: z.string().uuid(),
            }),
            body: z.object({
                isChecked: z.boolean(),
            }),
        },
    }, async (request) => {
        const { id } = request.params;
        const { isChecked } = request.body;
        const { activeWorkspace } = request;

        const item = await app.prisma.checklistItem.findUnique({
            where: { id },
            include: { trip: true }
        });

        if (!item) throw new ApiError('NOT_FOUND', 'Item não encontrado');

        // Access Check via Trip
        // Optimization: checking workspaceId directly on trip relation
        if (item.trip.workspaceId !== activeWorkspace?.id) {
            // Check participant access via extra query if needed, strictly enforcing workspace ownership for now implies only owner/workspace members can edit?
            // Actually, participants should be able to check items.
            // Let's rely on workspace context for now as per other routes pattern, but ideally we check participants too.
            // For MVP speed: if trip is in active workspace context or user is participant.
            // Re-fetching participants to be safe:
            const trip = await app.prisma.trip.findUnique({
                where: { id: item.tripId },
                include: { participants: true }
            });
            const isParticipant = request.dbUser && trip?.participants.some(p => p.userId === request.dbUser!.id);
            if (!isParticipant) { // Since workspaceId didn't match
                throw new ApiError('FORBIDDEN', 'Sem permissão');
            }
        }

        const updated = await app.prisma.checklistItem.update({
            where: { id },
            data: { isChecked }
        });

        return updated;
    });

    // Delete Checklist Item
    zApp.delete('/checklist/:id', {
        schema: {
            params: z.object({
                id: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { id } = request.params;
        const { activeWorkspace } = request;

        const item = await app.prisma.checklistItem.findUnique({
            where: { id },
            include: { trip: true }
        });

        if (!item) throw new ApiError('NOT_FOUND', 'Item não encontrado');

        // Similar access check logic
        if (item.trip.workspaceId !== activeWorkspace?.id) {
            const trip = await app.prisma.trip.findUnique({
                where: { id: item.tripId },
                include: { participants: true }
            });
            const isParticipant = request.dbUser && trip?.participants.some(p => p.userId === request.dbUser!.id);
            if (!isParticipant) {
                throw new ApiError('FORBIDDEN', 'Sem permissão');
            }
        }

        await app.prisma.checklistItem.delete({
            where: { id }
        });

        return { message: 'Item removido' };
    });
}
