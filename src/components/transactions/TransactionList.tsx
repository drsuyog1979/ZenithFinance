"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    ShoppingBag, Utensils, Car, HeartPulse, Home, Zap, Tv, Briefcase,
    Search, Trash2, Edit2, Loader2, X, Check, Tag, TrendingUp, Phone, Banknote, Fuel, Heart, Coffee, Gamepad2, Plane, Gift, GraduationCap, Dumbbell, Beer, Music, Camera, Globe, Download
} from "lucide-react";
import * as xlsx from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ICON_MAP: Record<string, any> = {
    ShoppingBag, Utensils, Car, HeartPulse, Home, Zap, Tv, Briefcase,
    TrendingUp, Phone, Banknote, Tag, Fuel, Heart, Coffee, Gamepad2, Plane, Gift, GraduationCap, Dumbbell, Beer, Music, Camera, Globe
};

// Deterministic color for unknown categories
function hashColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}
import { deleteTransaction, updateTransaction } from "@/app/actions/transactions";
import { CATEGORY_DEFAULTS } from "@/lib/constants";

// ── Component ───────────────────────────────────────────────────────────────
export function TransactionList({
    initialTransactions,
    wallets,
    initialTypeFilter = "ALL",
    initialWalletFilter = "ALL",
    initialDateFilter = ""
}: {
    initialTransactions: any[],
    wallets: any[],
    initialTypeFilter?: string,
    initialWalletFilter?: string,
    initialDateFilter?: string
}) {
    const [transactions, setTransactions] = useState(initialTransactions);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState(initialTypeFilter);
    const [walletFilter, setWalletFilter] = useState(initialWalletFilter);
    const [dateFilter, setDateFilter] = useState(initialDateFilter);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingTx, setEditingTx] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ amount: "", category: "", description: "", type: "", date: "", walletId: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [allCategories, setAllCategories] = useState<any[]>(CATEGORY_DEFAULTS);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("zenith-categories-v2");
            if (saved) {
                setAllCategories(JSON.parse(saved));
            }
        } catch { }
    }, []);

    const formatINR = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value / 100);
    };
    const getIcon = (category: string) => {
        const found = allCategories.find(c => c.name === category);
        if (found?.icon) {
            return typeof found.icon === 'string' ? ICON_MAP[found.icon] || Tag : found.icon;
        }

        switch (category) {
            case "Food & Dining": case "Food & Drink": case "Food & Drinks": return Utensils;
            case "Transport": case "Petrol": return Car;
            case "Health": return HeartPulse;
            case "Housing": return Home;
            case "Utilities": case "Electricity Bill": case "MNGL": return Zap;
            case "Landline": case "VI": return Phone;
            case "Entertainment": case "App Purchase": case "App Purchase ": return Tv;
            case "Shopping": return ShoppingBag;
            case "Income": case "Clinic": case "Baramati": case "Apollo": case "Inamdar":
            case "Sahyadri Deccan": case "Sahyadri Bibwewadi": return Briefcase;
            case "Mutual Funds": case "Investment": return TrendingUp;
            case "Salary": return Banknote;
            default: return Tag;
        }
    };

    const getColor = (category: string) => {
        const found = allCategories.find(c => c.name === category);
        if (found?.color) return found.color;

        const map: Record<string, string> = {
            "Food & Dining": "#f97316", "Food & Drink": "#f97316", "Food & Drinks": "#f97316",
            "Transport": "#3b82f6", "Petrol": "#3b82f6",
            "Shopping": "#ec4899",
            "Utilities": "#eab308", "Electricity Bill": "#eab308", "MNGL": "#f59e0b",
            "Health": "#10b981",
            "Entertainment": "#8b5cf6", "App Purchase": "#8b5cf6", "App Purchase ": "#8b5cf6",
            "Income": "#22c55e",
            "Clinic": "#10b981", "Baramati": "#14b8a6", "Apollo": "#06b6d4",
            "Inamdar": "#0891b2", "Sahyadri Deccan": "#2dd4bf", "Sahyadri Bibwewadi": "#34d399",
            "Mutual Funds": "#0ea5e9", "Investment": "#0ea5e9",
            "Salary": "#ef4444", "Landline": "#d97706", "VI": "#a855f7",
        };
        return map[category] || hashColor(category);
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

    // ── Edit handlers ───────────────────────────────────────────────────
    const openEdit = (tx: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTx(tx);
        setEditForm({
            amount: (tx.amount / 100).toString(),
            category: tx.category,
            description: tx.description || "",
            type: tx.type,
            date: format(new Date(tx.date), "yyyy-MM-dd"),
            walletId: tx.walletId,
        });
    };

    const cancelEdit = () => {
        setEditingTx(null);
    };

    const saveEdit = async () => {
        if (!editingTx) return;
        setIsSaving(true);

        const amountPaise = Math.round(parseFloat(editForm.amount || "0") * 100);
        const result = await updateTransaction(editingTx.id, {
            amount: amountPaise,
            category: editForm.category,
            description: editForm.description || undefined,
            type: editForm.type as any,
            date: new Date(editForm.date),
            walletId: editForm.walletId,
        });

        if (result.data) {
            setTransactions(prev =>
                prev.map(t => t.id === editingTx.id ? result.data : t)
            );
            setEditingTx(null);
        } else {
            alert("Failed to update: " + result.error);
        }
        setIsSaving(false);
    };

    // ── Filter + group ──────────────────────────────────────────────────
    const filteredTransactions = transactions.filter(tx => {
        if (search && !(tx.description?.toLowerCase().includes(search.toLowerCase()) || tx.category.toLowerCase().includes(search.toLowerCase()))) return false;
        if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
        if (walletFilter !== "ALL" && tx.walletId !== walletFilter) return false;
        if (dateFilter) {
            const txDate = format(new Date(tx.date), "yyyy-MM-dd");
            if (txDate !== dateFilter) return false;
        }
        return true;
    });

    const grouped: Record<string, any[]> = {};
    filteredTransactions.forEach(t => {
        const dateKey = format(new Date(t.date), "yyyy-MM-dd");
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(t);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // ── Export Functions ───────────────────────────────────────────────
    const formatExportData = () => {
        return filteredTransactions.map(tx => ({
            Date: format(new Date(tx.date), "yyyy-MM-dd"),
            Description: tx.description || tx.category,
            Category: tx.category,
            Type: tx.type,
            Wallet: tx.wallet?.name || "Unknown",
            Amount: `Rs. ${tx.amount / 100}`,
            Source: tx.source
        }));
    };

    const handleExportCSV = () => {
        const data = formatExportData();
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Transactions");
        xlsx.writeFile(wb, `Zenith_Transactions_${format(new Date(), "yyyyMMdd")}.xlsx`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(16);
        doc.text("Zenith Finance - Transactions Report", 14, 22);

        // Metadata
        doc.setFontSize(10);
        doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 30);
        doc.text(`Filters: Type=${typeFilter}, Account=${wallets.find(w => w.id === walletFilter)?.name || "All"}`, 14, 35);

        const data = formatExportData();

        autoTable(doc, {
            startY: 40,
            head: [['Date', 'Description', 'Category', 'Type', 'Wallet', 'Amount (INR)']],
            body: data.map(row => [
                row.Date,
                row.Description,
                row.Category,
                row.Type,
                row.Wallet,
                row.Amount
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [30, 58, 138] }, // brand-navy basically
        });

        doc.save(`Zenith_Transactions_${format(new Date(), "yyyyMMdd")}.pdf`);
    };

    return (
        <div className="space-y-6">
            {/* ── Sticky Filters ── */}
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
                </div>
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <select
                        aria-label="Filter by type"
                        title="Filter by type"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none text-sm min-w-max"
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
                        className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none text-sm min-w-max"
                    >
                        <option value="ALL">All Accounts</option>
                        {wallets.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 my-auto ml-1 mr-1 hidden sm:block"></div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-sm font-medium whitespace-nowrap"
                        title="Export as Excel"
                    >
                        <Download size={14} />
                        <span className="hidden lg:inline">Excel</span>
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors text-sm font-medium whitespace-nowrap"
                        title="Export as PDF"
                    >
                        <Download size={14} />
                        <span className="hidden lg:inline">PDF</span>
                    </button>
                </div>
            </div>

            {dateFilter && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-2 border border-indigo-100 dark:border-indigo-800">
                        <span>Showing transactions for {format(new Date(dateFilter), "MMMM d, yyyy")}</span>
                        <button
                            onClick={() => setDateFilter("")}
                            className="hover:bg-indigo-100 dark:hover:bg-indigo-800 p-0.5 rounded transition-colors"
                            title="Clear date filter"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>

            {/* ── Edit Modal ── */ }
    {
        editingTx && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={cancelEdit}>
                <div
                    className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Transaction</h2>
                        <button onClick={cancelEdit} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors" title="Close" aria-label="Close edit dialog">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Amount (₹)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none text-lg font-semibold"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Type</label>
                        <div className="grid grid-cols-4 gap-2">
                            {["INCOME", "EXPENSE", "INVESTMENT", "TRANSFER"].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setEditForm({ ...editForm, type: t })}
                                    className={`py-2 rounded-xl text-xs font-semibold transition-all border ${editForm.type === t
                                        ? t === "INCOME" ? "bg-emerald-500 text-white border-emerald-500"
                                            : t === "EXPENSE" ? "bg-red-500 text-white border-red-500"
                                                : t === "INVESTMENT" ? "bg-blue-500 text-white border-blue-500"
                                                    : "bg-gray-500 text-white border-gray-500"
                                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400"
                                        }`}
                                >
                                    {t === "INCOME" ? "Income" : t === "EXPENSE" ? "Expense" : t === "INVESTMENT" ? "Invest." : "Transfer"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Category</label>
                        <select
                            value={allCategories.some(c => c.name === editForm.category) ? editForm.category : "__custom__"}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none"
                            aria-label="Category"
                            title="Category"
                        >
                            {allCategories.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                            {!allCategories.some(c => c.name === editForm.category) && (
                                <option value={editForm.category}>{editForm.category} (custom)</option>
                            )}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Description</label>
                        <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Optional note..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Date */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Date</label>
                            <input
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none"
                            />
                        </div>

                        {/* Wallet */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Account</label>
                            <select
                                value={editForm.walletId}
                                onChange={(e) => setEditForm({ ...editForm, walletId: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none"
                                aria-label="Account"
                                title="Account"
                            >
                                {wallets.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={saveEdit}
                            disabled={isSaving || !editForm.amount}
                            className="flex-1 py-3 bg-[var(--color-brand-navy)] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            Save changes
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    {/* ── Transaction List ── */ }
    {
        sortedDates.length === 0 ? (
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
                                                <div className="flex opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                                    <button
                                                        onClick={(e) => openEdit(tx, e)}
                                                        title="Edit transaction"
                                                        aria-label="Edit transaction"
                                                        className="p-2 text-gray-400 hover:text-[var(--color-brand-navy)] transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(tx.id, e)}
                                                        disabled={deletingId === tx.id}
                                                        title="Delete transaction"
                                                        aria-label="Delete transaction"
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
        )
    }
        </div >
    );
}
