/// <reference types="vite/client" />
// Supabase browser client.
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.
// If missing, exports `null` so the app still renders with mock data.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (!isSupabaseConfigured && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[Supabase] Not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env. App is using mock data."
  );
}
