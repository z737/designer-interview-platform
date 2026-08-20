import { SCORE_LABELS } from '../config/rounds'

type Props = {
  value: number | null
  onChange: (value: number | null) => void
  size?: 'sm' | 'lg'
  label: string
  /** Locked scorecards render the same control, non-interactive. */
  disabled?: boolean
}

const SCORES = [1, 2, 3, 4, 5]

/**
 * Segmented 1-5 control. Clicking the active score clears it, so there is no
 * separate reset affordance cluttering every criterion row.
 */
export default function ScoreScale({
  value,
  onChange,
  size = 'sm',
  label,
  disabled = false,
}: Props) {
  return (
    <div
      className={`scale${size === 'lg' ? ' scale--lg' : ''}${disabled ? ' scale--locked' : ''}`}
      role="group"
      aria-label={`${label} — score out of 5`}
    >
      {SCORES.map((n) => (
        <button
          key={n}
          type="button"
          className="scale__btn"
          aria-pressed={value === n}
          disabled={disabled}
          title={disabled ? SCORE_LABELS[n] : `${SCORE_LABELS[n]}${value === n ? ' (click to clear)' : ''}`}
          onClick={() => onChange(value === n ? null : n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
