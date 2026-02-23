import { getTransactions } from "@/app/actions/transactions"
import { getWallets } from "@/app/actions/wallets"
import { TransactionList } from "@/components/transactions/TransactionList"
import { AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TransactionsPage() {
    const [txRes, walletRes] = await Promise.all([
        getTransactions({ limit: 500 }), // Load last 500 txs for quick client-side filtering
        getWallets()
    ])

    if (txRes.error || walletRes.error) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-64 text-red-500 gap-4">
                <AlertCircle className="w-12 h-12" />
                <p>Failed to load data: {txRes.error || walletRes.error}</p>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">Transactions</h1>
                <p className="text-gray-500 mt-1">View and manage your entire financial history.</p>
            </div>

            <TransactionList
                initialTransactions={txRes.data || []}
                wallets={walletRes.data || []}
            />
        </div>
    )
}
