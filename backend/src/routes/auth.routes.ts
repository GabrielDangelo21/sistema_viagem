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
            // Should be caught by authenticate hook, but just in case
            return reply.status(401).send({ message: 'Não autorizado' });
        }

        // Create User + Workspace if they don't exist
        // Using transaction to ensure atomicity
        const newUser = await app.prisma.$transaction(async (tx) => {
            // Create User
            const createdUser = await tx.user.create({
                data: {
                    id: jwtUser.sub, // Sync with Supabase ID
                    email: jwtUser.email,
                    name: jwtUser.email.split('@')[0] ?? 'User', // Default name from email
                },
            });

            // Create Default Workspace
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
}
