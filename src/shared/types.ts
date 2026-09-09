export type CastMode = 'local' | 'local-plus-api' | 'full-api'

export type CategoryId =
  | 'self'
  | 'love'
  | 'career'
  | 'wealth'
  | 'year'
  | 'lost'
  | 'other'

export interface AppSettings {
  apiKey: string
  baseUrl: string
  model: string
  mode: CastMode
  cooldownMinutes: number
  alwaysOnTop: boolean
  highPrecisionDefault: boolean
  /** 首次引导：勾选后不再弹出 */
  hideWelcomeTip: boolean
  /** 字号：小 / 中 / 大 */
  fontScale?: 'sm' | 'md' | 'lg'
  /** 高对比 */
  highContrast?: boolean
  /** 是否把问句写入历史（关闭则脱敏） */
  storeQuestions?: boolean
  /**
   * 复现模式：关闭瞬时环境变数与按压毫秒混入（同输入同卦，便于对照）。
   * 默认 false = 开启环境变数。
   */
  castReplayMode?: boolean
  /** 最近一次「测试 API」已通过；重启后不再强迫重测（改 Key/URL/模型会清掉） */
  apiVerified?: boolean
}

/** OpenAI 兼容接口预设（填 Base URL + 模型名即可） */
export const API_PRESETS: {
  id: string
  label: string
  baseUrl: string
  model: string
  hint: string
}[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    hint: '默认推荐',
  },
  {
    id: 'doubao',
    label: '豆包',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-1-5-pro-32k-250115',
    hint: '火山方舟；模型可改成控制台的 ep- 接入点 ID',
  },
  {
    id: 'claude',
    label: 'Claude',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-sonnet-4',
    hint: '经 OpenRouter 的 OpenAI 兼容（需 OpenRouter Key）',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o-mini',
    hint: '官方 Chat Completions',
  },
  {
    id: 'moonshot',
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn',
    model: 'moonshot-v1-8k',
    hint: '月之暗面',
  },
  {
    id: 'qwen',
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    model: 'qwen-plus',
    hint: '阿里云兼容模式',
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    hint: 'BigModel OpenAI 兼容',
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn',
    model: 'deepseek-ai/DeepSeek-V3',
    hint: '聚合多家模型',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai',
    model: 'llama-3.3-70b-versatile',
    hint: '高速推理',
  },
]

export interface CategoryOption {
  id: CategoryId
  label: string
  needsSubject: boolean
  needsScope: boolean
  scopePresets?: { id: string; label: string }[]
}

export const CATEGORIES: CategoryOption[] = [
  { id: 'self', label: '自己', needsSubject: false, needsScope: false },
  { id: 'love', label: '爱情', needsSubject: false, needsScope: false },
  {
    id: 'career',
    label: '事业',
    needsSubject: false,
    needsScope: true,
    scopePresets: [
      { id: 'month', label: '本月' },
      { id: 'quarter', label: '本季' },
      { id: 'year', label: '本年' },
      { id: '3y', label: '三年内' },
    ],
  },
  {
    id: 'wealth',
    label: '财运',
    needsSubject: false,
    needsScope: true,
    scopePresets: [
      { id: 'month', label: '本月' },
      { id: 'year', label: '本年' },
      { id: '3y', label: '三年内' },
    ],
  },
  {
    id: 'year',
    label: '流年',
    needsSubject: false,
    needsScope: true,
    scopePresets: [
      { id: 'year', label: '本年' },
      { id: '3y', label: '三年内' },
    ],
  },
  { id: 'lost', label: '寻物', needsSubject: false, needsScope: false },
  {
    id: 'other',
    label: '其他',
    needsSubject: false,
    needsScope: true,
    scopePresets: [
      { id: 'now', label: '当下' },
      { id: 'year', label: '本年' },
      { id: '3y', label: '三年内' },
    ],
  },
]

export type DivinationSchool = 'meihua' | 'liuyao' | 'qimen'

export const DIVINATION_SCHOOLS: {
  id: DivinationSchool
  label: string
  ready: boolean
  hint: string
}[] = [
  { id: 'meihua', label: '梅花易数', ready: true, hint: '先天取数 · 体用断事' },
  { id: 'liuyao', label: '六爻纳甲', ready: true, hint: '装卦世应 · 六亲六神' },
  { id: 'qimen', label: '奇门遁甲', ready: true, hint: '时家排盘 · 九宫八门' },
]

/** 各体系可用的取数方式（地理/天气/颜色也可用于六爻、奇门） */
export function methodsForSchool(_school: DivinationSchool): CastMethod[] {
  return ['time', 'number', 'geo', 'weather', 'color', 'random']
}

export type CastMethod = 'time' | 'geo' | 'weather' | 'number' | 'color' | 'random'

export const CAST_METHODS: { id: CastMethod; label: string; ready: boolean; hint: string }[] = [
  { id: 'time', label: '时间', ready: true, hint: '以此时此刻起卦' },
  { id: 'number', label: '数字', ready: true, hint: '输入或随机三数' },
  { id: 'geo', label: '地理', ready: true, hint: '先选地点再起卦' },
  { id: 'weather', label: '天气', ready: true, hint: '先选地点再起卦' },
  { id: 'color', label: '颜色', ready: true, hint: '点选一种颜色' },
  { id: 'random', label: '随机', ready: true, hint: '一键随机成卦' },
]

export type GeoPickMode = 'gps' | 'city' | 'manual' | 'map'

export interface CastSeed {
  lat?: number
  lon?: number
  placeLabel?: string
  tempC?: number
  humidity?: number
  pressure?: number
  numbers?: number[]
  /** 颜色起卦：实际 RGB 0–255 */
  rgb?: [number, number, number]
  /** 瞬时环境变数 E */
  momentE?: number
  /** 按压起卦毫秒 */
  holdMs?: number
}

export interface CastInput {
  category: CategoryId
  subject?: string
  scope?: string
  question: string
  method: CastMethod
}

export interface Trigram {
  name: string
  nature: string
  number: number
  binary: string // 3 bits, bottom to top, 1=yang 0=yin
}

export interface HexagramInfo {
  number: number
  name: string
  symbol: string
  upper: Trigram
  lower: Trigram
  judgment: string
}

export interface CastResult {
  school?: DivinationSchool
  method: CastMethod
  datetime: string
  lunarHint: string
  upperNum: number
  lowerNum: number
  changeYao: number
  ben: HexagramInfo
  hu: HexagramInfo
  bian: HexagramInfo
  tiIsUpper: boolean
  fingerprint: string
  seed?: CastSeed
  steps?: string[]
  /** 六爻排盘 */
  liuyao?: import('../liuyao/pan').LiuyaoPan
  /** 奇门排盘 */
  qimen?: import('../qimen/pan').QimenPan
}

export interface DimScores {
  overall: number
  love: number
  career: number
  wealth: number
  health: number
}

export interface InterpretResult {
  title: string
  body: string
  tone: 'auspicious' | 'mixed' | 'challenging'
  /** 内部顺遂度 1–10；界面显示为 大吉 SSS～大凶 F */
  score?: number
  disclaimer: string
  /** 高精度模式下的追问（2～3 条） */
  followUps?: string[]
  /** 应期：大约何时应验（白话，已揉入正文，此处便于展示） */
  timing?: string
  /** 当下该不该做 / 行动一句 */
  advice?: string
  /** 心态一句 */
  mind?: string
  /** 初解短摘要（结果页默认只显示这段） */
  summary?: string
  /**
   * 文言/半文言断盘（解答第一部分，非白话）。
   * 其后接 summary / body 等白话分段。
   */
  verdict?: string
  /** 今日主题（仅每日一卦） */
  theme?: string
  /** 今日吉凶多维打分（仅每日一卦） */
  dims?: DimScores
  /** 多维分简短说明 */
  dimHints?: Partial<Record<keyof DimScores, string>>
  /** 解读来源：云端 / 本地 / API 失败回退 */
  source?: 'llm' | 'local' | 'local-fallback'
}

export interface HistoryEntry {
  id: string
  createdAt: number
  fingerprint: string
  category: CategoryId
  subject?: string
  scope?: string
  question: string
  cast: CastResult
  interpret?: InterpretResult
  /** daily = 今日吉凶（一天一次） */
  kind?: 'ask' | 'daily'
  /** YYYY-MM-DD，本地日 */
  dayKey?: string
}
