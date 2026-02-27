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
        // Matches: Date (DD-MM-YYYY or DD-Jan-2024), description, amount(s), Cr/Dr
        // We remove the ^ anchor to allow Serial Numbers or leading spaces
        const DATE_PATTERN = /(\d{1,2}[-/](?:\d{1,2}|[a-z]{3})[-/]\d{2,4})/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const dateMatch = line.match(DATE_PATTERN);
            if (!dateMatch) continue;

            const dateStr = dateMatch[1];
            // Get everything after the date match in this line
            const rest = line.substring(line.indexOf(dateStr) + dateStr.length).trim();

            if (!rest) continue;

            // Extract all numbers like "1,000.00" or "1000.00" or "1000"
            // Also optional Cr/Dr
            const amountMatches = [...rest.matchAll(/([\d,]+\.\d{2}|[\d,]+)\s*(Cr|Dr)?/gi)];

            if (amountMatches.length >= 1) {
                // The description is everything between the date and the first amount
                const firstAmountMatch = amountMatches[0];
                const firstAmountIndex = rest.indexOf(firstAmountMatch[0]);
                let description = rest.substring(0, firstAmountIndex).trim();

                // If description is empty or very short, it might be a multi-line transaction
                // or the serial number was before the date.

                // Axis bank often starts with two dates: 01-01-2026 01-01-2026 ...
                if (description.match(/^(\d{1,2}[-/](?:\d{1,2}|[a-z]{3})[-/]\d{2,4})\s+/)) {
                    description = description.replace(/^(\d{1,2}[-/](?:\d{1,2}|[a-z]{3})[-/]\d{2,4})\s+/, '');
                }

                let amount = 0;
                let type: TransactionType = TransactionType.EXPENSE;
                const descLow = description.toLowerCase();

                if (bank === 'axis') {
                    const amtMatch = amountMatches[0];
                    amount = parseFloat(amtMatch[1].replace(/,/g, ''));
                    const suffix = amtMatch[2]?.toUpperCase();

                    if (suffix === 'CR' || descLow.includes('deposit') || descLow.includes('neft cr') || descLow.includes('upi/cr')) {
                        type = TransactionType.INCOME;
                    } else {
                        type = TransactionType.EXPENSE;
                    }
                } else if (bank === 'bob') {
                    // BoB often has columns for Withdrawal and Deposit
                    // If we see two amounts, and the second one is Cr/Dr, or if we guess based on context
                    const parsedVal = parseFloat(amountMatches[0][1].replace(/,/g, ''));
                    amount = parsedVal;

                    if (descLow.includes('/cr') || descLow.includes('deposit') || descLow.includes('neft cr') || descLow.includes('upi/cr')) {
                        type = TransactionType.INCOME;
                    } else {
                        type = TransactionType.EXPENSE;
                    }
                } else {
                    amount = parseFloat(amountMatches[0][1].replace(/,/g, ''));
                    if (descLow.includes('cr') || descLow.includes('deposit')) {
                        type = TransactionType.INCOME;
                    } else {
                        type = TransactionType.EXPENSE;
                    }
                }

                if (amount > 0 && !isNaN(amount)) {
                    const parsedDate = parseDate(dateStr);
                    if (parsedDate) {
                        let category = "Other";
                        if (descLow.includes("swiggy") || descLow.includes("zomato")) category = "Food & Dining";
                        else if (descLow.includes("amazon") || descLow.includes("flipkart")) category = "Shopping";
                        else if (descLow.includes("netflix") || descLow.includes("spotify")) category = "Subscriptions";
                        else if (descLow.includes("uber") || descLow.includes("ola")) category = "Transport";
                        else if (descLow.includes("salary")) category = "Income";

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
