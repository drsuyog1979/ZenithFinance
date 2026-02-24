"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { createWallet } from "@/app/actions/wallets";

export function AddWalletModal({ onAdd }: { onAdd: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const colors = ["#1a3c5e", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f97316"];

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const amount = Number(formData.get("amount"));
        const rupeesToPaise = amount * 100; // Store as paise

        await createWallet({
            name: formData.get("name") as string,
            color: formData.get("color") as string,
            currency: "INR",
            openingBalance: rupeesToPaise,
        });

        setLoading(false);
        setIsOpen(false);
        onAdd();
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] text-white px-6 py-3 rounded-xl transition-colors font-medium shadow-sm"
            >
                <Plus size={20} />
                Add Wallet
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-xl font-bold">New Wallet</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                aria-label="Close modal"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label htmlFor="wallet-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Account Name
                                </label>
                                <input
                                    id="wallet-name"
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="e.g. HDFC Savings"
                                    className="w-full border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 focus:ring-[var(--color-brand-navy)] focus:border-[var(--color-brand-navy)] transition-colors"
                                />
                            </div>

                            <div>
                                <label htmlFor="wallet-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Starting Balance (₹)
                                </label>
                                <input
                                    id="wallet-amount"
                                    name="amount"
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 focus:ring-[var(--color-brand-navy)] focus:border-[var(--color-brand-navy)] transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Color Theme
                                </label>
                                <div className="flex gap-3">
                                    {colors.map((c) => (
                                        <label key={c} className="relative cursor-pointer">
                                            <span className="sr-only">Select color {c}</span>
                                            <input
                                                type="radio"
                                                name="color"
                                                value={c}
                                                className="peer sr-only"
                                                required
                                                defaultChecked={c === colors[0]}
                                                title={`Color ${c}`}
                                            />
                                            <div
                                                className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-[var(--color-brand-navy)] dark:peer-checked:ring-offset-gray-900 transition-all dynamic-bg"
                                                style={{ "--dynamic-color": c } as React.CSSProperties}
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] text-white px-6 py-4 rounded-xl transition-colors font-medium shadow-md disabled:opacity-70"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Create Wallet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
