-- CreateEnum
CREATE TYPE "ReservationType" AS ENUM ('flight', 'hotel', 'car', 'train', 'bus', 'restaurant', 'tour', 'other');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('confirmed', 'pending', 'canceled');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryDay" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "timeStart" TEXT,
    "timeEnd" TEXT,
    "locationName" TEXT,
    "address" TEXT,
    "mapUrl" TEXT,
    "cost" DOUBLE PRECISION,
    "currency" TEXT,
    "notes" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "type" "ReservationType" NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "confirmationCode" TEXT,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "address" TEXT,
    "mapUrl" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL,
    "attachmentFileId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileMeta" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Workspace_ownerUserId_idx" ON "Workspace"("ownerUserId");

-- CreateIndex
CREATE INDEX "Trip_workspaceId_idx" ON "Trip"("workspaceId");

-- CreateIndex
CREATE INDEX "ItineraryDay_tripId_idx" ON "ItineraryDay"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryDay_tripId_date_key" ON "ItineraryDay"("tripId", "date");

-- CreateIndex
CREATE INDEX "Activity_dayId_idx" ON "Activity"("dayId");

-- CreateIndex
CREATE INDEX "Reservation_tripId_idx" ON "Reservation"("tripId");

-- CreateIndex
CREATE INDEX "Reservation_startDateTime_idx" ON "Reservation"("startDateTime");

-- CreateIndex
CREATE INDEX "FileMeta_workspaceId_idx" ON "FileMeta"("workspaceId");

-- CreateIndex
CREATE INDEX "FileMeta_ownerUserId_idx" ON "FileMeta"("ownerUserId");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileMeta" ADD CONSTRAINT "FileMeta_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileMeta" ADD CONSTRAINT "FileMeta_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

