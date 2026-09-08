import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/* ------------------------------------------------------------------ */
/*  JWT helpers (Edge-compatible via `jose`)                            */
/* ------------------------------------------------------------------ */

export interface L8TokenPayload extends JWTPayload {
  srn: string;
  name: string;
  role: "admin" | "member";
}

function getSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(raw);
}

/** Cookie name used for the session token. */
export const COOKIE_NAME = "l8_session";

/** Sign a JWT. Expires in 7 days. */
export async function signToken(payload: {
  srn: string;
  name: string;
  role: "admin" | "member";
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

/** Verify a JWT. Returns the payload or `null` if invalid / expired. */
export async function verifyToken(
  token: string,
): Promise<L8TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as L8TokenPayload;
  } catch {
    return null;
  }
}
