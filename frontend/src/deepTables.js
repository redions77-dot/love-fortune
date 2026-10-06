// 심화 분석 결과 안의 문장을 표로 다시 정리한다. 새 AI 호출·점수·확률·연도 계산 없이, 이미 생성된 같은 고객의 심화 풀이 문장만 고른다.
// - 연도·기간은 풀이 본문의 소제목(서버가 계산해 프롬프트에 넣은 대운·연운 연도)과 문장에 적힌 그대로만 쓴다. 고객별로 달라진다.
// - 필요한 소제목·문장을 찾지 못하면 그 칸은 비우고(null), 행이 너무 적으면 표 전체를 만들지 않는다(null).
// - 문장은 잘라 쓰지 않고 문장 단위로만 고른다. 문장을 새로 쓰거나 고치지 않는다.
import { parseContentBlocks, stripMarker } from './contentBlocks.js'
import { readDirectives, pairDirectives, statusAgainst, firstYear } from './timingCheck.js'

const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim()
const stripNum = (t) => clean(stripMarker(t)).replace(/^\d+\.\s*/, '')
export const sentencesOf = (t) => clean(t).split(/(?<=[.!?。])\s+/).filter(Boolean)
const first = (t) => (t ? sentencesOf(t)[0] || null : null)

const DO_RE = /(하세요|해보세요|보세요|두세요|넣으세요|만드세요|받아들|검토|준비|쌓|시작|점검|연습|지키|관리|키우|챙기)/
const AVOID_RE = /(절대|피하|하지 마|마세요|조심|신중|미루|넘기|안 돼|무리|주의|손실|후회|지출|소모|새어|새는|빠져|부담)/
const PERIOD_RE = /상반기|하반기|\d+\s*~\s*\d+\s*월/

const markOf = (t) => ['📌', '✅', '⚠️', '🔑', '💡', '🌟'].find((e) => String(t).startsWith(e)) || ''

// 섹션 본문 → 소제목(📌) 단위 묶음. ✅ / ⚠️ 소제목(기간 소제목 제외)은 앞의 📌 묶음의 good / bad 목록으로 붙인다.
export function outline(content) {
  const topics = []
  let cur = null
  const start = (head, mark) => { cur = { head: stripMarker(head), mark, paras: [], good: [], bad: [], key: null }; topics.push(cur); return cur }
  let listTarget = null
  for (const b of parseContentBlocks(content)) {
    if (b.type === 'h3') {
      const mark = markOf(b.text)
      const periodHead = PERIOD_RE.test(b.text)
      if (cur && !periodHead && mark === '✅') { listTarget = cur.good; continue }
      if (cur && !periodHead && mark === '⚠️') { listTarget = cur.bad; continue }
      listTarget = null
      start(b.text, mark)
      continue
    }
    if (!cur) start('', '')
    if (b.type === 'p' || b.type === 'li') (listTarget || cur.paras).push(stripNum(b.text))
    else if (b.type === 'compare') {
      cur.good.push(...b.left.items.map((i) => stripNum(i.text)))
      cur.bad.push(...b.right.items.map((i) => stripNum(i.text)))
    } else if (b.type === 'callout') {
      // 🔑 줄이 짧으면(40자 이하) 파서가 문장 전체를 소제목으로 읽는다 → 그 문장을 본문으로 쓴다
      const items = b.items.length ? b.items.map((i) => stripNum(i.text)) : (b.head ? [stripNum(b.head)] : [])
      cur.key = { head: b.items.length && b.head ? stripMarker(b.head) : '', items }
    }
    else if (b.type === 'steps') cur.paras.push(...b.items.map((i) => clean(i.text)))
  }
  return topics
}

const findSection = (sections, re) => (Array.isArray(sections) ? sections : []).find((s) => re.test(s.title || '') && s.content)
const topicsOf = (sec) => (sec ? outline(sec.content) : [])
const SEC = { summary: /종합\s*흐름/, daeun: /大運|대운\s*흐름/, route: /運路|대운\s*상세/, year: /年運|연운/, dao: /^[^가-힣A-Za-z0-9]*道|지금\s*해야\s*할\s*것\s*vs/ }

// "현재 대운 (2023~2032년)" → { main: '현재 대운', sub: '2023~2032년' }
function periodCell(head) {
  const m = clean(head).match(/^(.*?)\s*\((.*)\)\s*$/)
  if (!m) return { main: clean(head), sub: '' }
  const years = m[2].match(/\d{4}\s*~\s*\d{4}년|\d{4}년\s*시작|\d{4}년/)
  return { main: m[1], sub: years ? years[0] : m[2] }
}

function flowText(paras) {
  const ss = sentencesOf(paras.join(' '))
  if (!ss.length) return { flow: null, rest: [] }
  let n = 1
  if (ss[0].length < 16 && ss[1]) n = 2     // 표에는 핵심 한 문장만(아주 짧은 문장은 바로 뒤 문장과 함께). 상세 설명은 본문이 맡는다
  return { flow: ss.slice(0, n).join(' '), rest: ss.slice(n) }
}

const isImperative = (t) => /(세요|십시오|마세요)[.!]?$/.test(t)
const CAUTION_CUE = /(조심|신중|피하|주의|마세요)/
function daeunRow(topic, route) {
  const { flow, rest } = flowText(topic.paras)
  if (!flow) return null
  let doIt = first(topic.good[0])
  if (!doIt && route && route.key && route.key.items.length) {
    // 運路 '지금부터 준비할 것'의 첫 항목 — 이 대운이 시작되기 전에 지금 실천하라는 뜻이므로 그렇게 표시한다
    const act = first(route.key.items[0])
    if (act) doIt = { main: act, sub: '지금부터 준비할 일' }
  }
  if (!doIt) doIt = rest.find((x) => isImperative(x) && !CAUTION_CUE.test(x)) || null
  const doText = doIt && typeof doIt === 'object' ? doIt.main : doIt
  let careful = first(topic.bad[0])
  if (!careful) careful = rest.find((x) => CAUTION_CUE.test(x) && x !== doText) || null
  return { cells: [periodCell(topic.head), flow, doIt, careful] }
}

function yearRow(sec) {
  const topics = topicsOf(sec)
  const year = (clean(sec.title).match(/(\d{4})년/) || [])[1]
  const summary = topics.find((t) => /총평/.test(t.head))
  if (!summary || !year) return null
  const headYear = firstYear(summary.head)
  if (headYear != null && String(headYear) !== year) return null      // 다른 해의 총평을 이 해의 행에 묶지 않는다
  const { flow } = flowText(summary.paras)
  if (!flow) return null
  const allParas = topics.flatMap((t) => t.paras)
  const line = (re) => {
    const l = allParas.find((p) => re.test(p))
    if (!l) return null
    return first(l.replace(re, '').replace(/^[:：\s]*(\d+월(?:\s*,\s*\d+월)*\s*(?:→|->)?\s*)?/, '').trim()) || first(l)
  }
  const doIt = line(/^적극적으로 움직여야 할 달\s*[:：]/)
  const careful = line(/^절대 조심해야 할 달\s*[:：]/)
  return { cells: [{ main: `${year}년`, sub: '한 해 흐름' }, flow, doIt, careful] }
}

export const FLOW_COLS = ['시기', '흐름의 핵심', '해볼 만한 일', '신중하게 볼 일']

// 앞으로의 흐름 한눈에: 연운 한 행 + 대운 최대 3행. 두 행 미만이면 표를 만들지 않는다.
export function buildDeepFlowTable(sections) {
  const rows = []
  const ySec = findSection(sections, SEC.year)
  const yr = ySec ? yearRow(ySec) : null
  if (yr) rows.push(yr)
  const dTopics = topicsOf(findSection(sections, SEC.daeun)).filter((t) => /대운/.test(t.head))
  const routeTopics = topicsOf(findSection(sections, SEC.route))
  dTopics.slice(0, 3).forEach((t) => {
    // 運路의 '다음 대운 준비'는 시작 연도가 같은 대운 행에만 쓴다(연도만 보고 다른 구간의 준비 항목을 끌어오지 않는다)
    const start = firstYear(t.head)
    const route = /다음 대운/.test(t.head) && !/그 다음/.test(t.head) && start != null ? routeTopics.find((r) => /다음 대운/.test(r.head) && firstYear(r.head) === start) : null
    const r = daeunRow(t, route)
    if (r) rows.push(r)
  })
  if (rows.length < 2) return null
  return shapeTable({ title: '앞으로의 흐름 한눈에', cols: FLOW_COLS, rows: rows.map((r) => r.cells) })
}

// 문장 형태로 나눈다: 권하는 말(…하세요·…마세요)은 '실천 조언', 나머지(시기·기준·상황 설명)는 '풀이 요약'. 어느 쪽에도 해당 문장이 없으면 그 칸은 비운다.
const isAdvice = (t) => /(세요|십시오|마세요)[.!]?$/.test(t)
function splitSummaryAdvice(text) {
  const ss = sentencesOf(text)
  return { summary: ss.filter((x) => !isAdvice(x)).join(' ') || null, advice: ss.filter(isAdvice).join(' ') || null }
}

// 번호 항목 "작은 기회(이직 제안, …)는 2027년부터 …" → 종류 / 풀이 요약 / 실천 조언
function choiceRowFromItem(item) {
  const t = clean(item)
  const m = t.match(/^(.{2,16}?)\s*(\([^)]*\))?\s*(?:은|는|을|를|이|가)\s+(.*)$/)
  if (!m) return null
  const kind = m[1]
  if (/[0-9]/.test(kind) || /^(특히|다만|그리고|또한)/.test(kind)) return null     // 연도·접속어로 시작하는 문장은 '선택의 종류'가 아니다
  const examples = m[2] ? m[2].slice(1, -1) : ''
  return { kind, examples, ...splitSummaryAdvice(m[3]) }
}

const EXTRA_CHOICES = [
  { label: '보증·금전 부탁', re: /보증|돈을 빌려|빌려주/ },
  { label: '지인이 권하는 투자·사업 제안', re: /(소개|권하)는?\s*(투자|사업)/ },
]

const short = (t) => { const x = clean(t); return x.length > 60 ? x.slice(0, 58) + '…' : x }
// 모든 섹션의 문장에서 stop/go 지시를 모은다(섹션 이름과 상관없이 문장 내용만 본다).
function sectionDirectives(sections) {
  const out = []
  ;(Array.isArray(sections) ? sections : []).forEach((sec) => {
    if (!sec || !sec.content) return
    topicsOf(sec).forEach((t) => [...t.paras, ...t.good, ...t.bad, ...(t.key ? t.key.items : [])].forEach((x) => out.push(...readDirectives(x))))
  })
  return out
}
// 표의 행이 된 소제목(예: 작은 기회 vs 큰 결정 기준) 밖의 문장에서 모은 지시
function directivesOutside(sections, topic) {
  const own = new Set(topic.paras.map((p) => clean(p)))
  return sectionDirectives(sections).filter((d) => ![...own].some((p) => p.includes(d.sentence)))
}

// 빈 칸이 많은 표를 '—'만 반복하는 미완성 표로 두지 않는다.
//  1) 모든 행이 비어 있는 열은 뺀다(열 축소).
//  2) 남은 칸의 34% 넘게 비어 있으면 행별 카드로 보여 준다(비어 있는 칸은 아예 그리지 않음).
//  3) 열이 하나만 남으면 표를 만들지 않는다. 비어 있는 칸에 새 내용을 채우지 않는다.
export function shapeTable(table) {
  if (!table) return null
  const keep = table.cols.map((_, ci) => ci === 0 || table.rows.some((r) => !!r[ci]))
  const cols = table.cols.filter((_, ci) => keep[ci])
  const rows = table.rows.map((r) => r.filter((_, ci) => keep[ci]))
  if (cols.length < 2 || !rows.length) return null
  const cells = rows.reduce((n, r) => n + r.length - 1, 0)
  const empty = rows.reduce((n, r) => n + r.slice(1).filter((c) => !c).length, 0)
  return { ...table, cols, rows, display: cells && empty / cells > 0.34 ? 'cards' : 'table' }
}

export const CHOICE_COLS = ['선택의 종류', '풀이 요약', '실천 조언']

// 지금 나에게 맞는 선택: 종합 흐름 요약의 "작은 기회 vs 큰 결정 기준" 번호 항목 + 같은 결과의 조심 항목 중 근거가 있는 것만.
export function buildDeepChoiceTable(sections) {
  const sum = findSection(sections, SEC.summary)
  const topic = topicsOf(sum).find((t) => /작은 기회|큰 결정|결정 기준/.test(t.head))
  if (!topic) return null
  const rows = []
  let omitted = false
  const others = directivesOutside(sections, topic)
  topic.paras.forEach((p) => {
    const r = choiceRowFromItem(p)
    if (!r || (!r.summary && !r.advice)) return
    // 같은 종류의 결정에 '하지 마라'와 '하기 좋다'가 기간까지 겹쳐 명확히 부딪히면 어느 쪽도 고르지 않고 이 행을 싣지 않는다.
    // 기간을 알 수 없어 모호한 경우는 원문 그대로 싣고 진단 목록에만 남긴다. '유리함'과 '신중히 검토'는 함께 성립하므로 모순이 아니다.
    if (statusAgainst(p, others) === 'opposed') { omitted = true; return }
    rows.push([{ main: r.kind, sub: r.examples }, r.summary, r.advice])
  })
  if (!rows.length) return null
  const cautions = ['daeun', 'route', 'year', 'dao'].flatMap((k) => topicsOf(findSection(sections, SEC[k])).flatMap((t) => [...t.bad, ...(t.mark === '⚠️' ? t.paras : [])]))
  for (const ex of EXTRA_CHOICES) {
    const hit = cautions.find((c) => ex.re.test(c))
    if (!hit) continue
    const sa = splitSummaryAdvice(hit)
    rows.push([{ main: ex.label, sub: '' }, sa.summary, sa.advice])
  }
  if (rows.length < 2) return null
  return shapeTable({ title: '지금 나에게 맞는 선택', cols: CHOICE_COLS, rows: rows.slice(0, 4), note: omitted ? '표에는 시기 설명이 분명한 항목만 담았어요.' : null })
}

// 표를 만들 때 생략·제외한 이유를 알려 주는 점검 목록(화면에는 쓰지 않고 테스트·검증 보고용). 고객 결과는 고치지 않는다.
export function diagnoseDeepTables(sections) {
  const out = []
  const has = (re) => !!findSection(sections, re)
  if (!has(SEC.summary)) out.push({ code: 'no-summary', message: '종합 흐름 요약이 없어 선택 표를 만들지 않음' })
  if (!has(SEC.daeun) && !has(SEC.year)) out.push({ code: 'no-flow-source', message: '大運·年運 풀이가 없어 흐름 표를 만들지 않음' })
  if (!has(SEC.dao)) out.push({ code: 'no-dao', message: '道 풀이가 없어 마무리 표·핵심 문장을 만들지 않음' })
  const all = pairDirectives(sectionDirectives(sections))
  all.opposed.forEach((p) => out.push({ code: 'timing-opposed', message: '같은 종류의 결정에 상반된 권고(기간 겹침): "' + short(p.stop) + '" ↔ "' + short(p.go) + '" — 해당 행은 표에서 제외' }))
  all.ambiguous.forEach((p) => out.push({ code: 'timing-ambiguous', message: '기간을 알 수 없어 판단 보류(원문 그대로 표시): "' + short(p.stop) + '" ↔ "' + short(p.go) + '"' }))
  return out
}

// 실천 시점: 풀이 문장에 적힌 표현을 그대로 옮긴다. 시점 표현이 없으면 기한을 새로 정하지 않고 '정해진 시점 없음'으로 둔다.
function timeCell(text) {
  let m = text.match(/매일\s*(?:저녁|아침|밤)?/)
  if (m) return { main: '오늘부터', sub: m[0].trim() }
  if (/매달|매월/.test(text)) return { main: '매달', sub: '' }
  if (/이번 달/.test(text)) return { main: '이번 달', sub: '' }
  if (/지금 당장/.test(text)) return { main: '지금 당장', sub: '' }
  if (/지금부터/.test(text)) return { main: '지금부터', sub: '' }
  if (/오늘/.test(text)) return { main: '오늘', sub: '' }
  return { main: '정해진 시점 없음', sub: '' }
}
const bigrams = (t) => { const s = clean(t).replace(/[^가-힣0-9]/g, ''); const o = new Set(); for (let i = 0; i < s.length - 1; i++) o.add(s.slice(i, i + 2)); return o }
function similar(a, b) {
  const A = bigrams(a), B = bigrams(b)
  if (!A.size || !B.size) return false
  let n = 0
  A.forEach((g) => { if (B.has(g)) n++ })
  return n / Math.min(A.size, B.size) >= 0.4
}
export const CLOSING_COLS = ['실천 시점', '실천할 행동', '실천 방법']
export const CLOSING_NOTE = '시점은 풀이 문장에 적힌 표현만 옮겼어요.'

// 앞으로 기억할 나의 기준: 道 섹션의 마지막 핵심 문장 한 줄 + 번호 항목(지금 시작할 것)을 실행표로(원문 순서 그대로).
export function buildDeepClosing(sections) {
  const dao = findSection(sections, SEC.dao)
  const topics = topicsOf(dao)
  const keyTopic = [...topics].reverse().find((t) => t.key && t.key.items.length)
  const keyline = keyTopic ? first(keyTopic.key.items[0]) : null
  const startTopic = topics.find((t) => /시작해야|해야 할 것/.test(t.head))
  const route = topicsOf(findSection(sections, SEC.route)).find((t) => t.key && /준비할 것/.test(t.key.head))
  const items = [...(startTopic ? startTopic.paras : []), ...(route ? route.key.items : [])]   // 지금 시작할 것을 먼저, 모자라면 대운 준비 항목으로 채운다
  const rows = []
  for (const it of items) {
    const ss = sentencesOf(it)
    const action = ss.find((s) => /(세요|보세요|두세요)[.!]?$/.test(s))
    if (!action || rows.some((r) => similar(r.cells[1], action))) continue    // 같은 행동이 두 번 나오지 않게
    const change = ss.find((s) => s !== action) || null
    rows.push({ cells: [timeCell(it), action, change] })
    if (rows.length === 3) break
  }
  const table = rows.length ? shapeTable({ title: '실천표', cols: CLOSING_COLS, rows: rows.map((r) => r.cells), note: CLOSING_NOTE }) : null
  if (!keyline && !table) return null
  return { title: '앞으로 기억할 나의 기준', keyline, table }
}
