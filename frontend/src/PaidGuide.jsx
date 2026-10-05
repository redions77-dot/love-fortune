// 선택형 유료 상세 풀이 안내 카드. 얻는 도움을 제목으로 드러내고, 내용은 3~4개 묶음을 펼쳐서 볼 수 있게 한다.
// 묶음 설명은 실제 유료 프롬프트가 만드는 내용만 담는다 (frontend/src/relations.js).
//
// 내 사주 전체 분석(summary 모드)은 highlights(일·돈·관계 3개)를 먼저 보여 주고, 전체 항목은 펼쳐서 볼 수 있게 한다.
// facts 는 풀이 기간·결과 받기처럼 서로 다른 안내를 구분해서 적는 줄이다.
const C = { text: '#22211C', sub: '#5F5E55', accent: '#2F5D44', line: '#E4E1D4', soft: '#EEF3EA' }
const body = { fontSize: 15, lineHeight: 1.7, color: C.sub, margin: 0, wordBreak: 'keep-all' }

export default function PaidGuide({ title, bundles, priceText, buttonText, onBuy, summary, deepNote, highlights, freeNote, facts }) {
  const useHighlights = !!(summary && highlights && highlights.length)
  return (
    <div id="paid-product-info" style={{ background: '#FFFFFF', border: '1.5px solid ' + C.accent, borderRadius: 16, padding: '20px 18px', marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, margin: '0 0 4px' }}>선택 · 유료 상세 풀이</p>
      <p style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 6px', lineHeight: 1.5, wordBreak: 'keep-all' }}>{title}</p>
      <p style={{ ...body, margin: '0 0 12px' }}>
        {useHighlights && freeNote ? freeNote : <>위 무료 요약은 결제 없이 볼 수 있어요. 상세 풀이에서는 아래 내용을 더 자세히 풀어드려요.{summary ? '' : ' 항목을 눌러 내용을 확인해보세요.'}</>}
      </p>

      {useHighlights ? (
        <>
          {highlights.map((h) => (
            <div key={h.bundle} data-highlight={h.topic} style={{ borderTop: '1px solid ' + C.line, padding: '12px 0' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 4px', wordBreak: 'keep-all' }}>
                <span style={{ color: C.accent }}>{h.topic}</span> · {h.bundle}
              </p>
              <p style={body}>{h.text}</p>
            </div>
          ))}
          <details style={{ borderTop: '1px solid ' + C.line, padding: '12px 0' }}>
            <summary style={{ fontSize: 15, fontWeight: 700, color: C.text, cursor: 'pointer', listStyle: 'revert' }}>전체 {bundles.length}개 항목 모두 보기</summary>
            {summary && <p style={{ ...body, fontWeight: 700, color: C.accent, margin: '8px 0 4px' }}>{summary}</p>}
            {bundles.map((b, i) => (
              <p key={b.title} style={{ ...body, margin: '6px 0 0' }}><b style={{ color: C.text }}>{i + 1}. {b.title}</b> — {b.desc}</p>
            ))}
          </details>
        </>
      ) : (
        <>
          {summary && <p style={{ fontSize: 14, fontWeight: 700, color: C.accent, margin: '0 0 8px', wordBreak: 'keep-all' }}>{summary}</p>}
          {summary ? bundles.map((b, i) => (
            <div key={b.title} style={{ borderTop: '1px solid ' + C.line, padding: '10px 0' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0, wordBreak: 'keep-all' }}>{i + 1}. {b.title}</p>
              <p style={{ ...body, margin: '4px 0 0' }}>{b.desc}</p>
            </div>
          )) : bundles.map(b => (
            <details key={b.title} style={{ borderTop: '1px solid ' + C.line, padding: '10px 0' }}>
              <summary style={{ fontSize: 15, fontWeight: 700, color: C.text, cursor: 'pointer', listStyle: 'revert' }}>{b.title}</summary>
              <p style={{ ...body, margin: '6px 0 0' }}>{b.desc}</p>
            </details>
          ))}
        </>
      )}

      {facts && facts.length > 0 && (
        <div style={{ borderTop: '1px solid ' + C.line, padding: '12px 0 0' }}>
          {facts.map((x) => (
            <p key={x.label} style={{ ...body, margin: '0 0 8px' }}><b style={{ color: C.text }}>{x.label}</b> · {x.text}</p>
          ))}
        </div>
      )}
      {deepNote && <p style={{ fontSize: 14, lineHeight: 1.7, color: C.sub, margin: '12px 0 0', padding: '10px 12px', background: C.soft, borderRadius: 10, wordBreak: 'keep-all' }}>{deepNote}</p>}
      <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '12px 0 10px', borderTop: '1px solid ' + C.line, paddingTop: 12 }}>가격 {priceText} · 1회 결제</p>
      <button style={{ width: '100%', padding: '15px', fontSize: 16, fontWeight: 800, background: C.accent, color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer' }} onClick={onBuy}>{buttonText}</button>
    </div>
  )
}
