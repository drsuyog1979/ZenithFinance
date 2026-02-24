"use client";

import { useState, useRef } from "react";
import {
    Upload, FileText, CheckCircle2, AlertCircle, ChevronRight,
    Loader2, RotateCcw, ArrowLeft, Wallet, Tag, Calendar, Hash
} from "lucide-react";
import { parseSpendeeCSV, commitSpendeeImport, rollbackSpendeeImport } from "@/app/actions/import";
import type { SpendeeRow, ParseResult, ImportResult } from "@/app/actions/import";

type Step = "guide" | "upload" | "preview" | "result";

export function SpendeeImporter() {
    const [step, setStep] = useState<Step>("guide");
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [isRollingBack, setIsRollingBack] = useState(false);
    const [rollbackDone, setRollbackDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith(".csv")) {
            setError("Please upload a .csv file exported from Spendee.");
            return;
        }
        setError("");
        setFileName(file.name);
        setIsLoading(true);

        try {
            const text = await file.text();
            const result = await parseSpendeeCSV(text);
            if (result.error) {
                setError(result.error);
                setIsLoading(false);
                return;
            }
            setParseResult(result);
            setStep("preview");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleImport() {
        if (!parseResult?.rows.length) return;
        setIsLoading(true);
        setError("");
        try {
            const result = await commitSpendeeImport(parseResult.rows);
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

    // ── STEP: Guide ──────────────────────────────────────────────────────────
    if (step === "guide") {
        return (
            <div className="max-w-xl mx-auto space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Migrate from Spendee</h2>
                            <p className="text-sm text-gray-500">Follow these steps to export your data</p>
                        </div>
                    </div>

                    <ol className="space-y-4">
                        {[
                            { step: "1", title: "Open Spendee", desc: "Launch the Spendee app on your phone" },
                            { step: "2", title: "Go to Settings", desc: "Tap the ≡ menu → Settings" },
                            { step: "3", title: "Export Data → CSV", desc: "Settings → Backup → Export to CSV" },
                            { step: "4", title: "Save the file", desc: "Email the CSV to yourself or save to cloud storage" },
                            { step: "5", title: "Upload here", desc: "Come back and upload the CSV on the next screen" },
                        ].map(item => (
                            <li key={item.step} className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-[var(--color-brand-navy)] text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {item.step}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                                    <p className="text-sm text-gray-500">{item.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-sm text-blue-700 dark:text-blue-300">
                        <strong>No mapping needed.</strong> Spendee categories are automatically matched to Zenith categories. Your wallets will be created if they don&apos;t exist.
                    </div>
                </div>

                <button
                    onClick={() => setStep("upload")}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] text-white py-4 rounded-2xl font-semibold text-lg transition-colors shadow-md"
                >
                    I have the CSV file
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
                    onClick={() => setStep("guide")}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
                >
                    <ArrowLeft size={16} /> Back to guide
                </button>

                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFile}
                        id="spendee-file-input"
                    />

                    <label
                        htmlFor="spendee-file-input"
                        className={`flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${isLoading
                            ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-[var(--color-brand-navy)] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={48} className="text-blue-500 animate-spin" />
                                <p className="text-blue-600 dark:text-blue-400 font-medium">Parsing your CSV…</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                                    <Upload size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Tap to select Spendee CSV</p>
                                    <p className="text-sm text-gray-500 mt-1">spendee_export.csv</p>
                                </div>
                            </>
                        )}
                    </label>

                    {fileName && !isLoading && (
                        <p className="mt-4 text-center text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ {fileName} selected
                        </p>
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
                        { icon: Wallet, label: "Wallets", value: parseResult.walletNames.length.toString(), color: "purple" },
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

                {/* Wallets to create */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Wallets in this import</h3>
                    <div className="flex flex-wrap gap-2">
                        {parseResult.walletNames.map(w => (
                            <span key={w} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                                {w}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Categories */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Categories detected</h3>
                    <div className="flex flex-wrap gap-2">
                        {parseResult.categories.map(c => (
                            <span key={c} className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                                {c}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Sample rows */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Sample transactions (first 5)</h3>
                    <div className="space-y-3">
                        {parseResult.rows.slice(0, 5).map((row, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{row.category}</span>
                                    <span className="text-xs text-gray-500">{row.note || row.walletName} · {row.date.toLocaleDateString("en-IN")}</span>
                                </div>
                                <span className={`font-semibold ${row.type === "INCOME" ? "text-emerald-600" : "text-red-500"}`}>
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
                        <><Upload size={20} /> Import {parseResult.rows.length} transactions</>
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
                            <p className="text-gray-500 mt-2">All Spendee transactions from this session have been deleted.</p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import Complete!</h2>
                            <p className="text-gray-500 mt-2">Your Spendee data is now in Zenith Finance.</p>

                            <div className="grid grid-cols-3 gap-4 mt-6 text-left">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-bold text-emerald-600">{importResult.imported}</p>
                                    <p className="text-xs text-gray-500 mt-1">Imported</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-bold text-gray-500">{importResult.skipped}</p>
                                    <p className="text-xs text-gray-500 mt-1">Skipped (dupes)</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-bold text-blue-600">{importResult.walletsCreated.length}</p>
                                    <p className="text-xs text-gray-500 mt-1">Wallets created</p>
                                </div>
                            </div>

                            {importResult.walletsCreated.length > 0 && (
                                <div className="mt-4 text-left">
                                    <p className="text-xs text-gray-500 mb-2">New wallets created:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {importResult.walletsCreated.map(w => (
                                            <span key={w} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">{w}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                <div className="flex gap-3">
                    <a
                        href="/dashboard"
                        className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] text-white py-4 rounded-2xl font-semibold transition-colors"
                    >
                        View Dashboard
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
                <p className="text-center text-xs text-gray-400">You can safely import again — duplicates will be skipped automatically.</p>
            </div>
        );
    }

    return null;
}
