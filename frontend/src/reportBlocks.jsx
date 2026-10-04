import { parseContentBlocks } from './contentBlocks.js'

// 결과 화면·PDF 공통 본문 컴포넌트. 스타일은 index.css 의 .rpt-* 클래스에 있다(웹/인쇄/PDF가 같은 규칙을 쓴다).

export function ReportHero({ eyebrow = 'MYSAJU REPORT', title, sub }) {
  return (
    <header className="rpt-hero">
      <div className="rpt-inner">
        <p className="rpt-eyebrow">{eyebrow}</p>
        <h1 className="rpt-title">{title}</h1>
        {sub ? <p className="rpt-sub">{sub}</p> : null}
      </div>
    </header>
  )
}

// 화면 전용 작은 인쇄 버튼 — 브라우저 "인쇄 → PDF로 저장"(글자 선택·검색 가능). 인쇄물에는 나오지 않는다.
export function PrintButton() {
  return (
    <button type="button" className="rpt-print-btn no-print" onClick={() => window.print()}>
      인쇄 · PDF로 저장 (글자 선택 가능)
    </button>
  )
}

function ReportPara({ item }) {
  return <p className={'rpt-p' + (item.type === 'li' ? ' rpt-li' : '')}>{item.lead ? <span className="rpt-lead">{item.lead} </span> : null}{item.text}</p>
}

export function CompareBlock({ left, right }) {
  return (
    <div className="rpt-compare" role="group" aria-label="비교">
      <div className="rpt-compare-col rpt-compare-good">
        <p className="rpt-compare-label">{left.head}</p>
        {left.items.map((it, i) => <p key={i} className="rpt-compare-text">{it.text}</p>)}
      </div>
      <div className="rpt-compare-col rpt-compare-warn">
        <p className="rpt-compare-label">{right.head}</p>
        {right.items.map((it, i) => <p key={i} className="rpt-compare-text">{it.text}</p>)}
      </div>
    </div>
  )
}

export function TimelineItem({ lead, text }) {
  return (
    <ol className="rpt-timeline">
      <li><span className="rpt-tl-when">{lead}</span><span className="rpt-tl-text">{text}</span></li>
    </ol>
  )
}

export function StepItem({ n, text }) {
  return (
    <ol className="rpt-steps">
      <li><span className="rpt-step-n" aria-hidden="true">{n}</span><span className="rpt-step-text">{text}</span></li>
    </ol>
  )
}

export function ContentBlock({ b }) {
  if (b.type === 'h3') return <h3 className="rpt-h3">{b.text}</h3>
  if (b.type === 'lock') return <p className="rpt-lock">{b.text}</p>
  if (b.type === 'callout') {
    return (
      <div className="rpt-callout">
        {b.head ? <p className="rpt-callout-head">{b.head}</p> : null}
        {b.items.map((it, i) => <ReportPara key={i} item={it} />)}
      </div>
    )
  }
  if (b.type === 'compare') return <CompareBlock left={b.left} right={b.right} />
  if (b.type === 'timeline') return <div className="rpt-timeline-wrap">{b.items.map((it, i) => <TimelineItem key={i} lead={it.lead} text={it.text} />)}</div>
  if (b.type === 'steps') return <div className="rpt-steps-wrap">{b.items.map((it, i) => <StepItem key={i} n={it.n} text={it.text} />)}</div>
  return <ReportPara item={b} />
}

export function renderFormattedContent(text) {
  return parseContentBlocks(text).map((b, i) => <ContentBlock key={i} b={b} />)
}

export const BRACKET_SECTIONS = new Set(['이 아이에게 맞는 직업 방향', '추천학과 5개'])
export function renderBracketItems(text) {
  const parts = text.split(/(\[.+?\]\n)/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[(.+?)\]\n$/)
    if (m) return <h3 key={i} className="rpt-h3">✦ {m[1]}</h3>
    if (!part.trim()) return null
    return <div key={i}>{renderFormattedContent(part)}</div>
  })
}

// 결과 섹션: 카드/아코디언 없이 보고서처럼 이어서 읽는 본문 (part가 있으면 PART n 라벨)
export function SectionHead({ title, part }) {
  return (
    <>
      {part ? <p className="rpt-kicker">PART {part}</p> : null}
      <h2 className="rpt-h2">{title}</h2>
    </>
  )
}
export function ReportSection({ title, content, part }) {
  return (
    <section className="rpt-section">
      <SectionHead title={title} part={part} />
      {BRACKET_SECTIONS.has(title) ? renderBracketItems(content) : renderFormattedContent(content)}
    </section>
  )
}

// 핵심 요약 (인포그래픽): 핵심 한 문장 / 비교표 / 항목 목록 / 행동 강조상자. 값이 있는 것만 나온다.
export function ReportSummary({ data }) {
  if (!data) return null
  const singles = []
  if (data.strengthOnly) singles.push({ label: data.kind === 'gunghab' ? '잘 맞는 점' : '강점', text: data.strengthOnly })
  if (data.cautionOnly) singles.push({ label: data.kind === 'gunghab' ? '부딪히기 쉬운 점' : '주의할 점', text: data.cautionOnly })
  const rows = [...(data.rows || []), ...singles]
  return (
    <section className="rpt-summary" data-summary={data.kind} aria-label="핵심 요약">
      <p className="rpt-kicker">{data.title}</p>
      {data.headline ? <p className="rpt-sum-headline">{data.headline}</p> : null}
      {data.compare ? (
        <div className="rpt-compare" role="group" aria-label="비교">
          <div className="rpt-compare-col rpt-compare-good">
            <p className="rpt-compare-label">{data.compare.left.label}</p>
            <p className="rpt-compare-text">{data.compare.left.text}</p>
          </div>
          <div className="rpt-compare-col rpt-compare-warn">
            <p className="rpt-compare-label">{data.compare.right.label}</p>
            <p className="rpt-compare-text">{data.compare.right.text}</p>
          </div>
        </div>
      ) : null}
      {rows.length ? (
        <dl className="rpt-sum-rows">
          {rows.map(r => (
            <div key={r.label} className="rpt-sum-row">
              <dt>{r.label}</dt>
              <dd>{r.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {data.action ? (
        <div className="rpt-callout" style={{ marginBottom: 0 }}>
          <p className="rpt-callout-head">{data.actionLabel}</p>
          <p className="rpt-p" style={{ marginBottom: 0 }}>{data.action}</p>
        </div>
      ) : null}
    </section>
  )
}
