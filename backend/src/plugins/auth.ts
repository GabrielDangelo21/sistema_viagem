import fp from 'fastify-plugin';
import fastifyJwt, { type FastifyJWTOptions } from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../lib/errors.js';
import type { User, Workspace } from '@prisma/client';

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: {
            sub: string;
            email: string;
            [key: string]: any;
        };
    }
}

declare module 'fastify' {
    interface FastifyRequest {
        dbUser: User | null;
        activeWorkspace: Workspace | null;
        jwtUser: { sub: string; email: string } | null;
    }
}

export default fp(async (fastify, opts) => {
    fastify.register(fastifyJwt, {
        secret: process.env.SUPABASE_JWT_SECRET!,
    });

    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify();

            const jwtUser = request.user as { sub: string; email: string };
            request.jwtUser = jwtUser;

            // Try to fetch local user
            const user = await fastify.prisma.user.findUnique({
                where: { id: jwtUser.sub },
                include: {
                    workspaces: true
                }
            });

            if (user) {
                request.dbUser = user;
                // Assume context is the owned workspace for now (Multi-tenancy rule: "user only accesses own workspace")
                // Finding the workspace where ownerUserId == user.id
                const ownedWorkspace = user.workspaces.find(w => w.ownerUserId === user.id);
                request.activeWorkspace = ownedWorkspace || null;
            } else {
                request.dbUser = null;
                request.activeWorkspace = null;
            }

        } catch (err) {
            throw new ApiError('UNAUTHORIZED', 'Invalid or expired token', 401);
        }
    });
});
