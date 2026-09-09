/** 时家奇门（简化实用排盘）：九宫 + 三奇六仪 + 八门 + 九星 + 八神 */

export interface QimenCell {
  palace: number // 1..9 洛书
  di: string // 地盘天干
  tian: string // 天盘天干
  men: string
  xing: string
  shen: string
}

export interface QimenPan {
  ju: string
  yuan: string
  dun: '阳遁' | '阴遁'
  hourZhi: string
  dayGanZhi: string
  cells: QimenCell[]
  zhiFu: string
  zhiShi: string
  hint: string
  steps: string[]
}

const PALACE_ORDER_YANG = [1, 8, 3, 4, 9, 2, 7, 6] // 阳遁顺飞（除五）
const PALACE_ORDER_YIN = [9, 2, 7, 6, 1, 8, 3, 4] // 阴遁逆飞

const YI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'] // 六仪+三奇序列用于排局
const MEN = ['休', '生', '伤', '杜', '景', '死', '惊', '开']
const XING = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英']
const SHEN = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天']

const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const GAN = '甲乙丙丁戊己庚辛壬癸'

function hourZhiIndex(h: number): number {
  // 23-1 子
  const x = ((h + 1) / 2) | 0
  return x % 12
}

function dayGanzhi(d: Date): string {
  const base = Date.UTC(1899, 11, 22)
  const days = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - base) / 86400000)
  const i = ((days % 60) + 60) % 60
  return GAN[i % 10] + ZHI[i % 12]
}

/** 节气近似：夏至后阴遁、冬至后阳遁；局数简化取模 */
function approxJu(d: Date): { dun: '阳遁' | '阴遁'; ju: number; yuan: string } {
  const m = d.getMonth() + 1
  const day = d.getDate()
  // 夏至≈6/21 → 阴遁；冬至≈12/22 → 阳遁
  const afterXiaZhi = m > 6 || (m === 6 && day >= 21)
  const afterDongZhi = m > 12 || (m === 12 && day >= 22)
  const yin = afterXiaZhi && !afterDongZhi
  const dun: '阳遁' | '阴遁' = yin ? '阴遁' : '阳遁'
  const ju = ((d.getFullYear() + m + day) % 9) + 1
  const yuanList = ['上元', '中元', '下元'] as const
  const yuan = yuanList[(day + hourZhiIndex(d.getHours())) % 3]
  return { dun, ju, yuan }
}

function rotate<T>(arr: T[], n: number): T[] {
  const a = arr.slice()
  const k = ((n % a.length) + a.length) % a.length
  return a.slice(k).concat(a.slice(0, k))
}

export function buildQimenPan(
  when = new Date(),
  opts?: { juOverride?: number; seedHint?: string },
): QimenPan {
  const { dun, ju: ju0, yuan } = approxJu(when)
  const ju =
    opts?.juOverride != null
      ? ((Math.abs(Math.floor(opts.juOverride)) - 1) % 9) + 1
      : ju0
  const hz = ZHI[hourZhiIndex(when.getHours())]
  const day = dayGanzhi(when)
  const order = dun === '阳遁' ? PALACE_ORDER_YANG : PALACE_ORDER_YIN
  const seq = dun === '阳遁' ? YI : [...YI].reverse()

  // 地盘：从局数宫起戊顺/逆排九星仪奇
  const di: Record<number, string> = {}
  const path9: number[] = []
  const push = (p: number) => {
    if (!path9.includes(p)) path9.push(p)
  }
  push(ju)
  for (const p of order) push(p)
  push(5)
  while (path9.length < 9) {
    for (let p = 1; p <= 9; p++) push(p)
  }
  for (let i = 0; i < 9; i++) di[path9[i]] = seq[i]

  // 值符：时辰天干寄宫 —— 用日干简化找符
  const fuGan = day[0]
  let zhiFuPalace = 1
  for (const [p, g] of Object.entries(di)) {
    if (g === fuGan || (fuGan === '甲' && g === '戊')) {
      zhiFuPalace = Number(p)
      break
    }
  }

  // 天盘：值符随时干落宫（时干用时辰干支近似：日干起时）
  const hourGanIdx = (dayGanIndex(day[0]) * 2 + hourZhiIndex(when.getHours())) % 10
  const hourGan = GAN[hourGanIdx]
  let targetPalace = zhiFuPalace
  for (const [p, g] of Object.entries(di)) {
    if (g === hourGan || (hourGan === '甲' && g === '戊')) {
      targetPalace = Number(p)
      break
    }
  }
  const shift = (order.indexOf(targetPalace === 5 ? 2 : targetPalace) - order.indexOf(zhiFuPalace === 5 ? 2 : zhiFuPalace) + 8) % 8

  const tian: Record<number, string> = {}
  for (let p = 1; p <= 9; p++) {
    if (p === 5) {
      tian[5] = di[5]
      continue
    }
    const idx = order.indexOf(p)
    const from = order[(idx - shift + 8) % 8]
    tian[p] = di[from]
  }

  // 八门：值使门随时宫
  const menHome = [1, 8, 3, 4, 9, 2, 7, 6] // 休门起坎一…
  const menOnPalace: Record<number, string> = {}
  const menRot = rotate(MEN, shift)
  for (let i = 0; i < 8; i++) menOnPalace[menHome[i]] = menRot[i]
  menOnPalace[5] = '中'

  // 九星随天盘
  const xingOn: Record<number, string> = {}
  for (let p = 1; p <= 9; p++) xingOn[p] = XING[p - 1]
  // 旋转星
  const xingRot: Record<number, string> = { 5: '天禽' }
  for (let i = 0; i < 8; i++) {
    const p = order[i]
    const from = order[(i - shift + 8) % 8]
    xingRot[p] = XING[from - 1] || XING[i]
  }

  // 八神
  const shenOn: Record<number, string> = { 5: '' }
  const shenPath = dun === '阳遁' ? order : [...order].reverse()
  const startShen = shenPath.indexOf(targetPalace === 5 ? 2 : targetPalace)
  for (let i = 0; i < 8; i++) {
    shenOn[shenPath[(startShen + i) % 8]] = SHEN[i]
  }

  const cells: QimenCell[] = []
  for (let p = 1; p <= 9; p++) {
    cells.push({
      palace: p,
      di: di[p] || '·',
      tian: tian[p] || '·',
      men: menOnPalace[p] || '·',
      xing: xingRot[p] || XING[p - 1],
      shen: shenOn[p] || '',
    })
  }

  const zhiShi = menOnPalace[targetPalace] || '休'
  const seedHint = opts?.seedHint ? ` · ${opts.seedHint}` : ''
  const hint = `${dun}${ju}局${yuan} · 时${hz} · 值符宫${zhiFuPalace} · 值使${zhiShi}${seedHint}`
  const steps = [
    `奇门：${dun} ${ju}局 · ${yuan}${seedHint}`,
    `日柱 ${day} · 时支 ${hz}`,
    `地盘戊起 ${ju} 宫，排三奇六仪`,
    `值符飞至 ${targetPalace} 宫，转天盘 / 八门 / 九星`,
    `值使门：${zhiShi}`,
  ]

  return {
    ju: `${ju}局`,
    yuan,
    dun,
    hourZhi: hz,
    dayGanZhi: day,
    cells,
    zhiFu: `宫${zhiFuPalace}`,
    zhiShi,
    hint,
    steps,
  }
}

function dayGanIndex(gan: string): number {
  return Math.max(0, GAN.indexOf(gan))
}

export function qimenPromptBlock(pan: QimenPan): string {
  const lines = pan.cells
    .map((c) => `${c.palace}宫 地${c.di}天${c.tian} ${c.xing} ${c.men}门 ${c.shen}`)
    .join('\n')
  return `奇门盘：${pan.dun}${pan.ju}${pan.yuan} 日${pan.dayGanZhi} 时${pan.hourZhi}
值符${pan.zhiFu} 值使${pan.zhiShi}门
${lines}`
}

/** 九宫展示顺序（洛书视觉：4 9 2 / 3 5 7 / 8 1 6） */
export const LUOSHU_VISUAL = [4, 9, 2, 3, 5, 7, 8, 1, 6]
