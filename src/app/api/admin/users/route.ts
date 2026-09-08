import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { db } from "@/lib/db";

/* ------------------------------------------------------------------ */
/*  GET /api/admin/users                                               */
/*  Returns all users. Admin-only.                                     */
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
    `SELECT srn, prn, name, role, program, branch, section, semester, email, created_at, last_login
     FROM users
     ORDER BY last_login DESC`,
  );

  return NextResponse.json({ users: result.rows });
}
