import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { cookies } from "next/headers";

async function requireAuth() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formId = (await params).formId;
    const client = await db();

    const respRes = await client.execute({
      sql: `SELECT id FROM form_responses WHERE form_id = ? AND user_srn = ?`,
      args: [formId, user.srn]
    });

    if (respRes.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const responseId = respRes.rows[0].id;
    const answersRes = await client.execute({
      sql: `SELECT field_id, value FROM form_answers WHERE response_id = ?`,
      args: [responseId]
    });

    const answers = answersRes.rows.map((r: any) => ({
      field_id: r.field_id,
      value: r.value ? JSON.parse(r.value) : null
    }));

    return NextResponse.json({ answers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
