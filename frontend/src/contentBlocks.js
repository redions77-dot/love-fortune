// 결과 본문(AI가 쓴 텍스트)을 화면·PDF 공통 "블록"으로 나누는 순수 함수. 내용을 바꾸거나 만들지 않고, 줄의 모양만 읽는다.
//   h3        📌 ✅ ⚠️ 🌟 소제목(짧은 줄) 또는 # 제목
//   callout   🔑 💡 짧은 소제목 + 뒤따르는 문단(최대 3개) → 연한 초록 강조상자
//   timeline  연속된 "2027년 1월: …" 줄 → 시기별 타임라인
//   compare   ✅ 소제목 바로 뒤에 ⚠️ 소제목이 이어질 때 → 좋은 점 / 조심할 점 비교
//   steps     "순서·단계·과정" 소제목 아래 연속 번호 항목 → 단계 목록
//   li / p / lock  번호 항목 / 문단 / 🔒 안내
export const SUBHEAD_EMOJIS = ['📌', '✅', '⚠️', '🔑', '💡', '🌟']
export const MONTH_RE = /^(\d{1,4}년?\s*\d{1,2}월):\s*(.*)/
// 월별 줄: '2027년 1월:' 뿐 아니라 이어지는 '2월:' 같은 줄도 같은 월 목록으로 본다
const MONTH_ANY_RE = /^((?:\d{4}년\s*)?\d{1,2}월):\s*(.*)/
export const ITEM_RE = /^(색깔|마스코트|방향|숫자|아이템):\s*(.*)/
const CALLOUT_EMOJIS = ['🔑', '💡']
const HEADING_MAX = 40
const STEP_HEAD_RE = /순서|단계|과정|차례|절차|루틴/
const COMPARE_MAX_CHARS = 520

export function parseContentBlocks(text) {
  if (!text || !String(text).trim()) return []
  const blocks = []
  let callout = null
  const flush = () => { if (callout) { blocks.push(callout); callout = null } }
  for (const line of String(text).split('\n')) {
    const t = line.trim()
    if (!t) continue
    if (/^#{1,3}\s/.test(t)) { flush(); blocks.push({ type: 'h3', text: t.replace(/^#{1,3}\s+/, '') }); continue }
    if (t.startsWith('🔒')) { flush(); blocks.push({ type: 'lock', text: t }); continue }
    if (SUBHEAD_EMOJIS.some(e => t.startsWith(e))) {
      flush()
      const isCallout = CALLOUT_EMOJIS.some(e => t.startsWith(e))
      if (t.length <= HEADING_MAX) {
        if (isCallout) callout = { type: 'callout', head: t, items: [], max: 3 }
        else blocks.push({ type: 'h3', text: t })
      } else if (isCallout) {
        blocks.push({ type: 'callout', head: null, items: [{ type: 'p', text: t }] })
      } else {
        blocks.push({ type: 'p', text: t })
      }
      continue
    }
    let item
    const monthMatch = t.match(MONTH_ANY_RE)
    const itemMatch = t.match(ITEM_RE)
    if (monthMatch) item = { type: 'p', lead: monthMatch[1] + ':', text: monthMatch[2], month: true }
    else if (itemMatch) item = { type: 'p', lead: itemMatch[1] + ':', text: itemMatch[2] }
    else if (/^\d+\./.test(t)) item = { type: 'li', text: t }
    else item = { type: 'p', text: t }
    if (callout) {
      callout.items.push(item)
      if (callout.items.length >= callout.max) flush()
    } else blocks.push(item)
  }
  flush()
  return groupBlocks(blocks)
}

// 2차 묶음: 연속 월 줄 → timeline, ✅+⚠️ 짝 → compare, 단계 소제목 아래 번호 항목 → steps
function groupBlocks(blocks) {
  const out = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    // 타임라인: 월 줄이 2개 이상 이어질 때만
    if (b.month) {
      let j = i
      const items = []
      while (j < blocks.length && blocks[j].month) { items.push({ lead: blocks[j].lead, text: blocks[j].text }); j++ }
      if (items.length >= 2) { out.push({ type: 'timeline', items }); i = j - 1; continue }
    }
    // 비교: ✅ 소제목 + 본문, 바로 이어지는 ⚠️ 소제목 + 본문
    if (b.type === 'h3' && b.text.startsWith('✅')) {
      let j = i + 1
      const left = []
      while (j < blocks.length && (blocks[j].type === 'p' || blocks[j].type === 'li') && !blocks[j].month) { left.push(blocks[j]); j++ }
      if (left.length && j < blocks.length && blocks[j].type === 'h3' && blocks[j].text.startsWith('⚠️')) {
        const rightHead = blocks[j]
        let k = j + 1
        const right = []
        while (k < blocks.length && (blocks[k].type === 'p' || blocks[k].type === 'li') && !blocks[k].month) { right.push(blocks[k]); k++ }
        const chars = [...left, ...right].reduce((n, x) => n + (x.text || '').length, 0)
        if (right.length && chars <= COMPARE_MAX_CHARS) {
          out.push({ type: 'compare', left: { head: b.text, items: left }, right: { head: rightHead.text, items: right } })
          i = k - 1; continue
        }
      }
    }
    // 단계: 단계/순서 소제목 바로 아래 번호 항목이 2개 이상
    if (b.type === 'h3' && STEP_HEAD_RE.test(b.text)) {
      let j = i + 1
      const items = []
      while (j < blocks.length && blocks[j].type === 'li') { items.push(blocks[j]); j++ }
      if (items.length >= 2) {
        out.push(b)
        out.push({ type: 'steps', items: items.map(x => { const m = x.text.match(/^(\d+)\.\s*(.*)$/); return { n: m ? m[1] : '', text: m ? m[2] : x.text } }) })
        i = j - 1; continue
      }
    }
    out.push(b)
  }
  return out
}

export const stripMarker = (t) => String(t || '').replace(/^[\u{1F300}-\u{1FAFF}☀-➿️\s]+/u, '').trim()
