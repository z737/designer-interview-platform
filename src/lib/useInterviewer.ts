import { useCallback, useState } from 'react'

const STORAGE_KEY = 'pdi.interviewer-name'

/** Shown until someone types their own name, so scorecards are never unattributed. */
export const DEFAULT_INTERVIEWER = 'Gnani'

/**
 * Who is scoring, without accounts. The name is typed once and kept in this
 * browser only — it never leaves the machine except as attribution on a
 * scorecard, which is what makes the export useful for calibration.
 */
export function useInterviewer() {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_INTERVIEWER
    } catch {
      return DEFAULT_INTERVIEWER // private browsing / storage disabled
    }
  })

  const save = useCallback((value: string) => {
    setName(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Not fatal — the name just will not persist across reloads.
    }
  }, [])

  return { name, setName: save }
}
