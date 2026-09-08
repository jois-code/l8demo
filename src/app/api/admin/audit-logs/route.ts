import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { db } from "@/lib/db";

/* ------------------------------------------------------------------ */
/*  GET /api/admin/audit-logs                                          */
/*  Returns the 100 most recent audit logs. Admin-only.                */
/* ------------------------------------------------------------------ */

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await db();
  const result = await client.execute(
    `SELECT id, srn, ip, user_type, action, detail, created_at
     FROM audit_logs
     ORDER BY created_at DESC
     LIMIT 100`,
  );

  return NextResponse.json({ logs: result.rows });
}
