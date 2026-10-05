import { elementDistribution, ELEMENTS, ELEMENT_LABEL, ELEMENT_COLOR } from './sajuFacts.js'

// 내 사주의 오행 분포 — 서버가 계산한 여덟 글자를 목·화·토·금·수로 센 값만 보여 준다(AI가 만든 값 없음).
// 개수가 많고 적음에 점수·등급·좋고 나쁨을 붙이지 않는다. 계산값이 없거나 합이 8이 아니면 아무것도 그리지 않는다.
export default function ElementDistribution({ pillars }) {
  const dist = elementDistribution(pillars)
  if (!dist) return null
  return (
    <div data-element-distribution data-element-total={dist.total} style={{ margin: '4px 0 18px' }}>
      <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: '#22211C' }}>내 사주의 오행 분포</p>
      <p style={{ fontSize: 13, margin: '0 0 12px', color: '#5F5E55' }}>사주 8글자의 오행 구성을 보여주는 표예요.</p>
      <div data-distribution style={{ display: 'grid', gridTemplateColumns: '64px 1fr 36px', alignItems: 'center', rowGap: 10, columnGap: 10 }}>
        {ELEMENTS.map((el) => (
          <div key={el} data-element={el} data-count={dist.counts[el]} style={{ display: 'contents' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: ELEMENT_COLOR[el] }}>{el} · {ELEMENT_LABEL[el]}</span>
            <div style={{ height: 10, background: '#E9E6D8', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
              <i style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5, width: `${(dist.counts[el] / 8) * 100}%`, background: ELEMENT_COLOR[el] }} />
            </div>
            <span style={{ fontSize: 14, color: '#22211C', textAlign: 'right', fontWeight: 600 }}>{dist.counts[el]}개</span>
          </div>
        ))}
      </div>
    </div>
  )
}
