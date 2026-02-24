"use client";

import { useState, useEffect } from "react";
import {
    Moon, Sun, Monitor, Download, Cloud, Tag, IndianRupee, LogOut, ChevronRight,
    ChevronDown, Loader2, Check, ShoppingBag, Utensils, Car, HeartPulse, Home,
    Zap, Tv, Briefcase, X
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const CATEGORIES = [
    { name: "Food & Dining", color: "#f97316", icon: Utensils },
    { name: "Transport", color: "#3b82f6", icon: Car },
    { name: "Shopping", color: "#ec4899", icon: ShoppingBag },
    { name: "Housing", color: "#8b5cf6", icon: Home },
    { name: "Utilities", color: "#eab308", icon: Zap },
    { name: "Health", color: "#10b981", icon: HeartPulse },
    { name: "Entertainment", color: "#6366f1", icon: Tv },
    { name: "Income", color: "#22c55e", icon: Briefcase },
];

const CURRENCIES = [
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
];

export function SettingsClient({ userEmail }: { userEmail: string }) {
    const router = useRouter();
    const supabase = createClient();
    const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
    const [isExporting, setIsExporting] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [showCurrency, setShowCurrency] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState("INR");

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

    const handleExport = async () => {
        setIsExporting(true);
        await new Promise(r => setTimeout(r, 1500));
        alert("Export feature coming in Phase 2 — it will download a CSV of all your transactions.");
        setIsExporting(false);
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
                            aria-expanded={showCurrency ? "true" : "false"}
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
                            aria-expanded={showCategories ? "true" : "false"}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center">
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Manage Categories</p>
                                    <p className="text-sm text-gray-500">{CATEGORIES.length} built-in categories</p>
                                </div>
                            </div>
                            {showCategories
                                ? <ChevronDown className="text-gray-400" size={20} />
                                : <ChevronRight className="text-gray-400" size={20} />
                            }
                        </button>

                        {showCategories && (
                            <div className="border-t border-gray-100 dark:border-gray-800 px-6 pb-4">
                                <p className="text-xs text-gray-400 py-3">Built-in categories (used across transactions & budgets)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {CATEGORIES.map(cat => {
                                        const Icon = cat.icon;
                                        return (
                                            <div
                                                key={cat.name}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                                            >
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 dynamic-bg-light dynamic-text"
                                                    style={{ "--dynamic-color": cat.color } as React.CSSProperties}
                                                >
                                                    <Icon size={16} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-400 mt-4 text-center">Custom category management coming in Phase 2</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Data Section */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data & Backup</h3>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left disabled:opacity-50"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center">
                                <Download size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Export as CSV</p>
                                <p className="text-sm text-gray-500">Download all your transactions</p>
                            </div>
                        </div>
                        {isExporting ? <Loader2 className="animate-spin text-gray-400" size={20} /> : <ChevronRight className="text-gray-400" size={20} />}
                    </button>
                </div>
            </div>

        </div>
    );
}
