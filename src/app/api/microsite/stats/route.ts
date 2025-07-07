import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MicrositeStats {
    totalNotionalTradedUsd: number;
    totalTrades: number;
    totalTokensTraded: number;
    totalChainsTraded: number;
}

// Interface for the parsed trade data from object_index.data
interface TradeData {
    tradeAmountUsd?: number | string;
    fromToken?: string;
    toToken?: string;
    toTokenSymbol?: string;
    fromSpecificChain?: string | null;
    toSpecificChain?: string | null;
    fromChain?: string;
    toChain?: string;
}

export async function GET() {
    try {
        // Define the cutoff time: 9 AM ET (UTC-4) = 1 PM UTC, June 4, 2025
        const cutoffTime = new Date("2025-06-04T13:00:00Z");

        // Fetch trades with cutoff
        const trades = await prisma.object_index.findMany({
            where: {
                data_type: "trade",
                event_timestamp: {
                    lte: cutoffTime, // Only include trades on or before 1 PM UTC
                },
            },
            select: {
                id: true,
                data: true,
            },
        });

        // Calculate total notional traded and total trades
        let totalNotionalTradedUsd = 0;
        const totalTrades = trades.length;

        // Calculate unique tokens and chains
        const tokenSet = new Set<string>();
        const chainSet = new Set<string>();

        trades.forEach((trade) => {
            let tradeData: TradeData;
            try {
                tradeData = JSON.parse(trade.data);
            } catch (e) {
                console.error(`Failed to parse trade data for id ${trade.id}:`, e);
                tradeData = {};
            }

            // Sum tradeAmountUsd
            totalNotionalTradedUsd += Number(tradeData.tradeAmountUsd) || 0;

            // Add tokens to set
            if (tradeData.toTokenSymbol) {
                tokenSet.add(tradeData.toTokenSymbol);
            }

            // Add chains to set
            if (tradeData.fromSpecificChain || tradeData.fromChain) {
                chainSet.add(tradeData.fromSpecificChain ?? tradeData.fromChain ?? "");
            }
            if (tradeData.toSpecificChain || tradeData.toChain) {
                chainSet.add(tradeData.toSpecificChain ?? tradeData.toChain ?? "");
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
        console.error('Error fetching stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}