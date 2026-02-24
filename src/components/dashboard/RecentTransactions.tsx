import { Transaction, Wallet } from "@prisma/client";
import { format } from "date-fns";
import {
    ShoppingBag,
    Utensils,
    Car,
    HeartPulse,
    Home,
    Zap,
    Tv,
    Briefcase
} from "lucide-react";

export function CategoryCards({ data }: { data: { category: string, amount: number, color: string }[] }) {
    const formatINR = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value / 100);
    };

    const getIcon = (category: string) => {
        switch (category) {
            case "Food & Dining": return Utensils;
            case "Transport": return Car;
            case "Health": return HeartPulse;
            case "Housing": return Home;
            case "Utilities": return Zap;
            case "Entertainment": return Tv;
            case "Shopping": return ShoppingBag;
            case "Income": return Briefcase;
            default: return ShoppingBag;
        }
    };

    if (data.length === 0) return null;

    return (
        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex gap-4 min-w-max">
                {data.map((cat, i) => {
                    const Icon = getIcon(cat.category);
                    return (
                        <div key={i} className="flex flex-col min-w-[120px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center mb-3 dynamic-bg-light dynamic-text"
                                style={{ "--dynamic-color": cat.color } as React.CSSProperties}
                            >
                                <Icon size={20} />
                            </div>
                            <h4 className="text-xs font-medium text-gray-500 truncate mb-1">{cat.category}</h4>
                            <p className="font-bold">{formatINR(cat.amount)}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

type ExtTransaction = Transaction & { wallet: Wallet };

export function RecentTransactions({ transactions }: { transactions: ExtTransaction[] }) {
    const formatINR = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value / 100);
    };

    const getIcon = (category: string) => {
        switch (category) {
            case "Food & Dining": return Utensils;
            case "Transport": return Car;
            case "Health": return HeartPulse;
            case "Housing": return Home;
            case "Utilities": return Zap;
            case "Entertainment": return Tv;
            case "Shopping": return ShoppingBag;
            case "Income": return Briefcase;
            default: return ShoppingBag;
        }
    };

    const getColor = (category: string) => {
        switch (category) {
            case "Food & Dining": return "var(--color-category-food)";
            case "Transport": return "var(--color-category-transport)";
            case "Shopping": return "var(--color-category-shopping)";
            case "Utilities": return "var(--color-category-utilities)";
            case "Health": return "var(--color-category-health)";
            case "Entertainment": return "var(--color-category-entertainment)";
            case "Income": return "var(--color-category-income)";
            default: return "var(--color-category-expense)";
        }
    };

    if (transactions.length === 0) {
        return (
            <div className="py-8 text-center text-gray-400 text-sm">
                No recent transactions to strictly show.
            </div>
        );
    }

    // Group by date
    const grouped: Record<string, ExtTransaction[]> = {};
    transactions.forEach(t => {
        const dateKey = format(t.date, "yyyy-MM-dd");
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(t);
    });

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([dateStr, txs]) => (
                <div key={dateStr}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        {format(new Date(dateStr), "MMM d, yyyy")}
                    </h4>
                    <div className="space-y-3">
                        {txs.map((tx) => {
                            const Icon = getIcon(tx.category);
                            const isIncome = tx.type === "INCOME";
                            const isExpense = tx.type === "EXPENSE";
                            const isInvestment = tx.type === "INVESTMENT";
                            const color = getColor(tx.category);
                            const iconColor = isIncome ? "#10b981" : isExpense ? "#ef4444" : isInvestment ? "#3b82f6" : color;

                            return (
                                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 dynamic-bg-light dynamic-text"
                                            style={{ "--dynamic-color": iconColor } as React.CSSProperties}
                                        >
                                            <Icon size={24} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {tx.description || tx.category}
                                            </p>
                                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                                <span>{tx.wallet.name}</span>
                                                {tx.source !== 'MANUAL' && (
                                                    <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-medium">
                                                        {tx.source}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`font-semibold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' :
                                        isExpense ? 'text-red-500 dark:text-red-400' :
                                            isInvestment ? 'text-blue-500 dark:text-blue-400' :
                                                'text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {isIncome ? '+' : isExpense ? '-' : ''}{formatINR(tx.amount)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
