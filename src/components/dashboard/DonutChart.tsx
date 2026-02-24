"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type CategoryData = {
    name: string;
    value: number;
    color: string;
};

interface DonutChartProps {
    data: CategoryData[];
}

const formatINR = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value / 100);

// ── Spending (Expense) Donut ─────────────────────────────────────────────────
export function SpendDonutChart({ data }: DonutChartProps) {
    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No expense data for this month.
            </div>
        );
    }

    return (
        <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="78%"
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={1200}
                        animationEasing="ease-out"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-spend-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: any) => formatINR(Number(value))}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

// ── Income Donut ─────────────────────────────────────────────────────────────
// Income sources are shown in green shades
const INCOME_COLORS = [
    "#10b981", // emerald-500
    "#34d399", // emerald-400
    "#6ee7b7", // emerald-300
    "#059669", // emerald-600
    "#047857", // emerald-700
    "#a7f3d0", // emerald-200
    "#065f46", // emerald-800
    "#d1fae5", // emerald-100
];

export function IncomeDonutChart({ data }: DonutChartProps) {
    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No income data for this month.
            </div>
        );
    }

    // Override with green palette
    const colored = data.map((d, i) => ({ ...d, color: INCOME_COLORS[i % INCOME_COLORS.length] }));

    return (
        <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={colored}
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="78%"
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={1200}
                        animationEasing="ease-out"
                        stroke="none"
                    >
                        {colored.map((entry, index) => (
                            <Cell key={`cell-income-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: any) => formatINR(Number(value))}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
