import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';

export async function activitiesRoutes(app: FastifyInstance) {
    const zApp = app.withTypeProvider<ZodTypeProvider>();
    zApp.addHook('onRequest', app.authenticate);

    zApp.post('/', {
        schema: {
            body: z.object({
                dayId: z.string().uuid(),
                title: z.string().min(1),
                timeStart: z.string().optional(), // TIME_HH_MM
                timeEnd: z.string().optional(),
                locationName: z.string().optional(),
                address: z.string().optional(),
                mapUrl: z.string().optional(),
                cost: z.number().optional(),
                currency: z.string().optional(),
                notes: z.string().optional(),
                orderIndex: z.number().int().default(0),
            })
        }
    }, async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const { dayId, ...data } = request.body;

        // Verify Day belongs to user's workspace
        const day = await app.prisma.itineraryDay.findUnique({
            where: { id: dayId },
            include: { trip: true }
        });

        if (!day) throw new ApiError('NOT_FOUND', 'Dia não encontrado', 404);
        if (day.trip.workspaceId !== activeWorkspace.id) {
            throw new ApiError('FORBIDDEN', 'Acesso negado', 403);
        }

        const activity = await app.prisma.activity.create({
            data: {
                dayId,
                ...data
            }
        });

        return activity;
    });
}
