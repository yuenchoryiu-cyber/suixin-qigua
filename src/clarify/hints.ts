import type { CategoryId } from '../shared/types'

/** 「都不是」三次后自填提示 */
export const CLARIFY_CUSTOM_HINTS: Record<CategoryId, string> = {
  self: '例如：最近总睡不着，想看近两周心态怎么安顿',
  love: '例如：犹豫要不要跟对方把话说开，想看近一个月宜不宜',
  career: '例如：在考虑跳槽，想看本季动还是再等等',
  wealth: '例如：有一笔投入拿不定，想看年内宜守还是宜进',
  year: '例如：今年想把身体和作息稳住，其余顺其自然',
  lost: '例如：钥匙可能落在家里或车上，想看优先哪边找',
  other: '例如：用一两句写清你真正卡住的那件事',
}
