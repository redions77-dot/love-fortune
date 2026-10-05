import test from 'node:test'
import assert from 'node:assert/strict'
import { emailPrefillFor, prefillSignature } from './emailPrefill.js'

const me = { gender: '여', maritalStatus: '미혼', birthdate: '1990-01-01', birthtime: '', mbti: '', blood: '', isLunar: false, userName: '가나' }
const saved = { email: 'buyer@example.com', sig: prefillSignature(me) }

test('같은 입력의 심화 결제 → 이전에 쓴 이메일을 미리 채운다', () => {
  assert.equal(emailPrefillFor('심화 분석', saved, prefillSignature({ ...me })), 'buyer@example.com')
})

test('입력(생년월일·이름 등)이 달라지면 채우지 않는다 — 다른 사람의 새 분석', () => {
  assert.equal(emailPrefillFor('심화 분석', saved, prefillSignature({ ...me, birthdate: '1991-02-02' })), '')
  assert.equal(emailPrefillFor('심화 분석', saved, prefillSignature({ ...me, userName: '다른사람' })), '')
})

test('심화 분석 이외 상품(전체 분석·자녀운)에서는 채우지 않는다', () => {
  assert.equal(emailPrefillFor('전체 분석', saved, saved.sig), '')
  assert.equal(emailPrefillFor('자녀운 프리미엄', saved, saved.sig), '')
})

test('저장된 이메일이 없거나(null, 새 분석 시작 후) 값이 비정상이면 빈 값', () => {
  assert.equal(emailPrefillFor('심화 분석', null, saved.sig), '')
  assert.equal(emailPrefillFor('심화 분석', undefined, saved.sig), '')
  assert.equal(emailPrefillFor('심화 분석', { email: 123, sig: saved.sig }, saved.sig), '')
})
