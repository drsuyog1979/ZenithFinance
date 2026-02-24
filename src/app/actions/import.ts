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

// ── Category normalisation map (Spendee → Zenith) ──────────────────────────
const CATEGORY_MAP: Record<string, string> = {
    "food & drinks": "Food & Dining",
    "food & dining": "Food & Dining",
    "food": "Food & Dining",
    "restaurants": "Food & Dining",
    "groceries": "Food & Dining",
    "transport": "Transport",
    "transportation": "Transport",
    "taxi": "Transport",
    "travel": "Transport",
    "shopping": "Shopping",
    "clothes": "Shopping",
    "electronics": "Shopping",
    "housing": "Housing",
    "rent": "Housing",
    "home": "Housing",
    "bills & utilities": "Utilities",
    "utilities": "Utilities",
    "bills": "Utilities",
    "health": "Health",
    "healthcare": "Health",
    "medical": "Health",
    "pharmacy": "Health",
    "entertainment": "Entertainment",
    "movies": "Entertainment",
    "sports": "Entertainment",
    "income": "Income",
    "salary": "Income",
    "wages": "Income",
    "freelance": "Income",
    "investment": "Investment",
    "investments": "Investment",
    "savings": "Investment",
    "transfer": "Transfer",
    "transfers": "Transfer",
    "education": "Education",
    "personal care": "Personal Care",
    "beauty": "Personal Care",
    "gifts": "Gifts",
    "donations": "Gifts",
    "insurance": "Insurance",
    "taxes": "Taxes",
    "subscriptions": "Entertainment",
    "business": "Income",
    "other": "Other",
    "others": "Other",
};

function normaliseCategory(raw: string): string {
    const key = raw.trim().toLowerCase();
    return CATEGORY_MAP[key] || raw.trim(); // keep original if no match
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
        const header = lines[0].replace(/^\uFEFF/, "").split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());

        const col = (name: string) => {
            const i = header.findIndex(h => h.includes(name));
            return i;
        };

        const dateIdx = col("date");
        const catIdx = col("category");
        const amtIdx = col("amount");
        const currIdx = col("currency");
        const noteIdx = col("note");
        const walletIdx = header.findIndex(h => h === "wallet" || h.includes("wallet name") || h.includes("wallet_name") || h === "account");
        const typeIdx = col("type");

        if (dateIdx < 0 || amtIdx < 0) {
            return { rows: [], walletNames: [], categories: [], dateRange: null, error: "Could not find required columns (Date, Amount). Please make sure you exported from Spendee correctly." };
        }

        const rows: SpendeeRow[] = [];
        const walletSet = new Set<string>();
        const categorySet = new Set<string>();
        let earliest: Date | null = null;
        let latest: Date | null = null;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // CSV-aware split (handles quoted fields with commas)
            const cols = parseCSVLine(line);

            const rawDate = cols[dateIdx]?.trim() || "";
            const rawAmt = cols[amtIdx]?.trim() || "0";
            const rawCat = catIdx >= 0 ? cols[catIdx]?.trim() || "Other" : "Other";
            const rawCurr = currIdx >= 0 ? cols[currIdx]?.trim() || "INR" : "INR";
            const rawNote = noteIdx >= 0 ? cols[noteIdx]?.trim() || "" : "";
            const rawWallet = walletIdx >= 0 ? cols[walletIdx]?.trim() || "Spendee Import" : "Spendee Import";
            const rawType = typeIdx >= 0 ? cols[typeIdx]?.trim() || "" : "";

            if (!rawDate || rawDate.toLowerCase() === "date") continue;

            const date = parseSpendeeDate(rawDate);
            if (!date || isNaN(date.getTime())) continue;

            const amtFloat = parseFloat(rawAmt.replace(/[^0-9.\-]/g, ""));
            if (isNaN(amtFloat)) continue;

            const type = inferType(rawType, amtFloat);
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
    // Spendee uses formats like "2024-01-15" or "15/01/2024" or "2024-01-15 10:30:00"
    const cleaned = raw.trim().split(" ")[0]; // strip time if present
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;

    // Try DD/MM/YYYY
    const parts = cleaned.split(/[\/\-]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return null;
}

// ── Commit import to database ───────────────────────────────────────────────
export interface ImportResult {
    imported: number;
    skipped: number;
    walletsCreated: string[];
    error?: string;
    importSessionId?: string;
}

export async function commitSpendeeImport(rows: SpendeeRow[]): Promise<ImportResult> {
    try {
        const userId = await getUserAndEnsureExists();

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

        // 2. Bulk insert with duplicate skipping (upsert strategy)
        let imported = 0;
        let skipped = 0;

        // Use a session ID to allow rollback
        const importSessionId = `spendee_${Date.now()}`;

        for (const row of rows) {
            const walletId = walletMap.get(row.walletName.toLowerCase())!;
            try {
                await prisma.transaction.create({
                    data: {
                        date: row.date,
                        amount: row.amount,
                        category: row.category,
                        description: row.note || null,
                        source: ImportSource.SPENDEE,
                        type: row.type,
                        walletId,
                        userId,
                    }
                });
                imported++;
            } catch (e: any) {
                // Unique constraint violation = duplicate → skip
                if (e.code === "P2002") {
                    skipped++;
                } else {
                    throw e;
                }
            }
        }

        // Store session id in a simple way — tag by import time
        // (Full rollback in next iteration)
        return { imported, skipped, walletsCreated, importSessionId };
    } catch (e: any) {
        return { imported: 0, skipped: 0, walletsCreated: [], error: e.message };
    }
}

// ── Rollback: delete all SPENDEE transactions created after a timestamp ─────
export async function rollbackSpendeeImport(afterTimestamp: string): Promise<{ deleted: number; error?: string }> {
    try {
        const userId = await getUserAndEnsureExists();
        const since = new Date(parseInt(afterTimestamp.replace("spendee_", "")));

        const result = await prisma.transaction.deleteMany({
            where: {
                userId,
                source: ImportSource.SPENDEE,
                createdAt: { gte: since },
            }
        });

        return { deleted: result.count };
    } catch (e: any) {
        return { deleted: 0, error: e.message };
    }
}
