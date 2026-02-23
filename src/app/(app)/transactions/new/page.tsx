import { getWallets } from "@/app/actions/wallets";
import { AddTransactionClient } from "@/components/transactions/AddTransactionClient";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function AddTransactionPage() {
    const walletsRes = await getWallets();

    if (walletsRes.error || !walletsRes.data?.length) {
        return (
            <div className="p-8 text-center bg-gray-50 h-screen flex flex-col justify-center items-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mb-4 mx-auto" />
                <h2 className="text-xl font-bold mb-2">No Wallets Found</h2>
                <p className="text-gray-500 mb-6">You need at least one wallet to add a transaction.</p>
                <Link href="/wallets" className="bg-[var(--color-brand-navy)] text-white px-6 py-3 rounded-xl font-medium">
                    Create a Wallet First
                </Link>
            </div>
        )
    }

    return <AddTransactionClient wallets={walletsRes.data} />
}
