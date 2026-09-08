import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { db } from "@/lib/db";

/* ------------------------------------------------------------------ */
/*  PATCH /api/admin/users/[srn]/role                                  */
/*  Toggle a user's role between member ↔ admin. Admin-only.           */
/* ------------------------------------------------------------------ */

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ srn: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { srn } = await params;
  const targetSrn = srn.toUpperCase();

  // Prevent self-demotion
  if (targetSrn === payload.srn) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 },
    );
  }

  const client = await db();

  // Get current role
  const row = await client.execute({
    sql: `SELECT role FROM users WHERE srn = ?`,
    args: [targetSrn],
  });

  if (row.rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentRole = row.rows[0].role as string;
  const newRole = currentRole === "admin" ? "member" : "admin";

  await client.execute({
    sql: `UPDATE users SET role = ? WHERE srn = ?`,
    args: [newRole, targetSrn],
  });

  return NextResponse.json({
    success: true,
    srn: targetSrn,
    role: newRole,
  });
}
