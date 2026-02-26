"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

async function getUserId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    return user.id;
}

export async function getWallets() {
    try {
        const userId = await getUserId();
        const wallets = await prisma.wallet.findMany({
            where: { userId },
            include: {
                transactions: {
                    select: {
                        amount: true,
                        type: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Calculate current balance for each wallet
        const walletsWithBalance = wallets.map(w => {
            let balance = w.openingBalance;
            w.transactions.forEach(tx => {
                if (tx.type === 'INCOME') balance += tx.amount;
                else if (tx.type === 'EXPENSE') balance -= tx.amount;
            });
            const { transactions, ...walletWithoutTxs } = w;
            return {
                ...walletWithoutTxs,
                currentBalance: balance
            };
        });

        return { data: walletsWithBalance };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function createWallet(data: { name: string, currency?: string, openingBalance?: number, color?: string, icon?: string }) {
    try {
        const userId = await getUserId();

        // Ensure user exists in our DB before creating the wallet
        const supabaseUser = (await (await createClient()).auth.getUser()).data.user;
        try {
            await prisma.user.upsert({
                where: { id: userId },
                update: {},
                create: {
                    id: userId,
                    email: supabaseUser?.email || "",
                },
            });
        } catch (e: any) {
            if (e.code === "P2002") {
                // Email exists under a different ID — re-point to current auth ID
                await prisma.user.update({
                    where: { email: supabaseUser?.email! },
                    data: { id: userId },
                });
            } else {
                throw e;
            }
        }

        const wallet = await prisma.wallet.create({
            data: {
                ...data,
                userId,
            }
        });
        return { data: wallet };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function deleteWallet(walletId: string) {
    try {
        const userId = await getUserId();

        // Check if wallet belongs to user
        const wallet = await prisma.wallet.findUnique({
            where: { id: walletId }
        });

        if (wallet?.userId !== userId) {
            throw new Error("Unauthorized");
        }

        await prisma.wallet.delete({
            where: { id: walletId }
        });
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function updateWallet(walletId: string, data: { name?: string, color?: string, openingBalance?: number }) {
    try {
        const userId = await getUserId();

        const wallet = await prisma.wallet.findUnique({
            where: { id: walletId }
        });

        if (wallet?.userId !== userId) {
            throw new Error("Unauthorized");
        }

        const updatedWallet = await prisma.wallet.update({
            where: { id: walletId },
            data
        });

        return { data: updatedWallet };
    } catch (error: any) {
        return { error: error.message };
    }
}
