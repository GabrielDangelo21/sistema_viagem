import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { requireRole } from '../lib/permissions.js';
import { logAction } from '../lib/auditLog.js';

export async function invitesRoutes(app: FastifyInstance) {
    const zApp = app.withTypeProvider<ZodTypeProvider>();
    zApp.addHook('onRequest', app.authenticate);

    // Generate Invite Link
    zApp.post('/trips/:tripId/invites', {
        schema: {
            params: z.object({ tripId: z.string().uuid() }),
            body: z.object({
                role: z.enum(['editor', 'viewer']).default('editor'),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { role } = request.body;
        const { dbUser } = request;

        // Only editors+ can generate invites
        await requireRole(app, tripId, dbUser?.id, 'editor');

        const invite = await app.prisma.tripInvite.create({
            data: {
                tripId,
                role,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });

        await logAction(app.prisma, {
            tripId,
            userId: dbUser?.id,
            userName: dbUser?.name,
            action: 'invite_created',
            entity: 'trip_invite',
            entityId: invite.id,
            details: `Link de convite criado (role: ${role})`,
        });

        return {
            token: invite.token,
            role: invite.role,
            expiresAt: invite.expiresAt,
        };
    });

    // Accept Invite
    zApp.post('/invites/:token/accept', {
        schema: {
            params: z.object({ token: z.string().uuid() }),
        },
    }, async (request) => {
        const { token } = request.params;
        const { dbUser } = request;

        if (!dbUser) throw new ApiError('UNAUTHORIZED', 'Faça login para aceitar o convite', 401);

        const invite = await app.prisma.tripInvite.findUnique({ where: { token } });
        if (!invite) throw new ApiError('NOT_FOUND', 'Convite não encontrado ou já utilizado', 404);

        if (invite.expiresAt < new Date()) {
            // Clean up expired invite
            await app.prisma.tripInvite.delete({ where: { id: invite.id } });
            throw new ApiError('VALIDATION_ERROR', 'Este convite expirou. Peça um novo link ao organizador.');
        }

        // Check if already a participant
        const existing = await app.prisma.participant.findFirst({
            where: { tripId: invite.tripId, userId: dbUser.id },
        });

        if (existing) {
            // Already a participant, delete the invite and return success
            await app.prisma.tripInvite.delete({ where: { id: invite.id } });
            return { message: 'Você já é participante desta viagem', tripId: invite.tripId };
        }

        // Create participant and delete invite in a transaction
        const participant = await app.prisma.$transaction(async (tx) => {
            const p = await tx.participant.create({
                data: {
                    tripId: invite.tripId,
                    userId: dbUser.id,
                    name: dbUser.name || dbUser.email || 'Convidado',
                    email: dbUser.email,
                    isOwner: false,
                    role: invite.role,
                },
            });

            await tx.tripInvite.delete({ where: { id: invite.id } });

            return p;
        });

        await logAction(app.prisma, {
            tripId: invite.tripId,
            userId: dbUser.id,
            userName: dbUser.name,
            action: 'participant_joined',
            entity: 'participant',
            entityId: participant.id,
            details: `${dbUser.name || dbUser.email} entrou na viagem via convite`,
        });

        return { message: 'Convite aceito! Você foi adicionado à viagem.', tripId: invite.tripId };
    });

    // Get Audit Log for Trip
    zApp.get('/trips/:tripId/audit', {
        schema: {
            params: z.object({ tripId: z.string().uuid() }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { dbUser } = request;

        // Any participant can view the log
        await requireRole(app, tripId, dbUser?.id, 'viewer');

        const logs = await app.prisma.auditLog.findMany({
            where: { tripId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return logs;
    });
}
