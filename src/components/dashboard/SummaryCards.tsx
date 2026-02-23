"use client";

import { TransactionType } from "@prisma/client";

interface SummaryResult {
    totalBalance: number;
    income: number;
    expenses: number;
}

export function SummaryCards({ summary }: { summary: SummaryResult }) {
    const formatINR = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount / 100);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[var(--color-brand-navy)] rounded-2xl p-6 shadow-md text-white transition-transform hover:scale-[1.02]">
                <h3 className="text-sm font-medium text-blue-200 mb-1">Net Balance</h3>
                <p className="text-3xl font-bold">{formatINR(summary.totalBalance)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-transform hover:scale-[1.02]">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Income</h3>
                <p className="text-3xl font-bold text-[var(--color-category-income)]">+{formatINR(summary.income)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-transform hover:scale-[1.02]">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Expenses</h3>
                <p className="text-3xl font-bold text-[var(--color-category-expense)]">-{formatINR(summary.expenses)}</p>
            </div>
        </div>
    );
}
