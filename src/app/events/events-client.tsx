"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractiveTerminal } from "../_components/interactive-terminal";
import { Header, Footer } from "../_components/site-chrome";
import {
  EVENT_FILTERS,
  matchesFilter,
  statusClasses,
  type L8Event,
} from "./events-data";

export type EventWithForm = L8Event & { form_id?: string | null };

/* ------------------------------------------------------------------ */
/*  detail                                                              */
/* ------------------------------------------------------------------ */

function Detail({ event }: { event: EventWithForm }) {
  const meta: [string, string][] = [
    ["date", event.date],
    ["venue", event.venue],
    ["prerequisites", event.prerequisites],
    ["flags", event.flags],
  ];

  return (
    <div
      key={event.id}
      style={{ animation: "route-in 0.22s ease-out" }}
      className="card p-6 md:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-bold text-xl md:text-2xl leading-tight">
          {event.title}
        </h3>
        <span
          className={`shrink-0 font-mono text-[0.62rem] font-bold px-2 py-0.5 border ${statusClasses(
            event.status,
          )}`}
        >
          {event.status}
        </span>
      </div>

      <p className="mt-3 text-sm text-fg-dim">{event.desc}</p>

      <dl className="mt-5 border border-border divide-y divide-border font-mono text-xs">
        {meta.map(([k, v]) => (
          <div key={k} className="flex gap-4 px-3 py-2">
            <dt className="shrink-0 w-32 pr-3 text-fg-faint uppercase tracking-[0.1em]">
              {k}
            </dt>
            <dd className="text-fg-dim">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {event.tags.map((t) => (
          <span key={t} className="tag">
            #{t}
          </span>
        ))}
      </div>

      <div className="mt-6 pt-5 border-t border-border">
        {event.status === "ARCHIVED" ? (
          <p className="text-xs text-fg-faint font-mono">
            {
              "// this event has concluded — slides and writeups live in the Layer8 GitHub archives."
            }
          </p>
        ) : (
          <Link href={event.form_id ? `/forms/${event.form_id}/view` : "/#top"} className="btn btn-solid">
            &gt; {event.actionText}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  page                                                                */
/* ------------------------------------------------------------------ */

export default function EventsClient({ initialEvents }: { initialEvents: EventWithForm[] }) {
  const [filter, setFilter] =
    useState<(typeof EVENT_FILTERS)[number]>("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>(initialEvents[0]?.id || "");
  const searchRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialEvents.filter((ev) => {
      const byText =
        q === "" ||
        `${ev.title} ${ev.desc} ${ev.tags.join(" ")} ${ev.date}`
          .toLowerCase()
          .includes(q);
      return byText && matchesFilter(ev, filter);
    });
  }, [filter, query, initialEvents]);

  const EVENTS_SCRIPT = useMemo(() => {
    if (initialEvents.length === 0) return "$ ls events/";
    return `$ ls events/
${initialEvents.map((e) => e.id).join("  ")}
$ cat events/${initialEvents[0].id}.md
${initialEvents[0].desc}`;
  }, [initialEvents]);

  const EVENTS_FS = useMemo(() => {
    return {
      dir: "events",
      entries: initialEvents.map((e) => e.id),
      files: Object.fromEntries(
        initialEvents.flatMap((e) => {
          const body = `${e.title}\n${e.date} · ${e.venue}\n${e.desc}`;
          return [
            [e.id, body],
            [`${e.id}.md`, body],
            [`events/${e.id}.md`, body],
          ];
        }),
      ),
    } as const;
  }, [initialEvents]);

  const select = useCallback((id: string) => {
    setSelected(id);
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 1024px)").matches
    ) {
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const typing = /^(input|textarea|select)$/i.test(el.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape" && el === searchRef.current) {
        setQuery("");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const event = initialEvents.find((e) => e.id === selected) ?? initialEvents[0];

  return (
    <>
      <Header current="Events" />

      <main className="flex-1">
        {/* hero */}
        <section className="wrap pt-12 pb-10 md:pt-16 md:pb-12">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <p className="kicker mb-5">{"// layer8 / events"}</p>
              <h1 className="font-display font-bold leading-[0.95] text-[clamp(3rem,11vw,6.5rem)]">
                Events
              </h1>
              <p className="mt-6 text-sm md:text-base text-fg-dim max-w-xl">
                Hackathons, workshops and archived mission logs. Filter the
                catalog, then open a record for the venue, prerequisites and how
                to take part.
              </p>
            </div>

            <InteractiveTerminal
              script={EVENTS_SCRIPT}
              barLabel="layer8@pesu — ~/events"
              fs={EVENTS_FS}
            />
          </div>
        </section>

        <div className="wrap">
          <div className="rule" />
        </div>

        {/* catalog */}
        <section className="wrap py-12 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="tag">catalog</span>
              <h2 className="mt-3 font-display font-bold text-2xl md:text-3xl">
                Event catalog
              </h2>
              <p
                className="mt-2 text-[0.72rem] tracking-[0.14em] uppercase text-fg-faint"
                role="status"
                aria-live="polite"
              >
                {shown.length} {shown.length === 1 ? "record" : "records"}
              </p>
            </div>

            <label
              className="flex items-center gap-2.5 bg-bg-3 border border-border px-3 py-2.5 w-full sm:w-72 focus-within:border-accent transition-colors"
              htmlFor="event-search"
            >
              <span className="text-accent text-sm" aria-hidden>
                $
              </span>
              <input
                id="event-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search events, tags, dates — /"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-fg text-sm placeholder:text-fg-faint"
              />
            </label>
          </div>

          <div
            className="mt-6 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter events"
          >
            {EVENT_FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f)}
                  className={`font-mono text-[0.72rem] tracking-[0.08em] px-3 py-1.5 border transition-colors ${
                    active
                      ? "bg-accent border-accent text-bg font-bold"
                      : "bg-transparent border-border text-fg-dim hover:text-fg"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((ev) => {
              const active = ev.id === selected;
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => select(ev.id)}
                  aria-pressed={active}
                  className={`card text-left flex flex-col gap-3 transition-colors ${
                    active ? "border-accent" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-display font-bold text-fg leading-snug">
                      {ev.title}
                    </span>
                    <span
                      className={`shrink-0 font-mono text-[0.6rem] font-bold px-1.5 py-0.5 border ${statusClasses(
                        ev.status,
                      )}`}
                    >
                      {ev.status}
                    </span>
                  </div>
                  <p className="text-xs text-fg-dim line-clamp-3">{ev.desc}</p>
                  <div className="font-mono text-[0.7rem] text-fg-faint space-y-1">
                    <div>{ev.date}</div>
                    <div className="truncate">{ev.venue}</div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border flex flex-wrap gap-1.5">
                    {ev.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[0.62rem] text-fg-faint"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}

            {shown.length === 0 && (
              <p className="col-span-full p-6 border border-dashed border-border text-sm text-fg-dim">
                No events match your filter query.
              </p>
            )}
          </div>

          <div ref={detailRef} className="mt-8 scroll-mt-24">
            <p className="kicker mb-3">{"// event log"}</p>
            <Detail event={event} />
          </div>
        </section>

        <div className="wrap">
          <div className="rule" />
        </div>

        {/* cta */}
        <section className="wrap py-16 md:py-20">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="font-display font-bold text-2xl md:text-3xl">
                Running something?
              </h2>
              <p className="mt-2 text-sm text-fg-dim max-w-2xl">
                Members pitch workshops and challenges every cycle. Bring an idea
                to a weekly session and the Events domain will help you ship it.
              </p>
            </div>
            <Link href="/#top" className="btn btn-solid">
              &gt; weekly_sessions
            </Link>
          </div>
        </section>
      </main>

      <Footer current="Events" />
    </>
  );
}
