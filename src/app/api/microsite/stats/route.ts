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
        // Get competition ID from environment variables
        const competitionId = process.env.COMPETITION_ID;

        if (!competitionId) {
            throw new Error("COMPETITION_ID not found in environment variables");
        }

        // Fetch trades with competition ID and cutoff
        const trades = await prisma.trades.findMany({
            where: {
                competition_id: competitionId,
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