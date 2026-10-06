import { sajuFacts } from './sajuFacts.js'
import { ReportSummary } from './reportBlocks.jsx'
import SajuTable, { TypeInfoNote } from './SajuTable.jsx'

// "내 사주 무료 결과" 리포트 — 기존 무료 풀이(핵심 성향·이유·강점·주의·팁)와 서버가 계산한 사주 데이터를 한 장의 글처럼 보여 준다.
// 새 입력·새 결과 항목은 없다. 비어 있는 섹션은 숨기고 PART 번호는 실제로 보이는 풀이 섹션만 1부터 이어서 매긴다(사주표는 번호 없는 공통 정보 영역).
// 화면 디자인은 index.css 의 보고서 규칙(.rpt-*)과 같은 색·글자 크기를 쓴다: 아이보리 배경 · 먹색 본문 · 짙은 초록 제목/강조.
const C = { page: '#FBFAF5', text: '#22211C', title: '#1F3A2C', sub: '#5F5E55', accent: '#2F5D44', soft: '#EEF3EA', softLine: '#A9C4A0', line: '#E4E1D4', bar: '#E9E6D8' }
const SERIF = 'inherit'
const s = {
  num: { fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: '0.1em', margin: '0 0 8px' },
  h2: { fontSize: 'clamp(22px, 6.3vw, 24px)', lineHeight: 1.4, fontWeight: 800, margin: '0 0 18px', color: C.title, letterSpacing: '-0.01em', wordBreak: 'keep-all' },
  body: { fontSize: 18, lineHeight: 1.8, color: C.text, margin: '0 0 18px', wordBreak: 'keep-all' },
  note: { fontSize: 15, lineHeight: 1.7, color: C.sub, margin: '10px 0 0', wordBreak: 'keep-all' },
}

// 문단 나누기 + 이모지 소제목 기호 제거 (프롬프트가 쓰는 📌 같은 표시는 화면에 보이지 않게)
const MARK = /^[\u{1F300}-\u{1FAFF}☀-➿️]+\s*/u
export const paragraphs = (t) => String(t || '').split(/\n+/).map((x) => x.replace(MARK, '').trim()).filter(Boolean)
// 팁: 첫 문장을 크게, 나머지는 보조 설명으로
export function splitTip(t) {
  const sentences = paragraphs(t).join(' ').split(/(?<=[.!?。])\s+/).filter(Boolean)
  return { main: sentences[0] || '', rest: sentences.slice(1).join(' ') }
}

// props: name, dateLine, pillars({년주,월주,일주,시주}), core({sentence,detail}), why, strength, habit, tip(문자열), typeInfo({name,desc}|null)
export default function SajuReport({ name, dateLine, pillars, core, why, strength, habit, tip, typeInfo, summary, headless = false }) {
  const facts = sajuFacts(pillars)
  const tipParts = splitTip(tip)
  const whyParas = paragraphs(why)
  const strengthParas = paragraphs(strength)
  const habitParas = paragraphs(habit)
  const detailParas = paragraphs(core && core.detail)

  // 보이는 풀이 섹션만 순서대로 번호를 매긴다(사주표는 번호 없음). 전체 분석 PART 번호는 App.jsx 가 같은 개수에서 이어 붙인다.
  const blocks = []
  if (core && core.sentence) blocks.push('core')
  if (whyParas.length) blocks.push('why')
  if (strengthParas.length) blocks.push('strength')
  if (habitParas.length) blocks.push('habit')
  const numOf = (id) => `PART ${blocks.indexOf(id) + 1}`
  const tipNum = `PART ${blocks.length + 1}`
  const sec = (id, i) => ({ 'data-section': id, style: { marginTop: i === 0 ? 0 : 56 } })

  return (
    <article aria-label="내 사주 무료 결과 리포트" style={{ padding: 0, color: C.text }}>
      {!headless && (
      <header style={{ marginBottom: 44 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.accent, margin: '0 0 8px' }}>마이사주 · 내 사주 무료 결과</p>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1.5, fontWeight: 800, margin: '0 0 6px', wordBreak: 'keep-all' }}>{name ? `${name}님의 사주 리포트` : '나의 사주 리포트'}</h1>
        {dateLine && <p style={{ fontSize: 14, color: C.sub, margin: 0 }}>{dateLine}</p>}
      </header>
      )}

      {/* 핵심 요약: 아래 풀이에서 고른 문장만 모아 먼저 보여 준다(상세 풀이는 그대로 이어진다) */}
      <ReportSummary data={summary} />
      <div style={{ height: summary ? 40 : 0 }} />

      {core && core.sentence && (
        <section {...sec('core', 0)}>
          <p className="rpt-kicker" style={s.num}>{numOf('core')}</p>
          <h2 className="rpt-h2" style={s.h2}>나의 핵심 성향</h2>
          <p style={{ fontSize: 'clamp(20px, 5.6vw, 22px)', lineHeight: 1.6, fontWeight: 800, color: C.title, margin: '0 0 18px', wordBreak: 'keep-all' }}>{core.sentence}</p>
          {detailParas.map((p, i) => <p key={i} style={s.body}>{p}</p>)}
        </section>
      )}

      <section data-section="saju" style={{ marginTop: core && core.sentence ? 56 : 0 }}>
        <h2 className="rpt-h2" style={s.h2}>내 사주 한눈에</h2>
        <SajuTable pillars={pillars} />
        {typeInfo && <TypeInfoNote typeInfo={typeInfo} id="share-card" />}
      </section>

      {whyParas.length > 0 && (
        <section {...sec('why', blocks.indexOf('why'))}>
          <p className="rpt-kicker" style={s.num}>{numOf('why')}</p>
          <h2 className="rpt-h2" style={s.h2}>이런 성향이 나오는 이유</h2>
          {whyParas.map((p, i) => <p key={i} style={s.body}>{p}</p>)}
          {facts.relations.length > 0 && (
            <div data-facts className="saju-aside">
              <p className="saju-aside-label">이렇게 풀이한 이유</p>
              {facts.relations.map((r) => <p key={r.label} className="saju-aside-text">{`${r.label} ${r.count}곳 — ${r.where.join(' · ')}`}</p>)}
            </div>
          )}
        </section>
      )}

      {strengthParas.length > 0 && (
        <section {...sec('strength', blocks.indexOf('strength'))}>
          <p className="rpt-kicker" style={s.num}>{numOf('strength')}</p>
          <h2 className="rpt-h2" style={s.h2}>나의 강점</h2>
          {strengthParas.map((p, i) => <p key={i} style={s.body}>{p}</p>)}
        </section>
      )}

      {habitParas.length > 0 && (
        <section {...sec('habit', blocks.indexOf('habit'))}>
          <p className="rpt-kicker" style={s.num}>{numOf('habit')}</p>
          <h2 className="rpt-h2" style={s.h2}>주의할 습관</h2>
          {habitParas.map((p, i) => <p key={i} style={s.body}>{p}</p>)}
        </section>
      )}

      {tipParts.main && (
        <div data-section="tip" className="rpt-callout" style={{ margin: '56px 0 40px', padding: '24px 22px' }}>
          <p className="rpt-kicker" style={{ ...s.num, color: C.accent }}>{tipNum}</p>
          <h2 className="rpt-h2" style={{ ...s.h2, marginBottom: 12 }}>바로 실천할 팁</h2>
          <p style={{ fontSize: 19, lineHeight: 1.75, fontWeight: 700, color: C.text, margin: 0, wordBreak: 'keep-all' }}>{tipParts.main}</p>
          {tipParts.rest && <p style={{ fontSize: 16, lineHeight: 1.8, color: C.sub, margin: '14px 0 0', wordBreak: 'keep-all' }}>{tipParts.rest}</p>}
        </div>
      )}

      <p style={{ fontSize: 14, lineHeight: 1.8, color: C.sub, textAlign: 'center', margin: '0 0 24px', wordBreak: 'keep-all' }}>사주는 정답이 아니라 나를 바라보는 하나의 관점이에요. 맞는 부분과 아닌 부분을 스스로 골라 읽어 보세요.</p>
    </article>
  )
}
