import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
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
    
    // Get all forms along with the number of responses
    const res = await client.execute(`
      SELECT f.id, f.title, f.description, f.is_published, f.allow_edit_responses, f.closes_at, f.created_at,
             (SELECT COUNT(*) FROM form_responses fr WHERE fr.form_id = f.id) as response_count
      FROM forms f
      ORDER BY f.created_at DESC
    `);
    
    return NextResponse.json({ forms: res.rows });
  } catch (err: any) {
    console.error("Failed to fetch admin forms:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
