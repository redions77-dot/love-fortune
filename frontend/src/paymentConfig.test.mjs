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
