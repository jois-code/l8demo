import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, COOKIE_NAME } from "@/lib/jwt";


const LOGIN_URL =
  "https://www.pesuacademy.com/MAcademy/mobile/mobilelogin/auth";

const DISPATCHER_URL =
  "https://www.pesuacademy.com/MAcademy/mobile/dispatcher";

/** Extract client IP from request headers. */
function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Check if SRN is in the ADMIN_SRNS env var. */
function isBootstrapAdmin(srn: string): boolean {
  const admins = process.env.ADMIN_SRNS || "";
  return admins
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .includes(srn.toUpperCase());
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  try {
    /* ── 1. Parse incoming JSON ─────────────────────────────────── */
    const { userName, password } = (await req.json()) as {
      userName?: string;
      password?: string;
    };

    if (!userName || !password) {
      return NextResponse.json(
        { error: "userName and password are required" },
        { status: 400 },
      );
    }

    /* ── 2. Build multipart/form-data for PESU Academy ──────────── */
    const loginForm = new FormData();
    loginForm.append("userName", userName);
    loginForm.append("password", password);
    loginForm.append("j_appId", "YES");
    loginForm.append("instId", "1,6,7,14");

    /* ── 3. Forward to PESU Academy login ───────────────────────── */
    const loginRes = await fetch(LOGIN_URL, {
      method: "POST",
      body: loginForm,
      headers: {
        "User-Agent": "Dart/3.9 (dart:io)",
        Accept: "application/json",
        "X-Client-Type": "MOBILE",
      },
    });

    const loginText = await loginRes.text();

    if (!loginRes.ok || !loginText || loginText.trim() === "") {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    let loginData: Record<string, unknown>;
    try {
      loginData = JSON.parse(loginText);
    } catch {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    /* ── 4. Validate login response ─────────────────────────────── */
    const mObj = loginData.mobileJsonObject as
      | Record<string, unknown>
      | undefined;

    if (!mObj || mObj.login !== "SUCCESS") {
      return NextResponse.json(
        {
          error:
            (mObj?.errorMessage as string) || "Invalid credentials",
        },
        { status: 401 },
      );
    }

    const userType = String(mObj.usertype ?? "");
    const prn =
      (mObj.loginId as string)?.toUpperCase() ||
      userName.toUpperCase();
    const accessToken = loginData.accessToken as string | undefined;

    const client = await db();

    /* ── 5. Audit non-student usertype ──────────────────────────── */
    if (userType !== "2") {
      await client.execute({
        sql: `INSERT INTO audit_logs (srn, ip, user_type, action, detail)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          prn,
          ip,
          userType,
          "non_student_login",
          `usertype=${userType}, name=${mObj.name ?? "unknown"}, userRoleId=${mObj.userRoleId ?? "unknown"}`,
        ],
      });

      console.warn(
        `[auth] non-student login blocked: prn=${prn} usertype=${userType} ip=${ip}`,
      );

      return NextResponse.json(
        { error: "Only student accounts are allowed" },
        { status: 403 },
      );
    }

    /* ── 6. Fetch full profile from dispatcher ──────────────────── */
    // Defaults from the login response (fallback)
    let srn = prn; // will be overridden by dispatcher if successful
    let name = (mObj.name as string) || prn;
    let program = (mObj.program as string) || null;
    let branch = (mObj.branch as string)?.replace("Branch:", "") || null;
    let section = (mObj.sectionName as string) || null;
    let semester = (mObj.className as string) || null;
    let email = (mObj.email as string) || null;
    const pesuId = (mObj.userId as string) || null;
    const instId = mObj.instId as number | null;

    if (accessToken) {
      try {
        const dispForm = new FormData();
        dispForm.append("action", "27");
        dispForm.append("mode", "1");
        dispForm.append("menuId", "11172");

        const dispRes = await fetch(DISPATCHER_URL, {
          method: "POST",
          body: dispForm,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "Dart/3.9 (dart:io)",
            Accept: "application/json",
            "X-Client-Type": "MOBILE",
          },
        });

        if (dispRes.ok) {
          const dispText = await dispRes.text();
          const dispData = JSON.parse(dispText) as Record<
            string,
            unknown
          >;

          const studentInfo = dispData.STUDENT_INFO as
            | Record<string, unknown>
            | undefined;

          if (studentInfo) {
            srn =
              ((studentInfo.SRN as string) || srn).toUpperCase();
            name =
              (studentInfo.NameAsInSSLC as string) ||
              (studentInfo.FirstName as string) ||
              name;
            email = (studentInfo.Email as string) || email;
            program =
              (studentInfo.ProgramAbbreviation as string) || program;
            branch = (studentInfo.Branch as string) || branch;
            section =
              (studentInfo.SectionName as string) || section;
            semester =
              (studentInfo.ClassName as string) || semester;
          }
        }
      } catch (dispErr) {
        // Dispatcher failed — continue with login response data
        console.warn("[auth] dispatcher fetch failed:", dispErr);
      }
    }

    /* ── 7. Upsert into Turso DB ────────────────────────────────── */
    await client.execute({
      sql: `INSERT INTO users (srn, prn, name, program, branch, section, semester, email, pesu_id, inst_id, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(srn) DO UPDATE SET
              prn        = excluded.prn,
              name       = excluded.name,
              program    = excluded.program,
              branch     = excluded.branch,
              section    = excluded.section,
              semester   = excluded.semester,
              email      = excluded.email,
              pesu_id    = excluded.pesu_id,
              inst_id    = excluded.inst_id,
              last_login = datetime('now')`,
      args: [
        srn, prn, name, program, branch, section, semester, email,
        pesuId, instId,
      ],
    });

    // Bootstrap admin from env if configured
    if (isBootstrapAdmin(srn)) {
      await client.execute({
        sql: `UPDATE users SET role = 'admin' WHERE srn = ? AND role != 'admin'`,
        args: [srn],
      });
    }

    // Fetch current role from DB
    const row = await client.execute({
      sql: `SELECT role FROM users WHERE srn = ?`,
      args: [srn],
    });
    const role =
      (row.rows[0]?.role as "admin" | "member") || "member";

    /* ── 8. Sign JWT & set cookie ───────────────────────────────── */
    const token = await signToken({ srn, name, role });

    const res = NextResponse.json({
      success: true,
      user: { srn, name, role },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}
