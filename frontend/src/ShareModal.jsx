import { useState, useEffect } from 'react'

// 공유 전 확인 창. 공유할 문구를 먼저 보여주고, 사용자가 고친 뒤 직접 '공유하기' 또는 '복사하기'를 눌러야만 내보낸다.
// 문구에는 이름·생년월일·출생시간·상대방 정보나 결과·주문 주소를 넣지 않는다 (호출하는 쪽에서 지우고, 여기서 한 번 더 확인하게 한다).
export default function ShareModal({ initialText, onClose }) {
  const [text, setText] = useState(initialText)
  const [done, setDone] = useState('')
  useEffect(() => { setText(initialText); setDone('') }, [initialText])
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copy() {
    try { await navigator.clipboard.writeText(text) }
    catch {
      const el = document.createElement('textarea'); el.value = text
      document.body.appendChild(el); el.select(); try { document.execCommand('copy') } catch {} document.body.removeChild(el)
    }
    setDone('복사했어요. 원하는 곳에 붙여넣어 보내주세요.')
  }
  async function nativeShare() {
    try { await navigator.share({ text }); setDone('공유창을 열었어요.') } catch (e) { if (e?.name !== 'AbortError') setDone('공유하지 못했어요. 복사하기를 이용해주세요.') }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="공유할 내용 확인" style={{ position: 'fixed', inset: 0, background: 'rgba(36,35,43,0.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#FFFFFF', width: '100%', maxWidth: 480, borderRadius: '16px 16px 0 0', padding: '22px 20px calc(22px + env(safe-area-inset-bottom))', boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#24232B', margin: '0 0 6px' }}>이 내용을 공유할까요?</p>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#62616C', margin: '0 0 12px', wordBreak: 'keep-all' }}>
          이름·생년월일·출생시간·상대방 정보는 넣지 않았어요. 보내기 전에 직접 고칠 수 있고, 지금 보이는 내용만 전달돼요.
        </p>
        <textarea aria-label="공유할 문구" value={text} onChange={e => setText(e.target.value)} rows={6}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 15, lineHeight: 1.7, padding: '12px 14px', border: '1px solid #DEDFE5', borderRadius: 10, color: '#24232B', background: '#F4F5F7', resize: 'vertical', fontFamily: 'inherit' }} />
        {done && <p role="status" style={{ fontSize: 13, color: '#1E7F4F', margin: '8px 0 0' }}>{done}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {canNativeShare && <button style={{ flex: 1, padding: '13px', fontSize: 15, fontWeight: 700, background: '#633B50', color: '#FFFFFF', border: 'none', borderRadius: 10, cursor: 'pointer' }} onClick={nativeShare}>공유하기</button>}
          <button style={{ flex: 1, padding: '13px', fontSize: 15, fontWeight: 700, background: canNativeShare ? '#F6F0F3' : '#633B50', color: canNativeShare ? '#633B50' : '#FFFFFF', border: canNativeShare ? '1px solid #DEDFE5' : 'none', borderRadius: 10, cursor: 'pointer' }} onClick={copy}>복사하기</button>
          <button style={{ flex: '0 0 auto', padding: '13px 16px', fontSize: 15, background: '#FFFFFF', color: '#62616C', border: '1px solid #DEDFE5', borderRadius: 10, cursor: 'pointer' }} onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
