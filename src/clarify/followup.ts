import type { CategoryId } from '../shared/types'
import type { ClarifyAnswer, ClarifyNode, ClarifyOption } from './trees'
import { getNode } from './trees'

/** 解卦后追问：每卦仅一道选择题，答完即止 */
const selfFollow: ClarifyNode[] = [
  {
    id: 'dig',
    prompt: '读完这卦，你还想弄清哪一点？',
    hint: '仅此一问；答完即止，再细问往往越问越虚。',
    options: [
      { id: 'do', label: '眼下具体怎么做', phrase: '想要更具体的行动建议' },
      { id: 'time', label: '应期再细一点', phrase: '想把应期说得更清楚' },
      { id: 'risk', label: '容易踩的坑', phrase: '想知道容易踩的坑' },
      { id: 'heart', label: '心态怎么摆', phrase: '想知道心态该怎么摆' },
    ],
  },
]

const loveFollow: ClarifyNode[] = [
  {
    id: 'dig',
    prompt: '感情上，你还想盯哪一点？',
    hint: '仅此一问；答完即止。',
    options: [
      { id: 'act', label: '我该主动吗', phrase: '想确认该不该主动' },
      { id: 'wait', label: '再等等行不行', phrase: '想确认是否宜再等等' },
      { id: 'say', label: '怎么开口更稳', phrase: '想知道怎么开口更稳' },
      { id: 'boundary', label: '边界怎么守', phrase: '想知道如何守边界' },
    ],
  },
]

const careerFollow: ClarifyNode[] = [
  {
    id: 'dig',
    prompt: '事业上还想挖哪块？',
    hint: '仅此一问；答完即止。',
    options: [
      { id: 'move', label: '现在动还是不动', phrase: '想确认现在宜动还是宜守' },
      { id: 'people', label: '人和关系怎么处理', phrase: '想知道职场关系怎么处理' },
      { id: 'offer', label: '机会怎么抓', phrase: '想知道机会怎么抓' },
      { id: 'quit', label: '要不要收手/换轨', phrase: '想确认是否该换轨或收手' },
    ],
  },
]

const wealthFollow: ClarifyNode[] = [
  {
    id: 'dig',
    prompt: '财运上还想问清？',
    hint: '仅此一问；答完即止。',
    options: [
      { id: 'in', label: '钱从哪边来', phrase: '想看进账从哪边更顺' },
      { id: 'out', label: '哪里容易漏', phrase: '想看哪里容易漏财' },
      { id: 'hold', label: '现在该不该出手', phrase: '想确认现在该不该出手' },
      { id: 'wait', label: '先按兵不动行吗', phrase: '想确认是否宜先观望' },
    ],
  },
]

const yearFollow: ClarifyNode[] = [
  {
    id: 'dig',
    prompt: '流年还想聚焦？',
    hint: '仅此一问；答完即止。',
    options: [
      { id: 'peak', label: '哪段更好过', phrase: '想看哪段时期更好过' },
      { id: 'low', label: '哪段要小心', phrase: '想看哪段要格外小心' },
      { id: 'theme', label: '今年主旋律', phrase: '想把今年主旋律说透' },
      { id: 'one', label: '只盯一件事', phrase: '想把一件关键事说透' },
    ],
  },
]

const lostFollow: ClarifyNode[] = [
  {
    id: 'dig',
    prompt: '寻物还想补哪一层？',
    hint: '仅此一问；答完即止。',
    options: [
      { id: 'where', label: '方位再具体', phrase: '想把方位线索再具体' },
      { id: 'when', label: '什么时候找更准', phrase: '想看何时寻找更有效' },
      { id: 'how', label: '怎么找步骤', phrase: '想要寻找步骤' },
      { id: 'hope', label: '还有没有希望', phrase: '想确认是否仍有希望' },
    ],
  },
]

const otherFollow: ClarifyNode[] = [
  {
    id: 'dig',
    prompt: '读完后，你还卡在？',
    hint: '仅此一问；答完即止。',
    options: [
      { id: 'yesno', label: '到底行不行', phrase: '想要更明确的行或不行' },
      { id: 'how', label: '怎么做更稳', phrase: '想要更稳妥的做法' },
      { id: 'when', label: '时机对不对', phrase: '想再确认时机' },
      { id: 'risk', label: '最大风险是啥', phrase: '想点明最大风险' },
    ],
  },
]

export const FOLLOWUP_TREES: Record<CategoryId, ClarifyNode[]> = {
  self: selfFollow,
  love: loveFollow,
  career: careerFollow,
  wealth: wealthFollow,
  year: yearFollow,
  lost: lostFollow,
  other: otherFollow,
}

export function followFirstId(category: CategoryId): string {
  return FOLLOWUP_TREES[category][0]?.id ?? 'dig'
}

export function composeFollowUp(
  categoryLabel: string,
  answers: ClarifyAnswer[],
): string {
  const phrases = answers.map((a) => a.phrase).filter(Boolean)
  if (!phrases.length) return `关于「${categoryLabel}」的解读，想再追问一层。`
  return `基于刚才的卦解，继续追问（仅此一问）：${phrases.join('；')}。请结合原盘简短作答，勿鼓励继续细问。`
}

export function pickFollowOption(
  category: CategoryId,
  nodeId: string,
  option: ClarifyOption,
  prev: ClarifyAnswer[],
): {
  answers: ClarifyAnswer[]
  nextId: string | null
  done: boolean
} {
  const tree = FOLLOWUP_TREES[category]
  const node = getNode(tree, nodeId)
  if (!node) {
    return { answers: prev, nextId: null, done: true }
  }
  const answer: ClarifyAnswer = {
    nodeId: node.id,
    optionId: option.id,
    label: option.label,
    phrase: option.phrase,
    scope: option.scope,
  }
  const answers = [...prev.filter((a) => a.nodeId !== node.id), answer]
  return { answers, nextId: null, done: true }
}
