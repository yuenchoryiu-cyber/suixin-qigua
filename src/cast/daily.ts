import type { CastMethod, DivinationSchool } from '../shared/types'

/** 今日吉凶可用的自动路径（无需用户再点选坐标/城市） */
export type DailyRoute = {
  school: DivinationSchool
  method: CastMethod
  label: string
  /** 梅花数字起卦用 */
  numbers?: [number, number, number]
}

const POOL: Omit<DailyRoute, 'numbers'>[] = [
  { school: 'meihua', method: 'time', label: '梅花 · 时间' },
  { school: 'meihua', method: 'number', label: '梅花 · 三数' },
  { school: 'liuyao', method: 'time', label: '六爻 · 时间' },
  { school: 'liuyao', method: 'number', label: '六爻 · 铜钱' },
  { school: 'qimen', method: 'time', label: '奇门 · 时家' },
]

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 在可行办法中随机选一条，保证每日一卦也有个体差异 */
export function pickDailyRoute(): DailyRoute {
  const base = POOL[randInt(0, POOL.length - 1)]
  if (base.school === 'meihua' && base.method === 'number') {
    return {
      ...base,
      numbers: [randInt(1, 99), randInt(1, 99), randInt(1, 99)],
    }
  }
  return { ...base }
}

export function dailyRouteAnimSteps(route: DailyRoute): string[] {
  if (route.school === 'qimen') {
    return ['定阴阳遁与局数…', '排三奇六仪 · 转八门…', '安九星八神…', '合盘…']
  }
  if (route.school === 'liuyao') {
    return route.method === 'number'
      ? ['六次摇钱…', '装纳甲 · 安世应…', '配六亲六神…', '合成变卦…']
      : ['校准时辰…', '按时间起六爻…', '装卦完成…', '合成变卦…']
  }
  if (route.method === 'number') {
    return [
      '注入随机三数，定上卦…',
      '第二数定下卦…',
      '三数合流，定动爻…',
      '合成本卦、互卦、变卦…',
    ]
  }
  return [
    '校准年月日时…',
    '推演流日上下卦…',
    '寻找动爻…',
    '合成本卦、互卦、变卦…',
  ]
}
