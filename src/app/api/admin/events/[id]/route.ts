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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = (await params).id;
    const body = await req.json();
    const client = await db();

    await client.execute({
      sql: `UPDATE events SET 
              title = ?, status = ?, category = ?, date = ?, venue = ?, desc = ?, 
              prerequisites = ?, flags = ?, action_text = ?, tags = ?, form_id = ?
            WHERE id = ?`,
      args: [
        body.title,
        body.status,
        body.category,
        body.date,
        body.venue,
        body.desc,
        body.prerequisites || "",
        body.flags || "",
        body.action_text || "register_now",
        JSON.stringify(body.tags || []),
        body.form_id || null,
        id,
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = (await params).id;
    const client = await db();

    // The form_id is SET NULL on delete event, but if we delete the form, the event sets form_id NULL.
    // If we delete the event, we just delete the event. We might orphan forms, which is fine or we can delete forms.
    await client.execute({ sql: `DELETE FROM events WHERE id = ?`, args: [id] });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
