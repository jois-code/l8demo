import { db } from "./db";
import { EVENTS } from "../app/events/events-data";

async function main() {
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

    console.log("Successfully seeded events!");
  } catch (error) {
    console.error("Failed to seed events:", error);
  }
}

main();
