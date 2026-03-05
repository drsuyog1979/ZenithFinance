
"use client";

import { useState, useRef } from "react";
import {
    Upload, FileText, CheckCircle2, AlertCircle, ChevronRight,
    Loader2, ArrowLeft, Coins, BarChart3, PieChart, Info, Hash, TrendingUp
} from "lucide-react";
import { parseCapitalGainsXLS, saveCapitalGainsData } from "@/app/actions/capital-gains";

type Step = "upload" | "preview" | "duplicate" | "result";

export function CapitalGainsImporter() {
    const [step, setStep] = useState<Step>("upload");
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [summary, setSummary] = useState<any>(null);
    const [fileData, setFileData] = useState<FormData | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function processFile(file: File) {
        if (!file.name.toLowerCase().endsWith(".xls") && !file.name.toLowerCase().endsWith(".xlsx")) {
            setError("Please upload a valid CAMS XLS/XLSX file.");
            return;
        }

        setError("");
        setFileName(file.name);
        setIsLoading(true);

        const formData = new FormData();
        formData.append("file", file);
        setFileData(formData);

        try {
            const result = await parseCapitalGainsXLS(formData);
            if (!result.success) {
                setError("Failed to parse file. Please ensure it's a valid CAMS Capital Gains statement.");
                setIsLoading(false);
                return;
            }
            setSummary(result.summary);
            setStep("preview");
        } catch (e: any) {
            setError(e.message || "An error occurred while parsing the file.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    }

    async function handleImport(replace: boolean = false) {
        if (!fileData) return;
        setIsLoading(true);
        setError("");
        try {
            // We need a dummy user ID or get it from session. 
            // The action will probably get it from auth() if implemented.
            // For now, let's assume the action handles auth. 
            // In Prisma, we need userId.
            const result = await saveCapitalGainsData(fileData, replace);

            if (result.error === "DUPLICATE_FY") {
                setStep("duplicate");
                setIsLoading(false);
                return;
            }

            if (result.success) {
                setStep("result");
            } else {
                setError(result.message || "Failed to save data.");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }

    if (step === "upload") {
        return (
            <div className="max-w-xl mx-auto space-y-6 landscape:space-y-3">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 landscape:p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-6 landscape:mb-3">
                        <div className="w-12 h-12 landscape:w-9 landscape:h-9 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                            <Coins size={24} className="landscape:w-5 landscape:h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg landscape:text-base font-bold text-gray-900 dark:text-gray-100">CAMS Capital Gains</h2>
                            <p className="text-sm landscape:text-xs text-gray-500">Import MF gains statement</p>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xls,.xlsx"
                        className="hidden"
                        onChange={handleFileChange}
                        id="cg-file-input"
                    />

                    <label
                        htmlFor="cg-file-input"
                        className={`flex flex-col items-center justify-center gap-4 landscape:gap-2 py-16 landscape:py-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${isLoading
                            ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-amber-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={48} className="text-amber-500 animate-spin landscape:w-8 landscape:h-8" />
                                <p className="text-amber-600 dark:text-amber-400 font-medium landscape:text-sm">Parsing statement...</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 landscape:w-10 landscape:h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                                    <FileText size={32} className="landscape:w-6 landscape:h-6" />
                                </div>
                                <div className="text-center px-4">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 landscape:text-sm">Select CAMS XLS File</p>
                                    <p className="text-sm text-gray-500 mt-1 landscape:text-xs">Only .xls and .xlsx supported</p>
                                </div>
                            </>
                        )}
                    </label>

                    {error && (
                        <div className="mt-4 landscape:mt-2 p-4 landscape:p-2 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm landscape:text-xs">
                            <AlertCircle size={18} />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="mt-6 landscape:mt-3 p-4 landscape:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-sm landscape:text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <Info size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <strong>Note:</strong> Consolidated Realised Gains Statement from CAMS Online.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "preview" && summary) {
        return (
            <div className="max-w-xl mx-auto space-y-6">
                <button
                    onClick={() => { setStep("upload"); setSummary(null); setFileName(""); }}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
                >
                    <ArrowLeft size={16} /> Choose different file
                </button>

                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 landscape:p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 landscape:mb-2 landscape:text-lg">Import Preview</h2>

                    <div className="grid grid-cols-2 gap-4 mb-6 landscape:mb-3">
                        <div className="p-4 landscape:p-2 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                            <p className="text-xs landscape:text-[10px] text-gray-500 mb-1">Financial Year</p>
                            <p className="text-lg landscape:text-base font-bold text-[var(--color-brand-navy)] dark:text-white">{summary.financialYear}</p>
                        </div>
                        <div className="p-4 landscape:p-2 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                            <p className="text-xs landscape:text-[10px] text-gray-500 mb-1">Total Funds</p>
                            <p className="text-lg landscape:text-base font-bold text-[var(--color-brand-navy)] dark:text-white">{summary.totalFunds}</p>
                        </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 landscape:mb-2 landscape:text-sm">Sample trades (first 3)</h3>
                    <div className="space-y-4 landscape:space-y-1">
                        {summary.rows.slice(0, 3).map((row: any, i: number) => (
                            <div key={i} className="flex flex-col gap-1 pb-4 landscape:pb-1 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                                <div className="flex justify-between items-start">
                                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm landscape:text-xs">
                                        {row.schemeName.length > 30 ? row.schemeName.substring(0, 30) + "..." : row.schemeName}
                                    </span>
                                    <span className={`text-xs landscape:text-[10px] px-2 py-0.5 rounded-full ${row.type === "STCG" ? "bg-emerald-100 text-emerald-700" : "bg-green-100 text-green-700"}`}>
                                        {row.type}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs landscape:text-[10px] text-gray-500">
                                    <span>Gained: ₹{(row.gain / 100).toLocaleString("en-IN")}</span>
                                    <span>Date: {new Date(row.date).toLocaleDateString("en-IN")}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 landscape:gap-2 mt-6 landscape:mt-3">
                        {[
                            { icon: Hash, label: "TXNs", value: summary.rows.length.toString(), color: "blue" },
                            { icon: TrendingUp, label: "STCG", value: `₹${(summary.shortTermGain / 100).toLocaleString("en-IN")}`, color: "emerald" },
                            { icon: TrendingUp, label: "LTCG", value: `₹${(summary.longTermGain / 100).toLocaleString("en-IN")}`, color: "green" },
                            { icon: Coins, label: "Total Gain", value: `₹${((summary.shortTermGain + summary.longTermGain) / 100).toLocaleString("en-IN")}`, color: "amber" },
                        ].map(card => {
                            const Icon = card.icon;
                            const colorMap: Record<string, string> = {
                                blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
                                emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
                                green: "bg-green-50 dark:bg-green-900/20 text-green-600",
                                amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
                            };
                            return (
                                <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 landscape:p-2 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className={`w-9 h-9 landscape:w-7 landscape:h-7 rounded-xl flex items-center justify-center mb-2 landscape:mb-1 ${colorMap[card.color]}`}>
                                        <Icon size={18} className="landscape:w-4 landscape:h-4" />
                                    </div>
                                    <p className="text-xl landscape:text-lg font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                                    <p className="text-xs landscape:text-[10px] text-gray-500 mt-0.5">{card.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    <button
                        onClick={() => handleImport(false)}
                        disabled={isLoading}
                        className="w-full mt-8 flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] disabled:opacity-60 text-white py-4 landscape:py-3 rounded-2xl font-semibold text-lg landscape:text-base transition-colors shadow-md"
                    >
                        {isLoading ? (
                            <><Loader2 size={20} className="animate-spin" /> Importing…</>
                        ) : (
                            <><Upload size={20} className="landscape:w-5 landscape:h-5" /> Import {summary.rows.length} Trades</>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    if (step === "duplicate") {
        return (
            <div className="max-w-xl mx-auto space-y-6 text-center">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Duplicate Data Found</h2>
                    <p className="text-gray-500 mt-2 mb-8 lowercase">
                        Data for Financial Year <span className="font-bold text-gray-900 dark:text-white">{summary?.financialYear}</span> already exists.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => handleImport(true)}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-semibold transition-colors"
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : "Replace Existing Data"}
                        </button>
                        <button
                            onClick={() => setStep("upload")}
                            className="w-full py-4 rounded-2xl font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancel Import
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "result") {
        return (
            <div className="max-w-xl mx-auto space-y-6 text-center">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Import Successful!</h2>
                    <p className="text-gray-500 mt-2 mb-8">
                        Your capital gains data for FY {summary?.financialYear} has been safely imported.
                    </p>

                    <a
                        href="/analytics"
                        className="w-full flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] text-white py-4 rounded-2xl font-semibold transition-colors shadow-lg"
                    >
                        View in Analytics Dashboard
                        <ChevronRight size={20} />
                    </a>
                </div>
            </div>
        );
    }

    return null;
}
