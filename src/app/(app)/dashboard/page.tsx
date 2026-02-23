"use client";

import { useState, useEffect } from "react";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { SpendDonutChart } from "@/components/dashboard/DonutChart";
import { RecentTransactions, CategoryCards } from "@/components/dashboard/RecentTransactions";
import { getTransactions } from "@/app/actions/transactions";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        summary: { totalBalance: number; income: number; expenses: number };
        donutData: any[];
        categoryData: any[];
        transactions: any[];
    }>({
        summary: { totalBalance: 0, income: 0, expenses: 0 },
        donutData: [],
        categoryData: [],
        transactions: [],
    });

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const res = await getTransactions({
                month: currentDate.getMonth(),
                year: currentDate.getFullYear(),
                limit: 20
            });

            if (res.data) {
                // Calculate summary
                let income = 0;
                let expenses = 0;

                // Group for donut and categories
                const categoryMap: Record<string, number> = {};

                res.data.forEach((tx) => {
                    if (tx.type === "INCOME") {
                        income += tx.amount;
                    } else if (tx.type === "EXPENSE") {
                        expenses += tx.amount;
                        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
                    }
                });

                // Resolve colors
                const getColor = (category: string) => {
                    switch (category) {
                        case "Food & Dining": return "#f97316";
                        case "Transport": return "#3b82f6";
                        case "Shopping": return "#ec4899";
                        case "Utilities": return "#eab308";
                        case "Health": return "#10b981";
                        case "Entertainment": return "#8b5cf6";
                        default: return "#ef4444";
                    }
                };

                const donutAndCatData = Object.entries(categoryMap)
                    .map(([name, value]) => ({
                        name,
                        category: name,
                        value,
                        amount: value,
                        color: getColor(name)
                    }))
                    .sort((a, b) => b.value - a.value);

                setData({
                    summary: {
                        totalBalance: income - expenses,
                        income,
                        expenses
                    },
                    donutData: donutAndCatData,
                    categoryData: donutAndCatData,
                    transactions: res.data
                });
            }
            setLoading(false);
        }
        fetchData();
    }, [currentDate]);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">Dashboard</h1>
                    <p className="text-gray-500 mt-1">Here's your financial overview</p>
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
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h2 className="text-xl font-semibold mb-6">Spending Breakdown</h2>
                                <SpendDonutChart data={data.donutData} />
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Top Categories</h3>
                                <CategoryCards data={data.categoryData} />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-[600px] flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold">Recent Transactions</h2>
                                <button className="text-sm text-[var(--color-brand-navy)] dark:text-blue-400 font-medium">View All</button>
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
