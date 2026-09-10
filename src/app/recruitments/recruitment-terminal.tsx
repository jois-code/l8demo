"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Domain data for the terminal                                       */
/* ------------------------------------------------------------------ */

const MISSION = `Layer8 is PES University ECC's cybersecurity club.
We run weekly CTFs, hands-on workshops, and build
open-source security tools — all student-driven.`;

const DOMAINS: Record<string, string[]> = {
  tech: [
    "Tech Domain — Roles & Responsibilities:",
    "- Build and maintain the club website",
    "- Host and manage CTF infrastructure",
    "- Create CTF challenges (web, crypto, pwn, reversing, forensics)",
    "- Conduct workshops on cybersecurity topics",
    "- Run a weekly cybersecurity blog",
  ],
  marketing: [
    "Marketing Domain — Roles & Responsibilities:",
    "- Spread the word about the club across campus & WhatsApp groups",
    "- Class to class marketing (if regs are low)",
    "- Print and put up posters, QR codes, etc. around the college",
    "- Work closely with the media team",
  ],
  design: [
    "Design Domain — Roles & Responsibilities:",
    "- Design logos, posters, stickers, insta posts, T-shirts, badges, and ID tags",
    "- Collaborate with the media team on post designs",
    "- Stick to deadlines (and be open to reworking designs until they're approved)",
  ],
  events: [
    "Events & Operations Domain — Roles & Responsibilities:",
    "- Come up with new event ideas, catchy names, and execution plans",
    "- Get necessary permissions and coordinate with core team for budget",
    "- Approach potential sponsors and manage sponsorships",
  ],
  media: [
    "Media Domain — Roles & Responsibilities:",
    "- Design engaging posts for socials",
    "- Make reels",
    "- Manage LinkedIn and Instagram handles",
    "- Coordinate with marketing and assist them when needed",
    "- extra -",
    "  - Capture high-quality photos & videos during events",
    "  - Edit videos and create creative edits",
  ],
};

const DOMAIN_NAMES = Object.keys(DOMAINS);

type Line = { type: "input" | "output"; text: string };

const BOOT_SCRIPT: { cmd: string; output: string[] }[] = [
  { cmd: "whoami", output: ["a prospective member — run `apply` when you're ready"] },
  { cmd: "cat mission.txt", output: MISSION.split("\n") },
  { cmd: "ls domains/", output: [DOMAIN_NAMES.join("  ")] },
];

const TYPE_SPEED_MS = 30;
const AFTER_TYPE_PAUSE_MS = 200;
const BETWEEN_COMMANDS_PAUSE_MS = 450;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOutput(raw: string, onScrollToForm: () => void): string[] {
  const cmd = raw.trim();
  const [base, ...rest] = cmd.split(/\s+/);
  const arg = rest.join(" ");

  switch (base) {
    case "":
      return [];
    case "help":
      return [
        "available commands:",
        "help                     show available commands",
        "ls                       list sections",
        "ls domains/              list domains",
        "whoami                   identify the current user",
        "cat mission.txt          print the layer8 mission",
        `cat domains/<name>.txt   print a domain's roles (${DOMAIN_NAMES.join(", ")})`,
        "apply                    jump to the application form",
        "clear                    clear terminal output",
      ];
    case "ls":
      if (arg === "domains/" || arg === "domains") {
        return [DOMAIN_NAMES.map((name) => `${name}.txt`).join("  ")];
      }
      return ["domains/   mission.txt   team/   apply"];
    case "whoami":
      return ["a prospective member — run `apply` when you're ready"];
    case "pwd":
      return ["~/layer8/join"];
    case "cat": {
      if (arg === "mission.txt") return MISSION.split("\n");
      const match = arg.match(/^(?:domains\/)?([a-z]+)(?:\.txt)?$/i);
      const domainKey = match ? match[1].toLowerCase() : "";
      if (domainKey && DOMAINS[domainKey]) {
        return DOMAINS[domainKey];
      }
      return [`cat: ${arg || "(no file)"}: No such file or directory`];
    }
    case "apply":
      onScrollToForm();
      return ["opening application form..."];
    case "clear":
      return ["__CLEAR__"];
    default:
      return [`command not found: ${base} — try 'help'`];
  }
}

export default function RecruitmentTerminal({
  onScrollToForm,
}: {
  onScrollToForm: () => void;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [typedCmd, setTypedCmd] = useState("");
  const [booting, setBooting] = useState(true);
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines, typedCmd]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      const finished = BOOT_SCRIPT.flatMap((step) => [
        { type: "input" as const, text: step.cmd },
        ...step.output.map((text) => ({ type: "output" as const, text })),
      ]);
      setLines(finished);
      setBooting(false);
      return;
    }

    let cancelled = false;

    async function playBootSequence() {
      for (const step of BOOT_SCRIPT) {
        for (let i = 1; i <= step.cmd.length; i++) {
          if (cancelled) return;
          setTypedCmd(step.cmd.slice(0, i));
          await sleep(TYPE_SPEED_MS);
        }
        await sleep(AFTER_TYPE_PAUSE_MS);
        if (cancelled) return;

        setLines((prev) => [...prev, { type: "input", text: step.cmd }]);
        setTypedCmd("");

        for (const outLine of step.output) {
          if (cancelled) return;
          setLines((prev) => [...prev, { type: "output", text: outLine }]);
        }
        await sleep(BETWEEN_COMMANDS_PAUSE_MS);
      }
      if (!cancelled) setBooting(false);
    }

    playBootSequence();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!booting) inputRef.current?.focus();
  }, [booting]);

  const runCommand = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const cmd = input;
      const output = buildOutput(cmd, onScrollToForm);

      if (output[0] === "__CLEAR__") {
        setLines([]);
      } else {
        setLines((prev) => [
          ...prev,
          { type: "input", text: cmd },
          ...output.map((text) => ({ type: "output" as const, text })),
        ]);
      }
      setInput("");
    },
    [input, onScrollToForm]
  );

  return (
    <div
      className="term term-interactive"
      onClick={() => !booting && inputRef.current?.focus()}
    >
      <div className="term-bar">
        <span className="term-dot" />
        <span className="term-dot" />
        <span className="term-dot" />
        <span
          style={{
            marginLeft: "0.6rem",
            fontSize: "0.72rem",
            color: "var(--fg-faint)",
          }}
        >
          layer8 — ~
        </span>
      </div>
      <div ref={bodyRef} className="term-body">
        {lines.map((l, i) => (
          <div key={i} className={l.type === "input" ? "" : "muted"}>
            {l.type === "input" ? (
              <>
                <span className="prompt">$</span> {l.text}
              </>
            ) : (
              l.text
            )}
          </div>
        ))}

        {booting ? (
          <div>
            <span className="prompt">$</span> {typedCmd}
            <span className="cursor">&nbsp;</span>
          </div>
        ) : (
          <form
            onSubmit={runCommand}
            className="term-input-row"
          >
            <span className="prompt">$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Terminal command input"
              className="term-input"
            />
          </form>
        )}
      </div>
      <div
        style={{
          padding: "0.5rem 1.2rem 0.8rem",
          fontSize: "0.7rem",
          color: "var(--fg-faint)",
        }}
      >
        try: help · cat mission.txt · cat domains/tech.txt · apply
      </div>
    </div>
  );
}
