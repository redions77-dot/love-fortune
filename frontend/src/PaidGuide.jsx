// 선택형 유료 상세 풀이 안내 카드. 얻는 도움을 제목으로 드러내고, 내용은 3~4개 묶음을 펼쳐서 볼 수 있게 한다.
// 묶음 설명은 실제 유료 프롬프트가 만드는 내용만 담는다 (frontend/src/relations.js).
export default function PaidGuide({ title, bundles, priceText, buttonText, onBuy, summary, deepNote }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid #2F5D44', borderRadius: 16, padding: '20px 18px', marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#2F5D44', margin: '0 0 4px' }}>선택 · 유료 상세 풀이</p>
      <p style={{ fontSize: 17, fontWeight: 800, color: '#22211C', margin: '0 0 6px', lineHeight: 1.5, wordBreak: 'keep-all' }}>{title}</p>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: '#5F5E55', margin: '0 0 12px', wordBreak: 'keep-all' }}>
        위 무료 요약은 결제 없이 볼 수 있어요. 상세 풀이에서는 아래 내용을 더 자세히 풀어드려요.{summary ? '' : ' 항목을 눌러 내용을 확인해보세요.'}
      </p>
      {summary && <p style={{ fontSize: 14, fontWeight: 700, color: '#2F5D44', margin: '0 0 8px', wordBreak: 'keep-all' }}>{summary}</p>}
      {summary ? bundles.map((b, i) => (
        <div key={b.title} style={{ borderTop: '1px solid #E4E1D4', padding: '10px 0' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#22211C', margin: 0, wordBreak: 'keep-all' }}>{i + 1}. {b.title}</p>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#5F5E55', margin: '4px 0 0', wordBreak: 'keep-all' }}>{b.desc}</p>
        </div>
      )) : bundles.map(b => (
        <details key={b.title} style={{ borderTop: '1px solid #E4E1D4', padding: '10px 0' }}>
          <summary style={{ fontSize: 15, fontWeight: 700, color: '#22211C', cursor: 'pointer', listStyle: 'revert' }}>{b.title}</summary>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#5F5E55', margin: '6px 0 0', wordBreak: 'keep-all' }}>{b.desc}</p>
        </details>
      ))}
      {deepNote && <p style={{ fontSize: 14, lineHeight: 1.7, color: '#5F5E55', margin: '12px 0 0', padding: '10px 12px', background: '#EEF3EA', borderRadius: 10, wordBreak: 'keep-all' }}>{deepNote}</p>}
      <p style={{ fontSize: 14, fontWeight: 700, color: '#22211C', margin: '12px 0 10px', borderTop: '1px solid #E4E1D4', paddingTop: 12 }}>가격 {priceText} · 1회 결제</p>
      <button style={{ width: '100%', padding: '15px', fontSize: 16, fontWeight: 800, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer' }} onClick={onBuy}>{buttonText}</button>
    </div>
  )
}
