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
        } else if ([".xls", ".xlsx", ".xlsm", ".xlsb"].some(ext => fileName.endsWith(ext))) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            transactions = parseAssetCSV(csv, source);
        } else {
            return { transactions: [], error: "Unsupported file format. Please use PDF, CSV, or Excel." };
        }

        if (transactions.length === 0) {
            return { transactions: [], error: "No transactions identified in the file. Check if format is supported." };
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

    const result: AssetTransaction[] = [];
    const headers = lines[0].toLowerCase().split(',');

    // Find index of required columns
    const find = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const symIdx = find(['symbol', 'instrument', 'scheme', 'stock']);
    const dateIdx = find(['date', 'time']);
    const typeIdx = find(['type', 'side', 'transaction']);
    const qtyIdx = find(['qty', 'quantity', 'units']);
    const priceIdx = find(['price', 'nav', 'rate']);

    if (symIdx < 0 || dateIdx < 0 || qtyIdx < 0 || priceIdx < 0) return [];

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i], ',');
        const rawType = typeIdx >= 0 ? cols[typeIdx].toUpperCase() : "BUY";
        const price = parseFloat(cols[priceIdx].replace(/,/g, ''));
        const units = Math.abs(parseFloat(cols[qtyIdx].replace(/,/g, '')));

        result.push({
            symbol: cols[symIdx],
            type: (rawType.includes("SELL") || rawType.includes("RED") || rawType.includes("OUT")) ? "SELL" : "BUY",
            assetType: cols[symIdx].toLowerCase().includes("fund") ? AssetType.EQUITY_MF : AssetType.STOCK,
            date: new Date(cols[dateIdx]),
            pricePaise: Math.round(price * 100),
            units: units
        });
    }

    return result;
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
