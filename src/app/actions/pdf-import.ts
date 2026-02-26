"use server";

import pdfParse from 'pdf-parse';
import { TransactionType } from '@prisma/client';
import { ParseResult, SpendeeRow } from './import'; // reusing types

function parseDate(dateStr: string): Date | null {
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);

        if (year < 100) year += 2000;

        // Month could be name (e.g. Jan, Feb)? We'll assume DD-MM-YYYY
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
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

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

        const rows: SpendeeRow[] = [];
        let earliest: Date | null = null;
        let latest: Date | null = null;
        const walletName = bank === 'axis' ? 'axissavings' : bank === 'bob' ? 'bob' : 'Other';

        // Generic Indian Bank Statement regexes
        // Matches: Date, description, amount(s), Cr/Dr
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check if line starts with DD-MM-YYYY or DD/MM/YYYY
            const dateMatch = line.match(/^(\d{2}[-/]\d{2}[-/]\d{2,4})\s+(.+)$/);
            if (!dateMatch) continue;

            const dateStr = dateMatch[1];
            const rest = dateMatch[2];

            // Extract all numbers like "1,000.00" or "1000.00" from the end
            // Also optional Cr/Dr
            const amountMatches = [...rest.matchAll(/([\d,]+\.\d{2})\s*(Cr|Dr)?/gi)];

            if (amountMatches.length >= 1) {
                // The description is everything before the first amount
                const firstAmountIndex = amountMatches[0].index;
                let description = rest.substring(0, firstAmountIndex).trim();

                // Axis bank often starts with two dates: 01-01-2026 01-01-2026 ...
                if (description.match(/^\d{2}[-/]\d{2}[-/]\d{2,4}\s+/)) {
                    description = description.replace(/^\d{2}[-/]\d{2}[-/]\d{2,4}\s+/, '');
                }

                // If we match exactly 2 or 3 amounts, we can guess the transaction amount
                // axis example: amount Dr/Cr balance
                // bob example: withdrawal deposit balance
                let amount = 0;
                let type: TransactionType = TransactionType.EXPENSE;

                if (bank === 'axis') {
                    // Axis usually has: Amount DR/CR Balance
                    // So first match is Amount, second is Balance (or vice versa if there's no DR/CR)
                    const amtMatch = amountMatches[0];
                    amount = parseFloat(amtMatch[1].replace(/,/g, ''));
                    const suffix = amtMatch[2]?.toUpperCase();

                    if (suffix === 'CR') {
                        type = TransactionType.INCOME;
                    } else if (suffix === 'DR') {
                        type = TransactionType.EXPENSE;
                    } else if (description.toLowerCase().includes('deposit') || description.toLowerCase().includes('neft cr')) {
                        type = TransactionType.INCOME;
                    } else {
                        // Guess based on 2 amounts? Usually withdrawals are more common, let's default to Expense
                        type = TransactionType.EXPENSE;
                    }
                } else if (bank === 'bob') {
                    // BoB usually has: Cheque Withdrawal Deposit Balance
                    // If there are 3 numbers: withdrawal, deposit, balance
                    // If there is an empty column in PDF, pdf-parse might just collapse spaces.
                    // This makes it tough. Let's look for Cr/Dr. If absent, fallback:
                    // Usually if there are 2 numbers, the first is the transaction, the second is balance.
                    // Let's guess income/expense based on keywords or if the first amount is very large vs small.
                    // Wait, safely: if description has 'UPI/CR' it's income
                    const parsedVal = parseFloat(amountMatches[0][1].replace(/,/g, ''));
                    amount = parsedVal;

                    if (description.toLowerCase().includes('/cr') || description.toLowerCase().includes('deposit') || description.toLowerCase().includes('neft cr')) {
                        type = TransactionType.INCOME;
                    } else {
                        type = TransactionType.EXPENSE;
                    }

                    if (amountMatches.length >= 2) {
                        const amt1 = parseFloat(amountMatches[0][1].replace(/,/g, ''));
                        const amt2 = parseFloat(amountMatches[1][1].replace(/,/g, ''));
                        const amt3 = amountMatches.length >= 3 ? parseFloat(amountMatches[2][1].replace(/,/g, '')) : 0;

                        // If we have 3 amounts (e.g. Cheque No, Amount, Balance), Cheque No usually doesn't have decimals.
                        // Actually let's just stick to keywords + the first matched decimal as amount.
                    }
                } else {
                    amount = parseFloat(amountMatches[0][1].replace(/,/g, ''));
                    if (description.toLowerCase().includes('cr') || description.toLowerCase().includes('deposit')) {
                        type = TransactionType.INCOME;
                    } else {
                        type = TransactionType.EXPENSE;
                    }
                }

                if (amount > 0) {
                    const parsedDate = parseDate(dateStr);
                    if (parsedDate) {
                        let category = "Other";
                        const descLow = description.toLowerCase();
                        if (descLow.includes("swiggy") || descLow.includes("zomato")) category = "Food & Dining";
                        else if (descLow.includes("amazon") || descLow.includes("flipkart")) category = "Shopping";
                        else if (descLow.includes("netflix") || descLow.includes("spotify")) category = "Subscriptions";
                        else if (descLow.includes("uber") || descLow.includes("ola")) category = "Transport";
                        else if (descLow.includes("salary")) category = "Income";
                        else category = "Other"; // We let the user re-categorize later if needed

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
