// drizzle.config.cjs ─ repo-root
// ------------------------------------------------------------
// Loads env vars from .env / .env.local before Drizzle runs
require('dotenv/config');        // uses the tiny “dotenv/config” preload

/** @type {import('drizzle-kit').Config} */
module.exports = {
  /* ────────────────  CONNECTION  ──────────────── */
  dialect: 'postgresql',                        // Drizzle-kit ≥ 0.30 needs this key. :contentReference[oaicite:0]{index=0}

  dbCredentials: {
    /**
     * Full pooler URL, e.g.
     * postgresql://postgres.<ref>:<PW>@aws-0-us-east-1.pooler.supabase.com:6543/postgres
     * Make *sure* it is present in process.env.SUPABASE_DB_URL
     */
    url: process.env.SUPABASE_DB_URL,
    ssl: 'require',                             // Supabase pooler enforces TLS  :contentReference[oaicite:1]{index=1}
  },

  /* ────────────────  SCHEMA SOURCES  ──────────────── */
  // Point ONLY at the new ritual files so the rest of your app
  // (chat, channels, etc.) stays untouched.
  schema: ['./src/lib/db/schema/**/*.ts'],

  /* ────────────────  OUTPUT  ──────────────── */
  out: './drizzle',                             // SQL & TS helpers land here

  /* ────────────────  OPTIONS  ──────────────── */
  verbose: true,                                // log SQL on generate / push  :contentReference[oaicite:2]{index=2}
  strict:  true,
};
