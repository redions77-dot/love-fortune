// 전체 분석(유료) 결과를 "한눈에 보는 층"으로 정리하는 순수 함수 모음.
// 이미 나온 풀이 문장(parseContentBlocks 가 나눈 블록)에서 줄 모양으로만 골라 오며, 새 문장·점수·확률·평가를 만들지 않는다.
// 읽히지 않는 항목은 null 을 돌려주고, 화면은 그 항목만 생략한다(본문은 항상 그대로 나온다).
import { parseContentBlocks, stripMarker } from './contentBlocks.js'
import { takeSentences } from './reportSummary.js'
import { sajuFacts, ELEMENT_LABEL, elementDistribution, ELEMENTS } from './sajuFacts.js'

const MARKS = ['📌', '✅', '⚠️', '🔑', '💡', '🌟']
const markOf = (t) => MARKS.find((e) => String(t || '').startsWith(e)) || ''
const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim()
// 줄 앞의 이모지 표시와 '마무리:' 꼬리표만 걷어 낸다(문장은 그대로). 카드와 결론 완전성 검사가 같은 규칙을 쓴다.
const bare = (t) => clean(t).replace(/^[\u{1F300}-\u{1FAFF}☀-➿️\s]+/u, '').replace(/^마무리:\s*/, '')

// 블록 → 소제목 단위 묶음. items 는 나온 순서 그대로 { type: 'li' | 'p', text }.
export function toGroups(blocks) {
  const out = []
  let cur = { mark: '', head: '', items: [], timeline: null }
  out.push(cur)
  const open = (raw) => { cur = { mark: markOf(raw), head: stripMarker(raw), items: [], timeline: null }; out.push(cur) }
  const add = (b) => cur.items.push({ type: b.type === 'li' ? 'li' : 'p', text: bare(b.lead ? `${b.lead} ${b.text}` : b.text), lead: b.lead || '', body: clean(b.text) })
  for (const b of blocks) {
    if (b.type === 'h3') open(b.text)
    else if (b.type === 'compare') { open(b.left.head); b.left.items.forEach(add); open(b.right.head); b.right.items.forEach(add) }
    else if (b.type === 'callout') {
      if (b.items.length) { open(b.head || '🔑'); b.items.forEach(add) }
      else if (b.head) { open('🔑'); add({ type: 'p', text: b.head }) }   // 짧은 '🔑 마무리: …' 한 줄은 소제목이 아니라 문장 자체
    }
    else if (b.type === 'timeline') cur.timeline = b.items
    else if (b.type === 'steps') b.items.forEach((x) => cur.items.push({ type: 'li', text: clean(`${x.n}. ${x.text}`), lead: '', body: clean(x.text) }))
    else if (b.type === 'p' || b.type === 'li') add(b)
  }
  return out.filter((g) => g.items.length || g.timeline)
}

const find = (groups, re) => groups.find((g) => g.head && re.test(g.head))
const firstPara = (g) => (g ? (g.items.find((x) => x.type === 'p') || g.items[0] || {}).text || '' : '')
const pick = (text, n = 2, max = 240) => takeSentences(text, n, max)

function compare(left, right) {
  if (!left || !right || !left.text || !right.text) return null
  return { left, right }
}

// 財運: 인생 단계 타임라인 + (돈이 모이는 조건 / 돈 새는 패턴) 비교
function money(groups) {
  const stageG = find(groups, /단계|돈\s*흐름/)
  const stages = []
  if (stageG) {
    for (const it of stageG.items) {
      const m = it.type === 'li' && it.text.match(/^\d+\.\s*([^—–]+?)\s*[—–]\s*(.+)$/)
      if (!m) continue
      const text = pick(m[2], 1, 200)
      if (text) stages.push({ when: m[1].trim(), text })
    }
  }
  const gather = find(groups, /모이는|조건/)
  const leak = find(groups, /새는|새기|샐/)
  const gt = pick(firstPara(gather), 1, 200), lt = pick(firstPara(leak), 1, 200)
  return {
    kind: 'money',
    timeline: stages.length >= 2 ? { label: '인생 단계별 돈 흐름', items: stages } : null,
    compare: compare(gt && { label: gather.head, text: gt, tone: 'good' }, lt && { label: leak.head, text: lt, tone: 'warn' }),
  }
}

// 職: 추천 직업 1/2/3(제목 + 왜 맞는지 한 줄) + 업무 환경 비교
function career(groups) {
  const jobG = find(groups, /직업/)
  const jobs = []
  if (jobG) {
    let cur = null
    for (const it of jobG.items) {
      if (it.type === 'li' && /^\d+\./.test(it.text) && it.text.length <= 90) {
        // 카드는 번호 + 직업명만. '직업명 — 설명' 꼴이면 앞부분만 쓰고 설명은 본문에만 둔다(원문 줄은 본문에 그대로).
        const full = it.text.replace(/^\d+\.\s*/, '')
        const name = full.split(/\s[—–]\s|\s-\s/)[0].trim()
        cur = { n: Number(it.text.match(/^(\d+)/)[1]), title: name || full }
        jobs.push(cur)
      }
    }
  }
  const good = find(groups, /^잘\s*맞는.*환경/), bad = find(groups, /^덜\s*맞는.*환경/)
  const gt = pick(firstPara(good), 2, 240), bt = pick(firstPara(bad), 2, 240)
  return {
    kind: 'career',
    jobs: jobs.length >= 2 && jobs.every((j) => j.title) ? jobs : null,
    compare: compare(gt && { label: good.head, text: gt, tone: 'good' }, bt && { label: bad.head, text: bt, tone: 'warn' }),
  }
}

// 富: 핵심 투자 방식 문장(🔑) 강조
function invest(groups) {
  const key = groups.find((g) => g.mark === '🔑' && g.items.length)
  const text = key ? pick(key.items.map((x) => x.text).join(' '), 2, 260) : null
  return { kind: 'invest', highlight: text ? { label: stripMarker(key.head) || '핵심 투자 방식', text } : null }
}

// 緣: 진짜 내 편 vs 독이 되는 사람
function people(groups) {
  const ally = find(groups, /내\s*편/), poison = find(groups, /독이|조심|주의/)
  const at = pick(firstPara(ally), 2, 240), pt = pick(firstPara(poison), 2, 240)
  return { kind: 'people', compare: compare(at && { label: ally.head, text: at, tone: 'good' }, pt && { label: poison.head, text: pt, tone: 'warn' }) }
}

// 月運: 12개월 지도 — 각 달 줄에서 첫 구절만(쉼표·마침표 앞). 12개월이 모두 읽힐 때만.
export function monthMap(timeline) {
  if (!Array.isArray(timeline) || timeline.length !== 12) return null
  const cells = []
  for (let i = 0; i < 12; i++) {
    const m = String(timeline[i].lead || '').match(/(\d{1,2})월/)
    if (!m || Number(m[1]) !== i + 1) return null
    const t = clean(timeline[i].text)
    const first = t.split(/[,，.!?。]\s*|\s[—–]\s/)[0].trim()   // 문장 중간에서 자르지 않고, 첫 구절(쉼표·마침표 앞)을 통째로 쓴다
    if (!first) return null
    cells.push({ month: i + 1, phrase: first })
  }
  const y = (String(timeline[0].lead || '').match(/(\d{4})년/) || [])[1]
  return { year: y || '', cells }
}
function months(blocks) {
  const tl = blocks.find((b) => b.type === 'timeline')
  const map = tl ? monthMap(tl.items) : null
  return { kind: 'months', map }
}

// 幸: 색깔/마스코트/방향/숫자/아이템 태그
function lucky(blocks) {
  const tags = []
  for (const b of blocks) if ((b.type === 'p' || b.type === 'li') && b.lead && /^(색깔|마스코트|방향|숫자|아이템):$/.test(b.lead) && clean(b.text)) tags.push({ label: b.lead.replace(':', ''), value: clean(b.text) })
  const ok = tags.length >= 3
  return { kind: 'lucky', tags: ok ? tags : null, covers: ok && tags.length === blocks.length }   // covers: 모든 줄이 태그가 된 경우에만 본문 대신 태그만 보여 준다
}

// 道: 결론 페이지 — 잘 풀리는 조건 / 주의 패턴 / 실천 행동 / 마지막 한 문장. 본문 문장을 그대로 재배치한다.
export function conclusion(groups) {
  const cond = find(groups, /조건|풀리는/)
  const bad = find(groups, /망하는|패턴|주의/)
  const act = find(groups, /실천|행동/)
  const close = groups.find((g) => g.mark === '🔑' && g.items.length)
  const lines = (g) => (g ? g.items.map((x) => x.text) : [])
  if (!cond || !bad || !act) return null
  const c = {
    conditions: { label: cond.head, items: lines(cond) },
    pattern: { label: bad.head, items: lines(bad) },
    actions: { label: act.head, items: lines(act) },
    closing: close ? { label: stripMarker(close.head), items: lines(close) } : null,
  }
  return c
}

// 결론 페이지가 원문의 모든 줄을 담고 있는지(담지 못하면 결론 페이지로 바꾸지 않고 원문 본문을 그대로 쓴다)
export function conclusionCoversContent(c, content) {
  if (!c) return false
  const have = [...c.conditions.items, ...c.pattern.items, ...c.actions.items, ...(c.closing ? c.closing.items : [])].map(bare)
  const lines = parseContentBlocks(content)
  const want = []
  const walk = (b) => {
    if (b.type === 'h3') return
    if (b.type === 'compare') { [...b.left.items, ...b.right.items].forEach(walk); return }
    if (b.type === 'callout') { if (b.items.length) b.items.forEach(walk); else if (b.head) want.push(bare(b.head)); return }
    if (b.type === 'steps') { b.items.forEach((x) => want.push(bare(`${x.n}. ${x.text}`))); return }
    if (b.type === 'timeline' || b.type === 'lock') { want.push(null); return }
    want.push(bare(b.lead ? `${b.lead} ${b.text}` : b.text))
  }
  lines.forEach(walk)
  if (want.includes(null)) return false
  return want.every((w) => have.includes(w)) && have.length === want.length
}

// 섹션 제목 → 한눈에 보는 층. 해당 없으면 null.
export function overviewFor(title, content) {
  const t = String(title || '')
  const blocks = parseContentBlocks(content)
  const groups = toGroups(blocks)
  let ov = null
  if (/財運|재물/.test(t)) ov = money(groups)
  else if (/職|직업/.test(t)) ov = career(groups)
  else if (/富|투자|부동산/.test(t)) ov = invest(groups)
  else if (/緣|인연/.test(t)) ov = people(groups)
  else if (/月運|월별/.test(t)) ov = months(blocks)
  else if (/幸|나를 돕는/.test(t)) ov = lucky(blocks)
  else if (/道|잘 사는 법/.test(t)) {
    const c = conclusion(groups)
    ov = { kind: 'closing', conclusion: conclusionCoversContent(c, content) ? c : null }
  }
  if (!ov) return null
  const has = Object.entries(ov).some(([k, v]) => k !== 'kind' && v)
  return has ? ov : null
}

// 첫 페이지 키워드(2~3개): 서버가 계산한 값에서만 — 비유 유형 이름 / 일간 기운 / 가장 많은 오행(단독 1위일 때)
export function dashboardKeywords(pillars, typeInfo) {
  const out = []
  if (typeInfo && typeInfo.name) out.push(typeInfo.name)
  const f = sajuFacts(pillars)
  if (f.dayGan && f.dayElement) out.push(`${ELEMENT_LABEL[f.dayElement]} 기운의 일간`)
  const d = elementDistribution(pillars)
  if (d) {
    const max = Math.max(...ELEMENTS.map((e) => d.counts[e]))
    const tops = ELEMENTS.filter((e) => d.counts[e] === max)
    if (tops.length === 1 && max >= 2) out.push(`${ELEMENT_LABEL[tops[0]]}(${tops[0]}) 기운이 가장 많음`)
  }
  return out.slice(0, 3)
}
