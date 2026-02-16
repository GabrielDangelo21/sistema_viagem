import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

// TODO: Implement actual Supabase Storage upload or Signed URL generation
// For now, this is a placeholder as requested in the plan (Upload opcional)

export async function uploadsRoutes(app: FastifyInstance) {
    app.addHook('onRequest', app.authenticate);

    app.post('/attachment', async (request, reply) => {
        return { message: 'Upload endpoint not implemented yet' };
    });
}
