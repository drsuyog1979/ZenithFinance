"use client";

import { useState, useEffect } from "react";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { SpendDonutChart, IncomeDonutChart } from "@/components/dashboard/DonutChart";
import { RecentTransactions, CategoryCards } from "@/components/dashboard/RecentTransactions";
import { getTransactions } from "@/app/actions/transactions";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const CATEGORY_COLORS: Record<string, string> = {
    // Generic Zenith categories
    "Food & Dining": "#f97316",
    "Transport": "#3b82f6",
    "Shopping": "#ec4899",
    "Utilities": "#eab308",
    "Health": "#10b981",
    "Entertainment": "#8b5cf6",
    "Housing": "#6366f1",
    "Investment": "#0ea5e9",
    "Income": "#22c55e",
    "Education": "#f43f5e",
    "Personal Care": "#a78bfa",
    "Gifts": "#fb923c",
    "Insurance": "#94a3b8",
    "Taxes": "#64748b",
    "Transfer": "#71717a",
    "Other": "#ef4444",
    // CSV-specific category names (Accounts app export)
    "Mutual Funds": "#0ea5e9",
    "Petrol": "#3b82f6",
    "Electricity Bill": "#eab308",
    "Food & Drink": "#f97316",
    "App Purchase": "#8b5cf6",
    "App Purchase ": "#8b5cf6",
    "MNGL": "#f59e0b",
    "VI": "#a855f7",
    "Landline": "#d97706",
    "Salary": "#ef4444",
    "Clinic": "#10b981",
    "Baramati": "#14b8a6",
    "Apollo": "#06b6d4",
    "Inamdar": "#0891b2",
    "Sahyadri Deccan": "#2dd4bf",
    "Sahyadri Bibwewadi": "#34d399",
    "Food & Drinks": "#f97316",
};

// Deterministic color for unknown categories based on string hash
function hashColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}

function getColor(category: string) {
    return CATEGORY_COLORS[category] || hashColor(category);
}

export default function DashboardPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [activeChart, setActiveChart] = useState<"spending" | "income">("spending");
    const [data, setData] = useState<{
        summary: { totalBalance: number; income: number; expenses: number };
        spendDonutData: any[];
        incomeDonutData: any[];
        categoryData: any[];
        transactions: any[];
    }>({
        summary: { totalBalance: 0, income: 0, expenses: 0 },
        spendDonutData: [],
        incomeDonutData: [],
        categoryData: [],
        transactions: [],
    });

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const res = await getTransactions({
                month: currentDate.getMonth(),
                year: currentDate.getFullYear(),
                limit: 200
            });

            if (res.data) {
                let income = 0;
                let expenses = 0;
                const expenseCategoryMap: Record<string, number> = {};
                const incomeCategoryMap: Record<string, number> = {};

                res.data.forEach((tx) => {
                    if (tx.type === "INCOME") {
                        income += tx.amount;
                        incomeCategoryMap[tx.category] = (incomeCategoryMap[tx.category] || 0) + tx.amount;
                    } else if (tx.type === "EXPENSE") {
                        expenses += tx.amount;
                        expenseCategoryMap[tx.category] = (expenseCategoryMap[tx.category] || 0) + tx.amount;
                    }
                });

                const buildChartData = (map: Record<string, number>) =>
                    Object.entries(map)
                        .map(([name, value]) => ({ name, value, color: getColor(name) }))
                        .sort((a, b) => b.value - a.value);

                const spendData = buildChartData(expenseCategoryMap);

                setData({
                    summary: { totalBalance: income - expenses, income, expenses },
                    spendDonutData: spendData,
                    incomeDonutData: buildChartData(incomeCategoryMap),
                    categoryData: spendData.map(d => ({ category: d.name, amount: d.value, color: d.color })),
                    transactions: res.data.slice(0, 20),
                });
            }
            setLoading(false);
        }
        fetchData();
    }, [currentDate]);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">Dashboard</h1>
                    <p className="text-gray-500 mt-1">Here&apos;s your financial overview</p>
                </div>
                <MonthSelector currentDate={currentDate} onChange={setCurrentDate} />
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-navy)]" />
                </div>
            ) : (
                <>
                    <SummaryCards summary={data.summary} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left column: charts */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Chart toggle card */}
                            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                {/* Tab switcher */}
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        {activeChart === "spending" ? "Spending Breakdown" : "Income Breakdown"}
                                    </h2>
                                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl gap-1">
                                        <button
                                            onClick={() => setActiveChart("spending")}
                                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeChart === "spending"
                                                ? "bg-red-500 text-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                                                }`}
                                        >
                                            Expenses
                                        </button>
                                        <button
                                            onClick={() => setActiveChart("income")}
                                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeChart === "income"
                                                ? "bg-emerald-500 text-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                                                }`}
                                        >
                                            Income
                                        </button>
                                    </div>
                                </div>

                                {activeChart === "spending"
                                    ? <SpendDonutChart data={data.spendDonutData} />
                                    : <IncomeDonutChart data={data.incomeDonutData} />
                                }
                            </div>

                            {/* Top Categories */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                                    {activeChart === "spending" ? "Top Spending Categories" : "Top Earning Categories"}
                                </h3>
                                <CategoryCards data={activeChart === "spending"
                                    ? data.spendDonutData.map((d: any) => ({ category: d.name, amount: d.value, color: d.color }))
                                    : data.incomeDonutData.map((d: any) => ({ category: d.name, amount: d.value, color: d.color }))
                                } />
                            </div>
                        </div>

                        {/* Right column: recent transactions */}
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-[600px] flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Transactions</h2>
                                <Link
                                    href="/transactions"
                                    className="text-sm text-[var(--color-brand-navy)] dark:text-blue-400 font-medium hover:underline"
                                >
                                    View All
                                </Link>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <RecentTransactions transactions={data.transactions} />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
