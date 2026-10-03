import test from 'node:test'
import assert from 'node:assert'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { ADMIN_ENTRY_PATH, isAdminEntry } from './adminLink.js'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const app = readFileSync(here('./App.jsx'), 'utf8')

test('관리자 전용 주소: 정확히 이 경로만 진입점이고, 비슷한 경로·일반 주소는 아니다', () => {
  assert.strictEqual(ADMIN_ENTRY_PATH, '/admin-bomgyeol-2027')
  assert.strictEqual(isAdminEntry('/admin-bomgyeol-2027'), true)
  assert.strictEqual(isAdminEntry('/admin-bomgyeol-2027/'), true)       // 끝 슬래시는 허용
  for (const p of ['/', '', undefined, null, '/admin', '/admin-bomgyeol', '/admin-bomgyeol-2026', '/x/admin-bomgyeol-2027', '/admin-bomgyeol-2027/x', '/Admin-bomgyeol-2027']) assert.strictEqual(isAdminEntry(p), false, String(p))
})

test('프런트에는 비밀값이 없고 주소의 토큰 방식도 없다 — 진입 주소는 로그인/세션 확인만 연다', () => {
  assert.ok(!/ADMIN_TOKEN\s*=|bomgyeol2026|IS_ADMIN/.test(app))
  assert.ok(!/splitAdminParam|_qs\.has\('admin'\)|\?admin=/.test(app))                  // 이전 ?admin=<토큰> 방식 제거
  assert.ok(app.includes('const _adminEntry = isAdminEntry(window.location.pathname)'))
  assert.ok(app.includes("if (_qs.get('view') === 'admin' || isAdminEntry(window.location.pathname)) return 'admin_email'"))
  // 진입 주소로 열려도 권한은 서버 세션 확인(/api/admin/session)·로그인(/api/admin/login)으로만 생긴다
  assert.ok(app.includes("adminFetch('/api/admin/session')") && app.includes("adminFetch('/api/admin/login', { token: tokenInput, remember })"))
  assert.ok(app.includes("if (j.admin && entry) onExit()") && app.includes('if (res.ok) { setTokenInput(\'\'); setAuthed(true); if (entry) onExit() }'))
  // 기본값은 운영자가 아님. 일반 주소에서는 "이 기기 기억"이 기본 선택이 아니다
  assert.ok(app.includes('const [isAdmin, setIsAdmin] = useState(false)') && app.includes('useState(!!entry)'))
  // 운영자 흐름은 서버가 만든 무결제 주문뿐, 일반 주문은 서버가 결제를 검증
  assert.ok(app.includes("isAdmin ? '/api/admin/orders' : `${API_URL}/api/orders`"))
  // 관리자 모드 표시는 isAdmin 일 때만 (고객 화면 문구는 그대로)
  assert.ok(app.includes("{isAdmin ? '🔧 관리자 테스트 모드") && app.includes(": '회원가입 없이 바로 확인 — 무료로 먼저 보세요'}"))
})

test('Vercel 설정: 관리자 전용 경로가 앱으로 연결되고, 기존 admin API 연결·빌드 명령은 유지된다', () => {
  mkdirSync(here('../node_modules/.cache/admin-entry-test'), { recursive: true })
  buildSync({ entryPoints: [here('../vercel.ts')], bundle: true, packages: 'external', format: 'esm', platform: 'node', outfile: here('../node_modules/.cache/admin-entry-test/vercel.mjs'), logLevel: 'silent' })
  const cfg = async (env) => {
    const saved = { ...process.env }
    Object.assign(process.env, env)
    try { return (await import(pathToFileURL(here('../node_modules/.cache/admin-entry-test/vercel.mjs')).href + '?t=' + Math.random())).config } finally { process.env = saved }
  }
  return cfg({ VERCEL_ENV: 'production' }).then((c) => {
    assert.deepStrictEqual(c.rewrites, [
      { source: '/admin-bomgyeol-2027', destination: '/index.html' },
      { source: '/api/admin/:path*', destination: 'https://love-fortune.onrender.com/api/admin/:path*' },
    ])
    assert.strictEqual(c.buildCommand, 'node node_modules/vite/bin/vite.js build')
    assert.strictEqual(c.installCommand, 'rm -rf node_modules && npm install')
  })
})
