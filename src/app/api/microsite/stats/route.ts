import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Instantiate Prisma Client
const prisma = new PrismaClient();

interface MicrositeStats {
    totalNotionalTradedUsd: number;
    totalTrades: number;
    totalTokensTraded: number;
    totalChainsTraded: number;
}

export async function GET() {
    try {
        // Define the cutoff time: 9 AM ET (UTC-4) = 1 PM UTC, June 4, 2025
        const cutoffTime = new Date("2025-06-04T13:00:00Z");

        // Fetch trades with cutoff
        const trades = await prisma.trades.findMany({
            where: {
                timestamp: {
                    lte: cutoffTime, // Only include trades on or before 1 PM UTC
                },
            },
            select: {
                id: true,
                trade_amount_usd: true,
                to_token_symbol: true,
                from_specific_chain: true,
                to_specific_chain: true,
                from_chain: true,
                to_chain: true,
            },
        });

        // Calculate total notional traded and total trades
        let totalNotionalTradedUsd = 0;
        const totalTrades = trades.length;

        // Calculate unique tokens and chains
        const tokenSet = new Set<string>();
        const chainSet = new Set<string>();

        trades.forEach((trade) => {
            // Sum trade_amount_usd
            totalNotionalTradedUsd += Number(trade.trade_amount_usd) || 0;

            // Add token to set
            if (trade.to_token_symbol) {
                tokenSet.add(trade.to_token_symbol);
            }

            // Add chains to set
            if (trade.from_specific_chain || trade.from_chain) {
                chainSet.add(trade.from_specific_chain ?? trade.from_chain ?? "");
            }
            if (trade.to_specific_chain || trade.to_chain) {
                chainSet.add(trade.to_specific_chain ?? trade.to_chain ?? "");
            }
        });

        const stats: MicrositeStats = {
            totalNotionalTradedUsd,
            totalTrades,
            totalTokensTraded: tokenSet.size,
            totalChainsTraded: chainSet.size,
        };

        return NextResponse.json(stats, { status: 200 });
    } catch (error) {
        console.error("Error fetching stats:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}