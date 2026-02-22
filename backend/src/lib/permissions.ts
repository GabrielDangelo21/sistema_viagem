import type { FastifyInstance } from 'fastify';
import { ApiError } from './errors.js';

const ROLE_LEVEL: Record<string, number> = {
    viewer: 0,
    editor: 1,
    owner: 2,
};

/**
 * Checks if the current user has at least the minimum role for the given trip.
 * Returns the participant record if found.
 */
export async function requireRole(
    app: FastifyInstance,
    tripId: string,
    userId: string | undefined,
    minimumRole: 'viewer' | 'editor' | 'owner'
) {
    if (!userId) {
        throw new ApiError('UNAUTHORIZED', 'Usuário não autenticado', 401);
    }

    const participant = await app.prisma.participant.findFirst({
        where: { tripId, userId },
    });

    if (!participant) {
        throw new ApiError('FORBIDDEN', 'Você não é participante desta viagem', 403);
    }

    const userLevel = ROLE_LEVEL[participant.role] ?? 0;
    const requiredLevel = ROLE_LEVEL[minimumRole] ?? 0;

    if (userLevel < requiredLevel) {
        throw new ApiError('FORBIDDEN', 'Permissão insuficiente para esta ação', 403);
    }

    return participant;
}
