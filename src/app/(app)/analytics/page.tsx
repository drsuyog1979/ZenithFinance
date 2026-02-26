"use client";

import { useState, useEffect } from "react";
import { getTransactions } from "@/app/actions/transactions";
import { BarChart } from "@/components/analytics/BarChart";
import { TrendLineChart } from "@/components/analytics/LineChart";
import { SpendingHeatmap } from "@/components/analytics/Heatmap";
import { SpendDonutChart } from "@/components/dashboard/DonutChart";
import { CapitalGainsDashboard } from "@/components/analytics/CapitalGainsDashboard";
import { format, subMonths } from "date-fns";
import { AlertCircle, TrendingUp, BarChart3, PieChart, Activity } from "lucide-react";

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<"cashflow" | "capital_gains">("cashflow");
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function load() {
            const res = await getTransactions({ limit: 1000 });
            if (res.error) setError(true);
            else setTransactions(res.data || []);
            setIsLoading(false);
        }
        load();
    }, []);

    if (isLoading) {
        return (
            <div className="p-8 text-center h-[80vh] flex flex-col justify-center items-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Crunching your numbers...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center h-screen flex flex-col justify-center items-center">
                <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                <p className="text-red-500 font-bold">Failed to load analytics data.</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-semibold">Retry</button>
            </div>
        );
    }

    const currentDate = new Date();

    // 1. Bar Chart Data
    const barData = [];
    for (let i = 5; i >= 0; i--) {
        const d = subMonths(currentDate, i);
        const monthKey = format(d, "MMMM");
        const monthTxs = transactions.filter(tx =>
            new Date(tx.date).getMonth() === d.getMonth() &&
            new Date(tx.date).getFullYear() === d.getFullYear()
        );
        const income = monthTxs.filter(tx => tx.type === "INCOME").reduce((sum, tx) => sum + tx.amount, 0);
        const expenses = monthTxs.filter(tx => tx.type === "EXPENSE").reduce((sum, tx) => sum + tx.amount, 0);
        barData.push({ month: monthKey, income, expenses });
    }

    // 2. Heatmap Data
    const currentMonthTxs = transactions.filter(tx =>
        tx.type === "EXPENSE" &&
        new Date(tx.date).getMonth() === currentDate.getMonth() &&
        new Date(tx.date).getFullYear() === currentDate.getFullYear()
    ).map(tx => ({ date: new Date(tx.date), amount: tx.amount, category: tx.category }));

    // 3. Line Chart Data
    const lineData = [];
    for (let i = 5; i >= 0; i--) {
        const d = subMonths(currentDate, i);
        const monthKey = format(d, "MMM");
        const monthTxs = transactions.filter(tx =>
            new Date(tx.date).getMonth() === d.getMonth() &&
            new Date(tx.date).getFullYear() === d.getFullYear()
        );
        const income = monthTxs.filter(tx => tx.type === "INCOME").reduce((sum, tx) => sum + tx.amount, 0);
        const expense = monthTxs.filter(tx => tx.type === "EXPENSE").reduce((sum, tx) => sum + tx.amount, 0);
        lineData.push({ date: monthKey, income, expense });
    }

    // 4. Pie Chart Data
    const categoryMap: Record<string, number> = {};
    currentMonthTxs.forEach((tx) => {
        categoryMap[tx.category as string] = (categoryMap[tx.category as string] || 0) + tx.amount;
    });

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

    const pieData = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value, color: getColor(name) }))
        .sort((a, b) => b.value - a.value);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">Analytics</h1>
                    <p className="text-gray-500 mt-1">Deep dive into your financial habits and trends.</p>
                </div>

                <div className="inline-flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm self-start">
                    <button
                        onClick={() => setActiveTab("cashflow")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "cashflow" ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-md scale-105" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                    >
                        <Activity size={18} />
                        Cashflow
                    </button>
                    <button
                        onClick={() => setActiveTab("capital_gains")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "capital_gains" ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-md scale-105" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                    >
                        <TrendingUp size={18} />
                        Capital Gains
                    </button>
                </div>
            </div>

            {activeTab === "cashflow" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">6-Month Overview</h2>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Income vs Expenses</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center">
                                <BarChart3 size={20} />
                            </div>
                        </div>
                        <BarChart data={barData} />
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">Daily Intensity</h2>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{format(currentDate, "MMMM yyyy")} Heatmap</p>
                        </div>
                        <SpendingHeatmap currentDate={currentDate} data={currentMonthTxs} />
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 lg:col-span-2">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">Cashflow Analysis</h2>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Cumulative Performance</p>
                        </div>
                        <TrendLineChart data={lineData} />
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 lg:col-span-2 flex flex-col items-center">
                        <div className="mb-6 w-full text-left flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">Spending Categories</h2>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{format(currentDate, "MMMM yyyy")} Breakdown</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center">
                                <PieChart size={20} />
                            </div>
                        </div>
                        <div className="w-full max-w-xl">
                            <SpendDonutChart data={pieData} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <CapitalGainsDashboard />
                </div>
            )}
        </div>
    );
}
