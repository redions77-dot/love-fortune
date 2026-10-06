import { sajuFacts, pillarView, ELEMENT_LABEL, ELEMENT_COLOR } from './sajuFacts.js'
import ElementDistribution from './ElementDistribution.jsx'

// 공통 사주표 — 무료·전체·심화 결과와 PDF가 모두 이 컴포넌트 하나를 쓴다(선으로 나뉜 네 기둥 표 + 오행 분포 + 일간 안내).
// 모양은 index.css 의 .saju-* 규칙이 정한다(웹은 본문 폭, PDF 는 .pdf-doc 아래에서 더 크게). 서버가 계산한 네 기둥만 읽고 새 값을 만들지 않는다.
const PILLAR_LABELS = [['시주', '시주(時)'], ['일주', '일주(日)'], ['월주', '월주(月)'], ['년주', '년주(年)']]

export function Pillars({ pillars }) {
  return (
    <div role="table" aria-label="사주팔자" className="saju-pillars">
      {PILLAR_LABELS.map(([key, label]) => {
        const v = pillarView(pillars && pillars[key])
        const isDay = key === '일주'
        return (
          <div key={key} data-pillar={key} className={'saju-col' + (isDay ? ' is-day' : '')}>
            <div className="saju-label">{label}</div>
            {v ? (
              <>
                <span className="saju-gan" style={{ color: ELEMENT_COLOR[v.ganEl] }}>{v.gan}</span>
                <span className="saju-ko">{v.ganKo}</span>
                <span className="saju-ji" style={{ color: ELEMENT_COLOR[v.jiEl] }}>{v.ji}</span>
                <span className="saju-ko">{v.jiKo}</span>
                {isDay && <span className="saju-me">나를 대표하는 글자</span>}
              </>
            ) : (
              <span className="saju-empty">-</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function SajuTable({ pillars }) {
  const facts = sajuFacts(pillars)
  return (
    <div className="saju-table" data-saju-table data-pdf-card="saju">
      <Pillars pillars={pillars} />
      <ElementDistribution pillars={pillars} />
      {facts.dayGan && <p className="saju-day-note">일간(나를 대표하는 글자)은 {facts.dayGan}, {ELEMENT_LABEL[facts.dayElement]} 기운이에요.</p>}
    </div>
  )
}

// 비유로 보는 내 사주 유형 — 웹과 PDF 가 같은 모양을 쓴다.
export function TypeInfoNote({ typeInfo, id }) {
  if (!typeInfo) return null
  return (
    <div id={id} className="saju-aside saju-type">
      <p className="saju-aside-label">비유로 보는 내 사주 유형</p>
      <p className="saju-type-name">{typeInfo.name}</p>
      <p className="saju-aside-text">{`이런 이미지로 읽을 수 있어요: ${typeInfo.desc}. 사주 글자를 쉽게 떠올리도록 붙인 비유예요. 성격을 단정하는 이름이 아니니 참고만 하세요.`}</p>
    </div>
  )
}
