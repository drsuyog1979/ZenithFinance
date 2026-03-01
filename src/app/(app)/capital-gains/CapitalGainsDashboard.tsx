"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    BarChart3, PieChart, Info, Calendar, ArrowUpRight, ArrowDownRight,
    ChevronDown, Filter, Download, Plus, LayoutGrid, List
} from "lucide-react";

interface CGTransaction {
    id: string;
    amcName: string;
    schemeName: string;
    assetClass: string;
    transactionType: string;
    transactionDate: Date;
    amount: number;
    shortTermGain: number | null;
    longTermGainWithoutIndex: number | null;
}

interface CGSummary {
    id: string;
    period: string;
    assetClass: string;
    shortTermGainLoss: number;
    longTermGainWithoutIndex: number;
}

export function CapitalGainsDashboard({
    initialYear,
    allYears,
    data
}: {
    initialYear: string;
    allYears: string[];
    data: { transactions: any[], summaries: any[] }
}) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<"summary" | "details">("summary");

    const transactions = data.transactions;
    const summaries = data.summaries;

    const handleYearChange = (year: string) => {
        router.push(`/capital-gains?fy=${year}`);
    };

    const totalSTCG = transactions.reduce((acc, t) => acc + (t.shortTermGain || 0), 0);
    const totalLTCG = transactions.reduce((acc, t) => acc + (t.longTermGainWithoutIndex || 0), 0);

    const equitySTCG = transactions.filter(t => t.assetClass === "EQUITY").reduce((acc, t) => acc + (t.shortTermGain || 0), 0);
    const debtSTCG = transactions.filter(t => t.assetClass !== "EQUITY").reduce((acc, t) => acc + (t.shortTermGain || 0), 0);

    const equityLTCG = transactions.filter(t => t.assetClass === "EQUITY").reduce((acc, t) => acc + (t.longTermGainWithoutIndex || 0), 0);
    const debtLTCG = transactions.filter(t => t.assetClass !== "EQUITY").reduce((acc, t) => acc + (t.longTermGainWithoutIndex || 0), 0);

    // Grouping transactions by scheme for breakdown table
    const schemeBreakdown = transactions.reduce((acc: any, t) => {
        if (!acc[t.schemeName]) {
            acc[t.schemeName] = {
                name: t.schemeName,
                amc: t.amcName,
                sc: 0,
                lc: 0,
                count: 0
            };
        }
        acc[t.schemeName].sc += (t.shortTermGain || 0);
        acc[t.schemeName].lc += (t.longTermGainWithoutIndex || 0);
        acc[t.schemeName].count += 1;
        return acc;
    }, {});

    const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
                    <Icon size={24} />
                </div>
                {value >= 0 ? (
                    <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                        <ArrowUpRight size={14} /> Gain
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-red-600 text-sm font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">
                        <ArrowDownRight size={14} /> Loss
                    </div>
                )}
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-[var(--color-brand-navy)] dark:text-white">
                ₹{Math.abs(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 pb-24 md:pb-8 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                            <BarChart3 size={20} />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">
                            Capital Gains
                        </h1>
                    </div>
                    <p className="text-gray-500 ml-13 font-medium">Realized gains and losses for FY {initialYear}</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select
                            value={initialYear}
                            onChange={(e) => handleYearChange(e.target.value)}
                            title="Select Financial Year"
                            aria-label="Select Financial Year"
                            className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                        >
                            {allYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>

                    <button
                        title="Download Statement"
                        aria-label="Download Statement"
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </header>

            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Short Term Gains (STCG)"
                    value={totalSTCG}
                    icon={BarChart3}
                    color="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                />
                <StatCard
                    title="Long Term Gains (LTCG)"
                    value={totalLTCG}
                    icon={PieChart}
                    color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"
                />
                <StatCard
                    title="Equity Gains"
                    value={equitySTCG + equityLTCG}
                    subtitle={`ST: ₹${equitySTCG.toLocaleString()} | LT: ₹${equityLTCG.toLocaleString()}`}
                    icon={LayoutGrid}
                    color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                />
                <StatCard
                    title="Debt & Non-Equity"
                    value={debtSTCG + debtLTCG}
                    subtitle={`ST: ₹${debtSTCG.toLocaleString()} | LT: ₹${debtLTCG.toLocaleString()}`}
                    icon={List}
                    color="bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quarterly Breakdown (ITR Schedule) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100">Quarterly Breakdown (ITR Schedule)</h3>
                            <button className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <Info size={14} /> Full Schedule
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                                    <tr>
                                        <th className="px-6 py-3">Period</th>
                                        <th className="px-6 py-3 text-right">Short Term</th>
                                        <th className="px-6 py-3 text-right">Long Term</th>
                                        <th className="px-6 py-3 text-right font-black">Net Gain</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-800">
                                    {summaries.length > 0 ? summaries.map((s, i) => (
                                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">{s.period}</td>
                                            <td className={`px-6 py-4 text-right ${s.shortTermGainLoss >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                ₹{s.shortTermGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className={`px-6 py-4 text-right ${s.longTermGainWithoutIndex >= 0 ? "text-indigo-600" : "text-red-500"}`}>
                                                ₹{s.longTermGainWithoutIndex.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                                                ₹{(s.shortTermGainLoss + s.longTermGainWithoutIndex).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                No summary data available for this year.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Scheme-wise details */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100">Scheme-wise Realized Gains</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    title="Filter schemes"
                                    aria-label="Filter schemes"
                                    className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400"
                                >
                                    <Filter size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase tracking-wider text-gray-400 font-bold z-10">
                                    <tr>
                                        <th className="px-6 py-3">Scheme Name</th>
                                        <th className="px-6 py-3 text-right">ST Gain</th>
                                        <th className="px-6 py-3 text-right">LT Gain</th>
                                        <th className="px-6 py-3 text-right font-black">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-800">
                                    {Object.values(schemeBreakdown).map((s: any, i) => (
                                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[250px]" title={s.name}>{s.name}</p>
                                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{s.amc}</p>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-medium ${s.sc >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                                                ₹{s.sc.toLocaleString()}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-medium ${s.lc >= 0 ? "text-indigo-500" : "text-red-400"}`}>
                                                ₹{s.lc.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                                                ₹{(s.sc + s.lc).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Side: Tips or Distribution info */}
                <div className="space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/40 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full group-hover:scale-110 transition-transform pointer-events-none" />
                        <h4 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-2">
                            <Info size={18} /> Tax Planning Tip
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-500 leading-relaxed">
                            LTCG up to ₹1.25 Lakh on equity is exempt from tax under Section 112A.
                            Consider "tax harvesting" your equity portfolio to save tax!
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Gain Distribution</h4>
                        <div className="space-y-4">
                            {[
                                { label: "Equity STCG", value: equitySTCG, color: "bg-emerald-500" },
                                { label: "Equity LTCG", value: equityLTCG, color: "bg-emerald-600" },
                                { label: "Debt STCG", value: debtSTCG, color: "bg-indigo-500" },
                                { label: "Debt LTCG", value: debtLTCG, color: "bg-indigo-600" },
                            ].map(item => {
                                const total = Math.abs(totalSTCG) + Math.abs(totalLTCG) || 1;
                                const perc = (Math.abs(item.value) / total) * 100;
                                return (
                                    <div key={item.label}>
                                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                                            <span className="text-gray-500">{item.label}</span>
                                            <span className="text-gray-900 dark:text-white">₹{item.value.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                                style={{ width: `${perc}%` } as any}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-[var(--color-brand-navy)] p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4 pointer-events-none">
                            <BarChart3 size={150} />
                        </div>
                        <h4 className="font-bold mb-1">Ready for ITR?</h4>
                        <p className="text-xs text-blue-100 mb-4">Export this data as an Excel file mapping directly to ITR Schedule CG.</p>
                        <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold transition-colors border border-white/10">
                            Download ITR Mappings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
