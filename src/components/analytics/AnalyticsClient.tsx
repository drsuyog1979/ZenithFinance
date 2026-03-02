"use client";

import { useState, useMemo } from "react";
import { BarChart as BarChartComp } from "@/components/analytics/BarChart";
import { TrendLineChart } from "@/components/analytics/LineChart";
import { SpendingHeatmap } from "@/components/analytics/Heatmap";
import { SpendDonutChart } from "@/components/dashboard/DonutChart";
import { TaxAssistant } from "@/components/tax/TaxAssistant";
import { CapitalGainsDashboard } from "@/components/analytics/CapitalGainsDashboard";
import { format, subMonths, isSameMonth, parseISO } from "date-fns";
import { Activity, BarChart3, PieChart, IndianRupee, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface AnalyticsClientProps {
    initialTransactions: any[];
}

export function AnalyticsClient({ initialTransactions }: AnalyticsClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"cashflow" | "capital_gains" | "tax">("cashflow");
    const [heatmapType, setHeatmapType] = useState<"expenses" | "income" | "investments">("expenses");
    const currentDate = useMemo(() => new Date(), []);

    const handleDayClick = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        router.push(`/transactions?date=${dateStr}`);
    };

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
                return tx.type === "INVESTMENT" || (tx.type === "EXPENSE" && investmentCategories.some(cat => tx.category?.includes(cat)));
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white flex items-center gap-3">
                        Analytics
                        <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-black uppercase">v3 - Tax Ready</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Deep dive into your financial habits and trends.</p>
                </div>

                <div className="flex flex-wrap bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm gap-2 max-w-fit">
                    <button
                        onClick={() => setActiveTab("cashflow")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "cashflow" ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-md ring-1 ring-black/5" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                    >
                        <Activity size={18} />
                        Cashflow
                    </button>
                    <button
                        onClick={() => setActiveTab("capital_gains")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "capital_gains" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-md ring-1 ring-black/5" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                    >
                        <TrendingUp size={18} />
                        Capital Gains
                    </button>
                    <button
                        onClick={() => setActiveTab("tax")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "tax" ? "bg-white dark:bg-gray-700 text-emerald-600 shadow-md ring-1 ring-black/5" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                    >
                        <IndianRupee size={18} />
                        Income Tax
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
                        <SpendingHeatmap currentDate={currentDate} data={heatmapData} type={heatmapType} onDayClick={handleDayClick} />
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 lg:col-span-2">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">Cashflow Analysis</h2>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Cumulative Performance</p>
                        </div>
                        <TrendLineChart data={lineData} />
                    </div>
                </div>
            ) : activeTab === "capital_gains" ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <CapitalGainsDashboard />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <TaxAssistant />
                </div>
            )}
        </div>
    );
}
