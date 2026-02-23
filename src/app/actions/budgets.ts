"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

async function getUserId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    return user.id;
}

export async function getBudgets(monthYear: string) {
    try {
        const userId = await getUserId();
        const budgets = await prisma.budget.findMany({
            where: { userId, monthYear },
        });
        return { data: budgets };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function upsertBudget(category: string, monthYear: string, limitAmount: number) {
    try {
        const userId = await getUserId();

        // Ensure user exists
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: (await (await createClient()).auth.getUser()).data.user?.email || "",
            }
        });

        const budget = await prisma.budget.upsert({
            where: {
                userId_category_monthYear: {
                    userId,
                    category,
                    monthYear
                }
            },
            update: {
                limitAmount
            },
            create: {
                userId,
                category,
                monthYear,
                limitAmount
            }
        });
        return { data: budget };
    } catch (error: any) {
        return { error: error.message };
    }
}
