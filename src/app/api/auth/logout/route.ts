import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/jwt";

/* ------------------------------------------------------------------ */
/*  POST /api/auth/logout                                              */
/*  Clear the session cookie.                                          */
/* ------------------------------------------------------------------ */

export async function POST() {
  const res = NextResponse.json({ success: true });

  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return res;
}
