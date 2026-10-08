import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { parseContentBlocks, stripMarker } from './contentBlocks.js'
import { ContentBlock, SectionHead, ActionItem, ReportSummary, ReportTable, ClosingBlock, TimelineItem, StepItem, BRACKET_SECTIONS } from './reportBlocks.jsx'
import SajuTable, { TypeInfoNote } from './SajuTable.jsx'
import { FullDashboard, FullSummary, unitsForSection } from './FullReport.jsx'

// ───────────────────────── "다운로드 PDF" (이미지 방식) ─────────────────────────
// 화면을 통째로 캡처해 자르지 않는다. 결과 내용을 A4 전용 문서로 다시 그린 뒤(웹과 같은 본문 컴포넌트·CSS),
// 블록(제목/문단/표/강조상자) 단위로 페이지를 나눠 한 페이지씩 이미지로 넣는다.
// → 본문은 인쇄 크기(약 12.7pt)로 유지되고, 문단·강조상자·표는 쪽 사이에서 잘리지 않으며, 제목은 항상 다음 문단과 같은 쪽에 놓인다.
//   한글은 브라우저가 직접 그리므로 글꼴이 빠지지 않는다. (글자 선택·검색이 필요하면 화면의 "인쇄 · PDF로 저장"을 쓴다.)
//
// 쪽 나누기 규칙(paginateBlocks):
//  1) 제목(keep)은 바로 뒤 본문 한 덩어리와 같은 쪽.
//  2) 짧은 소제목 묶음(소제목 + 문단·번호 항목·강조상자)과 짧은 섹션은 한 덩어리로 유지 — 쪽 높이의 40% / 30% 이하일 때만.
//     그보다 긴 것, 또는 통째로 넘기면 쪽 아래가 28% 넘게 비는 것은 문단·번호 항목 사이에서 나누고, 이어지는 쪽 맨 위에 '소제목 — 이어서'를 붙인다.
//     표는 행 단위로 나뉘며 이어지는 쪽에 제목('— 이어서')과 머리글이 다시 붙는다.
//  3) 섹션의 마지막 블록 하나만 다음 쪽에 떨어지지 않게 한다.
const PDF_PAGE_W = 794
const PDF_PAGE_H = 1123
const PDF_TOP = 56          // 2쪽 이후 본문 시작 위치
const PDF_HERO_GAP = 28     // 1쪽 상단 띠 아래 간격
const PDF_BOTTOM = 84       // 푸터 영역
const PDF_LONG_PARA = 220   // 이보다 긴 문단은 문장 경계에서 나눠 쪽 사이에서 자연스럽게 이어지게 한다
const PDF_CHUNK = 170       // 나눈 덩어리의 목표 길이(글자). 2~4줄 정도
const PDF_CONT_H = 42       // '— 이어서' 줄 높이(index.css .pdf-cont-label: 높이 34 + 아래 여백 8)
const GROUP_KEEP = 0.40     // 소제목 묶음이 이 비율(본문 높이 대비) 이하면 한 쪽에 통째로
const SEC_KEEP = 0.30       // 섹션이 이 비율 이하면 한 쪽에 통째로
const MAX_GAP = 0.28        // 덩어리를 통째로 넘기느라 쪽 아래가 본문 높이의 이 비율보다 더 비면, 덩어리를 지키지 않고 항목 사이에서 나눈다
const LAST_PAGE_MIN = 0.35    // 마지막 쪽이 이 비율 미만이면 앞 쪽 끝의 섹션 하나를 함께 옮겨 균형을 맞춘다
const PREV_PAGE_MIN = 0.40    // 옮기고 나서도 앞 쪽은 이 비율 이상 차 있어야 한다
const TABLE_HEAD_H = 90     // 이어지는 표 행이 쪽 맨 위에 올 때 다시 붙는 제목 + 머리글 높이(index.css .rpt-table-title + th)

function loadScriptOnce(src, check) {
  if (check()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(src.split('/').pop() + ' 로드 실패'))
    document.head.appendChild(s)
  })
}

export function splitLongParagraph(item) {
  const text = item.text || ''
  if (text.length <= PDF_LONG_PARA || item.lead) return [item]
  const sentences = text.match(/[^.!?。]+[.!?。]?["”')\]]?\s*/g) || [text]
  const chunks = []
  let cur = ''
  for (const sn of sentences) {
    if (cur && (cur + sn).length > PDF_CHUNK) { chunks.push(cur.trim()); cur = '' }
    cur += sn
  }
  if (cur.trim()) {
    // 마지막 덩어리가 너무 짧으면(한두 줄 미만) 앞 덩어리에 붙인다
    if (chunks.length && cur.trim().length < PDF_CHUNK * 0.45) chunks[chunks.length - 1] += ' ' + cur.trim()
    else chunks.push(cur.trim())
  }
  return chunks.map(c => ({ ...item, text: c }))
}

// 월별 운세(타임라인)를 1~6월 / 7~12월 두 덩어리로 나눈다. 월이 읽히지 않으면 null(원래대로 한 줄씩).
// 연도는 첫 줄의 '2027년 1월:' 에서만 읽는다(없으면 연도 없이 '1~6월').
export function splitMonthGroups(items) {
  const parsed = items.map(it => {
    const m = String(it.lead || '').match(/^(?:(\d{4})년\s*)?(\d{1,2})월/)
    return m ? { year: m[1] || '', month: Number(m[2]), it } : null
  })
  if (!parsed.length || parsed.some(p => !p || p.month < 1 || p.month > 12)) return null
  const year = (parsed.find(p => p.year) || {}).year || ''
  const strip = p => ({ ...p.it, lead: p.it.lead.replace(/^\d{4}년\s*/, '') })
  const firstHalf = parsed.filter(p => p.month <= 6).map(strip)
  const secondHalf = parsed.filter(p => p.month > 6).map(strip)
  const y = year ? year + '년 ' : ''
  const groups = []
  if (firstHalf.length) groups.push({ title: `${y}1~6월`, items: firstHalf })
  if (secondHalf.length) groups.push({ title: `${y}7~12월`, items: secondHalf })
  return groups
}

// 문서 계획: 페이지로 나눌 수 있는 블록(노드 + 쪽 나누기용 정보)을 평평하게 늘어놓는다. DOM 에 의존하지 않는다.
// meta: sec(섹션 번호) / group(소제목 묶음 번호) / keep(바로 뒤 블록과 함께) / cont(쪼갠 문단의 앞 조각) / groupHead(이어서 표시에 쓸 이름)
export function buildPdfPlan(items) {
  const plan = []
  let k = 0
  let sec = 0
  const add = (node, meta) => plan.push({ node, meta })
  const blk = (cls, children, meta) => add(<div key={k++} className={'pdf-blk' + (cls ? ' ' + cls : '')}>{children}</div>, meta)
  items.forEach(it => {
    if (it.kind === 'img') {
      sec++
      blk('', <img className="pdf-img" src={it.src} style={{ width: `min(100%, ${it.w}px)` }} alt="" />, { sec, group: `${sec}.0` })
    } else if (it.kind === 'saju') {
      sec++
      if (it.full) blk('pdf-head', <FullDashboard pillars={it.pillars} typeInfo={it.typeInfo} typeId={null} />, { sec, group: `${sec}.0` })
      else blk('pdf-head', (
        <section aria-label="내 사주 한눈에">
          <h2 className="rpt-h2">내 사주 한눈에</h2>
          <SajuTable pillars={it.pillars} />
          {it.typeInfo ? <TypeInfoNote typeInfo={it.typeInfo} /> : null}
        </section>
      ), { sec, group: `${sec}.0` })
    } else if (it.kind === 'summary') {
      sec++
      if (it.full) blk('pdf-summary', <FullSummary data={it.data} />, { sec, group: `${sec}.0` })
      else blk('pdf-summary', <ReportSummary data={it.data} />, { sec, group: `${sec}.0` })
    } else if (it.kind === 'table') {
      sec++
      const t = it.table
      if (t.rows.length <= 2) blk('', <ReportTable title={t.title} cols={t.cols} rows={t.rows} note={t.note} display={t.display} />, { sec, group: `${sec}.t`, keepAll: true })
      else t.rows.forEach((row, ri) => {
        const last = ri === t.rows.length - 1
        blk('', <ReportTable className={'rpt-tchunk' + (ri > 0 ? ' rpt-tchunk-cont' : '') + (last ? ' rpt-tchunk-last' : '')} title={t.title} cols={t.cols} rows={[row]} rowOffset={ri} cont={ri > 0} note={last ? t.note : null} display={t.display} />,
          { sec, group: `${sec}.t`, tcont: ri > 0, keepAll: true })
      })
    } else if (it.kind === 'closing') {
      sec++
      blk('pdf-head', <ClosingBlock closing={it.closing} />, { sec, group: `${sec}.0` })
    } else if (it.kind === 'label') {
      sec++
      blk('pdf-head pdf-label', <p className="rpt-kicker" style={{ textAlign: 'center', marginBottom: 0 }}>{it.text}</p>, { sec, group: `${sec}.0`, keep: true })
    } else if (it.kind === 'actions') {
      sec++
      blk('pdf-head', <SectionHead title={it.title} part={it.part} />, { sec, group: `${sec}.0`, keep: true, groupHead: stripMarker(it.title) })
      it.actions.forEach((a, i) => blk('', <ActionItem a={a} last={i === it.actions.length - 1} />, { sec, group: `${sec}.0`, groupHead: stripMarker(it.title) }))
    } else if (it.kind === 'section') {
      sec++
      let g = 0
      let head = stripMarker(it.title)
      const gid = () => `${sec}.${g}`
      blk('pdf-head', <SectionHead title={it.title} part={it.part} />, { sec, group: gid(), keep: true, groupHead: head })
      // 전체 분석: 한눈에 보는 카드(각각 한 쪽 안에서 잘리지 않는 단위)를 본문 앞에 놓는다. 결론 페이지·태그가 본문을 완전히 대신할 때만 본문을 생략한다.
      const fu = it.full ? unitsForSection(it.title, it.content) : { units: [], replaceBody: false }
      if (fu.replaceBody && fu.units.length && it.kind === 'section') {
        // 결론 페이지: 카드마다 한 블록(각각 한 쪽 안에서 잘리지 않는 단위)으로 놓고 keepAll 로 묶어, 한 쪽에 들어가면 통째로 한 쪽에 모은다.
        // 제목+카드 전체가 한 쪽보다 길면 카드 사이에서 나누되, 제목과 첫 카드(머리글 한 줄 + 첫 카드)는 반드시 같은 쪽에 둔다(제목만 쪽 끝에 홀로 남지 않게).
        // 카드가 4장 이상이면 마지막 두 카드(행동 조언 + 마지막 한 문장)는 한 블록으로 묶어, 마지막 한 문장만 홀로 다음 쪽에 남지 않게 한다.
        const tailStart = fu.units.length > 3 ? fu.units.length - 2 : fu.units.length
        const cardChunks = [...fu.units.slice(0, tailStart).map((u) => [u]), ...(tailStart < fu.units.length ? [fu.units.slice(tailStart)] : [])]
        cardChunks.forEach((chunk, ci) => blk('', <div className="fa-units">{chunk.map((u) => <div key={u.key} className="fa-unit">{u.node}</div>)}</div>, { sec, group: `${sec}.o`, keepAll: true, groupHead: stripMarker(it.title), ...(ci === 0 && cardChunks.length > 1 ? { keep: true } : {}) }))
        return
      }
      // 추천 직업 카드 1·2·3은 한 쪽에 함께 둔다(별도 묶음 + keepAll). 환경 비교 카드 등 나머지는 기존처럼 이어서 놓는다.
      fu.units.forEach((u) => blk('', u.node, /^job\d/.test(u.key)
        ? { sec, group: `${sec}.j`, keepAll: true, groupHead: stripMarker(it.title) }
        : { sec, group: `${sec}.o`, groupHead: stripMarker(it.title) }))
      if (fu.replaceBody) return
      const parsed = BRACKET_SECTIONS.has(it.title)
        ? it.content.split(/(\[.+?\]\n)/g).flatMap(part => {
            const m = part.match(/^\[(.+?)\]\n$/)
            return m ? [{ type: 'h3', text: '✦ ' + m[1] }] : parseContentBlocks(part)
          })
        : parseContentBlocks(it.content)
      parsed.forEach((b, bi) => {
        if (b.type === 'h3') {
          g++; head = stripMarker(b.text).replace(/^✦\s*/, '')
          blk('', <ContentBlock b={b} />, { sec, group: gid(), keep: true, groupHead: head })
        } else if (b.type === 'p' || b.type === 'li') {
          const chunks = splitLongParagraph(b)
          chunks.forEach((c, ci) => blk(ci < chunks.length - 1 ? 'pdf-cont' : '', <ContentBlock b={c} />, { sec, group: gid(), cont: ci < chunks.length - 1, groupHead: head, ...(it.full && titleLi(b, parsed[bi + 1]) && ci === chunks.length - 1 ? { keep: true } : {}) }))
        } else if (b.type === 'timeline') {
          const months = splitMonthGroups(b.items)
          if (months) {
            months.forEach(mg => {
              g++
              blk('pdf-month-group', (
                <>
                  <h3 className="rpt-h3">{mg.title}</h3>
                  <div className="rpt-timeline-wrap">{mg.items.map((x, xi) => <TimelineItem key={xi} lead={x.lead} text={x.text} />)}</div>
                </>
              ), { sec, group: gid(), groupHead: mg.title })
            })
          } else b.items.forEach(x => blk('', <TimelineItem lead={x.lead} text={x.text} />, { sec, group: gid(), groupHead: head }))
        } else if (b.type === 'steps') {
          b.items.forEach(x => blk('', <StepItem n={x.n} text={x.text} />, { sec, group: gid(), groupHead: head }))
        } else {
          blk('', <ContentBlock b={b} />, { sec, group: gid(), groupHead: head })
        }
      })
    }
  })
  return plan
}

// 전체 분석: 직업 제목처럼 짧은 번호 줄('1. 품질관리·회계검토')은 바로 뒤 설명 문단과 같은 쪽에 둔다(제목만 쪽 아래에 남지 않게).
const titleLi = (b, next) => b.type === 'li' && b.text.length <= 90 && /^\d+\./.test(b.text) && !!next && next.type === 'p'

function measureTopSpace(el) {
  const cs = getComputedStyle(el)
  const first = el.firstElementChild
  return (parseFloat(cs.paddingTop) || 0) + (first ? parseFloat(getComputedStyle(first).marginTop) || 0 : 0)
}

// blocks: [{ h, topPad, keep, sec, group, cont, groupHead }] → 페이지별 { list, limit, used, contLabel }.
// 규칙은 파일 위쪽 설명 참고. 한 덩어리가 한 쪽보다 길면 어쩔 수 없이 그 안에서 나눈다.
export function paginateBlocks(blocks, heroH, pageH = PDF_PAGE_H) {
  const avail = pageH - PDF_TOP - PDF_BOTTOM
  const n = blocks.length
  const glue = new Array(n).fill(false)   // glue[i] = true 면 i-1 과 i 사이에서 쪽을 나누지 않는다
  for (let i = 1; i < n; i++) if (blocks[i - 1].keep) glue[i] = true
  const glueUnit = (key, maxH) => {
    let s = 0
    while (s < n) {
      if (blocks[s][key] == null) { s++; continue }
      let e = s, sum = 0
      while (e < n && blocks[e][key] === blocks[s][key]) { sum += blocks[e].h; e++ }
      if (sum <= maxH) for (let i = s + 1; i < e; i++) glue[i] = true
      s = e
    }
  }
  glueUnit('group', avail * GROUP_KEEP)
  glueUnit('sec', avail * SEC_KEEP)

  const blockH = (b, first) => b.h - (first ? b.topPad : 0)
  const keepGlue = new Array(n).fill(false)
  for (let i = 1; i < n; i++) if (blocks[i - 1].keep) keepGlue[i] = true
  // 흐름·선택·행동 표(keepAll)는 한 쪽보다 길지 않은 한 한 쪽에 모은다 — 통째로 넘기느라 공백이 생겨도 한눈에 비교하는 것을 우선한다
  for (let s0 = 0; s0 < n;) {
    if (!blocks[s0].keepAll || blocks[s0].group == null) { s0++; continue }
    let e = s0, sum = 0
    while (e < n && blocks[e].group === blocks[s0].group) { sum += blocks[e].h; e++ }
    if (sum <= avail) for (let i = s0 + 1; i < e; i++) { glue[i] = true; keepGlue[i] = true }
    s0 = e
  }
  const newPage = (limit, contLabel) => ({ list: [], limit, used: contLabel ? PDF_CONT_H : 0, contLabel: contLabel || null })
  const pages = [newPage(avail - (heroH + PDF_HERO_GAP - PDF_TOP), null)]
  const put = (page, b, idx) => {
    const first = page.list.length === 0
    const showHead = first && !!b.tcont     // 이어지는 표 행이 쪽 맨 위에 오면 제목·머리글을 다시 붙인다
    page.list.push({ ...b, idx, first, showHead })
    page.used += blockH(b, first) + (showHead ? TABLE_HEAD_H : 0)
  }
  const usedBefore = (page, count) => page.list.slice(0, count).reduce((sum, x, xi) => sum + blockH(x, xi === 0) + (x.showHead ? TABLE_HEAD_H : 0), page.contLabel ? PDF_CONT_H : 0)
  for (let i = 0; i < n; i++) {
    const b = blocks[i]
    let page = pages[pages.length - 1]
    if (page.list.length === 0 || page.used + blockH(b, false) <= page.limit) { put(page, b, i); continue }

    const start = page.list[0].idx
    let j = i
    while (j > start && glue[j]) j--          // 함께 있어야 하는 덩어리의 맨 앞으로 되돌아간다
    if (j === start) j = i                     // 덩어리가 한 쪽보다 길면 여기서 나눈다
    if (j < i && page.limit - usedBefore(page, j - start) > MAX_GAP * avail) {
      // 덩어리를 통째로 넘기면 쪽 아래가 너무 비므로, 제목 묶음(keep)만 지키고 항목 사이에서 나눈다
      let k = i
      while (k > start && keepGlue[k]) k--
      j = k === start ? i : k
    }
    if (j === i) {
      // 섹션 꼬리 외톨이 방지: 섹션의 마지막 블록 하나만 넘어가면 직전 블록을 함께 넘긴다(예: 마지막 달만 덩그러니)
      const next = blocks[i + 1]
      const isGroupTail = !b.keep && (!next || next.sec !== b.sec || next.group !== b.group)
      const prev = blocks[i - 1]
      if (isGroupTail && prev && prev.sec === b.sec && prev.group === b.group && !prev.keep && !prev.cont && !prev.keepAll && i - 1 > start) {
        j = i - 1
        while (j > start && keepGlue[j]) j--        // 직전 블록이 제목 바로 뒤라면 제목까지 함께 넘긴다(제목만 남지 않게)
        if (j === start) j = i
      }
    }
    page.list.splice(j - start)
    page.used = usedBefore(page, page.list.length)
    // 같은 소제목 묶음 안에서 이어지면 이어지는 쪽 맨 위에 '소제목 — 이어서'
    const a = blocks[j - 1], c = blocks[j]
    const label = a && c && a.group != null && a.group === c.group && !c.keep && c.groupHead ? c.groupHead : null
    page = newPage(avail, label)
    pages.push(page)
    i = j - 1                                  // 넘긴 블록부터 새 쪽에서 다시 놓는다
  }
  // 마지막 쪽 균형: 마지막 쪽이 본문 높이의 35% 미만이면(짧은 문단만 외롭게 남는 경우) 직전 쪽 끝의 섹션 하나를 통째로 마지막 쪽으로 옮긴다.
  // 직전 쪽이 40% 아래로 비거나, 마지막 쪽이 넘치거나, 표·이어지는 묶음이 섞여 있으면 옮기지 않는다. 쪽 수를 줄이거나 고정하려는 것이 아니다.
  const last = pages[pages.length - 1]
  if (pages.length >= 2 && !last.contLabel && last.list.length && last.used < LAST_PAGE_MIN * avail) {
    const prev = pages[pages.length - 2]
    const tailSec = prev.list[prev.list.length - 1].sec
    let k = prev.list.length - 1
    while (k > 0 && prev.list[k - 1].sec === tailSec) k--
    const unit = prev.list.slice(k)
    const uh = unit.reduce((sum, x, xi) => sum + blockH(x, false), 0)
    if (k > 0 && unit[0].keep && unit.every((x) => !x.tcont && !x.keepAll) && last.used + uh <= avail && prev.used - uh >= PREV_PAGE_MIN * avail) {
      prev.list = prev.list.slice(0, k)
      prev.used = usedBefore(prev, prev.list.length)
      last.list = [...unit, ...last.list].map((x, xi) => ({ ...x, first: xi === 0, showHead: false }))
      last.used = usedBefore(last, last.list.length)
    }
  }
  return pages
}

function PdfHero({ hero }) {
  return (
    <div className="pdf-hero" data-hero="1">
      <p className="rpt-eyebrow">{hero.eyebrow}</p>
      <h1 className="rpt-title">{hero.title}</h1>
      {hero.subtitle ? <p className="rpt-sub">{hero.subtitle}</p> : null}
    </div>
  )
}

function PdfBlocks({ hero, plan }) {
  return <><PdfHero hero={hero} />{plan.map(p => p.node)}</>
}

// items: { kind: 'card', selector } | { kind: 'saju', pillars, typeInfo } | { kind: 'summary', data } | { kind: 'table', table } | { kind: 'closing', closing }
//      | { kind: 'label', text } | { kind: 'section', title, content, part }
export async function exportResultPDF({ filename, eyebrow = 'MYSAJU REPORT', title, subtitle = '', footerLabel = '', items, docClass = '' }) {
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => window.jspdf)
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => window.html2canvas)
  if (document.fonts) {
    try {
      await Promise.all([['400 17px', '가나다라마바사'], ['700 19px', '가나다라마바사'], ['800 25px', '가나다라마바사'], ['800 46px', '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥']].map(([f, t]) => document.fonts.load(f + ' Pretendard', t)))
      await document.fonts.load('800 46px "Noto Sans KR"', '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥')   // 천간·지지 한자(Pretendard 에 없음) — index.html 의 작은 글꼴
      await document.fonts.ready
    } catch {}
  }

  // 1) 점수 차트 같은 그림 카드는 이미지로 한 번만 떠서 문서에 넣는다. (사주표는 카드가 아니라 문서 안에서 직접 그린다)
  const resolved = []
  for (const it of items) {
    if (it.kind !== 'card') { resolved.push(it); continue }
    const el = document.querySelector(it.selector)
    if (!el) continue
    const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true, logging: false })
    resolved.push({ kind: 'img', src: canvas.toDataURL('image/png'), w: Math.round(canvas.width / 2) })
  }

  const stage = document.createElement('div')
  stage.className = 'pdf-stage'
  stage.setAttribute('aria-hidden', 'true')
  stage.style.colorScheme = 'light'   // 화면 테마와 무관하게 밝은 문서로 캡처한다 (index.css .pdf-stage 도 같은 값을 흰 바탕·진한 글자로 지정)
  document.body.appendChild(stage)
  const measure = document.createElement('div')
  measure.className = 'pdf-measure pdf-doc' + (docClass ? ' ' + docClass : '')
  stage.appendChild(measure)
  const root = createRoot(measure)
  try {
    const plan = buildPdfPlan(resolved)
    flushSync(() => root.render(<PdfBlocks hero={{ eyebrow, title, subtitle }} plan={plan} />))
    await Promise.all(Array.from(measure.querySelectorAll('img')).map(img => (img.decode ? img.decode().catch(() => {}) : null)))

    // 상단 띠는 본문 폭(666px)이 아니라 페이지 폭 전체에 그려지므로, 전체 폭으로 다시 그려 높이를 잰다.
    const heroEl = measure.querySelector('[data-hero="1"]')
    let heroH = 0
    if (heroEl) {
      const probe = document.createElement('div')
      probe.className = 'pdf-doc' + (docClass ? ' ' + docClass : ''); probe.style.width = PDF_PAGE_W + 'px'
      probe.appendChild(heroEl.cloneNode(true)); stage.appendChild(probe)
      heroH = probe.getBoundingClientRect().height
      probe.remove()
    }
    const els = Array.from(measure.children).filter(el => el !== heroEl)
    const blocks = els.map((el, i) => ({ el, h: el.getBoundingClientRect().height, topPad: measureTopSpace(el), ...plan[i].meta }))
    const pages = paginateBlocks(blocks, heroH)

    const { jsPDF } = window.jspdf
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    for (let pi = 0; pi < pages.length; pi++) {
      const pageEl = document.createElement('div')
      pageEl.className = 'pdf-page pdf-doc' + (docClass ? ' ' + docClass : '')
      if (pi === 0 && heroEl) pageEl.appendChild(heroEl.cloneNode(true))
      const body = document.createElement('div')
      body.className = 'pdf-body'
      body.style.paddingTop = (pi === 0 ? PDF_HERO_GAP : PDF_TOP) + 'px'
      if (pages[pi].contLabel) {
        const lab = document.createElement('div')
        lab.className = 'pdf-cont-label'
        lab.textContent = pages[pi].contLabel + ' — 이어서'
        body.appendChild(lab)
      }
      pages[pi].list.forEach(b => {
        const node = b.el.cloneNode(true)
        if (b.showHead) node.querySelector('[data-report-table]')?.classList.add('rpt-tchunk-head')
        if (b.first && b.topPad) node.style.marginTop = (-b.topPad) + 'px'
        body.appendChild(node)
      })
      pageEl.appendChild(body)
      const footer = document.createElement('div')
      footer.className = 'pdf-footer'
      footer.innerHTML = '<span></span><span>' + (pi + 1) + ' / ' + pages.length + '</span>'
      footer.firstChild.textContent = '마이사주 · mysaju.shop' + (footerLabel ? ' · ' + footerLabel : '')
      pageEl.appendChild(footer)
      stage.appendChild(pageEl)
      const canvas = await window.html2canvas(pageEl, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true, logging: false, width: PDF_PAGE_W, height: PDF_PAGE_H, windowWidth: PDF_PAGE_W })
      if (pi > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, pageH)
      canvas.width = 0; canvas.height = 0
      pageEl.remove()
    }
    pdf.save(filename + '.pdf')
  } finally {
    root.unmount()
    stage.remove()
  }
}
