/** 易经系辞 / 卦辞中与吉凶悔吝相关的经典句（开始页随机） */
export const YIJING_JIXIONG_QUOTES: { source: string; text: string }[] = [
  { source: '系辞上', text: '吉凶悔吝者，生乎动者也。' },
  { source: '系辞上', text: '是故吉凶者，失得之象也；悔吝者，忧虞之象也。' },
  { source: '系辞上', text: '辨吉凶者存乎辞，忧悔吝者存乎介。' },
  { source: '系辞上', text: '八卦定吉凶，吉凶生大业。' },
  { source: '系辞上', text: '吉凶与民同患。' },
  { source: '系辞上', text: '探赜索隐，钩深致远，以定天下之吉凶。' },
  { source: '系辞下', text: '吉凶悔吝生乎动。' },
  { source: '系辞下', text: '惧以终始，其要无咎，此之谓易之道也。' },
  { source: '系辞下', text: '易之兴也，其于中古乎？作易者，其有忧患乎？' },
  { source: '乾·文言', text: '元者善之长也，亨者嘉之会也，利者义之和也，贞者事之干也。' },
  { source: '坤', text: '积善之家，必有余庆；积不善之家，必有余殃。' },
  { source: '否', text: '否之匪人，不利君子贞，大往小来。' },
  { source: '泰', text: '小往大来，吉亨。' },
  { source: '谦', text: '谦亨，君子有终。' },
  { source: '复', text: '出入无疾，朋来无咎。反复其道，七日来复。' },
  { source: '无妄', text: '其匪正有眚，不利有攸往。' },
  { source: '大过', text: '栋桡，利有攸往，亨。' },
  { source: '坎', text: '习坎，有孚，维心亨，行有尚。' },
  { source: '离', text: '利贞，亨。畜牝牛，吉。' },
  { source: '蹇', text: '利西南，不利东北；利见大人，贞吉。' },
  { source: '解', text: '利西南，无所往，其来复吉；有攸往，夙吉。' },
  { source: '损', text: '有孚，元吉，无咎，可贞，利有攸往。' },
  { source: '益', text: '利有攸往，利涉大川。' },
  { source: '困', text: '亨，贞，大人吉，无咎。有言不信。' },
  { source: '革', text: '己日乃孚。元亨利贞。悔亡。' },
  { source: '鼎', text: '元吉，亨。' },
  { source: '震', text: '震来虩虩，笑言哑哑；震惊百里，不丧匕鬯。' },
  { source: '艮', text: '艮其背，不获其身；行其庭，不见其人，无咎。' },
  { source: '渐', text: '女归吉，利贞。' },
  { source: '归妹', text: '征凶，无攸利。' },
  { source: '丰', text: '亨，王假之，勿忧，宜日中。' },
  { source: '旅', text: '小亨，旅贞吉。' },
  { source: '巽', text: '小亨，利有攸往，利见大人。' },
  { source: '兑', text: '亨，利贞。' },
  { source: '涣', text: '亨。王假有庙，利涉大川，利贞。' },
  { source: '节', text: '亨。苦节不可贞。' },
  { source: '中孚', text: '豚鱼吉，利涉大川，利贞。' },
  { source: '小过', text: '亨，利贞，可小事，不可大事。' },
  { source: '既济', text: '亨，小利贞，初吉终乱。' },
  { source: '未济', text: '亨，小狐汔济，濡其尾，无攸利。' },
  { source: '说卦', text: '和顺于道德而理于义，穷理尽性以至于命。' },
  { source: '序卦', text: '有天地，然后万物生焉。盈天地之间者唯万物。' },
]

export function pickRandomYijingQuote(
  excludeText?: string,
): { source: string; text: string } {
  const pool = excludeText
    ? YIJING_JIXIONG_QUOTES.filter((q) => q.text !== excludeText)
    : YIJING_JIXIONG_QUOTES
  const list = pool.length ? pool : YIJING_JIXIONG_QUOTES
  return list[Math.floor(Math.random() * list.length)]!
}

/** 与 package.json version 同步展示用 */
export const APP_VERSION = '2.2.1'
export const APP_NAME = '随心起卦'
