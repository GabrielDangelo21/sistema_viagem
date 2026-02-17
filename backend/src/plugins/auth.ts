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
    console.log('--- AUTH PLUGIN INITIALIZED ---');
    console.log('SUPABASE_URL:', SUPABASE_URL);
    console.log('JWKS_URL:', JWKS_URL);

    fastify.register(fastifyJwt, {
        decode: { complete: true },
        secret: async (request: FastifyRequest, token: any) => {
            const { header } = token;
            try {
                return await getJwks.getPublicKey({
                    domain: `${SUPABASE_URL}/auth/v1`,
                    alg: header.alg,
                    kid: header.kid,
                });
            } catch (err) {
                console.error('[Auth] JWKS Error:', err);
                throw err;
            }
        },
        sign: { algorithm: 'RS256' },
        verify: {
            allowedIss: [SUPABASE_URL, `${SUPABASE_URL}/auth/v1`],
            algorithms: ['RS256', 'ES256', 'HS256', 'EdDSA']
        }
    });

    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // const token = request.headers.authorization?.replace(/^Bearer /i, '');
            // if (token) {
            //     const decoded = fastify.jwt.decode(token, { complete: true }) as any;
            //     console.log('Header:', decoded?.header);
            //     console.log('Payload ISS:', decoded?.payload?.iss);
            //     console.log('Payload SUB:', decoded?.payload?.sub);
            //     // console.log('Payload:', decoded?.payload);
            // } else {
            //     console.warn('[Auth] No token found in header');
            // }

            await request.jwtVerify();

            const jwtUser = request.user as { sub: string; email: string; user_metadata?: { name?: string } };
            request.jwtUser = jwtUser;

            // Try to fetch local user
            // ... (rest of logic) ...
            const user = await fastify.prisma.user.findUnique({
                where: { id: jwtUser.sub },
                include: {
                    workspaces: true
                }
            });

            if (user) {
                request.dbUser = user;
                const ownedWorkspace = user.workspaces.find(w => w.ownerUserId === user.id);
                request.activeWorkspace = ownedWorkspace || null;
            } else {
                console.log('User not found in local DB, creating JIT...');
                const newUser = await fastify.prisma.user.create({
                    data: {
                        id: jwtUser.sub,
                        name: jwtUser.user_metadata?.name || 'Viajante',
                        email: jwtUser.email,
                        workspaces: {
                            create: {
                                name: 'Meu Espaço',
                                planId: 'free'
                            }
                        }
                    },
                    include: { workspaces: true }
                });

                request.dbUser = newUser;
                request.activeWorkspace = newUser.workspaces[0] || null;
                console.log('JIT User Created:', newUser.id);
            }

        } catch (err) {
            console.error('CRITICAL JWT ERROR:', err);
            // More detailed logging
            if (err instanceof Error) {
                console.error('Error Message:', err.message);
                console.error('Error Stack:', err.stack);
            }
            throw new ApiError('UNAUTHORIZED', 'Invalid or expired token', 401);
        }
    });
});
