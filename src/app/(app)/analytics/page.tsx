import { getTransactions } from "@/app/actions/transactions";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
    // Fetch up to 1000 transactions for the analytics
    const txRes = await getTransactions({ limit: 1000 });

    if (txRes.error) {
        return (
            <div className="p-8 text-center h-[80vh] flex flex-col justify-center items-center">
                <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                <p className="text-red-500 font-bold text-xl">Failed to load analytics data.</p>
                <p className="text-gray-500 mt-2">{txRes.error}</p>
                <a
                    href="/analytics"
                    className="mt-6 px-8 py-3 bg-[var(--color-brand-navy)] text-white rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all"
                >
                    Retry Refresh
                </a>
            </div>
        );
    }

    const transactions = (txRes.data || []).map((t) => ({
        ...t,
        date: t.date?.toISOString() || new Date().toISOString(),
        createdAt: t.createdAt?.toISOString(),
        updatedAt: t.updatedAt?.toISOString(),
    }));

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
            <AnalyticsClient initialTransactions={transactions} />
        </div>
    );
}
