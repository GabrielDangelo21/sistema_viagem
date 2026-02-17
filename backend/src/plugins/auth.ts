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

import buildGetJwks from 'get-jwks';

const getJwks = buildGetJwks({
    providerDiscovery: false, // Supabase doesn't strictly follow OIDC discovery for this endpoint usually, or simply providing JWKS URL is enough
    ttl: 600000, // Cache for 10 minutes
});

// Helper to get Supabase Project ID or URL from env
// We assume DATABASE_URL contains the project ID or we use a new env var. 
// Ideally we should add SUPABASE_URL to backend .env, but for now strict replacement:
// We know the URL is https://hhxaoitjibuqsybhknzc.supabase.co
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hhxaoitjibuqsybhknzc.supabase.co';
const JWKS_URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;

export default fp(async (fastify, opts) => {
    fastify.register(fastifyJwt, {
        decode: { complete: true }, // We need the header to get 'kid'
        secret: async (request: FastifyRequest, token: any) => {
            const { header } = token;
            // Fetch the public key from Supabase JWKS
            const publicKey = await getJwks.getPublicKey({
                domain: JWKS_URL,
                alg: header.alg,
                kid: header.kid,
            });
            return publicKey;
        },
        sign: { algorithm: 'RS256' }, // Default for signing (not used here but good practice)
        verify: { allowedIss: [SUPABASE_URL], algorithms: ['RS256', 'ES256', 'HS256', 'EdDSA'] }
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
            request.log.error({ msg: 'JWT Verification Error', err });
            throw new ApiError('UNAUTHORIZED', 'Invalid or expired token', 401);
        }
    });
});
