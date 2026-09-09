const R = 200
const CENTER = 220
const CIRC = 2 * Math.PI * R

function mmss(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimerRing({
  remainingSec,
  plannedSec,
  isWork,
  targetLabel,
  hint,
  directionColor,
}: {
  remainingSec: number
  plannedSec: number
  isWork: boolean
  targetLabel: string
  hint?: string
  directionColor?: string
}) {
  const progress = plannedSec > 0 ? Math.min(1, Math.max(0, 1 - remainingSec / plannedSec)) : 0
  const angle = (progress * 360 - 90) * (Math.PI / 180)
  const handleX = CENTER + R * Math.cos(angle)
  const handleY = CENTER + R * Math.sin(angle)
  const stroke = isWork && directionColor ? directionColor : isWork ? 'var(--accent)' : 'var(--break)'
  const handleFill = stroke

  return (
    <div className="timer-dial relative w-full max-w-[380px] lg:max-w-[min(440px,40vh)]">
      <svg viewBox="0 0 440 440" className="w-full" role="presentation">
        <circle cx={CENTER} cy={CENTER} r={R} fill="var(--timer-face)" className="stroke-muted" strokeWidth={7} />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
        <circle cx={handleX} cy={handleY} r={8} fill={handleFill} stroke="none" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-10 text-center">
        <span className="timer-digits text-[64px] font-medium leading-none tracking-tight text-text sm:text-[80px] lg:text-[96px]">
          {mmss(remainingSec)}
        </span>
        <span className="max-w-full break-words text-base font-medium text-text lg:text-lg">{targetLabel}</span>
        {hint ? <span className="max-w-[220px] text-xs leading-relaxed text-text-2">{hint}</span> : null}
      </div>
    </div>
  )
}
