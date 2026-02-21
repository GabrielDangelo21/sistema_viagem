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
                latitude: z.number().optional(),
                longitude: z.number().optional(),
                orderIndex: z.number().int().default(0),
            })
        }
    }, async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const { dayId, ...data } = request.body;

        // Verify Day belongs to user's workspace
        // Verify Day belongs to user's workspace OR user is participant
        const day = await app.prisma.itineraryDay.findUnique({
            where: { id: dayId },
            include: { trip: { include: { participants: true } } }
        });

        if (!day) throw new ApiError('NOT_FOUND', 'Dia não encontrado', 404);

        const isOwner = day.trip.workspaceId === activeWorkspace.id;
        const isParticipant = request.dbUser && day.trip.participants.some(p => p.userId === request.dbUser?.id);

        if (!isOwner && !isParticipant) {
            throw new ApiError('FORBIDDEN', 'Acesso negado', 403);
        }

        let finalLat = data.latitude;
        let finalLng = data.longitude;

        if (!finalLat && !finalLng && (data.address || data.locationName)) {
            try {
                // Tenta geocodificar pelo endereço ou nome do local via Nominatim (OpenStreetMap)
                const query = encodeURIComponent(data.address || data.locationName || '');
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
                    headers: { 'User-Agent': 'TravelSystemApp/1.0' }
                });

                if (response.ok) {
                    const geoData = await response.json();
                    if (geoData && geoData.length > 0) {
                        finalLat = parseFloat(geoData[0].lat);
                        finalLng = parseFloat(geoData[0].lon);
                    }
                }
            } catch (err) {
                app.log.error(err, 'Geocoding error');
            }
        }

        const activity = await app.prisma.activity.create({
            data: {
                dayId,
                ...data,
                latitude: finalLat,
                longitude: finalLng
            }
        });

        return activity;
    });

    zApp.put('/reorder/:dayId', {
        schema: {
            params: z.object({
                dayId: z.string().uuid(),
            }),
            body: z.object({
                activityIds: z.array(z.string().uuid()),
            })
        }
    }, async (request, reply) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const { dayId } = request.params;
        const { activityIds } = request.body;

        const day = await app.prisma.itineraryDay.findUnique({
            where: { id: dayId },
            include: { trip: { include: { participants: true } } }
        });

        if (!day) throw new ApiError('NOT_FOUND', 'Dia não encontrado', 404);

        const isOwner = day.trip.workspaceId === activeWorkspace.id;
        const isParticipant = request.dbUser && day.trip.participants.some(p => p.userId === request.dbUser?.id);

        if (!isOwner && !isParticipant) {
            throw new ApiError('FORBIDDEN', 'Acesso negado', 403);
        }

        const updates = activityIds.map((id, index) => {
            return app.prisma.activity.update({
                where: { id, dayId },
                data: { orderIndex: index }
            });
        });

        await app.prisma.$transaction(updates);

        return reply.status(204).send();
    });

    zApp.put('/:id', {
        schema: {
            params: z.object({
                id: z.string().uuid(),
            }),
            body: z.object({
                dayId: z.string().uuid().optional(),
                title: z.string().min(1).optional(),
                timeStart: z.string().optional(),
                timeEnd: z.string().optional(),
                locationName: z.string().optional(),
                address: z.string().optional(),
                mapUrl: z.string().optional(),
                cost: z.number().optional(),
                currency: z.string().optional(),
                notes: z.string().optional(),
                latitude: z.number().optional().nullable(),
                longitude: z.number().optional().nullable(),
                orderIndex: z.number().int().optional(),
            })
        }
    }, async (request) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const { id } = request.params;
        const data = request.body;

        const activity = await app.prisma.activity.findUnique({
            where: { id },
            include: { day: { include: { trip: { include: { participants: true } } } } }
        });

        if (!activity) throw new ApiError('NOT_FOUND', 'Atividade não encontrada', 404);

        const isOwner = activity.day.trip.workspaceId === activeWorkspace.id;
        const isParticipant = request.dbUser && activity.day.trip.participants.some(p => p.userId === request.dbUser?.id);

        if (!isOwner && !isParticipant) {
            throw new ApiError('FORBIDDEN', 'Acesso negado', 403);
        }

        let finalLat = data.latitude !== undefined ? data.latitude : activity.latitude;
        let finalLng = data.longitude !== undefined ? data.longitude : activity.longitude;

        if (!finalLat && !finalLng && (data.address || data.locationName) && (data.address !== activity.address || data.locationName !== activity.locationName)) {
            try {
                const query = encodeURIComponent(data.address || data.locationName || '');
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
                    headers: { 'User-Agent': 'TravelSystemApp/1.0' }
                });

                if (response.ok) {
                    const geoData = await response.json();
                    if (geoData && geoData.length > 0) {
                        finalLat = parseFloat(geoData[0].lat);
                        finalLng = parseFloat(geoData[0].lon);
                    }
                }
            } catch (err) {
                app.log.error(err, 'Geocoding error');
            }
        }

        const updatedActivity = await app.prisma.activity.update({
            where: { id },
            data: {
                ...data,
                latitude: finalLat,
                longitude: finalLng
            }
        });

        return updatedActivity;
    });

    zApp.delete('/:id', {
        schema: {
            params: z.object({
                id: z.string().uuid(),
            })
        }
    }, async (request, reply) => {
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const { id } = request.params;

        const activity = await app.prisma.activity.findUnique({
            where: { id },
            include: { day: { include: { trip: { include: { participants: true } } } } }
        });

        if (!activity) throw new ApiError('NOT_FOUND', 'Atividade não encontrada', 404);

        const isOwner = activity.day.trip.workspaceId === activeWorkspace.id;
        const isParticipant = request.dbUser && activity.day.trip.participants.some(p => p.userId === request.dbUser?.id);

        if (!isOwner && !isParticipant) {
            throw new ApiError('FORBIDDEN', 'Acesso negado', 403);
        }

        await app.prisma.activity.delete({
            where: { id }
        });

        return reply.status(204).send();
    });
}
