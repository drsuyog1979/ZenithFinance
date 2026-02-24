"use client";

import { LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface LineChartProps {
    data: { date: string; income: number; expense: number }[];
}

export function TrendLineChart({ data }: LineChartProps) {
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
                <ReLineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-200)" opacity={0.5} />
                    <XAxis
                        dataKey="date"
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
                        formatter={(value: any, name?: string) => [formatFullINR(Number(value)), name === 'income' ? 'Income' : 'Expense']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line
                        type="monotone"
                        dataKey="income"
                        stroke="var(--color-category-income)"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                        animationDuration={1500}
                    />
                    <Line
                        type="monotone"
                        dataKey="expense"
                        stroke="var(--color-category-expense)"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                        animationDuration={1500}
                    />
                </ReLineChart>
            </ResponsiveContainer>
        </div>
    );
}
