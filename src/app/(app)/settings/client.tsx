"use client";

import { useState, useEffect } from "react";
import {
    Moon, Sun, Monitor, Download, Cloud, Tag, IndianRupee, LogOut, ChevronRight, Loader2
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export function SettingsClient({ userEmail }: { userEmail: string }) {
    const router = useRouter();
    const supabase = createClient();
    const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
    const [isExporting, setIsExporting] = useState(false);

    // Quick implementation for Phase 1 theme toggling
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === "system") {
            root.classList.remove("light", "dark");
        } else {
            root.classList.remove("light", "dark");
            root.classList.add(theme);
        }
    }, [theme]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const handleExport = async () => {
        setIsExporting(true);
        // Fake export delay for Phase 1 UI feedback
        await new Promise(r => setTimeout(r, 1500));
        alert("Export initiated! In Phase 2 this will download a CSV containing your transactions.");
        setIsExporting(false);
    };

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

                    {/* Appearance Toggle */}
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                                <Sun size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Appearance</p>
                                <p className="text-sm text-gray-500">Light, dark, or system default</p>
                            </div>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            {(['light', 'dark', 'system'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTheme(t)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${theme === t
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {t === 'light' ? <Sun size={14} /> : t === 'dark' ? <Moon size={14} /> : <Monitor size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Currency Default */}
                    <button className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center">
                                <IndianRupee size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Base Currency</p>
                                <p className="text-sm text-gray-500">Indian Rupee (INR)</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-400" size={20} />
                    </button>

                    {/* Category Management */}
                    <button className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center">
                                <Tag size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Manage Categories</p>
                                <p className="text-sm text-gray-500">Edit built-in or add custom categories</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-400" size={20} />
                    </button>

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
