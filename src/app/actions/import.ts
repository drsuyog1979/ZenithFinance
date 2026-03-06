"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { ImportSource, TransactionType } from "@prisma/client";

async function getUserAndEnsureExists() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    try {
        await prisma.user.upsert({
            where: { id: user.id },
            update: {},
            create: { id: user.id, email: user.email || "" },
        });
    } catch (e: any) {
        // P2002 = unique constraint violation on email.
        // This can happen if the user previously signed up and was assigned a different
        // DB row ID (e.g. during testing). Fix: re-point the existing email row to the
        // current Supabase auth ID so all future operations link correctly.
        if (e.code === "P2002") {
            await prisma.user.update({
                where: { email: user.email! },
                data: { id: user.id },
            });
        } else {
            throw e;
        }
    }

    return user.id;
}

// ── Category normalisation ──────────────────────────────────────────────────
function normaliseCategory(raw: string): string {
    // Pass through the original category name from the CSV as-is
    return raw.trim() || "Other";
}

// ── Type inference from Spendee's "Type" column + amount sign ──────────────
function inferType(spendeeType: string, amount: number): TransactionType {
    const t = spendeeType.trim().toLowerCase();
    if (t === "transfer") return TransactionType.TRANSFER;
    if (t === "income" || amount > 0) return TransactionType.INCOME;
    return TransactionType.EXPENSE;
}

// ── Parse Spendee CSV text → structured rows ────────────────────────────────
export interface SpendeeRow {
    date: Date;
    category: string;
    amount: number; // in paise, always positive
    currency: string;
    note: string;
    walletName: string;
    type: TransactionType;
}

export interface ParseResult {
    rows: SpendeeRow[];
    walletNames: string[];
    categories: string[];
    dateRange: { from: string; to: string } | null;
    error?: string;
}

export async function parseSpendeeCSV(csvText: string): Promise<ParseResult> {
    try {
        const lines = csvText.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return { rows: [], walletNames: [], categories: [], dateRange: null, error: "File appears empty." };

        // Detect header — be tolerant of BOM and casing
        const rawHeader = lines[0].replace(/^\uFEFF/, "");
        const header = parseCSVLine(rawHeader).map(h => h.toLowerCase().trim());

        const col = (name: string) => header.findIndex(h => h === name || h.includes(name));

        const dateIdx = col("date");
        const catIdx = col("category");
        const amtIdx = col("amount");
        const currIdx = col("currency");
        const noteIdx = col("note");
        const typeIdx = col("type");
        // 'labels' column is used for wallet in the Accounts CSV export format
        const labelsIdx = header.findIndex(h => h === "labels");
        const walletIdx = header.findIndex(h => h === "wallet" || h.includes("wallet name") || h === "account");
        // Use labelsIdx preferentially if it exists; fall back to walletIdx
        const isAccountsFormat = labelsIdx >= 0;

        if (dateIdx < 0 || amtIdx < 0) {
            return { rows: [], walletNames: [], categories: [], dateRange: null, error: "Could not find required columns (Date, Amount). Please export from Spendee using Settings → Export Data." };
        }

        const rows: SpendeeRow[] = [];
        const walletSet = new Set<string>();
        const categorySet = new Set<string>();
        let earliest: Date | null = null;
        let latest: Date | null = null;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const cols = parseCSVLine(line);

            const rawDate = cols[dateIdx]?.trim() || "";
            const rawAmt = cols[amtIdx]?.trim() || "0";
            const rawCat = catIdx >= 0 ? cols[catIdx]?.trim() || "Other" : "Other";
            const rawCurr = currIdx >= 0 ? cols[currIdx]?.trim() || "INR" : "INR";
            const rawNote = noteIdx >= 0 ? cols[noteIdx]?.trim() || "" : "";
            const rawType = typeIdx >= 0 ? cols[typeIdx]?.trim() || "" : "";

            // Wallet: use Labels column if present & non-empty; else Wallet column; else default
            let rawWallet: string;
            if (isAccountsFormat) {
                const labelVal = cols[labelsIdx]?.trim() || "";
                if (labelVal) {
                    rawWallet = labelVal;
                } else if (walletIdx >= 0) {
                    rawWallet = cols[walletIdx]?.trim() || "Accounts";
                } else {
                    rawWallet = "Accounts";
                }
            } else {
                rawWallet = walletIdx >= 0 ? cols[walletIdx]?.trim() || "Spendee Import" : "Spendee Import";
            }

            if (!rawDate || rawDate.toLowerCase() === "date") continue;

            const date = parseSpendeeDate(rawDate);
            if (!date || isNaN(date.getTime())) continue;

            const amtFloat = parseFloat(rawAmt.replace(/[^0-9.\-]/g, ""));
            if (isNaN(amtFloat)) continue;

            const type = inferType(rawType, amtFloat);
            // In Accounts format categories are custom — pass through unknown names as-is
            const category = normaliseCategory(rawCat);
            const amountPaise = Math.round(Math.abs(amtFloat) * 100);

            walletSet.add(rawWallet);
            categorySet.add(category);

            if (!earliest || date < earliest) earliest = date;
            if (!latest || date > latest) latest = date;

            rows.push({ date, category, amount: amountPaise, currency: rawCurr, note: rawNote, walletName: rawWallet, type });
        }

        return {
            rows,
            walletNames: Array.from(walletSet),
            categories: Array.from(categorySet),
            dateRange: earliest && latest ? {
                from: earliest.toLocaleDateString("en-IN"),
                to: latest.toLocaleDateString("en-IN"),
            } : null,
        };
    } catch (e: any) {
        return { rows: [], walletNames: [], categories: [], dateRange: null, error: e.message };
    }
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
            result.push(current.replace(/^"|"$/g, "").trim());
            current = "";
        } else {
            current += ch;
        }
    }
    result.push(current.replace(/^"|"$/g, "").trim());
    return result;
}

function parseSpendeeDate(raw: string): Date | null {
    // Handle ISO 8601 with timezone: "2026-01-21T02:29:01+00:00" → parse directly
    // Handle date-only: "2024-01-15" or "15/01/2024" or "2024-01-15 10:30:00"
    const cleaned = raw.trim();

    // ISO 8601 with T and optional timezone — let JS parse natively
    if (cleaned.includes("T")) {
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) return d;
    }

    // Strip time portion for plain datetime strings
    const dateOnly = cleaned.split(" ")[0];
    const d = new Date(dateOnly);
    if (!isNaN(d.getTime())) return d;

    // Try DD/MM/YYYY
    const parts = dateOnly.split(/[\/\-]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return null;
}

export async function checkDuplicates(rows: SpendeeRow[]): Promise<number> {
    try {
        const userId = await getUserAndEnsureExists();
        if (rows.length === 0) return 0;

        // Get the date range from rows
        // Dates are passed as strings from the client in server actions
        const normalizedRows = rows.map(r => ({
            ...r,
            date: new Date(r.date)
        }));

        const earliest = new Date(Math.min(...normalizedRows.map(r => r.date.getTime())));
        const latest = new Date(Math.max(...normalizedRows.map(r => r.date.getTime())));

        // Fetch user's existing transactions in that range
        const existingTxs = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: earliest, lte: latest }
            },
            select: { date: true, amount: true }
        });

        // Set for O(1) matching: YYYY-MM-DD_Amount
        const existingSet = new Set(existingTxs.map(tx =>
            `${tx.date.toISOString().split('T')[0]}_${tx.amount}`
        ));

        let matches = 0;
        for (const row of normalizedRows) {
            const key = `${row.date.toISOString().split('T')[0]}_${row.amount}`;
            if (existingSet.has(key)) matches++;
        }
        return matches;
    } catch (e) {
        console.error("Duplicate check error:", e);
        return 0;
    }
}

// ── Commit import to database ───────────────────────────────────────────────
export interface ImportResult {
    imported: number;
    skipped: number;
    walletsCreated: string[];
    error?: string;
    importSessionId?: string;
}

export async function commitSpendeeImport(rows: SpendeeRow[], source: ImportSource = ImportSource.SPENDEE): Promise<ImportResult> {
    try {
        const userId = await getUserAndEnsureExists();

        const normalizedRows = rows.map(r => ({
            ...r,
            date: new Date(r.date)
        }));

        if (normalizedRows.length === 0) {
            return { imported: 0, skipped: 0, walletsCreated: [], importSessionId: "" };
        }

        const earliest = new Date(Math.min(...normalizedRows.map(r => r.date.getTime())));
        const latest = new Date(Math.max(...normalizedRows.map(r => r.date.getTime())));

        // 1. Find or create wallets
        const walletMap = new Map<string, string>(); // walletName → walletId
        const walletsCreated: string[] = [];

        const existingWallets = await prisma.wallet.findMany({ where: { userId } });
        existingWallets.forEach(w => walletMap.set(w.name.toLowerCase(), w.id));

        const uniqueWalletNames = [...new Set(rows.map(r => r.walletName))];
        for (const name of uniqueWalletNames) {
            if (!walletMap.has(name.toLowerCase())) {
                const newWallet = await prisma.wallet.create({
                    data: { name, userId, currency: "INR", color: "#1a3c5e" }
                });
                walletMap.set(name.toLowerCase(), newWallet.id);
                walletsCreated.push(name);
            }
        }

        // 2. Fetch all existing transactions in the date range for deduplication
        const existingTxs = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: earliest, lte: latest } // Window bounds
            },
            select: { id: true, date: true, amount: true, description: true }
        });

        // Soft-match deduplication: skip if ANY transaction exists on this date with this amount
        // Key: YYYY-MM-DD_Amount
        const existingMap = new Map<string, { id: string, description: string | null }>();
        for (const tx of existingTxs) {
            const key = `${tx.date.toISOString().split('T')[0]}_${tx.amount}`;
            existingMap.set(key, { id: tx.id, description: tx.description });
        }

        // 3. Prepare data for batch insert and batched updates
        let imported = 0;
        let skipped = 0;
        const importSessionId = `${source.toLowerCase()}_${Date.now()}`;

        const newTransactionsToCreate: any[] = [];
        const updatePromises: any[] = [];

        for (const row of normalizedRows) {
            const walletId = walletMap.get(row.walletName.toLowerCase())!;

            // SECURITY/CRASH PREVENT: Skip rows with amounts that exceed the 32-bit integer limit
            const MAX_INT32 = 2147483647;
            if (row.amount > MAX_INT32 || row.amount < -MAX_INT32) {
                console.warn(`Skipping row with invalid amount (overflow): ${row.amount}`);
                skipped++;
                continue;
            }

            const key = `${row.date.toISOString().split('T')[0]}_${row.amount}`;
            const existing = existingMap.get(key);

            if (existing) {
                // Enriching logic: append bank reference to manual entry if not already there
                const bankRef = row.note ? `[${source}: ${row.note}]` : "";
                if (bankRef && (!existing.description || !existing.description.includes(row.note))) {
                    const combinedDesc = existing.description
                        ? `${existing.description} ${bankRef}`.substring(0, 1000)
                        : bankRef;

                    updatePromises.push(
                        prisma.transaction.update({
                            where: { id: existing.id },
                            data: { description: combinedDesc }
                        })
                    );
                }
                skipped++;
            } else {
                newTransactionsToCreate.push({
                    date: row.date,
                    amount: row.amount,
                    category: row.category,
                    description: row.note || null,
                    source: source,
                    type: row.type,
                    walletId,
                    userId,
                });
                imported++;
            }
        }

        // 4. Execute Batch Writes
        if (newTransactionsToCreate.length > 0) {
            const CHUNK_SIZE = 500;
            for (let i = 0; i < newTransactionsToCreate.length; i += CHUNK_SIZE) {
                const chunk = newTransactionsToCreate.slice(i, i + CHUNK_SIZE);
                await prisma.transaction.createMany({
                    data: chunk,
                    skipDuplicates: true // Just in case
                });
            }
        }

        if (updatePromises.length > 0) {
            await prisma.$transaction(updatePromises);
        }

        // Store session id in a simple way — tag by import time
        // (Full rollback in next iteration)
        return { imported, skipped, walletsCreated, importSessionId };
    } catch (e: any) {
        return { imported: 0, skipped: 0, walletsCreated: [], error: e.message };
    }
}

// ── Rollback: delete all transactions from a specific import session ─────────
export async function rollbackSpendeeImport(sessionId: string): Promise<{ deleted: number; error?: string }> {
    try {
        const userId = await getUserAndEnsureExists();

        // sessionId is formatted as "source_timestamp" e.g. "axis_1700000000000"
        const parts = sessionId.split('_');
        if (parts.length < 2) throw new Error("Invalid session ID format");

        const sourceStr = parts[0].toUpperCase();
        const timestamp = parseInt(parts[1]);
        const since = new Date(timestamp);

        // Map string to ImportSource enum
        const source = (ImportSource as any)[sourceStr] || ImportSource.SPENDEE;

        const result = await prisma.transaction.deleteMany({
            where: {
                userId,
                source,
                createdAt: { gte: since },
            }
        });

        return { deleted: result.count };
    } catch (e: any) {
        return { deleted: 0, error: e.message };
    }
}

// ── Reset: wipe ALL financial data for the user (keep account) ──────────────
export async function resetAllUserData(): Promise<{
    transactions: number;
    budgets: number;
    wallets: number;
    error?: string;
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        const userId = user.id;

        // Delete in FK-safe order: transactions first (ref wallets + user),
        // then budgets, then wallets
        const [txResult, budgetResult] = await Promise.all([
            prisma.transaction.deleteMany({ where: { userId } }),
            prisma.budget.deleteMany({ where: { userId } }),
        ]);

        // Wallets must come after transactions (FK constraint)
        const walletResult2 = await prisma.wallet.deleteMany({ where: { userId } });

        return {
            transactions: txResult.count,
            budgets: budgetResult.count,
            wallets: walletResult2.count,
        };
    } catch (e: any) {
        return { transactions: 0, budgets: 0, wallets: 0, error: e.message };
    }
}
