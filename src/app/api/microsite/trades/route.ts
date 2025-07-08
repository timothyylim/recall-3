import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Instantiate Prisma Client
const prisma = new PrismaClient();

// Define the MicrositeTrades interface
interface MicrositeTrades {
    id: string;
    agentId: string;
    fromAmount: number;
    toAmount: number;
    fromTicker: string;
    toTicker: string;
    reason: string;
    notionalUsd: number;
    timestamp: string;
    fromChain: string;
    toChain: string;
    fromTokenSymbol: string;
    toTokenSymbol: string;
    fromSpecificChain: string | null;
    toSpecificChain: string | null;
    micrositeId: string;
}

export async function GET() {
    try {
        // Get competition ID from environment variables
        const competitionId = process.env.COMPETITION_ID;

        if (!competitionId) {
            throw new Error("COMPETITION_ID not found in environment variables");
        }

        const trades = await prisma.trades.findMany({
            where: {
                competition_id: competitionId,
            },
            select: {
                id: true,
                agent_id: true,
                from_amount: true,
                to_amount: true,
                from_token: true,
                to_token: true,
                reason: true,
                trade_amount_usd: true,
                timestamp: true,
                from_chain: true,
                to_chain: true,
                from_token_symbol: true,
                to_token_symbol: true,
                from_specific_chain: true,
                to_specific_chain: true,
                agents: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        const data: MicrositeTrades[] = trades.map((trade) => ({
            id: trade.id,
            agentId: trade.agent_id,
            fromAmount: Number(trade.from_amount) || 0,
            toAmount: Number(trade.to_amount) || 0,
            fromTicker: trade.from_token ?? "",
            toTicker: trade.to_token ?? "",
            reason: trade.reason ?? "",
            notionalUsd: Number(trade.trade_amount_usd) || 0,
            timestamp: trade.timestamp?.toISOString() ?? new Date().toISOString(),
            fromChain: trade.from_chain ?? "",
            toChain: trade.to_chain ?? "",
            fromTokenSymbol: trade.from_token_symbol ?? "",
            toTokenSymbol: trade.to_token_symbol ?? "",
            fromSpecificChain: trade.from_specific_chain ?? null,
            toSpecificChain: trade.to_specific_chain ?? null,
            micrositeId: trade.agents?.id ?? "",
        }));

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error("Error fetching trades:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}