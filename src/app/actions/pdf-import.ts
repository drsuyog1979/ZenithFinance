"use server";

// @ts-ignore
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

        // State for tracking ongoing transaction identification
        let runningBalancePaise: number | null = null;
        let currentDate: Date | null = null;
        let currentDescription: string[] = [];

        // Match: Date (DD-MM-YYYY, DD/MM/YYYY, DD-Jan-2024)
        const DATE_PATTERN = /(\d{1,2}[-/ ](?:\d{1,2}|[a-z]{3})[-/ ]\d{2,4})/;
        // Match: Monetary value like 1,000.00
        const MONEY_PATTERN = /([\d,]+\.\d{2})/g;

        // 1. Find Initial Balance
        for (const line of lines) {
            const lowLine = line.toLowerCase();
            if (lowLine.includes('opening balance') || lowLine.includes('balance b/f') || lowLine.includes('balance forward')) {
                const match = line.match(MONEY_PATTERN);
                if (match) {
                    // Usually the last money pattern on the opening balance line is the amount
                    runningBalancePaise = Math.round(parseFloat(match[match.length - 1].replace(/,/g, '')) * 100);
                    break;
                }
            }
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const dateMatch = line.match(DATE_PATTERN);

            if (dateMatch) {
                currentDate = parseDate(dateMatch[1]);
                currentDescription = [line.replace(dateMatch[1], '').trim()];
            } else if (currentDate) {
                currentDescription.push(line);
            }

            if (currentDate) {
                const moneyMatches = line.match(MONEY_PATTERN);
                if (moneyMatches && moneyMatches.length >= 1) {
                    const candidates = moneyMatches.map((m: string) => Math.round(parseFloat(m.replace(/,/g, '')) * 100));

                    if (runningBalancePaise !== null) {
                        const newBalancePaise = candidates[candidates.length - 1];
                        let matched = false;

                        for (let j = 0; j < candidates.length - 1; j++) {
                            const amt = candidates[j];
                            if (amt === 0) continue;

                            // Check Debit
                            if (Math.abs(runningBalancePaise - amt - newBalancePaise) < 5) {
                                matched = true;
                                const description = currentDescription.join(' ').replace(MONEY_PATTERN, '').trim() || "Bank Transaction";
                                rows.push(createRow(currentDate, description, amt, TransactionType.EXPENSE, walletName));
                                runningBalancePaise = newBalancePaise;
                                break;
                            }
                            // Check Credit
                            if (Math.abs(runningBalancePaise + amt - newBalancePaise) < 5) {
                                matched = true;
                                const description = currentDescription.join(' ').replace(MONEY_PATTERN, '').trim() || "Bank Transaction";
                                rows.push(createRow(currentDate, description, amt, TransactionType.INCOME, walletName));
                                runningBalancePaise = newBalancePaise;
                                break;
                            }
                        }

                        if (matched) {
                            currentDescription = [];
                            if (!earliest || currentDate < earliest) earliest = currentDate;
                            if (!latest || currentDate > latest) latest = currentDate;
                        }
                    } else if (moneyMatches.length >= 2) {
                        // If no opening balance, auto-discover from first transaction
                        const last = Math.round(parseFloat(moneyMatches[moneyMatches.length - 1].replace(/,/g, '')) * 100);
                        const prev = Math.round(parseFloat(moneyMatches[moneyMatches.length - 2].replace(/,/g, '')) * 100);
                        runningBalancePaise = last;
                        // For the very first row, we might miss it if we can't tell DR/CR, 
                        // but usually Opening Balance is found at the top.
                    }
                }
            }
        }

        function createRow(date: Date, description: string, amountPaise: number, type: TransactionType, wallet: string): SpendeeRow {
            const descLow = description.toLowerCase();
            let category = "Other";

            if (descLow.includes("swiggy") || descLow.includes("zomato")) category = "Food & Drink";
            else if (descLow.includes("amazon") || descLow.includes("flipkart")) category = "Shopping";
            else if (descLow.includes("netflix") || descLow.includes("spotify")) category = "Subscriptions";
            else if (descLow.includes("uber") || descLow.includes("ola")) category = "Transport";
            else if (descLow.includes("salary") || descLow.includes("imps/p2a")) category = "Salary";
            else if (descLow.includes("mutual fund") || descLow.includes("investment")) category = "Mutual Funds";

            if (type === TransactionType.INCOME && amountPaise > 5000000) category = "Salary";

            return {
                date,
                category,
                amount: amountPaise,
                currency: "INR",
                note: description.substring(0, 500),
                walletName: wallet,
                type
            };
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
