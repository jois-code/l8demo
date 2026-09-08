import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EVENTS } from "@/app/events/events-data";

export async function GET() {
  try {
    const client = await db();

    for (const event of EVENTS) {
      await client.execute({
        sql: `INSERT INTO events (id, title, status, category, date, venue, desc, prerequisites, flags, action_text, tags)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                status = excluded.status,
                category = excluded.category,
                date = excluded.date,
                venue = excluded.venue,
                desc = excluded.desc,
                prerequisites = excluded.prerequisites,
                flags = excluded.flags,
                action_text = excluded.action_text,
                tags = excluded.tags`,
        args: [
          event.id,
          event.title,
          event.status,
          event.category,
          event.date,
          event.venue,
          event.desc,
          event.prerequisites || null,
          event.flags || null,
          event.actionText,
          JSON.stringify(event.tags),
        ],
      });
    }

    return NextResponse.json({ success: true, count: EVENTS.length });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
