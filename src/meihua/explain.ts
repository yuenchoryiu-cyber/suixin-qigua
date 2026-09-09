import type { CastResult } from '../shared/types'
import { TRIGRAMS } from './hexagrams'

/** 简短成卦步骤（少废话） */
export function buildCastSteps(cast: CastResult): string[] {
  const upper = TRIGRAMS[cast.upperNum]
  const lower = TRIGRAMS[cast.lowerNum]
  const steps: string[] = [`取数：${cast.lunarHint}`]

  if (cast.method === 'time') {
    steps.push('年月日 → 上卦；再加时辰 → 下卦与动爻。')
  } else if (cast.method === 'number' || cast.method === 'random') {
    const n = cast.seed?.numbers
    const tag = cast.method === 'random' ? '随机' : '三数'
    steps.push(n ? `${tag} ${n.join(' · ')} → 上 / 下 / 动。` : `${tag}定上、下、动。`)
  } else if (cast.method === 'geo') {
    steps.push(
      cast.seed?.lat != null
        ? `纬 ${cast.seed.lat.toFixed(4)} → 上；经 ${cast.seed.lon?.toFixed(4)} → 下；合时辰 → 动。`
        : '经纬定上下卦，合时辰得动爻。',
    )
  } else if (cast.method === 'weather') {
    steps.push(
      cast.seed?.tempC != null
        ? `气温 ${cast.seed.tempC.toFixed(1)}°C → 上；湿度 ${cast.seed.humidity}% → 下；气压参与定动。`
        : '温湿气压定卦。',
    )
  } else if (cast.method === 'color') {
    const rgb = cast.seed?.rgb
    steps.push(
      rgb
        ? `R ${rgb[0]} → 上；G ${rgb[1]} → 下；R+G+B=${rgb[0] + rgb[1] + rgb[2]} → 动。`
        : 'RGB 定上、下、动。',
    )
  }

  steps.push(`上 ${cast.upperNum}${upper?.name}（${upper?.nature}）· 下 ${cast.lowerNum}${lower?.name}（${lower?.nature}）`)
  steps.push(`本卦 ${cast.ben.symbol}${cast.ben.name}`)
  steps.push(
    `动第 ${cast.changeYao} 爻 · ${cast.tiIsUpper ? '上体下用' : '下体上用'}`,
  )
  steps.push(`互 ${cast.hu.symbol}${cast.hu.name} · 变 ${cast.bian.symbol}${cast.bian.name}`)

  return steps
}
