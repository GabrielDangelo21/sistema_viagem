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
import { participantsRoutes } from './routes/participants.routes.js';
import { checklistRoutes } from './routes/checklist.routes.js'; // Import
import { expensesRoutes } from './routes/expenses.routes.js';
import { staysRoutes } from './routes/stays.routes.js';
import { invitesRoutes } from './routes/invites.routes.js';


export const app = Fastify({
    logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(cors, {
    origin: true, // Allow all origins (or set to specific domains in production)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});
app.register(prismaPlugin);
app.register(authPlugin);

app.setErrorHandler(errorHandler);

// Routes
app.register(authRoutes, { prefix: '/api' });
app.register(tripsRoutes, { prefix: '/api/trips' });
app.register(checklistRoutes, { prefix: '/api' }); // Register
app.register(activitiesRoutes, { prefix: '/api/activities' });
app.register(reservationsRoutes, { prefix: '/api/reservations' });
app.register(uploadsRoutes, { prefix: '/api/uploads' });
app.register(participantsRoutes, { prefix: '/api/trips/:tripId/participants' });
app.register(expensesRoutes, { prefix: '/api/trips/:tripId/expenses' });
app.register(staysRoutes, { prefix: '/api/trips/:tripId/stays' });
app.register(invitesRoutes, { prefix: '/api' });


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
