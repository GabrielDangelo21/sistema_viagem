import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import { errorHandler } from './lib/errors.js';
import { authRoutes } from './routes/auth.routes.js';
import { tripsRoutes } from './routes/trips.routes.js';
import { activitiesRoutes } from './routes/activities.routes.js';
import { reservationsRoutes } from './routes/reservations.routes.js';
import { uploadsRoutes } from './routes/uploads.routes.js';

const server = Fastify({
    logger: true,
});

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(cors);
server.register(prismaPlugin);
server.register(authPlugin);

server.setErrorHandler(errorHandler);

// Routes
server.register(authRoutes, { prefix: '/api' });
server.register(tripsRoutes, { prefix: '/api/trips' });
server.register(activitiesRoutes, { prefix: '/api/activities' });
server.register(reservationsRoutes, { prefix: '/api/reservations' });
server.register(uploadsRoutes, { prefix: '/api/uploads' });

const start = async () => {
    try {
        await server.listen({ port: 3333, host: '0.0.0.0' });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
