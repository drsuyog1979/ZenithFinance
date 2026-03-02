"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import * as XLSX from "xlsx";

async function getUserId() {
    // Temp bypass for local script
    if (process.env.TEST_SAVE) {
        return "temp-test-id";
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    return user.id;
}

export async function parseCapitalGainsXLS(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetNames = workbook.SheetNames;

    // Required sheets (only TRXN_DETAILS is strictly required for parsing transactions)
    const requiredSheets = [
        "TRXN_DETAILS"
    ];

    for (const sheet of requiredSheets) {
        if (!sheetNames.includes(sheet)) {
            throw new Error(`Missing required sheet: ${sheet}. Please ensure you've uploaded a valid CAMS Capital Gains Statement.`);
        }
    }

    const trxnSheet = workbook.Sheets["TRXN_DETAILS"];

    // Find Header Row dynamically
    const rawData = XLSX.utils.sheet_to_json(trxnSheet, { header: 1 }) as any[][];
    let headerRowIndex = 0;
    for (let i = 0; i < 20 && i < rawData.length; i++) {
        if (rawData[i] && rawData[i].includes("Scheme Name") && rawData[i].includes("AMC Name")) {
            headerRowIndex = i;
            break;
        }
    }

    const trxnData = XLSX.utils.sheet_to_json(trxnSheet, { range: headerRowIndex }) as any[];

    // Detect Financial Year from first transaction date if not provided in filename
    // Date format: DD-Mon-YYYY (e.g., "01-Jul-2025")
    const parseDate = (dateStr: any) => {
        if (!dateStr) return null;
        // xlsx might parse it as a date object if it's actual Excel date
        if (dateStr instanceof Date) return dateStr;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    };

    // Use "Date" (Sell Date) instead of "Date_1" (Purchase Date) for FY detection
    const firstDate = parseDate(trxnData[0]?.Date);
    let detectedFY = "";
    if (firstDate) {
        const year = firstDate.getFullYear();
        const month = firstDate.getMonth(); // 0-indexed
        if (month >= 3) { // April onwards
            detectedFY = `${year}-${(year + 1).toString().slice(-2)}`;
        } else {
            detectedFY = `${year - 1}-${year.toString().slice(-2)}`;
        }
    }

    // Summary Preview Data
    const summary = {
        totalFunds: new Set(trxnData.map(t => t["Scheme Name"])).size,
        shortTermGain: trxnData.reduce((acc, t) => acc + (parseFloat(t["Short Term"]) || 0), 0),
        longTermGain: trxnData.reduce((acc, t) => acc + (parseFloat(t["Long Term Without Index"]) || 0), 0),
        equityCount: trxnData.filter(t => t["ASSET CLASS"] === "EQUITY").length,
        debtCount: trxnData.filter(t => t["ASSET CLASS"] === "DEBT").length,
        financialYear: detectedFY,
        transactionCount: trxnData.length
    };

    return {
        success: true,
        summary,
        // We don't return all raw data to client to keep it small, 
        // but for preview we might need some.
        // For now just return summary.
    };
}

export async function saveCapitalGainsData(formData: FormData, replaceExisting: boolean = false) {
    const userId = await getUserId();
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const trxnSheet = workbook.Sheets["TRXN_DETAILS"];

    // Find Header Row dynamically
    const rawData = XLSX.utils.sheet_to_json(trxnSheet, { header: 1 }) as any[][];
    let headerRowIndex = 0;
    for (let i = 0; i < 20 && i < rawData.length; i++) {
        if (rawData[i] && rawData[i].includes("Scheme Name") && rawData[i].includes("AMC Name")) {
            headerRowIndex = i;
            break;
        }
    }

    const trxnData = XLSX.utils.sheet_to_json(trxnSheet, { range: headerRowIndex }) as any[];

    // Detect FY
    const parseDate = (dateStr: string | Date | undefined) => {
        if (!dateStr) return null;
        if (dateStr instanceof Date) return dateStr;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    };

    const firstDate = parseDate(trxnData[0]?.Date);
    let financialYear = "";
    if (firstDate) {
        const year = firstDate.getFullYear();
        const month = firstDate.getMonth();
        if (month >= 3) {
            financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
        } else {
            financialYear = `${year - 1}-${year.toString().slice(-2)}`;
        }
    }

    try {
        if (replaceExisting) {
            await prisma.capitalGainsTransaction.deleteMany({
                where: { userId, financialYear }
            });
            await prisma.capitalGainsSummary.deleteMany({
                where: { userId, financialYear }
            });
        } else {
            // Check if data already exists for this FY
            const existing = await prisma.capitalGainsTransaction.findFirst({
                where: { userId, financialYear }
            });
            if (existing) {
                return { success: false, error: "DUPLICATE_FY", financialYear };
            }
        }

        // Save Transactions
        const transactions = trxnData.map(t => ({
            userId,
            amcName: String(t["AMC Name"] || ""),
            folioNo: String(t["Folio No"] || ""),
            schemeName: String(t["Scheme Name"] || ""),
            isin: t["ISIN"] || null, // Might not be in primary columns but sometimes present
            assetClass: String(t["ASSET CLASS"] || ""),
            transactionType: String(t["Desc"] || ""), // Desc is the Sell action (e.g. Redemption)
            transactionDate: parseDate(t["Date"]) || new Date(), // Date is the Sell date
            amount: parseFloat(t["Amount"]) || 0,
            unitsPurchased: parseFloat(t["PurhUnit"]) || 0,
            unitsRedeemed: parseFloat(t["RedUnits"]) || 0,
            unitCost: parseFloat(t["Unit Cost"]) || 0,
            indexedCost: parseFloat(t["Indexed Cost"]) || null,
            grandfatheredUnits: parseFloat(t["Units As On 31/01/2018 (Grandfathered Units)"]) || null,
            grandfatheredNav: parseFloat(t["NAV As On 31/01/2018 (Grandfathered NAV)"]) || null,
            grandfatheredValue: parseFloat(t["Market Value As On 31/01/2018 (Grandfathered Value)"]) || null,
            shortTermGain: parseFloat(t["Short Term"]) || null,
            longTermGainWithIndex: parseFloat(t["Long Term With Index"]) || null,
            longTermGainWithoutIndex: parseFloat(t["Long Term Without Index"]) || null,
            taxPercentage: parseFloat(t["Tax Perc"]) || null,
            taxDeductible: parseFloat(t["Tax Deduct"]) || null,
            taxSurcharge: parseFloat(t["Tax Surcharge"]) || null,
            financialYear,
        }));

        await prisma.capitalGainsTransaction.createMany({
            data: transactions
        });

        // Save Summaries from Sheet 4 and 5 (OVERALL_SUMMARY_EQUITY, OVERALL_SUMMARY_NONEQUITY) if they exist
        const equitySummarySheet = workbook.SheetNames.includes("OVERALL_SUMMARY_EQUITY") ? workbook.Sheets["OVERALL_SUMMARY_EQUITY"] : undefined;
        const nonEquitySummarySheet = workbook.SheetNames.includes("OVERALL_SUMMARY_NONEQUITY") ? workbook.Sheets["OVERALL_SUMMARY_NONEQUITY"] : undefined;

        const parseSummarySheet = (sheet: XLSX.WorkSheet | undefined, assetClass: string) => {
            if (!sheet) return [];
            const data = XLSX.utils.sheet_to_json(sheet) as any[];
            // The sheet structure for summary usually has periods as columns or rows.
            // Based on user description: broken into quarterly periods: 01/04 to 15/06, etc.
            // We'll try to find rows that look like periods.
            return data.filter(r => r["__EMPTY"]?.includes("to") || r["Period"]?.includes("to") || (typeof r === 'object' && Object.values(r).some(v => String(v).includes("to"))))
                .map(r => {
                    // Find the period string
                    const periodStr = Object.values(r).find(v => String(v).includes("to")) as string;
                    if (!periodStr) return null;

                    return {
                        userId,
                        financialYear,
                        assetClass,
                        period: periodStr,
                        fullValueConsideration: parseFloat(r["Full Value Consideration"]) || 0,
                        costOfAcquisition: parseFloat(r["Cost of Acquisition"]) || 0,
                        shortTermGainLoss: parseFloat(r["Short Term Capital Gain/Loss"]) || 0,
                        fairMarketValue: parseFloat(r["Fair Market Value of capital asset as per section 55(2)(ac)"]) || null,
                        longTermGainWithIndex: parseFloat(r["Long Term With Index Capital Gain/Loss"]) || 0,
                        longTermGainWithoutIndex: parseFloat(r["Long Term Without Index Capital Gain/Loss"]) || 0,
                    };
                }).filter(Boolean);
        };

        const summaries = [
            ...parseSummarySheet(equitySummarySheet, "EQUITY"),
            ...parseSummarySheet(nonEquitySummarySheet, "DEBT/NON-EQUITY")
        ];

        if (summaries.length > 0) {
            await prisma.capitalGainsSummary.createMany({
                data: summaries as any[]
            });
        }

        revalidatePath("/capital-gains");
        revalidatePath("/analytics");
        return { success: true, financialYear };
    } catch (e: any) {
        console.error("Database Save Error:", e);
        return { success: false, error: "DB_ERROR", message: e.message || String(e) };
    }
}

export async function getCapitalGainsSummary(financialYear: string) {
    const userId = await getUserId();
    const transactions = await prisma.capitalGainsTransaction.findMany({
        where: { userId, financialYear }
    });

    const summaries = await prisma.capitalGainsSummary.findMany({
        where: { userId, financialYear }
    });

    return { transactions, summaries };
}

export async function getFinancialYears() {
    const userId = await getUserId();
    const years = await prisma.capitalGainsTransaction.findMany({
        where: { userId },
        select: { financialYear: true },
        distinct: ['financialYear']
    });
    return years.map(y => y.financialYear).sort().reverse();
}
