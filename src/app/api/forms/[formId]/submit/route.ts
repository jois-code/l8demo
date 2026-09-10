import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { cookies } from "next/headers";
import { appendFormSubmissionToSheet } from "@/lib/googleSheets";
import { getISTTimestamp } from "@/lib/date";

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

    // Fetch all sections to determine conditional visibility
    const sectionsRes = await client.execute({
      sql: `SELECT id, show_if_field_id, show_if_option_id FROM form_sections WHERE form_id = ? ORDER BY order_index ASC`,
      args: [formId]
    });

    const answerMap = new Map((answers || []).map((a: any) => [a.field_id, a.value]));

    // Determine active sections based on submitted answers
    const activeSectionIds = new Set<string>();
    for (const section of sectionsRes.rows) {
      const showIfField = section.show_if_field_id as string | null;
      const showIfOpt = section.show_if_option_id as string | null;

      if (!showIfField || !showIfOpt) {
        activeSectionIds.add(section.id as string);
      } else {
        const answer = answerMap.get(showIfField);
        if (Array.isArray(answer)) {
          if (answer.includes(showIfOpt)) {
            activeSectionIds.add(section.id as string);
          }
        } else if (answer === showIfOpt) {
          activeSectionIds.add(section.id as string);
        }
      }
    }

    // Fetch form fields to perform server-side validation
    const fieldsRes = await client.execute({
      sql: `SELECT id, section_id, label, type, required FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE form_id = ?)`,
      args: [formId]
    });
    
    const fields = fieldsRes.rows;
    const activeFieldIds = new Set<string>();

    for (const field of fields) {
      // If the field belongs to a conditional section that is not active, skip validation
      if (!activeSectionIds.has(field.section_id as string)) {
        continue;
      }
      activeFieldIds.add(field.id as string);

      const val = answerMap.get(field.id as string);
      const strVal = typeof val === "string" ? val.trim() : val;
      const isRequired = Boolean(field.required);

      if (isRequired) {
        if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === "string" && strVal === "")) {
          return NextResponse.json({ error: `"${field.label}" is a required field.` }, { status: 400 });
        }
      }

      if (strVal && typeof strVal === "string" && field.type !== "paragraph") {
        const lowerLabel = (field.label as string).toLowerCase();
        const lowerId = (field.id as string).toLowerCase();
        
        if (lowerLabel.includes("email") || lowerId.includes("email")) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
            return NextResponse.json({ error: `Please enter a valid email address for "${field.label}".` }, { status: 400 });
          }
        }
        
        if (lowerLabel.includes("phone") || lowerId.includes("phone") || lowerLabel.includes("mobile") || lowerLabel.includes("contact number") || lowerLabel.includes("whatsapp number") || lowerLabel.includes("whatsapp no")) {
          const digits = strVal.replace(/\D/g, "");
          if (digits.length < 10) {
            return NextResponse.json({ error: `Please enter a valid phone number for "${field.label}".` }, { status: 400 });
          }
        }
      }
    }

    // Filter answers to only save answers belonging to active fields
    const activeAnswers = Array.isArray(answers)
      ? answers.filter((ans: any) => activeFieldIds.has(ans.field_id))
      : [];

    // Upsert response
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
    for (const ans of activeAnswers) {
       queries.push({
         sql: `INSERT INTO form_answers (id, response_id, field_id, value) VALUES (?, ?, ?, ?)`,
         args: [`ans_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`, responseId, ans.field_id, JSON.stringify(ans.value)]
       });
    }
    
    if (queries.length > 0) {
      await client.batch(queries, "write");
    }

    // Sync to Google Sheets (awaited to ensure completion in serverless environments)
    try {
      await syncToGoogleSheets(client, formId, form.title as string, user, activeAnswers);
    } catch (err) {
      console.error("[sheets-sync] Background sync failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Build header + data row from form structure and sync to Sheets. */
async function syncToGoogleSheets(
  client: Awaited<ReturnType<typeof db>>,
  formId: string,
  formTitle: string,
  user: { srn: string; name: string },
  answers: { field_id: string; value: any }[]
) {
  // Fetch form structure for field labels, ordered by section then field
  const fieldsRes = await client.execute({
    sql: `
      SELECT f.id, f.label 
      FROM form_fields f
      JOIN form_sections s ON f.section_id = s.id
      WHERE s.form_id = ?
      ORDER BY s.order_index ASC, f.order_index ASC
    `,
    args: [formId],
  });

  const fields = fieldsRes.rows as unknown as { id: string; label: string }[];

  // Build answer map
  const answerMap = new Map<string, any>();
  for (const ans of answers) {
    answerMap.set(ans.field_id, ans.value);
  }

  // Avoid duplicate columns if the form already has Name/SRN fields
  const hasName = fields.some((f) => f.label.toLowerCase().includes("name"));
  const hasSRN = fields.some((f) => f.label.toLowerCase().includes("srn") || f.label.toLowerCase().includes("prn"));

  const headerPrefix = ["Timestamp"];
  const dataPrefix: (string | null)[] = [getISTTimestamp(new Date())];

  if (!hasName) {
    headerPrefix.push("System Name");
    dataPrefix.push(user.name);
  }
  if (!hasSRN) {
    headerPrefix.push("System SRN");
    dataPrefix.push(user.srn);
  }

  // Build header row
  const headerRow = [...headerPrefix, ...fields.map((f) => f.label)];

  // Build data row
  const dataRow: (string | null)[] = [
    ...dataPrefix,
    ...fields.map((f) => {
      const val = answerMap.get(f.id);
      if (val == null) return "";
      if (Array.isArray(val)) return val.join(", ");
      return String(val);
    }),
  ];

  await appendFormSubmissionToSheet(formTitle, headerRow, dataRow, user.srn);
}
