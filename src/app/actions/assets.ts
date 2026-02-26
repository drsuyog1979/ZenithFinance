"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { AssetType, GainType } from "@prisma/client";
import { differenceInDays } from "date-fns";

async function getUserId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    return user.id;
}

export interface AssetTransaction {
    symbol: string;
    isin?: string;
    type: "BUY" | "SELL";
    assetType: AssetType;
    date: Date;
    pricePaise: number;
    units: number;
}

/**
 * Process a batch of asset transactions using FIFO logic.
 * Transactions should be sorted by date before calling this.
 */
export async function processAssetImports(transactions: AssetTransaction[]) {
    const userId = await getUserId();

    // Group by symbol to process independently
    const grouped = transactions.reduce((acc, tx) => {
        if (!acc[tx.symbol]) acc[tx.symbol] = [];
        acc[tx.symbol].push(tx);
        return acc;
    }, {} as Record<string, AssetTransaction[]>);

    let summary = { createdLots: 0, createdSales: 0, errors: 0 };

    for (const symbol in grouped) {
        const symbolTxs = grouped[symbol].sort((a, b) => a.date.getTime() - b.date.getTime());

        for (const tx of symbolTxs) {
            try {
                if (tx.type === "BUY") {
                    await prisma.assetLot.create({
                        data: {
                            symbol: tx.symbol,
                            isin: tx.isin,
                            assetType: tx.assetType,
                            quantityUnits: tx.units,
                            remainingUnits: tx.units,
                            buyPricePaise: tx.pricePaise,
                            buyDate: tx.date,
                            userId,
                        }
                    });
                    summary.createdLots++;
                } else {
                    // SELL logic - FIFO
                    let unitsToSell = tx.units;

                    // Find earliest available lots
                    const lots = await prisma.assetLot.findMany({
                        where: {
                            userId,
                            symbol: tx.symbol,
                            remainingUnits: { gt: 0 }
                        },
                        orderBy: { buyDate: "asc" }
                    });

                    for (const lot of lots) {
                        if (unitsToSell <= 0) break;

                        const unitsFromThisLot = Math.min(lot.remainingUnits, unitsToSell);

                        // Calculate holding days
                        const holdingDays = differenceInDays(tx.date, lot.buyDate);

                        // Determine Gain Type
                        let gainType: GainType = GainType.STCG;
                        if (["STOCK", "EQUITY_MF", "ETF"].includes(lot.assetType)) {
                            if (holdingDays > 365) gainType = GainType.LTCG;
                        } else if (["DEBT_MF", "BOND"].includes(lot.assetType)) {
                            if (holdingDays > 730) gainType = GainType.LTCG;
                        }

                        // Gain: (SellPrice - BuyPrice) * Units
                        const gainAmount = Math.round((tx.pricePaise - lot.buyPricePaise) * unitsFromThisLot);

                        // Create AssetSale record
                        await prisma.assetSale.create({
                            data: {
                                symbol: tx.symbol,
                                isin: tx.isin,
                                assetType: lot.assetType,
                                quantityUnits: unitsFromThisLot,
                                sellPricePaise: tx.pricePaise,
                                sellDate: tx.date,
                                gainType,
                                holdingDays,
                                gainAmountPaise: gainAmount,
                                lotId: lot.id,
                                userId,
                            }
                        });

                        // Update lot remaining units
                        await prisma.assetLot.update({
                            where: { id: lot.id },
                            data: { remainingUnits: lot.remainingUnits - unitsFromThisLot }
                        });

                        unitsToSell -= unitsFromThisLot;
                        summary.createdSales++;
                    }

                    if (unitsToSell > 0) {
                        console.warn(`Insufficient units for sale of ${tx.symbol}. ${unitsToSell} units remain unmapped.`);
                    }
                }
            } catch (e) {
                console.error(`Error processing ${tx.symbol}:`, e);
                summary.errors++;
            }
        }
    }
    return summary;
}

/**
 * Fetch data for Capital Gains Dashboard
 */
export async function getCapitalGainsSummary() {
    const userId = await getUserId();

    const sales = await prisma.assetSale.findMany({
        where: { userId },
        orderBy: { sellDate: "desc" }
    });

    let stcg = 0;
    let ltcg = 0;
    let loss = 0;

    sales.forEach(s => {
        if (s.gainAmountPaise > 0) {
            if (s.gainType === "STCG") stcg += s.gainAmountPaise;
            else ltcg += s.gainAmountPaise;
        } else {
            loss += Math.abs(s.gainAmountPaise);
        }
    });

    const assetWise = sales.reduce((acc, s) => {
        const key = `${s.symbol} (${s.assetType})`;
        if (!acc[key]) acc[key] = { symbol: s.symbol, type: s.assetType, gain: 0 };
        acc[key].gain += s.gainAmountPaise;
        return acc;
    }, {} as Record<string, { symbol: string, type: AssetType, gain: number }>);

    return {
        summary: {
            stcg: stcg / 100,
            ltcg: ltcg / 100,
            loss: loss / 100,
            net: (stcg + ltcg - loss) / 100
        },
        assetWise: Object.values(assetWise),
        sales: sales.map(s => ({
            ...s,
            gain: s.gainAmountPaise / 100,
            sellPrice: s.sellPricePaise / 100,
            date: s.sellDate.toISOString()
        }))
    };
}

/**
 * Suggest tax harvesting by finding lots with unrealised losses.
 */
export async function getTaxHarvestingSuggestions() {
    const userId = await getUserId();

    // This would require current market prices. For now, we compare buyPrice with "lastSellPrice"
    // or just list lots with high potential losses if we had an external price feed.
    // Placeholder logic: List all lots that are currently in a loss OR suggest booking profits for LTCG under 1.25L.

    const openLots = await prisma.assetLot.findMany({
        where: {
            userId,
            remainingUnits: { gt: 0 }
        }
    });

    // In a real app, we'd fetch prices here. 
    // Return open lots for now etc.
    return openLots;
}
