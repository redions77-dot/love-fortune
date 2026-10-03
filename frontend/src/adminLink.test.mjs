import test from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { splitAdminParam } from './adminLink.js'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const app = readFileSync(here('./App.jsx'), 'utf8')

test('운영자 주소: admin 값만 꺼내 지우고, 다른 값·빈 값·이상한 값은 그대로 둔다', () => {
  assert.deepStrictEqual(splitAdminParam('?admin=TOKEN123'), { token: 'TOKEN123', search: '' })
  assert.deepStrictEqual(splitAdminParam('?view=email&admin=T%2Fok&x=1'), { token: 'T/ok', search: '?view=email&x=1' })   // 다른 값 유지
  assert.deepStrictEqual(splitAdminParam('?a=1&b=2'), { token: '', search: '?a=1&b=2' })
  assert.deepStrictEqual(splitAdminParam(''), { token: '', search: '' })
  assert.deepStrictEqual(splitAdminParam('?admin='), { token: '', search: '' })           // 빈 값: 토큰 없음, 주소에서는 제거
  assert.deepStrictEqual(splitAdminParam(undefined), { token: '', search: '' })
  assert.deepStrictEqual(splitAdminParam(null), { token: '', search: '' })
  assert.strictEqual(splitAdminParam('?admin=' + 'a'.repeat(1000)).token.length, 256)   // 터무니없이 긴 값은 잘라서 보낸다
})

test('운영자 바로가기: 서버 로그인으로만 처리하고 프런트에는 비밀값·결제 우회가 없다', () => {
  // 프런트엔드 소스에 고정 관리자 값이 없다
  assert.ok(!/bomgyeol/i.test(app))
  assert.ok(!/IS_ADMIN/.test(app))
  // 주소의 값은 서버 로그인(POST /api/admin/login)에만 전달된다 — 토큰은 본문으로, 같은 도메인으로
  assert.ok(app.includes("fetch('/api/admin/login', { method: 'POST', credentials: 'same-origin'") && app.includes('body: JSON.stringify({ token })'))
  // 성공했을 때만(res.ok) 운영자로 인정하고, 주소에서는 admin 값을 바로 지운다
  assert.ok(app.includes('if (res.ok) { setIsAdmin(true)') && app.includes('window.history.replaceState({}, \'\', window.location.pathname + r.search + window.location.hash)'))
  // 운영자 흐름은 여전히 서버가 만든 무결제 주문(/api/admin/orders)뿐이고, 일반 주문은 서버가 결제를 검증한다
  assert.ok(app.includes("isAdmin ? '/api/admin/orders' : `${API_URL}/api/orders`"))
  // 클라이언트가 isPaid 를 주장해 유료 분석을 요청하는 코드가 없다
  assert.ok(!/isPaid:\s*true\s*[,}]/.test(app.replace(/\/\/.*$/gm, '').replace(/type: '[^']*', isPaid: false/g, '')) || !/api\/analyze[^\n]*isPaid:\s*true/.test(app))
  // 일반 사용자 기본 상태는 운영자가 아니다
  assert.ok(app.includes('const [isAdmin, setIsAdmin] = useState(false)'))
})
