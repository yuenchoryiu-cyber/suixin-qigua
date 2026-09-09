import type {
  AppSettings,
  CastResult,
  DimScores,
  InterpretResult,
} from '../shared/types'
import { liuyaoPromptBlock } from '../liuyao/pan'
import { qimenPromptBlock } from '../qimen/pan'

const DISCLAIMER =
  '卦象只是提醒，不是判决书。心里有数就好，别把日子过成算命。'

const METHOD_LABEL: Record<string, string> = {
  time: '时间起卦',
  geo: '地理起卦',
  weather: '天气起卦',
  number: '数字起卦',
  color: '颜色起卦',
  random: '随机起卦',
}

const SCHOOL_LABEL: Record<string, string> = {
  meihua: '梅花易数',
  liuyao: '六爻纳甲',
  qimen: '奇门遁甲',
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

function clampScore(n: unknown): number | undefined {
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined
  return Math.min(10, Math.max(1, Math.round(n)))
}

function parseDims(raw: unknown): DimScores | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const overall = clampScore(o.overall)
  const love = clampScore(o.love)
  const career = clampScore(o.career)
  const wealth = clampScore(o.wealth)
  const health = clampScore(o.health)
  if (
    overall == null ||
    love == null ||
    career == null ||
    wealth == null ||
    health == null
  ) {
    return undefined
  }
  return { overall, love, career, wealth, health }
}

function seedLines(cast: CastResult): string {
  const s = cast.seed
  if (!s) return ''
  const parts: string[] = []
  if (s.placeLabel || (s.lat !== undefined && s.lon !== undefined)) {
    parts.push(
      `地点：${s.placeLabel || ''}（${s.lat?.toFixed(5)}, ${s.lon?.toFixed(5)}）`,
    )
  }
  if (s.tempC !== undefined) parts.push(`气温：${s.tempC.toFixed(1)}°C`)
  if (s.humidity !== undefined) parts.push(`湿度：${s.humidity}%`)
  if (s.pressure !== undefined) parts.push(`气压：${s.pressure}hPa`)
  if (s.numbers?.length) parts.push(`三数：${s.numbers.join(' / ')}`)
  if (s.rgb?.length) parts.push(`RGB：${s.rgb.join(', ')}`)
  return parts.join('\n')
}

function parseInterpret(content: string): InterpretResult {
  try {
    const parsed = JSON.parse(content) as InterpretResult & {
      score?: number
      followUps?: string[]
      follow_ups?: string[]
      timing?: string
      advice?: string
      mind?: string
      summary?: string
      theme?: string
      dims?: unknown
      dimHints?: unknown
    }
    const followUps = (parsed.followUps || parsed.follow_ups || [])
      .map((q) => String(q).trim())
      .filter(Boolean)
      .slice(0, 3)
    const timing = parsed.timing?.trim() || undefined
    const advice = parsed.advice?.trim() || undefined
    const mind = parsed.mind?.trim() || undefined
    const summary = parsed.summary?.trim() || undefined
    const theme = parsed.theme?.trim() || undefined
    const body = parsed.body || content
    return {
      title: parsed.title || '解卦',
      body,
      tone: parsed.tone || 'mixed',
      score: clampScore(parsed.score),
      disclaimer: parsed.disclaimer || DISCLAIMER,
      followUps: followUps.length ? followUps : undefined,
      timing,
      advice,
      mind,
      summary: summary || body.slice(0, 48).replace(/\s+/g, '') + (body.length > 48 ? '…' : ''),
      theme,
      dims: parseDims(parsed.dims),
      dimHints: parseDimHints(parsed.dimHints),
    }
  } catch {
    return {
      title: '解卦',
      body: content,
      summary: content.slice(0, 48) + (content.length > 48 ? '…' : ''),
      tone: 'mixed',
      disclaimer: DISCLAIMER,
    }
  }
}

function parseDimHints(raw: unknown): InterpretResult['dimHints'] {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const out: NonNullable<InterpretResult['dimHints']> = {}
  for (const k of ['overall', 'love', 'career', 'wealth', 'health'] as const) {
    if (typeof o[k] === 'string' && o[k].trim()) out[k] = o[k].trim()
  }
  return Object.keys(out).length ? out : undefined
}

function castFacts(cast: CastResult): string {
  const school = cast.school || 'meihua'
  if (school === 'liuyao' && cast.liuyao) {
    return liuyaoPromptBlock(cast.liuyao)
  }
  if (school === 'qimen' && cast.qimen) {
    return qimenPromptBlock(cast.qimen)
  }
  const ti = cast.tiIsUpper ? cast.ben.upper : cast.ben.lower
  const yong = cast.tiIsUpper ? cast.ben.lower : cast.ben.upper
  const seed = seedLines(cast)
  return `${seed ? seed + '\n' : ''}本卦：${cast.ben.symbol}${cast.ben.name}（上${cast.ben.upper.name}/下${cast.ben.lower.name}）
动爻：第 ${cast.changeYao} 爻
互卦：${cast.hu.symbol}${cast.hu.name}
变卦：${cast.bian.symbol}${cast.bian.name}
体：${ti.name}${ti.nature}；用：${yong.name}${yong.nature}
本卦要旨：${cast.ben.judgment}
变卦要旨：${cast.bian.judgment}`
}

function schoolRules(cast: CastResult): string {
  const school = cast.school || 'meihua'
  if (school === 'liuyao') {
    return `体系：六爻纳甲。盘面已由程序装好（世应、纳甲、六亲、六神），不得改卦名、不得重摇。断事看世应、动爻、用神生克。`
  }
  if (school === 'qimen') {
    return `体系：时家奇门。九宫、三奇六仪、八门九星八神已排好，不得改局、不得重排。断事看用神所落宫、门星生克与值符值使。`
  }
  return `体系：梅花易数。本卦、动爻、互卦、变卦、体用不得改名、不得重起。`
}

export async function interpretCast(options: {
  settings: AppSettings
  cast: CastResult
  question: string
  categoryLabel: string
  subject?: string
  scope?: string
  highPrecision?: boolean
  /** 今日吉凶模式 */
  daily?: boolean
}): Promise<InterpretResult> {
  const {
    settings,
    cast,
    question,
    categoryLabel,
    subject,
    scope,
    highPrecision,
    daily,
  } = options

  const canCallRemote = canUseLlm(settings) && settings.mode !== 'local'
  if (!canCallRemote) {
    const offline = localInterpret({
      cast,
      question,
      categoryLabel,
      subject,
      scope,
      daily: !!daily,
    })
    offline.source = 'local'
    return offline
  }

  try {
    const remote = await callLlm(
      settings,
      daily
        ? buildDailyPrompt({ cast })
        : buildPrompt({
            question,
            categoryLabel,
            subject,
            scope,
            cast,
            full: settings.mode === 'full-api',
            highPrecision: !!highPrecision,
          }),
    )
    remote.source = 'llm'
    return remote
  } catch {
    // 云端 Key 无效 / 网络失败：回退本地起卦解析
    const offline = localInterpret({
      cast,
      question,
      categoryLabel,
      subject,
      scope,
      daily: !!daily,
    })
    offline.disclaimer =
      (offline.disclaimer || DISCLAIMER) +
      '（API 未通或配置失败，已改用本地起卦解析继续。）'
    offline.title = offline.title.includes('简解') ? offline.title : '本地简解'
    offline.source = 'local-fallback'
    return offline
  }
}

/** 高精度：用户回答追问后，二次精炼解读 */
export async function refineWithAnswers(options: {
  settings: AppSettings
  cast: CastResult
  question: string
  categoryLabel: string
  subject?: string
  scope?: string
  previous: InterpretResult
  answers: { q: string; a: string }[]
}): Promise<InterpretResult> {
  const { settings, cast, previous, answers, categoryLabel, subject, scope, question } =
    options
  if (!canUseLlm(settings)) {
    throw new Error('追问需要 API Key，请先在设置中配置并测试连通。')
  }

  const asked =
    question.trim() ||
    `（心中默念「${categoryLabel}」相关之事${subject ? `，对象：${subject}` : ''}）`

  const system = `你是「随心起卦」解卦助手。用户已看过初解，并回答了追问。请用白话给出**更扣题、更具体**的二次解读。
规则：不改卦名/盘面；可调整顺遂度评分；正向开解；输出 JSON：{"title","summary","body","tone","score","timing","advice","mind","disclaimer"}。不要再输出 followUps。
body 须自然揉入应期、宜忌与心态；timing / advice / mind / summary 再各给短字段便于展示。
${schoolRules(cast)}`

  const user = `类别：${categoryLabel}；对象：${subject || '无'}；范围：${scope || '无'}
所问：${asked}
${castFacts(cast)}
初解标题：${previous.title}
初解正文：${previous.body}
用户追问作答：
${answers.map((x, i) => `${i + 1}. ${x.q}\n答：${x.a || '（跳过）'}`).join('\n')}`

  return callLlm(settings, { system, user })
}

/** 解卦后多轮追问（保留上下文） */
export async function chatFollowUp(options: {
  settings: AppSettings
  cast: CastResult
  question: string
  categoryLabel: string
  interpret: InterpretResult
  history: ChatTurn[]
  userMessage: string
}): Promise<string> {
  const { settings, cast, question, categoryLabel, interpret, history, userMessage } =
    options
  if (!canUseLlm(settings)) {
    throw new Error('多轮追问需要 API Key，请先在设置中配置并测试连通。')
  }

  const system = `你是「随心起卦」解卦助手。用户已看过解读，正在做**最后一问**追问。用当代口语短答（80–160字），紧扣原盘面与所问，不改卦名、不重起。文末用一句温和提醒：同一卦不宜再细问，收心去做一两件实事即可。只输出纯文本，不要 JSON。
${schoolRules(cast)}`

  const asked = question.trim() || `（心念「${categoryLabel}」）`
  const prelude = `类别：${categoryLabel}
所问：${asked}
${castFacts(cast)}
解读标题：${interpret.title}
解读正文：${interpret.body}
应期：${interpret.timing || '无'}
建议：${interpret.advice || '无'}`

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: system },
    { role: 'user', content: prelude },
    {
      role: 'assistant',
      content: '好，我按这盘来答。你想接着问哪一点？',
    },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: userMessage },
  ]

  return callLlmText(settings, messages)
}

function buildPrompt(ctx: {
  question: string
  categoryLabel: string
  subject?: string
  scope?: string
  cast: CastResult
  full: boolean
  highPrecision: boolean
}): { system: string; user: string } {
  const { cast } = ctx
  const school = cast.school || 'meihua'
  const asked =
    ctx.question.trim() ||
    `（起卦人未写文字，只在心里默念「${ctx.categoryLabel}」相关之事${ctx.subject ? `，对象：${ctx.subject}` : ''}${ctx.scope ? `，范围：${ctx.scope}` : ''}）`

  const followRule = ctx.highPrecision
    ? `9. 高精度模式：额外给 2～3 条**短追问**（口语、具体、扣题），放入 JSON 字段 followUps 字符串数组，用来澄清心意以便二次精解。不要问姓名。`
    : `9. 普通模式：不要输出 followUps。`

  const system = `你是「随心起卦」的解卦助手。用**当代口语、说人话**写解读，像朋友聊天，不要文言堆砌，不要游戏黑话。
硬性规则：
1. ${schoolRules(cast)}
2. **必须扣题**：紧扣所求类别（${ctx.categoryLabel}）与对象/范围；给 1–10「顺遂度」score。
3. **应期、行动、心态须揉进 body**：正文里自然写出大概何时应验、当下该不该做、心态怎么摆；同时另填 timing、advice、mind、summary（summary 一句≤28字总括）。
4. 吉就实在鼓励；凶就温和开解、给能做的小事。正向收束。
5. 若用户没写具体问题（心中默念），按类别来解，不要追问姓名。
6. 文末自然带一句：卦象仅供参考，不可尽信。
7. 只输出 JSON：{"title":"短标题","summary":"一句总括","body":"正文","tone":"auspicious|mixed|challenging","score":7,"timing":"应期一句","advice":"宜忌一句","mind":"心态一句","disclaimer":"一句白话免责"${ctx.highPrecision ? ',"followUps":["追问1","追问2"]' : ''}}
8. body 约 160–300 字；score 为整数 1–10。
${followRule}`

  const user = `类别：${ctx.categoryLabel}
对象：${ctx.subject || '无（心念即可）'}
时间范围：${ctx.scope || '无'}
所问：${asked}
体系：${SCHOOL_LABEL[school] || school}
起卦方式：${METHOD_LABEL[cast.method] || cast.method}
取数：${cast.lunarHint}
${castFacts(cast)}`

  return { system, user }
}

function buildDailyPrompt(ctx: { cast: CastResult }): { system: string; user: string } {
  const { cast } = ctx
  const system = `你是「随心起卦」的今日流日助手。用当代口语写「今日吉凶」参考，不要文言堆砌。
硬性规则：
1. ${schoolRules(cast)}
2. 这是**一日一卦**的流日参考；取数方式可能是梅花/六爻/奇门中的随机一种，以盘面为准，不要改盘。
3. body 约 140–220 字：先总评今日气场，再各用一两句点到爱情/事业/财运/身体；应期可写成「今日侧重 / 傍晚留意」之类，揉进正文。
4. advice 给一句「今天适合推进什么 / 先别硬刚什么」；mind 给心态一句；theme 给「今日主题」四到八字；summary 一句总括。
5. dims 各维打分 1–10 整数：overall、love、career、wealth、health；dimHints 各给一句极短说明。
6. score 取 overall。
7. 只输出 JSON：{"title":"今日短标题","theme":"今日主题","summary":"一句总括","body":"正文","tone":"auspicious|mixed|challenging","score":7,"timing":"今日节奏一句","advice":"今日宜忌一句","mind":"心态一句","dims":{"overall":7,"love":6,"career":7,"wealth":5,"health":8},"dimHints":{"overall":"综","love":"情","career":"事","wealth":"财","health":"身"},"disclaimer":"一句白话免责"}
8. 正向收束；不可尽信。`

  const user = `模式：今日吉凶（一天一次，取数路径已随机）
体系与取数：${cast.lunarHint}
起卦方式：${METHOD_LABEL[cast.method] || cast.method}
${castFacts(cast)}`

  return { system, user }
}

async function callLlm(
  settings: AppSettings,
  prompt: { system: string; user: string },
): Promise<InterpretResult> {
  const content = await callLlmText(
    settings,
    [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    true,
  )
  return parseInterpret(content)
}

async function callLlmText(
  settings: AppSettings,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  json = false,
): Promise<string> {
  const url = chatCompletionsUrl(settings.baseUrl)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (settings.apiKey?.trim()) {
    headers.Authorization = `Bearer ${settings.apiKey.trim()}`
  }

  const body: Record<string, unknown> = {
    model: settings.model,
    temperature: 0.75,
    messages,
  }
  if (json) body.response_format = { type: 'json_object' }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API 调用失败 (${res.status})：${text.slice(0, 200) || res.statusText}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('模型未返回内容')
  return content
}

/** 仅当配置了 API Key 时走云端；未配置则只用本地起卦解析 */
export function canUseLlm(settings: AppSettings): boolean {
  return !!settings.apiKey?.trim()
}

/** OpenAI 兼容：多数为 /v1/chat/completions；智谱 v4 / 豆包 v3 为 /chat/completions */
export function chatCompletionsUrl(baseUrl: string): string {
  const b = baseUrl.trim().replace(/\/$/, '')
  if (!b) return 'https://api.deepseek.com/v1/chat/completions'
  if (/\/chat\/completions$/i.test(b)) return b
  if (/\/v4$/i.test(b)) return `${b}/chat/completions`
  if (/\/v3$/i.test(b)) return `${b}/chat/completions`
  if (/\/v1$/i.test(b)) return `${b}/chat/completions`
  return `${b}/v1/chat/completions`
}

function localInterpret(ctx: {
  cast: CastResult
  question: string
  categoryLabel: string
  subject?: string
  scope?: string
  daily: boolean
}): InterpretResult {
  const { cast, categoryLabel, daily } = ctx
  const school = cast.school || 'meihua'
  const moving = cast.changeYao
  const scoreBase = 4 + ((cast.upperNum + cast.lowerNum + moving) % 6)
  const score = Math.min(10, Math.max(1, scoreBase))
  const tone: InterpretResult['tone'] =
    score >= 8 ? 'auspicious' : score <= 4 ? 'challenging' : 'mixed'

  const timing =
    moving <= 2
      ? '应期偏近，多看这几天到两周内'
      : moving <= 4
        ? '应期约在近月起伏'
        : '应期偏缓，宜拉长观察'

  const advice =
    tone === 'auspicious'
      ? '宜推进，但别急着一次做满；先做最小的一步。'
      : tone === 'challenging'
        ? '宜先稳住再动；能缓则缓，先别硬刚。'
        : '可做，但先确认条件；稳中求进更合适。'

  const mind =
    tone === 'auspicious'
      ? '心里有底就好，别把期待堆太满。'
      : tone === 'challenging'
        ? '先安住呼吸，少跟自己和别人较劲。'
        : '保持弹性，一事一议，别一次押上全部。'

  const themes = ['稳中求进', '先守后攻', '以柔克刚', '静观其变', '厚积薄发', '收心落地']
  const theme = themes[(cast.upperNum + cast.lowerNum + moving) % themes.length]

  let body: string
  let summary: string
  let title: string

  if (daily) {
    title = '今日简参'
    summary = `今日主题「${theme}」，综合约 ${score}/10。`
    if (school === 'liuyao' && cast.liuyao) {
      body = `今日六爻「${cast.liuyao.benName}」，世${cast.liuyao.shi}应${cast.liuyao.ying}。主题偏「${theme}」：人际宜心平，做事看节奏，钱财先守，身体顾作息。${timing}。${advice}`
    } else if (school === 'qimen' && cast.qimen) {
      body = `今日奇门「${cast.qimen.dun}${cast.qimen.ju}」，值使${cast.qimen.zhiShi}门。主题「${theme}」：门星示意方向，别硬冲。爱情少猜忌，事业抓一件小事推进，财运观望，身体规律作息。${advice}`
    } else {
      body = `今日梅花取「${cast.lunarHint}」，本卦「${cast.ben.name}」动第 ${moving} 爻。主题「${theme}」：爱情与人际宜和，事业别硬顶，财运先守，身体注意休息。${cast.ben.judgment} ${advice}`
    }
  } else if (school === 'liuyao' && cast.liuyao) {
    title = '六爻简解'
    summary = `「${cast.liuyao.benName}」世${cast.liuyao.shi}应${cast.liuyao.ying}，约 ${score}/10。`
    body = `六爻得「${cast.liuyao.benName}」，世${cast.liuyao.shi}应${cast.liuyao.ying}，宫「${cast.liuyao.gong}」。就「${categoryLabel}」看，顺遂度约 ${score}/10。动在第 ${moving} 爻，先看世应远近与动爻六亲：应近则事在眼前，应远则宜蓄力。变卦「${cast.liuyao.bianName}」提示转折方向。${timing}。${advice} 盘面只供参照，落地还靠你。`
  } else if (school === 'qimen' && cast.qimen) {
    title = '奇门简解'
    summary = `「${cast.qimen.dun}${cast.qimen.ju}」值使${cast.qimen.zhiShi}，约 ${score}/10。`
    body = `奇门「${cast.qimen.dun}${cast.qimen.ju}」，日${cast.qimen.dayGanZhi}时${cast.qimen.hourZhi}，值使${cast.qimen.zhiShi}门。就「${categoryLabel}」看，顺遂度约 ${score}/10。先看用神落宫与门星生克：门开则宜沟通协作，门合则宜收束整顿。${timing}。${advice} 局盘是风向，决定在你手里。`
  } else {
    title = '梅花简解'
    summary = `「${cast.ben.name}」动第 ${moving} 爻，约 ${score}/10。`
    const ti = cast.tiIsUpper ? '上体下用' : '下体上用'
    body = `本卦「${cast.ben.name}」，上${cast.ben.upper.name}下${cast.ben.lower.name}，动第 ${moving} 爻（${ti}），互「${cast.hu.name}」，变「${cast.bian.name}」。就「${categoryLabel}」看，顺遂度约 ${score}/10。${cast.ben.judgment} 体卦为主、用卦为客，生克看远近。${timing}。${advice}`
  }

  const dims: DimScores | undefined = daily
    ? {
        overall: score,
        love: Math.min(10, Math.max(1, score + ((cast.lowerNum % 3) - 1))),
        career: Math.min(10, Math.max(1, score + ((cast.upperNum % 3) - 1))),
        wealth: Math.min(10, Math.max(1, score + ((moving % 3) - 1))),
        health: Math.min(10, Math.max(1, score - ((moving + 1) % 2))),
      }
    : undefined

  return {
    title,
    summary,
    body,
    tone,
    score,
    timing,
    advice,
    mind,
    theme: daily ? theme : undefined,
    dims,
    dimHints: daily
      ? {
          overall: '整体气场，先看这一条',
          love: '人际与感情，宜少猜多沟通',
          career: '做事节奏，宜抓一件推进',
          wealth: '收支与机会，宜先守再图',
          health: '作息体力，宜规律勿硬熬',
        }
      : undefined,
    disclaimer: DISCLAIMER + '（当前为本地起卦解析；填写 API Key 后可获白话详解。）',
  }
}

/** 设置页：探测 Chat Completions 是否可用 */
export async function testApiConnection(
  settings: AppSettings,
): Promise<{ ok: boolean; detail: string }> {
  if (!canUseLlm(settings)) {
    return { ok: false, detail: '未配置 Key，且 Base URL 也不是本机模型。可先用离线简解。' }
  }
  try {
    const text = await callLlmText(
      settings,
      [
        { role: 'system', content: '只回复两个字：连通' },
        { role: 'user', content: 'ping' },
      ],
      false,
    )
    return { ok: true, detail: `连通成功（${settings.model}）：${text.slice(0, 40)}` }
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}

export { DISCLAIMER }
