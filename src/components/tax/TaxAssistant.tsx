"use client";

import { useState, useEffect, useMemo } from "react";
import { getTaxSummary, updateTaxProfile, getITRSummary, resetTaxProfile } from "@/app/actions/tax";
import { TaxRegime, TaxpayerType } from "@prisma/client";
import {
    ShieldAlert, Info, Calculator, Calendar, FileText,
    ArrowRight, CheckCircle2, AlertTriangle, ExternalLink,
    ChevronDown, ChevronUp, Download, Loader2, IndianRupee,
    Briefcase, Activity, Clock
} from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function TaxAssistant() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [showSetup, setShowSetup] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const res = await getTaxSummary();
        if (res.error || !res.data) setError(res.error || "Failed to load summary");
        else {
            setSummary(res.data);
            if (!res.data.profile) setShowSetup(true);
        }
        setLoading(false);
    };

    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset your tax profile? This will clear your settings and advance tax reminders, and take you back to the initial setup.")) return;
        setLoading(true);
        const res = await resetTaxProfile();
        if (res.error) alert(res.error);
        else {
            setShowSetup(true);
            setSummary(null);
            loadData(); // Re-fetch to clear states
        }
        setLoading(false);
    };

    const handleExportITR = async () => {
        const res = await getITRSummary();
        if (res.error || !res.data) return alert("Failed to generate summary: " + (res.error || "No data"));

        const { profile, incomeBySource, totalIncome, capitalGains, fy } = res.data;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(26, 35, 126); // Brand Navy
        doc.text("Zenith Finance", 14, 20);

        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(`ITR Reference Summary — FY ${fy}`, 14, 30);

        doc.setFontSize(8);
        doc.setTextColor(180);
        doc.text("Generated on " + new Date().toLocaleString(), 14, 36);

        // Disclaimer
        doc.setFillColor(255, 248, 225); // Amber light
        doc.rect(14, 42, 182, 12, 'F');
        doc.setFontSize(8);
        doc.setTextColor(121, 85, 72);
        doc.text("DISCLAIMER: For ITR Reference Only — Consult a CA for final filing. This is an estimate based", 18, 48);
        doc.text("on recorded transactions and does not constitute official tax advice.", 18, 51);

        // Profile Section
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Tax Profile", 14, 65);
        autoTable(doc, {
            startY: 68,
            head: [['Field', 'Value']],
            body: [
                ['Tax Regime', profile?.regime || 'Not Set'],
                ['Taxpayer Type', profile?.taxpayerType || 'Individual'],
                ['Primary Source', profile?.incomeSource || 'Not Set'],
                ['TDS Deducted', `Rs. ${profile?.tdsDeducted?.toLocaleString() || 0}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [26, 35, 126] }
        });

        // Income Section
        doc.text("Income by Source", 14, (doc as any).lastAutoTable.finalY + 15);
        const incomeRows: any[] = Object.entries(incomeBySource).map(([cat, amt]) => [cat, `Rs. ${(amt as number / 100).toLocaleString()}`]);
        incomeRows.push([{ content: 'Total Gross Income', styles: { fontStyle: 'bold' } }, { content: `Rs. ${(totalIncome / 100).toLocaleString()}`, styles: { fontStyle: 'bold' } }]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 18,
            head: [['Source/Category', 'Amount (Est.)']],
            body: incomeRows,
            theme: 'grid'
        });

        // Capital Gains Section
        if (capitalGains && capitalGains.length > 0) {
            doc.text("Capital Gains (Realized)", 14, (doc as any).lastAutoTable.finalY + 15);
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 18,
                head: [['Symbol', 'Asset Type', 'Holding Range', 'Gain/Loss']],
                body: capitalGains.map((g: any) => [
                    g.symbol,
                    g.assetType,
                    format(new Date(g.buyDate), "MM/yy") + " - " + format(new Date(g.sellDate), "MM/yy"),
                    `Rs. ${(g.gainAmountPaise / 100).toLocaleString()}`
                ]),
            });
        }

        doc.save(`Zenith_ITR_Summary_FY${fy.replace('-', '_')}.pdf`);
    };

    useEffect(() => {
        loadData();
    }, []);

    const formatINR = (paise: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(paise / 100);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-gray-400 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="font-medium animate-pulse text-gray-500 dark:text-gray-400">Preparing your tax projections...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-sm">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Calculation Error</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">{error}</p>
                <button
                    onClick={loadData}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                    Retry Calculation
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Permanent Disclaimer */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
                <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    <span className="font-black uppercase tracking-wider mr-1">Disclaimer:</span>
                    This is an estimate for planning purposes only and does not constitute professional tax advice. All calculations are indicative. Consult a Chartered Accountant for final filing.
                </p>
            </div>

            {showSetup ? (
                <TaxProfileForm
                    initialData={summary?.profile}
                    onSuccess={() => {
                        setShowSetup(false);
                        loadData();
                    }}
                    onCancel={summary?.profile ? () => setShowSetup(false) : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Main Tax Overview Card */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-gray-400 dark:text-gray-600">
                                <Calculator size={160} />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">FY 2025–26 Projection</h2>
                                    <p className="text-sm text-gray-500 font-medium">Estimated liability based on current income</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => setShowSetup(true)}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                                    >
                                        Edit Profile
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
                                    >
                                        Reset Analysis
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Annual Taxable Income</p>
                                    <p className="text-4xl font-black text-[var(--color-brand-navy)] dark:text-white">
                                        {formatINR(summary.projectedAnnualIncome)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-full transition-all duration-1000"
                                                style={{ width: `${Math.round(Math.min(100, (summary.realizedIncome / summary.projectedAnnualIncome) * 100))}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-indigo-500 whitespace-nowrap">
                                            {Math.round((summary.realizedIncome / summary.projectedAnnualIncome) * 100)}% Realized
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Est. Tax Payable</p>
                                    <p className="text-4xl font-black text-rose-500">
                                        {formatINR(summary.estimatedTax)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2 font-medium">
                                        Net of Rebate u/s 87A ({summary.profile.regime} Regime)
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Regime</p>
                                    <p className="text-sm font-black text-gray-700 dark:text-gray-200">{summary.profile.regime}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">TDS Deducted</p>
                                    <p className="text-sm font-black text-emerald-500">₹{summary.profile.tdsDeducted.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Deductions</p>
                                    <p className="text-sm font-black text-indigo-500">₹{(summary.profile.deductions?.section80C || 0).toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Tax Goal</p>
                                    <p className="text-sm font-black text-rose-500">
                                        {summary.estimatedTax > summary.profile.tdsDeducted * 100 ? 'Payable' : 'Refund'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Advance Tax Section */}
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-xl flex items-center justify-center">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Advance Tax Calendar</h3>
                                    <p className="text-xs text-gray-500">Scheduled installments for your net tax liability</p>
                                </div>
                            </div>

                            {summary.reminders.length === 0 ? (
                                <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">You are not liable for Advance Tax</p>
                                    <p className="text-xs text-gray-500 mt-1">Net tax liability is below ₹10,000.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {summary.reminders.map((rem: any, idx: number) => (
                                        <div key={rem.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl group hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold ${new Date(rem.dueDate) < new Date() ? 'bg-red-50 text-red-500 dark:bg-red-950/30' : 'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30'}`}>
                                                    <span className="text-[10px] uppercase">{format(new Date(rem.dueDate), "MMM")}</span>
                                                    <span className="text-lg">{format(new Date(rem.dueDate), "d")}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{rem.title}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Due by 15th</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-[var(--color-brand-navy)] dark:text-white">{formatINR(rem.amount)}</p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${rem.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {rem.isPaid ? 'Paid' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900/30 mt-4">
                                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-red-700 dark:text-red-400 leading-tight">
                                            Missing these dates may attract penal interest under Section 234B / 234C of the Income Tax Act.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Checklist & Links */}
                    <div className="space-y-6">
                        <div className="bg-[var(--color-brand-navy)] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                                <FileText size={20} />
                                ITR Checklist
                            </h3>
                            <div className="space-y-4 relative z-10">
                                {[
                                    "Form 16 from Employer",
                                    "Form 26AS / AIS / TIS",
                                    "Bank Statements",
                                    "Deduction Proofs (80C/80D)",
                                    "Capital Gains Statements"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-md border-2 border-white/30 flex items-center justify-center shrink-0">
                                            <span className="w-2.5 h-2.5 bg-indigo-400 rounded-sm opacity-20" />
                                        </div>
                                        <span className="text-xs font-medium text-blue-100">{item}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 relative z-10">
                                <button
                                    onClick={handleExportITR}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition-all backdrop-blur-md"
                                >
                                    <Download size={14} />
                                    Export ITR Summary
                                </button>
                                <a
                                    href="https://incometax.gov.in"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-xs font-bold transition-all shadow-lg mt-3"
                                >
                                    Login to IT Portal
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <Info size={16} className="text-indigo-500" />
                                Tax Slabs FY 2025–26
                            </h3>
                            <div className="space-y-2">
                                {[
                                    ["0 – 3L", "NIL"],
                                    ["3 – 7L", "5%"],
                                    ["7 – 10L", "10%"],
                                    ["10 – 12L", "15%"],
                                    ["12 – 15L", "20%"],
                                    ["Above 15L", "30%"]
                                ].map(([slab, rate], i) => (
                                    <div key={i} className="flex justify-between text-[10px] py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                        <span className="font-bold text-gray-500">{slab}</span>
                                        <span className="font-black text-indigo-600 dark:text-indigo-400">{rate}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TaxProfileForm({ initialData, onSuccess, onCancel }: { initialData?: any, onSuccess: () => void, onCancel?: () => void }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        financialYear: initialData?.financialYear || "2025-26",
        regime: initialData?.regime || TaxRegime.NEW,
        taxpayerType: initialData?.taxpayerType || TaxpayerType.INDIVIDUAL,
        incomeSource: initialData?.incomeSource || "Salaried",
        tdsDeducted: initialData?.tdsDeducted || 0,
        deductions: {
            section80C: initialData?.deductions?.section80C || 0,
            section80D: initialData?.deductions?.section80D || 0,
            section80G: initialData?.deductions?.section80G || 0,
            hra: initialData?.deductions?.hra || 0,
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await updateTaxProfile(formData);
        if (!res.error) onSuccess();
        else alert(res.error);
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-xl max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
            <div>
                <h2 className="text-2xl font-bold mb-2">Configure Tax Profile</h2>
                <p className="text-sm text-gray-500 font-medium">Set up your profile to enable personalized tax projection and advance tax reminders.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Tax Regime</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                            {["NEW", "OLD"].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, regime: r as TaxRegime })}
                                    className={`py-3 rounded-xl text-xs font-bold transition-all ${formData.regime === r ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-md' : 'text-gray-400'}`}
                                >
                                    {r} Regime
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Taxpayer Type</label>
                        <select
                            value={formData.taxpayerType}
                            title="Select taxpayer type"
                            onChange={(e) => setFormData({ ...formData, taxpayerType: e.target.value as TaxpayerType })}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="INDIVIDUAL">Individual</option>
                            <option value="SENIOR_CITIZEN">Senior Citizen (60+)</option>
                            <option value="SUPER_SENIOR_CITIZEN">Super Senior (80+)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Primary Income Source</label>
                        <select
                            value={formData.incomeSource}
                            title="Select income source"
                            onChange={(e) => setFormData({ ...formData, incomeSource: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="Salaried">Salaried</option>
                            <option value="Freelance">Freelance</option>
                            <option value="Business">Business</option>
                            <option value="Mixed">Mixed</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">TDS Deducted (Annual Est.)</label>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                            <input
                                type="number"
                                value={formData.tdsDeducted}
                                title="Enter annual TDS deducted"
                                placeholder="0"
                                onChange={(e) => setFormData({ ...formData, tdsDeducted: parseInt(e.target.value) || 0 })}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl pl-10 pr-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                        <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-3">Old Regime Deductions</label>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-gray-500 w-16">80C:</span>
                                <input
                                    type="number"
                                    placeholder="PPF, LIC, ELSS..."
                                    value={formData.deductions.section80C}
                                    onChange={(e) => setFormData({ ...formData, deductions: { ...formData.deductions, section80C: parseInt(e.target.value) || 0 } })}
                                    className="flex-1 bg-white dark:bg-gray-900 border-none rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-gray-500 w-16">80D:</span>
                                <input
                                    type="number"
                                    placeholder="Health Insurance..."
                                    value={formData.deductions.section80D}
                                    onChange={(e) => setFormData({ ...formData, deductions: { ...formData.deductions, section80D: parseInt(e.target.value) || 0 } })}
                                    className="flex-1 bg-white dark:bg-gray-900 border-none rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 hover:shadow-indigo-600/40 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {loading ? <Loader2 size={24} className="animate-spin" /> : 'Save & Calculate Tax'}
                    {!loading && <ArrowRight size={20} />}
                </button>
            </div>
        </form>
    );
}
