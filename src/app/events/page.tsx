import type { Metadata } from "next";
import EventsClient from "./events-client";
import { db } from "@/lib/db";
import { L8Event } from "./events-data";

export const metadata: Metadata = {
  title: "Events · Layer8 — PES University, ECC",
  description:
    "Layer8 events — CTFs, workshops and seminars, live and archived, with venue, prerequisites and how to take part.",
};

export default async function EventsPage() {
  const client = await db();
  const result = await client.execute(`SELECT * FROM events ORDER BY date DESC`);
  
  const events: L8Event[] = result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    category: row.category,
    date: row.date,
    venue: row.venue,
    desc: row.desc,
    prerequisites: row.prerequisites || "",
    flags: row.flags || "",
    actionText: row.action_text || "view_logs",
    tags: row.tags ? JSON.parse(row.tags) : [],
    form_id: row.form_id || null,
  }));

  return <EventsClient initialEvents={events} />;
}
