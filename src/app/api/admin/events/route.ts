import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { cookies } from "next/headers";

async function requireAdmin() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await verifyToken(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const client = await db();
    const res = await client.execute("SELECT * FROM events ORDER BY date DESC");
    
    const events = res.rows.map((row: any) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    }));

    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = body.id || `evt_${Date.now()}`;
    const client = await db();

    await client.execute({
      sql: `INSERT INTO events (id, title, status, category, date, venue, desc, prerequisites, flags, action_text, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        body.title || "New Event",
        body.status || "PENDING",
        body.category || "Workshop",
        body.date || new Date().toISOString().slice(0, 10).replace(/-/g, "."),
        body.venue || "TBD",
        body.desc || "",
        body.prerequisites || "",
        body.flags || "",
        body.action_text || "register_now",
        JSON.stringify(body.tags || []),
      ],
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
