import test from 'node:test'
import assert from 'node:assert/strict'
import { stripStrayMarkdown as s } from './markdownStrip.js'

test('굵게 기호 ** 만 지우고 글자는 그대로 둔다', () => {
  assert.equal(s('이 시기는 **큰 결정을 미루는 것**이 좋아요.'), '이 시기는 큰 결정을 미루는 것이 좋아요.')
  assert.equal(s('**1. 핵심**: 천천히'), '1. 핵심: 천천히')
})
test('짝이 안 맞는 ** 도 남기지 않는다', () => { assert.equal(s('앞 ** 뒤'), '앞  뒤'); assert.ok(!s('a**b').includes('*')) })
test('--- 구분선 줄은 지우되 문장 속 하이픈은 유지한다', () => {
  assert.equal(s('가\n---\n나'), '가\n나')
  assert.equal(s('가\n  ***  \n나'), '가\n나')
  assert.equal(s('2027-10 ~ 2028-03 흐름 - 중요'), '2027-10 ~ 2028-03 흐름 - 중요')
  assert.equal(s('- 목록 항목'), '- 목록 항목')
})
test('=== 섹션 표시·이모지·번호는 건드리지 않는다', () => {
  const t = '===종합 흐름===\n📌 소제목\n1. 첫째\n⚠️ 주의'
  assert.equal(s(t), t)
})
test('빈 값은 안전하게 처리', () => { assert.equal(s(''), ''); assert.equal(s(null), ''); assert.equal(s(undefined), '') })
