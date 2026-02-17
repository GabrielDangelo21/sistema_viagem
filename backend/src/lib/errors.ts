import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export type ErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'PLAN_LIMIT_REACHED'
    | 'INTERNAL_ERROR';

export class ApiError extends Error {
    public readonly code: ErrorCode;
    public readonly details?: Record<string, any>;
    public readonly statusCode: number;

    constructor(code: ErrorCode, message: string, statusCode: number = 400, details?: Record<string, any>) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}

export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
    if (error instanceof ApiError) {
        return reply.status(error.statusCode).send({
            code: error.code,
            message: error.message,
            details: error.details || {}
        });
    }

    if (error instanceof ZodError) {
        return reply.status(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Erro de validação',
            details: { issues: error.issues }
        });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation
        if (error.code === 'P2002') {
            return reply.status(409).send({
                code: 'VALIDATION_ERROR',
                message: 'Violação de restrição única (dados duplicados)',
                details: { fields: error.meta?.target }
            });
        }
    }

    request.log.error(error);

    return reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor',
        details: {}
    });
}
