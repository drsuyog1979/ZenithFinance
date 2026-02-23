import { getBudgets } from "@/app/actions/budgets";
import { getTransactions } from "@/app/actions/transactions";
import { BudgetManager } from "@/components/budgets/BudgetManager";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const CATEGORIES = [
    { name: "Food & Dining", color: "#f97316" },
    { name: "Transport", color: "#3b82f6" },
    { name: "Shopping", color: "#ec4899" },
    { name: "Housing", color: "#8b5cf6" },
    { name: "Utilities", color: "#eab308" },
    { name: "Health", color: "#10b981" },
    { name: "Entertainment", color: "#6366f1" },
];

export default async function BudgetsPage() {
    const currentDate = new Date();
    const monthYear = format(currentDate, "yyyy-MM");

    const [budgetsRes, txsRes] = await Promise.all([
        getBudgets(monthYear),
        getTransactions({ month: currentDate.getMonth(), year: currentDate.getFullYear() })
    ]);

    if (budgetsRes.error || txsRes.error) {
        return (
            <div className="p-8 text-center bg-gray-50 h-screen flex flex-col justify-center items-center">
                <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                <p className="text-red-500">Failed to load budgets. {budgetsRes.error || txsRes.error}</p>
            </div>
        );
    }

    // Map expenses per category
    const expensesByCategory: Record<string, number> = {};
    txsRes.data?.forEach(tx => {
        if (tx.type === "EXPENSE") {
            expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + tx.amount;
        }
    });

    const dbBudgets = budgetsRes.data || [];

    const matchedBudgets = CATEGORIES.map(cat => {
        const dbLimit = dbBudgets.find(b => b.category === cat.name)?.limitAmount || 0;
        const spent = expensesByCategory[cat.name] || 0;
        return {
            category: cat.name,
            spent,
            limit: dbLimit,
            color: cat.color
        };
    });

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">Budgets</h1>
                <p className="text-gray-500 mt-1">Track your spending goals for {format(currentDate, "MMMM yyyy")}.</p>
            </div>

            <BudgetManager budgets={matchedBudgets} monthYear={monthYear} />
        </div>
    );
}
