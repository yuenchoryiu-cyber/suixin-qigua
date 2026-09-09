import { useMemo } from 'react'

export type Rgb = { r: number; g: number; b: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function hsvToRgb(h: number, s: number, v: number): Rgb {
  const hh = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = v - c
  let rp = 0
  let gp = 0
  let bp = 0
  if (hh < 60) [rp, gp, bp] = [c, x, 0]
  else if (hh < 120) [rp, gp, bp] = [x, c, 0]
  else if (hh < 180) [rp, gp, bp] = [0, c, x]
  else if (hh < 240) [rp, gp, bp] = [0, x, c]
  else if (hh < 300) [rp, gp, bp] = [x, 0, c]
  else [rp, gp, bp] = [c, 0, x]
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  }
}

type HexCell = {
  id: string
  col: number
  row: number
  rgb: Rgb
  x: number
  y: number
}

/** 六边形蜂巢色盘：点选一格，取该格真实 RGB 起卦 */
export function ColorMatrixPicker({
  value,
  onChange,
}: {
  value: Rgb | null
  onChange: (rgb: Rgb) => void
}) {
  const cells = useMemo(() => buildHoneycomb(4), [])
  const size = useMemo(() => {
    const maxX = Math.max(...cells.map((c) => c.x)) + 0.55
    const maxY = Math.max(...cells.map((c) => c.y)) + 0.65
    const minX = Math.min(...cells.map((c) => c.x)) - 0.55
    const minY = Math.min(...cells.map((c) => c.y)) - 0.65
    return { w: maxX - minX, h: maxY - minY, minX, minY }
  }, [cells])

  const selectedId = useMemo(() => {
    if (!value) return null
    let best: HexCell | null = null
    let bestDist = Infinity
    for (const c of cells) {
      const d =
        (c.rgb.r - value.r) ** 2 + (c.rgb.g - value.g) ** 2 + (c.rgb.b - value.b) ** 2
      if (d < bestDist) {
        bestDist = d
        best = c
      }
    }
    return best?.id ?? null
  }, [cells, value])

  return (
    <div className="color-honey-wrap">
      <div
        className="color-honey"
        role="listbox"
        aria-label="蜂巢色盘，点选一格"
      >
        <div
          className="color-honey-stage"
          style={{ aspectRatio: `${size.w} / ${size.h}` }}
        >
          {cells.map((c) => {
            const active = selectedId === c.id
            const cellW = 1
            const cellH = 2 / Math.sqrt(3)
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`color-honey-cell${active ? ' active' : ''}`}
                style={{
                  left: `${((c.x - size.minX - cellW / 2) / size.w) * 100}%`,
                  top: `${((c.y - size.minY - cellH / 2) / size.h) * 100}%`,
                  width: `${(cellW / size.w) * 100}%`,
                  height: `${(cellH / size.h) * 100}%`,
                  background: `rgb(${c.rgb.r},${c.rgb.g},${c.rgb.b})`,
                }}
                title="点选此色"
                onClick={() => onChange(c.rgb)}
              />
            )
          })}
        </div>
      </div>
      {value ? (
        <div className="color-matrix-meta">
          <span
            className="color-swatch"
            style={{ background: `rgb(${value.r},${value.g},${value.b})` }}
          />
          <span>已选中</span>
        </div>
      ) : (
        <p className="sub">点选蜂巢中的一格颜色即可。</p>
      )}
    </div>
  )
}

/** 半径 R 的蜂巢（轴向坐标），中心灰白、外圈高饱和色谱 */
function buildHoneycomb(radius: number): HexCell[] {
  const cells: HexCell[] = []
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius)
    const r2 = Math.min(radius, -q + radius)
    for (let r = r1; r <= r2; r++) {
      const s = -q - r
      const dist = (Math.abs(q) + Math.abs(r) + Math.abs(s)) / 2
      const angle = Math.atan2(r * (Math.sqrt(3) / 2), q + r / 2)
      const hue = ((angle * 180) / Math.PI + 360) % 360
      const sat = dist === 0 ? 0 : clamp(0.35 + (dist / radius) * 0.65, 0, 1)
      const val = dist === 0 ? 0.92 : clamp(0.55 + (1 - dist / radius) * 0.4, 0.45, 1)
      // 扁六边形像素坐标（pointy-top → screen）
      const x = q + r / 2 + radius
      const y = r * (Math.sqrt(3) / 2) + radius * (Math.sqrt(3) / 2)
      cells.push({
        id: `${q},${r}`,
        col: q,
        row: r,
        rgb: hsvToRgb(hue, sat, val),
        x,
        y,
      })
    }
  }
  return cells
}
