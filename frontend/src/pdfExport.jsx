import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { parseContentBlocks } from './contentBlocks.js'
import { ContentBlock, SectionHead, ReportSummary, TimelineItem, StepItem, BRACKET_SECTIONS } from './reportBlocks.jsx'

// ───────────────────────── "다운로드 PDF" (이미지 방식) ─────────────────────────
// 화면을 통째로 캡처해 자르지 않는다. 결과 내용을 A4 전용 문서로 다시 그린 뒤(웹과 같은 본문 컴포넌트·CSS),
// 블록(제목/문단/강조상자) 단위로 페이지를 나눠 한 페이지씩 이미지로 넣는다.
// → 본문은 인쇄 크기(약 12.7pt)로 유지되고, 문단·강조상자는 쪽 사이에서 잘리지 않으며, 제목은 항상 다음 문단과 같은 쪽에 놓인다.
//   한글은 브라우저가 직접 그리므로 글꼴이 빠지지 않는다. (글자 선택·검색이 필요하면 화면의 "인쇄 · PDF로 저장"을 쓴다.)
const PDF_PAGE_W = 794
const PDF_PAGE_H = 1123
const PDF_TOP = 56          // 2쪽 이후 본문 시작 위치
const PDF_HERO_GAP = 28     // 1쪽 상단 띠 아래 간격
const PDF_BOTTOM = 84       // 푸터 영역
const PDF_LONG_PARA = 220   // 이보다 긴 문단은 문장 경계에서 나눠 쪽 사이에서 자연스럽게 이어지게 한다
const PDF_CHUNK = 170       // 나눈 덩어리의 목표 길이(글자). 2~4줄 정도

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

// 측정용 DOM: 페이지로 나눌 수 있는 모든 블록을 평평하게 늘어놓는다.
function PdfBlocks({ hero, items }) {
  const nodes = []
  let k = 0
  let sec = 0
  nodes.push(
    <div key={k++} className="pdf-hero" data-hero="1">
      <p className="rpt-eyebrow">{hero.eyebrow}</p>
      <h1 className="rpt-title">{hero.title}</h1>
      {hero.subtitle ? <p className="rpt-sub">{hero.subtitle}</p> : null}
    </div>
  )
  items.forEach(it => {
    if (it.kind === 'img') {
      sec++
      nodes.push(<div key={k++} className="pdf-blk" data-sec={sec}><img className="pdf-img" src={it.src} style={{ width: `min(100%, ${it.w}px)` }} alt="" /></div>)
    } else if (it.kind === 'summary') {
      sec++
      nodes.push(<div key={k++} className="pdf-blk pdf-summary" data-sec={sec}><ReportSummary data={it.data} /></div>)
    } else if (it.kind === 'label') {
      sec++
      nodes.push(<div key={k++} className="pdf-blk pdf-head pdf-label" data-keep="1" data-sec={sec}><p className="rpt-kicker" style={{ textAlign: 'center', marginBottom: 0 }}>{it.text}</p></div>)
    } else if (it.kind === 'section') {
      sec++
      nodes.push(<div key={k++} className="pdf-blk pdf-head" data-keep="1" data-sec={sec}><SectionHead title={it.title} part={it.part} /></div>)
      const parsed = BRACKET_SECTIONS.has(it.title)
        ? it.content.split(/(\[.+?\]\n)/g).flatMap(part => {
            const m = part.match(/^\[(.+?)\]\n$/)
            return m ? [{ type: 'h3', text: '✦ ' + m[1] }] : parseContentBlocks(part)
          })
        : parseContentBlocks(it.content)
      parsed.forEach(b => {
        if (b.type === 'p' || b.type === 'li') {
          const chunks = splitLongParagraph(b)
          chunks.forEach((c, ci) => nodes.push(
            <div key={k++} className={'pdf-blk' + (ci < chunks.length - 1 ? ' pdf-cont' : '')} data-sec={sec} data-cont={ci < chunks.length - 1 ? '1' : undefined}><ContentBlock b={c} /></div>
          ))
        } else if (b.type === 'timeline') {
          b.items.forEach(x => nodes.push(<div key={k++} className="pdf-blk" data-sec={sec}><TimelineItem lead={x.lead} text={x.text} /></div>))
        } else if (b.type === 'steps') {
          b.items.forEach(x => nodes.push(<div key={k++} className="pdf-blk" data-sec={sec}><StepItem n={x.n} text={x.text} /></div>))
        } else {
          nodes.push(<div key={k++} className="pdf-blk" data-sec={sec} data-keep={b.type === 'h3' ? '1' : undefined}><ContentBlock b={b} /></div>)
        }
      })
    }
  })
  return <>{nodes}</>
}

function measureTopSpace(el) {
  const cs = getComputedStyle(el)
  const first = el.firstElementChild
  return (parseFloat(cs.paddingTop) || 0) + (first ? parseFloat(getComputedStyle(first).marginTop) || 0 : 0)
}

// blocks: [{ el, h, topPad, keep, sec, cont }] → 페이지별 배열.
// - 제목류(keep)는 바로 뒤 본문 한 덩어리와 같은 쪽에 둔다(섹션 전체를 묶지 않는다).
// - 문단은 문장 경계로 이미 잘게 나뉘어 있어 쪽 끝에서 자연스럽게 이어진다.
// - 섹션의 마지막 블록 하나만 다음 쪽 맨 위로 넘어가면, 직전 블록을 함께 넘겨 외톨이를 막는다(예: 마지막 달만 덩그러니).
export function paginateBlocks(blocks, heroH, pageH = PDF_PAGE_H) {
  const avail = pageH - PDF_TOP - PDF_BOTTOM
  const pages = [{ list: [], limit: avail - (heroH + PDF_HERO_GAP - PDF_TOP), used: 0 }]
  const blockH = (b, first) => b.h - (first ? b.topPad : 0)
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    let page = pages[pages.length - 1]
    const first = page.list.length === 0
    // 이 블록(제목이면 뒤따르는 본문 한 덩어리까지)이 들어갈 높이
    let need = blockH(b, first)
    if (b.keep) {
      let j = i
      while (blocks[j].keep && blocks[j + 1]) { j++; need += blocks[j].h }
    }
    if (!first && page.used + need > page.limit) {
      const next = blocks[i + 1]
      const isSecTail = !b.keep && (!next || next.sec !== b.sec)
      const prev = page.list[page.list.length - 1]
      const beforePrev = page.list[page.list.length - 2]
      const carry = []
      // 섹션 꼬리 외톨이 방지: 직전 블록이 제목이 아니고, 이어진 문단 조각이 아니며, 그 앞이 제목이 아닐 때만(제목만 남기지 않도록) 함께 넘김
      if (isSecTail && prev && prev.sec === b.sec && !prev.keep && !prev.cont && page.list.length > 1 && !(beforePrev && beforePrev.keep)) {
        carry.push(page.list.pop())
        page.used -= blockH(carry[0], page.list.length === 0)
      }
      page = { list: [], limit: avail, used: 0 }
      pages.push(page)
      carry.forEach(c => { page.list.push({ ...c, first: page.list.length === 0 }); page.used += blockH(c, page.list.length === 1) })
    }
    const nowFirst = page.list.length === 0
    page.list.push({ ...b, first: nowFirst })
    page.used += blockH(b, nowFirst)
  }
  return pages
}

// items: { kind: 'card', selector } | { kind: 'summary', data } | { kind: 'label', text } | { kind: 'section', title, content, part }
export async function exportResultPDF({ filename, eyebrow = 'MYSAJU REPORT', title, subtitle = '', items }) {
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => window.jspdf)
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => window.html2canvas)
  if (document.fonts) {
    try {
      await Promise.all(['400 17px', '700 19px', '800 25px'].map(f => document.fonts.load(f + ' Pretendard', '가나다라마바사')))
      await document.fonts.ready
    } catch {}
  }

  // 1) 사주팔자·점수 차트 같은 그림 카드는 이미지로 한 번만 떠서 문서에 넣는다.
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
  measure.className = 'pdf-measure pdf-doc'
  stage.appendChild(measure)
  const root = createRoot(measure)
  try {
    flushSync(() => root.render(<PdfBlocks hero={{ eyebrow, title, subtitle }} items={resolved} />))
    await Promise.all(Array.from(measure.querySelectorAll('img')).map(img => (img.decode ? img.decode().catch(() => {}) : null)))

    // 상단 띠는 본문 폭(666px)이 아니라 페이지 폭 전체에 그려지므로, 전체 폭으로 다시 그려 높이를 잰다.
    const heroEl = measure.querySelector('[data-hero="1"]')
    let heroH = 0
    if (heroEl) {
      const probe = document.createElement('div')
      probe.className = 'pdf-doc'; probe.style.width = PDF_PAGE_W + 'px'
      probe.appendChild(heroEl.cloneNode(true)); stage.appendChild(probe)
      heroH = probe.getBoundingClientRect().height
      probe.remove()
    }
    const blocks = Array.from(measure.children)
      .filter(el => el !== heroEl)
      .map(el => ({ el, h: el.getBoundingClientRect().height, topPad: measureTopSpace(el), keep: el.dataset.keep === '1', sec: el.dataset.sec, cont: el.dataset.cont === '1' }))
    const pages = paginateBlocks(blocks, heroH)

    const { jsPDF } = window.jspdf
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    for (let pi = 0; pi < pages.length; pi++) {
      const pageEl = document.createElement('div')
      pageEl.className = 'pdf-page pdf-doc'
      if (pi === 0 && heroEl) pageEl.appendChild(heroEl.cloneNode(true))
      const body = document.createElement('div')
      body.className = 'pdf-body'
      body.style.paddingTop = (pi === 0 ? PDF_HERO_GAP : PDF_TOP) + 'px'
      pages[pi].list.forEach(b => {
        const node = b.el.cloneNode(true)
        if (b.first && b.topPad) node.style.marginTop = (-b.topPad) + 'px'
        body.appendChild(node)
      })
      pageEl.appendChild(body)
      const footer = document.createElement('div')
      footer.className = 'pdf-footer'
      footer.innerHTML = '<span>마이사주 · mysaju.shop</span><span>' + (pi + 1) + ' / ' + pages.length + '</span>'
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
