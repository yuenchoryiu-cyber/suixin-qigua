import type {
  CastInput,
  CategoryId,
  DivinationSchool,
  HistoryEntry,
} from '../shared/types'

function norm(s: string | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, '')
}

/** 问题指纹：体系 + 方式 + 类别 + 对象 + 时间范围 + 问句摘要 */
export function buildFingerprint(
  input: CastInput & { school?: DivinationSchool },
): string {
  const cat = input.category
  const subject = cat === 'self' ? '_' : norm(input.subject) || '_'
  const scope = needsScope(cat) ? norm(input.scope) || 'default' : '_'
  const q = norm(input.question).slice(0, 48) || '_'
  const school = input.school || 'meihua'
  return `${school}|${input.method}|${cat}|${subject}|${scope}|${q}`
}

function needsScope(cat: CategoryId): boolean {
  return cat === 'career' || cat === 'wealth' || cat === 'year' || cat === 'other'
}

export function findCooldownHit(
  fingerprint: string,
  history: HistoryEntry[],
  cooldownMinutes: number,
  now = Date.now(),
): HistoryEntry | null {
  const windowMs = cooldownMinutes * 60 * 1000
  for (const h of history) {
    if (h.fingerprint === fingerprint && now - h.createdAt < windowMs) {
      return h
    }
  }
  return null
}

export function cooldownRemainMinutes(
  entry: HistoryEntry,
  cooldownMinutes: number,
  now = Date.now(),
): number {
  const left = entry.createdAt + cooldownMinutes * 60 * 1000 - now
  return Math.max(1, Math.ceil(left / 60000))
}

/** 本地日历日 YYYY-MM-DD */
export function localDayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dailyFingerprint(dayKey = localDayKey()): string {
  return `daily|${dayKey}`
}

/** 今日吉凶：同一天只能起一次 */
export function findDailyHit(
  history: HistoryEntry[],
  dayKey = localDayKey(),
): HistoryEntry | null {
  for (const h of history) {
    if (h.kind === 'daily' && (h.dayKey === dayKey || h.fingerprint === dailyFingerprint(dayKey))) {
      return h
    }
  }
  return null
}
