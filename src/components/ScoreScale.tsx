import { SCORE_LABELS } from '../config/rounds'

type Props = {
  value: number | null
  onChange: (value: number | null) => void
  size?: 'sm' | 'lg'
  label: string
}

const SCORES = [1, 2, 3, 4, 5]

/**
 * Segmented 1-5 control. Clicking the active score clears it, so there is no
 * separate reset affordance cluttering every criterion row.
 */
export default function ScoreScale({ value, onChange, size = 'sm', label }: Props) {
  return (
    <div
      className={`scale${size === 'lg' ? ' scale--lg' : ''}`}
      role="group"
      aria-label={`${label} — score out of 5`}
    >
      {SCORES.map((n) => (
        <button
          key={n}
          type="button"
          className="scale__btn"
          aria-pressed={value === n}
          title={`${SCORE_LABELS[n]}${value === n ? ' (click to clear)' : ''}`}
          onClick={() => onChange(value === n ? null : n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
