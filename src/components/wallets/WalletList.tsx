"use client";

import { useState } from "react";
import { Plus, Wallet, Edit2, Trash2 } from "lucide-react";
import { deleteWallet } from "@/app/actions/wallets";

export function WalletList({ wallets }: { wallets: any[] }) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const formatINR = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value / 100);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure? This will delete all transactions in this wallet.")) {
            setIsDeleting(id);
            await deleteWallet(id);
            window.location.reload();
        }
    };

    if (wallets.length === 0) {
        return (
            <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No wallets found</h3>
                <p className="text-gray-500 mt-1">Start by adding your first wallet or bank account.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wallets.map((wallet) => (
                <div key={wallet.id} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 relative group overflow-hidden transition-all hover:shadow-md">
                    {/* Card background blob based on color */}
                    <div
                        className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-[0.03] transition-transform group-hover:scale-110"
                        style={{ backgroundColor: wallet.color || "var(--color-brand-navy)" }}
                    />

                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                style={{ backgroundColor: wallet.color || "var(--color-brand-navy)" }}
                            >
                                <Wallet size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{wallet.name}</h3>
                                <p className="text-xs text-gray-500">{wallet.currency}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 text-gray-400 hover:text-[var(--color-brand-navy)] transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(wallet.id)}
                                disabled={isDeleting === wallet.id}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500 mb-1">Current Balance</p>
                        <h4 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {formatINR(wallet.currentBalance)}
                        </h4>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                        {/* Fake trend bar for Phase 1 aesthetics */}
                        <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden flex">
                            <div className="w-1/3 bg-red-400" />
                            <div className="w-2/3 bg-green-400" />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">Activity</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
