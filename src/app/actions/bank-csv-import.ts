"use server";

import { TransactionType } from '@prisma/client';
import { ParseResult, SpendeeRow } from './import';

/**
 * Parses generic bank CSV statements.
 * Supports basic detection for Axis and BoB if they follow common patterns.
 */
export async function parseBankStatementCSV(formData: FormData): Promise<ParseResult> {
    const file = formData.get('file') as File;
    const bank = formData.get('bank') as string;

    if (!file) {
        return { rows: [], walletNames: [], categories: [], dateRange: null, error: "No file provided." };
    }

    try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

        if (lines.length < 2) {
            return { rows: [], walletNames: [], categories: [], dateRange: null, error: "File is empty or invalid." };
        }

        // Detect CSV separator (comma or semicolon)
        const firstLine = lines[0];
        const separator = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

        const rows: SpendeeRow[] = [];
        let earliest: Date | null = null;
        let latest: Date | null = null;
        const walletName = bank === 'axis' ? 'axissavings' : bank === 'bob' ? 'bob' : 'Other';

        // Find header row (some bank CSVs have junk lines at the top)
        let headerIdx = -1;
        const headerKeywords = ['date', 'txn date', 'tran date', 'value date', 'particulars', 'narration', 'description', 'amount', 'withdrawal', 'deposit', 'dr', 'cr'];

        for (let i = 0; i < Math.min(lines.length, 50); i++) {
            const l = lines[i].toLowerCase();
            const matches = headerKeywords.filter(k => l.includes(k));
            // If line contains at least 3 distinct keywords, it's likely our header
            if (matches.length >= 3) {
                headerIdx = i;
                break;
            }
        }

        if (headerIdx === -1) headerIdx = 0; // Fallback to first line if no clear header found

        const headers = parseCSVLine(lines[headerIdx], separator).map(h => h.toLowerCase().trim());
        const getIdx = (keys: string[]) => headers.findIndex(h => keys.some(k => h === k || h.includes(k)));

        const dateIdx = getIdx(['date', 'txn date', 'tran date']);
        const descIdx = getIdx(['description', 'narration', 'particulars']);
        const amtIdx = getIdx(['amount', 'transaction amount']);
        const drIdx = getIdx(['withdrawal', 'debit', 'dr']);
        const crIdx = getIdx(['deposit', 'credit', 'cr']);
        const typeIdx = getIdx(['type', 'cr/dr', 'cr_dr']);

        if (dateIdx < 0 || (amtIdx < 0 && (drIdx < 0 || crIdx < 0))) {
            return { rows: [], walletNames: [], categories: [], dateRange: null, error: "Could not identify CSV columns. Expected Date, Description, and Amount (or Debit/Credit)." };
        }

        for (let i = headerIdx + 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i], separator);
            if (cols.length < headers.length * 0.7) continue; // Skip lines with too few columns

            const dateStr = cols[dateIdx];
            const description = descIdx >= 0 ? cols[descIdx] : "Bank Transaction";

            const parsedDate = parseBankDate(dateStr);
            if (!parsedDate) continue;

            let amount = 0;
            let type: TransactionType = TransactionType.EXPENSE;

            if (amtIdx >= 0) {
                const amtVal = cols[amtIdx].replace(/,/g, '');
                amount = Math.abs(parseFloat(amtVal));

                const typeVal = typeIdx >= 0 ? cols[typeIdx].toUpperCase() : "";
                if (typeVal.includes('CR') || parseFloat(amtVal) > 0) {
                    type = TransactionType.INCOME;
                } else {
                    type = TransactionType.EXPENSE;
                }
            } else {
                const drVal = drIdx >= 0 ? parseFloat(cols[drIdx].replace(/,/g, '')) || 0 : 0;
                const crVal = crIdx >= 0 ? parseFloat(cols[crIdx].replace(/,/g, '')) || 0 : 0;

                if (crVal > 0) {
                    amount = crVal;
                    type = TransactionType.INCOME;
                } else {
                    amount = drVal;
                    type = TransactionType.EXPENSE;
                }
            }

            if (amount > 0) {
                let category = "Other";
                const descLow = description.toLowerCase();
                if (descLow.includes("swiggy") || descLow.includes("zomato")) category = "Food & Drink";
                else if (descLow.includes("amazon") || descLow.includes("flipkart")) category = "Shopping";
                else if (descLow.includes("uber") || descLow.includes("ola")) category = "Petrol"; // mapping to existing
                else if (descLow.includes("salary")) category = "Salary";
                else if (descLow.includes("mutual fund") || descLow.includes("investment")) category = "Mutual Funds";
                else category = "Other";

                rows.push({
                    date: parsedDate,
                    category,
                    amount: Math.round(amount * 100),
                    currency: "INR",
                    note: description.substring(0, 100),
                    walletName: walletName,
                    type
                });

                if (!earliest || parsedDate < earliest) earliest = parsedDate;
                if (!latest || parsedDate > latest) latest = parsedDate;
            }
        }

        return {
            rows,
            walletNames: [walletName],
            categories: [...new Set(rows.map(r => r.category))],
            dateRange: earliest && latest ? {
                from: earliest.toLocaleDateString("en-IN"),
                to: latest.toLocaleDateString("en-IN")
            } : null
        };

    } catch (e: any) {
        return { rows: [], walletNames: [], categories: [], dateRange: null, error: `Failed to parse CSV: ${e.message}` };
    }
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

function parseBankDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const cleaned = dateStr.replace(/"/g, '').trim();

    const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    // Try DD-MMM-YYYY or DD-MM-YYYY
    const dmy = cleaned.split(/[-/]/);
    if (dmy.length === 3) {
        let day = parseInt(dmy[0], 10);
        let month: number;
        let year = parseInt(dmy[2], 10);

        if (year < 100) year += 2000;

        const monthPart = dmy[1].toLowerCase();
        if (months[monthPart] !== undefined) {
            month = months[monthPart];
        } else {
            month = parseInt(monthPart, 10) - 1;
        }

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(Date.UTC(year, month, day, 0, 0, 0));
        }
    }

    // Try YYYY-MM-DD
    const ymd = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymd) {
        return new Date(Date.UTC(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]), 0, 0, 0));
    }

    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
}
