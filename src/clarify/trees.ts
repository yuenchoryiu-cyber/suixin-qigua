import type { CategoryId } from '../shared/types'

export interface ClarifyOption {
  id: string
  label: string
  /** 写入最终问句的短语 */
  phrase: string
  /** 跳到下一步 id；缺省则按顺序下一步；'__end__' 结束 */
  next?: string
  /** 顺便写入时间范围 id */
  scope?: string
}

/** 「都不是」：提高匹配准确度；连续三次后可自填或重来 */
export const NONE_OPTION_ID = '__none__'
export const NONE_OPTION: ClarifyOption = {
  id: NONE_OPTION_ID,
  label: '都不是',
  phrase: '',
}

export function optionsWithNone(options: ClarifyOption[]): ClarifyOption[] {
  if (options.some((o) => o.id === NONE_OPTION_ID)) return options
  return [...options, NONE_OPTION]
}

export interface ClarifyNode {
  id: string
  prompt: string
  hint?: string
  options: ClarifyOption[]
}

export interface ClarifyAnswer {
  nodeId: string
  optionId: string
  label: string
  phrase: string
  scope?: string
}

const selfTree: ClarifyNode[] = [
  {
    id: 'focus',
    prompt: '你此刻最想弄清的，更偏哪一边？',
    options: [
      { id: 'mind', label: '心态 / 情绪', phrase: '关于自身心态与情绪' },
      { id: 'body', label: '身体 / 作息', phrase: '关于身体与作息' },
      { id: 'path', label: '人生方向', phrase: '关于人生方向与选择' },
      { id: 'habit', label: '习惯 / 改变', phrase: '关于习惯与自我改变' },
    ],
  },
  {
    id: 'feel',
    prompt: '你现在的感觉更接近？',
    options: [
      { id: 'lost', label: '有点迷茫', phrase: '感到迷茫，想找个方向' },
      { id: 'heavy', label: '压力偏大', phrase: '压力较大，想看如何疏解' },
      { id: 'hope', label: '有期待', phrase: '怀有期待，想看是否顺遂' },
      { id: 'stuck', label: '卡住了', phrase: '感觉卡住，想看如何突破' },
    ],
  },
  {
    id: 'when',
    prompt: '你更想看哪段时间？',
    options: [
      { id: 'now', label: '当下几天', phrase: '侧重当下', scope: 'now' },
      { id: 'month', label: '近一个月', phrase: '侧重近一个月', scope: 'month' },
      { id: 'year', label: '这一年', phrase: '侧重本年', scope: 'year' },
      { id: '3y', label: '两三年内', phrase: '侧重两三年内', scope: '3y' },
    ],
  },
  {
    id: 'ask',
    prompt: '你更想得到哪类提醒？',
    options: [
      { id: 'do', label: '我该做点什么', phrase: '想知道眼下宜做什么' },
      { id: 'avoid', label: '我该避开什么', phrase: '想知道宜避开什么' },
      { id: 'trend', label: '大致走势如何', phrase: '想了解整体走势' },
      { id: 'heart', label: '怎么安顿自己', phrase: '想知道如何安顿内心' },
    ],
  },
]

const loveTree: ClarifyNode[] = [
  {
    id: 'stage',
    prompt: '这段感情，更接近哪种状态？',
    hint: '不必说名字，心里有人即可。',
    options: [
      { id: 'crush', label: '暗恋 / 萌芽', phrase: '关于一段萌芽中的心意' },
      { id: 'dating', label: '在一起', phrase: '关于正在经营的感情' },
      { id: 'gap', label: '冷战 / 疏远', phrase: '关于出现疏远的感情' },
      { id: 'ex', label: '旧情 / 复合犹豫', phrase: '关于旧情与是否放下' },
      { id: 'single', label: '单身想遇', phrase: '关于感情缘分与遇见' },
    ],
  },
  {
    id: 'worry',
    prompt: '你最在意的是？',
    options: [
      { id: 'will', label: '对方心意', phrase: '想弄清对方心意如何' },
      { id: 'future', label: '能不能长久', phrase: '想看这段关系能否长久' },
      { id: 'say', label: '要不要表白/摊牌', phrase: '想看是否适合表明心意' },
      { id: 'heal', label: '如何相处疗愈', phrase: '想看如何更好相处或疗愈' },
      { id: 'go', label: '该不该放手', phrase: '想看是否该放手' },
    ],
  },
  {
    id: 'feel',
    prompt: '你此刻的情绪更像？',
    options: [
      { id: 'anxious', label: '忐忑', phrase: '心里忐忑' },
      { id: 'sad', label: '难过', phrase: '心里难过' },
      { id: 'hope', label: '期待', phrase: '心里期待' },
      { id: 'tired', label: '疲惫', phrase: '心里有些疲惫' },
    ],
  },
  {
    id: 'when',
    prompt: '更想看哪段时间的走向？',
    options: [
      { id: 'now', label: '最近', phrase: '侧重近期', scope: 'now' },
      { id: 'month', label: '一两个月', phrase: '侧重近月', scope: 'month' },
      { id: 'year', label: '这一年', phrase: '侧重本年', scope: 'year' },
      { id: '3y', label: '更长远', phrase: '侧重长远两三年', scope: '3y' },
    ],
  },
]

const careerTree: ClarifyNode[] = [
  {
    id: 'state',
    prompt: '工作上，你现在更像？',
    options: [
      { id: 'stable', label: '在职求稳', phrase: '关于在职发展' },
      { id: 'change', label: '想跳槽/转行', phrase: '关于跳槽或转行' },
      { id: 'start', label: '求职/面试', phrase: '关于求职机遇' },
      { id: 'biz', label: '创业/副业', phrase: '关于创业或副业' },
    ],
  },
  {
    id: 'ask',
    prompt: '最想问清楚的是？',
    options: [
      { id: 'up', label: '晋升 / 机会', phrase: '想看晋升与机会' },
      { id: 'people', label: '同事 / 上司关系', phrase: '想看职场人际关系' },
      { id: 'choice', label: '两个选择怎么定', phrase: '想在两个方向间做取舍' },
      { id: 'burn', label: '累了怎么办', phrase: '想看如何应对倦怠' },
    ],
  },
  {
    id: 'risk',
    prompt: '你更能接受哪种节奏？',
    options: [
      { id: 'safe', label: '稳一点', phrase: '倾向稳健' },
      { id: 'mid', label: '稳中求进', phrase: '倾向稳中求进' },
      { id: 'bold', label: '敢冲一把', phrase: '倾向更进取' },
    ],
  },
  {
    id: 'when',
    prompt: '时间范围？',
    options: [
      { id: 'month', label: '本月', phrase: '看本月', scope: 'month' },
      { id: 'quarter', label: '本季', phrase: '看本季', scope: 'quarter' },
      { id: 'year', label: '本年', phrase: '看本年', scope: 'year' },
      { id: '3y', label: '三年内', phrase: '看三年内', scope: '3y' },
    ],
  },
]

const wealthTree: ClarifyNode[] = [
  {
    id: 'type',
    prompt: '财运上你更关心？',
    options: [
      { id: 'income', label: '进账 / 收入', phrase: '关于收入进账' },
      { id: 'spend', label: '开销 / 漏财', phrase: '关于开销与守财' },
      { id: 'invest', label: '投资 / 理财', phrase: '关于投资理财' },
      { id: 'debt', label: '债务 / 回款', phrase: '关于债务或回款' },
    ],
  },
  {
    id: 'feel',
    prompt: '你现在的状态？',
    options: [
      { id: 'tight', label: '手头紧', phrase: '手头偏紧' },
      { id: 'ok', label: '还过得去', phrase: '尚可维持' },
      { id: 'chance', label: '好像有机会', phrase: '感觉有机会但不确定' },
      { id: 'fear', label: '怕踩坑', phrase: '担心踩坑' },
    ],
  },
  {
    id: 'ask',
    prompt: '你更想知道？',
    options: [
      { id: 'timing', label: '什么时候宜动', phrase: '想看何时宜行动' },
      { id: 'hold', label: '先观望行不行', phrase: '想看是否宜先观望' },
      { id: 'way', label: '从哪方面努力', phrase: '想看宜从何处着力' },
    ],
  },
  {
    id: 'when',
    prompt: '时间范围？',
    options: [
      { id: 'month', label: '本月', phrase: '看本月', scope: 'month' },
      { id: 'year', label: '本年', phrase: '看本年', scope: 'year' },
      { id: '3y', label: '三年内', phrase: '看三年内', scope: '3y' },
    ],
  },
]

const yearTree: ClarifyNode[] = [
  {
    id: 'lens',
    prompt: '流年你最想看哪一块？',
    options: [
      { id: 'overall', label: '整体运势', phrase: '关于流年整体运势' },
      { id: 'love', label: '感情线', phrase: '关于流年感情' },
      { id: 'work', label: '事业线', phrase: '关于流年事业' },
      { id: 'money', label: '财运线', phrase: '关于流年财运' },
      { id: 'health', label: '身心状态', phrase: '关于流年身心' },
    ],
  },
  {
    id: 'tone',
    prompt: '你更想听哪种提醒？',
    options: [
      { id: 'chance', label: '机会在哪', phrase: '想看机会落点' },
      { id: 'caution', label: '哪里要小心', phrase: '想看需要小心之处' },
      { id: 'pace', label: '节奏怎么走', phrase: '想看宜如何把握节奏' },
    ],
  },
  {
    id: 'when',
    prompt: '范围？',
    options: [
      { id: 'year', label: '本年', phrase: '看本年', scope: 'year' },
      { id: '3y', label: '三年内', phrase: '看三年内', scope: '3y' },
    ],
  },
]

const lostTree: ClarifyNode[] = [
  {
    id: 'what',
    prompt: '丢的大概是哪类？',
    hint: '心里想着那件东西即可，不必写细。',
    options: [
      { id: 'key', label: '钥匙 / 证件', phrase: '寻物：钥匙或证件一类' },
      { id: 'phone', label: '电子设备', phrase: '寻物：电子设备' },
      { id: 'bag', label: '包 / 衣物', phrase: '寻物：包或衣物' },
      { id: 'other', label: '其他小物', phrase: '寻物：一件小物' },
      { id: 'pet', label: '宠物 / 重要之物', phrase: '寻物：极在意之物' },
    ],
  },
  {
    id: 'where',
    prompt: '你觉得更可能在？',
    options: [
      { id: 'home', label: '家里', phrase: '偏向家中' },
      { id: 'out', label: '外面 / 路上', phrase: '偏向户外或路上' },
      { id: 'work', label: '单位 / 学校', phrase: '偏向单位或学校' },
      { id: 'dunno', label: '完全没头绪', phrase: '暂时没有头绪' },
    ],
  },
  {
    id: 'ask',
    prompt: '你最想得到的提示？',
    options: [
      { id: 'dir', label: '大概方位', phrase: '想看大致方位线索' },
      { id: 'when', label: '何时能找到', phrase: '想看何时较易寻回' },
      { id: 'how', label: '该怎么找', phrase: '想看如何寻找更有效' },
      { id: 'gone', label: '是否难找回', phrase: '想看是否仍有希望寻回' },
    ],
  },
]

const otherTree: ClarifyNode[] = [
  {
    id: 'domain',
    prompt: '这事主要关于？',
    options: [
      { id: 'people', label: '人与关系', phrase: '关于人际与关系' },
      { id: 'choice', label: '选择与决定', phrase: '关于一个选择决定' },
      { id: 'event', label: '某件具体事', phrase: '关于一件具体事' },
      { id: 'travel', label: '出行 / 搬迁', phrase: '关于出行或搬迁' },
      { id: 'study', label: '学业 / 考试', phrase: '关于学业或考试' },
    ],
  },
  {
    id: 'stance',
    prompt: '你现在站在？',
    options: [
      { id: 'before', label: '还没开始，在犹豫', phrase: '尚未行动、正在犹豫' },
      { id: 'mid', label: '已经在过程中', phrase: '已在过程之中' },
      { id: 'after', label: '结果将出 / 刚结束', phrase: '结果将出或刚告一段落' },
    ],
  },
  {
    id: 'need',
    prompt: '你更想知道？',
    options: [
      { id: 'yesno', label: '成不成 / 行不行', phrase: '想看成局是否顺利' },
      { id: 'how', label: '怎么做更好', phrase: '想看怎样做更稳妥' },
      { id: 'time', label: '时机对不对', phrase: '想看时机是否合宜' },
      { id: 'risk', label: '风险在哪', phrase: '想看主要风险' },
    ],
  },
  {
    id: 'when',
    prompt: '时间范围？',
    options: [
      { id: 'now', label: '当下', phrase: '看当下', scope: 'now' },
      { id: 'year', label: '本年', phrase: '看本年', scope: 'year' },
      { id: '3y', label: '三年内', phrase: '看三年内', scope: '3y' },
    ],
  },
]

export const CLARIFY_TREES: Record<CategoryId, ClarifyNode[]> = {
  self: selfTree,
  love: loveTree,
  career: careerTree,
  wealth: wealthTree,
  year: yearTree,
  lost: lostTree,
  other: otherTree,
}

export function getNode(tree: ClarifyNode[], id: string): ClarifyNode | undefined {
  return tree.find((n) => n.id === id)
}

export function firstNodeId(category: CategoryId): string {
  return CLARIFY_TREES[category][0]?.id ?? 'focus'
}

export function composeQuestion(
  categoryLabel: string,
  answers: ClarifyAnswer[],
): string {
  const phrases = answers.map((a) => a.phrase).filter(Boolean)
  if (!phrases.length) return `关于「${categoryLabel}」，心中所念之事`
  return `关于「${categoryLabel}」：${phrases.join('，')}。请据此指点。`
}

/** 用户三次都选「都不是」后，用自填话术成问 */
export function composeCustomQuestion(
  categoryLabel: string,
  customText: string,
): string {
  const t = customText.trim()
  if (!t) return `关于「${categoryLabel}」，心中所念之事`
  return `关于「${categoryLabel}」：${t}。请据此指点。`
}

export function scopeFromAnswers(answers: ClarifyAnswer[]): string | undefined {
  for (let i = answers.length - 1; i >= 0; i--) {
    if (answers[i].scope) return answers[i].scope
  }
  return undefined
}

export function nextNodeId(
  tree: ClarifyNode[],
  currentId: string,
  option: ClarifyOption,
): string | null {
  if (option.next === '__end__') return null
  if (option.next) return option.next
  const idx = tree.findIndex((n) => n.id === currentId)
  if (idx < 0 || idx >= tree.length - 1) return null
  return tree[idx + 1].id
}
