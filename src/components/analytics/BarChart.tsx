"use client";

import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface BarChartProps {
    data: { month: string; spent: number }[];
}

export function BarChart({ data }: BarChartProps) {
    const formatINR = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
            notation: "compact"
        }).format(value / 100);
    };

    const formatFullINR = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value / 100);
    };

    if (!data || data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-500">No data available</div>;

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-200)" opacity={0.5} />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'var(--color-gray-500)' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'var(--color-gray-500)' }}
                        tickFormatter={(value) => formatINR(value)}
                    />
                    <Tooltip
                        formatter={(value: number) => [formatFullINR(value), 'Spent']}
                        cursor={{ fill: 'var(--color-gray-100)', opacity: 0.5 }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar
                        dataKey="spent"
                        fill="var(--color-category-expense)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                        animationDuration={1500}
                    />
                </ReBarChart>
            </ResponsiveContainer>
        </div>
    );
}
