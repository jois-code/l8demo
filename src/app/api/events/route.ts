import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const client = await db();
    const result = await client.execute(`SELECT * FROM events ORDER BY date DESC`);
    
    // Parse tags JSON string back to array
    const events = result.rows.map((row: any) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    }));

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("[api/events]", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
