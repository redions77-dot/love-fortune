import test from 'node:test'
import assert from 'node:assert'
import { assertPreviewEnv } from './envGuard.mjs'

const P = { VERCEL_ENV: 'preview' }
const T = 'https://t.onrender.com'
const PROD = 'https://love-fortune.onrender.com'
const ok = (e) => assert.doesNotThrow(() => assertPreviewEnv(e))
const bad = (e, re) => assert.throws(() => assertPreviewEnv(e), re)

test('미리보기: 둘 다 같은 테스트 백엔드면 통과', () => ok({ ...P, VITE_API_URL: T, ADMIN_API_TARGET: T + '/' }))
test('미리보기: 하나라도 없으면 실패', () => {
  bad({ ...P, ADMIN_API_TARGET: T }, /VITE_API_URL/)
  bad({ ...P, VITE_API_URL: T }, /ADMIN_API_TARGET/)
})
test('미리보기: 운영 주소 지정 시 실패(일반 API·관리자 모두)', () => {
  bad({ ...P, VITE_API_URL: PROD, ADMIN_API_TARGET: T }, /운영/)
  bad({ ...P, VITE_API_URL: T, ADMIN_API_TARGET: PROD }, /운영/)
  bad({ ...P, VITE_API_URL: PROD + '/', ADMIN_API_TARGET: PROD }, /운영/)
})
test('미리보기: 서로 다른 백엔드면 실패', () => bad({ ...P, VITE_API_URL: T, ADMIN_API_TARGET: 'https://u.onrender.com' }, /서로 다른/))
test('미리보기: http·경로는 실패', () => bad({ ...P, VITE_API_URL: T, ADMIN_API_TARGET: 'http://t.onrender.com' }, /https/))
test('운영·로컬 빌드는 검사하지 않음', () => {
  ok({ VERCEL_ENV: 'production' })
  ok({})
})
