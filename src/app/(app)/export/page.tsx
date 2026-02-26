"use client";

import { useState } from "react";
import { Download, Calendar, FileText, Table as TableIcon, ChevronRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { getTransactionsForExport } from "@/app/actions/export";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ExportPreset = "current_fy" | "last_fy" | "q1" | "q2" | "q3" | "q4" | "custom";

export default function ExportPage() {
    const [preset, setPreset] = useState<ExportPreset>("current_fy");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [lastResult, setLastResult] = useState<{ count: number; format: string } | null>(null);

    async function handleExport(format: "csv" | "pdf") {
        setIsExporting(true);
        setLastResult(null);
        try {
            const data = await getTransactionsForExport({
                preset: preset === "custom" ? undefined : preset,
                startDate: preset === "custom" ? startDate : undefined,
                endDate: preset === "custom" ? endDate : undefined
            });

            if (data.length === 0) {
                alert("No transactions found for the selected period.");
                setIsExporting(false);
                return;
            }

            const fileName = `ZenithFinance_Export_${new Date().toISOString().split('T')[0]}`;

            if (format === "csv") {
                downloadCSV(data, fileName);
            } else {
                downloadPDF(data, fileName);
            }

            setLastResult({ count: data.length, format });
        } catch (e: any) {
            alert("Export failed: " + e.message);
        } finally {
            setIsExporting(false);
        }
    }

    function downloadCSV(data: any[], fileName: string) {
        const headers = ["Date", "Category", "Description", "Type", "Amount", "Wallet"];
        const rows = data.map(tx => [
            tx.date.split('T')[0],
            tx.category,
            `"${tx.description.replace(/"/g, '""')}"`,
            tx.type,
            tx.amount.toFixed(2),
            tx.wallet
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName + ".csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadPDF(data: any[], fileName: string) {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(31, 41, 55); // gray-800
        doc.text("Zenith Finance Statement", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128); // gray-400
        doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 30);

        const headers = [["Date", "Category", "Description", "Type", "Amount (INR)", "Wallet"]];
        const rows = data.map(tx => [
            tx.date.split('T')[0],
            tx.category,
            tx.description,
            tx.type,
            tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
            tx.wallet
        ]);

        autoTable(doc, {
            head: headers,
            body: rows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [26, 60, 94], textColor: 255 }, // Brand Navy
            alternateRowStyles: { fillColor: [249, 250, 251] },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                4: { halign: 'right' },
            }
        });

        doc.save(fileName + ".pdf");
    }

    const fyYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                        <Download size={20} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">
                        Export Data
                    </h1>
                </div>
                <p className="text-gray-500 ml-13">Download your transaction history as PDF or CSV.</p>
            </div>

            <div className="space-y-6">
                {/* Range Selection */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Calendar size={14} />
                        Select Period
                    </h2>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {[
                            { id: "current_fy", label: `FY ${fyYear}-${fyYear % 100 + 1}`, subValue: "Current FY" },
                            { id: "last_fy", label: `FY ${fyYear - 1}-${fyYear % 100}`, subValue: "Previous FY" },
                            { id: "q1", label: "Q1", subValue: "Apr - Jun" },
                            { id: "q2", label: "Q2", subValue: "Jul - Sep" },
                            { id: "q3", label: "Q3", subValue: "Oct - Dec" },
                            { id: "q4", label: "Q4", subValue: "Jan - Mar" },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setPreset(item.id as ExportPreset)}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center ${preset === item.id
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                                    : "border-gray-100 dark:border-gray-800 text-gray-500 hover:border-blue-200"}`}
                            >
                                <span className="font-bold">{item.label}</span>
                                <span className="text-[10px] opacity-75">{item.subValue}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => setPreset("custom")}
                            className={`col-span-2 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all mt-2 ${preset === "custom"
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                                : "border-gray-100 dark:border-gray-800 text-gray-500 hover:border-blue-200"}`}
                        >
                            <Calendar size={18} />
                            <span className="font-bold">Custom Date Range</span>
                        </button>
                    </div>

                    {preset === "custom" && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 mb-2">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">START DATE</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    aria-label="Start Date"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">END DATE</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    aria-label="End Date"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Text */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-sm text-blue-700 dark:text-blue-300 flex items-start gap-3">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <p>Exports include all wallets and categories. PDF format is optimized for printing and tax audits.</p>
                </div>

                {/* Success State */}
                {lastResult && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-3 animate-in zoom-in duration-300">
                        <CheckCircle2 size={18} />
                        <p>Success! exported <strong>{lastResult.count}</strong> transactions to <strong>{lastResult.format.toUpperCase()}</strong>.</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-2">
                    <button
                        onClick={() => handleExport("pdf")}
                        disabled={isExporting}
                        className="w-full flex items-center justify-center gap-3 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-95"
                    >
                        {isExporting ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
                        Export to PDF
                    </button>
                    <button
                        onClick={() => handleExport("csv")}
                        disabled={isExporting}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-4 rounded-2xl font-bold text-lg transition-all border border-gray-200 dark:border-gray-800 shadow-sm active:scale-95"
                    >
                        {isExporting ? <Loader2 size={24} className="animate-spin" /> : <TableIcon size={24} />}
                        Export to CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
