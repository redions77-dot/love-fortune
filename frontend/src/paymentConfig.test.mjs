import test from 'node:test'
import assert from 'node:assert'
import { resolveImpCode, isAnalyticsHost } from './paymentConfig.js'

const PROD = 'imp87662575'
const r = (hostname, envCode) => resolveImpCode({ hostname, envCode })

test('운영 도메인 + 미설정: 기존 코드 유지', () => assert.strictEqual(r('mysaju.shop').code, PROD))
test('미리보기·로컬 + 미설정: 오류, 운영 코드로 대체 안 함', () => {
  for (const h of ['p.vercel.app', 'localhost']) { const x = r(h); assert.strictEqual(x.code, null); assert.ok(x.error) }
})
test('미리보기 + 테스트 코드: 사용', () => assert.strictEqual(r('p.vercel.app', 'imp00000000').code, 'imp00000000'))
test('미리보기 + 운영 코드 지정: 차단', () => assert.ok(r('p.vercel.app', PROD).error))
test('분석 도구는 운영 도메인에서만', () => {
  assert.ok(isAnalyticsHost('mysaju.shop'))
  for (const h of ['p.vercel.app', 'localhost']) assert.ok(!isAnalyticsHost(h))
})

// ── 포트원 V1 테스트 채널(channelKey) ─────────────────────────────
import fs from 'node:fs'
import { resolveChannelKey, resolvePaymentConfig, parseKeyList, PRODUCTION_CHANNEL_KEYS } from './paymentConfig.js'
const TEST_KEY = 'channel-key-aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb'
const LIVE_KEY = 'channel-key-cccccccc-4444-5555-6666-dddddddddddd'
const cfg = (hostname, over = {}) => resolvePaymentConfig({ hostname, envCode: PROD, envChannelKey: TEST_KEY, envBlockedKeys: LIVE_KEY, ...over })

test('운영 도메인: 테스트 채널 키·차단 목록이 있어도 무시하고 기존 운영 결제 설정 그대로', () => {
  for (const h of ['mysaju.shop', 'www.mysaju.shop', 'love-fortune-nu.vercel.app']) {
    const c = cfg(h, { envCode: '', envChannelKey: TEST_KEY })
    assert.deepStrictEqual(c, { code: PROD, error: null, channelKey: null }, h)
    assert.deepStrictEqual(cfg(h, { envChannelKey: LIVE_KEY }), { code: PROD, error: null, channelKey: null }, h)   // 운영에서는 채널 키로 오류도 내지 않고 무시
  }
})
test('테스트 환경: 운영 식별코드 + 유효한 테스트 채널 키면 결제 가능(channelKey 사용)', () => {
  for (const h of ['localhost', '127.0.0.1', 'p.vercel.app']) assert.deepStrictEqual(cfg(h), { code: PROD, error: null, channelKey: TEST_KEY }, h)
})
test('테스트 환경: 채널 키 없이 운영 식별코드만 있으면 차단(종전 동작)', () => {
  const c = cfg('localhost', { envChannelKey: '' })
  assert.strictEqual(c.code, null); assert.ok(c.error); assert.strictEqual(c.channelKey, null)
})
test('운영(실연동) 채널 키가 들어오면 테스트 실행 차단 — 환경변수 차단 목록·코드 상수 모두', () => {
  const c = cfg('localhost', { envChannelKey: LIVE_KEY })
  assert.strictEqual(c.code, null); assert.match(c.error, /운영\(실연동\) 채널 키/); assert.strictEqual(c.channelKey, null)
  assert.deepStrictEqual(parseKeyList(' a1111111 , b2222222,, '), ['a1111111', 'b2222222'])
  assert.strictEqual(resolveChannelKey({ hostname: 'localhost', envChannelKey: LIVE_KEY, blockedKeys: [LIVE_KEY, 'x'] }).channelKey, null)
  assert.ok(Array.isArray(PRODUCTION_CHANNEL_KEYS))
})
test('채널 키 형식 검사: 짧거나 공백·기호가 섞이면 거부', () => {
  for (const bad of ['short', 'has space inside-key', 'key;drop', 'a'.repeat(200)]) assert.ok(cfg('localhost', { envChannelKey: bad }).error, bad)
})
test('운영 식별코드가 아닌 별도 테스트 식별코드는 종전처럼 채널 키 없이도 사용', () => assert.strictEqual(r('p.vercel.app', 'imp00000000').code, 'imp00000000'))

test('결제창 호출: 테스트 채널 키가 있을 때만 channelKey, 없으면 종전 pg 값 그대로', () => {
  const app = fs.readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
  // 기존 상품 화면(App.jsx)의 결제창 호출은 이 브랜치에서 바꾸지 않는다(종전 pg 값 그대로).
  assert.ok(app.includes("pg: 'html5_inicis'"))
  assert.ok(!app.includes('channelKey: PAYMENT_CONFIG.channelKey'))
  // 새 상품 화면만 테스트 채널 키를 쓴다.
  const ss = fs.readFileSync(new URL('./successSaju/SuccessSaju.jsx', import.meta.url), 'utf8')
  assert.ok(ss.includes("...(PAYMENT_CONFIG.channelKey ? { channelKey: PAYMENT_CONFIG.channelKey } : { pg: 'html5_inicis' }), pay_method: 'card'"))
  assert.strictEqual((ss.match(/IMP\.request_pay\(/g) || []).length, 1)
})

test('결제 SDK: 운영 도메인은 종전 1.2.0 파일 그대로, 최신 SDK 는 비운영 도메인에서만 추가로 불러온다', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.ok(html.includes('<script src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"></script>'))
  assert.strictEqual((html.match(/iamport\.payment-1\.2\.0\.js/g) || []).length, 1)
  assert.ok(html.includes("if (__PRODUCTION_HOSTS__.indexOf(location.hostname) === -1) document.write('<script src=\"https://cdn.iamport.kr/v1/iamport.js\"></' + 'script>');".replace("' + 'script", "'+'script")))
  // 같은 자리표시자를 두 곳(분석·SDK)에서 쓰므로 빌드 때 모두 채워져야 한다
  const vite = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8')
  assert.ok(vite.includes("html.split('__PRODUCTION_HOSTS__').join("))
})
