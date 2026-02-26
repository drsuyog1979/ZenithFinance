"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { startOfYear, endOfYear, startOfQuarter, endOfQuarter, subYears, addMonths, startOfMonth } from "date-fns";

async function getUserId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    return user.id;
}

export async function getTransactionsForExport(params: {
    startDate?: string;
    endDate?: string;
    preset?: "current_fy" | "last_fy" | "q1" | "q2" | "q3" | "q4";
}) {
    const userId = await getUserId();
    let start: Date;
    let end: Date;

    const now = new Date();
    // Indian FY: April to March
    const getCurrentFYStart = (d: Date) => {
        const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
        return new Date(year, 3, 1); // April 1st
    };

    if (params.preset === "current_fy") {
        start = getCurrentFYStart(now);
        end = new Date(start.getFullYear() + 1, 2, 31, 23, 59, 59); // March 31st next year
    } else if (params.preset === "last_fy") {
        const currentFYStart = getCurrentFYStart(now);
        start = new Date(currentFYStart.getFullYear() - 1, 3, 1);
        end = new Date(currentFYStart.getFullYear(), 2, 31, 23, 59, 59);
    } else if (params.preset?.startsWith("q")) {
        // Quarter logic based on FY: Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar)
        const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const q = params.preset;
        if (q === "q1") { start = new Date(fyYear, 3, 1); end = new Date(fyYear, 5, 30, 23, 59, 59); }
        else if (q === "q2") { start = new Date(fyYear, 6, 1); end = new Date(fyYear, 8, 30, 23, 59, 59); }
        else if (q === "q3") { start = new Date(fyYear, 9, 1); end = new Date(fyYear, 11, 31, 23, 59, 59); }
        else { // q4
            start = new Date(fyYear + 1, 0, 1);
            end = new Date(fyYear + 1, 2, 31, 23, 59, 59);
        }
    } else if (params.startDate && params.endDate) {
        start = new Date(params.startDate);
        end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
    } else {
        // Default last 30 days
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
    }

    const transactions = await prisma.transaction.findMany({
        where: {
            userId,
            date: { gte: start, lte: end }
        },
        include: { wallet: true },
        orderBy: { date: "desc" }
    });

    return transactions.map(tx => ({
        id: tx.id,
        date: tx.date.toISOString(),
        amount: tx.amount / 100, // format back to decimals
        category: tx.category,
        description: tx.description || "-",
        wallet: tx.wallet.name,
        type: tx.type
    }));
}
