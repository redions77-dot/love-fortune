// 결과 상단 "한눈에 보기" 요약을 만든다. 이미 나온 풀이 문장에서 골라 올 뿐, 새 문장·점수·확률·예측을 만들지 않는다.
// 문장이 너무 길거나 찾지 못하면 그 항목은 생략한다(null). 새 AI 호출은 없다.
import { parseContentBlocks, stripMarker } from './contentBlocks.js'

const MAX_ONE = 190   // 한 항목에 쓸 수 있는 최대 글자(문장 단위로만 자른다)

const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim()
const sentencesOf = (t) => clean(t).split(/(?<=[.!?。])\s+/).filter(Boolean)

// 앞에서부터 문장 단위로 maxSentences개까지, 글자 수 한도 안에서만 가져온다. 첫 문장부터 한도를 넘으면 null(생략).
export function takeSentences(text, maxSentences = 1, maxChars = MAX_ONE) {
  const ss = sentencesOf(stripMarker(text))
  if (!ss.length || ss[0].length > maxChars) return null
  let out = ss[0]
  for (let i = 1; i < Math.min(ss.length, maxSentences); i++) {
    if ((out + ' ' + ss[i]).length > maxChars) break
    out += ' ' + ss[i]
  }
  return out
}

const nonEmpty = (v) => (v ? v : null)

// 내 사주 무료 결과(parseMyFree) → 핵심 성향 / 강점·주의할 점 / 지금 해볼 행동 (요약은 항목마다 핵심 한 문장 — 이유·상황·실천 예시는 본문이 맡는다)
export function summarizeSaju(myFree) {
  if (!myFree) return null
  const headline = nonEmpty(takeSentences(myFree.sentence, 1, 220))
  const strength = takeSentences(myFree.strength, 1)
  const caution = takeSentences(myFree.habit, 1)
  // 새 결과: 행동 3개의 제목만(자세한 방법은 본문 마지막). 예전 결과: 팁의 첫 문장.
  const actionList = myFree.actions && myFree.actions.length === 3 ? myFree.actions.map(a => a.title) : null
  const action = actionList ? null : takeSentences(myFree.tip, 1, 240)
  const compare = strength && caution ? { left: { label: '강점', text: strength }, right: { label: '주의할 점', text: caution } } : null
  if (!headline && !compare && !action && !actionList) return null
  return { kind: 'saju', title: '한눈에 보기', headline, compare, strengthOnly: !compare ? strength : null, cautionOnly: !compare ? caution : null, action, actionList, actionLabel: actionList ? '지금 당장 할 일, 딱 3가지' : '지금 해볼 행동' }
}

// 관계 궁합 무료 결과(parseGunghabFree) → 잘 맞는 점 / 부딪히기 쉬운 점(= 조율할 점) / 바로 써볼 대화 방법
export function summarizeGunghabFree(parsed) {
  if (!parsed) return null
  const good = takeSentences(parsed.good, 1)
  const tune = takeSentences(parsed.tune, 1)
  const line = parsed.line ? clean(parsed.line) : null     // 서버 규칙(한 문장·존댓말)을 통과한 문장만 parsed.line 에 들어온다
  const compare = good && tune ? { left: { label: '잘 맞는 점', text: good }, right: { label: '부딪히기 쉬운 점', text: tune } } : null
  if (!compare && !line) return null
  return { kind: 'gunghab', title: '한눈에 보기', headline: null, compare, strengthOnly: !compare ? good : null, cautionOnly: !compare ? tune : null, action: line, actionLabel: '바로 써볼 대화 방법' }
}

// 하위 소제목 아래 첫 문장. 소제목은 h3 이거나, 이모지로 시작하는 긴 줄(문단으로 읽힌 소제목)일 수 있다.
// 본문은 문단·번호 항목·단계 목록의 첫 항목에서 가져온다. 다음 소제목·강조상자·비교표를 만나면 멈춘다.
const startsWithMark = (t) => ['📌', '✅', '⚠️', '🔑', '💡', '🌟'].some(e => String(t || '').startsWith(e))
// opts.denyRe: 이 소제목은 쓰지 않는다 / opts.paragraphOnly: 번호 항목·단계 목록은 건너뛰고 일반 문단만 쓴다
function bodyUnder(blocks, headRe, opts = {}) {
  const { denyRe = null, paragraphOnly = false } = opts
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const isHead = (b.type === 'h3' || (b.type === 'p' && startsWithMark(b.text))) && headRe.test(b.text) && !(denyRe && denyRe.test(b.text))
    if (!isHead) continue
    for (let j = i + 1; j < blocks.length; j++) {
      const n = blocks[j]
      if (n.type === 'h3' || n.type === 'callout' || n.type === 'compare' || (n.type === 'p' && startsWithMark(n.text))) break
      let text = null
      if (n.type === 'p') text = String(n.text || '')
      else if (!paragraphOnly && n.type === 'li') text = String(n.text || '').replace(/^\d+\.\s*/, '')
      else if (!paragraphOnly && n.type === 'steps' && n.items.length) text = n.items[0].text
      if (text) { const got = takeSentences(text, 1); if (got) return got }
    }
  }
  return null
}

// 재물·직업(유료 전체 분석 / 심화): 돈이 들어오는 방식 / 돈이 새기 쉬운 곳 / 나에게 맞는 일의 환경.
// 제목에 財運·재물 이 있는 섹션과 職·직업 이 있는 섹션에서, 해당 소제목이 실제로 있을 때만 뽑는다.
// '돈이 들어오는 방식'은 수입 방식·재물 흐름을 직접 설명하는 소제목의 일반 문단만 쓴다.
// "인생 단계별 돈 흐름"처럼 나이·시기별로 나뉜 항목(첫 항목이 고객의 현재 상황으로 오해될 수 있음)은 쓰지 않고, 없으면 이 항목만 생략한다.
const INFLOW_HEAD = /(수입|돈|재물)(이|의)?\s*(들어오는|버는|흐름)|재물\s*흐름|돈이\s*들어오/
const STAGE_HEAD = /단계|시절|젊은|중년|말년|연령|나이|세대|\d+\s*대/
export function summarizeMoney(sections) {
  const list = Array.isArray(sections) ? sections : []
  const money = list.find(s => /財運|재물/.test(s.title))
  const job = list.find(s => /職|직업/.test(s.title))
  const mb = money ? parseContentBlocks(money.content) : []
  const jb = job ? parseContentBlocks(job.content) : []
  const rows = []
  const inflow = bodyUnder(mb, INFLOW_HEAD, { denyRe: STAGE_HEAD, paragraphOnly: true })
  const leak = bodyUnder(mb, /새는|새기|샐/)
  const env = bodyUnder(jb, /환경|구조/)
  if (inflow) rows.push({ label: '돈이 들어오는 방식', text: inflow })
  if (leak) rows.push({ label: '돈이 새기 쉬운 곳', text: leak })
  if (env) rows.push({ label: '나에게 맞는 일의 환경', text: env })
  if (!rows.length) return null
  return { kind: 'money', title: '재물·직업 한눈에 보기', rows }
}

// 관계 상세 풀이(유료): ✅ 소제목 → 잘 맞는 점, ⚠️ 소제목 → 부딪히기 쉬운 점. 대화 문장은 무료 요약에서 검증된 문장(line)이 있을 때만.
// 유료 풀이는 ✅ 소제목을 따로 만들지 않아 비교 카드가 비는 일이 많다. 그럴 때는 '관계 총평' 섹션에서 한 줄 정리와 '이번 주에 해볼 행동'을 가져온다(새 문장을 만들지 않고 이미 나온 문장만).
export function summarizeGunghabPaid(sections, freeLine) {
  const list = Array.isArray(sections) ? sections : []
  let good = null, tune = null
  for (const s of list) {
    const bs = parseContentBlocks(s.content)
    if (!good) good = firstByEmoji(bs, '✅')
    if (!tune) tune = firstByEmoji(bs, '⚠️')
    if (good && tune) break
  }
  const line = freeLine ? clean(freeLine) : null
  const compare = good && tune ? { left: { label: '잘 맞는 점', text: good }, right: { label: '부딪히기 쉬운 점', text: tune } } : null
  const wrap = !compare ? wrapUpOf(list) : null
  if (!compare && !line && !wrap) return null
  const action = line || wrap?.week || null
  return { kind: 'gunghab', title: '한눈에 보기', headline: wrap?.headline || null, compare, strengthOnly: !compare ? good : null, cautionOnly: !compare ? tune : null, action, actionLabel: line ? '바로 써볼 대화 방법' : '이번 주에 해볼 행동' }
}

// '관계 총평' 섹션: 첫 문장 = 한 줄 정리, '이번 주'가 들어간 문단(또는 그 소제목 바로 아래 문단) = 이번 주에 해볼 행동.
function wrapUpOf(sections) {
  const sec = sections.find(x => /총평/.test(x.title || ''))
  if (!sec) return null
  const blocks = parseContentBlocks(sec.content)
  const bodyOf = (b) => (b.type === 'callout' ? b.items?.[0]?.text : b.type === 'p' || b.type === 'li' ? b.text : null)
  let week = null, weekIdx = -1
  for (let i = 0; i < blocks.length && !week; i++) {
    const b = blocks[i]
    const mentions = /이번\s*주/.test(b.type === 'callout' ? (b.head || '') + ' ' + (b.items?.[0]?.text || '') : b.text || '')
    if (!mentions) continue
    const own = bodyOf(b)
    let text = own && /이번\s*주/.test(own) ? own : null
    if (!text) { const next = blocks[i + 1]; text = next ? bodyOf(next) : null; if (text) weekIdx = i + 1 }
    if (text) { week = takeSentences(text, 2, 240); if (week && weekIdx < 0) weekIdx = i }
  }
  let headline = null
  for (let i = 0; i < blocks.length && !headline; i++) {
    if (i === weekIdx) continue
    const text = bodyOf(blocks[i])
    if (text) headline = takeSentences(text, 1, 220)
  }
  return headline || week ? { headline, week } : null
}

function firstByEmoji(blocks, emoji) {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const isHead = b.type === 'h3' && b.text.startsWith(emoji)
    const cmp = b.type === 'compare' && (emoji === '✅' ? b.left : b.right)
    if (cmp) { const side = emoji === '✅' ? b.left : b.right; const g = takeSentences(side.items[0]?.text, 1); if (g) return g; continue }
    if (!isHead) continue
    for (let j = i + 1; j < blocks.length; j++) {
      const n = blocks[j]
      if (n.type === 'h3' || n.type === 'callout' || n.type === 'compare') break
      if (n.type === 'p' || n.type === 'li') { const g = takeSentences(String(n.text).replace(/^\d+\.\s*/, ''), 1); if (g) return g }
    }
  }
  return null
}
