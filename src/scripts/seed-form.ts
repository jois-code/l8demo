/**
 * Generic form seed utility.
 *
 * Takes a FormConfig JSON and inserts it into the Turso database.
 * Usage:
 *   import { seedForm, FormConfig } from "./seed-form";
 *   await seedForm(config);
 *
 * Can also be run directly:
 *   npx tsx src/scripts/seed-form.ts <path-to-config.json>
 */

import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FormFieldOption {
  id: string;
  text: string;
  next_section_id?: string | null;
}

export interface FormField {
  id: string;
  type: "short_text" | "paragraph" | "multiple_choice" | "checkboxes";
  label: string;
  required: boolean;
  options?: FormFieldOption[];
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  show_if_field_id?: string | null;
  show_if_option_id?: string | null;
  fields: FormField[];
}

export interface FormConfig {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  allow_edit_responses: boolean;
  closes_at?: string | null;
  sections: FormSection[];
}

/* ------------------------------------------------------------------ */
/*  Seed logic                                                         */
/* ------------------------------------------------------------------ */

export async function seedForm(config: FormConfig) {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set in .env.local");

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });

  // Ensure tables exist (minimal — matches db.ts schema)
  await client.batch([
    `CREATE TABLE IF NOT EXISTS forms (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        is_published BOOLEAN DEFAULT 0,
        allow_edit_responses BOOLEAN DEFAULT 0,
        closes_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS form_sections (
        id TEXT PRIMARY KEY,
        form_id TEXT NOT NULL,
        title TEXT,
        description TEXT,
        order_index INTEGER NOT NULL,
        show_if_field_id TEXT,
        show_if_option_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS form_fields (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        required BOOLEAN DEFAULT 0,
        order_index INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS form_field_options (
        id TEXT PRIMARY KEY,
        field_id TEXT NOT NULL,
        text TEXT NOT NULL,
        next_section_id TEXT,
        order_index INTEGER NOT NULL
    )`,
  ]);

  // Delete existing form with same ID (clean re-seed)
  await client.batch([
    { sql: `DELETE FROM form_field_options WHERE field_id IN (SELECT id FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE form_id = ?))`, args: [config.id] },
    { sql: `DELETE FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE form_id = ?)`, args: [config.id] },
    { sql: `DELETE FROM form_sections WHERE form_id = ?`, args: [config.id] },
    { sql: `DELETE FROM forms WHERE id = ?`, args: [config.id] },
  ], "write");

  // Insert form
  const queries: { sql: string; args: any[] }[] = [];

  queries.push({
    sql: `INSERT INTO forms (id, title, description, is_published, allow_edit_responses, closes_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      config.id,
      config.title,
      config.description || "",
      config.is_published ? 1 : 0,
      config.allow_edit_responses ? 1 : 0,
      config.closes_at || null,
    ],
  });

  // Insert sections, fields, options
  config.sections.forEach((section, sIdx) => {
    queries.push({
      sql: `INSERT INTO form_sections (id, form_id, title, description, order_index, show_if_field_id, show_if_option_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        section.id,
        config.id,
        section.title || "",
        section.description || "",
        sIdx,
        section.show_if_field_id || null,
        section.show_if_option_id || null,
      ],
    });

    section.fields.forEach((field, fIdx) => {
      queries.push({
        sql: `INSERT INTO form_fields (id, section_id, type, label, required, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [field.id, section.id, field.type, field.label, field.required ? 1 : 0, fIdx],
      });

      if (field.options) {
        field.options.forEach((opt, oIdx) => {
          queries.push({
            sql: `INSERT INTO form_field_options (id, field_id, text, next_section_id, order_index) VALUES (?, ?, ?, ?, ?)`,
            args: [opt.id, field.id, opt.text, opt.next_section_id || null, oIdx],
          });
        });
      }
    });
  });

  await client.batch(queries, "write");

  console.log(`\n✅ Form seeded successfully!`);
  console.log(`   Form ID:    ${config.id}`);
  console.log(`   Title:      ${config.title}`);
  console.log(`   Sections:   ${config.sections.length}`);
  console.log(`   Fields:     ${config.sections.reduce((acc, s) => acc + s.fields.length, 0)}`);
  console.log(`   Published:  ${config.is_published ? "yes" : "no"}`);
  console.log(`\n   Set this in .env.local:`);
  console.log(`   NEXT_PUBLIC_RECRUITMENT_FORM_ID=${config.id}\n`);
}

/* ------------------------------------------------------------------ */
/*  CLI entrypoint                                                     */
/* ------------------------------------------------------------------ */

if (require.main === module) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("Usage: npx tsx src/scripts/seed-form.ts <path-to-config.ts>");
    process.exit(1);
  }

  const absPath = path.resolve(process.cwd(), configPath);

  // Dynamic import for .ts config files
  import(absPath).then(async (mod) => {
    const config: FormConfig = mod.default || mod.config;
    if (!config || !config.id) {
      console.error("Config must export a FormConfig object as default or named 'config'");
      process.exit(1);
    }
    await seedForm(config);
  }).catch((err) => {
    console.error("Failed to seed form:", err);
    process.exit(1);
  });
}
