-- CreateTable
CREATE TABLE IF NOT EXISTS "Participant" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "paidByParticipantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExpenseShare" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExpenseShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Participant_tripId_idx" ON "Participant"("tripId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Participant_userId_idx" ON "Participant"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_tripId_idx" ON "Expense"("tripId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_paidByParticipantId_idx" ON "Expense"("paidByParticipantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExpenseShare_expenseId_idx" ON "ExpenseShare"("expenseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExpenseShare_participantId_idx" ON "ExpenseShare"("participantId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Participant" ADD CONSTRAINT "Participant_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidByParticipantId_fkey" FOREIGN KEY ("paidByParticipantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ExpenseShare" ADD CONSTRAINT "ExpenseShare_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ExpenseShare" ADD CONSTRAINT "ExpenseShare_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
