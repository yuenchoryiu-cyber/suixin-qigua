import type { CastResult } from '../shared/types'
import { TRIGRAMS } from './hexagrams'

/** 成卦展示步骤：只说结果，不讲取数公式 */
export function buildCastSteps(cast: CastResult): string[] {
  const upper = TRIGRAMS[cast.upperNum]
  const lower = TRIGRAMS[cast.lowerNum]
  return [
    cast.lunarHint ? `取象：${cast.lunarHint}` : '取象完成',
    `上 ${upper?.name || ''}（${upper?.nature || ''}）· 下 ${lower?.name || ''}（${lower?.nature || ''}）`,
    `本卦 ${cast.ben.symbol}${cast.ben.name}`,
    `动第 ${cast.changeYao} 爻`,
    `互 ${cast.hu.symbol}${cast.hu.name} · 变 ${cast.bian.symbol}${cast.bian.name}`,
  ]
}
