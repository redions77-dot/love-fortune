// 심화 풀이 안에서 "같은 결정에 대한 상반된 행동 권고"가 있는지 살핀다. 문장을 고치거나 연도를 바꾸지 않고, 알려 주기만 한다.
// 고객 결과 원문·DB 는 건드리지 않는다. 애매하면 원문을 그대로 두고 진단(ambiguous)으로만 남긴다.
//
// 상반된 권고 후보가 되려면 아래가 모두 맞아야 한다(단어 하나 — '유리하다', '풀린다' — 만으로는 권고가 아니다):
//   1) 행동 권고여야 한다
//        go    "하는 것이 유리 / 하기 좋다 / 해도 좋다·괜찮다 / 추진·진행·시작 / 적극적으로 / 미루지 마라"
//        stop  "하지 마라 / 하면 안 된다 / 피하라 / 미루라 / 보류"
//      "유리해질 수 있어요", "풀리는 시기예요", "기운이 …" 같은 가능성·흐름 설명은 권고가 아니다(무시).
//      "신중히 검토하라"(careful)는 go 와도 함께 성립하므로 비교하지 않는다.
//   2) 같은 결정이어야 한다 — 종류(투자·사업·이직/퇴사·결혼)와 행동(실행 / 제안 수락)이 같고, 큰 결정끼리여야 한다
//      (작은 기회·작은 투자·소액·소규모는 제외). "투자 제안을 받아들이지 마라"와 "큰 투자는 2028년부터 하기 좋다"는 다른 행동이다.
//   3) 조건이 같아야 한다 — "큰 빚을 내서", "충동적으로", "준비 없이" 같은 조건이 붙은 문장은 조건 없는 문장과 같은 결정이 아니다(모호).
//   4) 기간이 겹쳐야 한다 — 두 문장에 모두 연도가 있고 겹칠 때만 'opposed'(명확한 상반).
//      둘이 겹치지 않으면 문제 없음. 한쪽이라도 연도가 없으면 'ambiguous'(어느 쪽도 고르지 않음).
// 조건 3)·기간 4)가 확실하지 않으면 항상 모호로 둔다(원문 유지 + 진단만).

const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim()
export const sentenceList = (t) => clean(t).split(/(?<=[.!?。])\s+/).filter(Boolean)

const KIND_RULES = [['투자', /투자/], ['사업', /사업|창업/], ['이직·퇴사', /이직|퇴사/], ['결혼', /결혼/]]
// 작은 결정(작은 기회·작은 투자·소액·소규모)은 큰 결정과 비교하지 않는다.
const stripSmall = (t) => t.replace(/(?:작은|소규모|소액)\s*(?:기회|투자|프로젝트|결정|인연|사업)?\s*(?:\([^)]*\))?/g, ' ')
// 같은 투자라도 '제안·소개를 받아들이는 일'은 실행과 다른 행동이다.
const ACTION_PROPOSAL = /제안|소개|권유|권하/
// 조건이 붙은 문장(조건 없는 문장과 같은 결정이 아님)
const CONDITION_RE = /(빚을 내|대출|무리하게|충동적|감정적으로|준비 없이|준비하지 않|충분히 알아보지|묻지 않고|혼자서|단기간)/

export function kindsOf(text) {
  const t = stripSmall(text)
  const suffix = ACTION_PROPOSAL.test(t) ? ':제안' : ''
  const out = new Set()
  for (const [name, re] of KIND_RULES) if (re.test(t)) out.add(name + suffix)
  if (/큰 결정/.test(t) && !suffix) KIND_RULES.forEach(([name]) => out.add(name))   // '큰 결정'은 모든 큰 결정 종류의 실행을 가리킨다
  return out
}

// 행동 권고만 읽는다. 부정형은 뜻이 뒤집히므로 먼저 가려낸다("미루지 마라" = 지금 하라 = go, "피하지 않아도" = 권고 아님).
const NOT_ADVICE = /(피하지 않아도|하지 않아도 (?:돼|되|괜찮))/
const GO_PATTERNS = [/미루지 (?:마|말)/, /하기 좋/, /하는 것이 (?:가장 )?(?:유리|좋)/, /(?:해|하|시작해|진행해|추진해|받아들여)도 (?:좋|괜찮)/, /적극적으로 (?:진행|추진|시작|해보|하세요|검토)/, /추진(?:하세요|해도|해 보)/, /진행(?:하세요|해도|해 보)/]
const STOP_PATTERNS = [/하지 마(?:세요|라)/, /지 마(?:세요|라)/, /(?:하|해서|시작하|내리|받으|서)면 안/, /안 돼요/, /피하(?:세요|는 (?:게|편|것)|십시오)/, /피해야/, /미루(?:세요|는 (?:게|편|것)|어야|십시오)/, /보류/, /그만/]
// 가능성·흐름 설명("유리해질 수 있어요", "풀리는 시기예요")은 권고가 아니다 — 위 패턴에 걸리지 않으면 자동으로 제외된다.

function stanceOf(clause) {
  if (NOT_ADVICE.test(clause)) return null
  if (GO_PATTERNS.some((re) => re.test(clause))) return 'go'          // "미루지 마세요"는 STOP 의 '미루'보다 먼저 go 로 읽는다
  if (STOP_PATTERNS.some((re) => re.test(clause))) return 'stop'
  return null
}

// 한 절에서 기간을 읽는다(없으면 null). "N년 이후로 미루세요"는 N년 전까지 하지 말라는 뜻이므로 stop 이면 [-∞, N-1].
export function rangeOf(clause, stance) {
  let m = clause.match(/([0-9]{4})년\s*(?:부터|에서)\s*([0-9]{4})년/) || clause.match(/([0-9]{4})\s*~\s*([0-9]{4})/)
  if (m) return [Number(m[1]), Number(m[2])]
  m = clause.match(/([0-9]{4})년\s*이후/)
  if (m) return stance === 'stop' ? [-Infinity, Number(m[1]) - 1] : [Number(m[1]), Infinity]
  m = clause.match(/([0-9]{4})년\s*까지/)
  if (m) return [-Infinity, Number(m[1])]
  m = clause.match(/([0-9]{4})년\s*부터/)
  if (m) return [Number(m[1]), Infinity]
  const ys = [...clause.matchAll(/([0-9]{4})년/g)].map((x) => Number(x[1]))
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : null
}

const splitClauses = (s) => s.split(/(?<=하고|지만|는데|니|며|면서),\s+/)

// 글(여러 문장) → 행동 권고(stop/go) 목록
export function readDirectives(text) {
  const out = []
  for (const sentence of sentenceList(text)) {
    for (const clause of splitClauses(sentence)) {
      const kinds = kindsOf(clause)
      if (!kinds.size) continue
      const stance = stanceOf(clause)
      if (!stance) continue
      out.push({ stance, kinds, range: rangeOf(clause, stance), conditional: CONDITION_RE.test(clause), sentence: clean(sentence) })
    }
  }
  return out
}

const overlap = (a, b) => a[0] <= b[1] && b[0] <= a[1]
const shared = (a, b) => [...a].some((k) => b.has(k))

// stop-go 짝을 찾아 분류한다. 같은 짝은 한 번만. 같은 결정이 아니거나(종류·행동·크기) 기간이 겹치지 않으면 짝이 아니다.
export function pairDirectives(directives) {
  const opposed = [], ambiguous = []
  const seen = new Set()
  const stops = directives.filter((d) => d.stance === 'stop')
  const gos = directives.filter((d) => d.stance === 'go')
  for (const s of stops) for (const g of gos) {
    if (!shared(s.kinds, g.kinds)) continue
    const key = s.sentence + '|' + g.sentence
    if (seen.has(key)) continue
    seen.add(key)
    const bothRanges = s.range && g.range
    if (bothRanges && !overlap(s.range, g.range)) continue                 // 기간이 겹치지 않으면 문제 없음(2027년까지 미루고 2028년부터 유리)
    if (bothRanges && !s.conditional && !g.conditional) opposed.push({ stop: s.sentence, go: g.sentence })
    else ambiguous.push({ stop: s.sentence, go: g.sentence })              // 조건이 다르거나 기간을 알 수 없으면 모호 — 어느 쪽도 고르지 않는다
  }
  return { opposed, ambiguous }
}

// 한 문장(표의 한 행)이 다른 권고들과 어떻게 부딪히는지: 'opposed' | 'ambiguous' | 'ok'
export function statusAgainst(text, others) {
  const mine = readDirectives(text)
  if (!mine.length) return 'ok'
  const all = pairDirectives([...mine, ...others])
  const involves = (list) => list.some((p) => mine.some((d) => d.sentence === p.stop || d.sentence === p.go))
  if (involves(all.opposed)) return 'opposed'
  if (involves(all.ambiguous)) return 'ambiguous'
  return 'ok'
}

// 글에서 처음 나오는 연도(없으면 null). "2033~2042년"은 시작 연도 2033을 돌려준다. 소제목끼리 같은 대운·같은 해인지 비교할 때 쓴다.
export const firstYear = (t) => { const m = String(t || '').match(/([0-9]{4})[ ]*(?:년|~)/); return m ? Number(m[1]) : null }
