import { YIJING_JIXIONG_QUOTES } from '../shared/yijingQuotes'

const RAIN_PASSAGES = YIJING_JIXIONG_QUOTES.map((q) =>
  q.text.replace(/[，。；、？！：\s]/g, ''),
).filter((s) => s.length >= 4)

/** 分享卡静态易经字雨（中央淡出，不挡正文） */
export function paintShareDigitalRain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const fontSize = 11
  const gap = fontSize * 1.6
  const maxSlots = Math.max(5, Math.floor(w / gap))
  const count = Math.max(5, Math.round(maxSlots * 0.42))
  const used = new Set<number>()
  const cx = w * 0.5
  const cy = h * 0.42
  const clearR = Math.min(w, h) * 0.36

  let n = 0
  let guard = 0
  while (n < count && guard++ < maxSlots * 4) {
    const slot = Math.floor(Math.random() * maxSlots)
    if (used.has(slot)) continue
    used.add(slot)
    n++
    const passage =
      RAIN_PASSAGES[Math.floor(Math.random() * RAIN_PASSAGES.length)] ?? '元亨利贞'
    const start = Math.floor(Math.random() * Math.max(1, passage.length - 6))
    const len = 10 + Math.floor(Math.random() * 12)
    const chars = passage.slice(start, start + len).split('')
    const x = slot * gap + fontSize * 0.25
    const y0 = -20 + Math.random() * (h * 0.85)
    const alpha = 0.14 + Math.random() * 0.22
    const step = fontSize * 1.18

    ctx.font = `${fontSize}px "Microsoft YaHei UI", "PingFang SC", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < chars.length; i++) {
      const y = y0 + i * step
      if (y < -10 || y > h + 10) continue
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const fade = dist < clearR ? Math.max(0, (dist / clearR - 0.3) / 0.7) : 1
      if (fade <= 0.03) continue
      const isHead = i === 0
      ctx.fillStyle = isHead
        ? `rgba(180, 255, 160, ${0.42 * fade})`
        : `rgba(57, 255, 20, ${alpha * fade * (1 - i / (chars.length + 2))})`
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(0.58, 1)
      ctx.fillText(chars[i]!, 0, 0)
      ctx.restore()
    }
  }
}
