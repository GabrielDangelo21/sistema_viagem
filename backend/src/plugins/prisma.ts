import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}

const prismaPlugin: FastifyPluginAsync = async (fastify, options) => {
    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });

    try {
        await prisma.$connect();
        fastify.log.info('Prisma connected successfully');
    } catch (err) {
        fastify.log.error({ msg: 'Prisma connection failed', err });
        throw err;
    }

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async (server) => {
        await server.prisma.$disconnect();
    });
};

export default fp(prismaPlugin);
