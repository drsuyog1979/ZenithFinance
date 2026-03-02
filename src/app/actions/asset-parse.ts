"use server";

import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { AssetType } from '@prisma/client';
import { AssetTransaction } from './assets';
import * as XLSX from 'xlsx';

/**
 * General parser for various asset statements.
 * Supports CSV and PDF formats.
 */
export async function parseAssetStatement(formData: FormData): Promise<{
    transactions: AssetTransaction[],
    error?: string,
    summary?: string
}> {
    const file = formData.get('file') as File;
    const source = formData.get('source') as string; // 'cams', 'zerodha', 'groww', etc.

    if (!file) return { transactions: [], error: "No file provided." };

    try {
        let transactions: AssetTransaction[] = [];

        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.pdf')) {
            const arrayBuffer = await file.arrayBuffer();
            const data = await pdfParse(Buffer.from(arrayBuffer));
            const text = data.text;

            if (source === 'cams') {
                transactions = parseCAMSPDF(text);
            } else if (source === 'zerodha') {
                transactions = parseZerodhaPDF(text);
            } else {
                return { transactions: [], error: "PDF parsing currently only supported for CAMS/Zerodha." };
            }
        } else if (fileName.endsWith('.csv')) {
            const text = await file.text();
            transactions = parseAssetCSV(text, source);
        } else if ([".xls", ".xlsx", ".xlsm", ".xlsb", ".xlv"].some(ext => fileName.endsWith(ext))) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            // Look for the best sheet: TRXN_DETAILS or the first one
            let sheetName = workbook.SheetNames[0];
            const bestSheet = workbook.SheetNames.find(n => n.toLowerCase().includes('trxn') || n.toLowerCase().includes('transaction') || n.toLowerCase().includes('details'));
            if (bestSheet) sheetName = bestSheet;

            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            transactions = parseAssetCSV(csv, source);
        } else {
            return { transactions: [], error: "Unsupported file format. Please use PDF, CSV, or Excel." };
        }

        if (transactions.length === 0) {
            // If total failure, let's provide more info in the error
            // If total failure, let's provide more info in the error
            return { transactions: [], error: "No transactions identified. Ensure you've uploaded a valid transaction statement (CAS) from CAMS/Zerodha/Groww." };
        }

        return {
            transactions,
            summary: `Successfully parsed ${transactions.length} transactions for ${source.toUpperCase()}.`
        };

    } catch (e: any) {
        return { transactions: [], error: "Parse failed: " + e.message };
    }
}

/**
 * CAMS PDF Parser (Regex based)
 * Look for: 01-Jan-2024 Purchase/Redemption SchemeName Units Price Amount
 */
function parseCAMSPDF(text: string): AssetTransaction[] {
    const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l);
    const result: AssetTransaction[] = [];

    // Pattern: Date | Desc/Scheme | Units | Price | Amount
    // 01-Jan-2024 NAV Redemption - AXIS BLUECHIP FUND - GROWTH 100.555 55.43 5573.76
    const pattern = /(\d{2}-[\w]{3}-\d{4})\s+(.+?)\s+(-?[\d,]+\.\d{3})\s+([\d,]+\.\d{2,4})\s+([\d,]+\.\d{2})/;

    for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
            const dateStr = match[1];
            const desc = match[2].toLowerCase();
            const units = parseFloat(match[3].replace(/,/g, ''));
            const price = parseFloat(match[4].replace(/,/g, ''));

            // Derive asset type from name (Simplified)
            let assetType: AssetType = AssetType.EQUITY_MF;
            if (desc.includes("debt") || desc.includes("liquid") || desc.includes("overnight")) {
                assetType = AssetType.DEBT_MF;
            }

            // Derive BUY/SELL from units or description
            let type: "BUY" | "SELL" = units < 0 ? "SELL" : "BUY";
            if (desc.includes("redemption") || desc.includes("sell") || desc.includes("switch-out")) {
                type = "SELL";
            }

            result.push({
                symbol: match[2].split('-')[0].trim(), // Primary fund name
                type,
                assetType,
                date: new Date(dateStr),
                pricePaise: Math.round(price * 100),
                units: Math.abs(units)
            });
        }
    }
    return result;
}

/**
 * Placeholder for Zerodha PDF parsing
 */
function parseZerodhaPDF(text: string): AssetTransaction[] {
    // Implement Zerodha specific patterns
    return [];
}

/**
 * CSV Parser for common broker exports
 */
function parseAssetCSV(text: string, source: string): AssetTransaction[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    let headerLineIdx = 0;
    let headers: string[] = [];

    // Search for header row in the first 50 lines
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const hCandidate = lines[i].toLowerCase().split(',');
        if (hCandidate.some(h => h.includes('scheme name') || h.includes('instrument') || (h.includes('desc') && hCandidate.some(h2 => h2.includes('units'))))) {
            headerLineIdx = i;
            headers = hCandidate;
            break;
        }
    }

    if (headers.length === 0) return [];

    const result: AssetTransaction[] = [];
    const find = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const symIdx = find(['scheme name', 'symbol', 'instrument', 'scheme', 'stock']);
    const dateIdx = find(['date', 'time']); // Primary date (usually Sell Date in CG statements)
    const buyDateIdx = find(['date_1', 'purchase date']); // Secondary date for CG pairings
    const typeIdx = find(['desc', 'type', 'side', 'transaction']);

    // For CG statements, we want the units of the specific lot/leg (RedUnits or PurhUnit)
    const qtyIdx = find(['redunits', 'purhunit', 'units', 'qty', 'quantity']);

    const priceIdx = find(['price', 'nav', 'rate']); // Sale price
    const buyPriceIdx = find(['unit cost', 'purchase price', 'buy price']); // Cost price for pairings

    if (symIdx < 0 || qtyIdx < 0 || (dateIdx < 0 && buyDateIdx < 0)) return [];

    for (let i = headerLineIdx + 1; i < lines.length; i++) {
        try {
            const cols = parseCSVLine(lines[i], ',');
            if (cols.length <= Math.max(symIdx, qtyIdx)) continue;

            const symbol = cols[symIdx];
            if (!symbol || symbol.toLowerCase().includes('total')) continue;

            const qtyStr = cols[qtyIdx].replace(/,/g, '');
            const units = Math.abs(parseFloat(qtyStr));
            if (isNaN(units) || units === 0) continue;

            const assetType = (symbol.toLowerCase().includes("fund") || (headers[2] && lines[i].includes("EQUITY"))) ? AssetType.EQUITY_MF : AssetType.STOCK;

            // 1. Handle the Primary Date (Sale in CG statements)
            if (dateIdx >= 0 && cols[dateIdx]) {
                const priceStr = cols[priceIdx]?.replace(/,/g, '') || "0";
                const price = parseFloat(priceStr);
                const rawType = typeIdx >= 0 ? cols[typeIdx].toUpperCase() : "BUY";
                const type = (rawType.includes("SELL") || rawType.includes("RED") || rawType.includes("OUT")) ? "SELL" : "BUY";

                const date = parseDate(cols[dateIdx]);
                if (date) {
                    result.push({
                        symbol,
                        type,
                        assetType,
                        date,
                        pricePaise: Math.round((isNaN(price) ? 0 : price) * 100),
                        units
                    });
                }
            }

            // 2. Handle the Secondary Date (Buy in CG statements)
            if (buyDateIdx >= 0 && cols[buyDateIdx]) {
                const buyPriceStr = cols[buyPriceIdx]?.replace(/,/g, '') || "0";
                const buyPrice = parseFloat(buyPriceStr);
                const buyDate = parseDate(cols[buyDateIdx]);

                if (buyDate) {
                    result.push({
                        symbol,
                        type: "BUY",
                        assetType,
                        date: buyDate,
                        pricePaise: Math.round((isNaN(buyPrice) ? 0 : buyPrice) * 100),
                        units
                    });
                }
            }
        } catch (e) {
            console.error("Row parse error:", e);
        }
    }

    return result;
}

function parseDate(str: string): Date | null {
    if (!str) return null;
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    // Fallback for dd-MMM-yyyy or dd/mm/yyyy
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
        // dd-MMM-yyyy
        if (isNaN(parseInt(parts[1]))) {
            const months: any = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
            const m = months[parts[1].toLowerCase().slice(0, 3)];
            if (m !== undefined) return new Date(parseInt(parts[2]), m, parseInt(parts[0]));
        }
        // dd/mm/yyyy
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
        return new Date(year, month - 1, day);
    }
    return null;
}

function parseCSVLine(line: string, separator: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === separator && !inQuotes) {
            result.push(current.replace(/^"|"$/g, "").trim());
            current = "";
        } else {
            current += ch;
        }
    }
    result.push(current.replace(/^"|"$/g, "").trim());
    return result;
}
