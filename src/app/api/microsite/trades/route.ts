import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define the MicrositeTrades interface
interface MicrositeTrades {
    id: string; // From object_index.id
    agentId: string; // From object_index.agent_id
    fromAmount: number; // From object_index.data.fromAmount
    toAmount: number; // From object_index.data.toAmount
    fromTicker: string; // From object_index.data.fromToken
    toTicker: string; // From object_index.data.toToken
    reason: string; // From object_index.data.reason
    notionalUsd: number; // From object_index.data.tradeAmountUsd
    timestamp: string; // From object_index.event_timestamp (ISO string)
    fromChain: string; // From object_index.data.fromChain
    toChain: string; // From object_index.data.toChain
    fromTokenSymbol: string; // From object_index.data.fromTokenSymbol
    toTokenSymbol: string; // From object_index.data.toTokenSymbol
    fromSpecificChain: string | null; // From object_index.data.fromSpecificChain
    toSpecificChain: string | null; // From object_index.data.toSpecificChain
    micrositeId: string; // From agents.id
}

// Define the type for the trade data stored in object_index.data (JSON)
interface TradeData {
    fromAmount?: number | string;
    toAmount?: number | string;
    fromToken?: string;
    toToken?: string;
    reason?: string;
    tradeAmountUsd?: number | string;
    fromChain?: string;
    toChain?: string;
    fromTokenSymbol?: string;
    toTokenSymbol?: string;
    fromSpecificChain?: string | null;
    toSpecificChain?: string | null;
}

// Define the type for the Prisma query result
interface TradeQueryResult {
    id: string;
    agent_id: string | null;
    data: string;
    event_timestamp: Date | null;
    agents: {
        id: string;
    } | null;
}

export async function GET() {
    try {
        const trades = await prisma.object_index.findMany({
            where: {
                data_type: "trade",
            },
            select: {
                id: true,
                agent_id: true,
                data: true,
                event_timestamp: true,
                agents: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        const data: MicrositeTrades[] = trades.map((trade: TradeQueryResult) => {
            // Parse the data field (assuming it's a JSON string)
            let tradeData: TradeData;
            try {
                tradeData = JSON.parse(trade.data);
            } catch (e) {
                console.error(`Failed to parse trade data for id ${trade.id}:`, e);
                tradeData = {};
            }

            return {
                id: trade.id,
                agentId: trade.agent_id ?? "",
                fromAmount: Number(tradeData.fromAmount) || 0,
                toAmount: Number(tradeData.toAmount) || 0,
                fromTicker: tradeData.fromToken ?? "",
                toTicker: tradeData.toToken ?? "",
                reason: tradeData.reason ?? "",
                notionalUsd: Number(tradeData.tradeAmountUsd) || 0,
                timestamp: trade.event_timestamp?.toISOString() ?? new Date().toISOString(),
                fromChain: tradeData.fromChain ?? "",
                toChain: tradeData.toChain ?? "",
                fromTokenSymbol: tradeData.fromTokenSymbol ?? "",
                toTokenSymbol: tradeData.toTokenSymbol ?? "",
                fromSpecificChain: tradeData.fromSpecificChain ?? null,
                toSpecificChain: tradeData.toSpecificChain ?? null,
                micrositeId: trade.agents?.id ?? "",
            };
        });

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error("Error fetching trades:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}