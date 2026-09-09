import { useEffect, useState } from 'react'
import type { CastMethod, CastSeed } from '../shared/types'

const META: Record<
  CastMethod,
  { title: string; sub: string }
> = {
  time: {
    title: '校时起卦',
    sub: '请稍候…',
  },
  geo: {
    title: '地理起卦',
    sub: '正在确认地点…',
  },
  weather: {
    title: '天气起卦',
    sub: '正在确认地点与天气…',
  },
  number: {
    title: '数字起卦',
    sub: '请稍候…',
  },
  color: {
    title: '颜色起卦',
    sub: '请稍候…',
  },
  random: {
    title: '随机起卦',
    sub: '请稍候…',
  },
}

export function CastAnim({
  method,
  seed,
  status,
  progress,
}: {
  method: CastMethod
  seed?: CastSeed | null
  status?: string
  /** 0–100 */
  progress?: number
}) {
  const meta = META[method]
  const pct = Math.max(0, Math.min(100, Math.round(progress ?? 0)))
  return (
    <>
      <div className="h1">{meta.title}</div>
      <p className="sub">{status || meta.sub}</p>
      {method === 'time' && <TimeAnim />}
      {method === 'geo' && <GeoAnim seed={seed} />}
      {method === 'weather' && <WeatherAnim seed={seed} />}
      {(method === 'number' || method === 'random') && <NumberAnim seed={seed} />}
      {method === 'color' && <ColorAnim seed={seed} />}

      <div className="cast-progress" aria-label={`进度 ${pct}%`}>
        <div className="cast-progress-track">
          <div className="cast-progress-fill" style={{ width: `${pct}%` }} />
          <div className="cast-progress-glow" style={{ left: `${pct}%` }} />
        </div>
        <div className="cast-progress-meta">
          <span>起卦进行中</span>
          <span>{pct}%</span>
        </div>
      </div>
    </>
  )
}

function TimeAnim() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 200)
    return () => clearInterval(id)
  }, [])

  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  const ms = now.getMilliseconds()
  const secAngle = (s + ms / 1000) * 6
  const minAngle = (m + s / 60) * 6
  const hourAngle = ((h % 12) + m / 60) * 30
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="anim-stage">
      <div className="chrono">
        <div className="chrono-ring chrono-ring-a" />
        <div className="chrono-ring chrono-ring-b" />
        <div className="chrono-face">
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className="chrono-tick"
              style={{ transform: `rotate(${i * 30}deg)` }}
            />
          ))}
          <div className="chrono-hand hour" style={{ transform: `rotate(${hourAngle}deg)` }} />
          <div className="chrono-hand minute" style={{ transform: `rotate(${minAngle}deg)` }} />
          <div className="chrono-hand second" style={{ transform: `rotate(${secAngle}deg)` }} />
          <div className="chrono-pivot" />
        </div>
      </div>
      <div className="chrono-readout">
        <span className="blink">{pad(h)}</span>:
        <span className="blink" style={{ animationDelay: '0.15s' }}>
          {pad(m)}
        </span>
        :
        <span className="blink" style={{ animationDelay: '0.3s' }}>
          {pad(s)}
        </span>
      </div>
      <div className="chrono-date">
        {now.getFullYear()}.{pad(now.getMonth() + 1)}.{pad(now.getDate())}
      </div>
    </div>
  )
}

function GeoAnim({ seed }: { seed?: CastSeed | null }) {
  const lat = seed?.lat
  const lon = seed?.lon
  const pinLeft = lat !== undefined ? `${((lat + 90) / 180) * 70 + 15}%` : '58%'
  const pinTop = lon !== undefined ? `${((lon + 180) / 360) * 60 + 20}%` : '42%'
  return (
    <div className="anim-stage">
      <div className="geo-map">
        <div className="geo-grid" />
        <div className="geo-land geo-land-a" />
        <div className="geo-land geo-land-b" />
        <div className="geo-scan" />
        <div className="geo-cross" />
        <div className="geo-ping" style={{ left: pinLeft, top: pinTop }} />
      </div>
      {seed?.placeLabel && <div className="chrono-date">{seed.placeLabel}</div>}
    </div>
  )
}

function WeatherAnim({ seed }: { seed?: CastSeed | null }) {
  return (
    <div className="anim-stage">
      <div className="wx-panel">
        <div className="wx-sky">
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="wx-drop"
              style={{ left: `${10 + i * 11}%`, animationDelay: `${i * 0.18}s` }}
            />
          ))}
          <div className="wx-cloud wx-cloud-a" />
          <div className="wx-cloud wx-cloud-b" />
        </div>
      </div>
      {seed?.placeLabel && <div className="chrono-date">{seed.placeLabel}</div>}
    </div>
  )
}

function NumberAnim({ seed }: { seed?: CastSeed | null }) {
  const [digits, setDigits] = useState([0, 0, 0])
  useEffect(() => {
    if (seed?.numbers?.length === 3) {
      setDigits(seed.numbers as [number, number, number])
      return
    }
    const id = window.setInterval(() => {
      setDigits([
        Math.floor(Math.random() * 9) + 1,
        Math.floor(Math.random() * 9) + 1,
        Math.floor(Math.random() * 9) + 1,
      ])
    }, 120)
    return () => clearInterval(id)
  }, [seed])
  return (
    <div className="anim-stage">
      <div className="num-roll">
        {digits.map((d, i) => (
          <span key={i} className="num-cell">
            {d}
          </span>
        ))}
      </div>
    </div>
  )
}

function ColorAnim({ seed }: { seed?: CastSeed | null }) {
  const rgb = seed?.rgb
  const css = rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : undefined
  return (
    <div className="anim-stage">
      <div className="color-anim-panel">
        <div
          className="color-anim-swatch"
          style={{ background: css || 'transparent' }}
        />
        <div className="chrono-date">{rgb ? '已取色' : '取色中…'}</div>
      </div>
    </div>
  )
}
