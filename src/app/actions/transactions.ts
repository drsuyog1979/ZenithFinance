"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { TransactionType, ImportSource } from "@prisma/client";

async function getUserId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    return user.id;
}

export async function getTransactions(options: {
    month?: number;
    year?: number;
    walletId?: string;
    limit?: number;
} = {}) {
    try {
        const userId = await getUserId();

        let dateFilter = {};
        if (options.month !== undefined && options.year !== undefined) {
            const startDate = new Date(options.year, options.month, 1);
            const endDate = new Date(options.year, options.month + 1, 0);
            dateFilter = {
                date: {
                    gte: startDate,
                    lte: endDate,
                }
            };
        }

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                ...(options.walletId ? { walletId: options.walletId } : {}),
                ...dateFilter
            },
            orderBy: { date: 'desc' },
            take: options.limit,
            include: {
                wallet: true
            }
        });
        return { data: transactions };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function createTransaction(data: {
    amount: number;
    date: Date;
    category: string;
    description?: string;
    type: TransactionType;
    walletId: string;
    isRecurring?: boolean;
}) {
    try {
        const userId = await getUserId();
        const transaction = await prisma.transaction.create({
            data: {
                ...data,
                source: ImportSource.MANUAL,
                userId,
            }
        });
        return { data: transaction };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function deleteTransaction(transactionId: string) {
    try {
        const userId = await getUserId();
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (tx?.userId !== userId) throw new Error("Unauthorized");

        await prisma.transaction.delete({ where: { id: transactionId } });
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function updateTransaction(
    transactionId: string,
    data: {
        amount?: number;
        category?: string;
        description?: string;
        type?: TransactionType;
        date?: Date;
        walletId?: string;
    }
) {
    try {
        const userId = await getUserId();
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (tx?.userId !== userId) throw new Error("Unauthorized");

        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data,
            include: { wallet: true },
        });
        return { data: updated };
    } catch (error: any) {
        return { error: error.message };
    }
}
