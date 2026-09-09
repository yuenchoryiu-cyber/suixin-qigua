/** 内部仍用 1–10；对用户只展示吉凶等级（大吉 SSS → 大凶 F） */

export type ScoreGrade = {
  /** 如 大吉 */
  label: string
  /** 如 SSS */
  rank: string
  /** 展示：大吉 SSS */
  text: string
}

const TABLE: Record<number, { label: string; rank: string }> = {
  10: { label: '大吉', rank: 'SSS' },
  9: { label: '大吉', rank: 'SS' },
  8: { label: '吉', rank: 'S' },
  7: { label: '小吉', rank: 'A' },
  6: { label: '平', rank: 'B' },
  5: { label: '小吝', rank: 'C' },
  4: { label: '吝', rank: 'D' },
  3: { label: '凶', rank: 'E' },
  2: { label: '大凶', rank: 'F' },
  1: { label: '大凶', rank: 'F' },
}

export function scoreToGrade(score: number | null | undefined): ScoreGrade | null {
  if (score == null || !Number.isFinite(score)) return null
  const n = Math.min(10, Math.max(1, Math.round(score)))
  const g = TABLE[n] ?? TABLE[6]!
  return { label: g.label, rank: g.rank, text: `${g.label} ${g.rank}` }
}

export function formatScoreGrade(score: number | null | undefined): string {
  return scoreToGrade(score)?.text ?? ''
}
