"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_components/auth-context";
import { formatToIST } from "@/lib/date";

/* ------------------------------------------------------------------ */
/*  types                                                              */
/* ------------------------------------------------------------------ */

interface DBUser {
  srn: string;
  prn: string | null;
  name: string;
  role: string;
  program: string | null;
  branch: string | null;
  section: string | null;
  semester: string | null;
  email: string | null;
  created_at: string;
  last_login: string;
}

interface AuditLog {
  id: number;
  srn: string;
  ip: string | null;
  user_type: string | null;
  action: string;
  detail: string | null;
  created_at: string;
}

interface AdminEvent {
  id: string;
  title: string;
  status: string;
  category: string;
  date: string;
  venue: string;
  desc: string;
  form_id: string | null;
}

/* ------------------------------------------------------------------ */
/*  page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<DBUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [activeTab, setActiveTabState] = useState<"dashboard" | "users" | "logs" | "events" | "forms">("dashboard");

  // Sync tab with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (["dashboard", "users", "logs", "events", "forms"].includes(hash)) {
        setActiveTabState(hash as any);
      }
    };
    handleHashChange(); // initial
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const setActiveTab = (tab: "dashboard" | "users" | "logs" | "events" | "forms") => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const [usersRes, logsRes, eventsRes, statsRes, formsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/audit-logs"),
        fetch("/api/admin/events"),
        fetch("/api/admin/stats"),
        fetch("/api/admin/forms"),
      ]);

      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users ?? []);
      }
      if (logsRes.ok) {
        const d = await logsRes.json();
        setLogs(d.logs ?? []);
      }
      if (eventsRes.ok) {
        const d = await eventsRes.json();
        setEvents(d.events ?? []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d ?? null);
      }
      if (formsRes.ok) {
        const d = await formsRes.json();
        setForms(d.forms ?? []);
      }
    } catch {
      // silent
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") fetchData();
    else setFetching(false);
  }, [user, fetchData]);

  async function toggleRole(srn: string) {
    setToggling(srn);
    try {
      const res = await fetch(`/api/admin/users/${srn}/role`, {
        method: "PATCH",
      });
      if (res.ok) await fetchData();
    } catch {
      // silent
    } finally {
      setToggling(null);
    }
  }

  async function createEvent() {
    try {
      const res = await fetch("/api/admin/events", { method: "POST", body: JSON.stringify({}) });
      if (res.ok) await fetchData();
    } catch {}
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      if (res.ok) await fetchData();
    } catch {}
  }

  /* ── guards ─────────────────────────────────────────────────── */

  if (isLoading || !user) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <p className="text-fg-dim">loading...</p>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-card">
            <div className="term-bar">
              <span className="term-dot" />
              <span className="term-dot" />
              <span className="term-dot" />
              <span className="ml-auto text-[0.68rem] text-fg-faint tracking-wider uppercase select-none">
                access_denied
              </span>
            </div>
            <div className="p-8 text-center">
              <p className="text-[var(--danger)] font-display text-xl font-bold">
                403 — Forbidden
              </p>
              <p className="mt-2 text-sm text-fg-dim">
                Your account does not have admin privileges.
              </p>
              <Link href="/" className="btn mt-6 inline-flex">
                &gt; back to site
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── render ─────────────────────────────────────────────────── */

  return (
    <>
      <title>Admin · Layer8</title>

      <div className="admin-page">
        <div className="admin-container">
          {/* header */}
          <div className="mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                  <span className="text-accent">&gt;</span> ADMIN
                </h1>
                <p className="kicker mt-1">
                  {"// system management console"}
                </p>
              </div>
              <Link href="/" className="login-back text-[0.78rem]">
                ← back to site
              </Link>
            </div>
          </div>

          {/* tabs */}
          <div className="admin-tabs">
            <button
              type="button"
              className={`admin-tab ${activeTab === "dashboard" ? "admin-tab-active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              dashboard
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === "users" ? "admin-tab-active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              users ({users.length})
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === "logs" ? "admin-tab-active" : ""}`}
              onClick={() => setActiveTab("logs")}
            >
              audit logs ({logs.length})
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === "events" ? "admin-tab-active" : ""}`}
              onClick={() => setActiveTab("events")}
            >
              events ({events.length})
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === "forms" ? "admin-tab-active" : ""}`}
              onClick={() => setActiveTab("forms")}
            >
              forms ({forms.length})
            </button>
            <button
              type="button"
              onClick={fetchData}
              disabled={fetching}
              className="admin-tab ml-auto"
            >
              {fetching ? "..." : "↻ refresh"}
            </button>
          </div>

          {/* dashboard */}
          {activeTab === "dashboard" && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="admin-card p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-display font-bold text-accent">{stats.metrics?.totalUsers || 0}</span>
                  <span className="text-sm font-mono text-fg-dim mt-2 uppercase tracking-wider">Total Users</span>
                </div>
                <div className="admin-card p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-display font-bold text-accent">{stats.metrics?.totalEvents || 0}</span>
                  <span className="text-sm font-mono text-fg-dim mt-2 uppercase tracking-wider">Events</span>
                </div>
                <div className="admin-card p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-display font-bold text-accent">{stats.metrics?.totalResponses || 0}</span>
                  <span className="text-sm font-mono text-fg-dim mt-2 uppercase tracking-wider">Form Responses</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* IP Logs */}
                <div className="admin-card overflow-hidden">
                  <div className="p-4 border-b border-border bg-bg/50">
                    <h3 className="font-bold text-sm uppercase tracking-wider">Recent IP Logs</h3>
                  </div>
                  <div className="admin-table-wrap !max-h-[300px] overflow-y-auto">
                    <table className="admin-table w-full">
                      <thead>
                        <tr>
                          <th>IP Address</th>
                          <th>Hits</th>
                          <th>Last Seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.ips?.length === 0 && (
                          <tr><td colSpan={3} className="text-center text-fg-dim py-4">No IP data</td></tr>
                        )}
                        {stats.ips?.map((ipObj: any, i: number) => (
                          <tr key={i}>
                            <td className="font-mono text-sm">{ipObj.ip}</td>
                            <td className="text-fg-dim">{ipObj.hits}</td>
                            <td className="text-fg-dim text-[0.7rem]">{formatToIST(ipObj.last_seen)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Activity Stream */}
                <div className="admin-card overflow-hidden">
                  <div className="p-4 border-b border-border bg-bg/50">
                    <h3 className="font-bold text-sm uppercase tracking-wider">Activity Stream</h3>
                  </div>
                  <div className="p-0 !max-h-[300px] overflow-y-auto">
                    {stats.activity?.length === 0 && (
                      <p className="text-center text-fg-dim py-4">No activity</p>
                    )}
                    <ul className="divide-y divide-border">
                      {stats.activity?.map((act: any, i: number) => (
                        <li key={i} className="p-4 flex flex-col gap-1 hover:bg-bg/50 transition-colors">
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-accent">{act.srn}</span>
                            <span className="text-[0.65rem] font-mono text-fg-faint">{formatToIST(act.created_at)}</span>
                          </div>
                          <span className="text-sm text-fg-dim">{act.action}</span>
                          {act.ip && <span className="text-[0.65rem] font-mono text-fg-faint mt-1">IP: {act.ip}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* users table */}
          {activeTab === "users" && (
            <div className="admin-card">
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>SRN</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Branch</th>
                      <th>Sem</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-fg-faint py-8">
                          {fetching ? "loading..." : "no users yet"}
                        </td>
                      </tr>
                    )}
                    {users.map((u) => (
                      <tr key={u.srn}>
                        <td className="font-bold text-accent">{u.srn}</td>
                        <td>{u.name}</td>
                        <td>
                          <span
                            className={`admin-badge ${u.role === "admin" ? "admin-badge-admin" : ""}`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="text-fg-dim">{u.branch || "—"}</td>
                        <td className="text-fg-dim">{u.semester || "—"}</td>
                        <td className="text-fg-dim text-[0.72rem]">
                          {formatToIST(u.last_login) || "—"}
                        </td>
                        <td>
                          {u.srn === user.srn ? (
                            <span className="text-[0.68rem] text-fg-faint">you</span>
                          ) : (
                            <button
                              type="button"
                              disabled={toggling === u.srn}
                              onClick={() => toggleRole(u.srn)}
                              className={`admin-role-btn ${
                                u.role === "admin"
                                  ? "admin-role-btn-demote"
                                  : "admin-role-btn-promote"
                              }`}
                            >
                              {toggling === u.srn
                                ? "..."
                                : u.role === "admin"
                                  ? "demote"
                                  : "promote"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* audit logs table */}
          {activeTab === "logs" && (
            <div className="admin-card">
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>SRN</th>
                      <th>IP</th>
                      <th>Type</th>
                      <th>Action</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-fg-faint py-8">
                          {fetching ? "loading..." : "no audit logs"}
                        </td>
                      </tr>
                    )}
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td className="text-fg-dim text-[0.72rem] whitespace-nowrap">
                          {formatToIST(l.created_at) || "—"}
                        </td>
                        <td className="font-bold">{l.srn}</td>
                        <td className="text-fg-dim font-mono text-[0.72rem]">
                          {l.ip || "—"}
                        </td>
                        <td className="text-fg-dim">{l.user_type || "—"}</td>
                        <td>
                          <span className="admin-badge admin-badge-warn">
                            {l.action}
                          </span>
                        </td>
                        <td className="text-fg-dim text-[0.72rem] max-w-[200px] truncate">
                          {l.detail || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* events table */}
          {activeTab === "events" && (
            <div className="admin-card">
              <div className="flex justify-end p-4 border-b border-border">
                <button onClick={createEvent} className="btn btn-solid text-sm">
                  + Create Event
                </button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Form Setup</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-fg-faint py-8">
                          {fetching ? "loading..." : "no events yet"}
                        </td>
                      </tr>
                    )}
                    {events.map((e) => (
                      <tr key={e.id}>
                        <td className="font-mono text-[0.72rem] text-fg-dim">{e.id}</td>
                        <td className="font-bold">{e.title}</td>
                        <td>
                          <span className={`admin-badge ${e.status === "LIVE" ? "admin-badge-admin" : ""}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="text-fg-dim text-[0.72rem]">{e.date}</td>
                        <td>
                          <Link href={`/admin/events/${e.id}/form`} className="text-accent hover:underline text-sm font-mono">
                            {e.form_id ? "edit_form" : "create_form"}
                          </Link>
                        </td>
                        <td className="space-x-3">
                          <Link href={`/admin/events/${e.id}/edit`} className="text-fg-dim hover:text-fg text-sm">
                            edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => deleteEvent(e.id)}
                            className="text-[var(--danger)] hover:underline text-sm"
                          >
                            delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* forms table */}
          {activeTab === "forms" && (
            <div className="admin-card">
              <div className="flex justify-end p-4 border-b border-border">
                <p className="text-xs text-fg-dim">Forms attached to events are also listed here.</p>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Responses</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forms.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-fg-faint py-8">
                          {fetching ? "loading..." : "no forms found"}
                        </td>
                      </tr>
                    )}
                    {forms.map((f) => (
                      <tr key={f.id}>
                        <td className="font-bold max-w-xs truncate" title={f.title}>{f.title}</td>
                        <td className="text-fg-dim font-mono text-[0.72rem]">{f.id}</td>
                        <td>
                          {f.is_published ? (
                            <span className="admin-badge text-emerald-400 border-emerald-400/30">Published</span>
                          ) : (
                            <span className="admin-badge">Draft</span>
                          )}
                          {f.closes_at && new Date() > new Date(f.closes_at.endsWith('Z') ? f.closes_at : f.closes_at + 'Z') && (
                            <span className="admin-badge ml-2 text-rose-400 border-rose-400/30">Closed</span>
                          )}
                        </td>
                        <td className="font-mono">{f.response_count || 0}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/forms/${f.id}/edit`} className="btn text-xs px-2 py-1">
                              Edit Form
                            </Link>
                            <Link href={`/admin/forms/${f.id}/responses`} className="btn text-xs px-2 py-1">
                              Responses
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
