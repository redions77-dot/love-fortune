// 관리자 전용 주소(즐겨찾기용). 이 경로는 비밀이 아니다 — 알려져도 로그인 창이 열릴 뿐 권한이 생기지 않는다.
// 권한은 서버가 ADMIN_TOKEN 으로 인증한 기기에만 주는 서버 세션(HttpOnly 쿠키)에서 나온다. 프런트엔드에는 비밀값이 없다.
export const ADMIN_ENTRY_PATH = '/admin-bomgyeol-2027'
export function isAdminEntry(pathname) {
  return String(pathname || '').replace(/\/+$/, '') === ADMIN_ENTRY_PATH
}
