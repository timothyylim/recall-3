import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const trades = await prisma.trades.findMany(); // Use model name directly
        console.log("Fetched trades:", trades); // Log to debug
        return NextResponse.json(trades, { status: 200 });
    } catch (error) {
        console.error("Error fetching trades:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}