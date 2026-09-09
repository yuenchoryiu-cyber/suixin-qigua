import type { HexagramInfo, Trigram } from '../shared/types'

/** 先天八卦数；binary 自下而上，1阳0阴 */
export const TRIGRAMS: Record<number, Trigram> = {
  1: { name: '乾', nature: '天', number: 1, binary: '111' },
  2: { name: '兑', nature: '泽', number: 2, binary: '011' },
  3: { name: '离', nature: '火', number: 3, binary: '101' },
  4: { name: '震', nature: '雷', number: 4, binary: '001' },
  5: { name: '巽', nature: '风', number: 5, binary: '110' },
  6: { name: '坎', nature: '水', number: 6, binary: '010' },
  7: { name: '艮', nature: '山', number: 7, binary: '100' },
  8: { name: '坤', nature: '地', number: 8, binary: '000' },
}

export function mod8(n: number): number {
  const r = ((n % 8) + 8) % 8
  return r === 0 ? 8 : r
}

export function mod6(n: number): number {
  const r = ((n % 6) + 6) % 6
  return r === 0 ? 6 : r
}

/** key = `${下卦先天数}-${上卦先天数}` */
const PAIR: Record<string, { number: number; name: string; judgment: string }> = {
  '1-1': { number: 1, name: '乾为天', judgment: '元亨利贞。天行健，君子以自强不息。' },
  '8-8': { number: 2, name: '坤为地', judgment: '元亨，利牝马之贞。厚德载物，静以成事。' },
  '4-6': { number: 3, name: '水雷屯', judgment: '元亨利贞。勿用有攸往，利建侯。始生而难，宜守正。' },
  '6-7': { number: 4, name: '山水蒙', judgment: '亨。匪我求童蒙，童蒙求我。启蒙待时，勿躁进。' },
  '1-6': { number: 5, name: '水天需', judgment: '有孚，光亨，贞吉。饮食宴乐，待而后发。' },
  '6-1': { number: 6, name: '天水讼', judgment: '有孚窒惕，中吉，终凶。慎争止讼，和为贵。' },
  '6-8': { number: 7, name: '地水师', judgment: '贞，丈人吉，无咎。众志成城，师出以律。' },
  '8-6': { number: 8, name: '水地比', judgment: '吉。原筮元永贞，无咎。亲比得助，择善而从。' },
  '1-5': { number: 9, name: '风天小畜', judgment: '亨。密云不雨，自我西郊。积小成大，且待风起。' },
  '2-1': { number: 10, name: '天泽履', judgment: '履虎尾，不咥人，亨。慎行知礼，险中亦安。' },
  '1-8': { number: 11, name: '地天泰', judgment: '小往大来，吉亨。上下交通，否极将泰。' },
  '8-1': { number: 12, name: '天地否', judgment: '否之匪人，不利君子贞。闭塞之时，守静待通。' },
  '3-1': { number: 13, name: '天火同人', judgment: '同人于野，亨。志同道合，光明可期。' },
  '1-3': { number: 14, name: '火天大有', judgment: '元亨。富有盛大，宜谦而守成。' },
  '7-8': { number: 15, name: '地山谦', judgment: '亨，君子有终。谦受益，满招损。' },
  '8-4': { number: 16, name: '雷地豫', judgment: '利建侯行师。乐以天下，顺势而动。' },
  '4-2': { number: 17, name: '泽雷随', judgment: '元亨利贞，无咎。随时而变，从善如流。' },
  '5-7': { number: 18, name: '山风蛊', judgment: '元亨，利涉大川。振疲起衰，先甲后甲。' },
  '2-8': { number: 19, name: '地泽临', judgment: '元亨利贞。至于八月有凶。临下以德，勿过满。' },
  '8-5': { number: 20, name: '风地观', judgment: '盥而不荐，有孚颙若。观己观人，心诚则明。' },
  '4-3': { number: 21, name: '火雷噬嗑', judgment: '亨。利用狱。刚柔相噬，事可决断。' },
  '3-7': { number: 22, name: '山火贲', judgment: '亨。小利有攸往。文饰其质，宜朴勿华。' },
  '8-7': { number: 23, name: '山地剥', judgment: '不利有攸往。剥极将复，宜守根固本。' },
  '4-8': { number: 24, name: '地雷复', judgment: '亨。出入无疾，朋来无咎。一阳来复，转机将至。' },
  '4-1': { number: 25, name: '天雷无妄', judgment: '元亨利贞。其匪正有眚。诚实无妄，妄动则灾。' },
  '1-7': { number: 26, name: '山天大畜', judgment: '利贞。不家食吉，利涉大川。蓄德待时，厚积薄发。' },
  '4-7': { number: 27, name: '山雷颐', judgment: '贞吉。观颐，自求口实。慎言语，节饮食。' },
  '5-2': { number: 28, name: '泽风大过', judgment: '栋桡，利有攸往，亨。非常之时，刚柔相济。' },
  '6-6': { number: 29, name: '坎为水', judgment: '有孚，维心亨，行有尚。习坎不止，心诚可出险。' },
  '3-3': { number: 30, name: '离为火', judgment: '利贞，亨。畜牝牛，吉。附丽光明，中正而明。' },
  '7-2': { number: 31, name: '泽山咸', judgment: '亨，利贞，取女吉。感应以诚，情通则吉。' },
  '5-4': { number: 32, name: '雷风恒', judgment: '亨，无咎，利贞。恒久其道，久于其业。' },
  '7-1': { number: 33, name: '天山遁', judgment: '亨，小利贞。退避保身，以退为进。' },
  '1-4': { number: 34, name: '雷天大壮', judgment: '利贞。刚壮勿用壮，正大光明。' },
  '8-3': { number: 35, name: '火地晋', judgment: '康侯用锡马蕃庶。明出地上，进取有光。' },
  '3-8': { number: 36, name: '地火明夷', judgment: '利艰贞。明入地中，晦而守正。' },
  '3-5': { number: 37, name: '风火家人', judgment: '利女贞。家和万事兴，言有物而行有恒。' },
  '2-3': { number: 38, name: '火泽睽', judgment: '小事吉。异中求同，暂睽终合。' },
  '7-6': { number: 39, name: '水山蹇', judgment: '利西南，不利东北。见险而止，反身修德。' },
  '6-4': { number: 40, name: '雷水解', judgment: '利西南。无所往，其来复吉。患难将解，宜赦过宥罪。' },
  '2-7': { number: 41, name: '山泽损', judgment: '有孚，元吉，无咎。损下益上，损己利人。' },
  '4-5': { number: 42, name: '风雷益', judgment: '利有攸往，利涉大川。损上益下，迁善改过。' },
  '1-2': { number: 43, name: '泽天夬', judgment: '扬于王庭。孚号有厉。决而能和，刚而不暴。' },
  '5-1': { number: 44, name: '天风姤', judgment: '女壮，勿用取女。邂逅相遇，慎始防微。' },
  '8-2': { number: 45, name: '泽地萃', judgment: '亨。王假有庙。聚众以诚，利见大人。' },
  '5-8': { number: 46, name: '地风升', judgment: '元亨。用见大人，勿恤。积小升高，顺势而上。' },
  '6-2': { number: 47, name: '泽水困', judgment: '亨，贞，大人吉，无咎。困而不失其所亨。' },
  '5-6': { number: 48, name: '水风井', judgment: '改邑不改井。无丧无得。井养不穷，修德养人。' },
  '3-2': { number: 49, name: '泽火革', judgment: '己日乃孚。元亨利贞。变革顺天，应人以时。' },
  '5-3': { number: 50, name: '火风鼎', judgment: '元吉，亨。鼎新革故，养贤立命。' },
  '4-4': { number: 51, name: '震为雷', judgment: '亨。震来虩虩，笑言哑哑。惧以终始，其道光明。' },
  '7-7': { number: 52, name: '艮为山', judgment: '艮其背，不获其身。止于至善，动静以时。' },
  '7-5': { number: 53, name: '风山渐', judgment: '女归吉，利贞。循序渐进，不可躐等。' },
  '2-4': { number: 54, name: '雷泽归妹', judgment: '征凶，无攸利。名分未正，宜慎其始。' },
  '3-4': { number: 55, name: '雷火丰', judgment: '亨。王假之。日中则昃，宜持盈戒满。' },
  '7-3': { number: 56, name: '火山旅', judgment: '小亨，旅贞吉。羁旅在外，柔顺中正。' },
  '5-5': { number: 57, name: '巽为风', judgment: '小亨。利有攸往，利见大人。申命行事，柔而能入。' },
  '2-2': { number: 58, name: '兑为泽', judgment: '亨，利贞。朋友讲习，和悦以亨。' },
  '6-5': { number: 59, name: '风水涣', judgment: '亨。王假有庙。涣散可聚，散财得民。' },
  '2-6': { number: 60, name: '水泽节', judgment: '亨。苦节不可贞。制度合宜，过则伤。' },
  '2-5': { number: 61, name: '风泽中孚', judgment: '豚鱼吉，利涉大川。诚信感物，中心实而外虚。' },
  '7-4': { number: 62, name: '雷山小过', judgment: '亨，利贞。可小事，不可大事。行过乎恭，丧过乎哀。' },
  '3-6': { number: 63, name: '水火既济', judgment: '亨，小利贞。初吉终乱。事成当慎，防其既济。' },
  '6-3': { number: 64, name: '火水未济', judgment: '亨。小狐汔济，濡其尾。未济之中，仍有可为。' },
}

const SYMBOLS =
  '䷀䷁䷂䷃䷄䷅䷆䷇䷈䷉䷊䷋䷌䷍䷎䷏䷐䷑䷒䷓䷔䷕䷖䷗䷘䷙䷚䷛䷜䷝䷞䷟䷠䷡䷢䷣䷤䷥䷦䷧䷨䷩䷪䷫䷬䷭䷮䷯䷰䷱䷲䷳䷴䷵䷶䷷䷸䷹䷺䷻䷼䷽䷾䷿'

/** 六十四卦名录（按周易序），供开始页点图换卦等 */
export function listHexagramCatalog(): { number: number; name: string; symbol: string }[] {
  const byNum = new Map<number, string>()
  for (const meta of Object.values(PAIR)) {
    byNum.set(meta.number, meta.name)
  }
  return Array.from({ length: 64 }, (_, i) => {
    const number = i + 1
    return {
      number,
      name: byNum.get(number) || `第${number}卦`,
      symbol: SYMBOLS[i] ?? '䷀',
    }
  })
}

function binaryToTrigramNum(bits: string): number {
  for (const t of Object.values(TRIGRAMS)) {
    if (t.binary === bits) return t.number
  }
  return 8
}

export function getHexagram(lowerNum: number, upperNum: number): HexagramInfo {
  const lower = TRIGRAMS[mod8(lowerNum)]
  const upper = TRIGRAMS[mod8(upperNum)]
  const meta = PAIR[`${lower.number}-${upper.number}`]
  if (!meta) {
    return {
      number: 0,
      name: `${upper.name}上${lower.name}下`,
      symbol: '䷀',
      upper,
      lower,
      judgment: '卦象待考，且以体用观之。',
    }
  }
  return {
    number: meta.number,
    name: meta.name,
    symbol: SYMBOLS[meta.number - 1] ?? '䷀',
    upper,
    lower,
    judgment: meta.judgment,
  }
}

export function mutualHexagram(ben: HexagramInfo): HexagramInfo {
  const bits = (ben.lower.binary + ben.upper.binary).split('')
  const lowerBits = bits[1] + bits[2] + bits[3]
  const upperBits = bits[2] + bits[3] + bits[4]
  return getHexagram(binaryToTrigramNum(lowerBits), binaryToTrigramNum(upperBits))
}

export function changeHexagram(ben: HexagramInfo, changeYao: number): HexagramInfo {
  const bits = (ben.lower.binary + ben.upper.binary).split('')
  const idx = changeYao - 1
  bits[idx] = bits[idx] === '1' ? '0' : '1'
  return getHexagram(
    binaryToTrigramNum(bits.slice(0, 3).join('')),
    binaryToTrigramNum(bits.slice(3, 6).join('')),
  )
}
