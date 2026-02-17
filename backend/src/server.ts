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


export const app = Fastify({
    logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(cors);
app.register(prismaPlugin);
app.register(authPlugin);

app.setErrorHandler(errorHandler);

// Routes
app.register(authRoutes, { prefix: '/api' });
app.register(tripsRoutes, { prefix: '/api/trips' });
app.register(activitiesRoutes, { prefix: '/api/activities' });
app.register(reservationsRoutes, { prefix: '/api/reservations' });
app.register(uploadsRoutes, { prefix: '/api/uploads' });

if (import.meta.url === `file://${process.argv[1]}`) {
    const start = async () => {
        try {
            const port = Number(process.env.PORT) || 3333;
            await app.listen({ port, host: '0.0.0.0' });
            console.log(`Server running on http://0.0.0.0:${port}`);
        } catch (err) {
            app.log.error(err);
            process.exit(1);
        }
    };
    start();
}
