import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { isValidIsoDateTime } from '../lib/date.js';
import { ReservationStatus, ReservationType } from '@prisma/client';

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
                startDateTime: z.string().refine(isValidIsoDateTime, 'Invalid ISO DateTime'),
                endDateTime: z.string().refine(isValidIsoDateTime, 'Invalid ISO DateTime').optional(),
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
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'No workspace', 401);

        const { tripId, startDateTime, endDateTime, ...data } = request.body;

        // Verify Trip
        const trip = await app.prisma.trip.findUnique({
            where: { id: tripId }
        });

        if (!trip) throw new ApiError('NOT_FOUND', 'Trip not found', 404);
        if (trip.workspaceId !== activeWorkspace.id) throw new ApiError('FORBIDDEN', 'Access denied', 403);

        // Validation: end >= start
        if (endDateTime && startDateTime > endDateTime) {
            throw new ApiError('VALIDATION_ERROR', 'endDateTime must be after startDateTime', 400);
        }

        const reservation = await app.prisma.reservation.create({
            data: {
                tripId,
                startDateTime,
                endDateTime,
                ...data
            }
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
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'No workspace', 401);

        const reservation = await app.prisma.reservation.findUnique({
            where: { id },
            include: { trip: true }
        });

        if (!reservation) throw new ApiError('NOT_FOUND', 'Reservation not found', 404);
        if (reservation.trip.workspaceId !== activeWorkspace.id) throw new ApiError('FORBIDDEN', 'Access denied', 403);

        const { startDateTime, endDateTime, ...data } = request.body;

        // Check dates if provided
        const newStart = startDateTime || reservation.startDateTime;
        const newEnd = endDateTime !== undefined ? endDateTime : reservation.endDateTime;

        if (newEnd && newStart > newEnd) {
            throw new ApiError('VALIDATION_ERROR', 'endDateTime must be after startDateTime', 400);
        }

        const updated = await app.prisma.reservation.update({
            where: { id },
            data: {
                startDateTime,
                endDateTime,
                ...data
            }
        });

        return updated;
    });

    // Delete Reservation
    zApp.delete('/:id', {
        schema: { params: z.object({ id: z.string().uuid() }) }
    }, async (request) => {
        const { id } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'No workspace', 401);

        const reservation = await app.prisma.reservation.findUnique({
            where: { id },
            include: { trip: true }
        });

        if (!reservation) throw new ApiError('NOT_FOUND', 'Reservation not found', 404);
        if (reservation.trip.workspaceId !== activeWorkspace.id) throw new ApiError('FORBIDDEN', 'Access denied', 403);

        await app.prisma.reservation.delete({ where: { id } });

        return { message: 'Reservation deleted' };
    });
}
