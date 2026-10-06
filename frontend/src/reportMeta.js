// 결과 화면·PDF 표지에 쓰는 상품 표시와 기본 정보 한 줄 — 무료·전체·심화가 같은 기준을 쓰도록 한곳에 둔다.
// 서버가 확정한 값(생년월일 문자열·사주 네 기둥)만 쓰고, 모르는 정보는 채우지 않는다.

export const PRODUCT = {
  free: { key: 'free', label: '무료 핵심 풀이', file: '무료핵심풀이' },
  full: { key: 'full', label: '전체 분석', file: '전체분석' },
  deep: { key: 'deep', label: '심화 분석', file: '심화분석' },
}

// 표지 제목: "정슬님의 사주 전체 분석" / 이름이 없으면 "나의 사주 전체 분석"
export function productTitle(kind, name) {
  const p = PRODUCT[kind] || PRODUCT.free
  return `${name ? name + '님의' : '나의'} 사주 ${p.label}`
}

// 파일명(확장자 제외): 마이사주_전체분석_정슬
export function pdfFileName(kind, name) {
  const p = PRODUCT[kind] || PRODUCT.free
  return `마이사주_${p.file}_${String(name || '').trim() || '결과'}`
}

// 기본 정보 한 줄: 생년월일 · 양력/음력 · 출생시간.
// - dateText 는 서버가 돌려준 "1996년 9월 30일" 또는 "1996년 9월 30일 (음력→양력)" 형태. 음력 입력이면 이미 표기가 붙어 있어 양력을 덧붙이지 않는다.
// - 출생시간은 사용자가 입력했을 때만 표시한다. 입력이 없고 서버도 시주를 계산하지 못했을 때만 '출생시간 모름'으로 적는다.
export function birthMetaLine({ dateText, isLunar = false, birthtime = '', pillars = null }) {
  if (!dateText) return ''
  const parts = [dateText]
  if (!isLunar && !/양력|음력/.test(dateText)) parts.push('양력')
  const t = String(birthtime || '').trim()
  if (t) parts.push(t)
  else if (pillars && (!pillars.시주 || pillars.시주 === '-')) parts.push('출생시간 모름')
  return parts.join(' · ')
}
