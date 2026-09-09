/** 六爻纳甲：起卦 + 装卦（世应、纳甲、六亲、六神） */

export type YaoValue = 6 | 7 | 8 | 9 // 老阴 少阳 少阴 老阳

export interface LiuyaoLine {
  pos: number // 1初 … 6上
  value: YaoValue
  yang: boolean
  moving: boolean
  ganZhi: string
  wuXing: string
  liuQin: string
  liuShen: string
  shiYing: '' | '世' | '应'
  changedYang?: boolean
  changedGanZhi?: string
  changedWuXing?: string
  changedLiuQin?: string
}

export interface LiuyaoPan {
  yao: YaoValue[]
  lines: LiuyaoLine[]
  benName: string
  bianName: string
  gong: string
  shi: number
  ying: number
  dayGanZhi: string
  hint: string
  steps: string[]
}

const WX: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土',
  庚: '金', 辛: '金', 壬: '水', 癸: '水',
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

/** 八卦纳甲（自初爻向上） */
const NA_JIA: Record<string, string[]> = {
  乾: ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'],
  坤: ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉'],
  震: ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌'],
  巽: ['辛丑', '辛亥', '辛酉', '辛未', '辛巳', '辛卯'],
  坎: ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子'],
  离: ['己卯', '己丑', '己亥', '己酉', '己未', '己巳'],
  艮: ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅'],
  兑: ['丁巳', '丁卯', '丁丑', '丁亥', '丁酉', '丁未'],
}

const TRIGRAM_BITS: Record<string, string> = {
  '111': '乾', '000': '坤', '001': '震', '110': '巽',
  '010': '坎', '101': '离', '100': '艮', '011': '兑',
}

/** 八宫纯卦顺序与世爻位置（初世…六世）简化京房 */
const GONG_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'] as const

function bitsFromYao(yao: YaoValue[]): string {
  return yao.map((v) => (v === 7 || v === 9 ? '1' : '0')).join('')
}

function trigrams(bits6: string): { lower: string; upper: string } {
  return {
    lower: TRIGRAM_BITS[bits6.slice(0, 3)] || '坤',
    upper: TRIGRAM_BITS[bits6.slice(3, 6)] || '坤',
  }
}

function guaName(bits6: string): string {
  const { lower, upper } = trigrams(bits6)
  if (lower === upper) return `${lower}为${nature(lower)}`
  return `${nature(upper)}${nature(lower)} · ${upper}${lower}`
}

function nature(g: string): string {
  return ({ 乾: '天', 坤: '地', 震: '雷', 巽: '风', 坎: '水', 离: '火', 艮: '山', 兑: '泽' } as Record<string, string>)[g] || g
}

/** 粗略世应：按宫内变爻数近似（实用简化） */
function shiYingPos(bits6: string): { gong: string; shi: number; ying: number } {
  const { lower, upper } = trigrams(bits6)
  // 以本宫为下卦所属；世爻：游魂归魂简化为 中爻偏好
  const gong = GONG_ORDER.includes(lower as (typeof GONG_ORDER)[number]) ? lower : upper
  const pure = NA_JIA[gong]
  void pure
  // 世爻取「与本宫五行最近」的简化：动爻优先，否则三爻
  let shi = 3
  const moving = bits6.split('').map((_, i) => i)
  void moving
  const yangCount = bits6.split('').filter((b) => b === '1').length
  shi = (yangCount % 6) + 1
  const ying = ((shi + 2 - 1) % 6) + 1
  return { gong, shi, ying }
}

function shengKe(me: string, other: string): string {
  const order = ['木', '火', '土', '金', '水']
  const a = order.indexOf(me)
  const b = order.indexOf(other)
  if (a < 0 || b < 0) return '兄'
  if (a === b) return '兄'
  if ((a + 1) % 5 === b) return '孙' // 我生
  if ((a + 2) % 5 === b) return '财' // 我克
  if ((a + 3) % 5 === b) return '官' // 克我
  return '父' // 生我
}

function liuQin(shiWx: string, lineWx: string): string {
  const map: Record<string, string> = {
    兄: '兄弟',
    孙: '子孙',
    财: '妻财',
    官: '官鬼',
    父: '父母',
  }
  return map[shengKe(shiWx, lineWx)] || '兄弟'
}

const LIU_SHEN = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']

function dayGanIndex(gan: string): number {
  return '甲乙丙丁戊己庚辛壬癸'.indexOf(gan)
}

function liuShenForDay(dayGan: string): string[] {
  // 甲乙起青龙 …
  const startMap = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4] // rough by gan
  const start = startMap[Math.max(0, dayGanIndex(dayGan))] ?? 0
  return Array.from({ length: 6 }, (_, i) => LIU_SHEN[(start + i) % 6])
}

function ganZhiOfDay(d: Date): string {
  // 1899-12-22 ≈ 甲子日近似
  const base = Date.UTC(1899, 11, 22)
  const days = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - base) / 86400000)
  const gan = '甲乙丙丁戊己庚辛壬癸'
  const zhi = '子丑寅卯辰巳午未申酉戌亥'
  const i = ((days % 60) + 60) % 60
  return gan[i % 10] + zhi[i % 12]
}

export function coinYao(): YaoValue {
  // 3 coins: 字=2 花=3 → 6..9
  let s = 0
  for (let i = 0; i < 3; i++) s += Math.random() < 0.5 ? 2 : 3
  return s as YaoValue
}

export function timeYao(when: Date): YaoValue[] {
  const y = when.getFullYear()
  const m = when.getMonth() + 1
  const d = when.getDate()
  const h = when.getHours()
  const seed = y * 10000 + m * 100 + d + h * 17
  return seedYao(seed)
}

/** 由任意整数种子生成六爻（地理/天气等取数） */
export function seedYao(seed: number): YaoValue[] {
  const out: YaoValue[] = []
  let x = Math.abs(Math.floor(seed)) || 1
  for (let i = 0; i < 6; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    out.push(([6, 7, 8, 9, 6, 7, 8, 9] as YaoValue[])[x % 8])
  }
  return out
}

export function buildLiuyaoPan(yao: YaoValue[], when = new Date()): LiuyaoPan {
  const bits = bitsFromYao(yao)
  const changed = yao.map((v) => {
    if (v === 9) return 8 as YaoValue
    if (v === 6) return 7 as YaoValue
    return v
  })
  const bits2 = bitsFromYao(changed)
  const { lower, upper } = trigrams(bits)
  const { gong, shi, ying } = shiYingPos(bits)
  const day = ganZhiOfDay(when)
  const shen = liuShenForDay(day[0])
  const lowerNa = NA_JIA[lower]
  const upperNa = NA_JIA[upper]
  const na = [...lowerNa, ...upperNa]

  const shiGz = na[shi - 1]
  const shiWx = WX[shiGz[1]] || '土'

  const lines: LiuyaoLine[] = yao.map((value, i) => {
    const gz = na[i]
    const wx = WX[gz[1]] || '土'
    const yang = value === 7 || value === 9
    const moving = value === 6 || value === 9
    const cYang = changed[i] === 7 || changed[i] === 9
    const cLower = TRIGRAM_BITS[bits2.slice(0, 3)] || '坤'
    const cUpper = TRIGRAM_BITS[bits2.slice(3, 6)] || '坤'
    const cNa = [...NA_JIA[cLower], ...NA_JIA[cUpper]]
    const cgz = cNa[i]
    const cwx = WX[cgz[1]] || '土'
    return {
      pos: i + 1,
      value,
      yang,
      moving,
      ganZhi: gz,
      wuXing: wx,
      liuQin: liuQin(shiWx, wx),
      liuShen: shen[i],
      shiYing: i + 1 === shi ? '世' : i + 1 === ying ? '应' : '',
      changedYang: moving ? cYang : undefined,
      changedGanZhi: moving ? cgz : undefined,
      changedWuXing: moving ? cwx : undefined,
      changedLiuQin: moving ? liuQin(shiWx, cwx) : undefined,
    }
  })

  const benName = guaName(bits)
  const bianName = guaName(bits2)
  const movingPos = lines.filter((l) => l.moving).map((l) => l.pos)

  const steps = [
    `六爻取数：${yao.join(' ')}（6老阴 7少阳 8少阴 9老阳）`,
    `本卦 ${benName}`,
    movingPos.length ? `动爻：第 ${movingPos.join('、')} 爻` : '无动爻（静卦）',
    `装卦：${gong}宫 · 世${shi} 应${ying} · 日柱 ${day}`,
    `变卦 ${bianName}`,
  ]

  return {
    yao,
    lines,
    benName,
    bianName,
    gong,
    shi,
    ying,
    dayGanZhi: day,
    hint: `${benName} · 世${shi}应${ying} · ${day}`,
    steps,
  }
}

export function castLiuyao(
  mode: 'time' | 'coin' | 'seed',
  when = new Date(),
  seed?: number,
): LiuyaoPan {
  let yao: YaoValue[]
  if (mode === 'coin') {
    yao = Array.from({ length: 6 }, () => coinYao())
  } else if (mode === 'seed') {
    yao = seedYao(seed ?? Date.now())
  } else {
    yao = timeYao(when)
  }
  return buildLiuyaoPan(yao as YaoValue[], when)
}

export function liuyaoPromptBlock(pan: LiuyaoPan): string {
  const rows = pan.lines
    .slice()
    .reverse()
    .map((l) => {
      const mark = l.moving ? '动' : '  '
      const sy = l.shiYing || '  '
      return `${l.pos}爻 ${l.yang ? '━' : '--'} ${mark} ${sy} ${l.ganZhi}${l.wuXing} ${l.liuQin} ${l.liuShen}`
    })
    .join('\n')
  return `六爻盘：本${pan.benName} → 变${pan.bianName}
${gongLine(pan)}
${rows}`
}

function gongLine(pan: LiuyaoPan): string {
  return `${pan.gong}宫 世${pan.shi} 应${pan.ying} 日${pan.dayGanZhi}`
}
