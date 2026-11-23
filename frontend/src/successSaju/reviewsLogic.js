// 후기 화면의 순수 로직. 서버 검증(backend/reviews.js)과 같은 기준을 쓴다.
export const CONTENT_MIN = 20
export const CONTENT_MAX = 500
export const NICKNAME_MAX = 12
export const CONCERNS = Object.freeze({ study: '공부·진로', career: '직업·사업', money: '재물·시기', etc: '기타' })
// 구매 인증(결제 확인된 주문)과 무료 체험(체험 코드 주문)을 구분해 표시한다.
export const usageLabel = (kind) => (kind === 'paid' ? '구매 인증' : '무료 체험')
export const starText = (n) => '★'.repeat(Math.max(0, Math.min(5, Number(n) || 0)))
export function reviewLengthState(text) {
  const count = Array.from(String(text || '').trim()).length
  return { count, ok: count >= CONTENT_MIN && count <= CONTENT_MAX }
}
