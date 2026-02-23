"use client";

import { useState } from "react";
import { format } from "date-fns";
import { upsertBudget } from "@/app/actions/budgets";
import { Edit2, Loader2, Target } from "lucide-react";

interface BudgetData {
    category: string;
    spent: number;
    limit: number;
    color: string;
}

export function BudgetManager({
    budgets,
    monthYear
}: {
    budgets: BudgetData[],
    monthYear: string
}) {
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editLimit, setEditLimit] = useState("");
    const [loading, setLoading] = useState(false);

    const totalBudgeted = budgets.reduce((acc, b) => acc + (b.limit || 0), 0);
    const totalSpent = budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
    const totalPercent = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    const formatINR = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value / 100);
    };

    const getProgressColor = (percent: number) => {
        if (percent >= 100) return "bg-red-500 shadow-red-500/30 text-red-600";
        if (percent >= 70) return "bg-orange-400 shadow-orange-400/30 text-orange-600";
        return "bg-emerald-500 shadow-emerald-500/30 text-emerald-600";
    };

    const handleSaveLimit = async (category: string) => {
        setLoading(true);
        const amountInPaise = Math.round(parseFloat(editLimit) * 100);

        if (amountInPaise >= 0) {
            await upsertBudget(category, monthYear, amountInPaise);
            window.location.reload();
        } else {
            setLoading(false);
            setEditingCategory(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

                <div className="flex items-center gap-3 mb-4 text-gray-500">
                    <Target size={20} />
                    <h2 className="font-medium tracking-wide uppercase text-sm">Monthly Summary</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Total Spent</p>
                        <p className={`text-2xl font-bold ${getProgressColor(totalPercent).split(' ')[2]}`}>
                            {formatINR(totalSpent)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Total Budgeted</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {formatINR(totalBudgeted)}
                        </p>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
                        <span>Utilization</span>
                        <span>{Math.round(totalPercent)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${getProgressColor(totalPercent).split(' ')[0]} transition-all duration-1000 ease-out`}
                            style={{ width: `${Math.min(totalPercent, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Category Budgets */}
            <div className="space-y-4">
                {budgets.map((b) => {
                    const percent = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
                    const isEditing = editingCategory === b.category;

                    return (
                        <div key={b.category} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 group transition-all hover:shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center opacity-80"
                                        style={{ backgroundColor: `${b.color}20`, color: b.color }}
                                    >
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{b.category}</h3>
                                </div>

                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 font-medium">₹</span>
                                        <input
                                            type="number"
                                            value={editLimit}
                                            onChange={(e) => setEditLimit(e.target.value)}
                                            placeholder="Limit"
                                            className="w-24 bg-gray-50 dark:bg-gray-800 border-none rounded-lg px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleSaveLimit(b.category)}
                                            disabled={loading}
                                            className="bg-[var(--color-brand-navy)] text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-[var(--color-brand-navy-light)] disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                                        </button>
                                        <button
                                            onClick={() => setEditingCategory(null)}
                                            className="text-gray-400 hover:text-gray-600 text-sm px-2"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setEditingCategory(b.category);
                                            setEditLimit((b.limit / 100).toString());
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-[var(--color-brand-navy)] transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        {formatINR(b.spent)}
                                        <span className="text-sm font-medium text-gray-400 ml-1">
                                            / {b.limit > 0 ? formatINR(b.limit) : 'Not set'}
                                        </span>
                                    </div>
                                    <span className={`text-sm font-bold ${getProgressColor(percent).split(' ')[2]}`}>
                                        {b.limit > 0 ? `${Math.round(percent)}%` : 'No Limit'}
                                    </span>
                                </div>

                                {b.limit > 0 && (
                                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${getProgressColor(percent).split(' ')[0]}`}
                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
