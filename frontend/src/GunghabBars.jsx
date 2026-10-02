// 관계 핵심 항목 바 3개. 점수가 아니라 사주 해석 요약을 3단계 수준(칸 수 + 글자)으로 보여준다.
// 색에만 의존하지 않도록 수준 이름과 채워진 칸 수를 함께 글로 표시한다.
const LEVEL_STYLE = {
  high: { fill: '#1E7F4F', mark: '●●●' },
  mid: { fill: '#8A5F0E', mark: '●●○' },
  low: { fill: '#633B50', mark: '●○○' },
}

export default function GunghabBars({ bars }) {
  if (!bars?.length) return null
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #DEDFE5', borderRadius: 16, padding: '20px 18px', marginBottom: 14 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#24232B', marginBottom: 14 }}>이 관계의 핵심 3가지</p>
      {bars.map((b, i) => {
        const st = LEVEL_STYLE[b.level] || LEVEL_STYLE.mid
        return (
          <div key={b.label} style={{ marginBottom: i < bars.length - 1 ? 20 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#24232B' }}>{b.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: st.fill }}>{b.text}</span>
            </div>
            <div role="img" aria-label={`${b.label}: ${b.text} (3칸 중 ${b.filled}칸)`} style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ flex: 1, height: 10, borderRadius: 5, background: n <= b.filled ? st.fill : '#E4E5EA' }} />
              ))}
            </div>
            {b.comment && <p style={{ fontSize: 14, lineHeight: 1.7, color: '#24232B', margin: '0 0 4px', wordBreak: 'keep-all' }}>{b.comment}</p>}
            {b.tip && <p style={{ fontSize: 14, lineHeight: 1.7, color: '#62616C', margin: 0, wordBreak: 'keep-all' }}><b style={{ color: '#633B50' }}>행동 팁 </b>{b.tip}</p>}
          </div>
        )
      })}
      <p style={{ fontSize: 12, lineHeight: 1.6, color: '#62616C', margin: '16px 0 0', paddingTop: 12, borderTop: '1px solid #DEDFE5', wordBreak: 'keep-all' }}>
        사주에서 두 사람의 기질·가까운 태도·생활 환경이 만나는 방식을 풀어 쓴 해석 요약이에요. 측정된 점수나 진단이 아니니, 맞는 부분만 참고하세요.
      </p>
    </div>
  )
}
