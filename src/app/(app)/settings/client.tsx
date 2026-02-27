"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Moon, Sun, Monitor, Download, Cloud, Tag, IndianRupee, LogOut, ChevronRight,
    ChevronDown, Loader2, Check, Utensils, Car, Zap, Tv, Briefcase, X, Plus,
    Lock, Trash2, TrendingUp, Phone, Banknote, Fuel
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { resetAllUserData } from "@/app/actions/import";

import { CATEGORY_DEFAULTS } from "@/lib/constants";

const CURRENCIES = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
];

export function SettingsClient({ userEmail }: { userEmail: string }) {
    const router = useRouter();
    const supabase = createClient();
    const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
    const [showCategories, setShowCategories] = useState(false);
    const [showCurrency, setShowCurrency] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState("INR");
    const [resetStep, setResetStep] = useState<"idle" | "confirm" | "deleting" | "done">("idle");
    const [resetResult, setResetResult] = useState<{ transactions: number; wallets: number; budgets: number } | null>(null);
    const [resetError, setResetError] = useState("");
    const [userCategories, setUserCategories] = useState<any[]>([]);
    const [newCategory, setNewCategory] = useState("");

    // Load theme from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("zenith-theme") as "light" | "dark" | "system" | null;
        if (saved) setTheme(saved);
    }, []);

    // Apply theme and persist to localStorage whenever it changes
    useEffect(() => {
        const root = window.document.documentElement;
        localStorage.setItem("zenith-theme", theme);
        if (theme === "system") {
            root.classList.remove("light", "dark");
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            if (prefersDark) root.classList.add("dark");
        } else {
            root.classList.remove("light", "dark");
            root.classList.add(theme);
        }
    }, [theme]);

    // Load saved currency preference
    useEffect(() => {
        const saved = localStorage.getItem("zenith-currency");
        if (saved) setSelectedCurrency(saved);
    }, []);

    // Load categories from localStorage or use defaults
    useEffect(() => {
        try {
            const saved = localStorage.getItem("zenith-categories-v2");
            if (saved) {
                setUserCategories(JSON.parse(saved));
            } else {
                // Check legacy format
                const legacy = localStorage.getItem("zenith-custom-categories");
                if (legacy) {
                    const customNames = JSON.parse(legacy) as string[];
                    const merged = [...CATEGORY_DEFAULTS];
                    customNames.forEach(name => {
                        if (!merged.find(c => c.name.toLowerCase() === name.toLowerCase())) {
                            merged.push({ name, color: "#9333ea", icon: Tag });
                        }
                    });
                    setUserCategories(merged);
                } else {
                    setUserCategories(CATEGORY_DEFAULTS);
                }
            }
        } catch {
            setUserCategories(CATEGORY_DEFAULTS);
        }
    }, []);

    const addCategory = () => {
        const name = newCategory.trim();
        if (!name) return;
        if (userCategories.find(c => c.name.toLowerCase() === name.toLowerCase())) return;

        const updated = [...userCategories, { name, color: "#9333ea", icon: Tag }];
        setUserCategories(updated);
        localStorage.setItem("zenith-categories-v2", JSON.stringify(updated));
        // Also update legacy for backward compatibility with other components
        localStorage.setItem("zenith-custom-categories", JSON.stringify(updated.map(c => c.name)));
        setNewCategory("");
    };

    const removeCategory = (name: string) => {
        const updated = userCategories.filter(c => c.name !== name);
        setUserCategories(updated);
        localStorage.setItem("zenith-categories-v2", JSON.stringify(updated));
        localStorage.setItem("zenith-custom-categories", JSON.stringify(updated.map(c => c.name)));
    };

    const handleCurrencySelect = (code: string) => {
        setSelectedCurrency(code);
        localStorage.setItem("zenith-currency", code);
        setShowCurrency(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };


    const currentCurrency = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

    return (
        <div className="space-y-6">

            {/* Profile Section */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[var(--color-brand-navy)] text-white flex items-center justify-center text-xl font-bold">
                        {userEmail[0].toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{userEmail}</h2>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium mt-1">
                            <Cloud size={14} />
                            <span>Synced with Zenith Cloud</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    title="Sign Out"
                    aria-label="Sign Out"
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* Preferences Section */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preferences</h3>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">

                    {/* ── Appearance ── */}
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                                {theme === "dark" ? <Moon size={20} /> : theme === "light" ? <Sun size={20} /> : <Monitor size={20} />}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Appearance</p>
                                <p className="text-sm text-gray-500">Light, dark, or system default</p>
                            </div>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg gap-1">
                            {(['light', 'dark', 'system'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTheme(t)}
                                    title={t.charAt(0).toUpperCase() + t.slice(1)}
                                    aria-label={`Set theme to ${t}`}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all flex items-center justify-center ${theme === t
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {t === 'light' ? <Sun size={14} /> : t === 'dark' ? <Moon size={14} /> : <Monitor size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Currency ── */}
                    <div>
                        <button
                            onClick={() => { setShowCurrency(!showCurrency); setShowCategories(false); }}
                            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                            aria-expanded={showCurrency}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center">
                                    <IndianRupee size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Base Currency</p>
                                    <p className="text-sm text-gray-500">{currentCurrency.name} ({currentCurrency.symbol})</p>
                                </div>
                            </div>
                            {showCurrency
                                ? <ChevronDown className="text-gray-400" size={20} />
                                : <ChevronRight className="text-gray-400" size={20} />
                            }
                        </button>

                        {showCurrency && (
                            <div className="border-t border-gray-100 dark:border-gray-800 px-6 pb-4">
                                <p className="text-xs text-gray-400 py-3">Select your preferred display currency</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {CURRENCIES.map(c => (
                                        <button
                                            key={c.code}
                                            onClick={() => handleCurrencySelect(c.code)}
                                            className={`flex items-center justify-between p-3 rounded-xl transition-all text-left ${selectedCurrency === c.code
                                                ? 'bg-[var(--color-brand-navy)]/10 text-[var(--color-brand-navy)] dark:bg-blue-900/20 dark:text-blue-300 font-medium'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <span className="text-lg font-bold w-6 text-center">{c.symbol}</span>
                                                <span>{c.name} <span className="text-xs text-gray-400">({c.code})</span></span>
                                            </span>
                                            {selectedCurrency === c.code && <Check size={16} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Manage Categories ── */}
                    <div>
                        <button
                            onClick={() => { setShowCategories(!showCategories); setShowCurrency(false); }}
                            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                            aria-expanded={showCategories}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center">
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Manage Categories</p>
                                    <p className="text-sm text-gray-500">{userCategories.length} active categories</p>
                                </div>
                            </div>
                            {showCategories
                                ? <ChevronDown className="text-gray-400" size={20} />
                                : <ChevronRight className="text-gray-400" size={20} />
                            }
                        </button>

                        {showCategories && (
                            <div className="border-t border-gray-100 dark:border-gray-800 px-6 pb-5">

                                {/* Add new category */}
                                <div className="flex gap-2 py-4">
                                    <input
                                        type="text"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }}
                                        placeholder="Add new category..."
                                        className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-brand-navy)] outline-none"
                                    />
                                    <button
                                        onClick={addCategory}
                                        disabled={!newCategory.trim()}
                                        className="px-4 py-2.5 bg-[var(--color-brand-navy)] text-white rounded-xl flex items-center gap-1.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                                    >
                                        <Plus size={16} />
                                        Add
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {userCategories.map(cat => {
                                        const Icon = cat.icon || Tag;
                                        return (
                                            <div
                                                key={cat.name}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 group"
                                            >
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 dynamic-bg-light dynamic-text"
                                                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                                                >
                                                    <Icon size={16} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">{cat.name}</span>
                                                <button
                                                    onClick={() => removeCategory(cat.name)}
                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded opacity-0 group-hover:opacity-100 sm:opacity-100"
                                                    title={`Remove ${cat.name}`}
                                                    aria-label={`Remove category ${cat.name}`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Data Section */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data &amp; Backup</h3>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    <Link
                        href="/export"
                        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center">
                                <Download size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Export Center</p>
                                <p className="text-sm text-gray-500">Download data as PDF or CSV</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-400" size={20} />
                    </Link>
                </div>
            </div>

            {/* ── Danger Zone ───────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-red-100 dark:border-red-900/40 overflow-hidden">
                <div className="px-6 py-4 bg-red-50/50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/40">
                    <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider">⚠ Danger Zone</h3>
                </div>

                <div className="p-6 space-y-4">
                    {resetStep === "idle" && (
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Reset All Data</p>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Permanently delete all transactions, wallets, and budgets. Your account stays active.
                                </p>
                            </div>
                            <button
                                onClick={() => setResetStep("confirm")}
                                className="flex-shrink-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800"
                            >
                                Reset Data
                            </button>
                        </div>
                    )}

                    {resetStep === "confirm" && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="text-2xl">⚠️</div>
                                <div>
                                    <p className="font-bold text-red-700 dark:text-red-400">This cannot be undone.</p>
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                        All your transactions, wallets, and budgets will be permanently deleted.
                                        Your login and account settings will remain intact.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={async () => {
                                        setResetStep("deleting");
                                        setResetError("");
                                        const result = await resetAllUserData();
                                        if (result.error) {
                                            setResetError(result.error);
                                            setResetStep("confirm");
                                        } else {
                                            setResetResult(result);
                                            setResetStep("done");
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
                                >
                                    Yes, delete everything
                                </button>
                                <button
                                    onClick={() => setResetStep("idle")}
                                    className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                            {resetError && (
                                <p className="text-xs text-red-500">{resetError}</p>
                            )}
                        </div>
                    )}

                    {resetStep === "deleting" && (
                        <div className="flex items-center gap-3 text-red-600 py-2">
                            <Loader2 size={20} className="animate-spin" />
                            <p className="text-sm font-medium">Deleting your data&hellip;</p>
                        </div>
                    )}

                    {resetStep === "done" && resetResult && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                <Check size={20} />
                                <p className="font-semibold">Data reset complete</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                {[{ label: "Transactions", n: resetResult.transactions }, { label: "Wallets", n: resetResult.wallets }, { label: "Budgets", n: resetResult.budgets }].map(item => (
                                    <div key={item.label} className="bg-white dark:bg-gray-800 rounded-xl p-3">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.n}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{item.label} deleted</p>
                                    </div>
                                ))}
                            </div>
                            <a
                                href="/dashboard"
                                className="block w-full text-center py-3 bg-[var(--color-brand-navy)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-brand-navy-light)] transition-colors"
                            >
                                Start fresh → Dashboard
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
