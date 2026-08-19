import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Surfaced in the UI rather than thrown at import time, so a missing .env.local
 * shows a readable setup screen instead of a blank page.
 */
export const configError =
  !url || !anonKey || url.includes('YOUR_PROJECT_REF')
    ? 'Supabase is not configured. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    : null

/**
 * There is no sign-in — every request goes out as the anon role, and the tables
 * are open to it (see supabase/migrations/0003_open_access.sql). Keep this app
 * on localhost or behind a VPN; the anon key is public by design.
 */
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'anon', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
