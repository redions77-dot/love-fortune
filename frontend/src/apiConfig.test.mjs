import test from 'node:test'
import assert from 'node:assert'
import { resolveApiUrl } from './apiConfig.js'

const PROD = 'https://love-fortune.onrender.com'
const r = (hostname, envUrl) => resolveApiUrl({ hostname, envUrl })

test('로컬: 기본은 프록시(빈 문자열)', () => assert.deepStrictEqual(r('localhost'), { url: '', error: null }))
test('운영 도메인 + 미설정: 기존 운영 백엔드(동작 유지)', () => {
  for (const h of ['love-fortune-nu.vercel.app', 'mysaju.shop', 'www.mysaju.shop']) assert.strictEqual(r(h).url, PROD)
})
test('미리보기 도메인 + 미설정: 오류, 운영으로 연결되지 않음', () => {
  const x = r('love-fortune-git-x-me.vercel.app')
  assert.strictEqual(x.url, null); assert.match(x.error, /VITE_API_URL/)
})
test('미리보기 + 테스트 백엔드 주소: 사용', () => assert.strictEqual(r('p.vercel.app', 'https://t.onrender.com/').error, null))
test('미리보기 + 운영 주소 지정: 차단', () => assert.ok(r('p.vercel.app', PROD).error))
test('운영 도메인 + 명시 설정: 명시값 사용', () => assert.strictEqual(r('mysaju.shop', PROD).url, PROD))
test('잘못된 값: http·경로·URL 아님', () => {
  for (const v of ['http://t.com', 'https://t.com/api', 'abc']) assert.ok(r('p.vercel.app', v).error, v)
})
