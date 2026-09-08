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

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const client = await db();

    // Fetch total users
    const usersRes = await client.execute("SELECT COUNT(*) as count FROM users");
    const totalUsers = usersRes.rows[0]?.count || 0;

    // Fetch total events
    const eventsRes = await client.execute("SELECT COUNT(*) as count FROM events");
    const totalEvents = eventsRes.rows[0]?.count || 0;

    // Fetch total responses
    const responsesRes = await client.execute("SELECT COUNT(*) as count FROM form_responses");
    const totalResponses = responsesRes.rows[0]?.count || 0;

    // Fetch recent IPs from audit_logs
    const ipRes = await client.execute(`
      SELECT ip, COUNT(*) as hits, MAX(created_at) as last_seen 
      FROM audit_logs 
      WHERE ip IS NOT NULL
      GROUP BY ip 
      ORDER BY last_seen DESC 
      LIMIT 10
    `);

    // Fetch recent activity stream
    const activityRes = await client.execute(`
      SELECT 'login' as type, srn, action, ip, created_at FROM audit_logs 
      UNION ALL
      SELECT 'response' as type, user_srn as srn, 'submitted form ' || form_id as action, NULL as ip, submitted_at as created_at FROM form_responses
      ORDER BY created_at DESC
      LIMIT 15
    `);

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalEvents,
        totalResponses
      },
      ips: ipRes.rows,
      activity: activityRes.rows
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
