// 사업자 정보: 기존 사이트(App.jsx 의 환불정책·이용약관·개인정보처리방침 화면)에 이미 표시 중인 문구를 그대로 옮겼다. 새로 만든 값이 없다.
// 값이 바뀌면 App.jsx 와 이 파일을 함께 고쳐야 하며, businessInfo 테스트가 두 곳이 같은지 확인한다.
export const BUSINESS_LINES = [
  '상호: 봄결 · 대표자: 손영주',
  '사업자등록번호: 291-17-02825',
  '통신판매업신고: 제2026-별내-1183호',
  '사업장: 경기도 남양주시 별내3로 322, 701호 -V133호',
  '전화: 010-9772-1987 · 이메일: redions77@naver.com',
]

// 기존 홈 푸터의 고객문의 링크와 같은 주소
export const CUSTOMER_CONTACT_URL = 'https://open.kakao.com/me/mysajushop'

// 기존 정책 화면은 App.jsx 안에 있으므로, 주소의 ?policy= 값으로 그 화면을 연다.
export const POLICY_LINKS = [
  { key: 'terms', label: '이용약관', href: '/?policy=terms' },
  { key: 'privacy', label: '개인정보처리방침', href: '/?policy=privacy' },
  { key: 'refund', label: '환불정책', href: '/?policy=refund' },
]
