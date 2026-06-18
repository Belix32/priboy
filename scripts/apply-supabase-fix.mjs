#!/usr/bin/env node
/**
 * Applies 002_fix_rls_recursion.sql to Supabase via Management API.
 *
 * Set one of:
 *   SUPABASE_ACCESS_TOKEN  — personal access token from supabase.com/dashboard/account/tokens
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (project settings → API)
 *
 * Also reads .env for VITE_SUPABASE_URL and VITE_ADMIN_EMAIL.
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(root, '.env'));
loadEnvFile(join(root, '.env.local'));

let sql = readFileSync(join(root, 'supabase/migrations/002_fix_rls_recursion.sql'), 'utf8');

const adminEmail = process.env.VITE_ADMIN_EMAIL || 'admin@priboi.ru';
sql = sql.replace(
  "INSERT INTO public.app_settings (key, value) VALUES ('admin_email', 'admin@priboi.ru')",
  `INSERT INTO public.app_settings (key, value) VALUES ('admin_email', '${adminEmail.replace(/'/g, "''")}')`
);

const projectRef =
  process.env.SUPABASE_PROJECT_REF ||
  process.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!projectRef || !token) {
  console.log('');
  console.log('=== Supabase RLS fix — manual step required ===');
  console.log('');
  console.log('1. Open Supabase Dashboard → SQL Editor');
  console.log('2. Paste and run: supabase/migrations/002_fix_rls_recursion.sql');
  console.log(`3. Ensure app_settings.admin_email = ${adminEmail}`);
  console.log('');
  console.log('Or auto-apply: export SUPABASE_ACCESS_TOKEN=... && npm run db:fix');
  console.log('');
  process.exit(0);
}

console.log(`Applying migration 002 to project ${projectRef}...`);

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  const text = await res.text();
  console.error('Failed to apply migration:', res.status, text);
  console.log('');
  console.log('Fallback: run supabase/migrations/002_fix_rls_recursion.sql in SQL Editor.');
  process.exit(1);
}

console.log('Migration 002 applied successfully.');
console.log(`Admin email in app_settings: ${adminEmail}`);
