/**
 * Supabase/PostgREST reject with plain objects ({ message, code, hint, … }),
 * not Error instances, so `err instanceof Error` silently loses the useful part.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; hint?: unknown; code?: unknown }
    const parts = [e.message, e.hint].filter((p): p is string => typeof p === 'string' && !!p)
    if (parts.length) return parts.join(' — ')
    if (typeof e.code === 'string') return `${fallback} (${e.code})`
  }
  return fallback
}
