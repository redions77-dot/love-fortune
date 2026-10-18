// 결과가 AI 출력 한도(max_tokens)로 끝까지 만들어지지 않았을 때만 보이는 안내. 화면 전용(PDF·인쇄 제외).
export const TRUNCATED_NOTICE = '결과가 길어져 끝부분이 다 담기지 못했어요. 고객센터로 알려 주시면 이어서 다시 만들어 드릴게요.'

export default function TruncatedNotice() {
  return (
    <div role="status" className="no-print" style={{ margin: '0 0 16px', padding: '14px 16px', border: '1px solid #E9D5A8', borderRadius: 12, background: '#FFF8E7', color: '#24232B', fontSize: 14, lineHeight: 1.6, wordBreak: 'keep-all' }}>
      ⚠️ {TRUNCATED_NOTICE}
    </div>
  )
}
