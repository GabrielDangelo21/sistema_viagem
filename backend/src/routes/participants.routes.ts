import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { requireRole } from '../lib/permissions.js';
import { logAction } from '../lib/auditLog.js';

export async function participantsRoutes(app: FastifyInstance) {
    const zApp = app.withTypeProvider<ZodTypeProvider>();
    zApp.addHook('onRequest', app.authenticate);

    // List Participants
    zApp.get('/', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId },
            include: { participants: true }
        });
        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        const isOwner = trip.workspaceId === activeWorkspace.id;
        const isParticipant = request.dbUser && trip.participants.some(p => p.userId === request.dbUser?.id);
        if (!isOwner && !isParticipant) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        const participants = await app.prisma.participant.findMany({
            where: { tripId },
        });

        return participants;
    });

    // Add Participant
    zApp.post('/', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
            body: z.object({
                name: z.string().min(1),
                email: z.string().email().optional(),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { name, email } = request.body;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId },
            include: { participants: true }
        });
        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        if (trip.workspaceId !== activeWorkspace.id) {
            await requireRole(app, tripId, request.dbUser?.id, 'editor');
        }

        // Check if exists by email
        if (email) {
            const existing = await app.prisma.participant.findFirst({
                where: { tripId, email }
            });
            if (existing) throw new ApiError('VALIDATION_ERROR', 'Participante já adicionado com este email');
        }

        // Try to find user by email to link
        let userId: string | null = null;
        if (email) {
            const user = await app.prisma.user.findUnique({ where: { email } });
            if (user) userId = user.id;
        }

        const participant = await app.prisma.participant.create({
            data: {
                tripId,
                name,
                email,
                userId,
                isOwner: false
            }
        });

        await logAction(app.prisma, {
            tripId,
            userId: request.dbUser?.id,
            userName: request.dbUser?.name,
            action: 'participant_added',
            entity: 'participant',
            entityId: participant.id,
            details: `Participante '${participant.name}' adicionado manualmente`
        });

        return participant;
    });

    // Remove Participant
    zApp.delete('/:participantId', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
                participantId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { tripId, participantId } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId },
            include: { participants: true }
        });
        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        if (trip.workspaceId !== activeWorkspace.id) {
            await requireRole(app, tripId, request.dbUser?.id, 'editor');
        }

        const participant = await app.prisma.participant.findUnique({ where: { id: participantId } });
        if (!participant) throw new ApiError('NOT_FOUND', 'Participante não encontrado', 404);

        if (participant.tripId !== tripId) throw new ApiError('VALIDATION_ERROR', 'Participante não pertence a esta viagem');
        if (participant.isOwner) throw new ApiError('FORBIDDEN', 'Não é possível remover o dono da viagem');

        // Check if has expenses?
        // TODO: Block delete if has expenses paid or shares?
        // Logic: if expenses paid, cannot delete. If shares, maybe reassign or warn?
        // For now, cascade delete might be dangerous if we want to keep history.
        // But schema has onDelete: Cascade if we want.
        // Let's protect check:
        const hasExpenses = await app.prisma.expense.count({ where: { paidByParticipantId: participantId } });
        if (hasExpenses > 0) throw new ApiError('VALIDATION_ERROR', 'Não é possível remover participante que cadastrou despesas');

        await app.prisma.participant.delete({ where: { id: participantId } });

        await logAction(app.prisma, {
            tripId,
            userId: request.dbUser?.id,
            userName: request.dbUser?.name,
            action: 'participant_removed',
            entity: 'participant',
            entityId: participantId,
            details: `Participante '${participant.name}' removido`
        });

        return { message: 'Participante removido' };
    });
}
