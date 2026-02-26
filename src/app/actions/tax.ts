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

export async function getTaxSummary() {
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

        const incomeTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                type: "INCOME",
                date: { gte: fyStart, lte: fyEnd }
            }
        });

        const realizedIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        // Project annual income
        const monthsPassed = Math.max(1, differenceInMonths(now, fyStart) + 1);
        const projectedAnnualIncome = Math.round((realizedIncome / monthsPassed) * 12);

        // Get Capital Gains from Phase 2
        // We need a way to get summarized gains
        const capitalGains = await prisma.assetSale.aggregate({
            where: { userId, sellDate: { gte: fyStart, lte: fyEnd } },
            _sum: { gainAmountPaise: true }
        });

        const totalGain = capitalGains._sum.gainAmountPaise || 0;

        let estimatedTax = 0;
        if (profile) {
            estimatedTax = calculateTax(projectedAnnualIncome, totalGain, profile);
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

        const incomeTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                type: "INCOME",
                date: { gte: fyStart, lte: fyEnd }
            }
        });

        const incomeBySource = incomeTransactions.reduce((acc, tx) => {
            const category = tx.category || "General";
            if (!acc[category]) acc[category] = 0;
            acc[category] += tx.amount;
            return acc;
        }, {} as Record<string, number>);

        const capitalGains = await prisma.assetSale.findMany({
            where: { userId, sellDate: { gte: fyStart, lte: fyEnd } }
        });

        return {
            data: {
                profile,
                incomeBySource,
                totalIncome: incomeTransactions.reduce((s, t) => s + t.amount, 0),
                capitalGains,
                fy: `${fyStart.getFullYear()}-${fyEnd.getFullYear().toString().slice(-2)}`
            }
        };
    } catch (error: any) {
        return { error: error.message };
    }
}

function calculateTax(incomePaise: number, gainsPaise: number, profile: any) {
    const income = incomePaise / 100;
    const deductions = profile.deductions as any;

    // 1. Calculate Taxable Income
    let taxableIncome = income;

    if (profile.regime === "NEW") {
        // Standard Deduction: 75,000 for salaried
        if (profile.incomeSource.toLowerCase().includes("salaried")) {
            taxableIncome -= 75000;
        }
        // New regime usually doesn't have 80C, 80D etc.
    } else {
        // Old Regime Deductions
        const section80C = Math.min(deductions.section80C || 0, 150000);
        const section80D = deductions.section80D || 0;
        const standardDeduction = profile.incomeSource.toLowerCase().includes("salaried") ? 50000 : 0;

        taxableIncome = taxableIncome - section80C - section80D - standardDeduction;
    }

    taxableIncome = Math.max(0, taxableIncome);

    // 2. Apply Slabs (FY 2025-26)
    let tax = 0;
    if (profile.regime === "NEW") {
        if (taxableIncome <= 300000) tax = 0;
        else if (taxableIncome <= 700000) tax = (taxableIncome - 300000) * 0.05;
        else if (taxableIncome <= 1000000) tax = 20000 + (taxableIncome - 700000) * 0.10;
        else if (taxableIncome <= 1200000) tax = 50000 + (taxableIncome - 1000000) * 0.15;
        else if (taxableIncome <= 1500000) tax = 80000 + (taxableIncome - 1200000) * 0.20;
        else tax = 140000 + (taxableIncome - 1500000) * 0.30;

        // Rebate u/s 87A for New Regime: No tax up to 7L income
        if (taxableIncome <= 700000) tax = 0;
    } else {
        // Old Regime (Individual)
        let slab1 = 250000;
        if (profile.taxpayerType === "SENIOR_CITIZEN") slab1 = 300000;
        if (profile.taxpayerType === "SUPER_SENIOR_CITIZEN") slab1 = 500000;

        if (taxableIncome <= slab1) tax = 0;
        else if (taxableIncome <= 500000) tax = (taxableIncome - slab1) * 0.05;
        else if (taxableIncome <= 1000000) tax = (500000 - slab1) * 0.05 + (taxableIncome - 500000) * 0.20;
        else tax = (500000 - slab1) * 0.05 + 100000 + (taxableIncome - 1000000) * 0.30;

        // Rebate u/s 87A for Old Regime: Up to 5L income
        if (taxableIncome <= 500000) tax = 0;
    }

    // Add 4% Cess
    tax = tax * 1.04;

    return Math.round(tax * 100); // Return in paise
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
