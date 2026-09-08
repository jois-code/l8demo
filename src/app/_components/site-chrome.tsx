"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";

/* ------------------------------------------------------------------ */
/*  shared nav data                                                    */
/* ------------------------------------------------------------------ */

export const NAV = [
  "Blogs",
  "Weekly CTFs",
  "Events",
  "Resources",
  "Sandbox",
  "Domains",
  "Legacy/Alumni",
  "Hall of Fame",
  "Recruitments",
  "About Us",
] as const;

// nav entries that have a real route yet — everything else is still a button.
export const ROUTES: Partial<Record<(typeof NAV)[number], string>> = {
  Blogs: "/blogs",
  "Weekly CTFs": "/weekly-ctfs",
  Events: "/events",
  Resources: "/resources",
  Sandbox: "/sandbox",
  Domains: "/domains",
  "Legacy/Alumni": "/legacy",
  "Hall of Fame": "/hall-of-fame",
  Recruitments: "/recruitments",
  "About Us": "/about",
};

/* ------------------------------------------------------------------ */
/*  wordmark                                                           */
/* ------------------------------------------------------------------ */

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-display font-bold tracking-tight select-none ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/l8-mark.png" alt="" aria-hidden className="brandmark" />
      <span>LAYER8</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  header                                                             */
/* ------------------------------------------------------------------ */

// Desktop: these sit inline in the bar; everything else lives in the
// "menu" dropdown so the header doesn't overflow with ten tabs.
const PRIMARY: readonly (typeof NAV)[number][] = [
  "Blogs",
  "Events",
  "Domains",
  "Recruitments",
  "About Us",
];
const SECONDARY = NAV.filter((item) => !PRIMARY.includes(item));

function NavItem({
  item,
  current,
  onNavigate,
  className = "",
}: {
  item: (typeof NAV)[number];
  current?: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const href = ROUTES[item];
  const isCurrent = current === item;

  if (href) {
    return (
      <Link
        href={href}
        className={`navlink ${className}`}
        data-current={isCurrent || undefined}
        aria-current={isCurrent ? "page" : undefined}
        onClick={onNavigate}
      >
        {item}
      </Link>
    );
  }

  return (
    <button type="button" className={`navlink ${className}`} onClick={onNavigate}>
      {item}
    </button>
  );
}

export function Header({ current }: { current?: string }) {
  const { user, logout, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  // menuOpen drives the open animation; menuClosing keeps the panel
  // mounted long enough to play the close animation.
  const menuRender = menuOpen || menuClosing;

  const openMenu = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setMenuClosing(false);
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMenuClosing(false), 160);
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // close the desktop "menu" dropdown on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, closeMenu]);

  const currentInMenu =
    current !== undefined &&
    (SECONDARY as readonly string[]).includes(current);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] border-b border-border">
      <div className="wrap">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/" className="text-lg">
            <Wordmark />
          </Link>

          <nav className="hidden lg:flex items-center gap-x-6">
            {PRIMARY.map((item) => (
              <NavItem key={item} item={item} current={current} />
            ))}

            <div ref={menuRef} className="relative">
              <button
                type="button"
                className="navlink flex items-center gap-1.5"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                data-current={currentInMenu || undefined}
                onClick={() => (menuOpen ? closeMenu() : openMenu())}
              >
                menu
                <span
                  aria-hidden
                  className={`text-[0.6em] transition-transform ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {menuRender && (
                <div
                  role="menu"
                  data-open={menuOpen}
                  className="menu-dd absolute right-0 top-full mt-3 min-w-[13rem] border border-border bg-bg-2 p-1.5 shadow-[0_18px_40px_-28px_var(--glow)]"
                >
                  {SECONDARY.map((item, i) => (
                    <div
                      key={item}
                      className="menu-dd-item"
                      style={{ animationDelay: `${i * 26}ms` }}
                    >
                      <NavItem
                        item={item}
                        current={current}
                        className="block px-3 py-1.5"
                        onNavigate={closeMenu}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* auth indicator */}
            {!isLoading && (
              <div className="flex items-center gap-3 ml-3 pl-3 border-l border-border">
                {user ? (
                  <>
                    <span className="text-[0.72rem] text-fg-dim tracking-wider uppercase">
                      <span className="text-accent">●</span>{" "}
                      {user.srn}
                    </span>
                    {user.role === "admin" && (
                      <Link href="/admin" className="navlink">
                        admin
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="navlink text-[var(--danger)] hover:text-[var(--danger)]"
                    >
                      logout
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="navlink">
                    login
                  </Link>
                )}
              </div>
            )}
          </nav>

          {/* mobile: auth + hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            {!isLoading && !user && (
              <Link href="/login" className="btn px-3 py-2 text-[0.72rem]">
                login
              </Link>
            )}
            {!isLoading && user && (
              <span className="text-[0.68rem] text-accent mr-1">
                ● {user.srn}
              </span>
            )}
            <button
              type="button"
              className="btn px-3 py-2"
              aria-expanded={open}
              aria-label="Toggle navigation"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "[ x ]" : "[ = ]"}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-bg-2">
          <div className="wrap py-3 grid grid-cols-2 gap-x-4 gap-y-1">
            {NAV.map((item) => (
              <NavItem
                key={item}
                item={item}
                current={current}
                className="text-left"
                onNavigate={() => setOpen(false)}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  footer                                                             */
/* ------------------------------------------------------------------ */

export function Footer({ current }: { current?: string }) {
  return (
    <footer className="mt-auto border-t border-border bg-bg-2">
      <div className="wrap py-9">
        <div className="grid gap-x-8 gap-y-7 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Wordmark className="text-base" />
            <p className="mt-2.5 text-xs text-fg-dim max-w-xs">
              Cybersecurity Club · PES University, Electronic City Campus,
              Bengaluru.
            </p>
            <a
              href="https://www.pes.edu"
              target="_blank"
              rel="noreferrer"
              className="pesu-chip mt-4"
              aria-label="PES University"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/pesu.png" alt="PES University" />
            </a>
          </div>

          <div>
            <div className="kicker mb-2.5">pages</div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
              {NAV.map((item) => {
                const href = ROUTES[item];
                return (
                  <li key={item}>
                    {href ? (
                      <Link
                        href={href}
                        className="link-ghost"
                        data-current={current === item || undefined}
                      >
                        {item}
                      </Link>
                    ) : (
                      <button type="button" className="link-ghost">
                        {item}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <div className="kicker mb-2.5">elsewhere</div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
              <li>
                <a
                  href="https://www.instagram.com/layer8.pesu/"
                  target="_blank"
                  rel="noreferrer"
                  className="link-ghost"
                >
                  Instagram
                </a>
              </li>
              <li>
                <button type="button" className="link-ghost">
                  GitHub
                </button>
              </li>
              <li>
                <button type="button" className="link-ghost">
                  LinkedIn
                </button>
              </li>
              <li>
                <a href="mailto:layer8.ecc@pes.edu" className="link-ghost">
                  Email
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="rule my-5" />

        <div className="text-xs text-fg-dim">
          © {new Date().getFullYear()} Layer8 · built by Layer8
        </div>
      </div>
    </footer>
  );
}
