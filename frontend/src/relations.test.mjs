import test from 'node:test'
import assert from 'node:assert'
import { createRequire } from 'node:module'
import { RELATION_OPTIONS, GUNGHAB_PAID_TOPICS, parseGunghabFree, parseMyFree, scrubPersonal, buildShareText } from './relations.js'

const require = createRequire(import.meta.url)
const server = require('../../backend/relations.js')

test('프런트 관계 목록·상세 풀이 주제가 서버 정의와 같다', () => {
  assert.deepStrictEqual(RELATION_OPTIONS.map(o => o.key), Object.keys(server.RELATIONS))
  for (const [key, def] of Object.entries(server.RELATIONS)) {
    assert.deepStrictEqual(GUNGHAB_PAID_TOPICS[key], def.paid.map(p => p[0]), key)
  }
})

const FREE = `===관계 요약===
두 사람은 서로 다른 속도로 움직이는 편이에요.

===업무 호흡===
해설: 일하는 속도가 비슷한 편이에요.
팁: 회의 전에 우선순위를 먼저 맞춰보세요.

===의사소통===
해설: 말하는 방식이 달라 오해가 생길 수 있어요.

===역할 조율===
이 항목은 형식이 어긋난 예시예요.

===잘 맞는 점===
둘 다 꼼꼼해요.

===조율할 점===
속도 차이예요.

===대화 문장===
"이번 주 일정부터 같이 맞춰볼까요?"

===공유 문장===
우리 팀은 이런 편이래. 너는 어때?`
const BARS = [{ label: '업무 호흡', level: 'high', text: '잘 맞는 편', filled: 3 }, { label: '의사소통', level: 'low', text: '조율이 필요한 편', filled: 1 }, { label: '역할 조율', level: 'mid', text: '무난한 편', filled: 2 }]

test('무료 궁합 결과: 요약·바 해설/팁·잘 맞는 점·조율할 점·대화 문장·공유 문장을 읽는다', () => {
  const r = parseGunghabFree(FREE, BARS)
  assert.match(r.summary, /서로 다른 속도/)
  assert.strictEqual(r.bars[0].comment, '일하는 속도가 비슷한 편이에요.')
  assert.strictEqual(r.bars[0].tip, '회의 전에 우선순위를 먼저 맞춰보세요.')
  assert.strictEqual(r.bars[1].tip, '')
  assert.match(r.bars[2].comment, /형식이 어긋난/)       // 형식이 어긋나도 내용은 버리지 않는다
  assert.strictEqual(r.bars[0].text, '잘 맞는 편')       // 수준 문구는 서버가 정한 값 그대로
  assert.match(r.line, /^"이번 주/)
  assert.ok(r.good && r.tune && r.share)
})
test('내 사주 무료 결과: 성향·강점·주의할 습관·실천 팁·공유 문장', () => {
  const r = parseMyFree('===나를 읽다===\nA\n===나의 강점===\nB\n===주의할 습관===\nC\n===바로 실천할 팁===\nD\n===공유 문장===\nE')
  assert.deepStrictEqual([r.read, r.strength, r.habit, r.tip, r.share], ['A', 'B', 'C', 'D', 'E'])
})

test('공유 문구에서 이름·생년월일·나이가 지워진다', () => {
  const t = scrubPersonal('민지님은 1990년 5월 15일생이고 34세예요. 철수는 달라요.', [['민지', '나'], ['철수', '상대']])
  assert.ok(!/민지|철수|1990|34세|5월/.test(t), t)
  assert.match(t, /나/)
  // 한 글자 이름처럼 너무 짧으면 일반 단어를 지우지 않도록 건드리지 않는다
  assert.strictEqual(scrubPersonal('가는 길이 같아요', [['가', '나']]), '가는 길이 같아요')
})
test('공유 문구: 서비스 주소만 담고 결과·주문 주소는 담지 않는다', () => {
  const t = buildShareText({ sentence: '', fallback: '나는 이런 방식이 편하대. 너는 어때?', people: [] })
  assert.match(t, /https:\/\/www\.mysaju\.shop$/)
  const link = t.split('👉')[1].trim()
  assert.strictEqual(link, 'https://www.mysaju.shop')   // 쿼리·경로 없이 서비스 첫 주소만
  assert.ok(!/orderId|orderToken|merchant_uid/.test(t))
})
