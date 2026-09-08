/**
 * Events catalog, ported from ChatreshGudi/L8-Website-Events
 * (src/data/eventsData.js). The source's non-functional registration form was
 * dropped; PENDING events link to the weekly sessions, ARCHIVED ones show an
 * archive note.
 */

export type EventStatus = "LIVE" | "PENDING" | "ARCHIVED";
export type EventCategory = "CTF" | "Workshop" | "Seminar" | "Contest";

export type L8Event = {
  id: string;
  title: string;
  status: EventStatus;
  category: EventCategory;
  date: string;
  venue: string;
  desc: string;
  prerequisites: string;
  flags: string;
  actionText: string;
  tags: string[];
};


export const EVENT_FILTERS = [
  "ALL",
  "LIVE",
  "CTF",
  "WORKSHOPS",
  "CONTESTS",
  "SEMINARS",
  "ARCHIVED",
] as const;

export function matchesFilter(
  ev: L8Event,
  filter: (typeof EVENT_FILTERS)[number],
): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "LIVE":
      return ev.status === "LIVE";
    case "WORKSHOPS":
      return ev.category === "Workshop";
    case "CTF":
      return ev.category === "CTF";
    case "CONTESTS":
      return ev.category === "Contest";
    case "SEMINARS":
      return ev.category === "Seminar";
    case "ARCHIVED":
      return ev.status === "ARCHIVED";
  }
}

/**
 * Tailwind classes for a status badge. Kept on the site's single-accent
 * palette (no green/amber) — LIVE is full accent, PENDING a dimmer accent,
 * ARCHIVED fades to the neutral faint/border pair.
 */
export function statusClasses(status: EventStatus): string {
  switch (status) {
    case "LIVE":
      return "text-accent border-accent/40";
    case "PENDING":
      return "text-accent/70 border-accent/25";
    case "ARCHIVED":
      return "text-fg-faint border-border";
  }
}
