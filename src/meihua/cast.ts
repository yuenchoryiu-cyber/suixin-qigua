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

/** 起卦瞬间环境变数：年支+月+日+时支+分+秒 */
export function momentEnv(when: Date = new Date()): number {
  const yZhi = yearZhiNumber(when.getFullYear())
  const m = when.getMonth() + 1
  const d = when.getDate()
  const hZhi = hourZhiNumber(when.getHours(), when.getMinutes())
  return yZhi + m + d + hZhi + when.getMinutes() + when.getSeconds()
}

/** 按压毫秒盐：保留时长信息，避免只落到很小余数 */
export function holdSalt(holdMs: number): number {
  const ms = Math.max(0, Math.floor(Math.abs(holdMs)))
  return Math.floor(ms / 17) + (ms % 97)
}

export type CastEntropy = {
  enabled: boolean
  when?: Date
  holdMs?: number
}

function entropyMix(ent?: CastEntropy): { E: number; H: number; mix: number; label: string } {
  if (!ent?.enabled) return { E: 0, H: 0, mix: 0, label: '' }
  const when = ent.when ?? new Date()
  const E = momentEnv(when)
  const H = holdSalt(ent.holdMs ?? 0)
  const mix = E + H
  const label = ''
  return { E, H, mix, label }
}

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

/** 三数起卦：上=数1，下=数2，动=(1+2+3)%6；可混入瞬时 E + 按压 */
export function castByNumbers(
  input: CastInput,
  n1: number,
  n2: number,
  n3: number,
  ent?: CastEntropy,
): CastResult {
  const a = Math.max(1, Math.floor(Math.abs(n1)))
  const b = Math.max(1, Math.floor(Math.abs(n2)))
  const c = Math.max(1, Math.floor(Math.abs(n3)))
  const { mix, E } = entropyMix(ent)
  return finish(
    'number',
    input,
    mod8(a + mix),
    mod8(b + mix),
    mod6(a + b + c + mix),
    `三数起卦`,
    { numbers: [a, b, c], momentE: E || undefined, holdMs: ent?.holdMs },
  )
}

/**
 * 地理起卦：纬→上，经→下；混入瞬时 E + 按压后同地不同时/按压亦可变卦
 */
export function castByGeo(
  input: CastInput,
  lat: number,
  lon: number,
  label?: string,
  when: Date = new Date(),
  ent?: CastEntropy,
): CastResult {
  const latSeed = toSeedInt(lat)
  const lonSeed = toSeedInt(lon)
  const hZhi = hourZhiNumber(when.getHours(), when.getMinutes())
  const place = label?.trim() || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  const { mix, E } = entropyMix({
    enabled: ent?.enabled ?? true,
    when: ent?.when ?? when,
    holdMs: ent?.holdMs,
  })
  return finish(
    'geo',
    input,
    mod8(latSeed + mix),
    mod8(lonSeed + mix),
    mod6(latSeed + lonSeed + hZhi + mix),
    place,
    { lat, lon, placeLabel: place, momentE: E || undefined, holdMs: ent?.holdMs },
  )
}

/** 颜色起卦：R→上，G→下；混入瞬时 E + 按压 */
export function castByColor(
  input: CastInput,
  r: number,
  g: number,
  b: number,
  ent?: CastEntropy,
): CastResult {
  const R = Math.max(0, Math.min(255, Math.round(r)))
  const G = Math.max(0, Math.min(255, Math.round(g)))
  const B = Math.max(0, Math.min(255, Math.round(b)))
  const { mix, E } = entropyMix(ent)
  return finish(
    'color',
    input,
    mod8((R || 256) + mix),
    mod8((G || 256) + mix),
    mod6((R + G + B || 6) + mix),
    `颜色起卦`,
    { rgb: [R, G, B], numbers: [R, G, B], momentE: E || undefined, holdMs: ent?.holdMs },
  )
}

/** 随机取数：三枚熵数；仍可再混入按压毫秒 */
export function castByRandom(input: CastInput, ent?: CastEntropy): CastResult {
  const a = 1 + Math.floor(Math.random() * 999)
  const b = 1 + Math.floor(Math.random() * 999)
  const c = 1 + Math.floor(Math.random() * 999)
  const { mix, E } = entropyMix(ent)
  return finish(
    'random',
    input,
    mod8(a + mix),
    mod8(b + mix),
    mod6(a + b + c + mix),
    `随机起卦`,
    { numbers: [a, b, c], momentE: E || undefined, holdMs: ent?.holdMs },
  )
}

/**
 * 天气起卦：气温→上，湿度→下；混入瞬时 E + 按压
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
  ent?: CastEntropy,
): CastResult {
  const t = Math.round(opts.tempC)
  const hum = Math.max(1, Math.round(opts.humidity))
  const p = Math.round(opts.pressure ?? 1013)
  const place = opts.placeLabel || `${opts.lat.toFixed(2)},${opts.lon.toFixed(2)}`
  const { mix, E } = entropyMix(ent)
  return finish(
    'weather',
    input,
    mod8(Math.abs(t) + 1 + mix),
    mod8(hum + mix),
    mod6(Math.abs(t) + hum + (p % 100) + mix),
    place,
    {
      lat: opts.lat,
      lon: opts.lon,
      placeLabel: place,
      tempC: opts.tempC,
      humidity: hum,
      pressure: p,
      momentE: E || undefined,
      holdMs: ent?.holdMs,
    },
  )
}

export type CastMethodExtras = {
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
  entropy?: CastEntropy
}

export async function castByMethod(
  input: CastInput,
  extras: CastMethodExtras,
): Promise<CastResult> {
  const ent = extras.entropy
  switch (input.method) {
    case 'time':
      return castByTime(input, ent?.when)
    case 'number': {
      const n = extras.numbers
      if (!n) throw new Error('请输入三个正整数。')
      return castByNumbers(input, n[0], n[1], n[2], ent)
    }
    case 'color': {
      const rgb = extras.rgb
      if (!rgb) throw new Error('请点选一种颜色。')
      return castByColor(input, rgb[0], rgb[1], rgb[2], ent)
    }
    case 'geo': {
      const g = extras.geo
      if (!g) throw new Error('缺少地理坐标。')
      return castByGeo(input, g.lat, g.lon, g.label, ent?.when ?? new Date(), ent)
    }
    case 'weather': {
      const w = extras.weather
      if (!w) throw new Error('缺少气象数据。')
      return castByWeather(input, w, ent)
    }
    case 'random': {
      const n = extras.numbers
      if (n) {
        const { mix, E } = entropyMix(ent)
        return finish(
          'random',
          input,
          mod8(n[0] + mix),
          mod8(n[1] + mix),
          mod6(n[0] + n[1] + n[2] + mix),
          `随机起卦`,
          { numbers: [n[0], n[1], n[2]], momentE: E || undefined, holdMs: ent?.holdMs },
        )
      }
      return castByRandom(input, ent)
    }
    default:
      throw new Error('未知起卦方式')
  }
}

/** 供六爻 / 奇门把按压与瞬时 E 折成整数种子 */
export function entropySeedInt(ent?: CastEntropy): number {
  const { mix } = entropyMix(ent)
  return mix
}
