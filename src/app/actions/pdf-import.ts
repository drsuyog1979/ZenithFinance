"use server";

import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { TransactionType } from '@prisma/client';
import { ParseResult, SpendeeRow } from './import'; // reusing types

function parseDate(dateStr: string): Date | null {
    const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month: number;
        let year = parseInt(parts[2], 10);

        if (year < 100) year += 2000;

        // Check if month is numeric or string
        const monthPart = parts[1].toLowerCase();
        if (months[monthPart] !== undefined) {
            month = months[monthPart];
        } else {
            month = parseInt(monthPart, 10) - 1;
        }

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(Date.UTC(year, month, day, 0, 0, 0));
        }
    }
    return null;
}

export async function parseBankStatementPDF(formData: FormData): Promise<ParseResult> {
    const file = formData.get('file') as File;
    const bank = formData.get('bank') as string;

    if (!file) {
        return { rows: [], walletNames: [], categories: [], dateRange: null, error: "No file provided." };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // pdf-parse doesn't strictly take passwords easily, assuming unprotected PDF for now
        const data = await pdfParse(buffer);
        const text = data.text;

        if (!text || text.trim().length === 0) {
            return { rows: [], walletNames: [], categories: [], dateRange: null, error: "The PDF appears to be empty or contains only images (no selectable text). Please ensure you upload a text-based PDF statement." };
        }

        const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l);

        const rows: SpendeeRow[] = [];
        let earliest: Date | null = null;
        let latest: Date | null = null;
        const walletName = bank === 'axis' ? 'axissavings' : bank === 'bob' ? 'bob' : 'Other';

        // Generic Indian Bank Statement regexes
        // Matches: Date (DD-MM-YYYY, DD/MM/YYYY, DD-Jan-2024, DD Jan 2024)
        // We remove the ^ anchor to allow Serial Numbers or leading spaces
        const DATE_PATTERN = /(\d{1,2}[-/ ](?:\d{1,2}|[a-z]{3})[-/ ]\d{2,4})/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const dateMatch = line.match(DATE_PATTERN);
            if (!dateMatch) continue;

            const dateStr = dateMatch[1];
            // Get everything after the date match in this line
            const rest = line.substring(line.indexOf(dateStr) + dateStr.length).trim();

            if (!rest) continue;

            // Extract all matches: with decimals (e.g. 1,000.00) or without (e.g. 1000)
            const potentialMatches = [...rest.matchAll(/(?:₹\s*)?([\d,]+\.\d{2}|[\d,]+)\s*(Cr|Dr)?/gi)];

            // FILTER: Ignore obviously non-monetary strings (Reference numbers/IDs)
            // Rule: If it has no decimal and is longer than 10 digits, it's a Ref ID.
            const allMatches = potentialMatches.filter(m => {
                const val = m[1].replace(/,/g, '');
                if (!m[1].includes('.') && val.length >= 10) return false;
                // Also ignore too-small numbers that might be serial numbers?
                // For now, let's just stick to the too-large rule.
                return true;
            });

            if (allMatches.length >= 1) {
                let amount = 0;
                let type: TransactionType = TransactionType.EXPENSE;
                let transactionMatch = null;

                // HEURISTIC: Find the actual transaction amount
                // In Bank statements (Axis/BOB), columns are often: Date | Description/Ref | Dr | Cr | Balance
                // or Date | Ref | Description | Dr | Cr | Balance
                // If there are many numbers, the last one is almost always the Balance.
                // The transaction amount is one of the ones before it.

                const tagged = allMatches.find(m => m[2]);
                if (tagged) {
                    transactionMatch = tagged;
                } else if (allMatches.length >= 2) {
                    // Usually: [Something] [Amount] [Balance]
                    transactionMatch = allMatches[allMatches.length - 2];
                } else {
                    transactionMatch = allMatches[0];
                }

                if (transactionMatch) {
                    amount = parseFloat(transactionMatch[1].replace(/,/g, ''));
                    const suffix = transactionMatch[2]?.toUpperCase();

                    // The description is everything between date and the first amount
                    const firstMatchIndex = rest.indexOf(allMatches[0][0]);
                    let description = rest.substring(0, firstMatchIndex).trim();

                    if (description.match(/^(\d{1,2}[-/ ](?:\d{1,2}|[a-z]{3})[-/ ]\d{2,4})/)) {
                        description = description.replace(/^(\d{1,2}[-/ ](?:\d{1,2}|[a-z]{3})[-/ ]\d{2,4})\s*/, '');
                    }

                    const descLow = (description + " " + (transactionMatch[0] || "")).toLowerCase();
                    const lineLow = line.toLowerCase();

                    // Determine Income/Expense
                    if (suffix === 'CR' ||
                        lineLow.includes('deposit') ||
                        lineLow.includes('neft cr') ||
                        lineLow.includes('upi/cr') ||
                        lineLow.includes('/cr') ||
                        lineLow.includes('credit') ||
                        lineLow.includes('int.pd') ||
                        lineLow.includes('salary')) {
                        type = TransactionType.INCOME;
                    } else {
                        type = TransactionType.EXPENSE;
                    }

                    if (amount > 0 && !isNaN(amount)) {
                        const parsedDate = parseDate(dateStr);
                        if (parsedDate) {
                            let category = "Other";
                            if (lineLow.includes("swiggy") || lineLow.includes("zomato")) category = "Food & Drink";
                            else if (lineLow.includes("amazon") || lineLow.includes("flipkart")) category = "Shopping";
                            else if (lineLow.includes("netflix") || lineLow.includes("spotify")) category = "Subscriptions";
                            else if (lineLow.includes("uber") || lineLow.includes("ola")) category = "Transport";
                            else if (lineLow.includes("salary")) category = "Salary";
                            else if (lineLow.includes("mutual fund") || lineLow.includes("investment")) category = "Mutual Funds";

                            rows.push({
                                date: parsedDate,
                                category,
                                amount: Math.round(amount * 100),
                                currency: "INR",
                                note: description.substring(0, 100) || "Bank Transaction",
                                walletName: walletName,
                                type
                            });

                            if (!earliest || parsedDate < earliest) earliest = parsedDate;
                            if (!latest || parsedDate > latest) latest = parsedDate;
                        }
                    }
                }
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
        return { rows: [], walletNames: [], categories: [], dateRange: null, error: `Failed to parse PDF: ${e.message}` };
    }
}
