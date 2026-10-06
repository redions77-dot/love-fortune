import { useState } from 'react'
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

// 화면 전용 인쇄 버튼 — 브라우저 "인쇄 → PDF로 저장"(글자 선택·검색 가능). 인쇄물에는 나오지 않는다.
// 기본 화면에는 두지 않고 PdfSaveArea 의 '저장이 안 되나요?' 안내 안에서만 쓴다.
export function PrintButton() {
  return (
    <button type="button" className="rpt-print-btn no-print" onClick={() => window.print()}>
      인쇄 · PDF로 저장 (글자 선택 가능)
    </button>
  )
}

// 결과 화면의 저장 영역. 주요 버튼은 'PDF 저장하기' 하나뿐이고(기기 가림 없이 파일을 바로 만들어 내려받는 방식),
// 저장이 안 될 때만 '저장이 안 되나요?' 안내를 펼쳐 기존 인쇄 방식을 쓰게 한다. 화면 전용이라 PDF·인쇄물에는 나오지 않는다.
// onSave 는 성공하면 true, 실패하면 false 를 돌려주는 함수. beside 는 같은 줄 오른쪽에 놓을 버튼(예: 처음으로).
export function PdfSaveArea({ onSave, disabled = false, beside = null }) {
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const canPrint = typeof window !== 'undefined' && typeof window.print === 'function'   // 화면 크기가 아니라 브라우저가 인쇄를 지원하는지로 판단
  const save = async () => {
    if (saving || disabled) return
    setSaving(true); setFailed(false)
    let ok = false
    try { ok = (await onSave()) !== false } catch { ok = false }
    setSaving(false)
    if (!ok) { setFailed(true); setOpen(true) }
  }
  return (
    <div className="no-print" data-pdf-exclude="true" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" disabled={saving || disabled} onClick={save}
          style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 700, background: '#EEF3EA', border: '1px solid #E4E1D4', borderRadius: 10, cursor: saving || disabled ? 'default' : 'pointer', color: '#2F5D44', opacity: disabled ? 0.55 : 1 }}>
          {saving ? 'PDF 만드는 중… 잠시만 기다려주세요' : '📄 PDF 저장하기'}
        </button>
        {beside}
      </div>
      {failed && <p role="alert" style={{ fontSize: 13, color: '#C53A3A', textAlign: 'center', lineHeight: 1.6, margin: '10px 0 0', wordBreak: 'keep-all' }}>PDF를 만들지 못했어요. 아래 안내대로 저장해보세요.</p>}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button type="button" aria-expanded={open} aria-controls="pdf-save-help" onClick={() => setOpen(v => !v)}
          style={{ background: 'none', border: 'none', padding: '6px 8px', fontSize: 13, color: '#5F5E55', textDecoration: 'underline', cursor: 'pointer' }}>
          저장이 안 되나요?
        </button>
      </div>
      {open && (
        <div id="pdf-save-help" style={{ marginTop: 6, padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 10 }}>
          <p style={{ fontSize: 13, color: '#5F5E55', lineHeight: 1.7, margin: 0, wordBreak: 'keep-all' }}>
            PDF 파일이 만들어지지 않거나 저장 창이 열리지 않으면, 브라우저의 인쇄 기능으로 저장할 수 있어요. 글자를 선택하고 검색할 수 있는 PDF가 만들어져요.
          </p>
          {canPrint
            ? <PrintButton />
            : <p style={{ fontSize: 13, color: '#5F5E55', lineHeight: 1.7, margin: '10px 0 0', wordBreak: 'keep-all' }}>이 브라우저에서는 인쇄 기능을 쓸 수 없어요. Chrome이나 Safari에서 열어 다시 시도해주세요.</p>}
          <p style={{ fontSize: 12, color: '#5F5E55', lineHeight: 1.7, margin: '12px 0 0', wordBreak: 'keep-all' }}>
            📱 모바일에서는 PDF 저장이 되지 않을 수 있어요. 카카오톡·인스타그램 같은 앱 안에서 열었다면 Chrome이나 Safari로 열어 다시 시도하거나, PC에서 이용해주세요.
          </p>
        </div>
      )}
    </div>
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

// 표 (최대 4열): 머리글 진한 초록 · 본문 흰색/연한 초록 줄무늬. 칸은 문자열이거나 { main, sub } (sub 는 작은 보조 줄).
// 값이 없는 칸(null)은 '—'. 웹 모바일(좁은 화면)에서는 CSS 가 행을 카드로 바꾸되 칸 순서는 그대로다.
// cont 가 true 면 앞 쪽에서 이어지는 표(제목에 '— 이어서', 머리글 반복).
export function ReportTable({ title, cols, rows, note, cont = false, rowOffset = 0, display = 'table', className = '' }) {
  const cards = display === 'cards'     // 빈 칸이 많은 표: 행별 카드로 보여 주고 비어 있는 칸은 그리지 않는다('—' 반복 방지)
  if (!cols || !rows || !rows.length) return null
  return (
    <div className={'rpt-table-wrap ' + (cards ? 'rpt-as-cards ' : '') + className} data-report-table data-display={display}>
      {title ? <p className="rpt-table-title">{title}{cont ? ' — 이어서' : ''}</p> : null}
      <table className={'rpt-table cols-' + cols.length}>
        <colgroup>{cols.map((c) => <col key={c} />)}</colgroup>
        <thead><tr>{cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, ri) => {
            // 행 끝에서 빈 칸이 둘 이상 이어지면 마지막으로 채워진 칸을 그만큼 넓혀 '—' 가 나란히 반복되지 않게 한다(내용은 그대로)
            const filled = cols.map((_, ci) => { const v = r[ci]; return !!(v && typeof v === 'object' ? v.main : v) })
            const last = filled.lastIndexOf(true)
            const trailing = cols.length - 1 - last
            const spanAt = !cards && last >= 1 && trailing >= 2 ? last : -1
            return (
            <tr key={ri} className={(ri + rowOffset) % 2 === 1 ? 'rpt-row-even' : ''}>
              {cols.map((c, ci) => {
                if (spanAt >= 0 && ci > spanAt) return null
                const v = r[ci]
                const main = v && typeof v === 'object' ? v.main : v
                const sub = v && typeof v === 'object' ? v.sub : ''
                if (cards && ci > 0 && !main) return null
                return (
                  <td key={ci} data-label={c} colSpan={ci === spanAt ? trailing + 1 : undefined} className={ci === 0 ? 'rpt-td-key' : ''}>
                    {main ? <span className="rpt-td-main">{main}</span> : <span className="rpt-td-empty">—</span>}
                    {sub ? <span className="rpt-td-sub">{sub}</span> : null}
                  </td>
                )
              })}
            </tr>
            )
          })}
        </tbody>
      </table>
      {note ? <p className="rpt-table-note">{note}</p> : null}
    </div>
  )
}

// 심화 마지막 '앞으로 기억할 나의 기준': 이 고객의 풀이에서 뽑은 핵심 한 줄 + 행동 계획표(기간은 행동 계획 기준, 운세 예측 기간 아님).
export function ClosingBlock({ closing }) {
  if (!closing) return null
  return (
    <section className="rpt-section" data-closing aria-label={closing.title}>
      <h2 className="rpt-h2">{closing.title}</h2>
      {closing.keyline ? <ContentBlock b={{ type: 'callout', head: '이 결과에서 뽑은 핵심 한 줄', items: [{ type: 'p', text: closing.keyline }] }} /> : null}
      {closing.table ? <ReportTable title={closing.table.title} cols={closing.table.cols} rows={closing.table.rows} note={closing.table.note} /> : null}
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
