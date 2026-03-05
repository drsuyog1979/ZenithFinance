import { useState, useEffect, useMemo, useCallback } from "react";
import { Transaction, Wallet } from "@prisma/client";
import { format } from "date-fns";
import {
    ShoppingBag,
    Utensils,
    Car,
    HeartPulse,
    Home,
    Zap,
    Tv,
    Briefcase,
    TrendingUp,
    Fuel,
    Phone,
    Smartphone,
    Stethoscope,
    Building2,
    Flame,
    Banknote,
    Tag,
    Edit2,
    Trash2,
    Loader2,
    X,
    Check
} from "lucide-react";
import { deleteTransaction, updateTransaction } from "@/app/actions/transactions";
import { CATEGORY_DEFAULTS } from "@/lib/constants";

// Deterministic color for unknown categories
function hashColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}

export const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value / 100);
};

export const getIcon = (category: string) => {
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

export const getColor = (category: string) => {
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

export function CategoryCards({ data }: { data: { category: string, amount: number, color: string }[] }) {
    if (data.length === 0) return null;

    return (
        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex gap-4 min-w-max">
                {data.map((cat, i) => {
                    const Icon = getIcon(cat.category);
                    return (
                        <div key={i} className="flex flex-col min-w-[120px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center mb-3 dynamic-bg-light dynamic-text"
                                style={{ "--dynamic-color": cat.color } as React.CSSProperties}
                            >
                                <Icon size={20} />
                            </div>
                            <h4 className="text-xs font-medium text-gray-500 truncate mb-1">{cat.category}</h4>
                            <p className="font-bold">{formatINR(cat.amount)}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

type ExtTransaction = Transaction & { wallet: Wallet };

export function RecentTransactions({
    transactions,
    wallets = [],
    onUpdate,
    onDelete
}: {
    transactions: ExtTransaction[],
    wallets?: any[],
    onUpdate?: (tx: any) => void,
    onDelete?: (id: string) => void
}) {
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

    const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this transaction?")) {
            setDeletingId(id);
            await deleteTransaction(id);
            setDeletingId(null);
            if (onDelete) onDelete(id);
        }
    }, [onDelete]);

    const openEdit = useCallback((tx: any, e: React.MouseEvent) => {
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
    }, []);

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
            setEditingTx(null);
            if (onUpdate) onUpdate(result.data);
        } else {
            alert("Failed to update: " + result.error);
        }
        setIsSaving(false);
    };

    if (transactions.length === 0) {
        return (
            <div className="py-8 text-center text-gray-400 text-sm">
                No recent transactions to strictly show.
            </div>
        );
    }

    // Group by date, computed with useMemo
    const grouped = useMemo(() => {
        const result: Record<string, ExtTransaction[]> = {};
        transactions.forEach(t => {
            const dateKey = format(new Date(t.date), "yyyy-MM-dd");
            if (!result[dateKey]) result[dateKey] = [];
            result[dateKey].push(t);
        });
        return result;
    }, [transactions]);

    return (
        <div className="space-y-6">
            {/* ── Edit Modal ── */}
            {editingTx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={cancelEdit}>
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
            )}

            {Object.entries(grouped).map(([dateStr, txs]) => (
                <div key={dateStr}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        {format(new Date(dateStr), "MMM d, yyyy")}
                    </h4>
                    <div className="space-y-3">
                        {txs.map((tx) => {
                            const Icon = getIcon(tx.category);
                            const isIncome = tx.type === "INCOME";
                            const isExpense = tx.type === "EXPENSE";
                            const isInvestment = tx.type === "INVESTMENT";
                            const color = getColor(tx.category);
                            const iconColor = isIncome ? "#10b981" : isExpense ? "#ef4444" : isInvestment ? "#3b82f6" : color;

                            return (
                                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 dynamic-bg-light dynamic-text"
                                            style={{ "--dynamic-color": iconColor } as React.CSSProperties}
                                        >
                                            <Icon size={24} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {tx.description || tx.category}
                                            </p>
                                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                                <span>{tx.wallet.name}</span>
                                                {tx.source !== 'MANUAL' && (
                                                    <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-medium">
                                                        {tx.source}
                                                    </span>
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
                                                className="p-1.5 sm:p-2 text-gray-400 hover:text-[var(--color-brand-navy)] transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(tx.id, e)}
                                                disabled={deletingId === tx.id}
                                                title="Delete transaction"
                                                className="p-1.5 sm:p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
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
            ))}
        </div>
    );
}
