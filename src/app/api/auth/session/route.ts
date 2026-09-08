import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";

/* ------------------------------------------------------------------ */
/*  GET /api/auth/session                                              */
/*  Returns the current user from the JWT, or 401.                     */
/* ------------------------------------------------------------------ */

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      srn: payload.srn,
      name: payload.name,
      role: payload.role,
    },
  });
}
