import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { isValidIsoDateTime } from '../lib/date.js';
import { ReservationStatus, ReservationType } from '@prisma/client';
import { requireRole } from '../lib/permissions.js';
import { logAction } from '../lib/auditLog.js';

export async function reservationsRoutes(app: FastifyInstance) {
    const zApp = app.withTypeProvider<ZodTypeProvider>();
    zApp.addHook('onRequest', app.authenticate);

    // POST local definitions for Enums to compatibility with Zod
    const ReservationTypeEnum = z.nativeEnum(ReservationType);
    const ReservationStatusEnum = z.nativeEnum(ReservationStatus);

    // Create Reservation
    zApp.post('/', {
        schema: {
            body: z.object({
                tripId: z.string().uuid(),
                title: z.string().min(1),
                type: ReservationTypeEnum,
                status: ReservationStatusEnum,
                startDateTime: z.string().refine(isValidIsoDateTime, 'Formato de data inválido (ISO DateTime)'),
                endDateTime: z.string().refine(isValidIsoDateTime, 'Formato de data inválido (ISO DateTime)').optional(),
                provider: z.string().optional(),
                confirmationCode: z.string().optional(),
                address: z.string().optional(),
                mapUrl: z.string().optional(),
                price: z.number().optional(),
                currency: z.string().default('BRL'),
                notes: z.string().optional(),
            })
        }
    }, async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const { tripId, startDateTime, endDateTime, ...data } = request.body;

        // Verify Trip
        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId },
            include: { participants: true }
        });

        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        if (trip.workspaceId !== activeWorkspace.id) {
            await requireRole(app, tripId, request.dbUser?.id, 'editor');
        }

        // Validation: end >= start
        if (endDateTime && startDateTime > endDateTime) {
            throw new ApiError('VALIDATION_ERROR', 'A data de término deve ser posterior à data de início', 400);
        }

        const reservation = await app.prisma.reservation.create({
            data: {
                tripId,
                startDateTime,
                endDateTime,
                ...data
            }
        });

        await logAction(app.prisma, {
            tripId,
            userId: request.dbUser?.id,
            userName: request.dbUser?.name,
            action: 'reservation_created',
            entity: 'reservation',
            entityId: reservation.id,
            details: `Reserva '${reservation.title}' (${reservation.type}) adicionada`
        });

        return reservation;
    });

    // Update Reservation
    zApp.patch('/:id', {
        schema: {
            params: z.object({ id: z.string().uuid() }),
            body: z.object({
                title: z.string().min(1).optional(),
                type: ReservationTypeEnum.optional(),
                status: ReservationStatusEnum.optional(),
                startDateTime: z.string().refine(isValidIsoDateTime).optional(),
                endDateTime: z.string().refine(isValidIsoDateTime).optional(),
                provider: z.string().optional(),
                confirmationCode: z.string().optional(),
                price: z.number().optional(),
                currency: z.string().optional(),
                notes: z.string().optional(),
            })
        }
    }, async (request) => {
        const { id } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const reservation = await app.prisma.reservation.findUnique({
            where: { id },
            include: { trip: { include: { participants: true } } }
        });

        if (!reservation) throw new ApiError('NOT_FOUND', 'Reserva não encontrada', 404);

        if (reservation.trip.workspaceId !== activeWorkspace.id) {
            await requireRole(app, reservation.tripId, request.dbUser?.id, 'editor');
        }

        const { startDateTime, endDateTime, ...data } = request.body;

        // Check dates if provided
        const newStart = startDateTime || reservation.startDateTime;
        const newEnd = endDateTime !== undefined ? endDateTime : reservation.endDateTime;

        if (newEnd && newStart > newEnd) {
            throw new ApiError('VALIDATION_ERROR', 'A data de término deve ser posterior à data de início', 400);
        }

        const updated = await app.prisma.reservation.update({
            where: { id },
            data: {
                startDateTime,
                endDateTime,
                ...data
            }
        });

        await logAction(app.prisma, {
            tripId: reservation.tripId,
            userId: request.dbUser?.id,
            userName: request.dbUser?.name,
            action: 'reservation_updated',
            entity: 'reservation',
            entityId: id,
            details: `Reserva '${updated.title}' (${updated.type}) editada`
        });

        return updated;
    });

    // Delete Reservation
    zApp.delete('/:id', {
        schema: { params: z.object({ id: z.string().uuid() }) }
    }, async (request) => {
        const { id } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const reservation = await app.prisma.reservation.findUnique({
            where: { id },
            include: { trip: { include: { participants: true } } }
        });

        if (!reservation) throw new ApiError('NOT_FOUND', 'Reserva não encontrada', 404);

        if (reservation.trip.workspaceId !== activeWorkspace.id) {
            await requireRole(app, reservation.tripId, request.dbUser?.id, 'editor');
        }

        await app.prisma.reservation.delete({ where: { id } });

        await logAction(app.prisma, {
            tripId: reservation.tripId,
            userId: request.dbUser?.id,
            userName: request.dbUser?.name,
            action: 'reservation_deleted',
            entity: 'reservation',
            entityId: id,
            details: `Reserva '${reservation.title}' excluída`
        });

        return { message: 'Reserva deletada' };
    });
}
