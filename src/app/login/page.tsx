"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_components/auth-context";

/* ------------------------------------------------------------------ */
/*  metadata can't be exported from a client component, so we set      */
/*  the title via the <title> tag inside the JSX instead.              */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Already logged in — redirect (in an effect, not during render)
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(userName, password);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Authentication failed");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }

    setLoading(false);
  }

  return (
    <>
      <title>Login · Layer8</title>

      <div className="login-page">
        {/* floating grid dots */}
        <div className="login-grid" aria-hidden />

        <div className="login-container">
          {/* ── terminal card ─────────────────────────────── */}
          <div className={`login-card ${shake ? "login-shake" : ""}`}>
            {/* title bar */}
            <div className="term-bar">
              <span className="term-dot" />
              <span className="term-dot" />
              <span className="term-dot" />
              <span className="ml-auto text-[0.68rem] text-fg-faint tracking-wider uppercase select-none">
                layer8_auth
              </span>
            </div>

            {/* body */}
            <div className="login-body">
              {/* branding */}
              <div className="mb-6">
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  <span className="glitch" data-text="LAYER8">
                    LAYER8
                  </span>
                </h1>
                <p className="kicker mt-2">
                  {"// pesu academy authentication"}
                </p>
              </div>

              {/* form */}
              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label htmlFor="login-srn" className="login-label">
                    <span className="text-accent">$</span> srn / username
                  </label>
                  <input
                    id="login-srn"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="pes2ugXXcsXXX"
                    className="login-input"
                    disabled={loading}
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="login-pw" className="login-label">
                    <span className="text-accent">$</span> password
                  </label>
                  <input
                    id="login-pw"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="login-error" role="alert">
                    <span className="text-[var(--danger)]">error:</span>{" "}
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-solid w-full justify-center mt-2"
                >
                  {loading ? (
                    <span className="login-dots">
                      {">"} authenticating
                      <span className="login-dot-anim" />
                    </span>
                  ) : (
                    <>&gt; authenticate</>
                  )}
                </button>
              </form>

              {/* footnote */}
              <p className="mt-5 text-center text-[0.7rem] text-fg-faint">
                credentials are verified against PESU Academy.
                <br />
                we never store your password.
              </p>
            </div>
          </div>

          {/* back link */}
          <Link
            href="/"
            className="login-back"
          >
            ← back to site
          </Link>
        </div>
      </div>
    </>
  );
}
