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
  try {
    const formId = (await params).formId;
    const client = await db();

    const formRes = await client.execute({ sql: `SELECT * FROM forms WHERE id = ?`, args: [formId] });
    if (formRes.rows.length === 0) return NextResponse.json({ error: "Form not found" }, { status: 404 });
    const form = formRes.rows[0];

    const sectionsRes = await client.execute({ sql: `SELECT * FROM form_sections WHERE form_id = ? ORDER BY order_index ASC`, args: [formId] });
    const fieldsRes = await client.execute({ sql: `SELECT * FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE form_id = ?) ORDER BY order_index ASC`, args: [formId] });
    const optionsRes = await client.execute({ sql: `SELECT * FROM form_field_options WHERE field_id IN (SELECT id FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE form_id = ?)) ORDER BY order_index ASC`, args: [formId] });

    const sections = sectionsRes.rows.map((s: any) => {
      const sFields = fieldsRes.rows.filter((f: any) => f.section_id === s.id).map((f: any) => {
        const fOptions = optionsRes.rows.filter((o: any) => o.field_id === f.id).map((o: any) => ({
          id: o.id,
          text: o.text,
          next_section_id: o.next_section_id,
          order_index: o.order_index
        }));
        return {
          id: f.id,
          type: f.type,
          label: f.label,
          required: Boolean(f.required),
          order_index: f.order_index,
          options: fOptions
        };
      });
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        order_index: s.order_index,
        show_if_field_id: s.show_if_field_id || null,
        show_if_option_id: s.show_if_option_id || null,
        fields: sFields
      };
    });

    return NextResponse.json({
      id: form.id,
      title: form.title,
      description: form.description,
      is_published: Boolean(form.is_published),
      allow_edit_responses: Boolean(form.allow_edit_responses),
      closes_at: form.closes_at,
      sections: sections
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formId = (await params).formId;
    const body = await req.json();
    const client = await db();

    // Use a transaction/batch
    const queries = [];
    
    // Upsert Form
    queries.push({
      sql: `INSERT INTO forms (id, title, description, is_published, allow_edit_responses, closes_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              is_published = excluded.is_published,
              allow_edit_responses = excluded.allow_edit_responses,
              closes_at = excluded.closes_at`,
      args: [
        formId,
        body.title || "Untitled Form",
        body.description || "",
        body.is_published ? 1 : 0,
        body.allow_edit_responses ? 1 : 0,
        body.closes_at || null
      ]
    });

    // Delete existing sections (which cascades down if we had foreign keys enabled. 
    // libSQL disables foreign keys by default, so we should delete manually to be safe)
    queries.push({ sql: `DELETE FROM form_answers WHERE field_id IN (SELECT id FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE form_id = ?))`, args: [formId] });
    queries.push({ sql: `DELETE FROM form_field_options WHERE field_id IN (SELECT id FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE form_id = ?))`, args: [formId] });
    queries.push({ sql: `DELETE FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE form_id = ?)`, args: [formId] });
    queries.push({ sql: `DELETE FROM form_sections WHERE form_id = ?`, args: [formId] });

    // Insert Sections
    if (Array.isArray(body.sections)) {
      body.sections.forEach((s: any, sIdx: number) => {
        queries.push({
          sql: `INSERT INTO form_sections (id, form_id, title, description, order_index, show_if_field_id, show_if_option_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [s.id, formId, s.title || "", s.description || "", sIdx, s.show_if_field_id || null, s.show_if_option_id || null]
        });

        if (Array.isArray(s.fields)) {
          s.fields.forEach((f: any, fIdx: number) => {
            queries.push({
              sql: `INSERT INTO form_fields (id, section_id, type, label, required, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
              args: [f.id, s.id, f.type, f.label || "Untitled", f.required ? 1 : 0, fIdx]
            });

            if (Array.isArray(f.options)) {
              f.options.forEach((o: any, oIdx: number) => {
                queries.push({
                  sql: `INSERT INTO form_field_options (id, field_id, text, next_section_id, order_index) VALUES (?, ?, ?, ?, ?)`,
                  args: [o.id, f.id, o.text || "Option", o.next_section_id || null, oIdx]
                });
              });
            }
          });
        }
      });
    }

    await client.batch(queries, "write");

    // Also update the event's form_id if the client passed an eventId in the query parameters
    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");
    if (eventId) {
       await client.execute({ sql: `UPDATE events SET form_id = ? WHERE id = ?`, args: [formId, eventId] });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
