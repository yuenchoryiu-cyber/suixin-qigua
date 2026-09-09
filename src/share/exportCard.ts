export type ShareTemplateId = 'classic' | 'compact' | 'poster' | 'oracle'

export const SHARE_TEMPLATES: {
  id: ShareTemplateId
  label: string
  hint: string
}[] = [
  { id: 'classic', label: '经典', hint: '长卡 · 含追问解读' },
  { id: 'compact', label: '简洁', hint: '一行卦名 + 短解' },
  { id: 'poster', label: '海报', hint: '竖幅 · 含追问解读' },
  { id: 'oracle', label: '一句签', hint: '卦名 + 一句总括' },
]

export interface ShareDimBar {
  label: string
  /** 1–10 */
  value: number
  grade: string
}

export interface ShareCardData {
  schoolLabel: string
  hint: string
  guaTitle: string
  meta: string
  title: string
  body: string
  /** 一句签优先用 summary */
  summary?: string
  /** 追问问题 + 卦象解读（经典/海报追加） */
  followUp?: string
  /** 每日一卦等多维评分：画 bar chart */
  dims?: ShareDimBar[]
  disclaimer: string
}

/** 详细模板（经典 / 海报）会渲染追问解读 */
export function templateIncludesFollowUp(id: ShareTemplateId): boolean {
  return id === 'classic' || id === 'poster'
}

/** 将分享卡渲染为 PNG dataURL */
export async function exportSharePng(
  data: ShareCardData,
  template: ShareTemplateId = 'classic',
): Promise<string> {
  if (template === 'compact') return renderCompact(data)
  if (template === 'poster') return renderPoster(data)
  if (template === 'oracle') return renderOracle(data)
  return renderClassic(data)
}

function dimsBlockHeight(dims?: ShareDimBar[]): number {
  if (!dims?.length) return 0
  return 20 + dims.length * 28
}

async function renderClassic(data: ShareCardData): Promise<string> {
  const w = 720
  const pad = 48
  const maxW = w - pad * 2
  const canvas = document.createElement('canvas')
  const scale = 2
  canvas.width = 10
  canvas.height = 10
  let ctx = canvas.getContext('2d')!

  ctx.font = '16px Consolas, "Microsoft YaHei UI", sans-serif'
  const bodyLines = wrapByWidth(ctx, data.body.trim(), maxW)
  ctx.font = '15px Consolas, "Microsoft YaHei UI", sans-serif'
  const followLines = data.followUp?.trim()
    ? wrapByWidth(ctx, data.followUp.trim(), maxW)
    : []
  const bodyH = measureWrappedHeight(bodyLines, 28, 16)
  const followBlock = followLines.length
    ? 40 + measureWrappedHeight(followLines, 26, 12)
    : 0
  const h = Math.max(
    960,
    280 + Math.max(bodyH, 28) + dimsBlockHeight(data.dims) + followBlock + 100,
  )
  canvas.width = w * scale
  canvas.height = h * scale
  ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = '#071107'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#1a7a12'
  ctx.lineWidth = 3
  ctx.strokeRect(12, 12, w - 24, h - 24)

  let y = 48
  ctx.textAlign = 'left'
  ctx.fillStyle = '#39ff14'
  ctx.font = '700 28px Consolas, "Microsoft YaHei UI", sans-serif'
  ctx.fillText('随心起卦', pad, y)
  y += 28
  ctx.font = '13px Consolas, "Microsoft YaHei UI", sans-serif'
  ctx.fillStyle = '#7ab86a'
  fillFitted(ctx, `${data.schoolLabel} · ${data.hint}`, pad, y, maxW)
  y += 48
  ctx.fillStyle = '#39ff14'
  ctx.font = '48px "Segoe UI Symbol", "Microsoft YaHei UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(data.guaTitle, w / 2, y)
  y += 36
  ctx.font = '14px Consolas, "Microsoft YaHei UI", sans-serif'
  ctx.fillStyle = '#9fd88a'
  fillFitted(ctx, data.meta, pad, y, maxW, true)
  y += 40
  ctx.textAlign = 'left'
  if (data.title.trim()) {
    ctx.fillStyle = '#39ff14'
    ctx.font = '18px Consolas, "Microsoft YaHei UI", sans-serif'
    fillFitted(ctx, data.title, pad, y, maxW)
    y += 32
  }
  ctx.fillStyle = '#c8f560'
  ctx.font = '16px Consolas, "Microsoft YaHei UI", sans-serif'
  y = drawWrappedBlock(ctx, bodyLines, pad, y, maxW, 28, 16)

  y = drawDimBars(ctx, data.dims, pad, y + 8, maxW)

  if (followLines.length) {
    y += 12
    ctx.strokeStyle = '#1a7a12'
    ctx.beginPath()
    ctx.moveTo(pad, y)
    ctx.lineTo(w - pad, y)
    ctx.stroke()
    y += 28
    ctx.fillStyle = '#39ff14'
    ctx.font = '16px Consolas, "Microsoft YaHei UI", sans-serif'
    ctx.fillText('追问解读', pad, y)
    y += 28
    ctx.fillStyle = '#b8e878'
    ctx.font = '15px Consolas, "Microsoft YaHei UI", sans-serif'
    y = drawWrappedBlock(ctx, followLines, pad, y, maxW, 26, 12)
  }

  y += 16
  ctx.strokeStyle = '#1a7a12'
  ctx.beginPath()
  ctx.moveTo(pad, y)
  ctx.lineTo(w - pad, y)
  ctx.stroke()
  y += 28
  ctx.fillStyle = '#7ab86a'
  ctx.font = '12px Consolas, "Microsoft YaHei UI", sans-serif'
  for (const line of wrapByWidth(
    ctx,
    data.disclaimer + ' — 随心起卦 · 仅供心意参照',
    maxW,
  )) {
    if (!line) {
      y += 10
      continue
    }
    ctx.fillText(line, pad, y)
    y += 20
  }
  return canvas.toDataURL('image/png')
}

async function renderCompact(data: ShareCardData): Promise<string> {
  const w = 640
  const pad = 28
  const maxW = w - pad * 2
  const canvas = document.createElement('canvas')
  canvas.width = 10
  canvas.height = 10
  let ctx = canvas.getContext('2d')!
  ctx.font = '15px Consolas, "Microsoft YaHei UI", sans-serif'
  const snippet =
    data.body.trim().slice(0, 120) + (data.body.trim().length > 120 ? '…' : '')
  const lines = wrapByWidth(ctx, snippet, maxW)
  const bodyH = measureWrappedHeight(lines, 24, 12)
  const h = 280 + Math.max(bodyH, 24) + (data.dims?.length ? dimsBlockHeight(data.dims) : 0)
  const scale = 2
  canvas.width = w * scale
  canvas.height = h * scale
  ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = '#0a120a'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#1a7a12'
  ctx.fillRect(0, 0, 8, h)

  ctx.textAlign = 'left'
  ctx.fillStyle = '#7ab86a'
  ctx.font = '12px Consolas, "Microsoft YaHei UI", sans-serif'
  fillFitted(ctx, '随心起卦 · ' + data.schoolLabel, pad, 36, maxW)
  ctx.fillStyle = '#39ff14'
  ctx.font = '26px Consolas, "Microsoft YaHei UI", sans-serif'
  fillFitted(ctx, data.guaTitle, pad, 78, maxW)
  ctx.fillStyle = '#9fd88a'
  ctx.font = '13px Consolas, "Microsoft YaHei UI", sans-serif'
  fillFitted(ctx, data.meta, pad, 108, maxW)
  ctx.fillStyle = '#c8f560'
  ctx.font = '15px Consolas, "Microsoft YaHei UI", sans-serif'
  let y = 148
  y = drawWrappedBlock(ctx, lines, pad, y, maxW, 24, 12)
  y = drawDimBars(ctx, data.dims, pad, y + 6, maxW)
  ctx.fillStyle = '#5a8a52'
  ctx.font = '11px Consolas, "Microsoft YaHei UI", sans-serif'
  fillFitted(ctx, data.disclaimer, pad, h - 28, maxW)
  return canvas.toDataURL('image/png')
}

async function renderPoster(data: ShareCardData): Promise<string> {
  const w = 720
  const pad = 56
  const maxW = w - pad * 2
  const canvas = document.createElement('canvas')
  canvas.width = 10
  canvas.height = 10
  let ctx = canvas.getContext('2d')!
  ctx.font = '17px Consolas, "Microsoft YaHei UI", sans-serif'
  const bodyLines = wrapByWidth(ctx, data.body.trim(), maxW)
  ctx.font = '16px Consolas, "Microsoft YaHei UI", sans-serif'
  const followLines = data.followUp?.trim()
    ? wrapByWidth(ctx, data.followUp.trim(), maxW)
    : []
  const bodyH = measureWrappedHeight(bodyLines, 30, 18)
  const followBlock = followLines.length
    ? 48 + measureWrappedHeight(followLines, 28, 14)
    : 0
  const h = Math.max(
    1100,
    420 + Math.max(bodyH, 30) + dimsBlockHeight(data.dims) + followBlock + 80,
  )
  const scale = 2
  canvas.width = w * scale
  canvas.height = h * scale
  ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#041004')
  g.addColorStop(0.45, '#0a1a08')
  g.addColorStop(1, '#061006')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#1a7a12'
  ctx.fillRect(0, 0, w, 6)
  ctx.fillRect(0, h - 6, w, 6)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#39ff14'
  ctx.font = '700 22px Consolas, "Microsoft YaHei UI", sans-serif'
  ctx.fillText('随心起卦', w / 2, 64)
  ctx.fillStyle = '#7ab86a'
  ctx.font = '13px Consolas, "Microsoft YaHei UI", sans-serif'
  ctx.fillText(data.schoolLabel, w / 2, 92)

  ctx.fillStyle = '#39ff14'
  ctx.font = '72px "Segoe UI Symbol", "Microsoft YaHei UI", sans-serif'
  ctx.fillText(data.guaTitle.slice(0, 8), w / 2, 200)
  ctx.font = '20px Consolas, "Microsoft YaHei UI", sans-serif'
  fillFitted(ctx, data.meta, pad, 250, maxW, true)

  let y = 320
  if (data.title.trim()) {
    ctx.fillStyle = '#39ff14'
    ctx.font = '22px Consolas, "Microsoft YaHei UI", sans-serif'
    fillFitted(ctx, data.title, pad, y, maxW, true)
    y += 50
  }

  ctx.fillStyle = '#c8f560'
  ctx.font = '17px Consolas, "Microsoft YaHei UI", sans-serif'
  ctx.textAlign = 'left'
  y = drawWrappedBlock(ctx, bodyLines, pad, y, maxW, 30, 18)

  y = drawDimBars(ctx, data.dims, pad, y + 10, maxW)

  if (followLines.length) {
    y += 16
    ctx.strokeStyle = '#1a7a12'
    ctx.beginPath()
    ctx.moveTo(pad, y)
    ctx.lineTo(w - pad, y)
    ctx.stroke()
    y += 32
    ctx.textAlign = 'center'
    ctx.fillStyle = '#39ff14'
    ctx.font = '18px Consolas, "Microsoft YaHei UI", sans-serif'
    ctx.fillText('追问解读', w / 2, y)
    y += 32
    ctx.textAlign = 'left'
    ctx.fillStyle = '#b8e878'
    ctx.font = '16px Consolas, "Microsoft YaHei UI", sans-serif'
    y = drawWrappedBlock(ctx, followLines, pad, y, maxW, 28, 14)
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = '#5a8a52'
  ctx.font = '12px Consolas, "Microsoft YaHei UI", sans-serif'
  ctx.fillText('— 仅供心意参照 —', w / 2, h - 48)
  ctx.textAlign = 'left'
  return canvas.toDataURL('image/png')
}

async function renderOracle(data: ShareCardData): Promise<string> {
  const w = 640
  const h = 420
  const pad = 48
  const maxW = w - pad * 2
  const line =
    (data.summary || data.title || data.body.split(/[。！？\n]/)[0] || '').trim().slice(0, 36)
  const canvas = document.createElement('canvas')
  const scale = 2
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = '#061006'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#1a7a12'
  ctx.lineWidth = 2
  ctx.strokeRect(18, 18, w - 36, h - 36)

  ctx.fillStyle = '#6b9a5a'
  ctx.font = '13px Consolas, "Microsoft YaHei UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('随心起卦 · 一句签', w / 2, 64)

  ctx.fillStyle = '#39ff14'
  ctx.font = '42px Consolas, "Microsoft YaHei UI", sans-serif'
  ctx.fillText(data.guaTitle.slice(0, 10), w / 2, 150)

  ctx.fillStyle = '#c8f560'
  ctx.font = 'italic 18px KaiTi, "STKaiti", "Microsoft YaHei UI", serif'
  const lines = wrapByWidth(ctx, line, maxW)
  let y = 220
  for (const l of lines.slice(0, 3)) {
    if (!l) continue
    ctx.fillText(l, w / 2, y)
    y += 32
  }

  ctx.fillStyle = '#5a8a52'
  ctx.font = '12px Consolas, "Microsoft YaHei UI", sans-serif'
  ctx.fillText('卦象仅供参考，不是判决。', w / 2, h - 48)
  ctx.textAlign = 'left'
  return canvas.toDataURL('image/png')
}

/** 空字符串表示段落间距 */
function wrapByWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const raw = (text || '').replace(/\r/g, '').split('\n')
  const out: string[] = []
  for (const para of raw) {
    if (!para.trim()) {
      if (out.length && out[out.length - 1] !== '') out.push('')
      continue
    }
    let cur = ''
    for (const ch of para) {
      const trial = cur + ch
      if (ctx.measureText(trial).width > maxWidth && cur) {
        out.push(cur)
        cur = ch
      } else {
        cur = trial
      }
    }
    if (cur) out.push(cur)
  }
  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}

function measureWrappedHeight(
  lines: string[],
  lineH: number,
  paraGap: number,
): number {
  if (!lines.length) return 0
  let h = 0
  for (const line of lines) {
    h += line ? lineH : paraGap
  }
  return h
}

function drawWrappedBlock(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  pad: number,
  y: number,
  maxW: number,
  lineH: number,
  paraGap: number,
): number {
  if (!lines.length) return y + 8
  for (const line of lines) {
    if (!line) {
      y += paraGap
      continue
    }
    drawJustifiedLine(ctx, line, pad, y, maxW)
    y += lineH
  }
  return y
}

function drawDimBars(
  ctx: CanvasRenderingContext2D,
  dims: ShareDimBar[] | undefined,
  pad: number,
  y: number,
  maxW: number,
): number {
  if (!dims?.length) return y
  const labelW = 42
  const gradeW = 88
  const gap = 8
  const barX = pad + labelW + gap
  const barW = Math.max(40, maxW - labelW - gradeW - gap * 2)
  const barH = 8

  for (const d of dims) {
    const v = Math.min(10, Math.max(0, d.value))
    ctx.textAlign = 'left'
    ctx.fillStyle = '#7ab86a'
    ctx.font = '13px Consolas, "Microsoft YaHei UI", sans-serif'
    ctx.fillText(d.label, pad, y)

    const barY = y - 11
    ctx.fillStyle = 'rgba(57, 255, 20, 0.12)'
    ctx.fillRect(barX, barY, barW, barH)
    ctx.strokeStyle = '#1a7a12'
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barW, barH)
    ctx.fillStyle = '#39ff14'
    ctx.fillRect(barX, barY, (barW * v) / 10, barH)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#39ff14'
    ctx.font = '700 12px Consolas, "Microsoft YaHei UI", sans-serif'
    ctx.fillText(d.grade, pad + maxW, y)
    y += 28
  }
  ctx.textAlign = 'left'
  return y + 4
}

/** 非末行尽量两端对齐；末行或单行左对齐 */
function drawJustifiedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  const chars = [...line]
  if (chars.length <= 1) {
    ctx.textAlign = 'left'
    ctx.fillText(line, x, y)
    return
  }
  const natural = ctx.measureText(line).width
  if (natural >= maxWidth * 0.92 || /[，。！？；：、…—]$/.test(line)) {
    ctx.textAlign = 'left'
    ctx.fillText(line, x, y)
    return
  }
  const gaps = chars.length - 1
  const extra = (maxWidth - natural) / gaps
  if (extra <= 0 || extra > 8) {
    ctx.textAlign = 'left'
    ctx.fillText(line, x, y)
    return
  }
  let cx = x
  ctx.textAlign = 'left'
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cx, y)
    cx += ctx.measureText(chars[i]).width + (i < gaps ? extra : 0)
  }
}

function fillFitted(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  center = false,
) {
  const t = text || ''
  if (!t) return
  if (center) {
    ctx.textAlign = 'center'
    const mid = x + maxWidth / 2
    if (ctx.measureText(t).width <= maxWidth) {
      ctx.fillText(t, mid, y)
    } else {
      const lines = wrapByWidth(ctx, t, maxWidth)
      ctx.fillText(lines.find((l) => l) || '', mid, y)
    }
    return
  }
  ctx.textAlign = 'left'
  if (ctx.measureText(t).width <= maxWidth) {
    ctx.fillText(t, x, y)
  } else {
    const lines = wrapByWidth(ctx, t, maxWidth)
    ctx.fillText(lines.find((l) => l) || '', x, y)
  }
}
