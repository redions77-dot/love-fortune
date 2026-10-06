import { elementDistribution, ELEMENTS, ELEMENT_LABEL, ELEMENT_COLOR } from './sajuFacts.js'

// 내 사주의 오행 분포 — 서버가 계산한 여덟 글자를 목·화·토·금·수로 센 값만 보여 준다(AI가 만든 값 없음).
// 개수가 많고 적음에 점수·등급·좋고 나쁨을 붙이지 않는다. 계산값이 없거나 합이 8이 아니면 아무것도 그리지 않는다.
// 크기·여백은 index.css 의 .elem-* 규칙(웹/PDF 공통)이 정하고, 여기서는 오행 색과 막대 길이만 지정한다.
export default function ElementDistribution({ pillars }) {
  const dist = elementDistribution(pillars)
  if (!dist) return null
  return (
    <div data-element-distribution data-element-total={dist.total} className="elem-dist">
      <p className="elem-title">내 사주의 오행 분포</p>
      <p className="elem-note">사주 8글자의 오행 구성을 보여주는 표예요.</p>
      <div data-distribution className="elem-grid">
        {ELEMENTS.map((el) => (
          <div key={el} data-element={el} data-count={dist.counts[el]} style={{ display: 'contents' }}>
            <span className="elem-name" style={{ color: ELEMENT_COLOR[el] }}>{el} · {ELEMENT_LABEL[el]}</span>
            <div className="elem-bar">
              <i style={{ width: `${(dist.counts[el] / 8) * 100}%`, background: ELEMENT_COLOR[el] }} />
            </div>
            <span className="elem-count">{dist.counts[el]}개</span>
          </div>
        ))}
      </div>
    </div>
  )
}
