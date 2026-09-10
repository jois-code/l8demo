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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ formId: string; responseId: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { formId, responseId } = await params;
    const client = await db();

    // Verify the response belongs to the form
    const resCheck = await client.execute({
      sql: `SELECT id FROM form_responses WHERE id = ? AND form_id = ?`,
      args: [responseId, formId]
    });

    if (resCheck.rows.length === 0) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    // Delete the response. (form_answers has ON DELETE CASCADE so they will be deleted too)
    await client.execute({
      sql: `DELETE FROM form_responses WHERE id = ?`,
      args: [responseId]
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete response:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
