"use client";

import { useState, useEffect } from "react";
import {
    Download, TrendingUp, TrendingDown, Info, PieChart,
    ArrowRightLeft, AlertCircle, CheckCircle2, Loader2,
    Calendar, Tag, Hash, Wallet
} from "lucide-react";
import { getCapitalGainsSummary } from "@/app/actions/assets";
import { AssetTransactionsImporter } from "./AssetTransactionsImporter";

export function CapitalGainsDashboard() {
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showImporter, setShowImporter] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            const data = await getCapitalGainsSummary();
            setSummary(data);
        } catch (e) {
            console.error("Failed to load capital gains data", e);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p className="animate-pulse">Analyzing portfolio gains...</p>
            </div>
        );
    }

    const s = summary?.summary || { stcg: 0, ltcg: 0, loss: 0, net: 0 };
    const ltcgLimit = 125000;
    const ltcgUsed = s.ltcg;
    const ltcgPercent = Math.min((ltcgUsed / ltcgLimit) * 100, 100);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                        Realised Capital Gains
                    </h2>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                        Current Financial Year (FY 24-25)
                    </p>
                </div>
                <button
                    onClick={() => setShowImporter(!showImporter)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
                >
                    {showImporter ? <Info size={16} /> : <Download size={16} />}
                    {showImporter ? "Back to Dashboard" : "Import Statements"}
                </button>
            </div>

            {showImporter ? (
                <div className="max-w-xl mx-auto">
                    <AssetTransactionsImporter onComplete={loadData} />
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: "Total STCG", val: s.stcg, color: "text-blue-600", bg: "bg-blue-100" },
                            { label: "Total LTCG", val: s.ltcg, color: "text-purple-600", bg: "bg-purple-100" },
                            { label: "Total Loss", val: s.loss, color: "text-red-600", bg: "bg-red-100" },
                            { label: "Net Realised Gain", val: s.net, color: s.net >= 0 ? "text-emerald-600" : "text-red-600", bg: s.net >= 0 ? "bg-emerald-100" : "bg-red-100" },
                        ].map(c => (
                            <div key={c.label} className={`bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md border-b-4 ${c.color.includes('blue') ? 'border-blue-500' : c.color.includes('purple') ? 'border-purple-500' : c.color.includes('emerald') ? 'border-emerald-500' : 'border-red-500'}`}>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">{c.label}</p>
                                <p className={`text-2xl font-black ${c.color}`}>
                                    {s.net < 0 && c.label === "Net Realised Gain" ? "-" : ""}₹{Math.abs(c.val).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* LTCG Exemption Tracker */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    LTCG Exemption Tracker
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black tracking-widest">SECTION 112A</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">₹1.25 Lakh limit (Equity/MF/ETF)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-gray-900 dark:text-gray-100">₹{(ltcgLimit - ltcgUsed).toLocaleString("en-IN")}</p>
                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Remaining</p>
                            </div>
                        </div>

                        <div className="w-full h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2 relative">
                            <div
                                className={`h-full transition-all duration-1000 ${ltcgPercent > 90 ? 'bg-red-500' : 'bg-indigo-500'}`}
                                style={{ width: `${ltcgPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            <span>₹{Math.round(ltcgUsed).toLocaleString("en-IN")} used</span>
                            <span>₹{ltcgLimit.toLocaleString("en-IN")} Limit</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Asset Wise Gains */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <PieChart size={18} className="text-indigo-500" />
                                Realised Gains by Asset
                            </h3>
                            <div className="overflow-x-auto -mx-6">
                                <table className="w-full min-w-[500px]">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                                        <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <th className="px-6 py-3">SYMBOL</th>
                                            <th className="px-6 py-3">TYPE</th>
                                            <th className="px-6 py-3 text-right">GAIN/LOSS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {summary?.assetWise.map((item: any) => (
                                            <tr key={item.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-sm text-gray-900 dark:text-gray-100">{item.symbol}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black tracking-widest uppercase">
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-black ${item.gain >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                    {item.gain >= 0 ? "+" : ""}
                                                    ₹{item.gain.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Tax Harvesting Help */}
                        <div className="bg-indigo-600 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-xl" />
                            <div className="relative z-10">
                                <h3 className="font-bold flex items-center gap-2 mb-2">
                                    Tax Harvesting
                                    <span className="p-1 px-1.5 bg-white/20 rounded-lg text-[8px] uppercase tracking-tighter">Pro Tool</span>
                                </h3>
                                <p className="text-xs text-indigo-100 mb-4 leading-relaxed font-medium">
                                    You have used ₹{Math.round(ltcgUsed).toLocaleString("en-IN")} of your ₹1.25L LTCG exemption.
                                </p>

                                {ltcgLimit - ltcgUsed > 10000 ? (
                                    <div className="p-4 bg-white/10 rounded-2xl mb-4 border border-white/10">
                                        <p className="text-[10px] uppercase font-bold tracking-widest mb-1 opacity-70">SURE TIP</p>
                                        <p className="text-xs font-semibold leading-relaxed">
                                            Consider booking ₹{Math.round(ltcgLimit - ltcgUsed).toLocaleString("en-IN")} more in LTCG before **March 31st** to use your full tax-free limit.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-white/10 rounded-2xl mb-4 border border-white/10">
                                        <p className="text-[10px] uppercase font-bold tracking-widest mb-1 opacity-70">TAX HARVESTING</p>
                                        <p className="text-xs font-semibold leading-relaxed">
                                            Your LTCG goal is nearly met. Look for unrealized losses to offset your STCG.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex items-start gap-2 text-[11px] font-medium p-2 bg-emerald-500/30 rounded-xl">
                                        <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                                        <span>Exemption limit increased to ₹1.25L in Budget 2024.</span>
                                    </div>
                                    <div className="flex items-start gap-2 text-[11px] font-medium p-2 bg-orange-500/30 rounded-xl">
                                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                        <span>Debt MF gains are now taxed as per slab, regardless of holding.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
