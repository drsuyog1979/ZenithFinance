"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import { parseAssetStatement } from "@/app/actions/asset-parse";
import { processAssetImports } from "@/app/actions/assets";

export function CapitalGainsImporter({ onComplete }: { onComplete: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [source, setSource] = useState("cams");
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    async function processFile(file: File) {
        setIsLoading(true);
        setStatus(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("source", source);

        try {
            const parseRes = await parseAssetStatement(formData);
            if (parseRes.error) {
                setStatus({ type: 'error', msg: parseRes.error });
                setIsLoading(false);
                return;
            }

            const importRes = await processAssetImports(parseRes.transactions);
            setStatus({
                type: 'success',
                msg: `Import complete! Created ${importRes.createdLots} lots and ${importRes.createdSales} sales. ${importRes.errors} errors.`
            });
            onComplete();
        } catch (e: any) {
            setStatus({ type: 'error', msg: e.message });
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

    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                    <Upload size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Import Statements</h2>
                    <p className="text-xs text-gray-500">Mutual Funds & Stocks (PDF/CSV/Excel)</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Select Source</label>
                    <select
                        aria-label="Selection of statement source"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    >
                        <option value="cams">CAMS / INDmoney (PDF/CSV/Excel)</option>
                        <option value="zerodha">Zerodha (PDF/CSV/Excel)</option>
                        <option value="groww">Groww (CSV/Excel)</option>
                        <option value="upstox">Upstox (CSV/Excel)</option>
                    </select>
                </div>

                <div className="relative group">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        disabled={isLoading}
                        className="hidden"
                        id="asset-upload"
                        accept=".pdf,.csv,.xls,.xlsx,.xlsb,.xlsm,.xlv"
                    />
                    <label
                        htmlFor="asset-upload"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${isLoading ? 'opacity-50 pointer-events-none' : isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40' : 'hover:border-indigo-500 border-gray-200 dark:border-gray-800'}`}
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                        ) : (
                            <>
                                <FileText className="text-gray-400 group-hover:text-indigo-500 transition-colors" size={32} />
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Click to upload statement</p>
                                    <p className="text-xs text-gray-400 mt-1">PDF, CSV or Excel supported</p>
                                </div>
                            </>
                        )}
                    </label>
                </div>

                {status && (
                    <div className={`p-4 rounded-2xl flex items-start gap-3 animate-in fade-in duration-300 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {status.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                        <p className="text-xs font-medium">{status.msg}</p>
                    </div>
                )}

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-start gap-3">
                    <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                        Zenith uses **FIFO (First-In-First-Out)** logic to match sales with purchases. For accurate capital gains, please import all your historical transactions from oldest to newest if possible.
                    </p>
                </div>
            </div>
        </div>
    );
}
