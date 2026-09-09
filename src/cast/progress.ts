/** 平滑推进进度条：在 durationMs 内从 from 到 to */
export function animateProgress(
  from: number,
  to: number,
  durationMs: number,
  onTick: (p: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now()
    const span = to - from
    let raf = 0
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // ease-in-out
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      onTick(from + span * eased)
      if (t < 1) raf = requestAnimationFrame(frame)
      else {
        onTick(to)
        resolve()
      }
    }
    raf = requestAnimationFrame(frame)
    void raf
  })
}

export function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

/** 阶段：先写文案，再把进度缓推到目标 */
export async function stage(
  label: string,
  targetPct: number,
  durationMs: number,
  setStatus: (s: string) => void,
  setProgress: (p: number) => void,
  getProgress: () => number,
) {
  setStatus(label)
  await animateProgress(getProgress(), targetPct, durationMs, setProgress)
}
