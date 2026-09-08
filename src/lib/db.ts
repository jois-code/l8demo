import { createClient, type Client } from "@libsql/client";

/* ------------------------------------------------------------------ */
/*  Turso / libSQL singleton                                           */
/* ------------------------------------------------------------------ */

let _client: Client | null = null;
let _initialised = false;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");

    _client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return _client;
}

/** Ensure the `users` and `audit_logs` tables exist. Runs once per cold start. */
async function ensureSchema(client: Client) {
  if (_initialised) return;

  await client.batch([
    `CREATE TABLE IF NOT EXISTS users (
      srn        TEXT PRIMARY KEY,
      prn        TEXT,
      name       TEXT NOT NULL DEFAULT '',
      role       TEXT NOT NULL DEFAULT 'member',
      program    TEXT,
      branch     TEXT,
      section    TEXT,
      semester   TEXT,
      email      TEXT,
      pesu_id    TEXT,
      inst_id    INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      srn        TEXT NOT NULL,
      ip         TEXT,
      user_type  TEXT,
      action     TEXT NOT NULL,
      detail     TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS forms (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        is_published BOOLEAN DEFAULT 0,
        allow_edit_responses BOOLEAN DEFAULT 0,
        closes_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        venue TEXT NOT NULL,
        desc TEXT NOT NULL,
        prerequisites TEXT,
        flags TEXT,
        action_text TEXT NOT NULL,
        tags TEXT,
        form_id TEXT REFERENCES forms(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS form_sections (
        id TEXT PRIMARY KEY,
        form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
        title TEXT,
        description TEXT,
        order_index INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS form_fields (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        required BOOLEAN DEFAULT 0,
        order_index INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS form_field_options (
        id TEXT PRIMARY KEY,
        field_id TEXT NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        next_section_id TEXT REFERENCES form_sections(id) ON DELETE SET NULL,
        order_index INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS form_responses (
        id TEXT PRIMARY KEY,
        form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
        user_srn TEXT NOT NULL REFERENCES users(srn) ON DELETE CASCADE,
        submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(form_id, user_srn)
    )`,
    `CREATE TABLE IF NOT EXISTS form_answers (
        id TEXT PRIMARY KEY,
        response_id TEXT NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
        field_id TEXT NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
        value TEXT
    )`
  ]);

  _initialised = true;
}

/** Get a ready-to-use DB client (schema guaranteed). */
export async function db(): Promise<Client> {
  const client = getClient();
  await ensureSchema(client);
  return client;
}
