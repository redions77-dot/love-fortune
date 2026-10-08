import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanGunghabText, nameLabel, isDefaultName } from './gunghabText.js'
import { isRealBirthDate, showBadDate } from './birthDate.js'
import { validateDialogueLine, dialogueRule, parseGunghabFree, safeGunghabText } from './relations.js'
import { summarizeGunghabPaid } from './reportSummary.js'
import { parseContentBlocks } from './contentBlocks.js'

// ── 1. 마크다운 ──
test('궁합 결과의 ** 와 --- 를 지운다(실제 AI 가 낸 친구 유료 결과의 모양)', () => {
  const raw = '===우정이 이어지는 방식===\n\n📌 **같은 해에 태어난 동갑 친구**\n두 사람은 같은 년주를 가지고 있어요.\n\n---\n\n🔑 **공통 경험에서 출발하기**\n태민님과 규현님 모두 20대예요.'
  const out = cleanGunghabText(raw, { a: '태민', b: '규현' })
  assert.ok(!out.includes('*') && !/^---$/m.test(out))
  assert.ok(out.includes('📌 같은 해에 태어난 동갑 친구') && out.includes('태민님과 규현님 모두 20대예요.'))
  const heads = parseContentBlocks(out.split('===')[2]).filter(b => b.type === 'h3' || b.type === 'callout').map(b => b.text || b.head)
  assert.ok(heads.every(h => !String(h).includes('*')), '소제목에도 ** 가 남지 않는다')
})

// ── 4. 호칭 ──
test('이름을 비워 서버가 A·B 로 채웠으면 당신·상대방으로 보인다(조사 그대로 맞음)', () => {
  const out = cleanGunghabText('A님은 불 기운이에요. B님과 A님이 함께하면 B님이 편해요. A님의 말을 B님을 위해 써요.', { a: 'A', b: 'B' })
  assert.equal(out, '당신은 불 기운이에요. 상대방과 당신이 함께하면 상대방이 편해요. 당신의 말을 상대방을 위해 써요.')
  assert.ok(!/[AB]님/.test(out))
  assert.equal(cleanGunghabText('A님은 좋아요', { a: '', b: '' }), '당신은 좋아요')
})
test('이름 한쪽만 비운 경우 비운 쪽만 바뀐다', () => {
  assert.equal(cleanGunghabText('도윤님과 B님은 잘 맞아요.', { a: '도윤', b: 'B' }), '도윤님과 상대방은 잘 맞아요.')
  assert.equal(cleanGunghabText('A님과 어머니님이에요.', { a: 'A', b: '어머니' }), '당신과 어머니예요.')
})
test('어머니님 같은 호칭 중복을 없애고 조사를 받침에 맞춘다', () => {
  const out = cleanGunghabText('어머니님이 도윤님을 응원해요. 어머니님은 따뜻해요. 어머니님을 위해 어머니님으로 어머니님과 어머니님이에요.', { a: '도윤', b: '어머니' })
  assert.equal(out, '어머니가 도윤님을 응원해요. 어머니는 따뜻해요. 어머니를 위해 어머니로 어머니와 어머니예요.')
  assert.equal(cleanGunghabText('아버지님이 오세요. 아버지님과 아버지님을', { a: '하늘', b: '아버지' }), '아버지가 오세요. 아버지와 아버지를')
  assert.equal(cleanGunghabText('엄마님은 좋아요', { a: '하늘', b: '엄마' }), '엄마는 좋아요')
})
test('이미 님이 붙은 이름은 님이 겹치지 않고, 평범한 이름·직함 이름은 그대로다', () => {
  assert.equal(cleanGunghabText('김부장님님은 좋아요.', { a: '하늘', b: '김부장님' }), '김부장님은 좋아요.')
  const same = '김부장님과 하늘님은 잘 맞아요. 지민님이 현우님을 도와요.'
  assert.equal(cleanGunghabText(same, { a: '하늘', b: '김부장' }), same)
  assert.equal(cleanGunghabText(same, { a: '지민', b: '현우' }), same)
})
test('사주 표 라벨', () => {
  assert.equal(nameLabel('A', 'a'), '나'); assert.equal(nameLabel('', 'b'), '상대방'); assert.equal(nameLabel('B', 'b'), '상대방')
  assert.equal(nameLabel('은정', 'a'), '은정님'); assert.equal(nameLabel('어머니', 'b'), '어머니'); assert.equal(nameLabel('김부장', 'b'), '김부장님'); assert.equal(nameLabel('김부장님', 'b'), '김부장님')
  assert.equal(nameLabel('A', 'b'), 'A님', "B 쪽에서 'A'는 실제 이름")
  assert.ok(isDefaultName('A', 'a') && !isDefaultName('A', 'b'))
})

// ── 5. 날짜 ──
test('없는 날짜는 거절하고 있는 날짜는 받는다', () => {
  const now = new Date('2026-10-08')
  const ok = (y, m, d, o) => isRealBirthDate(y, m, d, { now, ...o })
  for (const [y, m, d] of [['2021', '2', '30'], ['2021', '2', '29'], ['2021', '4', '31'], ['2021', '6', '31'], ['2021', '9', '31'], ['2021', '11', '31'], ['2021', '0', '1'], ['2021', '13', '1'], ['2021', '1', '0'], ['2021', '1', '32'], ['1899', '12', '31'], ['2027', '1', '1'], ['202', '1', '1'], ['2021', '', '1'], ['2021', '1.5', '1']]) assert.equal(ok(y, m, d), false, [y, m, d].join('-'))
  for (const [y, m, d] of [['2020', '2', '29'], ['2000', '2', '29'], ['1900', '1', '1'], ['2021', '2', '28'], ['2021', '12', '31'], ['2026', '10', '8'], ['1990', '5', '15']]) assert.equal(ok(y, m, d), true, [y, m, d].join('-'))
  assert.equal(ok('1900', '2', '29'), false, '1900년은 평년')
})
test('음력은 월 1~12·일 1~30 범위만 확인한다', () => {
  const now = new Date('2026-10-08')
  assert.equal(isRealBirthDate('2021', '2', '30', { lunar: true, now }), true)
  assert.equal(isRealBirthDate('2021', '2', '31', { lunar: true, now }), false)
  assert.equal(isRealBirthDate('2021', '13', '1', { lunar: true, now }), false)
})
test('안내 문구는 년·월·일을 다 입력했는데 틀릴 때만 보인다', () => {
  assert.equal(showBadDate('2021', '2', '30'), true)
  assert.equal(showBadDate('2021', '2', ''), false)
  assert.equal(showBadDate('202', '2', '30'), false)
  assert.equal(showBadDate('2021', '2', '28'), false)
})

// ── 2. 대화 문장 ──
test('기본 검증은 예전과 같다(한 문장·존댓말)', () => {
  assert.equal(validateDialogueLine('"내 생각은 이런데, 너는 어떻게 생각해?"').ok, false)
  assert.equal(validateDialogueLine('"말해 줄 수 있을까요? 괜찮아요."').ok, false)
  assert.equal(validateDialogueLine('"말해 줄 수 있을까요?"').ok, true)
})
test('관계별 기준: 연인·부부·친구·부모→자녀는 반말 허용, 가족(형제)·직장·자녀→부모는 존댓말만', () => {
  assert.deepEqual(dialogueRule('연인'), { casual: true, maxSentences: 2 })
  for (const k of ['연인', '부부', '친구']) assert.equal(dialogueRule(k).casual, true, k)
  assert.equal(dialogueRule('부모자녀', '부모').casual, true)
  assert.equal(dialogueRule('부모자녀', '자녀').casual, false)
  assert.equal(dialogueRule('형제가족').casual, false)
  assert.equal(dialogueRule('직장동료').casual, false)
})
test('실제 AI 가 쓴 반말·두 문장 대화가 관계에 맞으면 보이고, 안 맞으면 계속 숨는다', () => {
  const dlg = (line) => '===한 줄 요약===\n요약이에요.\n\n===대화 문장===\n' + line
  const friend = '"내가 놓친 부분이 있으면 바로 말해 줄래? 그게 더 편할 것 같아."'
  const couple = '"내 생각은 이런데, 너는 어떻게 생각해?"'
  const parent = '"네 생각과 내 생각이 다를 수도 있는데, 그래도 들려줄 수 있을까?"'
  assert.equal(parseGunghabFree(dlg(friend), [], dialogueRule('친구')).line, friend)
  assert.equal(parseGunghabFree(dlg(couple), [], dialogueRule('연인')).line, couple)
  assert.equal(parseGunghabFree(dlg(parent), [], dialogueRule('부모자녀', '부모')).line, parent)
  assert.equal(parseGunghabFree(dlg(parent), [], dialogueRule('부모자녀', '자녀')).line, '', '자녀→부모 반말은 숨김')
  assert.equal(parseGunghabFree(dlg(couple), [], dialogueRule('직장동료')).line, '', '직장 반말은 숨김')
  assert.equal(parseGunghabFree(dlg(couple), [], dialogueRule('형제가족')).line, '', '형제·가족 반말은 숨김')
  assert.equal(parseGunghabFree(dlg(couple), []).line, '', '기준을 안 주면 예전처럼 엄격')
  const three = '"그래. 그렇구나. 알겠어."'
  assert.equal(parseGunghabFree(dlg(three), [], dialogueRule('친구')).line, '', '세 문장 이상은 숨김')
  assert.ok(!safeGunghabText(dlg(couple), [], dialogueRule('직장동료')).includes('대화 문장'))
  assert.ok(safeGunghabText(dlg(couple), [], dialogueRule('연인')).includes('대화 문장'))
})

// ── 3. 유료 한눈에 보기 ──
const C1 = `===관계 총평===

📌 지민님과 현우님은 기본 기질에서 조율이 필요한 구조지만, 마음을 표현하고 받아들이는 흐름은 잘 맞는 편이에요. 서로의 속도 차이를 인정하고, 먼저 물어보는 습관을 들이면 많은 오해를 줄일 수 있어요.

🔑 이번 주에는 연락을 주고받을 때 상대의 템포를 한 번만 더 기다려보세요. "빨리 답해줘"보다 "준비되면 말해줘"라고 먼저 말해보세요.`
const C6 = `===관계 총평===

🔑 비슷한 시기, 다른 방식을 인정하기
태민님과 규현님은 같은 해에 태어나 비슷한 감각을 공유하지만, 여러 상극 관계가 읽혀요. 맞춰가며 편해지는 구조로 볼 수 있어요.

📌 이번 주에 해볼 행동
"요즘 어때?"보다 "이번 주에 뭐 재밌는 거 있었어?" 같은 구체적인 질문으로 대화를 시작해보세요. 가볍게 먼저 꺼내는 연습을 해보세요.`
const secs = (t) => { const p = t.split(/===(.+?)===/s); const o = []; for (let i = 1; i < p.length; i += 2) o.push({ title: p[i].trim(), content: p[i + 1].trim() }); return o }
test('유료 요약 카드: ✅·⚠️가 없어도 관계 총평의 한 줄 정리와 이번 주 행동이 나온다', () => {
  const s = summarizeGunghabPaid(secs(C1), '')
  assert.ok(s && s.headline.startsWith('지민님과 현우님은') && s.headline.endsWith('잘 맞는 편이에요.'))
  assert.ok(s.action.startsWith('이번 주에는 연락을') && s.actionLabel === '이번 주에 해볼 행동')
  assert.equal(s.compare, null)
})
test('소제목 아래에 행동이 따로 오는 모양도 읽는다', () => {
  const s = summarizeGunghabPaid(secs(C6), '')
  assert.ok(s.headline.startsWith('태민님과 규현님은 같은 해에') && !s.headline.includes('이번 주'))
  assert.ok(s.action.startsWith('"요즘 어때?"보다') && s.actionLabel === '이번 주에 해볼 행동')
})
test('무료에서 검증된 대화 문장이 있으면 그것을 행동 칸에 쓴다(예전 동작)', () => {
  const s = summarizeGunghabPaid(secs(C1), '"지금 이야기해도 괜찮을까요?"')
  assert.equal(s.action, '"지금 이야기해도 괜찮을까요?"'); assert.equal(s.actionLabel, '바로 써볼 대화 방법'); assert.ok(s.headline)
})
test('총평 섹션이 없으면 새 문장을 만들지 않고 카드를 생략한다(예전 동작)', () => {
  assert.equal(summarizeGunghabPaid([{ title: '두 사람의 연애 스타일', content: '📌 이번 주에는 쉬어요. 문단이에요.' }], ''), null)
})
test('✅·⚠️ 가 모두 있으면 예전 비교 카드 그대로', () => {
  const t = '===두 사람의 연애 스타일===\n\n✅ 잘 맞는 부분\n서로 편하게 이야기해요.\n\n⚠️ 조심할 부분\n속도가 다를 수 있어요.\n\n===관계 총평===\n\n📌 총평 문단이에요.'
  const s = summarizeGunghabPaid(secs(t), '')
  assert.ok(s.compare && s.compare.left.text === '서로 편하게 이야기해요.' && s.compare.right.text === '속도가 다를 수 있어요.')
  assert.equal(s.headline, null)
})
