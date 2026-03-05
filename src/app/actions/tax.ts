"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { TaxRegime, TaxpayerType, ReminderType } from "@prisma/client";
import { startOfYear, endOfYear, format, differenceInMonths, addMonths } from "date-fns";

async function getUserId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    return user.id;
}

export async function getTaxProfile() {
    try {
        const userId = await getUserId();
        const profile = await prisma.taxProfile.findUnique({
            where: { userId }
        });
        return { data: profile };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function updateTaxProfile(data: {
    financialYear: string;
    regime: TaxRegime;
    taxpayerType: TaxpayerType;
    incomeSource: string;
    tdsDeducted: number;
    deductions: any;
}) {
    try {
        const userId = await getUserId();
        const profile = await prisma.taxProfile.upsert({
            where: { userId },
            update: { ...data, userId },
            create: { ...data, userId }
        });

        // After updating profile, re-calculate and sync Advance Tax Reminders
        await syncAdvanceTaxReminders(userId, profile);

        return { data: profile };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function resetTaxProfile() {
    try {
        const userId = await getUserId();
        await prisma.taxProfile.delete({ where: { userId } }).catch(() => { });
        await prisma.reminder.deleteMany({
            where: { userId, type: ReminderType.ADVANCE_TAX }
        });
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function getTaxSummary(excludedWalletIds?: string[]) {
    try {
        const userId = await getUserId();
        const profile = await prisma.taxProfile.findUnique({ where: { userId } });

        // Get all income transactions for current FY (April to March)
        // For simplicity, let's assume Calendar Year for now or check current date to decide FY
        const now = new Date();
        const currentYear = now.getFullYear();
        let fyStart, fyEnd;

        if (now.getMonth() >= 3) { // April onwards
            fyStart = new Date(currentYear, 3, 1);
            fyEnd = new Date(currentYear + 1, 2, 31);
        } else {
            fyStart = new Date(currentYear - 1, 3, 1);
            fyEnd = new Date(currentYear, 2, 31);
        }

        const incomeWhere: any = {
            userId,
            type: "INCOME",
            date: { gte: fyStart, lte: fyEnd }
        };

        // Filter out excluded wallets if provided
        if (excludedWalletIds && excludedWalletIds.length > 0) {
            incomeWhere.walletId = { notIn: excludedWalletIds };
        }

        const incomeAggr = await prisma.transaction.aggregate({
            where: incomeWhere,
            _sum: { amount: true }
        });

        const realizedIncome = incomeAggr._sum?.amount || 0;

        // Use actual realized income instead of projected
        const projectedAnnualIncome = realizedIncome;

        // Get Capital Gains
        const fyString = `${fyStart.getFullYear()}-${fyEnd.getFullYear().toString().slice(-2)}`;
        let stcgEquity = 0;
        let ltcgEquity = 0;
        let stcgDebt = 0;
        let ltcgDebt = 0;

        try {
            const cgTransactions = await prisma.capitalGainsTransaction.findMany({
                where: { userId, financialYear: fyString }
            });

            for (const t of cgTransactions) {
                const isEquity = t.assetClass?.toUpperCase().includes("EQUITY");
                const stGain = t.shortTermGain || 0;
                const ltGain = t.longTermGainWithoutIndex || 0;

                if (isEquity) {
                    stcgEquity += stGain;
                    ltcgEquity += ltGain;
                } else {
                    stcgDebt += stGain;
                    ltcgDebt += ltGain;
                }
            }
        } catch (e) {
            console.error("Failed to get capital gains", e);
        }

        const totalGain = Math.round((stcgEquity + ltcgEquity + stcgDebt + ltcgDebt) * 100);

        let estimatedTax = 0;
        if (profile) {
            estimatedTax = calculateTax(projectedAnnualIncome, { stcgEquity, ltcgEquity, stcgDebt, ltcgDebt }, profile);
        }

        const reminders = await prisma.reminder.findMany({
            where: { userId, type: "ADVANCE_TAX" },
            orderBy: { dueDate: 'asc' }
        });

        return {
            data: {
                profile,
                realizedIncome,
                projectedAnnualIncome,
                capitalGains: {
                    stcgEquity: stcgEquity * 100,
                    ltcgEquity: ltcgEquity * 100,
                    stcgDebt: stcgDebt * 100,
                    ltcgDebt: ltcgDebt * 100,
                    total: totalGain
                },
                realizedGains: totalGain,
                estimatedTax,
                reminders
            }
        };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function getITRSummary() {
    try {
        const userId = await getUserId();
        const profile = await prisma.taxProfile.findUnique({ where: { userId } });

        const now = new Date();
        const currentYear = now.getFullYear();
        let fyStart, fyEnd;

        if (now.getMonth() >= 3) {
            fyStart = new Date(currentYear, 3, 1);
            fyEnd = new Date(currentYear + 1, 2, 31);
        } else {
            fyStart = new Date(currentYear - 1, 3, 1);
            fyEnd = new Date(currentYear, 2, 31);
        }

        const incomeAggrByCategory = await prisma.transaction.groupBy({
            by: ['category'],
            where: {
                userId,
                type: "INCOME",
                date: { gte: fyStart, lte: fyEnd }
            },
            _sum: { amount: true }
        });

        const incomeBySource = incomeAggrByCategory.reduce((acc, curr) => {
            acc[curr.category || "General"] = curr._sum?.amount || 0;
            return acc;
        }, {} as Record<string, number>);

        const totalIncome = Object.values(incomeBySource).reduce((s, amt) => s + amt, 0);

        const fyString = `${fyStart.getFullYear()}-${fyEnd.getFullYear().toString().slice(-2)}`;
        const capitalGainsData = await prisma.capitalGainsTransaction.findMany({
            where: { userId, financialYear: fyString }
        });

        const capitalGains = capitalGainsData.map(g => ({
            symbol: g.schemeName,
            assetType: g.assetClass,
            buyDate: g.transactionDate,
            sellDate: g.transactionDate,
            gainAmountPaise: Math.round(((g.shortTermGain || 0) + (g.longTermGainWithoutIndex || 0)) * 100)
        }));

        return {
            data: {
                profile,
                incomeBySource,
                totalIncome,
                capitalGains,
                fy: `${fyStart.getFullYear()}-${fyEnd.getFullYear().toString().slice(-2)}`
            }
        };
    } catch (error: any) {
        return { error: error.message };
    }
}

function calculateTax(incomePaise: number, capitalGains: { stcgEquity: number, ltcgEquity: number, stcgDebt: number, ltcgDebt: number }, profile: any) {
    const income = (incomePaise || 0) / 100;
    const deductions = (profile?.deductions as any) || {};
    const incomeSource = profile?.incomeSource || "";

    // 1. Calculate Core Taxable Income (Income + Debt Gains)
    let coreIncome = income + capitalGains.stcgDebt + capitalGains.ltcgDebt;

    if (profile?.regime === "NEW") {
        if (incomeSource.toLowerCase().includes("salaried")) {
            coreIncome -= 75000;
        }
    } else {
        const section80C = Math.min(deductions.section80C || 0, 150000);
        const section80D = deductions.section80D || 0;
        const standardDeduction = incomeSource.toLowerCase().includes("salaried") ? 50000 : 0;

        coreIncome = coreIncome - section80C - section80D - standardDeduction;
    }

    coreIncome = Math.max(0, coreIncome);

    // 2. Apply Slabs to Core Income
    let tax = 0;
    if (profile.regime === "NEW") {
        if (coreIncome <= 300000) tax = 0;
        else if (coreIncome <= 700000) tax = (coreIncome - 300000) * 0.05;
        else if (coreIncome <= 1000000) tax = 20000 + (coreIncome - 700000) * 0.10;
        else if (coreIncome <= 1200000) tax = 50000 + (coreIncome - 1000000) * 0.15;
        else if (coreIncome <= 1500000) tax = 80000 + (coreIncome - 1200000) * 0.20;
        else tax = 140000 + (coreIncome - 1500000) * 0.30;

        if (coreIncome <= 700000) tax = 0;
    } else {
        let slab1 = 250000;
        if (profile.taxpayerType === "SENIOR_CITIZEN") slab1 = 300000;
        if (profile.taxpayerType === "SUPER_SENIOR_CITIZEN") slab1 = 500000;

        if (coreIncome <= slab1) tax = 0;
        else if (coreIncome <= 500000) tax = (coreIncome - slab1) * 0.05;
        else if (coreIncome <= 1000000) tax = (500000 - slab1) * 0.05 + (coreIncome - 500000) * 0.20;
        else tax = (500000 - slab1) * 0.05 + 100000 + (coreIncome - 1000000) * 0.30;

        if (coreIncome <= 500000) tax = 0;
    }

    // 3. Add Special Rate Taxes for Equity Capital Gains
    if (capitalGains.stcgEquity > 0) {
        tax += capitalGains.stcgEquity * 0.20;
    }

    if (capitalGains.ltcgEquity > 125000) {
        tax += (capitalGains.ltcgEquity - 125000) * 0.125;
    }

    // 4. Add 4% Cess
    tax = tax * 1.04;

    return Math.round(tax * 100);
}

async function syncAdvanceTaxReminders(userId: string, profile: any) {
    // 1. Calculate Projected Tax
    const summaryRes = await getTaxSummary();
    if (summaryRes.error || !summaryRes.data) return;

    const { estimatedTax } = summaryRes.data;
    const netTax = (estimatedTax / 100) - profile.tdsDeducted;

    // 2. If net tax > 10,000, create/update reminders
    if (netTax > 10000) {
        const now = new Date();
        const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

        const installments = [
            { title: "Advance Tax Installment 1 (15%)", date: new Date(year, 5, 15), pct: 0.15 },
            { title: "Advance Tax Installment 2 (45%)", date: new Date(year, 8, 15), pct: 0.45 },
            { title: "Advance Tax Installment 3 (75%)", date: new Date(year, 11, 15), pct: 0.75 },
            { title: "Advance Tax Installment 4 (100%)", date: new Date(year + 1, 2, 15), pct: 1.00 },
        ];

        for (const inst of installments) {
            const amount = Math.round((netTax * inst.pct) * 100);

            await prisma.reminder.upsert({
                where: {
                    // We need a way to uniquely identify these installments
                    // Using title and userId for now, might need better unique key in schema
                    id: `${userId}_ADVANCE_TAX_${inst.date.toISOString()}`
                },
                update: {
                    amount,
                    dueDate: inst.date,
                    isPaid: false
                },
                create: {
                    id: `${userId}_ADVANCE_TAX_${inst.date.toISOString()}`,
                    userId,
                    title: inst.title,
                    dueDate: inst.date,
                    amount,
                    type: ReminderType.ADVANCE_TAX,
                    isPaid: false
                }
            });
        }
    } else {
        // Delete existing advance tax reminders if no longer liable
        await prisma.reminder.deleteMany({
            where: { userId, type: ReminderType.ADVANCE_TAX }
        });
    }
}
