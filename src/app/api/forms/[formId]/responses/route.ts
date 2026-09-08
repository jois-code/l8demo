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

export async function GET(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formId = (await params).formId;
    const client = await db();

    const res = await client.execute({
      sql: `SELECT 
              r.id as response_id, 
              r.submitted_at, 
              r.user_srn, 
              u.name, 
              u.email,
              a.field_id,
              a.value
            FROM form_responses r
            JOIN users u ON r.user_srn = u.srn
            LEFT JOIN form_answers a ON r.id = a.response_id
            WHERE r.form_id = ?
            ORDER BY r.submitted_at ASC`,
      args: [formId]
    });

    const responsesMap = new Map();

    res.rows.forEach((row: any) => {
      if (!responsesMap.has(row.response_id)) {
        responsesMap.set(row.response_id, {
          id: row.response_id,
          submitted_at: row.submitted_at,
          respondent: {
            srn: row.user_srn,
            name: row.name,
            email: row.email
          },
          answers: []
        });
      }

      if (row.field_id) {
        responsesMap.get(row.response_id).answers.push({
          field_id: row.field_id,
          value: row.value ? JSON.parse(row.value) : null
        });
      }
    });

    return NextResponse.json({ responses: Array.from(responsesMap.values()) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
