import { useEffect, useRef } from 'react'
import { YIJING_JIXIONG_QUOTES } from '../shared/yijingQuotes'

/** 字雨用：卦辞/系辞整段拆字，下落时按段串行 */
const RAIN_PASSAGES = YIJING_JIXIONG_QUOTES.map((q) =>
  q.text.replace(/[，。；、？！：\s]/g, ''),
).filter((s) => s.length >= 4)

type RainCol = {
  x: number
  y: number
  speed: number
  chars: string[]
  fontSize: number
  alpha: number
}

function buildRainColumns(width: number, height: number): RainCol[] {
  const fontSize = 12
  const gap = fontSize * 1.55
  const maxSlots = Math.max(4, Math.floor(width / gap))
  const count = Math.max(3, Math.round(maxSlots * (0.35 + Math.random() * 0.1)))
  const used = new Set<number>()
  const cols: RainCol[] = []
  while (cols.length < count && used.size < maxSlots) {
    const slot = Math.floor(Math.random() * maxSlots)
    if (used.has(slot)) continue
    used.add(slot)
    const passage =
      RAIN_PASSAGES[Math.floor(Math.random() * RAIN_PASSAGES.length)] ?? '元亨利贞'
    const start = Math.floor(Math.random() * Math.max(1, passage.length - 6))
    const len = 8 + Math.floor(Math.random() * 14)
    const chars = passage.slice(start, start + len).split('')
    cols.push({
      x: slot * gap + fontSize * 0.2,
      y: -Math.random() * height * 0.8,
      speed: 18 + Math.random() * 42,
      chars,
      fontSize,
      alpha: 0.22 + Math.random() * 0.28,
    })
  }
  return cols
}

/** 易经字雨背景：稀疏、不挡中央内容 */
export function YijingDigitalRain({
  className = 'yijing-rain',
  clearRatio = 0.38,
}: {
  className?: string
  /** 中央淡出半径相对短边比例 */
  clearRatio?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cols: RainCol[] = []
    let raf = 0
    let last = performance.now()
    let running = true

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = buildRainColumns(w, h)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)

    const paint = (now: number) => {
      if (!running) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const w = parent.clientWidth
      const h = parent.clientHeight
      ctx.clearRect(0, 0, w, h)

      const cx = w * 0.5
      const cy = h * 0.48
      const clearR = Math.min(w, h) * clearRatio

      for (const col of cols) {
        col.y += col.speed * dt
        const trail = col.chars.length
        const step = col.fontSize * 1.2
        if (col.y - trail * step > h + 20) {
          col.y = -Math.random() * h * 0.4
          const passage =
            RAIN_PASSAGES[Math.floor(Math.random() * RAIN_PASSAGES.length)] ?? '元亨利贞'
          const start = Math.floor(Math.random() * Math.max(1, passage.length - 6))
          const len = 8 + Math.floor(Math.random() * 14)
          col.chars = passage.slice(start, start + len).split('')
          col.speed = 18 + Math.random() * 42
          col.alpha = 0.22 + Math.random() * 0.28
        }

        ctx.font = `${col.fontSize}px "Microsoft YaHei UI", "PingFang SC", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (let i = 0; i < col.chars.length; i++) {
          const ch = col.chars[i]!
          const y = col.y - i * step
          if (y < -20 || y > h + 20) continue
          const dx = col.x - cx
          const dy = y - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const fade = dist < clearR ? Math.max(0, (dist / clearR - 0.35) / 0.65) : 1
          if (fade <= 0.02) continue
          const isHead = i === 0
          ctx.fillStyle = isHead
            ? `rgba(180, 255, 160, ${0.55 * fade})`
            : `rgba(57, 255, 20, ${col.alpha * fade * (1 - i / (trail + 2))})`
          ctx.save()
          ctx.translate(col.x, y)
          ctx.scale(0.62, 1)
          ctx.fillText(ch, 0, 0)
          ctx.restore()
        }
      }

      raf = requestAnimationFrame(paint)
    }
    raf = requestAnimationFrame(paint)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [clearRatio])

  return <canvas className={className} ref={canvasRef} aria-hidden />
}
