import type { CastInput, CastResult, CastSeed } from '../shared/types'
import { castByMethod } from '../meihua/cast'
import { buildFingerprint } from '../meihua/fingerprint'
import { castLiuyao, type LiuyaoPan } from '../liuyao/pan'
import { buildQimenPan, type QimenPan } from '../qimen/pan'
import { getHexagram } from '../meihua/hexagrams'

export type CastExtras = Parameters<typeof castByMethod>[1]

function toSeedInt(n: number): number {
  return Math.max(1, Math.round(Math.abs(n) * 100))
}

export async function castUnified(options: {
  school: import('../shared/types').DivinationSchool
  input: CastInput
  extras: CastExtras
}): Promise<CastResult> {
  const { school, input, extras } = options

  if (school === 'meihua') {
    const r = await castByMethod(input, extras)
    return { ...r, school: 'meihua' }
  }

  if (school === 'liuyao') {
    return castLiuyaoUnified(input, extras)
  }

  return castQimenUnified(input, extras)
}

function castLiuyaoUnified(input: CastInput, extras: CastExtras): CastResult {
  let pan: LiuyaoPan
  let seed: CastSeed | undefined
  let hintPrefix = ''

  if (input.method === 'number') {
    pan = castLiuyao('coin')
    hintPrefix = '铜钱六爻'
  } else if (input.method === 'random') {
    const n = extras.numbers
    const s = n
      ? Math.floor(n[0]) * 1000003 + Math.floor(n[1]) * 1009 + Math.floor(n[2])
      : Date.now()
    pan = castLiuyao('seed', new Date(), s)
    seed = n ? { numbers: [n[0], n[1], n[2]] } : undefined
    hintPrefix = n ? `随机六爻 · ${n.join('/')}` : '随机六爻'
  } else if (input.method === 'color' && extras.rgb) {
    const [r, g, b] = extras.rgb
    const s = r * 65537 + g * 257 + b
    pan = castLiuyao('seed', new Date(), s)
    seed = { rgb: [r, g, b], numbers: [r, g, b] }
    hintPrefix = `颜色六爻 · RGB(${r},${g},${b})`
  } else if (input.method === 'geo' && extras.geo) {
    const { lat, lon, label } = extras.geo
    const s = toSeedInt(lat) * 997 + toSeedInt(lon)
    pan = castLiuyao('seed', new Date(), s)
    seed = { lat, lon, placeLabel: label }
    hintPrefix = `地理六爻 · ${label || `${lat.toFixed(4)},${lon.toFixed(4)}`}`
  } else if (input.method === 'weather' && extras.weather) {
    const w = extras.weather
    const s =
      Math.round(Math.abs(w.tempC) * 10) * 131 +
      Math.round(w.humidity) * 17 +
      Math.round(w.pressure ?? 1013)
    pan = castLiuyao('seed', new Date(), s)
    seed = {
      lat: w.lat,
      lon: w.lon,
      placeLabel: w.placeLabel,
      tempC: w.tempC,
      humidity: w.humidity,
      pressure: w.pressure,
    }
    hintPrefix = `气象六爻 · ${w.tempC.toFixed(1)}°C / 湿${Math.round(w.humidity)}%`
  } else {
    pan = castLiuyao('time')
    hintPrefix = '时间六爻'
  }

  const r = liuyaoToCastResult(input, pan)
  return {
    ...r,
    lunarHint: `${hintPrefix} · ${pan.hint}`,
    seed: seed || r.seed,
  }
}

function castQimenUnified(input: CastInput, extras: CastExtras): CastResult {
  let juOverride: number | undefined
  let seedHint = '时家'
  let seed: CastSeed | undefined

  if (
    (input.method === 'number' || input.method === 'random') &&
    extras.numbers
  ) {
    const [a, b, c] = extras.numbers
    juOverride = ((a + b + c - 1) % 9) + 1
    seedHint =
      input.method === 'random'
        ? `随机定${juOverride}局 · ${a}/${b}/${c}`
        : `三数 ${a}/${b}/${c} 定${juOverride}局`
    seed = { numbers: extras.numbers }
  } else if (input.method === 'random') {
    const a = 1 + Math.floor(Math.random() * 999)
    const b = 1 + Math.floor(Math.random() * 999)
    const c = 1 + Math.floor(Math.random() * 999)
    juOverride = ((a + b + c - 1) % 9) + 1
    seedHint = `随机定${juOverride}局 · ${a}/${b}/${c}`
    seed = { numbers: [a, b, c] }
  } else if (input.method === 'color' && extras.rgb) {
    const [r, g, b] = extras.rgb
    juOverride = ((r + g + b - 1) % 9) + 1
    seedHint = `颜色 RGB(${r},${g},${b}) 定${juOverride}局`
    seed = { rgb: [r, g, b], numbers: [r, g, b] }
  } else if (input.method === 'geo' && extras.geo) {
    const { lat, lon, label } = extras.geo
    juOverride = ((toSeedInt(lat) + toSeedInt(lon) - 1) % 9) + 1
    seedHint = `地理定${juOverride}局 · ${label || `${lat.toFixed(4)},${lon.toFixed(4)}`}`
    seed = { lat, lon, placeLabel: label }
  } else if (input.method === 'weather' && extras.weather) {
    const w = extras.weather
    juOverride =
      ((Math.abs(Math.round(w.tempC)) + Math.round(w.humidity) + Math.round(w.pressure ?? 1013) -
        1) %
        9) +
      1
    seedHint = `气象定${juOverride}局 · ${w.tempC.toFixed(1)}°C`
    seed = {
      lat: w.lat,
      lon: w.lon,
      placeLabel: w.placeLabel,
      tempC: w.tempC,
      humidity: w.humidity,
      pressure: w.pressure,
    }
  }

  const pan = buildQimenPan(new Date(), { juOverride, seedHint })
  const r = qimenToCastResult(input, pan)
  return { ...r, method: input.method, seed: seed || r.seed }
}

function liuyaoToCastResult(input: CastInput, pan: LiuyaoPan): CastResult {
  const bits = pan.yao.map((v) => (v === 7 || v === 9 ? 1 : 0))
  const lowerBits = bits.slice(0, 3).join('')
  const upperBits = bits.slice(3, 6).join('')
  const bitToNum: Record<string, number> = {
    '111': 1,
    '011': 2,
    '101': 3,
    '001': 4,
    '110': 5,
    '010': 6,
    '100': 7,
    '000': 8,
  }
  const lowerNum = bitToNum[lowerBits] || 8
  const upperNum = bitToNum[upperBits] || 8
  const ben = getHexagram(lowerNum, upperNum)
  const moving = pan.lines.filter((l) => l.moving).map((l) => l.pos)
  const changeYao = moving[0] || 1
  return {
    school: 'liuyao',
    method: input.method,
    datetime: new Date().toISOString(),
    lunarHint: pan.hint,
    upperNum,
    lowerNum,
    changeYao,
    ben: { ...ben, name: pan.benName, judgment: pan.hint },
    hu: ben,
    bian: { ...ben, name: pan.bianName, judgment: pan.hint },
    tiIsUpper: changeYao > 3,
    fingerprint: buildFingerprint({ ...input, school: 'liuyao' }),
    steps: pan.steps,
    liuyao: pan,
  }
}

function qimenToCastResult(input: CastInput, pan: QimenPan): CastResult {
  const ben = getHexagram(1, 1)
  return {
    school: 'qimen',
    method: input.method,
    datetime: new Date().toISOString(),
    lunarHint: pan.hint,
    upperNum: 1,
    lowerNum: 1,
    changeYao: 1,
    ben: {
      ...ben,
      symbol: '⌘',
      name: `奇门${pan.dun}${pan.ju}`,
      judgment: pan.hint,
    },
    hu: ben,
    bian: ben,
    tiIsUpper: true,
    fingerprint: buildFingerprint({ ...input, school: 'qimen' }),
    steps: pan.steps,
    qimen: pan,
  }
}

export type { LiuyaoPan, QimenPan }
