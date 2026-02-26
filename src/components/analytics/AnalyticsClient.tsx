"use client";

import { useState, useMemo } from "react";
import { BarChart as BarChartComp } from "@/components/analytics/BarChart";
import { TrendLineChart } from "@/components/analytics/LineChart";
import { SpendingHeatmap } from "@/components/analytics/Heatmap";
import { SpendDonutChart } from "@/components/dashboard/DonutChart";
import { CapitalGainsDashboard } from "@/components/analytics/CapitalGainsDashboard";
import { format, subMonths, isSameMonth, parseISO } from "date-fns";
import { Activity, TrendingUp, BarChart3, PieChart } from "lucide-react";

interface AnalyticsClientProps {
    initialTransactions: any[];
}

export function AnalyticsClient({ initialTransactions }: AnalyticsClientProps) {
    const [activeTab, setActiveTab] = useState<"cashflow" | "capital_gains">("cashflow");
    const [heatmapType, setHeatmapType] = useState<"expenses" | "income" | "investments">("expenses");
    const currentDate = useMemo(() => new Date(), []);

    // 1. Process Bar Chart Data (6 months)
    const barData = useMemo(() => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(currentDate, i);
            const monthKey = format(d, "MMMM");

            const monthTxs = initialTransactions.filter(tx => {
                const txDate = typeof tx.date === 'string' ? parseISO(tx.date) : tx.date;
                return isSameMonth(txDate, d);
            });

            const income = monthTxs.filter(tx => tx.type === "INCOME").reduce((sum, tx) => sum + tx.amount, 0);
            const expenses = monthTxs.filter(tx => tx.type === "EXPENSE").reduce((sum, tx) => sum + tx.amount, 0);

            data.push({ month: monthKey, income, expenses });
        }
        return data;
    }, [initialTransactions, currentDate]);

    // 2. Heatmap Data (Current Month)
    const investmentCategories = ["Mutual Funds", "Stocks", "ETF", "Gold", "Bonds", "Mutual Fund", "Mutual fund"];

    const heatmapData = useMemo(() => {
        return initialTransactions.filter(tx => {
            const txDate = typeof tx.date === 'string' ? parseISO(tx.date) : tx.date;
            if (!isSameMonth(txDate, currentDate)) return false;

            if (heatmapType === "expenses") return tx.type === "EXPENSE";
            if (heatmapType === "income") return tx.type === "INCOME";
            if (heatmapType === "investments") {
                return tx.type === "EXPENSE" && investmentCategories.some(cat => tx.category?.includes(cat));
            }
            return false;
        }).map(tx => ({
            date: typeof tx.date === 'string' ? parseISO(tx.date) : tx.date,
            amount: tx.amount,
            category: tx.category
        }));
    }, [initialTransactions, currentDate, heatmapType]);

    // 3. Line Chart Data (6 months)
    const lineData = useMemo(() => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(currentDate, i);
            const monthKey = format(d, "MMM");

            const monthTxs = initialTransactions.filter(tx => {
                const txDate = typeof tx.date === 'string' ? parseISO(tx.date) : tx.date;
                return isSameMonth(txDate, d);
            });

            const income = monthTxs.filter(tx => tx.type === "INCOME").reduce((sum, tx) => sum + tx.amount, 0);
            const expense = monthTxs.filter(tx => tx.type === "EXPENSE").reduce((sum, tx) => sum + tx.amount, 0);

            data.push({ date: monthKey, income, expense });
        }
        return data;
    }, [initialTransactions, currentDate]);

    // 4. Pie Chart Data
    const currentMonthExpenses = useMemo(() => {
        return initialTransactions.filter(tx => {
            const txDate = typeof tx.date === 'string' ? parseISO(tx.date) : tx.date;
            return tx.type === "EXPENSE" && isSameMonth(txDate, currentDate);
        });
    }, [initialTransactions, currentDate]);

    const pieData = useMemo(() => {
        const categoryMap: Record<string, number> = {};
        currentMonthExpenses.forEach((tx) => {
            const cat = tx.category || "Other";
            categoryMap[cat] = (categoryMap[cat] || 0) + tx.amount;
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

        return Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value, color: getColor(name) }))
            .sort((a, b) => b.value - a.value);
    }, [currentMonthExpenses]);

    return (
        <div className="space-y-6">
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
                        <BarChartComp data={barData} />
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">Intensity</h2>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{format(currentDate, "MMMM yyyy")} Heatmap</p>
                            </div>
                            <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-xl">
                                {(["expenses", "income", "investments"] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setHeatmapType(type)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${heatmapType === type
                                            ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm"
                                            : "text-gray-400 hover:text-gray-600"}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <SpendingHeatmap currentDate={currentDate} data={heatmapData} type={heatmapType} />
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
