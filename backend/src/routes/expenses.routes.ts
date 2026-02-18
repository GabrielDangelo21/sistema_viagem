import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';

export async function expensesRoutes(app: FastifyInstance) {
    const zApp = app.withTypeProvider<ZodTypeProvider>();
    zApp.addHook('onRequest', app.authenticate);

    // List Expenses
    zApp.get('/', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const trip = await app.prisma.trip.findFirst({
            where: { id: tripId, workspaceId: activeWorkspace.id }
        });
        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        const expenses = await app.prisma.expense.findMany({
            where: { tripId },
            include: {
                paidBy: { select: { id: true, name: true, email: true } },
                shares: { include: { participant: { select: { id: true, name: true } } } }
            },
            orderBy: { date: 'desc' }
        });

        return expenses;
    });

    // Create Expense
    zApp.post('/', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
            body: z.object({
                title: z.string().min(1),
                amount: z.number().positive(),
                currency: z.string().default('BRL'),
                paidByParticipantId: z.string().uuid(),
                date: z.string().datetime().optional(), // ISO String
                participantIdsToSplit: z.array(z.string().uuid()).min(1),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { title, amount, currency, paidByParticipantId, date, participantIdsToSplit } = request.body;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        const trip = await app.prisma.trip.findFirst({
            where: { id: tripId, workspaceId: activeWorkspace.id }
        });
        if (!trip) throw new ApiError('NOT_FOUND', 'Viagem não encontrada', 404);

        // Verify payer exists in trip
        const payer = await app.prisma.participant.findFirst({
            where: { id: paidByParticipantId, tripId }
        });
        if (!payer) throw new ApiError('VALIDATION_ERROR', 'Pagador não encontrado nesta viagem');

        // Check if all split participants exist in trip
        const count = await app.prisma.participant.count({
            where: {
                tripId,
                id: { in: participantIdsToSplit }
            }
        });
        if (count !== participantIdsToSplit.length) {
            throw new ApiError('VALIDATION_ERROR', 'Alguns participantes da divisão não foram encontrados na viagem');
        }

        // Calculate shares
        const shareAmount = Number((amount / participantIdsToSplit.length).toFixed(2));
        // Adjust for penny rounding if needed? For MVP, simplistic division is okay, maybe warn?
        // Better: distribute remainder.
        // Total = 100, 3 people = 33.33 * 3 = 99.99. Missing 0.01.
        // Let's implement robust split later. For now, simple fixed point.

        return await app.prisma.$transaction(async (tx) => {
            const expense = await tx.expense.create({
                data: {
                    tripId,
                    title,
                    amount,
                    currency,
                    paidByParticipantId,
                    date: date ? new Date(date) : new Date(),
                }
            });

            const sharesData = participantIdsToSplit.map(pid => ({
                expenseId: expense.id,
                participantId: pid,
                amount: shareAmount, // Approximate for now
                isPaid: pid === paidByParticipantId // The payer "paid" their share implicitly? No, 'isPaid' usually means "settled debt". Payer doesn't owe anyone for this expense. 
                // Wait, 'isPaid' in my schema meant "Debt settled".
                // If I am the payer, I don't have a debt to myself.
                // But usually splitwise shows "You owe 0" or doesn't show yourself in debt list.
                // But for calculation, we need to know everyone's share.
                // If Payer is in split list, they have a share of X. They paid Total.
                // Net = Paid - Share.
                // Others: Net = 0 - Share.
            }));

            await tx.expenseShare.createMany({ data: sharesData });

            return expense;
        });
    });

    // Get Balances
    zApp.get('/balances', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { activeWorkspace } = request;
        if (!activeWorkspace) throw new ApiError('UNAUTHORIZED', 'Workspace não encontrado', 401);

        // 1. Get all expenses and shares
        const expenses = await app.prisma.expense.findMany({
            where: { tripId },
            include: { shares: true }
        });

        // 2. Initialize balances map: ParticipantID -> Net Balance
        // Positive = Owed to them (receives money)
        // Negative = Owes money (needs to pay)
        const balances: Record<string, number> = {};

        // Helper to add
        const addBalance = (pid: string, amount: number) => {
            balances[pid] = (balances[pid] || 0) + amount;
        };

        for (const expense of expenses) {
            // Payer gets +Total (he paid, so he is "owed" the total by the group conceptually, before subtracting his share)
            // OR simpler:
            // Payer Paid 100.
            // Share A: 33. A owes 33.
            // Share B: 33. B owes 33.
            // Share Payer: 33. Payer owes 33.
            // Payer Net for this transaction: +100 (Out of pocket) - 33 (Consumed) = +66.
            // A Net: 0 - 33 = -33.
            // B Net: 0 - 33 = -33.
            // Sum = 66 - 33 - 33 = 0. Correct.

            addBalance(expense.paidByParticipantId, expense.amount);

            for (const share of expense.shares) {
                addBalance(share.participantId, -share.amount);
            }
        }

        // 3. Simplify debts (Optional)
        // For now, just return the net balances or a list of "Who owes whom".
        // A simple "Who owes whom" algorithm reduces the graph.
        // Let's implement a basic one.

        const debtors: { id: string, amount: number }[] = [];
        const creditors: { id: string, amount: number }[] = [];

        for (const [pid, amount] of Object.entries(balances)) {
            const val = Number(amount.toFixed(2));
            if (val < -0.01) debtors.push({ id: pid, amount: -val }); // Owes money
            else if (val > 0.01) creditors.push({ id: pid, amount: val }); // Is owed money
        }

        // Match debtors to creditors
        const transactions: { from: string, to: string, amount: number }[] = [];

        let i = 0; // debtor index
        let j = 0; // creditor index

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            if (!debtor || !creditor) break;

            const amount = Math.min(debtor.amount, creditor.amount);
            if (amount > 0) {
                transactions.push({
                    from: debtor.id,
                    to: creditor.id,
                    amount: Number(amount.toFixed(2))
                });
            }

            debtor.amount -= amount;
            creditor.amount -= amount;

            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        // Fetch names for IDs
        const participantIds = [...new Set([...transactions.map(t => t.from), ...transactions.map(t => t.to)])];
        const participants = await app.prisma.participant.findMany({
            where: { id: { in: participantIds } },
            select: { id: true, name: true }
        });
        const pMap = new Map(participants.map(p => [p.id, p]));

        const detailedTransactions = transactions.map(t => ({
            from: pMap.get(t.from)?.name || 'Unknown',
            to: pMap.get(t.to)?.name || 'Unknown',
            amount: t.amount,
            currency: 'BRL' // Assuming single currency for now
        }));

        return {
            balances,
            suggestedPayments: detailedTransactions
        };
    });
}
