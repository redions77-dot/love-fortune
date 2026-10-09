import { useState } from 'react'

const SHARE_URL = 'https://www.mysaju.shop/'
const SHARE_TITLE = '나, 앞으로 잘 풀릴까? | 마이사주'
const SHARE_TEXT = '나 여기서 사주 봤는데 꽤 재밌더라 ㅋㅋ 너도 한번 봐봐. 기본 사주는 무료로 볼 수 있어!'

// 친구 공유 CTA — 홈페이지 링크만 공유하며 개인 사주 결과는 포함하지 않음. 화면 전용(PDF·인쇄 제외)
export default function ShareCta() {
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)
  async function copyLink() {
    try { await navigator.clipboard.writeText(SHARE_URL); return true } catch {}
    try {
      const el = document.createElement('textarea'); el.value = SHARE_URL
      el.style.position = 'fixed'; el.style.opacity = '0'
      document.body.appendChild(el); el.select()
      const ok = document.execCommand('copy'); document.body.removeChild(el)
      return ok === true
    } catch { return false }
  }
  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: SHARE_URL }); return } catch (e) { if (e?.name === 'AbortError') return }
    }
    if (await copyLink()) {
      setManual(false); setCopied(true); setTimeout(() => setCopied(false), 2500)
    } else {
      setCopied(false); setManual(true)
    }
  }
  return (
    <div className="share-cta" data-pdf-exclude="true" style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 16, padding: '28px 20px', marginTop: 24, marginBottom: 8, textAlign: 'center' }}>
      <p style={{ fontSize: 19, fontWeight: 800, color: '#22211C', marginBottom: 12, lineHeight: 1.5, wordBreak: 'keep-all' }}>나만 알고 있기 아깝다면? ㅋㅋ</p>
      <p style={{ fontSize: 14, color: '#5F5E55', marginBottom: 12, lineHeight: 1.7, wordBreak: 'keep-all' }}>내 사주를 보고 나니<br />친구 사주도 궁금하지 않으세요?</p>
      <p style={{ fontSize: 14, color: '#5F5E55', marginBottom: 22, lineHeight: 1.7, wordBreak: 'keep-all' }}>친구에게도 마이사주를 알려주세요.<br />좋은 건 같이 봐야 더 재밌잖아요!</p>
      <button onClick={handleShare} style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 800, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: 'none' }}>
        {copied ? '링크가 복사됐어요 ✓' : '친구에게 마이사주 공유하기 →'}
      </button>
      {manual && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, color: '#5F5E55', marginBottom: 6 }}>복사에 실패했어요. 아래 주소를 직접 복사해 주세요.</p>
          <input readOnly value={SHARE_URL} onFocus={e => e.target.select()} onClick={e => e.target.select()} aria-label="마이사주 주소"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, textAlign: 'center', border: '1px solid #E4E1D4', borderRadius: 10, background: '#FBFAF5', color: '#22211C' }} />
        </div>
      )}
      <p style={{ fontSize: 12, color: '#5F5E55', marginTop: 12, lineHeight: 1.6, wordBreak: 'keep-all' }}>여러분의 입소문이 마이사주를 키우는 힘이 됩니다.</p>
    </div>
  )
}
