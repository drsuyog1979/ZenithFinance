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
    Briefcase,
    TrendingUp,
    Fuel,
    Phone,
    Smartphone,
    Stethoscope,
    Building2,
    Flame,
    Banknote,
    Tag
} from "lucide-react";

// Deterministic color for unknown categories
function hashColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}

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
            case "Food & Dining": case "Food & Drink": case "Food & Drinks": return Utensils;
            case "Transport": case "Petrol": return Car;
            case "Health": return HeartPulse;
            case "Housing": return Home;
            case "Utilities": case "Electricity Bill": case "MNGL": return Zap;
            case "Landline": case "VI": return Phone;
            case "Entertainment": case "App Purchase": case "App Purchase ": return Tv;
            case "Shopping": return ShoppingBag;
            case "Income": case "Clinic": case "Baramati": case "Apollo": case "Inamdar":
            case "Sahyadri Deccan": case "Sahyadri Bibwewadi": return Briefcase;
            case "Mutual Funds": case "Investment": return TrendingUp;
            case "Salary": return Banknote;
            default: return Tag;
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
            case "Food & Dining": case "Food & Drink": case "Food & Drinks": return Utensils;
            case "Transport": case "Petrol": return Car;
            case "Health": return HeartPulse;
            case "Housing": return Home;
            case "Utilities": case "Electricity Bill": case "MNGL": return Zap;
            case "Landline": case "VI": return Phone;
            case "Entertainment": case "App Purchase": case "App Purchase ": return Tv;
            case "Shopping": return ShoppingBag;
            case "Income": case "Clinic": case "Baramati": case "Apollo": case "Inamdar":
            case "Sahyadri Deccan": case "Sahyadri Bibwewadi": return Briefcase;
            case "Mutual Funds": case "Investment": return TrendingUp;
            case "Salary": return Banknote;
            default: return Tag;
        }
    };

    const getColor = (category: string) => {
        const map: Record<string, string> = {
            "Food & Dining": "#f97316", "Food & Drink": "#f97316", "Food & Drinks": "#f97316",
            "Transport": "#3b82f6", "Petrol": "#3b82f6",
            "Shopping": "#ec4899",
            "Utilities": "#eab308", "Electricity Bill": "#eab308", "MNGL": "#f59e0b",
            "Health": "#10b981",
            "Entertainment": "#8b5cf6", "App Purchase": "#8b5cf6", "App Purchase ": "#8b5cf6",
            "Income": "#22c55e",
            "Clinic": "#10b981", "Baramati": "#14b8a6", "Apollo": "#06b6d4",
            "Inamdar": "#0891b2", "Sahyadri Deccan": "#2dd4bf", "Sahyadri Bibwewadi": "#34d399",
            "Mutual Funds": "#0ea5e9", "Investment": "#0ea5e9",
            "Salary": "#ef4444", "Landline": "#d97706", "VI": "#a855f7",
        };
        return map[category] || hashColor(category);
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
        const dateKey = format(new Date(t.date), "yyyy-MM-dd");
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
