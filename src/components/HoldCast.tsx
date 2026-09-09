import { useEffect, useRef, useState } from 'react'
import { YijingDigitalRain } from './YijingDigitalRain'

const MIN_HOLD_MS = 800
const MAX_HOLD_MS = 120_000

function TaijiMark() {
  return (
    <svg
      className="hold-taiji"
      viewBox="0 0 100 100"
      width="148"
      height="148"
      aria-hidden
    >
      <circle cx="50" cy="50" r="48" fill="#39ff14" />
      <path
        d="M50 50 v-48 a48 48 0 0 0 0 96 a24 24 0 0 0 0-48 a24 24 0 0 1 0-48 z"
        fill="#061806"
      />
      <circle cx="50" cy="26" r="7.2" fill="#39ff14" />
      <circle cx="50" cy="74" r="7.2" fill="#061806" />
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke="rgba(57,255,20,0.65)"
        strokeWidth="1.4"
      />
    </svg>
  )
}

/**
 * 正式起卦前：按住阴阳鱼默念所问，松开后以按压毫秒参与取数。
 */
export function HoldCast({
  onComplete,
  onCancel,
}: {
  onComplete: (holdMs: number) => void
  onCancel: () => void
}) {
  const [holding, setHolding] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [tooShort, setTooShort] = useState(false)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef(0)
  const doneRef = useRef(false)

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function tick() {
    if (startRef.current == null) return
    const ms = Math.min(MAX_HOLD_MS, performance.now() - startRef.current)
    setElapsed(ms)
    if (ms < MAX_HOLD_MS) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }

  function beginHold(e: React.PointerEvent) {
    e.preventDefault()
    if (doneRef.current) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    startRef.current = performance.now()
    setHolding(true)
    setElapsed(0)
    setTooShort(false)
    rafRef.current = requestAnimationFrame(tick)
  }

  function endHold(e: React.PointerEvent) {
    e.preventDefault()
    if (doneRef.current || startRef.current == null) return
    cancelAnimationFrame(rafRef.current)
    const ms = Math.min(MAX_HOLD_MS, performance.now() - startRef.current)
    startRef.current = null
    setHolding(false)
    setElapsed(ms)
    if (ms < MIN_HOLD_MS) {
      setTooShort(true)
      setElapsed(0)
      return
    }
    doneRef.current = true
    onComplete(Math.round(ms))
  }

  const ready = holding && elapsed >= MIN_HOLD_MS

  return (
    <div className="hold-cast">
      <YijingDigitalRain className="yijing-rain" />
      <div className="hold-cast-fg">
        <div className="h1">按压起卦</div>
        <p className="sub">按住下方阴阳鱼，默念心中所想；可随时松手。</p>
        <button
          type="button"
          className={`hold-pad${holding ? ' holding' : ''}${ready ? ' ready' : ''}`}
          aria-label="按住默念起卦"
          onPointerDown={beginHold}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          <TaijiMark />
        </button>
        <p className="hold-hint-line" aria-live="polite">
          {holding ? (ready ? '可随时松手' : '默念中…') : '按住不放'}
        </p>
        {tooShort && !holding && (
          <p className="sub" style={{ textAlign: 'center', marginBottom: 8 }}>
            请再按久一点，默念后再松手。
          </p>
        )}
        <button className="btn ghost block" type="button" onClick={onCancel}>
          返回
        </button>
      </div>
    </div>
  )
}
