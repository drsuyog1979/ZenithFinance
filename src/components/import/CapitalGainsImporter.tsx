
"use client";

import { useState, useRef } from "react";
import {
    Upload, FileText, CheckCircle2, AlertCircle, ChevronRight,
    Loader2, ArrowLeft, Coins, BarChart3, PieChart, Info
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
            <div className="max-w-xl mx-auto space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                            <Coins size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">CAMS Capital Gains Import</h2>
                            <p className="text-sm text-gray-500">Import your Mutual Fund capital gains statement</p>
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
                        className={`flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${isLoading
                            ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-amber-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={48} className="text-amber-500 animate-spin" />
                                <p className="text-amber-600 dark:text-amber-400 font-medium">Parsing statement...</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                                    <FileText size={32} />
                                </div>
                                <div className="text-center px-4">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Select CAMS XLS File</p>
                                    <p className="text-sm text-gray-500 mt-1">Only .xls and .xlsx files are supported</p>
                                </div>
                            </>
                        )}
                    </label>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <Info size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <strong>Note:</strong> Download the "Consolidated Realised Gains Statement" from CAMS Online in Excel format for the required Financial Year.
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

                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Import Preview</h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                            <p className="text-xs text-gray-500 mb-1">Financial Year</p>
                            <p className="text-lg font-bold text-[var(--color-brand-navy)] dark:text-white">{summary.financialYear}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                            <p className="text-xs text-gray-500 mb-1">Total Funds</p>
                            <p className="text-lg font-bold text-[var(--color-brand-navy)] dark:text-white">{summary.totalFunds}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Short Term Gain/Loss</p>
                                    <p className="text-xs text-gray-500">Aggregate STCG</p>
                                </div>
                            </div>
                            <span className={`font-bold ${summary.shortTermGain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                ₹{summary.shortTermGain.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                                    <PieChart size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Long Term Gain/Loss</p>
                                    <p className="text-xs text-gray-500">Aggregate LTCG</p>
                                </div>
                            </div>
                            <span className={`font-bold ${summary.longTermGain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                ₹{summary.longTermGain.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-sm">
                                <span className="block font-bold mb-1">{summary.equityCount}</span>
                                Equity TXNs
                            </div>
                            <div className="text-center p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-sm">
                                <span className="block font-bold mb-1">{summary.debtCount}</span>
                                Debt TXNs
                            </div>
                        </div>
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
                        className="w-full mt-8 flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] disabled:opacity-60 text-white py-4 rounded-2xl font-semibold text-lg transition-colors shadow-md"
                    >
                        {isLoading ? (
                            <><Loader2 size={20} className="animate-spin" /> Importing…</>
                        ) : (
                            <><CheckCircle2 size={20} /> Confirm & Save Data</>
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
