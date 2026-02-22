
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { PrismaClient } from '@prisma/client';
import { requireRole } from '../lib/permissions.js';
import { logAction } from '../lib/auditLog.js';

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
            orderBy: { text: 'asc' }
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

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada');

        if (trip.workspaceId !== activeWorkspace?.id) {
            await requireRole(app, tripId, request.dbUser?.id, 'editor');
        }

        const item = await app.prisma.checklistItem.create({
            data: {
                tripId,
                text,
                isChecked: false
            }
        });

        await logAction(app.prisma, {
            tripId,
            userId: request.dbUser?.id,
            userName: request.dbUser?.name,
            action: 'checklist_created',
            entity: 'checklist',
            entityId: item.id,
            details: `Item de checklist '${item.text}' adicionado`
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

        if (!item) throw new ApiError('NOT_FOUND', 'Item não encontrado');

        if (item.trip.workspaceId !== activeWorkspace?.id) {
            await requireRole(app, item.tripId, request.dbUser?.id, 'editor');
        }

        const updated = await app.prisma.checklistItem.update({
            where: { id },
            data: { isChecked }
        });

        await logAction(app.prisma, {
            tripId: item.tripId,
            userId: request.dbUser?.id,
            userName: request.dbUser?.name,
            action: 'checklist_updated',
            entity: 'checklist',
            entityId: id,
            details: `Item de checklist '${item.text}' marcado como ${isChecked ? 'concluído' : 'pendente'}`
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

        if (!item) throw new ApiError('NOT_FOUND', 'Item não encontrado');

        if (item.trip.workspaceId !== activeWorkspace?.id) {
            await requireRole(app, item.tripId, request.dbUser?.id, 'editor');
        }

        await app.prisma.checklistItem.delete({
            where: { id }
        });

        await logAction(app.prisma, {
            tripId: item.tripId,
            userId: request.dbUser?.id,
            userName: request.dbUser?.name,
            action: 'checklist_deleted',
            entity: 'checklist',
            entityId: id,
            details: `Item de checklist '${item.text}' removido`
        });

        return { message: 'Item removido' };
    });
}
