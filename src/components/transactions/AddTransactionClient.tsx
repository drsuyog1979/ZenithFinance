"use client";

import { useState } from "react";
import { Numpad } from "@/components/transactions/Numpad";
import { createTransaction } from "@/app/actions/transactions";
import { useRouter } from "next/navigation";
import {
    Utensils, Car, Zap, Tv, Briefcase, ChevronLeft, Loader2,
    TrendingUp, Phone, Banknote, Tag
} from "lucide-react";
import Link from "next/link";
import { TransactionType } from "@prisma/client";

const CATEGORIES = [
    { name: "Clinic", icon: Briefcase, color: "#10b981" },
    { name: "Baramati", icon: Briefcase, color: "#14b8a6" },
    { name: "Mutual Funds", icon: TrendingUp, color: "#0ea5e9" },
    { name: "Petrol", icon: Car, color: "#3b82f6" },
    { name: "Salary", icon: Banknote, color: "#ef4444" },
    { name: "Food & Drink", icon: Utensils, color: "#f97316" },
    { name: "Electricity Bill", icon: Zap, color: "#eab308" },
    { name: "App Purchase", icon: Tv, color: "#8b5cf6" },
    { name: "Apollo", icon: Briefcase, color: "#06b6d4" },
    { name: "Inamdar", icon: Briefcase, color: "#0891b2" },
    { name: "MNGL", icon: Zap, color: "#f59e0b" },
    { name: "VI", icon: Phone, color: "#a855f7" },
    { name: "Landline", icon: Phone, color: "#d97706" },
    { name: "Sahyadri Deccan", icon: Briefcase, color: "#2dd4bf" },
    { name: "Sahyadri Bibwewadi", icon: Briefcase, color: "#34d399" },
];

export function AddTransactionClient({ wallets }: { wallets: any[] }) {
    const router = useRouter();
    const [amountStr, setAmountStr] = useState("");
    const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
    const [category, setCategory] = useState(CATEGORIES[0].name);
    const [walletId, setWalletId] = useState(wallets[0]?.id || "");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState("");
    const [isRecurring, setIsRecurring] = useState(false);
    const [loading, setLoading] = useState(false);

    const formatINR = (val: string) => {
        if (!val) return "₹0";
        // Format keeping decimals intact while typing
        const num = parseFloat(val);
        if (isNaN(num)) return "₹0";
        return `₹${val}`;
    };

    const handleSubmit = async () => {
        if (!amountStr || parseFloat(amountStr) <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        if (!walletId) {
            alert("Please select a wallet");
            return;
        }

        setLoading(true);
        const amountInPaise = Math.round(parseFloat(amountStr) * 100);

        const res = await createTransaction({
            amount: amountInPaise,
            date: new Date(date),
            category,
            description: note,
            type,
            walletId,
            isRecurring
        });

        if (res.error) {
            alert(res.error);
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="flex flex-col min-h-screen pb-20 bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
                <Link href="/dashboard" className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    {(["EXPENSE", "INCOME", "TRANSFER"] as TransactionType[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setType(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${type === t
                                ? t === 'INCOME' ? 'bg-[var(--color-category-income)] text-white shadow-sm'
                                    : t === 'EXPENSE' ? 'bg-[var(--color-category-expense)] text-white shadow-sm'
                                        : 'bg-[var(--color-brand-navy)] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            {t.toLowerCase()}
                        </button>
                    ))}
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full space-y-8">

                {/* Amount Input — supports both keyboard and on-screen numpad */}
                <div className="text-center">
                    <p className="text-sm font-medium text-gray-500 mb-2">Amount</p>
                    <div className="relative inline-block">
                        <span className="text-5xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">₹</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={amountStr}
                            onChange={(e) => {
                                const v = e.target.value.replace(/[^0-9.]/g, '');
                                // Allow only one decimal point and max 2 decimal places
                                if ((v.match(/\./g) || []).length > 1) return;
                                const [, dec] = v.split('.');
                                if (dec && dec.length > 2) return;
                                setAmountStr(v);
                            }}
                            placeholder="0"
                            className="text-5xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white bg-transparent border-none outline-none text-center w-48 sm:w-64 placeholder:text-gray-300 dark:placeholder:text-gray-700"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Categories Grid */}
                <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">Category</h3>
                    <div className="grid grid-cols-4 gap-3 sm:gap-4">
                        {CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const isSelected = category === cat.name;
                            return (
                                <button
                                    key={cat.name}
                                    onClick={() => setCategory(cat.name)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${isSelected
                                        ? 'border-transparent shadow-md transform scale-105'
                                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    style={isSelected ? { backgroundColor: cat.color, color: 'white' } : {}}
                                >
                                    <Icon size={24} strokeWidth={isSelected ? 2.5 : 2} color={isSelected ? 'white' : cat.color} />
                                    <span className="text-[10px] font-medium text-center leading-tight">
                                        {cat.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Wallet</label>
                        <select
                            value={walletId}
                            onChange={(e) => setWalletId(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]"
                        >
                            {wallets.map((w: any) => (
                                <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]"
                            />
                        </div>
                        <div className="flex items-end mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isRecurring}
                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-[var(--color-brand-navy)] focus:ring-[var(--color-brand-navy)]"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurring</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Note</label>
                        <input
                            type="text"
                            placeholder="What was this for?"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)] placeholder:font-normal"
                        />
                    </div>
                </div>

                {/* Numpad */}
                <div className="pt-2">
                    <Numpad value={amountStr} onChange={setAmountStr} />
                </div>

            </div>

            {/* Save action floating bottom bar */}
            <div className="fixed bottom-0 md:bottom-auto md:sticky left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 z-50">
                <button
                    onClick={handleSubmit}
                    disabled={loading || !amountStr || parseFloat(amountStr) <= 0}
                    className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] text-white hover:bg-[var(--color-brand-navy-light)] disabled:bg-gray-300 disabled:text-gray-500 py-4 rounded-xl font-bold tracking-wide transition-all shadow-lg shadow-[#1a3c5e]/30"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save Transaction'}
                </button>
            </div>
        </div>
    );
}
