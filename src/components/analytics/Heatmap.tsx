"use client";

import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { useMemo } from "react";

interface HeatmapProps {
    currentDate: Date;
    data: { date: Date; amount: number }[];
}

export function SpendingHeatmap({ currentDate, data }: HeatmapProps) {
    // Generate array of all days in the month
    const daysInMonth = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    // Find max spending in a single day to calculate intensity
    const maxSpend = useMemo(() => {
        let max = 0;
        const dailyTotals: Record<string, number> = {};

        data.forEach(tx => {
            const d = format(tx.date, 'yyyy-MM-dd');
            dailyTotals[d] = (dailyTotals[d] || 0) + tx.amount;
            if (dailyTotals[d] > max) max = dailyTotals[d];
        });

        return max || 1; // Prevent division by zero
    }, [data]);

    // Aggregate spending per day
    const getIntensityClass = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayTotal = data
            .filter(tx => format(tx.date, 'yyyy-MM-dd') === dayStr)
            .reduce((sum, tx) => sum + tx.amount, 0);

        if (dayTotal === 0) return "bg-gray-100 dark:bg-gray-800";

        const intensity = dayTotal / maxSpend;

        if (intensity < 0.25) return "bg-blue-200 dark:bg-blue-900/40";
        if (intensity < 0.5) return "bg-blue-400 dark:bg-blue-800/60";
        if (intensity < 0.75) return "bg-blue-600 dark:bg-blue-600/80";
        return "bg-[var(--color-brand-navy)] dark:bg-blue-500 shadow-[0_0_10px_rgba(26,60,94,0.4)]";
    };

    const getAmountStr = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayTotal = data
            .filter(tx => format(tx.date, 'yyyy-MM-dd') === dayStr)
            .reduce((sum, tx) => sum + tx.amount, 0);

        if (dayTotal === 0) return "No spending";

        return "₹" + (dayTotal / 100).toLocaleString('en-IN');
    };

    return (
        <div className="w-full">
            <div className="flex gap-2 mb-2 text-xs text-gray-400 uppercase tracking-wider pl-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="flex-1 text-center font-semibold">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for padding start of month */}
                {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square opacity-0" />
                ))}

                {daysInMonth.map((day) => (
                    <div key={day.toString()} className="group relative">
                        <div
                            className={`aspect-square rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-110 cursor-pointer ${getIntensityClass(day)}`}
                        />

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[120px] bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                            <div className="font-semibold">{format(day, 'MMM d, yyyy')}</div>
                            <div>{getAmountStr(day)}</div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500 font-medium">
                <span>Less</span>
                <div className="w-16 h-3 flex overflow-hidden rounded-full">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800" />
                    <div className="flex-1 bg-blue-200 dark:bg-blue-900/40" />
                    <div className="flex-1 bg-blue-400 dark:bg-blue-800/60" />
                    <div className="flex-1 bg-blue-600 dark:bg-blue-600/80" />
                    <div className="flex-1 bg-[var(--color-brand-navy)] dark:bg-blue-500" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
}
