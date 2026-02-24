"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";

interface MonthSelectorProps {
    currentDate: Date;
    onChange: (date: Date) => void;
}

export function MonthSelector({ currentDate, onChange }: MonthSelectorProps) {
    return (
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 mb-6 w-full max-w-sm">
            <button
                onClick={() => onChange(subMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Previous month"
            >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>

            <span className="font-semibold text-[var(--color-brand-navy)] dark:text-white">
                {format(currentDate, "MMMM yyyy")}
            </span>

            <button
                onClick={() => onChange(addMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Next month"
            >
                <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
        </div>
    );
}
