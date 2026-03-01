
import { getFinancialYears, getCapitalGainsSummary } from "@/app/actions/capital-gains";
import { CapitalGainsDashboard } from "./CapitalGainsDashboard";
import { Coins, Plus } from "lucide-react";

export default async function CapitalGainsPage({
    searchParams
}: {
    searchParams: Promise<{ fy?: string }>
}) {
    const { fy } = await searchParams;
    const allYears = await getFinancialYears();

    if (allYears.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-amber-400 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative w-24 h-24 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center text-amber-500 shadow-sm transition-transform duration-500 group-hover:scale-105">
                        <Coins size={48} />
                    </div>
                </div>

                <div className="text-center max-w-sm">
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white mb-3">
                        Track your Realized Gains
                    </h2>
                    <p className="text-gray-500 font-medium">
                        Import your CAMS statements to view quarterly capital gains breakdown matching ITR schedules.
                    </p>
                </div>

                <a
                    href="/import"
                    className="flex items-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md"
                >
                    <Plus size={20} className="stroke-[3px]" />
                    Import Your First Statement
                </a>

                <p className="text-xs text-gray-400 max-w-[250px] text-center leading-relaxed">
                    Supports CAMS "Realised Gains Statement" in XLS/XLSX format only.
                </p>
            </div>
        );
    }

    const initialYear = fy || allYears[0];
    const data = await getCapitalGainsSummary(initialYear);

    return (
        <CapitalGainsDashboard
            initialYear={initialYear}
            allYears={allYears}
            data={data}
        />
    );
}
