import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export async function authRoutes(app: FastifyInstance) {
    app.addHook('onRequest', app.authenticate);

    app.get('/me', async (request, reply) => {
        const { jwtUser, dbUser, activeWorkspace } = request;

        if (dbUser && activeWorkspace) {
            return { user: dbUser, workspace: activeWorkspace };
        }

        if (!jwtUser) {
            return reply.status(401).send({ message: 'Não autorizado' });
        }

        const newUser = await app.prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    id: jwtUser.sub,
                    email: jwtUser.email,
                    name: jwtUser.email.split('@')[0] ?? 'User',
                },
            });

            const createdWorkspace = await tx.workspace.create({
                data: {
                    name: 'My Workspace',
                    ownerUserId: createdUser.id,
                    planId: 'free',
                },
            });

            return { user: createdUser, workspace: createdWorkspace };
        });

        return newUser;
    });

    // Update user profile
    const updateProfileSchema = z.object({
        name: z.string().min(1).max(100).optional(),
        avatarUrl: z.string().url().max(2048).nullable().optional(),
        timezone: z.string().min(1).max(100).optional(),
        locale: z.enum(['pt-BR', 'en-US', 'es-ES']).optional(),
    });

    app.put('/me', async (request, reply) => {
        const { dbUser } = request;
        if (!dbUser) {
            return reply.status(401).send({ message: 'Não autorizado' });
        }

        const parsed = updateProfileSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                message: 'Dados inválidos',
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const updated = await app.prisma.user.update({
            where: { id: dbUser.id },
            data: parsed.data,
        });

        return { user: updated };
    });
}
