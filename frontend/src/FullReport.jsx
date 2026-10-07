import { SectionHead, renderFormattedContent } from './reportBlocks.jsx'
import SajuTable, { TypeInfoNote } from './SajuTable.jsx'
import { overviewFor, dashboardKeywords } from './fullReport.js'

// 전체 분석(유료) 전용 "한눈에 보는 층" 컴포넌트. 스타일은 index.css 의 .fa-* 규칙(웹·PDF 공통, 기존 초록·아이보리 색만 사용).
// 풀이 문장은 그대로이고, 요약 카드·타임라인·비교 카드는 같은 문장을 구조로 다시 보여 줄 뿐이다. 무료·심화·궁합 화면은 이 파일을 쓰지 않는다.

export function KeywordTags({ keywords }) {
  if (!keywords || !keywords.length) return null
  return <ul className="fa-tags" aria-label="핵심 키워드">{keywords.map((k) => <li key={k} className="fa-tag">{k}</li>)}</ul>
}

// 첫 페이지: 나의 분석 Dashboard — 사주 4주 · 오행 분포 · 비유 유형 + 계산값에서 뽑은 키워드
export function FullDashboard({ pillars, typeInfo, typeId = 'share-card' }) {
  const keywords = dashboardKeywords(pillars, typeInfo)
  return (
    <section className="fa-dash" data-section="saju" data-fa-dashboard aria-label="나의 분석 Dashboard">
      <p className="rpt-kicker">MY ANALYSIS DASHBOARD</p>
      <h2 className="rpt-h2">나의 분석 Dashboard</h2>
      <KeywordTags keywords={keywords} />
      <SajuTable pillars={pillars} />
      {typeInfo ? <TypeInfoNote typeInfo={typeInfo} id={typeId || undefined} /> : null}
    </section>
  )
}

export function FaCompare({ left, right }) {
  return (
    <div className="fa-compare" role="group" aria-label="비교">
      {[left, right].map((c, i) => (
        <div key={i} className={'fa-cmp-col ' + (c.tone === 'warn' ? 'fa-warn' : 'fa-good')}>
          <p className="fa-cmp-label">{c.label}</p>
          <p className="fa-cmp-text">{c.text}</p>
        </div>
      ))}
    </div>
  )
}

// 한눈에 보기(전체 분석용): [핵심 요약] / [강점][주의할 점] / [지금 당장 할 일 1·2·3]
export function FullSummary({ data }) {
  if (!data) return null
  const strength = data.compare ? data.compare.left.text : data.strengthOnly
  const caution = data.compare ? data.compare.right.text : data.cautionOnly
  return (
    <section className="rpt-summary fa-summary" data-summary={data.kind} aria-label="핵심 요약">
      <p className="rpt-kicker">{data.title}</p>
      {data.headline ? (
        <div className="fa-keycard">
          <p className="fa-keycard-label">핵심 요약</p>
          <p className="fa-keycard-text">{data.headline}</p>
        </div>
      ) : null}
      {strength && caution ? <FaCompare left={{ label: data.compare ? data.compare.left.label : '강점', text: strength, tone: 'good' }} right={{ label: data.compare ? data.compare.right.label : '주의할 점', text: caution, tone: 'warn' }} /> : (strength || caution) ? (
        <div className="fa-compare"><div className={'fa-cmp-col ' + (strength ? 'fa-good' : 'fa-warn')}><p className="fa-cmp-label">{strength ? '강점' : '주의할 점'}</p><p className="fa-cmp-text">{strength || caution}</p></div></div>
      ) : null}
      {data.actionList ? (
        <div data-summary-actions className="fa-acts">
          <p className="fa-keycard-label">{data.actionLabel}</p>
          <ol className="fa-act-list">
            {data.actionList.map((t, i) => (
              <li key={i} className="fa-act"><span className="fa-act-n" aria-hidden="true">{i + 1}</span><span className="fa-act-t">{t}</span></li>
            ))}
          </ol>
        </div>
      ) : data.action ? (
        <div className="fa-acts"><p className="fa-keycard-label">{data.actionLabel}</p><p className="fa-cmp-text">{data.action}</p></div>
      ) : null}
    </section>
  )
}

// 섹션별 한눈에 보는 카드들(각각 한 쪽 안에서 잘리지 않는 단위). { key, node } 목록.
export function overviewUnits(ov) {
  if (!ov) return []
  const u = []
  const add = (key, node) => u.push({ key, node })
  if (ov.timeline) {
    add('tl', (
      <div className="fa-card" data-fa="timeline">
        <p className="fa-label">{ov.timeline.label}</p>
        <ol className="fa-stages">
          {ov.timeline.items.map((s, i) => (
            <li key={i} className="fa-stage"><span className="fa-stage-when">{s.when}</span><span className="fa-stage-text">{s.text}</span></li>
          ))}
        </ol>
      </div>
    ))
  }
  if (ov.jobs) {
    ov.jobs.forEach((j, i) => add('job' + i, (
      <div className="fa-card fa-job" data-fa="job">
        <span className="fa-job-n" aria-hidden="true">{j.n || i + 1}</span>
        <div className="fa-job-body">
          <p className="fa-label">추천 직업 {j.n || i + 1}</p>
          <p className="fa-job-title">{j.title}</p>
          {j.why ? <p className="fa-job-why">{j.why}</p> : null}
        </div>
      </div>
    )))
  }
  if (ov.highlight) add('hl', <div className="fa-keycard" data-fa="highlight"><p className="fa-keycard-label">{ov.highlight.label}</p><p className="fa-keycard-text">{ov.highlight.text}</p></div>)
  if (ov.compare) add('cmp', <FaCompare left={ov.compare.left} right={ov.compare.right} />)
  if (ov.map) {
    add('map', (
      <div className="fa-card" data-fa="month-map">
        <p className="fa-label">{ov.map.year ? `${ov.map.year} YEAR MAP` : 'YEAR MAP'}</p>
        <ol className="fa-months">
          {ov.map.cells.map((c) => <li key={c.month} className="fa-month"><span className="fa-month-n">{c.month}월</span><span className="fa-month-t">{c.phrase}</span></li>)}
        </ol>
      </div>
    ))
  }
  if (ov.tags) {
    add('tags', (
      <div className="fa-card" data-fa="lucky">
        <ul className="fa-lucky">
          {ov.tags.map((t) => <li key={t.label} className="fa-lucky-item"><span className="fa-lucky-label">{t.label}</span><span className="fa-lucky-value">{t.value}</span></li>)}
        </ul>
      </div>
    ))
  }
  return u
}

// 道 · 이 사주로 잘 사는 법 — 결론 페이지(원문 문장을 그대로 재배치). 각각 한 쪽 안에서 잘리지 않는 단위.
export function conclusionUnits(c) {
  if (!c) return []
  const list = (cls, block) => (
    <div className={'fa-card ' + cls} data-fa="conclusion">
      <p className="fa-label">{block.label}</p>
      {block.items.length && block.items.every((t) => /^\d+\.\s*/.test(t))
        ? <ol className="fa-list">{block.items.map((t, i) => <li key={i}>{t.replace(/^\d+\.\s*/, '')}</li>)}</ol>
        : block.items.map((t, i) => <p key={i} className="fa-cmp-text">{t}</p>)}
    </div>
  )
  const u = [{ key: 'intro', node: <p className="fa-memo" data-fa="memo">앞으로 기억할 나의 기준</p> }]
  u.push({ key: 'cond', node: list('fa-good', c.conditions) })
  u.push({ key: 'pat', node: list('fa-warn', c.pattern) })
  u.push({ key: 'act', node: list('fa-act-card', c.actions) })
  if (c.closing) u.push({ key: 'close', node: <div className="fa-keycard fa-final" data-fa="final"><p className="fa-keycard-label">{c.closing.label || '마지막 한 문장'}</p>{c.closing.items.map((t, i) => <p key={i} className="fa-keycard-text">{t}</p>)}</div> })
  return u
}

// 웹용: 한눈에 보기 카드 → (결론이면 그것으로 대체) 아니면 원문 본문 그대로
export function unitsForSection(title, content) {
  const ov = overviewFor(title, content)
  if (!ov) return { units: [], replaceBody: false }
  if (ov.kind === 'closing') return { units: conclusionUnits(ov.conclusion), replaceBody: !!ov.conclusion }
  return { units: overviewUnits(ov.kind === 'months' ? { map: ov.map } : ov.kind === 'lucky' ? { tags: ov.tags } : ov), replaceBody: ov.kind === 'lucky' && !!ov.covers }
}

export function FullSection({ title, content, part }) {
  const { units, replaceBody } = unitsForSection(title, content)
  return (
    <section className="rpt-section" data-fa-section>
      <SectionHead title={title} part={part} />
      {units.length ? <div className="fa-units">{units.map((x) => <div key={x.key} className="fa-unit">{x.node}</div>)}</div> : null}
      {replaceBody ? null : renderFormattedContent(content)}
    </section>
  )
}
