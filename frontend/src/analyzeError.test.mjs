import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeHttpErrorMessage } from './analyzeError.js'

test('429 는 서버 오류로 보이지 않고, 서버 안내 또는 기본 안내를 보여 준다', () => {
  assert.equal(analyzeHttpErrorMessage(429, '요청이 너무 많아요. 잠시 후 다시 시도해주세요.'), '요청이 너무 많아요. 잠시 후 다시 시도해주세요.')
  assert.equal(analyzeHttpErrorMessage(429, undefined), '요청이 너무 많아요. 잠시 후 다시 시도해주세요.')
  assert.equal(analyzeHttpErrorMessage(429, '  '), '요청이 너무 많아요. 잠시 후 다시 시도해주세요.')
  assert.ok(!/서버 오류/.test(analyzeHttpErrorMessage(429, '')))
})

test('그 밖의 오류는 기존 문구를 유지한다', () => {
  assert.equal(analyzeHttpErrorMessage(500, '무시됨'), '서버 오류가 발생했습니다 (500)')
  assert.equal(analyzeHttpErrorMessage(400, ''), '서버 오류가 발생했습니다 (400)')
})
