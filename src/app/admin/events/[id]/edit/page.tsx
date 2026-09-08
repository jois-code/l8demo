"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/_components/auth-context";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    fetch("/api/admin/events").then(r => r.json()).then(d => {
      const ev = d.events?.find((e: any) => e.id === id);
      if (ev) {
        setEvent({
          ...ev,
          tags: ev.tags ? ev.tags.join(", ") : ""
        });
      }
    });
  }, [id]);

  if (isLoading || !user || !event) return <div className="p-8 text-fg-dim">loading...</div>;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...event,
        tags: event.tags ? event.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : []
      };
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) router.push("/admin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page min-h-screen p-8">
      <div className="max-w-2xl mx-auto admin-card p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold font-display">Edit Event: {id}</h1>
          <Link href="/admin" className="text-sm text-fg-dim hover:text-fg">back</Link>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-mono text-fg-dim mb-1">Title</label>
            <input type="text" value={event.title} onChange={e => setEvent({...event, title: e.target.value})} className="w-full bg-bg-3 border border-border p-2 focus:border-accent outline-none" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-mono text-fg-dim mb-1">Status</label>
              <select value={event.status} onChange={e => setEvent({...event, status: e.target.value})} className="w-full bg-bg-3 border border-border p-2 focus:border-accent outline-none">
                <option value="PENDING">PENDING</option>
                <option value="LIVE">LIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-mono text-fg-dim mb-1">Category</label>
              <select value={event.category} onChange={e => setEvent({...event, category: e.target.value})} className="w-full bg-bg-3 border border-border p-2 focus:border-accent outline-none">
                <option value="Workshop">Workshop</option>
                <option value="CTF">CTF</option>
                <option value="Seminar">Seminar</option>
                <option value="Contest">Contest</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-mono text-fg-dim mb-1">Date (YYYY.MM.DD)</label>
              <input type="text" value={event.date} onChange={e => setEvent({...event, date: e.target.value})} className="w-full bg-bg-3 border border-border p-2 focus:border-accent outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-mono text-fg-dim mb-1">Venue</label>
              <input type="text" value={event.venue} onChange={e => setEvent({...event, venue: e.target.value})} className="w-full bg-bg-3 border border-border p-2 focus:border-accent outline-none" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-mono text-fg-dim mb-1">Description</label>
            <textarea value={event.desc} onChange={e => setEvent({...event, desc: e.target.value})} className="w-full bg-bg-3 border border-border p-2 focus:border-accent outline-none min-h-[100px]" required />
          </div>
          <div>
            <label className="block text-sm font-mono text-fg-dim mb-1">Prerequisites</label>
            <input type="text" value={event.prerequisites} onChange={e => setEvent({...event, prerequisites: e.target.value})} className="w-full bg-bg-3 border border-border p-2 focus:border-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-mono text-fg-dim mb-1">Flags (Success/Result message)</label>
            <input type="text" value={event.flags} onChange={e => setEvent({...event, flags: e.target.value})} className="w-full bg-bg-3 border border-border p-2 focus:border-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-mono text-fg-dim mb-1">Button Text (e.g. register_now)</label>
            <input type="text" value={event.action_text} onChange={e => setEvent({...event, action_text: e.target.value})} className="w-full bg-bg-3 border border-border p-2 focus:border-accent outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-mono text-fg-dim mb-1">Tags (comma separated)</label>
            <input type="text" value={event.tags} onChange={e => setEvent({...event, tags: e.target.value})} className="w-full bg-bg-3 border border-border p-2 focus:border-accent outline-none" />
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn btn-solid">
              {saving ? "Saving..." : "Save Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
