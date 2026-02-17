
import { beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

beforeAll(async () => {
    // Connect to the test database
    await prisma.$connect()
})

afterAll(async () => {
    await prisma.$disconnect()
})

beforeEach(async () => {
    // Clean up database before each test

    // Order matters due to foreign keys
    await prisma.activity.deleteMany()
    await prisma.itineraryDay.deleteMany()
    await prisma.reservation.deleteMany()
    await prisma.trip.deleteMany()
    await prisma.workspace.deleteMany()
    await prisma.user.deleteMany()
})
