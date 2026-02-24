"use client";

import Link from "next/link";

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
            {/* Net Balance — not clickable */}
            <div className="bg-[var(--color-brand-navy)] rounded-2xl p-6 shadow-md text-white transition-transform hover:scale-[1.02]">
                <h3 className="text-sm font-medium text-blue-200 mb-1">Net Balance</h3>
                <p className="text-3xl font-bold">{formatINR(summary.totalBalance)}</p>
            </div>

            {/* Income — clicks to transactions filtered by INCOME */}
            <Link
                href="/transactions?type=INCOME"
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:scale-[1.02] hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 block group"
            >
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 group-hover:text-emerald-600 transition-colors">
                    Income ↗
                </h3>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatINR(summary.income)}
                </p>
            </Link>

            {/* Expenses — clicks to transactions filtered by EXPENSE */}
            <Link
                href="/transactions?type=EXPENSE"
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:scale-[1.02] hover:shadow-md hover:border-red-200 dark:hover:border-red-900 block group"
            >
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 group-hover:text-red-500 transition-colors">
                    Expenses ↗
                </h3>
                <p className="text-3xl font-bold text-red-500 dark:text-red-400">
                    -{formatINR(summary.expenses)}
                </p>
            </Link>
        </div>
    );
}
