"use client";

import { useState } from "react";
import { SpendeeImporter } from "@/components/import/SpendeeImporter";
import { BankStatementImporter } from "@/components/import/BankStatementImporter";
import { CapitalGainsImporter } from "@/components/import/CapitalGainsImporter";
import { Upload, FileText, ArrowRightLeft, Coins } from "lucide-react";

export default function ImportPage() {
    const [importType, setImportType] = useState<"csv" | "pdf" | "cg">("pdf");

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                        <Upload size={20} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">
                        Import Data
                    </h1>
                </div>
                <p className="text-gray-500 ml-13 font-medium">Migrate your financial history into Zenith Finance.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-1.5 rounded-2xl flex gap-1 mb-8 shadow-sm border border-gray-100 dark:border-gray-800">
                <button
                    onClick={() => setImportType("pdf")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${importType === "pdf"
                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                >
                    <FileText size={18} className="hidden sm:block" />
                    Bank Statements
                </button>
                <button
                    onClick={() => setImportType("csv")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${importType === "csv"
                        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                >
                    <ArrowRightLeft size={18} className="hidden sm:block" />
                    Expenses
                </button>
                <button
                    onClick={() => setImportType("cg")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${importType === "cg"
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                >
                    <Coins size={18} className="hidden sm:block" />
                    Capital Gains
                </button>
            </div>

            {importType === "csv" ? <SpendeeImporter /> : importType === "pdf" ? <BankStatementImporter /> : <CapitalGainsImporter />}
        </div>
    );
}
