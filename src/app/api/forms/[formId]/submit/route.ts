import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { cookies } from "next/headers";

async function requireAuth() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function POST(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formId = (await params).formId;
    const body = await req.json();
    const answers = body.answers; // array of { field_id, value }
    const client = await db();

    // Check if form is open
    const formRes = await client.execute({ sql: `SELECT * FROM forms WHERE id = ?`, args: [formId] });
    if (formRes.rows.length === 0) return NextResponse.json({ error: "Form not found" }, { status: 404 });
    const form = formRes.rows[0];

    if (!form.is_published) return NextResponse.json({ error: "Form is not published" }, { status: 403 });
    if (form.closes_at && new Date() > new Date((form.closes_at as string).endsWith('Z') ? form.closes_at as string : form.closes_at + 'Z')) {
      return NextResponse.json({ error: "Form is closed" }, { status: 403 });
    }

    // Upsert response
    // Actually sqlite ON CONFLICT for (form_id, user_srn) requires standard upsert
    let responseId = `resp_${Date.now()}`;
    const existingRes = await client.execute({ sql: `SELECT id FROM form_responses WHERE form_id = ? AND user_srn = ?`, args: [formId, user.srn] });
    
    if (existingRes.rows.length > 0) {
       if (!form.allow_edit_responses) {
         return NextResponse.json({ error: "You have already submitted this form and editing is disabled." }, { status: 403 });
       }
       responseId = existingRes.rows[0].id as string;
    } else {
       await client.execute({
         sql: `INSERT INTO form_responses (id, form_id, user_srn, submitted_at) VALUES (?, ?, ?, datetime('now'))`,
         args: [responseId, formId, user.srn]
       });
    }

    // Delete existing answers if updating
    if (existingRes.rows.length > 0) {
       await client.execute({ sql: `DELETE FROM form_answers WHERE response_id = ?`, args: [responseId] });
    }

    // Insert new answers
    const queries = [];
    if (Array.isArray(answers)) {
      for (const ans of answers) {
         queries.push({
           sql: `INSERT INTO form_answers (id, response_id, field_id, value) VALUES (?, ?, ?, ?)`,
           args: [`ans_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`, responseId, ans.field_id, JSON.stringify(ans.value)]
         });
      }
    }
    
    if (queries.length > 0) {
      await client.batch(queries, "write");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
