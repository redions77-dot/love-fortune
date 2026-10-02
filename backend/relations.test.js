const test = require('node:test');
const assert = require('node:assert');
const R = require('./relations');
const { PAID_ONLY_ANALYSIS_TYPES } = require('./secure');

const KEYS = ['연인', '부부', '부모자녀', '형제가족', '친구', '직장동료'];
const ROMANCE = /결혼|연애|연인|배우자|혼인|이성|애정|사랑|동거|궁합 총평/;
const my = { gender: '여성', 년주: '庚午', 월주: '辛巳', 일주: '甲子', 시주: '' };
const partner = { gender: '남성', 년주: '壬申', 월주: '癸卯', 일주: '丙午', 시주: '' };
const args = (relKey, role = '') => {
  const bars = R.buildBars(relKey, R.calcRelationLevels(my, partner));
  return { relKey, role, nameA: '가', nameB: '나', my, partner, ages: { a: '30대', b: '30대' }, bars, thisYear: 2026 };
};

test('관계 선택값: 6종만 허용하고 모르는 값은 null (연인으로 바꾸지 않는다)', () => {
  for (const k of ['연인', '부부', '형제가족', '친구', '직장동료']) assert.deepStrictEqual(R.normalizeRelation(k, ''), { key: k, role: '' });
  assert.strictEqual(R.normalizeRelation('이상한값', ''), null);
  assert.strictEqual(R.normalizeRelation('', ''), null);
  assert.strictEqual(R.normalizeRelation(undefined, undefined), null);
});
test('부모·자녀는 역할(부모/자녀)이 있어야 하고, 예전 값(가족·직장상사)은 가까운 관계로 옮긴다', () => {
  assert.strictEqual(R.normalizeRelation('부모자녀', ''), null);
  assert.strictEqual(R.normalizeRelation('부모자녀', '친구'), null);
  assert.deepStrictEqual(R.normalizeRelation('부모자녀', '자녀'), { key: '부모자녀', role: '자녀' });
  assert.strictEqual(R.normalizeRelation('가족', '').key, '형제가족');
  assert.strictEqual(R.normalizeRelation('직장상사', '').key, '직장동료');
});

test('바는 관계마다 3개, 수준은 3단계 문구만 쓰고 숫자 점수는 없다', () => {
  for (const k of KEYS) {
    const bars = R.buildBars(k, ['high', 'mid', 'low']);
    assert.strictEqual(bars.length, 3);
    assert.deepStrictEqual(bars.map(b => b.text), ['잘 맞는 편', '무난한 편', '조율이 필요한 편']);
    assert.deepStrictEqual(bars.map(b => b.filled), [3, 2, 1]);
    assert.ok(bars.every(b => !('score' in b)));
  }
  assert.deepStrictEqual(R.RELATIONS.직장동료.bars.map(b => b.label), ['업무 호흡', '의사소통', '역할 조율']);
  assert.deepStrictEqual(R.RELATIONS.형제가족.bars.map(b => b.label), ['표현 이해', '거리 조절', '갈등 조율']);
});

test('수준 계산: 같은 입력이면 같은 결과, 충·극은 low, 합·생은 high', () => {
  assert.deepStrictEqual(R.calcRelationLevels(my, partner), R.calcRelationLevels(my, partner));
  // 일지 子午 충 → 일지 low / 일간 甲(목)-丙(화) 목생화 → high / 월지 巳(화)-卯(목) 목생화 → high
  assert.deepStrictEqual(R.calcRelationLevels(my, partner), ['high', 'low', 'high']);
  // 일지 子丑 육합 → high
  assert.strictEqual(R.calcRelationLevels({ 일주: '甲子', 월주: '甲子' }, { 일주: '甲丑', 월주: '甲丑' })[1], 'high');
  // 입력이 비어 있으면 mid
  assert.deepStrictEqual(R.calcRelationLevels({ 일주: '-', 월주: '-' }, { 일주: '-', 월주: '-' }), ['mid', 'mid', 'mid']);
});

test('가족·친구·직장 관계의 정의와 풀이 구성에는 연애·결혼 해석이 없다', () => {
  for (const k of ['부모자녀', '형제가족', '친구', '직장동료']) {
    const d = R.RELATIONS[k];
    const own = [d.label, ...d.bars.flatMap(b => [b.label, b.aspect]), ...d.paid.flat(), d.tone].join(' ');
    assert.ok(!ROMANCE.test(own), `${k}: ${own.match(ROMANCE)}`);
  }
});

test('관계마다 프롬프트의 관점·섹션이 그 관계 것이고 다른 관계 것이 섞이지 않는다', () => {
  for (const k of KEYS) {
    const role = k === '부모자녀' ? '부모' : '';
    const free = R.buildFreeGunghabPrompt(args(k, role));
    const paid = R.buildPaidGunghabPrompt(args(k, role));
    assert.ok(free.includes(R.RELATIONS[k].stance) && paid.includes(R.RELATIONS[k].stance), k);
    for (const [title] of R.RELATIONS[k].paid) assert.ok(paid.includes(`===${title}===`), `${k}:${title}`);
    for (const b of R.RELATIONS[k].bars) assert.ok(free.includes(`===${b.label}===`), `${k}:${b.label}`);
    for (const other of KEYS.filter(o => o !== k)) assert.ok(!paid.includes(R.RELATIONS[other].stance), `${k}에 ${other} 관점`);
  }
});

test('무료 풀이: 요약·바 3개·잘 맞는 점·조율할 점·대화 문장·공유 문장을 모두 완결하고, 유료 섹션과 점수는 없다', () => {
  for (const k of KEYS) {
    const free = R.buildFreeGunghabPrompt(args(k, k === '부모자녀' ? '자녀' : ''));
    for (const t of ['관계 요약', '잘 맞는 점', '조율할 점', '대화 문장', '공유 문장']) assert.ok(free.includes(`===${t}===`), `${k}:${t}`);
    for (const [title] of R.RELATIONS[k].paid) assert.ok(!free.includes(`===${title}===`), `${k}: 유료 섹션 ${title}이 무료에 포함`);
    assert.ok(!/\d+\s*점/.test(free));
    assert.ok(free.includes('이름·성별·생년월일·나이·상대 정보는 절대 넣지 말고'));
  }
});

test('유료 풀이: 점수·옛 연도 표기 없이 관계별 섹션과 적용 방법을 요구한다', () => {
  for (const k of KEYS) {
    const paid = R.buildPaidGunghabPrompt(args(k, k === '부모자녀' ? '부모' : ''));
    assert.ok(!/\d+\s*점/.test(paid) && !paid.includes('2025~2027'));
    assert.ok(paid.includes('실제로 써볼 수 있는 말이나 행동'));
    assert.ok(paid.includes('현재는 2026년'));
  }
});

test('공감·신뢰 원칙: 일괄 공감·감정 단정을 금지하고 가능성 표현을 요구한다', () => {
  const p = R.buildFreeGunghabPrompt(args('친구'));
  assert.ok(p.includes('그동안 많이 힘드셨죠') && p.includes('시작하지 마세요'));
  assert.ok(p.includes('~한 경향이 있어요') && p.includes('단정하지 마세요'));
  assert.ok(!p.includes('맞아, 당신이 이런 사람이지'));
});

test('부모·자녀: 부모/자녀 역할에 따라 읽는 사람의 위치가 프롬프트에 반영된다', () => {
  const asParent = R.buildFreeGunghabPrompt(args('부모자녀', '부모'));
  const asChild = R.buildFreeGunghabPrompt(args('부모자녀', '자녀'));
  assert.ok(asParent.includes('가님이 부모, 나님이 자녀'));
  assert.ok(asChild.includes('나님이 부모, 가님이 자녀'));
});

test('무료 궁합 유형은 주문 없이 호출할 수 있고 상세 풀이는 주문이 필요하다', () => {
  assert.ok(PAID_ONLY_ANALYSIS_TYPES.has('궁합'));
  assert.ok(!PAID_ONLY_ANALYSIS_TYPES.has('궁합무료'));
});
