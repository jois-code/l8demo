-- Layer8 · database schema
-- Auto-created on first API call via db.ts

CREATE TABLE IF NOT EXISTS users (
  srn        TEXT PRIMARY KEY,         -- e.g. PES2UG25CS026
  prn        TEXT,                     -- PESU PRN e.g. PES2202501872
  name       TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'member',   -- 'member' | 'admin'
  program    TEXT,                     -- e.g. "B.Tech."
  branch     TEXT,                     -- e.g. "Computer Science and Engineering"
  section    TEXT,                     -- e.g. "Section A"
  semester   TEXT,                     -- e.g. "Sem-2"
  email      TEXT,
  pesu_id    TEXT,                     -- PESU internal UUID
  inst_id    INTEGER,                  -- PESU institution ID
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Logs suspicious activity (non-student logins, etc.)
CREATE TABLE IF NOT EXISTS audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  srn        TEXT NOT NULL,
  ip         TEXT,                     -- client IP address
  user_type  TEXT,                     -- PESU usertype (2 = student)
  action     TEXT NOT NULL,            -- e.g. "non_student_login"
  detail     TEXT,                     -- free-form context
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_published BOOLEAN DEFAULT 0,
    allow_edit_responses BOOLEAN DEFAULT 0,
    closes_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL, -- 'LIVE' | 'PENDING' | 'ARCHIVED'
    category TEXT NOT NULL, -- 'CTF' | 'Workshop' | 'Seminar' | 'Contest'
    date TEXT NOT NULL,
    venue TEXT NOT NULL,
    desc TEXT NOT NULL,
    prerequisites TEXT,
    flags TEXT,
    action_text TEXT NOT NULL,
    tags TEXT, -- JSON array of tags
    form_id TEXT REFERENCES forms(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS form_sections (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS form_fields (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'short_text', 'paragraph', 'multiple_choice', 'checkboxes'
    label TEXT NOT NULL,
    required BOOLEAN DEFAULT 0,
    order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS form_field_options (
    id TEXT PRIMARY KEY,
    field_id TEXT NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    next_section_id TEXT REFERENCES form_sections(id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS form_responses (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    user_srn TEXT NOT NULL REFERENCES users(srn) ON DELETE CASCADE,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(form_id, user_srn)
);

CREATE TABLE IF NOT EXISTS form_answers (
    id TEXT PRIMARY KEY,
    response_id TEXT NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
    field_id TEXT NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
    value TEXT -- Store as JSON string for arrays/checkboxes
);
