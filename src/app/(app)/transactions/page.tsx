import { getTransactions } from "@/app/actions/transactions"
import { getWallets } from "@/app/actions/wallets"
import { TransactionList } from "@/components/transactions/TransactionList"
import { AlertCircle, Upload } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function TransactionsPage({
    searchParams
}: {
    searchParams: { type?: string }
}) {
    const [txRes, walletRes] = await Promise.all([
        getTransactions({ limit: 500 }),
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

    const validTypes = ["INCOME", "EXPENSE", "INVESTMENT", "TRANSFER"];
    const initialTypeFilter = searchParams.type && validTypes.includes(searchParams.type)
        ? searchParams.type
        : "ALL";

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">Transactions</h1>
                    <p className="text-gray-500 mt-1">View and manage your entire financial history.</p>
                </div>
                <Link
                    href="/import"
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-sm font-medium"
                >
                    <Upload size={16} />
                    Import
                </Link>
            </div>

            <TransactionList
                initialTransactions={txRes.data || []}
                wallets={walletRes.data || []}
                initialTypeFilter={initialTypeFilter}
            />
        </div>
    )
}
