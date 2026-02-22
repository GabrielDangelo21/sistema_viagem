import type { PrismaClient } from '@prisma/client';

interface LogParams {
    tripId: string;
    userId?: string | null;
    userName?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    details?: string | null;
}

/**
 * Logs an action to the AuditLog table.
 * Fire-and-forget: errors are caught silently to avoid disrupting the main flow.
 */
export async function logAction(prisma: PrismaClient, params: LogParams) {
    try {
        await prisma.auditLog.create({
            data: {
                tripId: params.tripId,
                userId: params.userId || null,
                userName: params.userName || null,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId || null,
                details: params.details || null,
            },
        });
    } catch (err) {
        console.error('[AuditLog] Failed to log action:', err);
    }
}
