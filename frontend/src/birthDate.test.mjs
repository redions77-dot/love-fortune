import test from 'node:test'
import assert from 'node:assert/strict'
import { isRealBirthDate, showBadDate } from './birthDate.js'

const now = new Date('2026-10-19')
const ok = (y, m, d, o = {}) => isRealBirthDate(y, m, d, { now, ...o })

test('양력: 정상 날짜와 윤년 2/29는 통과한다', () => {
  assert.equal(ok('1990', '1', '31'), true)
  assert.equal(ok('2000', '2', '29'), true)
  assert.equal(ok('1996', '2', '29'), true)
})
test('양력: 없는 날짜(평년 2/29, 2/30, 4/31, 13월, 0일)는 막는다', () => {
  assert.equal(ok('1999', '2', '29'), false)
  assert.equal(ok('1900', '2', '29'), false)
  assert.equal(ok('1990', '2', '30'), false)
  assert.equal(ok('1990', '4', '31'), false)
  assert.equal(ok('1990', '13', '1'), false)
  assert.equal(ok('1990', '5', '0'), false)
})
test('연도 범위: 1900 미만과 미래는 막는다', () => {
  assert.equal(ok('1899', '1', '1'), false)
  assert.equal(ok('2027', '1', '1'), false)
})
test('음력: 30일까지 허용하고 31일은 막는다', () => {
  assert.equal(ok('1990', '2', '30', { lunar: true }), true)
  assert.equal(ok('1990', '2', '31', { lunar: true }), false)
})
test('입력 도중(빈 칸)에는 안내를 띄우지 않고, 다 채웠는데 틀리면 띄운다', () => {
  assert.equal(showBadDate('1990', '', '5', { now }), false)
  assert.equal(showBadDate('1990', '2', '30', { now }), true)
})
