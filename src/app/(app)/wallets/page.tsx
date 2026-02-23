"use client";

import { useState, useEffect } from "react";
import { getWallets } from "@/app/actions/wallets";
import { WalletList } from "@/components/wallets/WalletList";
import { AddWalletModal } from "@/components/wallets/WalletForm";
import { Loader2 } from "lucide-react";

export default function WalletsPage() {
    const [wallets, setWallets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWallets = async () => {
        setLoading(true);
        const res = await getWallets();
        if (res.data) setWallets(res.data);
        setLoading(false);
    };

    useEffect(() => {
        fetchWallets();
    }, []);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">Accounts & Wallets</h1>
                    <p className="text-gray-500 mt-1">Manage your bank accounts, credit cards, and cash.</p>
                </div>
                <AddWalletModal onAdd={fetchWallets} />
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-navy)]" />
                </div>
            ) : (
                <WalletList wallets={wallets} />
            )}
        </div>
    );
}
