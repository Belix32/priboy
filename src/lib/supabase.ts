import { createClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | null = null;

const AUTH_FETCH_TIMEOUT_MS = 25_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

function resolveSupabaseUrl(): string {
  const configured = import.meta.env.VITE_SUPABASE_URL;
  if (!configured) {
    throw new Error('Supabase not configured. Set VITE_SUPABASE_URL');
  }

  // Route browser traffic through our domain — *.supabase.co is often blocked in Russia.
  if (import.meta.env.VITE_SUPABASE_USE_PROXY === 'true' && typeof window !== 'undefined') {
    return `${window.location.origin}/supabase`;
  }

  return configured;
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.startsWith('http'));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient(): any {
  if (supabaseClient) return supabaseClient;

  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error('Supabase not configured. Set VITE_SUPABASE_ANON_KEY');
  }

  supabaseClient = createClient(resolveSupabaseUrl(), key, {
    auth: { persistSession: true, autoRefreshToken: true },
    global: { fetch: fetchWithTimeout },
  });

  return supabaseClient;
}
