"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    ShoppingBag, Utensils, Car, HeartPulse, Home, Zap, Tv, Briefcase,
    Search, Filter, Trash2, Edit2, Loader2, ArrowUpDown
} from "lucide-react";
import { deleteTransaction } from "@/app/actions/transactions";

export function TransactionList({
    initialTransactions,
    wallets
}: {
    initialTransactions: any[],
    wallets: any[]
}) {
    const [transactions, setTransactions] = useState(initialTransactions);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [walletFilter, setWalletFilter] = useState("ALL");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const formatINR = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value / 100);
    };

    const getIcon = (category: string) => {
        switch (category) {
            case "Food & Dining": return Utensils;
            case "Transport": return Car;
            case "Health": return HeartPulse;
            case "Housing": return Home;
            case "Utilities": return Zap;
            case "Entertainment": return Tv;
            case "Shopping": return ShoppingBag;
            case "Income": return Briefcase;
            default: return ShoppingBag;
        }
    };

    const getColor = (category: string) => {
        switch (category) {
            case "Food & Dining": return "var(--color-category-food)";
            case "Transport": return "var(--color-category-transport)";
            case "Shopping": return "var(--color-category-shopping)";
            case "Utilities": return "var(--color-category-utilities)";
            case "Health": return "var(--color-category-health)";
            case "Entertainment": return "var(--color-category-entertainment)";
            case "Income": return "var(--color-category-income)";
            default: return "var(--color-category-expense)";
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this transaction?")) {
            setDeletingId(id);
            await deleteTransaction(id);
            setTransactions(transactions.filter(t => t.id !== id));
            setDeletingId(null);
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        if (search && !(tx.description?.toLowerCase().includes(search.toLowerCase()) || tx.category.toLowerCase().includes(search.toLowerCase()))) return false;
        if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
        if (walletFilter !== "ALL" && tx.walletId !== walletFilter) return false;
        return true;
    });

    // Group by date
    const grouped: Record<string, any[]> = {};
    filteredTransactions.forEach(t => {
        const dateKey = format(new Date(t.date), "yyyy-MM-dd");
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(t);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return (
        <div className="space-y-6">
            {/* Sticky Filters */}
            <div className="sticky top-0 z-10 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md py-4 border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 md:-mx-8 md:px-8 space-y-4">

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none transition-shadow"
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            aria-label="Filter by type"
                            title="Filter by type"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none"
                        >
                            <option value="ALL">All Types</option>
                            <option value="EXPENSE">Expenses</option>
                            <option value="INCOME">Income</option>
                            <option value="INVESTMENT">Investment</option>
                            <option value="TRANSFER">Transfer</option>
                        </select>

                        <select
                            aria-label="Filter by account"
                            title="Filter by account"
                            value={walletFilter}
                            onChange={(e) => setWalletFilter(e.target.value)}
                            className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none"
                        >
                            <option value="ALL">All Accounts</option>
                            {wallets.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {sortedDates.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    No transactions match your filters.
                </div>
            ) : (
                <div className="space-y-8">
                    {sortedDates.map(dateStr => {
                        const txs = grouped[dateStr];
                        const dailyTotal = txs.reduce((acc, tx) => acc + (tx.type === 'EXPENSE' ? -tx.amount : tx.type === 'INCOME' ? tx.amount : 0), 0);

                        return (
                            <div key={dateStr} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                                <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                        {format(new Date(dateStr), "EEEE, MMM d")}
                                    </h3>
                                    <span className={`font-semibold text-sm ${dailyTotal > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                                        dailyTotal < 0 ? 'text-red-500 dark:text-red-400' :
                                            'text-gray-400'
                                        }`}>
                                        {dailyTotal > 0 ? '+' : dailyTotal < 0 ? '-' : ''}{dailyTotal !== 0 ? formatINR(Math.abs(dailyTotal)) : ''}
                                    </span>
                                </div>

                                <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                    {txs.map((tx) => {
                                        const Icon = getIcon(tx.category);
                                        const isIncome = tx.type === "INCOME";
                                        const isExpense = tx.type === "EXPENSE";
                                        const isInvestment = tx.type === "INVESTMENT";
                                        const color = getColor(tx.category);
                                        const iconColor = isIncome ? "#10b981" : isExpense ? "#ef4444" : isInvestment ? "#3b82f6" : color;

                                        return (
                                            <div key={tx.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-12 h-12 rounded-xl flex items-center justify-center dynamic-bg-light dynamic-text"
                                                        style={{ "--dynamic-color": iconColor } as React.CSSProperties}
                                                    >
                                                        <Icon size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-gray-100 max-w-[200px] sm:max-w-xs truncate">
                                                            {tx.description || tx.category}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                                                            <span>{tx.category}</span>
                                                            <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                                                            <span>{tx.wallet?.name}</span>

                                                            {tx.source !== 'MANUAL' && (
                                                                <>
                                                                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                                                                    <span className="bg-[var(--color-brand-navy)]/10 text-[var(--color-brand-navy)] dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase font-semibold text-[10px] tracking-wider">
                                                                        {tx.source}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className={`font-semibold whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' :
                                                        isExpense ? 'text-red-500 dark:text-red-400' :
                                                            isInvestment ? 'text-blue-500 dark:text-blue-400' :
                                                                'text-gray-500 dark:text-gray-400'
                                                        }`}>
                                                        {isIncome ? '+' : isExpense ? '-' : ''}{formatINR(tx.amount)}
                                                    </div>

                                                    {/* Actions appear on hover */}
                                                    <div className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                                        <button className="p-2 text-gray-400 hover:text-[var(--color-brand-navy)] transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(tx.id, e)}
                                                            disabled={deletingId === tx.id}
                                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                                                        >
                                                            {deletingId === tx.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
