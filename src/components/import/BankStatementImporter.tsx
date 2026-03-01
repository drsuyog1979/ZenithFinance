"use client";

import { useState, useRef } from "react";
import {
    Upload, FileText, CheckCircle2, AlertCircle, ChevronRight,
    Loader2, RotateCcw, ArrowLeft, Wallet, Tag, Calendar, Hash, FileCheck
} from "lucide-react";
import { parseBankStatementPDF } from "@/app/actions/pdf-import";
import { parseBankStatementCSV, parseBankStatementExcel } from "@/app/actions/bank-csv-import";
import { commitSpendeeImport, rollbackSpendeeImport, checkDuplicates } from "@/app/actions/import";
import type { ParseResult, ImportResult } from "@/app/actions/import";
import { ImportSource } from "@prisma/client";

type Step = "setup" | "upload" | "preview" | "result";
type BankType = "axis" | "bob";

export function BankStatementImporter() {
    const [step, setStep] = useState<Step>("setup");
    const [bank, setBank] = useState<BankType>("axis");
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [isRollingBack, setIsRollingBack] = useState(false);
    const [rollbackDone, setRollbackDone] = useState(false);
    const [potentialDuplicates, setPotentialDuplicates] = useState(0);
    const [fileFormat, setFileFormat] = useState<"pdf" | "csv">("pdf");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function processFile(file: File) {
        const isPdf = file.name.toLowerCase().endsWith(".pdf");
        const isCsv = file.name.toLowerCase().endsWith(".csv");
        const isExcel = [".xls", ".xlsx", ".xlsm", ".xlsb"].some(ext => file.name.toLowerCase().endsWith(ext));

        if (!isPdf && !isCsv && !isExcel) {
            setError("Please upload a .pdf, .csv, or Excel bank statement.");
            return;
        }

        setError("");
        setFileName(file.name);
        setIsLoading(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("bank", bank);

        try {
            const result = isPdf
                ? await parseBankStatementPDF(formData)
                : isExcel
                    ? await parseBankStatementExcel(formData)
                    : await parseBankStatementCSV(formData);
            if (result.error) {
                setError(result.error);
                setIsLoading(false);
                return;
            }
            if (result.rows.length === 0) {
                setError("No transactions found in this file. Please ensure it is an unlocked statement.");
                setIsLoading(false);
                return;
            }
            // Normalize dates
            const normalizedRows = result.rows.map(r => ({
                ...r,
                date: new Date(r.date)
            }));
            const normalizedResult = { ...result, rows: normalizedRows };

            setParseResult(normalizedResult);
            const matches = await checkDuplicates(result.rows);
            setPotentialDuplicates(matches);
            setStep("preview");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }

    async function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) await processFile(file);
    }

    async function handleImport() {
        if (!parseResult?.rows.length) return;
        setIsLoading(true);
        setError("");
        try {
            const source = bank === "axis" ? ImportSource.AXIS : ImportSource.BOB;
            const result = await commitSpendeeImport(parseResult.rows, source);
            setImportResult(result);
            if (result.error) {
                setError(result.error);
            } else {
                setStep("result");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleRollback() {
        if (!importResult?.importSessionId) return;
        setIsRollingBack(true);
        const res = await rollbackSpendeeImport(importResult.importSessionId);
        setIsRollingBack(false);
        if (res.error) {
            setError(res.error);
        } else {
            setRollbackDone(true);
        }
    }

    // ── STEP: Setup ──────────────────────────────────────────────────────────
    if (step === "setup") {
        return (
            <div className="max-w-xl mx-auto space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Import Bank Statement</h2>
                            <p className="text-sm text-gray-500">Auto-parse your PDF or CSV transactions</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Select your bank to ensure the PDF is parsed correctly into the corresponding wallet.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setBank("axis")}
                                className={`flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 transition-all ${bank === "axis" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-indigo-200"}`}
                            >
                                <Wallet size={32} />
                                <span className="font-semibold">Axis Bank</span>
                                <span className="text-xs opacity-75">("axissavings" wallet)</span>
                            </button>

                            <button
                                onClick={() => setBank("bob")}
                                className={`flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 transition-all ${bank === "bob" ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-orange-200"}`}
                            >
                                <Wallet size={32} />
                                <span className="font-semibold">Bank of Baroda</span>
                                <span className="text-xs opacity-75">("bob" wallet)</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <strong>Format Support:</strong> We support standard <strong>PDF</strong>, <strong>CSV</strong>, and <strong>Excel (.xls, .xlsx)</strong> exports for Axis and BoB. Ensure files are not password-protected.
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setStep("upload")}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] text-white py-4 rounded-2xl font-semibold text-lg transition-colors shadow-md"
                >
                    Continue
                    <ChevronRight size={20} />
                </button>
            </div>
        );
    }

    // ── STEP: Upload ─────────────────────────────────────────────────────────
    if (step === "upload") {
        return (
            <div className="max-w-xl mx-auto space-y-6">
                <button
                    onClick={() => setStep("setup")}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
                >
                    <ArrowLeft size={16} /> Back to bank selection
                </button>

                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.csv,.xls,.xlsx,.xlsb,.xlsm"
                        className="hidden"
                        onChange={handleFileChange}
                        id="bank-file-input"
                    />

                    <label
                        htmlFor="bank-file-input"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${isLoading
                            ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                            : isDragging
                                ? "border-indigo-500 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-900/40"
                                : "border-gray-200 dark:border-gray-700 hover:border-[var(--color-brand-navy)] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={48} className="text-blue-500 animate-spin" />
                                <p className="text-blue-600 dark:text-blue-400 font-medium">Extracting transactions…</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                                    <FileCheck size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Tap to select {bank === "axis" ? "Axis Bank" : "Bank of Baroda"} Statement</p>
                                    <p className="text-sm text-gray-500 mt-1">PDF, CSV or Excel format supported</p>
                                </div>
                            </>
                        )}
                    </label>

                    {fileName && !isLoading && (
                        <p className="mt-4 text-center text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ {fileName} selected
                        </p>
                    )}

                    {potentialDuplicates > 0 && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-start gap-3 text-orange-700 dark:text-orange-400 text-sm border border-orange-100 dark:border-orange-900/40">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">Potential duplicates detected</p>
                                <p className="mt-0.5">
                                    {potentialDuplicates} transaction{potentialDuplicates > 1 ? 's' : ''} already match existing entries on the same date with the same amount. They will be automatically skipped to avoid double-counting.
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── STEP: Preview ────────────────────────────────────────────────────────
    if (step === "preview" && parseResult) {
        return (
            <div className="max-w-xl mx-auto space-y-6">
                <button
                    onClick={() => { setStep("upload"); setParseResult(null); setFileName(""); }}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
                >
                    <ArrowLeft size={16} /> Choose different file
                </button>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { icon: Hash, label: "Transactions", value: parseResult.rows.length.toString(), color: "blue" },
                        { icon: Wallet, label: "Target Wallet", value: parseResult.walletNames[0], color: "purple" },
                        { icon: Tag, label: "Categories", value: parseResult.categories.length.toString(), color: "orange" },
                        {
                            icon: Calendar, label: "Date Range", color: "green",
                            value: parseResult.dateRange ? `${parseResult.dateRange.from}` : "–",
                            sub: parseResult.dateRange?.to
                        },
                    ].map(card => {
                        const Icon = card.icon;
                        const colorMap: Record<string, string> = {
                            blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
                            purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600",
                            orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600",
                            green: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
                        };
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colorMap[card.color]}`}>
                                    <Icon size={18} />
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                                {card.sub && <p className="text-xs text-gray-500">to {card.sub}</p>}
                                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Sample rows */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Sample transactions (first 5)</h3>
                    <div className="space-y-3">
                        {parseResult.rows.slice(0, 5).map((row, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{row.category}</span>
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]" title={row.note}>{row.note}</span>
                                    <span className="text-[10px] text-gray-400">{row.date.toLocaleDateString("en-IN")}</span>
                                </div>
                                <span className={`font-semibold shrink-0 ${row.type === "INCOME" ? "text-emerald-600" : "text-red-500"}`}>
                                    {row.type === "INCOME" ? "+" : "-"}₹{(row.amount / 100).toLocaleString("en-IN")}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                <button
                    onClick={handleImport}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] disabled:opacity-60 text-white py-4 rounded-2xl font-semibold text-lg transition-colors shadow-md"
                >
                    {isLoading ? (
                        <><Loader2 size={20} className="animate-spin" /> Importing…</>
                    ) : (
                        <><Upload size={20} /> Import to {parseResult.walletNames[0]}</>
                    )}
                </button>
                <p className="text-center text-xs text-gray-400">Duplicates are automatically skipped. You can undo this import after it completes.</p>
            </div>
        );
    }

    // ── STEP: Result ─────────────────────────────────────────────────────────
    if (step === "result" && importResult) {
        return (
            <div className="max-w-xl mx-auto space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                    {rollbackDone ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center mx-auto mb-4">
                                <RotateCcw size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import Undone</h2>
                            <p className="text-gray-500 mt-2">All transactions from this session have been deleted.</p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import Complete!</h2>
                            <p className="text-gray-500 mt-2">Your bank statement data is now in Zenith Finance.</p>

                            <div className="grid grid-cols-2 gap-4 mt-6 text-left">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-bold text-emerald-600">{importResult.imported}</p>
                                    <p className="text-xs text-gray-500 mt-1">Imported</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-bold text-gray-500">{importResult.skipped}</p>
                                    <p className="text-xs text-gray-500 mt-1">Skipped (dupes)</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-3">
                    <a
                        href={`/transactions?wallet=${parseResult?.walletNames[0] || 'ALL'}`}
                        className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] text-white py-4 rounded-2xl font-semibold transition-colors"
                    >
                        View in Wallet
                    </a>
                    {!rollbackDone && (
                        <button
                            onClick={handleRollback}
                            disabled={isRollingBack}
                            className="flex items-center gap-2 px-5 py-4 rounded-2xl font-medium text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                            {isRollingBack ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                            Undo
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
