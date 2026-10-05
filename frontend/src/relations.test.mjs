import test from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { RELATION_OPTIONS, GUNGHAB_PAID, SAJU_PAID, parseGunghabFree, parseMyFree, scrubPersonal, buildShareText, validateDialogueLine, safeGunghabText } from './relations.js'

const require = createRequire(import.meta.url)
const server = require('../../backend/relations.js')

test('프런트 관계 목록·상세 풀이 안내 묶음이 서버 정의와 같다', () => {
  assert.deepStrictEqual(RELATION_OPTIONS.map(o => o.key), Object.keys(server.RELATIONS))
  for (const [key, def] of Object.entries(server.RELATIONS)) {
    assert.strictEqual(GUNGHAB_PAID[key].title, def.paidTitle, key)
    assert.deepStrictEqual(GUNGHAB_PAID[key].bundles.map(b => [b.title, b.desc]), def.bundles.map(b => [b[0], b[1]]), key)
  }
})
test('유료 안내에는 한자가 없고 묶음은 3~4개', () => {
  const hanja = /[一-鿿]/
  for (const v of [...Object.values(GUNGHAB_PAID), SAJU_PAID]) {
    assert.ok(v === SAJU_PAID ? v.bundles.length === 8 : (v.bundles.length >= 3 && v.bundles.length <= 4))
    assert.ok(!hanja.test(v.title + v.bundles.map(b => b.title + b.desc).join('')))
  }
  assert.strictEqual(SAJU_PAID.title, '내 성향을 일과 관계에 활용하려면')
  assert.ok(SAJU_PAID.summary.includes('8개 항목') && SAJU_PAID.summary.includes('2027년 1월~12월(12개월)'))
})

const FREE = `===예시 표시===
이 화면은 예시입니다.

===한 줄 요약===
일의 속도가 달라서 시작 전에 기준만 맞추면 보완이 되는 관계일 수 있어요.

===관계 요약===
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
"이번 주 일정부터 같이 맞춰볼까요?"`
const BARS = [{ label: '업무 호흡', level: 'high', text: '잘 맞는 편', filled: 3 }, { label: '의사소통', level: 'low', text: '조율이 필요한 편', filled: 1 }, { label: '역할 조율', level: 'mid', text: '무난한 편', filled: 2 }]

test('무료 궁합 결과: 예시 표시·한 줄 요약·관계 요약·바 해설/팁·잘 맞는 점·조율할 점·대화 문장을 읽는다', () => {
  const r = parseGunghabFree(FREE, BARS)
  assert.match(r.demo, /예시/)
  assert.match(r.headline, /^일의 속도가 달라서/)
  assert.match(r.summary, /서로 다른 속도/)
  assert.strictEqual(r.bars[0].comment, '일하는 속도가 비슷한 편이에요.')
  assert.strictEqual(r.bars[0].tip, '회의 전에 우선순위를 먼저 맞춰보세요.')
  assert.strictEqual(r.bars[1].tip, '')
  assert.match(r.bars[2].comment, /형식이 어긋난/)       // 형식이 어긋나도 내용은 버리지 않는다
  assert.strictEqual(r.bars[0].text, '잘 맞는 편')       // 수준 문구는 서버가 정한 값 그대로
  assert.match(r.line, /^"이번 주/)
  assert.ok(r.good && r.tune)
})
test('내 사주 무료 결과: 핵심 한 문장(첫 줄)+생활 속 설명, 이유·강점·주의할 습관·실천 팁', () => {
  const r = parseMyFree('===예시 표시===\nX\n===핵심 한 문장===\n차분한 편이에요.\n회의에서는 한 번 정리하고 말해요.\n===이런 성향이 나오는 이유===\nW\n===나의 강점===\nB\n===주의할 습관===\nC\n===바로 실천할 팁===\nD')
  assert.deepStrictEqual([r.demo, r.sentence, r.detail, r.why, r.strength, r.habit, r.tip], ['X', '차분한 편이에요.', '회의에서는 한 번 정리하고 말해요.', 'W', 'B', 'C', 'D'])
})

test('공유 문구에서 이름·생년월일·나이가 지워진다', () => {
  const t = scrubPersonal('민지님은 1990년 5월 15일생이고 34세예요. 철수는 달라요.', [['민지', '나'], ['철수', '상대']])
  assert.ok(!/민지|철수|1990|34세|5월/.test(t), t)
  assert.match(t, /나/)
  // 한 글자 이름처럼 너무 짧으면 일반 단어를 지우지 않도록 건드리지 않는다
  assert.strictEqual(scrubPersonal('가는 길이 같아요', [['가', '나']]), '가는 길이 같아요')
})
test('공유 문구: 실제 결과의 핵심 한 문장 + 서비스 주소만 (결과·주문 주소 없음)', () => {
  const s = '차분해 보이지만 꼼꼼히 따져보는 경향이 있어요.'
  const t = buildShareText({ sentence: s, fallback: '대체 문구', people: [] })
  assert.ok(t.startsWith(s) && t.includes('너는 어때?'))
  const link = t.split('👉')[1].trim()
  assert.strictEqual(link, 'https://www.mysaju.shop')   // 쿼리·경로 없이 서비스 첫 주소만
  assert.ok(!/orderId|orderToken|merchant_uid/.test(t))
  assert.ok(buildShareText({ sentence: '', fallback: '대체 문구' }).startsWith('대체 문구'))
})

test('섹션 제목이 깨져도 결과가 사라지지 않는다 (예: ===의사소transitions===)', () => {
  const bars = [{ label: '업무 호흡' }, { label: '의사소통' }, { label: '역할 조율' }]
  const text = `===한 줄 요약===
요약이에요.

===관계 요약===
관계 요약이에요.

===업무 호흡===
해설: 호흡 해설이에요.
팁: 호흡 팁이에요.

===의사소transitions===
해설: 소통 해설이에요.
팁: 소통 팁이에요.

===역할 조율===
해설: 역할 해설이에요.
팁: 역할 팁이에요.

===잘 맞는 점===
잘 맞아요.

===조율할 점===
조율해요.

===대화 문장===
"함께 정리해 볼까요?"`
  const r = parseGunghabFree(text, bars)
  assert.deepStrictEqual(r.bars.map(b => [b.comment, b.tip]), [['호흡 해설이에요.', '호흡 팁이에요.'], ['소통 해설이에요.', '소통 팁이에요.'], ['역할 해설이에요.', '역할 팁이에요.']])
  assert.ok(r.headline && r.summary && r.good && r.tune && r.line)
  // 알 수 없는 제목이 끝에 추가돼도(예상 자리를 못 찾음) 앞의 결과는 그대로
  const extra = parseGunghabFree(text + '\n\n===덤===\n쓸데없는 말', bars)
  assert.deepStrictEqual(extra.bars, r.bars)
  assert.strictEqual(extra.line, r.line)
  // 같은 제목이 두 번 오면 처음 것을 유지한다
  const dup = parseGunghabFree(text.replace('===조율할 점===', '===잘 맞는 점==='), bars)
  assert.strictEqual(dup.good, '잘 맞아요.')
})

test('내 사주 무료도 제목이 어긋나면 순서대로 채운다', () => {
  const t = `===핵심 한 문장===
첫 문장이에요.
둘째 줄이에요.

===이유가 이런 이유===
이유예요.

===나의 강점===
강점이에요.

===주의할 습관===
습관이에요.

===바로 실천할 팁===
팁이에요.`
  const r = parseMyFree(t)
  assert.deepStrictEqual([r.sentence, r.why, r.strength, r.habit, r.tip], ['첫 문장이에요.', '이유예요.', '강점이에요.', '습관이에요.', '팁이에요.'])
})

const FAMILY_BARS = [{ label: '표현 이해' }, { label: '거리 조절' }, { label: '갈등 조율' }]
const famText = (bodies) => `===한 줄 요약===
요약이에요.

===관계 요약===
관계 요약이에요.

===표현 이해===
${bodies[0]}

===거리 조절===
${bodies[1]}

===갈등 조율===
${bodies[2]}

===잘 맞는 점===
잘 맞아요.

===조율할 점===
조율해요.

===대화 문장===
"먼저 말씀해 주실 수 있을까요?"`

test('가족 바 3개: 해설+팁이 모두 있으면 누락 신호가 없다', () => {
  const full = famText(['해설: 해설1이에요.\n팁: 팁1이에요.', '해설: 해설2예요.\n팁: 팁2예요.', '해설: 해설3이에요.\n팁: 팁3이에요.'])
  const r = parseGunghabFree(full, FAMILY_BARS)
  assert.deepStrictEqual(r.barIssues, [])
  assert.deepStrictEqual(r.bars.map(b => [b.comment, b.tip]), [['해설1이에요.', '팁1이에요.'], ['해설2예요.', '팁2예요.'], ['해설3이에요.', '팁3이에요.']])
})

test('가족 바: 실제 출력처럼 "해설:" 라벨이 빠지면 감지하고, AI 원문 줄만 해설로 읽는다 (새로 만들지 않는다)', () => {
  // 3차 실제 AI 출력 형태: 해설 줄은 있으나 "해설:" 라벨이 없고 "팁:"만 있다
  const bad = famText([
    '도윤님과 서연님은 표현하는 방식에 차이가 있어요.\n\n팁: 가볍게 확인해 보세요.',
    '기준이 조금 다르기 쉬워요.\n\n팁: 언제쯤 괜찮은지 물어보세요.',
    '의견이 부딪힐 때 답답할 수 있어요.\n\n팁: 나눠서 이야기하세요.',
  ])
  const r = parseGunghabFree(bad, FAMILY_BARS)
  assert.strictEqual(r.barIssues.length, 3)
  assert.ok(r.barIssues.every(i => i.includes('해설: 라벨 없음')))
  assert.deepStrictEqual(r.bars.map(b => b.comment), ['도윤님과 서연님은 표현하는 방식에 차이가 있어요.', '기준이 조금 다르기 쉬워요.', '의견이 부딪힐 때 답답할 수 있어요.'])
  assert.deepStrictEqual(r.bars.map(b => b.tip), ['가볍게 확인해 보세요.', '언제쯤 괜찮은지 물어보세요.', '나눠서 이야기하세요.'])
})

test('가족 바: 해설만 있거나 팁만 있고 앞 줄도 없으면 빈 채로 두고 누락을 알린다 (임의로 채우지 않는다)', () => {
  const t = famText(['해설: 해설만 있어요.', '팁: 팁만 있어요.', '해설: 둘 다 있어요.\n팁: 둘 다 있어요.'])
  const r = parseGunghabFree(t, FAMILY_BARS)
  assert.deepStrictEqual([r.bars[0].comment, r.bars[0].tip], ['해설만 있어요.', ''])
  assert.deepStrictEqual([r.bars[1].comment, r.bars[1].tip], ['', '팁만 있어요.'])
  assert.deepStrictEqual(r.barIssues, ['표현 이해: 팁 없음', '거리 조절: 해설 없음'])
  assert.deepStrictEqual([r.bars[2].comment, r.bars[2].tip], ['둘 다 있어요.', '둘 다 있어요.'])
  // 섹션 통째로 없으면 그 사실도 알린다
  const r2 = parseGunghabFree('===한 줄 요약===\n요약이에요.', FAMILY_BARS)
  assert.strictEqual(r2.barIssues.length, 3)
})

const dlgBars = [{ label: '표현 이해' }, { label: '거리 조절' }, { label: '갈등 조율' }]
const dlgText = (line) => `===한 줄 요약===
요약이에요.

===관계 요약===
관계 요약이에요.

===표현 이해===
해설: 해설1이에요.
팁: 팁1이에요.

===거리 조절===
해설: 해설2예요.
팁: 팁2예요.

===갈등 조율===
해설: 해설3이에요.
팁: 팁3이에요.

===잘 맞는 점===
잘 맞아요.

===조율할 점===
조율해요.

===대화 문장===
${line}`

test('대화 문장 안전장치: 반말·두 문장은 화면에 쓰지 않고, 존댓말 한 문장만 표시한다', () => {
  const hidden = [
    '"이 부분에 대해 내가 어떻게 생각하는지 나중에 또 얘기할 수 있는 거라고 생각하고 들어 줄 수 있을까?"',
    '"내 생각이 확실하지 않을 때도 있으니까, 바로 결론을 내려고 하기보다 여유 있게 얘기할 수 있을까?"',
    '"먼저 말해 줄 수 있을까?"',
    '"이 부분은 맡아 줄래?"',
    '"같이 정리해 보자."',
    '"먼저 정리해 볼까요? 그러면 덜 헷갈릴 것 같아요."',   // 존댓말이어도 두 문장
  ]
  for (const t of hidden) {
    const r = parseGunghabFree(dlgText(t), dlgBars)
    assert.strictEqual(r.line, '', t)
    assert.strictEqual(r.lineRejected, true, t)
  }
  const shown = '"먼저 말해 줄 수 있을까요?"'
  const ok = parseGunghabFree(dlgText(shown), dlgBars)
  assert.strictEqual(ok.line, shown)
  assert.strictEqual(ok.lineRejected, false)
})

test('대화 문장이 숨겨져도 한 줄 요약·요약·해설·팁·잘 맞는 점·조율할 점은 그대로 유지된다', () => {
  const good = parseGunghabFree(dlgText('"먼저 말씀해 주실 수 있을까요?"'), dlgBars)
  const bad = parseGunghabFree(dlgText('"여유 있게 얘기할 수 있을까?"'), dlgBars)
  const { line: _a, lineRejected: _b, ...goodRest } = good
  const { line: _c, lineRejected: _d, ...badRest } = bad
  assert.deepStrictEqual(badRest, goodRest)
  assert.deepStrictEqual(bad.bars.map(b => [b.comment, b.tip]), [['해설1이에요.', '팁1이에요.'], ['해설2예요.', '팁2예요.'], ['해설3이에요.', '팁3이에요.']])
  assert.ok(bad.headline && bad.summary && bad.good && bad.tune)
  assert.deepStrictEqual(bad.barIssues, [])
})

test('대화 문장 섹션이 없거나 비어 있으면 line이 비어 화면의 "이렇게 말해보세요" 카드가 숨겨진다', () => {
  const none = parseGunghabFree(dlgText('').replace('===대화 문장===\n', ''), dlgBars)
  assert.strictEqual(none.line, ''); assert.strictEqual(none.lineRejected, false)
  const empty = parseGunghabFree(dlgText(''), dlgBars)
  assert.strictEqual(empty.line, '')
  // App.jsx 는 parsed.line 이 비어 있으면 카드를 그리지 않는다
  const app = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
  assert.ok(app.includes('{parsed.line && (') && app.includes('이렇게 말해보세요'))
})

test('원문 대체 표시(파싱 실패 화면)에서도 검증에 실패한 대화 문장은 나오지 않는다', () => {
  const bad = safeGunghabText(dlgText('"여유 있게 얘기할 수 있을까?"'), dlgBars)
  assert.ok(!bad.includes('얘기할 수 있을까') && !bad.includes('===대화 문장==='))
  assert.ok(bad.includes('요약이에요.') && bad.includes('팁3이에요.') && bad.includes('조율해요.'))
  const good = safeGunghabText(dlgText('"먼저 말씀해 주실 수 있을까요?"'), dlgBars)
  assert.ok(good.includes('먼저 말씀해 주실 수 있을까요?'))
  assert.strictEqual(safeGunghabText('제목 없는 원문입니다', dlgBars), '제목 없는 원문입니다')
  const app = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
  assert.ok(app.includes('removeMarkers(safeGunghabText(gunghabFreeText'))
  assert.ok(!app.includes('removeMarkers(gunghabFreeText)'))   // 원문을 그대로 그리는 경로가 남아 있지 않다
})

test('프런트 대화 문장 검증은 서버 validateDialogueLine 과 같은 결과를 낸다 (가족·직장 공통)', () => {
  const samples = [
    '"들어 줄 수 있을까?"', '"말해 줄 수 있을까?"', '"말해 줄 수 있을까요?"', '"이 부분은 맡아 줄래?"', '"같이 정리해 보자."', '"내가 먼저 연락할까?"',
    '"먼저 정리해 볼까요? 그러면 덜 헷갈릴 것 같아요."', '"이번 업무에서 각각 어떤 부분을 담당하면 좋을지 함께 정리해 볼까요?"',
    '"이 부분은 제가 먼저 연락드릴게요."', '"일정부터 함께 확인해 주시면 감사하겠습니다."', '', '"시간 될 때 알려 줘."',
  ]
  for (const t of samples) assert.deepStrictEqual(validateDialogueLine(t), server.validateDialogueLine(t), t)
  assert.strictEqual(validateDialogueLine('"말해 줄 수 있을까요?"').ok, true)
})


test('1,990원 안내 항목은 서버 유료 프롬프트의 실제 섹션 수와 같고, 월별 운세는 2027년 1~12월로 요청한다', () => {
  const srv = readFileSync(new URL('../../backend/server.js', import.meta.url), 'utf8')
  const paid = srv.slice(srv.indexOf('const paidOnlyPrompt'), srv.indexOf('// 유료 분석 후 점수도 별도 요청'))
  // 고정 섹션 7개 + 나이별 1개(getAgeBasedPaidSection) = 안내의 8개
  assert.strictEqual((paid.match(/^===[^=]+===$/gm) || []).length, 7)
  assert.ok(paid.includes('${getAgeBasedPaidSection('))
  assert.strictEqual(SAJU_PAID.bundles.length, 8)
  // 월별 운세: 2027년 1월~12월만. 2026년 7월 시작 표기는 남아 있지 않다
  assert.ok(!srv.includes('2026년 7월부터'))
  const parts = srv.split('===月運 · 월별 운세===').slice(1)
  assert.strictEqual(parts.length, 2)
  for (const blk of parts) {
    const head = blk.slice(0, 700)
    assert.ok(head.includes('2027년 1월부터 12월까지, 총 12개월'))
    const months = [...head.matchAll(/^(?:2027년 )?(\d{1,2})월: \(내용\)$/gm)].map((m) => +m[1])
    assert.deepStrictEqual(months, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  }
  // 심화 안내는 deepPrompt의 7개 섹션
  const deepStart = srv.indexOf('const deepPrompt')
  const deep = srv.slice(deepStart, srv.indexOf('streamToClient(res, deepPrompt'))
  assert.strictEqual((deep.match(/^===[^\n]+===$/gm) || []).length, 7)
  const app = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
  assert.strictEqual((app.match(/const DEEP_ITEMS = \[([\s\S]*?)\n\]/)[1].match(/^ {2}'/gm) || []).length, 7)
  // 기본 풀이 뒤: 문장 중간에서 끊긴 흐림 미리보기를 쓰지 않고, 별도 카드로 심화 안내
  const upsell = app.slice(app.indexOf('심화분석 업셀'), app.indexOf('하단 액션 영역'))
  assert.ok(!upsell.includes('_teaser') && !upsell.includes('blur('))
  // 상품명은 정확히: 무료 풀이 / 전체 분석(1,990원) / 심화 분석(9,900원). ('기본 풀이'는 첫 화면에서 무료 풀이를 뜻하므로 1,990원 구간에는 쓰지 않는다)
  assert.ok(upsell.includes('여기까지가 전체 분석(1,990원)이에요') && upsell.includes('선택 · 별도 상품'))
})
