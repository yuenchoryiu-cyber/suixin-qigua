import { useEffect, useMemo, useRef, useState } from 'react'
import {
  API_PRESETS,
  CATEGORIES,
  CAST_METHODS,
  DIVINATION_SCHOOLS,
  methodsForSchool,
  type AppSettings,
  type CastMethod,
  type CastResult,
  type CastSeed,
  type CategoryId,
  type DivinationSchool,
  type GeoPickMode,
  type HistoryEntry,
  type InterpretResult,
} from './shared/types'
import { castUnified } from './cast/unified'
import { dailyRouteAnimSteps, pickDailyRoute } from './cast/daily'
import {
  buildFingerprint,
  cooldownRemainMinutes,
  dailyFingerprint,
  findCooldownHit,
  findDailyHit,
  localDayKey,
} from './meihua/fingerprint'
import {
  chatFollowUp,
  interpretCast,
  canUseLlm,
  refineWithAnswers,
  testApiConnection,
  type ChatTurn,
} from './meihua/interpret'
import { CLARIFY_CUSTOM_HINTS } from './clarify/hints'
import { BOUNDARY_BANNER } from './shared/privacy'
import { scrubSecrets } from './shared/scrub'
import { formatScoreGrade } from './shared/scoreGrade'
import {
  APP_NAME,
  APP_VERSION,
  pickRandomYijingQuote,
} from './shared/yijingQuotes'
import startEmblem from './assets/start-emblem.png'
import {
  SHARE_TEMPLATES,
  exportSharePng,
  templateIncludesFollowUp,
  type ShareTemplateId,
} from './share/exportCard'
import { LUOSHU_VISUAL } from './qimen/pan'
import { CastAnim } from './components/CastAnim'
import { ColorMatrixPicker, type Rgb } from './components/ColorMatrixPicker'
import { CityCascade, type CityPick } from './components/CityCascade'
import { HoldCast } from './components/HoldCast'
import { YijingDigitalRain } from './components/YijingDigitalRain'
import { MapPicker } from './components/MapPicker'
import { fetchWeather, probeGpsAvailable, resolveGeo } from './geo/location'
import { listHexagramCatalog } from './meihua/hexagrams'
import { stage, wait } from './cast/progress'
import {
  CLARIFY_TREES,
  NONE_OPTION_ID,
  composeCustomQuestion,
  composeQuestion,
  firstNodeId,
  getNode,
  nextNodeId,
  optionsWithNone,
  scopeFromAnswers,
  type ClarifyAnswer,
} from './clarify/trees'
import {
  FOLLOWUP_TREES,
  composeFollowUp,
  followFirstId,
  pickFollowOption,
} from './clarify/followup'

type Page =
  | 'start'
  | 'home'
  | 'method'
  | 'topic'
  | 'clarify'
  | 'confirm'
  | 'cast'
  | 'hold'
  | 'anim'
  | 'reveal'
  | 'result'
  | 'settings'

function AlertBanner({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  if (!message) return null
  return (
    <div className="alert" role="alert">
      <span className="alert-text">{message}</span>
      <button
        type="button"
        className="alert-dismiss"
        aria-label="关闭提示"
        title="关闭"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  )
}

const defaultSettings: AppSettings = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  mode: 'local',
  cooldownMinutes: 120,
  alwaysOnTop: true,
  highPrecisionDefault: false,
  hideWelcomeTip: false,
  fontScale: 'md',
  highContrast: false,
  storeQuestions: true,
  castReplayMode: false,
  apiVerified: false,
}

export default function App() {
  const [page, setPage] = useState<Page>('start')
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeDontShow, setWelcomeDontShow] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [category, setCategory] = useState<CategoryId>('self')
  const [school, setSchool] = useState<DivinationSchool>('meihua')
  const [method, setMethod] = useState<CastMethod>('time')
  const [subject, setSubject] = useState('')
  const [scope, setScope] = useState('')
  const [question, setQuestion] = useState('')
  const [clarifyAnswers, setClarifyAnswers] = useState<ClarifyAnswer[]>([])
  const [clarifyNodeId, setClarifyNodeId] = useState('')
  const [geoMode, setGeoMode] = useState<GeoPickMode>('gps')
  const [gpsProbe, setGpsProbe] = useState<{
    status: 'idle' | 'checking' | 'ok' | 'fail'
    message?: string
  }>({ status: 'idle' })
  const [city, setCity] = useState('')
  const [cityPick, setCityPick] = useState<CityPick | null>(null)
  const [manualCoords, setManualCoords] = useState('')
  const [mapPick, setMapPick] = useState<{ lat: number; lon: number } | null>(null)
  const [num1, setNum1] = useState('')
  const [num2, setNum2] = useState('')
  const [num3, setNum3] = useState('')
  const [colorRgb, setColorRgb] = useState<Rgb | null>(null)
  const [clarifyNoneStreak, setClarifyNoneStreak] = useState(0)
  const [clarifyEscape, setClarifyEscape] = useState(false)
  const [customClarifyText, setCustomClarifyText] = useState('')
  const [chaseCustomMode, setChaseCustomMode] = useState(false)
  const [chaseCustomText, setChaseCustomText] = useState('')
  const [highPrecision, setHighPrecision] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [animStatus, setAnimStatus] = useState('')
  const [castProgress, setCastProgress] = useState(0)
  const [liveSeed, setLiveSeed] = useState<CastSeed | null>(null)
  const [cast, setCast] = useState<CastResult | null>(null)
  const [interpret, setInterpret] = useState<InterpretResult | null>(null)
  const [revealStep, setRevealStep] = useState(0)
  const [revealProgress, setRevealProgress] = useState(0)
  const [followAnswers, setFollowAnswers] = useState<string[]>([])
  const [refined, setRefined] = useState(false)
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([])
  const [chaseAnswers, setChaseAnswers] = useState<ClarifyAnswer[]>([])
  const [chaseNodeId, setChaseNodeId] = useState('')
  const [chaseDone, setChaseDone] = useState(false)
  const [shareTemplate, setShareTemplate] = useState<ShareTemplateId>('classic')
  const [sharePreview, setSharePreview] = useState<string | null>(null)
  const [dailyMode, setDailyMode] = useState(false)
  const [startQuote, setStartQuote] = useState(() => pickRandomYijingQuote())
  const [startGuaIdx, setStartGuaIdx] = useState(() => Math.floor(Math.random() * 64))
  const [expandDetail, setExpandDetail] = useState(false)
  /** 仅设置页提示（避免测 API 文案变成其他页红框） */
  const [settingsNote, setSettingsNote] = useState<{ ok: boolean; text: string } | null>(
    null,
  )
  /** missing=未配置 Key；failed=测通或调用失败；ok=有 Key 且最近成功 */
  const [apiStatus, setApiStatus] = useState<'missing' | 'untested' | 'failed' | 'ok'>('missing')
  const autoRevealRef = useRef(false)

  const dailyHit = useMemo(() => findDailyHit(history), [history])
  const hexCatalog = useMemo(() => listHexagramCatalog(), [])
  const startGua = hexCatalog[startGuaIdx] || hexCatalog[0]

  const catMeta = useMemo(
    () => CATEGORIES.find((c) => c.id === category)!,
    [category],
  )
  const availableMethods = useMemo(
    () => CAST_METHODS.filter((m) => m.ready && methodsForSchool(school).includes(m.id)),
    [school],
  )
  const methodLabel = (m: CastMethod) => {
    if (school === 'liuyao' && m === 'number') return '铜钱'
    if (school === 'liuyao' && m === 'time') return '时间'
    if (school === 'liuyao' && m === 'random') return '随机'
    return CAST_METHODS.find((x) => x.id === m)?.label || m
  }
  const methodHint = (m: CastMethod) => {
    if (school === 'liuyao' && m === 'number') return '点下一步，模拟摇钱成卦'
    if (school === 'liuyao' && m === 'time') return '以此时此刻起卦'
    if (school === 'liuyao' && m === 'geo') return '先选地点，再起卦'
    if (school === 'liuyao' && m === 'weather') return '先选地点，再按天气起卦'
    if (school === 'liuyao' && m === 'color') return '点选一种颜色即可'
    if (school === 'liuyao' && m === 'random') return '一键随机成卦'
    if (school === 'qimen' && m === 'time') return '以此时此刻排盘'
    if (school === 'qimen' && m === 'number') return '输入三数后起卦'
    if (school === 'qimen' && m === 'geo') return '先选地点，再排盘'
    if (school === 'qimen' && m === 'weather') return '先选地点，再按天气排盘'
    if (school === 'qimen' && m === 'color') return '点选一种颜色即可'
    if (school === 'qimen' && m === 'random') return '一键随机排盘'
    if (m === 'random') return '一键随机成卦'
    return CAST_METHODS.find((x) => x.id === m)?.hint || ''
  }

  const chaseTree = useMemo(() => FOLLOWUP_TREES[category], [category])
  const chaseNode = useMemo(
    () => (chaseNodeId ? getNode(chaseTree, chaseNodeId) : undefined),
    [chaseTree, chaseNodeId],
  )

  const clarifyTree = useMemo(() => CLARIFY_TREES[category], [category])
  const clarifyNode = useMemo(
    () => (clarifyNodeId ? getNode(clarifyTree, clarifyNodeId) : undefined),
    [clarifyTree, clarifyNodeId],
  )
  const clarifyProgress = useMemo(() => {
    if (!clarifyTree.length) return 0
    const idx = clarifyTree.findIndex((n) => n.id === clarifyNodeId)
    return Math.round(((Math.max(idx, 0) + 1) / clarifyTree.length) * 100)
  }, [clarifyTree, clarifyNodeId])

  useEffect(() => {
    void (async () => {
      if (!window.suixin) return
      const s = await window.suixin.getSettings()
      const hasKey = !!s.apiKey?.trim()
      const next = hasKey ? s : { ...s, mode: 'local' as const, apiVerified: false }
      setSettings(next)
      setApiStatus(
        !hasKey ? 'missing' : s.apiVerified ? 'ok' : 'untested',
      )
      setHistory(await window.suixin.listHistory())
      setHighPrecision(!!s.highPrecisionDefault && hasKey)
      if (!s.hideWelcomeTip) setShowWelcome(true)
    })()
    if (!window.suixin) return
    const off = window.suixin.onNavigate((p) => {
      if (p === 'settings') setPage('settings')
    })
    return () => {
      off()
    }
  }, [])

  useEffect(() => {
    const hasKey = !!settings.apiKey?.trim()
    if (!hasKey) {
      setApiStatus((prev) => (prev === 'failed' ? 'failed' : 'missing'))
      if (settings.mode !== 'local') {
        setSettings((s) => ({ ...s, mode: 'local' }))
      }
      if (highPrecision) setHighPrecision(false)
    } else if (apiStatus === 'missing') {
      setApiStatus('untested')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.apiKey])

  useEffect(() => {
    if (page !== 'cast') return
    if (method !== 'geo' && method !== 'weather') return
    if (geoMode !== 'gps') {
      setGpsProbe({ status: 'idle' })
      return
    }
    let cancelled = false
    setGpsProbe({ status: 'checking' })
    void probeGpsAvailable().then((r) => {
      if (cancelled) return
      if (r.ok) setGpsProbe({ status: 'ok' })
      else setGpsProbe({ status: 'fail', message: r.message })
    })
    return () => {
      cancelled = true
    }
  }, [page, method, geoMode])

  useEffect(() => {
    if (catMeta.scopePresets?.length && !scope) {
      setScope(catMeta.scopePresets[0].id)
    }
  }, [catMeta, scope])

  /** 成卦过程自动推进，结束后自动解读 */
  useEffect(() => {
    if (page !== 'reveal' || !cast?.steps?.length) return
    if (autoRevealRef.current) return
    autoRevealRef.current = true
    let cancelled = false
    const steps = cast.steps
    const per = 1600

    void (async () => {
      setRevealStep(0)
      setRevealProgress(0)
      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return
        setRevealStep(i)
        setRevealProgress(Math.round(((i + 1) / steps.length) * 100))
        await wait(per)
      }
      if (cancelled) return
      setRevealProgress(100)
      await wait(500)
      if (!cancelled) void requestInterpret()
    })()

    return () => {
      cancelled = true
      autoRevealRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, cast?.datetime])


  function scopeLabel(): string | undefined {
    if (!scope) return undefined
    return (
      catMeta.scopePresets?.find((s) => s.id === scope)?.label ||
      ({ now: '当下', month: '本月', quarter: '本季', year: '本年', '3y': '三年内' } as Record<
        string,
        string
      >)[scope] ||
      scope
    )
  }

  async function persistSettings(partial: Partial<AppSettings>) {
    if (!window.suixin) {
      setSettings((s) => ({ ...s, ...partial }))
      return
    }
    const next = await window.suixin.setSettings(partial)
    setSettings(next)
  }

  /** 改 Key / URL / 模型后作废「已验证」 */
  function invalidateApiVerified(
    next: Partial<AppSettings>,
    prev: AppSettings = settings,
  ): Partial<AppSettings> {
    const keyChanged =
      next.apiKey !== undefined && next.apiKey.trim() !== (prev.apiKey || '').trim()
    const urlChanged =
      next.baseUrl !== undefined && next.baseUrl.trim() !== (prev.baseUrl || '').trim()
    const modelChanged =
      next.model !== undefined && next.model.trim() !== (prev.model || '').trim()
    if (keyChanged || urlChanged || modelChanged) {
      return { ...next, apiVerified: false }
    }
    return next
  }

  async function dismissWelcome(goSettings: boolean) {
    if (welcomeDontShow) {
      await persistSettings({ hideWelcomeTip: true })
    }
    setShowWelcome(false)
    if (goSettings) setPage('settings')
  }

  function applyApiPreset(id: string) {
    const p = API_PRESETS.find((x) => x.id === id)
    if (!p) return
    setSettings((s) => ({
      ...s,
      baseUrl: p.baseUrl,
      model: p.model,
      apiVerified: false,
    }))
    setApiStatus((prev) => (prev === 'missing' ? 'missing' : 'untested'))
    void persistSettings({
      baseUrl: p.baseUrl,
      model: p.model,
      apiVerified: false,
    })
  }

  function beginFreshAsk(nextCategory?: CategoryId) {
    const cat = nextCategory ?? category
    const meta = CATEGORIES.find((c) => c.id === cat)!
    setError('')
    setQuestion('')
    setSubject('')
    setCity('')
    setCityPick(null)
    setManualCoords('')
    setMapPick(null)
    setNum1('')
    setNum2('')
    setNum3('')
    setColorRgb(null)
    setClarifyNoneStreak(0)
    setClarifyEscape(false)
    setCustomClarifyText('')
    setChaseCustomMode(false)
    setChaseCustomText('')
    setLiveSeed(null)
    setAnimStatus('')
    setCastProgress(0)
    setRevealStep(0)
    setRevealProgress(0)
    setFollowAnswers([])
    setRefined(false)
    setChatTurns([])
    setChaseAnswers([])
    setChaseNodeId('')
    setChaseDone(false)
    setSharePreview(null)
    setDailyMode(false)
    autoRevealRef.current = false
    setClarifyAnswers([])
    setClarifyNodeId(firstNodeId(cat))
    setScope(meta.scopePresets?.[0]?.id ?? '')
    setCast(null)
    setInterpret(null)
    if (nextCategory) setCategory(nextCategory)
  }

  function pickClarifyOption(optionId: string) {
    const node = clarifyNode
    if (!node) return

    if (optionId === NONE_OPTION_ID) {
      const streak = clarifyNoneStreak + 1
      setClarifyNoneStreak(streak)
      const answer: ClarifyAnswer = {
        nodeId: node.id,
        optionId: NONE_OPTION_ID,
        label: '都不是',
        phrase: '',
      }
      const nextAnswers = [
        ...clarifyAnswers.filter((a) => a.nodeId !== node.id),
        answer,
      ]
      setClarifyAnswers(nextAnswers)
      if (streak >= 3) {
        setClarifyEscape(true)
        return
      }
      const nid = nextNodeId(clarifyTree, node.id, {
        id: NONE_OPTION_ID,
        label: '都不是',
        phrase: '',
      })
      if (!nid) {
        setClarifyEscape(true)
        return
      }
      setClarifyNodeId(nid)
      return
    }

    const opt = node.options.find((o) => o.id === optionId)
    if (!opt) return
    setClarifyNoneStreak(0)
    setClarifyEscape(false)
    const answer: ClarifyAnswer = {
      nodeId: node.id,
      optionId: opt.id,
      label: opt.label,
      phrase: opt.phrase,
      scope: opt.scope,
    }
    const nextAnswers = [
      ...clarifyAnswers.filter((a) => a.nodeId !== node.id),
      answer,
    ]
    setClarifyAnswers(nextAnswers)
    const nid = nextNodeId(clarifyTree, node.id, opt)
    if (!nid) {
      const composed = composeQuestion(catMeta.label, nextAnswers)
      setQuestion(composed)
      const sc = scopeFromAnswers(nextAnswers)
      if (sc) setScope(sc)
      else if (catMeta.scopePresets?.length) setScope(catMeta.scopePresets[0].id)
      setPage('confirm')
      return
    }
    setClarifyNodeId(nid)
  }

  function submitCustomClarify() {
    const composed = composeCustomQuestion(catMeta.label, customClarifyText)
    setQuestion(composed)
    if (catMeta.scopePresets?.length && !scope) {
      setScope(catMeta.scopePresets[0].id)
    }
    setClarifyEscape(false)
    setPage('confirm')
  }

  function restartClarify() {
    setClarifyAnswers([])
    setClarifyNodeId(firstNodeId(category))
    setClarifyNoneStreak(0)
    setClarifyEscape(false)
    setCustomClarifyText('')
    setQuestion('')
  }

  function backClarify() {
    if (clarifyEscape) {
      setClarifyEscape(false)
      return
    }
    if (!clarifyAnswers.length) {
      setPage('topic')
      return
    }
    const prev = clarifyAnswers[clarifyAnswers.length - 1]
    const rest = clarifyAnswers.slice(0, -1)
    setClarifyAnswers(rest)
    setClarifyNodeId(prev.nodeId)
    let streak = 0
    for (let i = rest.length - 1; i >= 0; i--) {
      if (rest[i].optionId === NONE_OPTION_ID) streak++
      else break
    }
    setClarifyNoneStreak(streak)
  }

  function validate(): string | null {
    if (!question.trim()) return '请先完成「问清楚」并确认所问。'
    if (catMeta.needsScope && !scope) return '请选择时间范围。'
    if (method === 'number' && (school === 'meihua' || school === 'qimen')) {
      const a = Number(num1)
      const b = Number(num2)
      const c = Number(num3)
      if (![a, b, c].every((n) => Number.isFinite(n) && n > 0)) {
        return '请输入三个大于 0 的数字。'
      }
    }
    if (method === 'color' && !colorRgb) {
      return '请在蜂巢色盘中点选一种颜色。'
    }
    if ((method === 'geo' || method === 'weather') && geoMode === 'city' && !cityPick) {
      return '请按洲 → 国家 → 城市选择，或改用「当前位置 / 手输坐标」。'
    }
    if ((method === 'geo' || method === 'weather') && geoMode === 'manual' && !manualCoords.trim()) {
      return '请填写纬度,经度，例如 43.2389, 76.8897'
    }
    if ((method === 'geo' || method === 'weather') && geoMode === 'map' && !mapPick) {
      return '请在地图上点击定点'
    }
    return null
  }

  async function startCast() {
    setError('')
    const v = validate()
    if (v) {
      setError(v)
      return
    }

    if ((method === 'geo' || method === 'weather') && geoMode === 'gps') {
      setBusy(true)
      const probe =
        gpsProbe.status === 'ok'
          ? { ok: true as const }
          : gpsProbe.status === 'fail'
            ? { ok: false as const, message: gpsProbe.message }
            : await probeGpsAvailable()
      setBusy(false)
      if (!probe.ok) {
        const msg =
          probe.message ||
          '当前位置不可用，请改用「选择城市」或「地图点选」。'
        setGpsProbe({ status: 'fail', message: msg })
        setError(msg)
        return
      }
      setGpsProbe({ status: 'ok' })
    }

    const input = {
      category,
      subject: subject.trim() || undefined,
      scope: catMeta.needsScope ? scope : undefined,
      question: question.trim(),
      method,
    }

    const hit = findCooldownHit(
      buildFingerprint({ ...input, school }),
      history,
      settings.cooldownMinutes,
    )

    if (hit) {
      const mins = cooldownRemainMinutes(hit, settings.cooldownMinutes)
      setError(
        `同一问题冷却中（约 ${mins} 分钟后可再问）。可换起卦方式或时间范围。`,
      )
      return
    }

    if (settings.castReplayMode) {
      void executeCast(0)
      return
    }
    setPage('hold')
  }

  async function executeCast(holdMs: number) {
    setError('')
    const input = {
      category,
      subject: subject.trim() || undefined,
      scope: catMeta.needsScope ? scope : undefined,
      question: question.trim(),
      method,
    }

    setPage('anim')
    setBusy(true)
    setDailyMode(false)
    setLiveSeed(null)
    setAnimStatus('准备起卦…')
    setCastProgress(0)
    setCast(null)
    setInterpret(null)

    let progress = 0
    const setP = (p: number) => {
      progress = p
      setCastProgress(p)
    }
    const getP = () => progress

    const entropy = {
      enabled: !settings.castReplayMode,
      when: new Date(),
      holdMs: settings.castReplayMode ? 0 : holdMs,
    }

    try {
      let extras: Parameters<typeof castUnified>[0]['extras'] = { entropy }

      await stage(
        '静心片刻…',
        12,
        1600,
        setAnimStatus,
        setP,
        getP,
      )

      if (method === 'number') {
        if (school === 'liuyao') {
          await stage('摇钱成卦…', 40, 2200, setAnimStatus, setP, getP)
          await stage('排盘中…', 72, 2200, setAnimStatus, setP, getP)
          await stage('即将完成…', 90, 1600, setAnimStatus, setP, getP)
        } else {
          const numbers: [number, number, number] = [
            Math.floor(Number(num1)),
            Math.floor(Number(num2)),
            Math.floor(Number(num3)),
          ]
          setLiveSeed({ numbers })
          extras = { ...extras, numbers }
          if (school === 'qimen') {
            await stage('三数排盘…', 45, 1800, setAnimStatus, setP, getP)
            await stage('排盘中…', 72, 2000, setAnimStatus, setP, getP)
            await stage('即将完成…', 90, 1400, setAnimStatus, setP, getP)
          } else {
            await stage('取第一数…', 35, 1800, setAnimStatus, setP, getP)
            await stage('取第二数…', 62, 1800, setAnimStatus, setP, getP)
            await stage('合流成卦…', 88, 1800, setAnimStatus, setP, getP)
          }
        }
      } else if (method === 'random') {
        const numbers: [number, number, number] = [
          1 + Math.floor(Math.random() * 999),
          1 + Math.floor(Math.random() * 999),
          1 + Math.floor(Math.random() * 999),
        ]
        setLiveSeed({ numbers })
        extras = { ...extras, numbers }
        if (school === 'liuyao') {
          await stage('随机摇钱…', 40, 2000, setAnimStatus, setP, getP)
          await stage('排盘中…', 72, 2000, setAnimStatus, setP, getP)
          await stage('即将完成…', 90, 1400, setAnimStatus, setP, getP)
        } else if (school === 'qimen') {
          await stage('随机排盘…', 40, 1800, setAnimStatus, setP, getP)
          await stage('排盘中…', 72, 2000, setAnimStatus, setP, getP)
          await stage('即将完成…', 90, 1400, setAnimStatus, setP, getP)
        } else {
          await stage('随机取数…', 35, 1600, setAnimStatus, setP, getP)
          await stage('成卦中…', 62, 1600, setAnimStatus, setP, getP)
          await stage('即将完成…', 88, 1600, setAnimStatus, setP, getP)
        }
      } else if (method === 'color' && colorRgb) {
        const rgb: [number, number, number] = [colorRgb.r, colorRgb.g, colorRgb.b]
        setLiveSeed({ rgb, numbers: rgb })
        extras = { ...extras, rgb }
        await stage('取色中…', 40, 1800, setAnimStatus, setP, getP)
        if (school === 'qimen') {
          await stage('排盘中…', 72, 2000, setAnimStatus, setP, getP)
          await stage('即将完成…', 90, 1400, setAnimStatus, setP, getP)
        } else if (school === 'liuyao') {
          await stage('成卦中…', 72, 2000, setAnimStatus, setP, getP)
          await stage('即将完成…', 90, 1400, setAnimStatus, setP, getP)
        } else {
          await stage('成卦中…', 68, 1800, setAnimStatus, setP, getP)
          await stage('即将完成…', 90, 1600, setAnimStatus, setP, getP)
        }
      } else if (method === 'geo' || method === 'weather') {
        await stage(
          geoMode === 'gps'
            ? '确认当前位置…'
            : geoMode === 'city'
              ? `确认城市「${cityPick?.city || ''}」…`
              : geoMode === 'map'
                ? '确认地图选点…'
                : '确认坐标…',
          28,
          2000,
          setAnimStatus,
          setP,
          getP,
        )
        const point =
          geoMode === 'map' && mapPick
            ? {
                lat: mapPick.lat,
                lon: mapPick.lon,
                label: `地图点选 ${mapPick.lat.toFixed(5)}, ${mapPick.lon.toFixed(5)}`,
                source: 'manual' as const,
              }
            : geoMode === 'city' && cityPick
              ? {
                  lat: cityPick.lat,
                  lon: cityPick.lon,
                  label: cityPick.label,
                  source: 'city' as const,
                }
            : await resolveGeo({
                mode: (geoMode === 'map' ? 'manual' : geoMode) as
                  | 'gps'
                  | 'city'
                  | 'manual',
                city,
                manual: manualCoords,
              })
        setLiveSeed({ lat: point.lat, lon: point.lon, placeLabel: point.label })
        await stage(`地点：${point.label}`, 55, 2200, setAnimStatus, setP, getP)

        if (method === 'geo') {
          await stage('成卦中…', 88, 2200, setAnimStatus, setP, getP)
          extras = { ...extras, geo: { lat: point.lat, lon: point.lon, label: point.label } }
        } else {
          await stage('确认天气…', 70, 2000, setAnimStatus, setP, getP)
          const wx = await fetchWeather(point)
          setLiveSeed({
            lat: wx.lat,
            lon: wx.lon,
            placeLabel: wx.placeLabel,
            tempC: wx.tempC,
            humidity: wx.humidity,
            pressure: wx.pressure,
          })
          await stage('成卦中…', 88, 2000, setAnimStatus, setP, getP)
          extras = { ...extras, weather: wx }
        }
      } else if (school === 'liuyao') {
        await stage('校时中…', 40, 2000, setAnimStatus, setP, getP)
        await stage('成卦中…', 70, 2200, setAnimStatus, setP, getP)
        await stage('即将完成…', 90, 1400, setAnimStatus, setP, getP)
      } else if (school === 'qimen') {
        await stage('排盘中…', 38, 2200, setAnimStatus, setP, getP)
        await stage('排盘中…', 68, 2400, setAnimStatus, setP, getP)
        await stage('即将完成…', 90, 1600, setAnimStatus, setP, getP)
      } else {
        await stage('校时中…', 40, 2200, setAnimStatus, setP, getP)
        await stage('成卦中…', 72, 2400, setAnimStatus, setP, getP)
        await stage('即将完成…', 88, 1600, setAnimStatus, setP, getP)
      }

      await stage(
        '即将完成…',
        96,
        1800,
        setAnimStatus,
        setP,
        getP,
      )
      const result = await castUnified({ school, input, extras })
      setCast(result)
      setLiveSeed(result.seed ?? null)
      await stage('起卦完成', 100, 900, setAnimStatus, setP, getP)
      await wait(600)
      setRevealStep(0)
      setFollowAnswers([])
      setRefined(false)
      setChatTurns([])
      setChaseAnswers([])
      setChaseNodeId(followFirstId(category))
      setChaseDone(false)
      setSharePreview(null)
      setInterpret(null)
      setPage('reveal')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setInterpret(null)
      setPage('cast')
    } finally {
      setBusy(false)
      setAnimStatus('')
    }
  }

  async function startDailyCast() {
    setError('')
    const hit = findDailyHit(history)
    if (hit) {
      setCast(hit.cast)
      setInterpret(hit.interpret || null)
      setQuestion('今日吉凶')
      setCategory('self')
      setSchool(hit.cast.school || 'meihua')
      setMethod(hit.cast.method)
      setDailyMode(true)
      setChatTurns([])
      setChaseAnswers([])
      setChaseNodeId('')
      setChaseDone(true)
      setSharePreview(null)
      setFollowAnswers([])
      setRefined(true)
      setPage('result')
      return
    }

    setDailyMode(true)
    setCategory('self')
    setQuestion('今日吉凶')
    setSubject('')
    setScope('')
    setHighPrecision(false)
    setPage('anim')
    setBusy(true)
    setLiveSeed(null)
    setAnimStatus('准备今日一卦…')
    setCastProgress(0)
    setCast(null)
    setInterpret(null)

    let progress = 0
    const setP = (p: number) => {
      progress = p
      setCastProgress(p)
    }
    const getP = () => progress

    try {
      const route = pickDailyRoute()
      setSchool(route.school)
      setMethod(route.method)
      if (route.numbers) setLiveSeed({ numbers: route.numbers })

      const input = {
        category: 'self' as const,
        question: '今日吉凶',
        method: route.method,
      }
      const extras = {
        ...(route.numbers ? { numbers: route.numbers } : {}),
        entropy: {
          enabled: !settings.castReplayMode,
          when: new Date(),
          holdMs: 0,
        },
      }

      await stage(
        `今日随机取道：${route.label}`,
        14,
        1400,
        setAnimStatus,
        setP,
        getP,
      )
      const steps = dailyRouteAnimSteps(route)
      const marks = [40, 62, 82, 96]
      for (let i = 0; i < steps.length; i++) {
        await stage(steps[i], marks[i] ?? 96, 1600, setAnimStatus, setP, getP)
      }

      const result = await castUnified({
        school: route.school,
        input,
        extras,
      })
      const dayKey = localDayKey()
      result.fingerprint = dailyFingerprint(dayKey)
      result.lunarHint = `${route.label} · ${result.lunarHint}`
      if (route.numbers) {
        result.seed = { ...(result.seed || {}), numbers: route.numbers }
      }
      setCast(result)
      setLiveSeed(result.seed ?? null)
      await stage('起卦完成', 100, 800, setAnimStatus, setP, getP)
      await wait(500)
      setRevealStep(0)
      setFollowAnswers([])
      setRefined(true)
      setChatTurns([])
      setChaseAnswers([])
      setChaseNodeId('')
      setChaseDone(true)
      setSharePreview(null)
      setInterpret(null)
      setPage('reveal')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setDailyMode(false)
      setPage('home')
    } finally {
      setBusy(false)
      setAnimStatus('')
    }
  }

  async function requestInterpret() {
    if (!cast) return
    setError('')
    setBusy(true)
    setAnimStatus(dailyMode ? '正在撰写今日吉凶…' : '正在请 AI 白话解读…')
    try {
      const inter = await interpretCast({
        settings,
        cast,
        question: question.trim(),
        categoryLabel: dailyMode ? '今日吉凶' : catMeta.label,
        subject: subject.trim() || undefined,
        scope: dailyMode ? undefined : scopeLabel(),
        highPrecision: dailyMode ? false : highPrecision,
        daily: dailyMode,
      })
      setInterpret(inter)
      setExpandDetail(false)
      if (inter.source === 'llm') setApiStatus('ok')
      else if (inter.source === 'local-fallback') setApiStatus('failed')
      else if (!canUseLlm(settings)) setApiStatus('missing')
      setFollowAnswers((inter.followUps || []).map(() => ''))
      setChatTurns([])
      setChaseAnswers([])
      setChaseDone(false)
      setChaseCustomMode(false)
      setChaseCustomText('')
      setSharePreview(null)
      setChaseNodeId(dailyMode ? '' : followFirstId(category))
      const dayKey = localDayKey()
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        fingerprint: dailyMode ? dailyFingerprint(dayKey) : cast.fingerprint,
        category: dailyMode ? 'self' : category,
        subject: dailyMode ? undefined : subject.trim() || undefined,
        scope: dailyMode ? undefined : catMeta.needsScope ? scope : undefined,
        question:
          dailyMode || settings.storeQuestions !== false
            ? dailyMode
              ? '今日吉凶'
              : question.trim()
            : '（问句未存档）',
        cast: dailyMode
          ? { ...cast, fingerprint: dailyFingerprint(dayKey) }
          : cast,
        interpret: inter,
        kind: dailyMode ? 'daily' : 'ask',
        dayKey: dailyMode ? dayKey : undefined,
      }
      setHistory((h) => [entry, ...h])
      await window.suixin?.addHistory(entry)
      setPage('result')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      void window.suixin?.logError?.(`interpret: ${msg}`)
    } finally {
      setBusy(false)
      setAnimStatus('')
    }
  }

  async function submitFollowUps() {
    if (!cast || !interpret?.followUps?.length) return
    setBusy(true)
    setError('')
    try {
      const answers = interpret.followUps.map((q, i) => ({
        q,
        a: followAnswers[i] || '',
      }))
      const next = await refineWithAnswers({
        settings,
        cast,
        question: question.trim(),
        categoryLabel: catMeta.label,
        subject: subject.trim() || undefined,
        scope: scopeLabel(),
        previous: interpret,
        answers,
      })
      setInterpret({ ...next, followUps: undefined })
      setExpandDetail(true)
      setRefined(true)
      setSharePreview(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      void window.suixin?.logError?.(`refine: ${msg}`)
    } finally {
      setBusy(false)
    }
  }

  async function pickChaseOption(optionId: string) {
    if (!cast || !interpret || !chaseNode || busy || chaseDone) return
    if (optionId === NONE_OPTION_ID) {
      setChaseCustomMode(true)
      return
    }
    const opt = chaseNode.options.find((o) => o.id === optionId)
    if (!opt) return
    const { answers, done } = pickFollowOption(
      category,
      chaseNode.id,
      opt,
      chaseAnswers,
    )
    setChaseAnswers(answers)
    if (!done) return
    await runChaseMessage(composeFollowUp(catMeta.label, answers))
  }

  async function submitChaseCustom() {
    const t = chaseCustomText.trim()
    if (!t) {
      setError('请用自己的话写一句追问，或返回重选。')
      return
    }
    await runChaseMessage(
      `基于刚才的卦解，继续追问（仅此一问，用户自述）：${t}。请结合原盘简短作答，勿鼓励继续细问。`,
    )
  }

  async function runChaseMessage(msg: string) {
    if (!cast || !interpret) return
    setBusy(true)
    setError('')
    const nextHistory = [...chatTurns, { role: 'user' as const, content: msg }]
    setChatTurns(nextHistory)
    setChaseAnswers([])
    setChaseNodeId('')
    setChaseCustomMode(false)
    setChaseCustomText('')
    try {
      const reply = await chatFollowUp({
        settings,
        cast,
        question: question.trim(),
        categoryLabel: catMeta.label,
        interpret,
        history: [],
        userMessage: msg,
      })
      setChatTurns([...nextHistory, { role: 'assistant', content: reply }])
      setChaseDone(true)
      setSharePreview(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setChatTurns(chatTurns)
      setChaseNodeId(followFirstId(category))
      setChaseCustomMode(false)
    } finally {
      setBusy(false)
    }
  }

  function buildShareData() {
    if (!cast || !interpret) return null
    const schoolLabel =
      DIVINATION_SCHOOLS.find((s) => s.id === (cast.school || school))?.label ||
      '随心起卦'
    // 分享卡只含卦解文案，绝不带入 API Key / Base URL / 模型名
    const scrub = (s: string) => scrubSecrets(s, 0)

    const followParts: string[] = []
    for (let i = 0; i < chatTurns.length; i++) {
      const t = chatTurns[i]
      if (t.role === 'user') {
        const ask = scrub(t.content.trim())
        const ans = chatTurns[i + 1]?.role === 'assistant' ? scrub(chatTurns[i + 1].content.trim()) : ''
        if (ask) followParts.push(`问：${ask}`)
        if (ans) followParts.push(`解：${ans}`)
      }
    }
    // 精炼解读后正文已更新；若仍有未写入 chat 的选项追问答案，一并带上摘要
    if (!followParts.length && refined && interpret.summary) {
      // 精炼已在 body，无需重复
    }

    return {
      schoolLabel,
      hint: scrub(cast.lunarHint),
      guaTitle: cast.ben.name,
      meta: scrub(
        cast.school === 'qimen'
          ? cast.lunarHint
          : cast.school === 'liuyao'
            ? `世应装卦 · ${cast.lunarHint}`
            : `动第 ${cast.changeYao} 爻 · 变 ${cast.bian.name}`,
      ),
      title: scrub(interpret.title),
      summary: scrub(interpret.summary || interpret.title),
      body: scrub(
        [
          interpret.verdict ? `【断盘】${interpret.verdict}` : '',
          interpret.body,
          interpret.timing ? `应期：${interpret.timing}` : '',
          interpret.advice
            ? `${dailyMode ? '今日宜' : '该不该做'}：${interpret.advice}`
            : '',
          // 每日一卦评分改画 bar chart，正文不再塞一行文字分
        ]
          .filter(Boolean)
          .join('\n\n'),
      ),
      dims:
        dailyMode && interpret.dims
          ? (
              [
                ['综合', interpret.dims.overall],
                ['爱情', interpret.dims.love],
                ['事业', interpret.dims.career],
                ['财运', interpret.dims.wealth],
                ['身体', interpret.dims.health],
              ] as const
            ).map(([label, value]) => ({
              label,
              value,
              grade: formatScoreGrade(value),
            }))
          : undefined,
      followUp: followParts.length ? followParts.join('\n\n') : undefined,
      disclaimer: scrub(interpret.disclaimer),
    }
  }

  async function refreshSharePreview() {
    const data = buildShareData()
    if (!data) return
    try {
      const dataUrl = await exportSharePng(data, shareTemplate)
      setSharePreview(dataUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function onShare(kind: 'save' | 'copy') {
    if (!cast || !interpret) return
    setBusy(true)
    try {
      const data = buildShareData()
      if (!data) return
      const dataUrl = sharePreview || (await exportSharePng(data, shareTemplate))
      if (!sharePreview) setSharePreview(dataUrl)
      const name = `随心起卦_${cast.ben.name}_${shareTemplate}_${Date.now()}.png`
      if (kind === 'save') {
        const r = await window.suixin.saveShareImage(dataUrl, name)
        if (!r.ok) setError('已取消保存')
      } else {
        await window.suixin.copyShareImage(dataUrl)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="shell"
      data-font={settings.fontScale || 'md'}
      data-contrast={settings.highContrast ? 'high' : 'normal'}
    >
      <div className="panel">
        <header className="chrome">
          <div className="brand">
            <div className="brand-row">
              <span className="brand-mark">SUIXIN</span>
              <small>{APP_NAME}</small>
            </div>
            {apiStatus !== 'ok' && (
              <span className="api-warn" role="status">
                {apiStatus === 'missing'
                  ? '未设置 API · 仅本地起卦解析'
                  : apiStatus === 'untested'
                    ? 'API Key 未测试 · 点设置里「测试 API」'
                    : 'API 未连通 · 已用本地解析'}
              </span>
            )}
          </div>
          <div className="chrome-actions">
            <button
              className="icon-btn"
              title="设置"
              onClick={() => {
                setError('')
                setPage('settings')
              }}
            >
              ⚙
            </button>
            <button className="icon-btn" title="隐藏" onClick={() => void window.suixin?.hideWindow()}>
              —
            </button>
            <button
              className="icon-btn quit"
              title="退出"
              onClick={() => void window.suixin?.quitApp()}
            >
              ×
            </button>
          </div>
        </header>

        <main className="content">
          {page === 'start' && (
            <div className="start-page">
              <YijingDigitalRain className="yijing-rain" clearRatio={0.42} />
              <div className="start-page-fg">
              <button
                type="button"
                className="start-emblem-wrap"
                title="点此换一卦"
                onClick={() =>
                  setStartGuaIdx((i) => {
                    let n = Math.floor(Math.random() * hexCatalog.length)
                    if (n === i) n = (i + 1) % hexCatalog.length
                    return n
                  })
                }
              >
                <img
                  className="start-emblem"
                  src={startEmblem}
                  alt=""
                  draggable={false}
                />
                <span className="start-gua-overlay" key={startGua.number}>
                  <span className="start-gua-symbol">{startGua.symbol}</span>
                  <span className="start-gua-name">{startGua.name}</span>
                </span>
              </button>
              <div className="start-version">v{APP_VERSION}</div>
              <blockquote
                className="start-quote"
                key={startQuote.text}
                role="button"
                tabIndex={0}
                title="点此换一句"
                onClick={() => setStartQuote(pickRandomYijingQuote(startQuote.text))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setStartQuote(pickRandomYijingQuote(startQuote.text))
                  }
                }}
              >
                <p>{startQuote.text}</p>
                <cite>— 《易》· {startQuote.source}</cite>
              </blockquote>
              <button
                className="btn block start-cta"
                onClick={() => setPage('home')}
              >
                吉凶悔吝，生乎动者。
              </button>
              </div>
            </div>
          )}

          {page === 'home' && (
            <>
              <div className="h1">占卜体系</div>
              {error && (
                <AlertBanner message={error} onDismiss={() => setError('')} />
              )}
              <button
                className="btn block"
                disabled={busy}
                onClick={() => void startDailyCast()}
              >
                {dailyHit ? '查看今日吉凶' : '今日吉凶'}
              </button>
              <div className="grid-cats" style={{ marginTop: 14 }}>
                {DIVINATION_SCHOOLS.map((s) => (
                  <button
                    key={s.id}
                    className={`cat ${school === s.id ? 'active' : ''}`}
                    disabled={!s.ready}
                    onClick={() => {
                      if (!s.ready) return
                      setSchool(s.id)
                      const first = methodsForSchool(s.id)[0]
                      if (first) setMethod(first)
                      setDailyMode(false)
                      setError('')
                      setPage('method')
                    }}
                  >
                    <div className="label">{s.label}</div>
                  </button>
                ))}
                <button
                  type="button"
                  className="cat"
                  onClick={() => {
                    const ready = DIVINATION_SCHOOLS.filter((s) => s.ready)
                    const pick = ready[Math.floor(Math.random() * ready.length)]
                    if (!pick) return
                    const methods = methodsForSchool(pick.id)
                    const m = methods[Math.floor(Math.random() * methods.length)]
                    setSchool(pick.id)
                    if (m) setMethod(m)
                    setDailyMode(false)
                    setError('')
                    setPage('topic')
                  }}
                >
                  <div className="label">随机起卦</div>
                </button>
              </div>
              <button
                className="btn ghost block"
                onClick={() => {
                  setStartQuote(pickRandomYijingQuote())
                  setPage('start')
                }}
              >
                返回开始
              </button>
            </>
          )}

          {page === 'method' && (
            <>
              <div className="h1">取数方式</div>
              <p className="sub">
                {DIVINATION_SCHOOLS.find((s) => s.id === school)?.label}
              </p>
              <div className="grid-cats">
                {availableMethods.map((m) => (
                  <button
                    key={m.id}
                    className={`cat ${method === m.id ? 'active' : ''}`}
                    onClick={() => {
                      setMethod(m.id)
                      setError('')
                      setPage('topic')
                    }}
                  >
                    <div className="label">{methodLabel(m.id)}</div>
                    <div className="hint">{methodHint(m.id)}</div>
                  </button>
                ))}
              </div>
              <button className="btn ghost block" onClick={() => setPage('home')}>
                返回体系
              </button>
            </>
          )}

          {page === 'topic' && (
            <>
              <div className="h1">所求</div>
              <p className="sub">
                {DIVINATION_SCHOOLS.find((s) => s.id === school)?.label} ·{' '}
                {methodLabel(method)}
              </p>
              <div className="grid-cats">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    className={`cat ${category === c.id ? 'active' : ''}`}
                    onClick={() => {
                      beginFreshAsk(c.id)
                      setPage('clarify')
                    }}
                  >
                    <div className="label">{c.label}</div>
                  </button>
                ))}
              </div>
              <button className="btn ghost block" onClick={() => setPage('method')}>
                返回取数
              </button>
            </>
          )}

          {page === 'clarify' && clarifyNode && (
            <>
              <div className="h1">{catMeta.label}</div>
              <div className="cast-progress" aria-label={`澄清进度 ${clarifyProgress}%`}>
                <div className="cast-progress-track">
                  <div
                    className="cast-progress-fill"
                    style={{ width: `${clarifyProgress}%` }}
                  />
                </div>
                <div className="cast-progress-meta">
                  <span>
                    第 {clarifyTree.findIndex((n) => n.id === clarifyNodeId) + 1} /{' '}
                    {clarifyTree.length} 问
                  </span>
                  <span>{clarifyProgress}%</span>
                </div>
              </div>

              {clarifyAnswers.length > 0 && (
                <div className="chip-trail">
                  {clarifyAnswers.map((a) => (
                    <span key={a.nodeId} className="chip trail">
                      {a.label}
                    </span>
                  ))}
                </div>
              )}

              {clarifyEscape ? (
                <>
                  <div className="h1" style={{ fontSize: 15, marginTop: 10 }}>
                    连续三次都不是选项
                  </div>
                  <p className="sub">
                    用自己的话写清想问什么，或从头再选，避免硬套不准的选项。
                  </p>
                  <div className="field">
                    <label>我自己的话</label>
                    <textarea
                      rows={3}
                      value={customClarifyText}
                      onChange={(e) => setCustomClarifyText(e.target.value)}
                      placeholder={CLARIFY_CUSTOM_HINTS[category]}
                    />
                  </div>
                  <button
                    className="btn block"
                    onClick={submitCustomClarify}
                    disabled={!customClarifyText.trim()}
                  >
                    用我自己的话继续
                  </button>
                  <button className="btn ghost block" onClick={restartClarify}>
                    从头再选
                  </button>
                </>
              ) : (
                <>
                  <div className="h1" style={{ fontSize: 15, marginTop: 10 }}>
                    {clarifyNode.prompt}
                  </div>
                  {clarifyNode.hint && <p className="sub">{clarifyNode.hint}</p>}
                  {clarifyNoneStreak > 0 && (
                    <p className="sub">
                      已连续「都不是」{clarifyNoneStreak}/3
                      {clarifyNoneStreak >= 2 ? ' · 再选一次将可自填或重来' : ''}
                    </p>
                  )}

                  <div className="option-stack">
                    {optionsWithNone(clarifyNode.options).map((o) => (
                      <button
                        key={o.id}
                        className="btn block option-btn"
                        onClick={() => pickClarifyOption(o.id)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button className="btn ghost block" onClick={backClarify}>
                {clarifyEscape
                  ? '返回上一问'
                  : clarifyAnswers.length
                    ? '上一问'
                    : '返回所求'}
              </button>
            </>
          )}

          {page === 'confirm' && (
            <>
              <div className="h1">确认所问</div>
              {error && (
                <AlertBanner message={error} onDismiss={() => setError('')} />
              )}

              <div className="chip-trail">
                {clarifyAnswers.map((a) => (
                  <span key={a.nodeId} className="chip trail">
                    {a.label}
                  </span>
                ))}
              </div>

              <div className="field">
                <label>将按此问起卦</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                />
              </div>

              {catMeta.needsScope && catMeta.scopePresets && (
                <div className="field">
                  <label>时间范围</label>
                  <div className="row">
                    {catMeta.scopePresets.map((s) => (
                      <button
                        key={s.id}
                        className={`chip ${scope === s.id ? 'active' : ''}`}
                        onClick={() => setScope(s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn block"
                onClick={() => {
                  if (!question.trim()) {
                    setError('请先确认所问文案。')
                    return
                  }
                  setError('')
                  setPage('cast')
                }}
              >
                确认，去起卦
              </button>
              <button
                className="btn ghost block"
                onClick={() => {
                  if (clarifyAnswers.length) {
                    const prev = clarifyAnswers[clarifyAnswers.length - 1]
                    setClarifyAnswers(clarifyAnswers.slice(0, -1))
                    setClarifyNodeId(prev.nodeId)
                  } else {
                    setClarifyNodeId(firstNodeId(category))
                  }
                  setPage('clarify')
                }}
              >
                返回修改选项
              </button>
            </>
          )}

          {page === 'cast' && (
            <>
              <div className="h1">
                {DIVINATION_SCHOOLS.find((s) => s.id === school)?.label} ·{' '}
                {methodLabel(method)}
              </div>
              {error && (
                <AlertBanner message={error} onDismiss={() => setError('')} />
              )}

              <div className="hex-card" style={{ padding: 10 }}>
                <div className="meta" style={{ whiteSpace: 'pre-wrap' }}>
                  {question}
                </div>
              </div>

              {(method === 'geo' || method === 'weather') && (
                <>
                  <div className="field">
                    <label>坐标来源</label>
                    <div className="row">
                      <button
                        className={`chip ${geoMode === 'gps' ? 'active' : ''}`}
                        onClick={() => {
                          setError('')
                          setGeoMode('gps')
                        }}
                      >
                        当前位置
                      </button>
                      <button
                        className={`chip ${geoMode === 'city' ? 'active' : ''}`}
                        onClick={() => {
                          setError('')
                          setGeoMode('city')
                        }}
                      >
                        选择城市
                      </button>
                      <button
                        className={`chip ${geoMode === 'map' ? 'active' : ''}`}
                        onClick={() => {
                          setError('')
                          setGeoMode('map')
                        }}
                      >
                        地图点选
                      </button>
                      <button
                        className={`chip ${geoMode === 'manual' ? 'active' : ''}`}
                        onClick={() => {
                          setError('')
                          setGeoMode('manual')
                        }}
                      >
                        手输经纬
                      </button>
                    </div>
                    {geoMode === 'gps' && (
                      <p className="sub" style={{ marginTop: 8 }}>
                        {gpsProbe.status === 'checking' && '正在检查定位是否可用…'}
                        {gpsProbe.status === 'ok' && '定位可用，可继续起卦。'}
                        {gpsProbe.status === 'fail' &&
                          (gpsProbe.message ||
                            '当前位置不可用，请改用「选择城市」或「地图点选」。')}
                        {gpsProbe.status === 'idle' && '将使用当前位置。'}
                      </p>
                    )}
                  </div>
                  {geoMode === 'city' && (
                    <CityCascade
                      value={cityPick}
                      onChange={(p) => {
                        setError('')
                        setCityPick(p)
                      }}
                    />
                  )}
                  {geoMode === 'map' && (
                    <MapPicker
                      value={mapPick}
                      onChange={(p) => {
                        setError('')
                        setMapPick(p)
                      }}
                    />
                  )}
                  {geoMode === 'manual' && (
                    <div className="field">
                      <label>纬度, 经度</label>
                      <input
                        value={manualCoords}
                        onChange={(e) => {
                          setError('')
                          setManualCoords(e.target.value)
                        }}
                        placeholder="43.2389, 76.8897"
                      />
                    </div>
                  )}
                </>
              )}

              {method === 'number' && (school === 'meihua' || school === 'qimen') && (
                <div className="field">
                  <label>三数</label>
                  <div className="row">
                    <input
                      style={{ width: 72 }}
                      value={num1}
                      onChange={(e) => setNum1(e.target.value)}
                      placeholder="数1"
                      inputMode="numeric"
                    />
                    <input
                      style={{ width: 72 }}
                      value={num2}
                      onChange={(e) => setNum2(e.target.value)}
                      placeholder="数2"
                      inputMode="numeric"
                    />
                    <input
                      style={{ width: 72 }}
                      value={num3}
                      onChange={(e) => setNum3(e.target.value)}
                      placeholder="数3"
                      inputMode="numeric"
                    />
                    <button
                      className="chip"
                      type="button"
                      onClick={() => {
                        const r = () => Math.floor(Math.random() * 99) + 1
                        setNum1(String(r()))
                        setNum2(String(r()))
                        setNum3(String(r()))
                      }}
                    >
                      随机
                    </button>
                  </div>
                </div>
              )}

              {method === 'number' && school === 'liuyao' && (
                <p className="sub">点下一步即可摇钱成卦。</p>
              )}

              {method === 'color' && (
                <div className="field">
                  <label>点选颜色</label>
                  <ColorMatrixPicker value={colorRgb} onChange={setColorRgb} />
                </div>
              )}

              {method === 'random' && (
                <p className="sub">无需手输，点下一步即可。</p>
              )}

              {school === 'qimen' && method === 'time' && (
                <p className="sub">以当前时辰排盘。</p>
              )}

              <div className="field">
                <label>
                  <input
                    type="checkbox"
                    checked={highPrecision}
                    disabled={!settings.apiKey?.trim()}
                    onChange={(e) => setHighPrecision(e.target.checked)}
                  />{' '}
                  高精度追问
                  {!settings.apiKey?.trim() ? '（需 API）' : ''}
                </label>
              </div>

              <button
                className="btn block"
                disabled={
                  busy ||
                  ((method === 'geo' || method === 'weather') &&
                    geoMode === 'gps' &&
                    (gpsProbe.status === 'checking' || gpsProbe.status === 'fail'))
                }
                onClick={() => void startCast()}
              >
                {method === 'time' && '校时起卦'}
                {method === 'geo' && '锁定坐标起卦'}
                {method === 'weather' && '采样气象起卦'}
                {method === 'color' && '颜色起卦'}
                {method === 'random' && '随机起卦'}
                {method === 'number' && school === 'liuyao' && '摇钱起卦'}
                {method === 'number' && school !== 'liuyao' && '三数起卦'}
              </button>
              <button
                className="btn ghost block"
                onClick={() => {
                  setError('')
                  setPage('confirm')
                }}
              >
                返回确认所问
              </button>
            </>
          )}

          {page === 'hold' && (
            <HoldCast
              onComplete={(ms) => void executeCast(ms)}
              onCancel={() => {
                setError('')
                setPage('cast')
              }}
            />
          )}

          {page === 'anim' && (
            <CastAnim
              method={method}
              seed={liveSeed}
              status={animStatus}
              progress={castProgress}
            />
          )}

          {page === 'reveal' && cast && (
            <>
              <div className="h1">成卦</div>
              {error && (
                <AlertBanner message={error} onDismiss={() => setError('')} />
              )}
              <div className="hex-card">
                <div className="symbol">{cast.ben.symbol}</div>
                <div className="name">{cast.ben.name}</div>
                {cast.school === 'liuyao' && cast.liuyao ? (
                  <div className="gua-grid">
                    <span>
                      世 <strong>{cast.liuyao.shi}</strong>
                    </span>
                    <span>
                      应 <strong>{cast.liuyao.ying}</strong>
                    </span>
                    <span>
                      宫 <strong>{cast.liuyao.gong}</strong>
                    </span>
                    <span>
                      变 <strong>{cast.liuyao.bianName}</strong>
                    </span>
                  </div>
                ) : cast.school === 'qimen' && cast.qimen ? (
                  <div className="gua-grid">
                    <span>
                      遁 <strong>{cast.qimen.dun}</strong>
                    </span>
                    <span>
                      局 <strong>{cast.qimen.ju}</strong>
                    </span>
                    <span>
                      时 <strong>{cast.qimen.hourZhi}</strong>
                    </span>
                    <span>
                      值使 <strong>{cast.qimen.zhiShi}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="gua-grid">
                    <span>
                      上 <strong>{cast.ben.upper.name}</strong>
                    </span>
                    <span>
                      下 <strong>{cast.ben.lower.name}</strong>
                    </span>
                    <span>
                      动 <strong>第{cast.changeYao}爻</strong>
                    </span>
                    <span>
                      变 <strong>{cast.bian.name}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="cast-progress">
                <div className="cast-progress-track">
                  <div
                    className="cast-progress-fill"
                    style={{ width: `${revealProgress}%` }}
                  />
                </div>
                <div className="cast-progress-meta">
                  <span>
                    {revealStep + 1}/{(cast.steps || []).length}
                  </span>
                  <span>{revealProgress}%</span>
                </div>
              </div>

              <div className="reveal-current">
                {(cast.steps || [])[revealStep] || '…'}
              </div>
              {busy && <p className="sub">解读中…</p>}
            </>
          )}

          {page === 'result' && cast && (
            <>
              <div className="hex-card">
                <div className="symbol">{cast.ben.symbol}</div>
                <div className="name">{cast.ben.name}</div>
                {cast.school === 'liuyao' && cast.liuyao ? (
                  <>
                    <div className="gua-grid">
                      <span>
                        取数 <strong>{cast.lunarHint}</strong>
                      </span>
                      <span>
                        变 <strong>{cast.liuyao.bianName}</strong>
                      </span>
                    </div>
                    <div className="yao-table">
                      {cast.liuyao.lines
                        .slice()
                        .reverse()
                        .map((l) => (
                          <div key={l.pos} className="yao-row">
                            <span>{l.pos}</span>
                            <span>{l.yang ? '━━' : '━ ━'}</span>
                            <span>{l.moving ? '动' : ''}</span>
                            <span>{l.shiYing}</span>
                            <span>
                              {l.ganZhi}
                              {l.wuXing}
                            </span>
                            <span>{l.liuQin}</span>
                            <span>{l.liuShen}</span>
                          </div>
                        ))}
                    </div>
                  </>
                ) : cast.school === 'qimen' && cast.qimen ? (
                  <>
                    <div className="gua-grid">
                      <span>
                        <strong>{cast.qimen.dun}{cast.qimen.ju}</strong>
                      </span>
                      <span>
                        {cast.qimen.yuan} · 日{cast.qimen.dayGanZhi} · 时
                        {cast.qimen.hourZhi}
                      </span>
                    </div>
                    <div className="qimen-grid">
                      {LUOSHU_VISUAL.map((p) => {
                        const c = cast.qimen!.cells.find((x) => x.palace === p)
                        if (!c) return <div key={p} className="qimen-cell empty" />
                        return (
                          <div key={p} className="qimen-cell">
                            <div className="qimen-p">{c.palace}</div>
                            <div>
                              {c.xing} · {c.men}
                            </div>
                            <div>
                              地{c.di} 天{c.tian}
                            </div>
                            <div>{c.shen}</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="gua-grid">
                    <span>
                      取数 <strong>{cast.lunarHint}</strong>
                    </span>
                    <span>
                      动 <strong>第{cast.changeYao}爻</strong>
                    </span>
                    <span>
                      互 <strong>
                        {cast.hu.symbol}
                        {cast.hu.name}
                      </strong>
                    </span>
                    <span>
                      变 <strong>
                        {cast.bian.symbol}
                        {cast.bian.name}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              {interpret ? (
                <>
                  <div className="boundary-banner">{BOUNDARY_BANNER}</div>
                  <div className="interpret-block">
                    {interpret.verdict && (
                      <div className="interpret-verdict">
                        <div className="verdict-k">断盘</div>
                        <div className="verdict-body">{interpret.verdict}</div>
                      </div>
                    )}
                    <div className="interpret-title">
                      <span>{interpret.title}</span>
                      {interpret.score != null && (
                        <span className="interpret-score">
                          {formatScoreGrade(interpret.score)}
                        </span>
                      )}
                    </div>
                    {interpret.theme && (
                      <div className="daily-theme">今日主题 · {interpret.theme}</div>
                    )}
                    <div className="interpret summary">
                      {interpret.summary || interpret.body.slice(0, 60)}
                    </div>
                    <button
                      type="button"
                      className="btn ghost block"
                      onClick={() => setExpandDetail((v) => !v)}
                    >
                      {expandDetail ? '收起详解' : '展开详解'}
                    </button>
                    {expandDetail && <div className="interpret">{interpret.body}</div>}
                    <div className="advice-strip three">
                      <div>
                        <span className="advice-k">应期</span>
                        {interpret.timing || '观察近一段节奏即可'}
                      </div>
                      <div>
                        <span className="advice-k">宜忌</span>
                        {interpret.advice || (dailyMode ? '今日宜稳中求进' : '宜量力而行')}
                      </div>
                      <div>
                        <span className="advice-k">心态</span>
                        {interpret.mind || '心里有数就好，别把日子过成算命。'}
                      </div>
                    </div>
                    {interpret.dims && (
                      <div className="dim-scores">
                        {(
                          [
                            ['综合', 'overall', interpret.dims.overall],
                            ['爱情', 'love', interpret.dims.love],
                            ['事业', 'career', interpret.dims.career],
                            ['财运', 'wealth', interpret.dims.wealth],
                            ['身体', 'health', interpret.dims.health],
                          ] as const
                        ).map(([label, key, n]) => (
                          <div className="dim-row" key={label}>
                            <span>{label}</span>
                            <div className="dim-bar">
                              <div style={{ width: `${n * 10}%` }} />
                            </div>
                            <strong>{formatScoreGrade(n)}</strong>
                            {interpret.dimHints?.[key] && (
                              <span className="dim-hint">{interpret.dimHints[key]}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {interpret.disclaimer && (
                      <div className="disclaimer">{interpret.disclaimer}</div>
                    )}
                  </div>

                  {interpret.followUps && interpret.followUps.length > 0 && !refined && !dailyMode && (
                    <div className="follow-box">
                      {interpret.followUps.map((q, i) => (
                        <div className="field" key={i}>
                          <label>{q}</label>
                          <input
                            value={followAnswers[i] || ''}
                            onChange={(e) => {
                              const next = [...followAnswers]
                              next[i] = e.target.value
                              setFollowAnswers(next)
                            }}
                          />
                        </div>
                      ))}
                      <button
                        className="btn block"
                        disabled={busy}
                        onClick={() => void submitFollowUps()}
                      >
                        {busy ? '…' : '精炼解读'}
                      </button>
                      <button
                        className="btn ghost block"
                        disabled={busy}
                        onClick={() => setRefined(true)}
                      >
                        跳过
                      </button>
                    </div>
                  )}

                  {(!interpret.followUps?.length || refined) && !dailyMode && (
                    <div className="chat-box">
                      <div className="chat-label">继续追问（仅一问）</div>
                      {chatTurns.map((t, i) => (
                        <div
                          key={i}
                          className={`chat-bubble ${t.role === 'user' ? 'user' : 'bot'}`}
                        >
                          {t.content}
                        </div>
                      ))}

                      {chaseDone && (
                        <p className="sub" style={{ marginTop: 8 }}>
                          追问已结束。同一卦再细问往往越问越虚，宜收心去做一两件实事；若换个问题，请「再起一卦」。
                        </p>
                      )}

                      {!chaseDone && chaseNode && !chaseCustomMode && (
                        <>
                          {chaseNode.hint && <p className="sub">{chaseNode.hint}</p>}
                          <div className="h1" style={{ fontSize: 'var(--fs-body)', marginTop: 8 }}>
                            {chaseNode.prompt}
                          </div>
                          <div className="grid-cats">
                            {optionsWithNone(chaseNode.options).map((o) => (
                              <button
                                key={o.id}
                                className="cat"
                                disabled={busy}
                                onClick={() => void pickChaseOption(o.id)}
                              >
                                <div className="label">{o.label}</div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      {!chaseDone && chaseCustomMode && (
                        <>
                          <p className="sub">选项都不贴切时，用自己的话追问一句（仍仅此一问）。</p>
                          <div className="field">
                            <label>我自己的追问</label>
                            <textarea
                              rows={2}
                              value={chaseCustomText}
                              onChange={(e) => setChaseCustomText(e.target.value)}
                              placeholder="例如：这段感情近一个月我该不该主动联系"
                            />
                          </div>
                          <button
                            className="btn block"
                            disabled={busy || !chaseCustomText.trim()}
                            onClick={() => void submitChaseCustom()}
                          >
                            送出这一问
                          </button>
                          <button
                            className="btn ghost block"
                            disabled={busy}
                            onClick={() => {
                              setChaseCustomMode(false)
                              setChaseCustomText('')
                            }}
                          >
                            返回选项
                          </button>
                        </>
                      )}

                      {busy && <p className="sub">根据选项生成追问…</p>}
                    </div>
                  )}

                  <div className="field" style={{ marginTop: 12 }}>
                    <label>分享模板</label>
                    <div className="row">
                      {SHARE_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          className={`chip ${shareTemplate === t.id ? 'active' : ''}`}
                          onClick={() => {
                            setShareTemplate(t.id)
                            setSharePreview(null)
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <p className="sub" style={{ marginTop: 6 }}>
                      {SHARE_TEMPLATES.find((t) => t.id === shareTemplate)?.hint}
                      {templateIncludesFollowUp(shareTemplate)
                        ? chaseDone || chatTurns.some((t) => t.role === 'assistant')
                          ? ' · 将附上追问解读'
                          : ' · 完成追问后可附解读'
                        : ' · 不含追问'}
                    </p>
                    <button
                      className="btn ghost block"
                      disabled={busy}
                      onClick={() => void refreshSharePreview()}
                    >
                      {busy ? '…' : sharePreview ? '刷新预览' : '生成预览图'}
                    </button>
                    {sharePreview && (
                      <div className="share-preview">
                        <img src={sharePreview} alt="分享预览" />
                      </div>
                    )}
                  </div>

                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn" disabled={busy} onClick={() => void onShare('copy')}>
                      复制卡片
                    </button>
                    <button className="btn ghost" disabled={busy} onClick={() => void onShare('save')}>
                      保存 PNG
                    </button>
                  </div>
                </>
              ) : (
                <div className="alert">{error || '解读未完成'}</div>
              )}

              <button
                className="btn ghost block"
                onClick={() => {
                  beginFreshAsk()
                  setPage('home')
                }}
              >
                再起一卦
              </button>
            </>
          )}

          {page === 'settings' && (
            <>
              <div className="h1">终端设置</div>
              {settingsNote && (
                <div className={settingsNote.ok ? 'settings-note ok' : 'alert'}>
                  <span className="alert-text">{settingsNote.text}</span>
                  <button
                    type="button"
                    className="alert-dismiss"
                    aria-label="关闭提示"
                    style={
                      settingsNote.ok
                        ? { color: 'var(--pb-muted)', borderColor: 'var(--pb-green-dim)' }
                        : undefined
                    }
                    onClick={() => setSettingsNote(null)}
                  >
                    ×
                  </button>
                </div>
              )}
              {error && (
                <AlertBanner message={error} onDismiss={() => setError('')} />
              )}

              <div className="settings-block">
                <div className="field">
                  <label>一键预设</label>
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    {API_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`chip ${
                          settings.baseUrl === p.baseUrl && settings.model === p.model
                            ? 'active'
                            : ''
                        }`}
                        title={`${p.hint} · 需：${p.keyFrom}`}
                        onClick={() => applyApiPreset(p.id)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="sub" style={{ marginTop: 6 }}>
                    {(() => {
                      const hit = API_PRESETS.find(
                        (p) =>
                          p.baseUrl === settings.baseUrl && p.model === settings.model,
                      )
                      if (!hit) return '自定义地址与模型（OpenAI 兼容）'
                      return hit.keyFrom
                    })()}
                  </p>
                </div>
                <div className="field">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => {
                      const apiKey = e.target.value
                      setSettings((s) => ({
                        ...s,
                        apiKey,
                        apiVerified: false,
                        mode: apiKey.trim()
                          ? s.mode === 'local'
                            ? 'full-api'
                            : s.mode
                          : 'local',
                      }))
                      setApiStatus(apiKey.trim() ? 'untested' : 'missing')
                    }}
                    onBlur={(e) => {
                      const apiKey = e.target.value
                      void persistSettings(
                        invalidateApiVerified({
                          apiKey,
                          mode: apiKey.trim()
                            ? settings.mode === 'local'
                              ? 'full-api'
                              : settings.mode
                            : 'local',
                          apiVerified: false,
                        }),
                      )
                    }}
                    placeholder="sk-..."
                  />
                </div>
                <div className="field">
                  <label>Base URL</label>
                  <input
                    value={settings.baseUrl}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        baseUrl: e.target.value,
                        apiVerified: false,
                      }))
                    }
                    onBlur={(e) =>
                      void persistSettings(
                        invalidateApiVerified({
                          baseUrl: e.target.value,
                          apiVerified: false,
                        }),
                      )
                    }
                    placeholder="https://api.deepseek.com"
                  />
                </div>
                <div className="field">
                  <label>模型名</label>
                  <input
                    value={settings.model}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        model: e.target.value,
                        apiVerified: false,
                      }))
                    }
                    onBlur={(e) =>
                      void persistSettings(
                        invalidateApiVerified({
                          model: e.target.value,
                          apiVerified: false,
                        }),
                      )
                    }
                    placeholder="deepseek-chat"
                  />
                </div>
                <div className="field">
                  <label>解读模式</label>
                  <select
                    value={settings.mode}
                    onChange={(e) => {
                      const mode = e.target.value as AppSettings['mode']
                      setSettings((s) => ({ ...s, mode }))
                      void persistSettings({ mode })
                    }}
                  >
                    <option value="local">仅本地</option>
                    {canUseLlm(settings) && (
                      <>
                        <option value="full-api">全 API</option>
                        <option value="local-plus-api">本地起卦 + API 解卦</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="field">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.alwaysOnTop}
                      onChange={(e) => {
                        const alwaysOnTop = e.target.checked
                        setSettings((s) => ({ ...s, alwaysOnTop }))
                        void persistSettings({ alwaysOnTop })
                      }}
                    />{' '}
                    面板置顶
                  </label>
                </div>
                <div className="field">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.hideWelcomeTip}
                      onChange={(e) => {
                        const hideWelcomeTip = e.target.checked
                        setSettings((s) => ({ ...s, hideWelcomeTip }))
                        void persistSettings({ hideWelcomeTip })
                      }}
                    />{' '}
                    下次启动不再显示首次提示
                  </label>
                </div>
              </div>

              <button
                className="btn block"
                onClick={() => {
                  void (async () => {
                    await persistSettings({
                      ...settings,
                      mode: canUseLlm(settings)
                        ? settings.mode === 'local'
                          ? 'full-api'
                          : settings.mode
                        : 'local',
                    })
                    setError('')
                    setSettingsNote({ ok: true, text: '已保存' })
                    setPage('home')
                  })()
                }}
              >
                保存
              </button>
              <button
                className="btn ghost block"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true)
                    setError('')
                    setSettingsNote(null)
                    await persistSettings({
                      ...settings,
                      mode: canUseLlm(settings)
                        ? settings.mode === 'local'
                          ? 'full-api'
                          : settings.mode
                        : 'local',
                    })
                    const r = await testApiConnection(settings)
                    if (r.ok) {
                      await persistSettings({ apiVerified: true })
                      setApiStatus('ok')
                      setSettingsNote({ ok: true, text: r.detail })
                    } else {
                      await persistSettings({ apiVerified: false })
                      setApiStatus(canUseLlm(settings) ? 'failed' : 'missing')
                      setSettingsNote({ ok: false, text: r.detail })
                      void window.suixin?.logError?.(`api-test: ${r.detail}`)
                    }
                    setBusy(false)
                  })()
                }}
              >
                测试 API
              </button>
              <button
                className="btn ghost block"
                onClick={() => {
                  if (!confirm('清空本机历史？')) return
                  void (async () => {
                    const d = await window.suixin?.clearStore?.(false)
                    if (d) {
                      setHistory([])
                      setSettings(d.settings)
                    }
                    setError('')
                    setSettingsNote({ ok: true, text: '已清空历史' })
                  })()
                }}
              >
                清空历史
              </button>
              <button
                className="btn ghost block"
                onClick={() => {
                  if (!confirm('重置设置并清空历史（含 API Key）？不可恢复。')) return
                  void (async () => {
                    const d = await window.suixin?.clearStore?.(true)
                    if (d) {
                      setHistory([])
                      setSettings({ ...defaultSettings, ...d.settings })
                      setApiStatus('missing')
                    }
                    setError('')
                    setSettingsNote({ ok: true, text: '已重置' })
                  })()
                }}
              >
                重置
              </button>
              <button
                className="btn ghost block"
                onClick={() => {
                  setError('')
                  setSettingsNote(null)
                  setPage('home')
                }}
              >
                返回
              </button>
            </>
          )}
        </main>

        <footer className="footer-bar">
          <div className="footer-left">
            <span>STATUS: {busy ? 'BUSY' : 'IDLE'}</span>
            <span
              className={
                apiStatus === 'ok' ? 'footer-api connected' : 'footer-api disconnected'
              }
              title={
                apiStatus === 'ok'
                  ? 'API 已连通（解读模式选「本地」时仍只跑本地）'
                  : apiStatus === 'untested'
                    ? '已配置但未测试'
                    : apiStatus === 'failed'
                      ? '连通失败'
                      : '未配置 API'
              }
            >
              API: {apiStatus === 'ok' ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <span>V{APP_VERSION}</span>
        </footer>
      </div>

      {showWelcome && (
        <div className="welcome-mask" role="dialog" aria-modal="true">
          <div className="welcome-card">
            <div className="h1">欢迎使用随心起卦</div>
            <p className="sub">Pip-Boy 小面板 · 本地起卦 · 你的大模型解读</p>

            <div className="tip-box">
              <div className="tip-title">能做什么</div>
              <ul className="tip-list">
                <li>梅花 / 六爻 / 奇门 · 时间、数字、地理、天气、颜色、随机取数</li>
                <li>今日吉凶（一天一次）· 多维打分</li>
                <li>白话解卦 · 应期 / 宜忌 / 心态 · 选项式追问</li>
                <li>分享卡片（经典 / 简洁 / 海报 / 一句签）</li>
              </ul>
            </div>

            <div className="tip-box">
              <div className="tip-title">如何接入 API</div>
              <ol className="tip-list">
                <li>设置里点一键预设，粘贴对应平台 Key</li>
                <li>无 Key 也可本地起卦</li>
              </ol>
            </div>

            <label className="welcome-check">
              <input
                type="checkbox"
                checked={welcomeDontShow}
                onChange={(e) => setWelcomeDontShow(e.target.checked)}
              />
              <span>下次不再提示</span>
            </label>

            <button className="btn block" onClick={() => void dismissWelcome(true)}>
              去填写 API
            </button>
            <button className="btn ghost block" onClick={() => void dismissWelcome(false)}>
              先逛逛
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
