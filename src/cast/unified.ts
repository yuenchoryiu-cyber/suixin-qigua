import type { CastInput, CastResult, CastSeed } from '../shared/types'
import { castByMethod, entropySeedInt } from '../meihua/cast'
import { buildFingerprint } from '../meihua/fingerprint'
import { castLiuyao, type LiuyaoPan } from '../liuyao/pan'
import { buildQimenPan, type QimenPan } from '../qimen/pan'
import { getHexagram } from '../meihua/hexagrams'

export type CastExtras = Parameters<typeof castByMethod>[1]

function toSeedInt(n: number): number {
  return Math.max(1, Math.round(Math.abs(n) * 100))
}

function withEntropySeed(base: number, extras: CastExtras): number {
  return base + entropySeedInt(extras.entropy)
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
  const holdMs = extras.entropy?.holdMs
  const momentE = extras.entropy?.enabled ? entropySeedInt(extras.entropy) : undefined

  if (input.method === 'number') {
    const s = withEntropySeed(Date.now() % 1000003, extras)
    pan = castLiuyao('seed', new Date(), s)
    seed = { momentE, holdMs }
    hintPrefix = '铜钱六爻'
  } else if (input.method === 'random') {
    const n = extras.numbers
    const s = withEntropySeed(
      n
        ? Math.floor(n[0]) * 1000003 + Math.floor(n[1]) * 1009 + Math.floor(n[2])
        : Date.now(),
      extras,
    )
    pan = castLiuyao('seed', new Date(), s)
    seed = n ? { numbers: [n[0], n[1], n[2]], momentE, holdMs } : { momentE, holdMs }
    hintPrefix = '随机六爻'
  } else if (input.method === 'color' && extras.rgb) {
    const [r, g, b] = extras.rgb
    const s = withEntropySeed(r * 65537 + g * 257 + b, extras)
    pan = castLiuyao('seed', new Date(), s)
    seed = { rgb: [r, g, b], numbers: [r, g, b], momentE, holdMs }
    hintPrefix = '颜色六爻'
  } else if (input.method === 'geo' && extras.geo) {
    const { lat, lon, label } = extras.geo
    const s = withEntropySeed(toSeedInt(lat) * 997 + toSeedInt(lon), extras)
    pan = castLiuyao('seed', new Date(), s)
    seed = { lat, lon, placeLabel: label, momentE, holdMs }
    hintPrefix = label || '地理六爻'
  } else if (input.method === 'weather' && extras.weather) {
    const w = extras.weather
    const s = withEntropySeed(
      Math.round(Math.abs(w.tempC) * 10) * 131 +
        Math.round(w.humidity) * 17 +
        Math.round(w.pressure ?? 1013),
      extras,
    )
    pan = castLiuyao('seed', new Date(), s)
    seed = {
      lat: w.lat,
      lon: w.lon,
      placeLabel: w.placeLabel,
      tempC: w.tempC,
      humidity: w.humidity,
      pressure: w.pressure,
      momentE,
      holdMs,
    }
    hintPrefix = w.placeLabel || '气象六爻'
  } else {
    pan = castLiuyao('time')
    hintPrefix = '时间六爻'
  }

  const r = liuyaoToCastResult(input, pan)
  return {
    ...r,
    lunarHint: hintPrefix,
    seed: seed || r.seed,
  }
}

function castQimenUnified(input: CastInput, extras: CastExtras): CastResult {
  let juOverride: number | undefined
  let seedHint = '时家'
  let seed: CastSeed | undefined
  const holdMs = extras.entropy?.holdMs
  const momentE = extras.entropy?.enabled ? entropySeedInt(extras.entropy) : undefined
  const mix = entropySeedInt(extras.entropy)

  if (
    (input.method === 'number' || input.method === 'random') &&
    extras.numbers
  ) {
    const [a, b, c] = extras.numbers
    juOverride = ((a + b + c + mix - 1) % 9) + 1
    seedHint = input.method === 'random' ? '随机定局' : '三数定局'
    seed = { numbers: extras.numbers, momentE, holdMs }
  } else if (input.method === 'random') {
    const a = 1 + Math.floor(Math.random() * 999)
    const b = 1 + Math.floor(Math.random() * 999)
    const c = 1 + Math.floor(Math.random() * 999)
    juOverride = ((a + b + c + mix - 1) % 9) + 1
    seedHint = '随机定局'
    seed = { numbers: [a, b, c], momentE, holdMs }
  } else if (input.method === 'color' && extras.rgb) {
    const [r, g, b] = extras.rgb
    juOverride = ((r + g + b + mix - 1) % 9) + 1
    seedHint = '颜色定局'
    seed = { rgb: [r, g, b], numbers: [r, g, b], momentE, holdMs }
  } else if (input.method === 'geo' && extras.geo) {
    const { lat, lon, label } = extras.geo
    juOverride = ((toSeedInt(lat) + toSeedInt(lon) + mix - 1) % 9) + 1
    seedHint = label || '地理定局'
    seed = { lat, lon, placeLabel: label, momentE, holdMs }
  } else if (input.method === 'weather' && extras.weather) {
    const w = extras.weather
    juOverride =
      ((Math.abs(Math.round(w.tempC)) +
        Math.round(w.humidity) +
        Math.round(w.pressure ?? 1013) +
        mix -
        1) %
        9) +
      1
    seedHint = w.placeLabel || '气象定局'
    seed = {
      lat: w.lat,
      lon: w.lon,
      placeLabel: w.placeLabel,
      tempC: w.tempC,
      humidity: w.humidity,
      pressure: w.pressure,
      momentE,
      holdMs,
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
