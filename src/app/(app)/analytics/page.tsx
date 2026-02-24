import { getTransactions } from "@/app/actions/transactions"
import { BarChart } from "@/components/analytics/BarChart"
import { TrendLineChart } from "@/components/analytics/LineChart"
import { SpendingHeatmap } from "@/components/analytics/Heatmap"
import { SpendDonutChart } from "@/components/dashboard/DonutChart"
import { format, subMonths } from "date-fns"
import { AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
    const currentDate = new Date()

    // Fetch up to 1000 transactions for the last 6 months 
    // In a real app we'd want custom query functions but grabbing recent here is fine for Phase 1
    const txRes = await getTransactions({ limit: 1000 })

    if (txRes.error) {
        return (
            <div className="p-8 text-center bg-gray-50 h-screen flex flex-col justify-center items-center">
                <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                <p className="text-red-500">Failed to load analytics data.</p>
            </div>
        )
    }

    const transactions = txRes.data || []

    // 1. Bar Chart Data (6 months)
    const barData = []
    for (let i = 5; i >= 0; i--) {
        const d = subMonths(currentDate, i)
        const monthKey = format(d, "MMMM")

        // Sum expenses for this month
        const spent = transactions
            .filter(tx =>
                tx.type === "EXPENSE" &&
                new Date(tx.date).getMonth() === d.getMonth() &&
                new Date(tx.date).getFullYear() === d.getFullYear()
            )
            .reduce((sum, tx) => sum + tx.amount, 0)

        barData.push({ month: monthKey, spent })
    }

    // 2. Heatmap Data (Current Month)
    const currentMonthTxs = transactions.filter(tx =>
        tx.type === "EXPENSE" &&
        new Date(tx.date).getMonth() === currentDate.getMonth() &&
        new Date(tx.date).getFullYear() === currentDate.getFullYear()
    ).map(tx => ({ date: new Date(tx.date), amount: tx.amount, category: tx.category }))

    // 3. Line Chart Data (Income vs Expense over 6 months)
    const lineData = []
    for (let i = 5; i >= 0; i--) {
        const d = subMonths(currentDate, i)
        const monthKey = format(d, "MMM")

        const monthTxs = transactions.filter(tx =>
            new Date(tx.date).getMonth() === d.getMonth() &&
            new Date(tx.date).getFullYear() === d.getFullYear()
        )

        const income = monthTxs.filter(tx => tx.type === "INCOME").reduce((sum, tx) => sum + tx.amount, 0)
        const expense = monthTxs.filter(tx => tx.type === "EXPENSE").reduce((sum, tx) => sum + tx.amount, 0)

        lineData.push({ date: monthKey, income, expense })
    }

    // 4. Pie Chart Data (Category breakdown current month)
    const categoryMap: Record<string, number> = {}
    currentMonthTxs.forEach((tx) => {
        categoryMap[tx.category as string] = (categoryMap[tx.category as string] || 0) + tx.amount
    })

    const getColor = (category: string) => {
        switch (category) {
            case "Food & Dining": return "#f97316";
            case "Transport": return "#3b82f6";
            case "Shopping": return "#ec4899";
            case "Utilities": return "#eab308";
            case "Health": return "#10b981";
            case "Entertainment": return "#8b5cf6";
            default: return "#ef4444";
        }
    }

    const pieData = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value, color: getColor(name) }))
        .sort((a, b) => b.value - a.value)

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">Analytics</h1>
                <p className="text-gray-500 mt-1">Deep dive into your financial habits and trends.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 6-Month Bar Chart */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">6-Month Spending</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Expense Trend</p>
                    </div>
                    <BarChart data={barData} />
                </div>

                {/* Current Month Heatmap */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Daily Intensity</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{format(currentDate, "MMMM yyyy")}</p>
                    </div>
                    <SpendingHeatmap currentDate={currentDate} data={currentMonthTxs} />
                </div>

                {/* Income vs Expense Line */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 lg:col-span-2">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Cashflow Analysis</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Income vs Expenses (6 Months)</p>
                    </div>
                    <TrendLineChart data={lineData} />
                </div>

                {/* Category Breakdown Donut */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 lg:col-span-2 flex flex-col items-center">
                    <div className="mb-6 w-full text-left">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Spending Categories</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{format(currentDate, "MMMM yyyy")} Breakdown</p>
                    </div>
                    <div className="w-full max-w-xl">
                        <SpendDonutChart data={pieData} />
                    </div>
                </div>
            </div>
        </div>
    )
}
