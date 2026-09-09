import type { CastInput, CastMethod, CastResult, CastSeed } from '../shared/types'
import {
  changeHexagram,
  getHexagram,
  mod6,
  mod8,
  mutualHexagram,
} from './hexagrams'
import { buildFingerprint } from './fingerprint'
import { buildCastSteps } from './explain'

function yearZhiNumber(year: number): number {
  const n = ((year - 1984) % 12 + 12) % 12
  return n + 1
}

function hourZhiNumber(hour: number, minute: number): number {
  const total = hour * 60 + minute
  if (total >= 23 * 60 || total < 1 * 60) return 1
  if (total < 3 * 60) return 2
  if (total < 5 * 60) return 3
  if (total < 7 * 60) return 4
  if (total < 9 * 60) return 5
  if (total < 11 * 60) return 6
  if (total < 13 * 60) return 7
  if (total < 15 * 60) return 8
  if (total < 17 * 60) return 9
  if (total < 19 * 60) return 10
  if (total < 21 * 60) return 11
  return 12
}

const ZHI = '子丑寅卯辰巳午未申酉戌亥'

function finish(
  method: CastMethod,
  input: CastInput,
  upperNum: number,
  lowerNum: number,
  changeYao: number,
  lunarHint: string,
  seed?: CastSeed,
): CastResult {
  const ben = getHexagram(lowerNum, upperNum)
  const hu = mutualHexagram(ben)
  const bian = changeHexagram(ben, changeYao)
  const result: CastResult = {
    method,
    datetime: new Date().toISOString(),
    lunarHint,
    upperNum,
    lowerNum,
    changeYao,
    ben,
    hu,
    bian,
    tiIsUpper: changeYao <= 3,
    fingerprint: buildFingerprint(input),
    seed,
  }
  result.steps = buildCastSteps(result)
  return result
}

/** 把任意正实数压成可用于取卦的整数（放大后取整） */
function toSeedInt(n: number): number {
  return Math.max(1, Math.round(Math.abs(n) * 100))
}

export function castByTime(input: CastInput, when: Date = new Date()): CastResult {
  const y = when.getFullYear()
  const m = when.getMonth() + 1
  const d = when.getDate()
  const h = when.getHours()
  const min = when.getMinutes()
  const yZhi = yearZhiNumber(y)
  const hZhi = hourZhiNumber(h, min)
  const upperNum = mod8(yZhi + m + d)
  const lowerNum = mod8(yZhi + m + d + hZhi)
  const changeYao = mod6(yZhi + m + d + hZhi)
  return finish(
    'time',
    input,
    upperNum,
    lowerNum,
    changeYao,
    `${y}年${ZHI[yZhi - 1]}年 · ${m}月${d}日 · ${ZHI[hZhi - 1]}时`,
  )
}

/** 三数起卦：上=数1，下=数2，动=(1+2+3)%6 */
export function castByNumbers(
  input: CastInput,
  n1: number,
  n2: number,
  n3: number,
): CastResult {
  const a = Math.max(1, Math.floor(Math.abs(n1)))
  const b = Math.max(1, Math.floor(Math.abs(n2)))
  const c = Math.max(1, Math.floor(Math.abs(n3)))
  return finish(
    'number',
    input,
    mod8(a),
    mod8(b),
    mod6(a + b + c),
    `三数 ${a} / ${b} / ${c}`,
    { numbers: [a, b, c] },
  )
}

/**
 * 地理起卦：纬度→上，经度→下，动爻=(纬密+经密+时支)%6
 * 经纬保留两位小数后放大取整，保证同一地点短时可复现、移动后会变。
 */
export function castByGeo(
  input: CastInput,
  lat: number,
  lon: number,
  label?: string,
  when: Date = new Date(),
): CastResult {
  const latSeed = toSeedInt(lat)
  const lonSeed = toSeedInt(lon)
  const hZhi = hourZhiNumber(when.getHours(), when.getMinutes())
  const place = label?.trim() || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  return finish(
    'geo',
    input,
    mod8(latSeed),
    mod8(lonSeed),
    mod6(latSeed + lonSeed + hZhi),
    `地理 · ${place} · ${lat.toFixed(4)}°N/S ${lon.toFixed(4)}°E/W`,
    { lat, lon, placeLabel: place },
  )
}

/**
 * 颜色起卦：R→上，G→下，动=(R+G+B)%6（用实际 RGB 0–255）
 */
export function castByColor(
  input: CastInput,
  r: number,
  g: number,
  b: number,
): CastResult {
  const R = Math.max(0, Math.min(255, Math.round(r)))
  const G = Math.max(0, Math.min(255, Math.round(g)))
  const B = Math.max(0, Math.min(255, Math.round(b)))
  return finish(
    'color',
    input,
    mod8(R || 256),
    mod8(G || 256),
    mod6(R + G + B || 6),
    `颜色 · RGB(${R}, ${G}, ${B})`,
    { rgb: [R, G, B], numbers: [R, G, B] },
  )
}

/** 随机取数：三枚熵数定上下卦与动爻 */
export function castByRandom(input: CastInput): CastResult {
  const a = 1 + Math.floor(Math.random() * 999)
  const b = 1 + Math.floor(Math.random() * 999)
  const c = 1 + Math.floor(Math.random() * 999)
  return finish(
    'random',
    input,
    mod8(a),
    mod8(b),
    mod6(a + b + c),
    `随机 · ${a} / ${b} / ${c}`,
    { numbers: [a, b, c] },
  )
}

/**
 * 天气起卦：气温→上，湿度→下，动=(气温整数+湿度+气压尾数)%6
 */
export function castByWeather(
  input: CastInput,
  opts: {
    tempC: number
    humidity: number
    pressure?: number
    lat: number
    lon: number
    placeLabel?: string
  },
): CastResult {
  const t = Math.round(opts.tempC)
  const hum = Math.max(1, Math.round(opts.humidity))
  const p = Math.round(opts.pressure ?? 1013)
  const place = opts.placeLabel || `${opts.lat.toFixed(2)},${opts.lon.toFixed(2)}`
  return finish(
    'weather',
    input,
    mod8(Math.abs(t) + 1),
    mod8(hum),
    mod6(Math.abs(t) + hum + (p % 100)),
    `气象 · ${place} · ${opts.tempC.toFixed(1)}°C · 湿度${hum}% · ${p}hPa`,
    {
      lat: opts.lat,
      lon: opts.lon,
      placeLabel: place,
      tempC: opts.tempC,
      humidity: hum,
      pressure: p,
    },
  )
}

export async function castByMethod(
  input: CastInput,
  extras: {
    numbers?: [number, number, number]
    rgb?: [number, number, number]
    geo?: { lat: number; lon: number; label?: string }
    weather?: {
      tempC: number
      humidity: number
      pressure?: number
      lat: number
      lon: number
      placeLabel?: string
    }
  },
): Promise<CastResult> {
  switch (input.method) {
    case 'time':
      return castByTime(input)
    case 'number': {
      const n = extras.numbers
      if (!n) throw new Error('请输入三个正整数。')
      return castByNumbers(input, n[0], n[1], n[2])
    }
    case 'color': {
      const rgb = extras.rgb
      if (!rgb) throw new Error('请点选一种颜色。')
      return castByColor(input, rgb[0], rgb[1], rgb[2])
    }
    case 'geo': {
      const g = extras.geo
      if (!g) throw new Error('缺少地理坐标。')
      return castByGeo(input, g.lat, g.lon, g.label)
    }
    case 'weather': {
      const w = extras.weather
      if (!w) throw new Error('缺少气象数据。')
      return castByWeather(input, w)
    }
    case 'random': {
      const n = extras.numbers
      if (n) {
        return finish(
          'random',
          input,
          mod8(n[0]),
          mod8(n[1]),
          mod6(n[0] + n[1] + n[2]),
          `随机 · ${n[0]} / ${n[1]} / ${n[2]}`,
          { numbers: [n[0], n[1], n[2]] },
        )
      }
      return castByRandom(input)
    }
    default:
      throw new Error('未知起卦方式')
  }
}
