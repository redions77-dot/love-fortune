// 운영자 바로가기 주소(?admin=<운영자 토큰>) 처리 — 순수 함수.
// 주소의 값은 서버 로그인(/api/admin/login)에 보낼 토큰일 뿐이고, 맞는지는 서버가 ADMIN_TOKEN 과 비교해 판단한다.
// 프런트엔드에는 어떤 비밀값도 두지 않는다. 주소창에는 토큰이 남지 않도록 admin 값만 지운 주소를 돌려준다(다른 값·#해시는 그대로).
export function splitAdminParam(search) {
  const raw = typeof search === 'string' ? search : ''
  const p = new URLSearchParams(raw)
  if (!p.has('admin')) return { token: '', search: raw }
  const token = (p.get('admin') || '').slice(0, 256)
  p.delete('admin')
  const rest = p.toString()
  return { token, search: rest ? `?${rest}` : '' }
}
