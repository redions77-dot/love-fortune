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

test('무료 풀이: 한 줄 요약·관계 요약·바 3개·잘 맞는 점·조율할 점·대화 문장을 모두 완결하고, 유료 섹션과 점수는 없다', () => {
  for (const k of KEYS) {
    const free = R.buildFreeGunghabPrompt(args(k, k === '부모자녀' ? '자녀' : ''));
    for (const t of ['한 줄 요약', '관계 요약', '잘 맞는 점', '조율할 점', '대화 문장']) assert.ok(free.includes(`===${t}===`), `${k}:${t}`);
    for (const [title] of R.RELATIONS[k].paid) assert.ok(!free.includes(`===${title}===`), `${k}: 유료 섹션 ${title}이 무료에 포함`);
    assert.ok(!/\d+\s*점/.test(free));
    assert.ok(!free.includes('===공유 문장==='));
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

test('팁·대화 문장은 관계별 실제 상황과 앞선 해석에 연결되고, 어느 관계에나 붙는 일반 조언을 금지한다', () => {
  for (const k of KEYS) {
    const role = k === '부모자녀' ? '부모' : '';
    const free = R.buildFreeGunghabPrompt(args(k, role));
    assert.ok(free.includes('[이 관계의 실제 상황] ' + R.situationsFor(R.RELATIONS[k], role)), k);
    assert.ok(free.includes('같은 항목의 해설과 이어져야 합니다'));
    assert.ok(free.includes("'조율할 점'에서 말한 상황과 직접 연결된 예방형·제안형 문장") && free.includes('이미 갈등이 있었다고 가정하지 마세요'), k);
    assert.ok(free.includes('어느 관계에나 붙는 일반 조언은 쓰지 마세요'));
  }
  assert.match(R.buildFreeGunghabPrompt(args('직장동료')), /업무 우선순위.*피드백.*일정.*역할 분담/);
  // 부모·자녀는 역할에 따라 상황이 다르다
  assert.notStrictEqual(R.situationsFor(R.RELATIONS.부모자녀, '부모'), R.situationsFor(R.RELATIONS.부모자녀, '자녀'));
  // 관계 간 상황 목록이 겹치지 않는다
  const all = KEYS.map(k => R.situationsFor(R.RELATIONS[k], '부모'));
  assert.strictEqual(new Set(all).size, KEYS.length);
});

test('유료 안내 묶음: 실제 유료 섹션만 약속하고, 모든 섹션이 한 번씩 묶이며, 한자가 없다', () => {
  for (const k of KEYS) {
    const d = R.RELATIONS[k];
    assert.ok(d.bundles.length >= 3 && d.bundles.length <= 4, k);
    assert.deepStrictEqual(d.bundles.flatMap(b => b[2]), d.paid.map(p => p[0]), k);
    assert.ok(!/[一-鿿]/.test(d.paidTitle + d.bundles.map(b => b[0] + b[1]).join('')), k);
  }
  assert.strictEqual(R.RELATIONS.직장동료.paidTitle, '이 사람과 더 편하게 일하려면');
});

test('내 사주 무료 프롬프트: 균형 있는 첫 문장, 가정형 장면, 모순 금지, 계산값 근거, 해요체, 짧은 팁', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, 'server.js'), 'utf8');
  const free = src.slice(src.indexOf('const basePrompt'), src.indexOf('const paidOnlyPrompt'));
  for (const t of ['핵심 한 문장', '이런 성향이 나오는 이유', '나의 강점', '주의할 습관', '바로 실천할 팁']) assert.ok(free.includes('===' + t + '==='), t);
  const must = [
    '"상위 몇 %" 같은 수치 평가는 쓰지 마세요',
    '유형 이름(예: ~형)은 쓰지 마세요',
    '단점이나 부정적인 결과로 시작하지 마세요',
    '입력받지 않은 과거 경험을 실제 있었던 일처럼 쓰지 마세요',
    '누구에게나 해당하는 칭찬',
    '강점·주의할 습관·바로 실천할 팁은 서로 모순되면 안 됩니다',
    "바로 위 '주의할 습관'을 보완하는 구체적인 행동 딱 1개",
    '[사주 계산값]에 없는 오행·음양·상생상극은 새로 만들지 마세요',
    '모든 문장은 해요체',
    '(짧은 1~2문장)',
  ];
  for (const m of must) assert.ok(free.includes(m), m);
  assert.ok(src.includes('${factsBlock(') && src.includes('${규칙문}'));   // 계산값 표가 모든 개인 풀이 프롬프트에 들어간다
  assert.ok(!src.includes('getScoreOnly') && !src.includes("type: 'score'"));
  assert.ok(!/===공유 문장===/.test(free));
});

test('프롬프트: 이번 최종 확인에서 나온 문제(오행 비유·심리 단정·반말 대화)를 막는 규칙이 들어 있다', () => {
  const S2 = require('./saju');
  const src = require('fs').readFileSync(require('path').join(__dirname, 'server.js'), 'utf8');
  const free = src.slice(src.indexOf('const basePrompt'), src.indexOf('const paidOnlyPrompt'));
  const rel = (k) => R.buildFreeGunghabPrompt(args(k, ''));
  for (const text of [S2.규칙문, free, rel('직장동료')]) {
    assert.ok(text.includes('한 단계 더 추론한 비유·인과'));
    assert.ok(text.includes('범위를 넓히려 한다, 무게감을 느낀다'));
    assert.ok(text.includes('일·프로젝트'));
  }
  assert.ok(S2.규칙문.includes("계산값 → 표준 오행 관계"));
  assert.ok(rel('직장동료').includes('이 관계에서는 ~하기 쉬울 수 있어요'));
  // 대화 문장: 한 문장, 가족·직장은 존댓말, 지난 일 가정 금지
  for (const k of ['직장동료', '형제가족']) {
    const p = rel(k);
    assert.ok(p.includes('정확히 한 문장') && p.includes('반드시 존댓말') && p.includes('반말'), k);
    assert.ok(p.includes('요즘 자꾸'), k);
  }
  assert.match(R.RELATIONS.직장동료.tone, /존댓말 한 문장.*반말 절대 금지/);
  assert.match(R.RELATIONS.형제가족.tone, /존댓말/);
  // 내 사주 무료: 섹션이 겹치지 않고 팁이 우선
  assert.ok(free.includes('강점만 쓰세요') && free.includes('주의점만 쓰세요') && free.includes('오늘 바로 해볼 수 있게 언제·무엇을·어떻게'));
  assert.ok(!/더 잘 쓰는 방법|줄여보는 방법/.test(free));
  assert.ok(free.includes('가정하지 마세요'));
});

test('자동 점검 규칙: 이번에 발견된 문제는 잡고 정상 문장은 막지 않는다', () => {
  const Q = require('./dev/quality-check.js');
  // 잡아야 하는 것
  assert.match('쇠는 나무를 잘라내는 기운이기도 하지만, 오히려 나무를 다루고 다듬는 도구로도 작동해요.', Q.OVERREACH);
  assert.match('외부 압력이 성장에 도움이 돼요.', Q.OVERREACH);
  assert.match('자신이 해낼 수 있는 범위를 계속 넓혀가려는 경향으로 읽을 수 있어요.', Q.ASSERT_BEHAVIOR);
  assert.match('한 번에 해결하려다 보니 무게감을 느끼곤 해요.', Q.ASSERT_BEHAVIOR);
  assert.match('요즘 자주 부탁하는 일들이 많은데 기다려 줄 수 있을까요?', Q.ASSUMED_PAST);
  const bad = Q.sentencesOf('"우선순위를 정하기 전에 각각 어느 부분을 맡아볼지 먼저 함께 정리해도 괜찮을까? 그래야 나중에 진행할 때 덜 헷갈릴 것 같아."');
  assert.strictEqual(bad.length, 2);
  assert.strictEqual(R.validateDialogueLine('그래야 나중에 진행할 때 덜 헷갈릴 것 같아').ok, false);
  // 막지 말아야 하는 정상 문장
  assert.doesNotMatch('나무 기운은 불 기운을 키워주는 관계로 읽을 수 있어요.', Q.OVERREACH);
  assert.doesNotMatch('나를 누르는 기운이 많아 부담을 느낄 때가 있을 수 있어요.', Q.OVERREACH);
  assert.doesNotMatch('이 관계에서는 답을 서두르기 쉬울 수 있어요.', Q.ASSERT_BEHAVIOR);
  assert.doesNotMatch('일정을 정하기 전에 각자 맡을 부분을 먼저 정리해도 괜찮을까요?', Q.ASSUMED_PAST);
  const good = Q.sentencesOf('"일을 나누기 전에 각자 어느 부분을 맡을지 먼저 함께 정리해도 괜찮을까요?"');
  assert.strictEqual(good.length, 1);
  assert.ok(R.validateDialogueLine(good[0]).ok);
});

test('서버 확정 두 사람 관계: 표준 상생·상극과 방향이 맞고, 프롬프트에 그대로 들어간다', () => {
  const P = (일주, 월주 = '甲寅', 년주 = '癸酉') => ({ 년주, 월주, 일주, 시주: '' });
  // 癸(물) vs 己(흙): 흙이 물을 누른다 — 이번에 AI가 "서로 보완"이라고 잘못 쓴 사례
  const a = R.relationFacts(P('癸亥', '壬戌', '戊辰'), P('己巳'), '도윤', '서연').items.find(x => x.title === '일간(기질)');
  assert.strictEqual(a.kind, '상극');
  assert.strictEqual(a.from, '토'); assert.strictEqual(a.to, '수'); assert.strictEqual(a.aToB, false);   // 상대(서연) 쪽 흙이 나(도윤) 쪽 물을 누른다
  assert.ok(a.text.includes('서연님 쪽 흙 기운이 도윤님 쪽 물 기운을 누르는 관계(상극)'));
  assert.ok(a.speak.includes('보완한다'));
  // 상생 방향: 甲(나무) → 丁(불) = 나무가 불을 키워준다 (읽는 사람이 나무)
  const b = R.relationFacts(P('甲戌'), P('丁卯'), '지우', '민준').items.find(x => x.title === '일간(기질)');
  assert.deepStrictEqual([b.kind, b.from, b.to, b.aToB], ['상생', '목', '화', true]);
  assert.ok(b.text.includes('지우님 쪽 나무 기운이 민준님 쪽 불 기운을 키워주는 관계(상생)'));
  // 일지 충·육합
  assert.strictEqual(R.relationFacts(P('甲子'), P('丙午'), '가', '나').items.find(x => x.title === '일지').kind, '충');
  assert.strictEqual(R.relationFacts(P('甲子'), P('丙丑'), '가', '나').items.find(x => x.title === '일지').kind, '육합');
  assert.strictEqual(R.pairKind('목', '목').kind, '같음');
  // 모든 오행 쌍이 표준 표와 일치
  const 생 = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }, 극 = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
  for (const x of ['목', '화', '토', '금', '수']) for (const y of ['목', '화', '토', '금', '수']) {
    const k = R.pairKind(x, y);
    if (x === y) assert.strictEqual(k.kind, '같음');
    else if (생[x] === y) assert.deepStrictEqual([k.kind, k.from, k.to], ['상생', x, y]);
    else if (생[y] === x) assert.deepStrictEqual([k.kind, k.from, k.to], ['상생', y, x]);
    else if (극[x] === y) assert.deepStrictEqual([k.kind, k.from, k.to], ['상극', x, y]);
    else assert.deepStrictEqual([k.kind, k.from, k.to], ['상극', y, x]);
  }
  // 프롬프트에 서버 확정 관계 블록과 제목 고정 지시가 들어간다
  const p = R.buildFreeGunghabPrompt(args('형제가족', ''));
  assert.ok(p.includes('[서버가 확정한 두 사람의 오행 관계') && p.includes('쓰는 법:'));
  assert.ok(p.includes('각 사람을 오행만으로 성격(부드럽다·단단하다 등)으로 설명하지 마세요'));
  assert.ok(p.includes('한 글자도 바꾸지 말고 그대로 복사'));
});

test('대화 문장 검증: 한 문장 + 존댓말, 가족·직장 반말을 잡는다', () => {
  const bad = [
    '"다음에 뭔가 정하기 전에 먼저 생각해 둔 게 있으면 말해 줄 수 있을까?"',          // 이번 가족 결과 (반말)
    '"우선순위를 정하기 전에 각각 어느 부분을 맡아볼지 먼저 함께 정리해도 괜찮을까? 그래야 나중에 진행할 때 덜 헷갈릴 것 같아."', // 이전 직장 결과 (두 문장 + 반말)
    '"이 부분은 네가 맡아 줄래?"',
    '"같이 정리해 보자."',
    '',
  ];
  for (const t of bad) assert.strictEqual(R.validateDialogueLine(t).ok, false, t);
  assert.ok(R.validateDialogueLine(bad[1]).reasons.some(r => r.includes('한 문장이 아님')));
  const good = [
    '"이번 업무에서 각각 어떤 부분을 담당하면 좋을지 함께 정리해 볼까요?"',
    '"정하기 전에 먼저 생각해 두신 게 있으면 말씀해 주실 수 있을까요?"',
    '"일정부터 같이 확인해 주시면 감사하겠습니다."',
    '"저는 이 부분을 맡을게요."',
  ];
  for (const t of good) assert.deepStrictEqual(R.validateDialogueLine(t), { ok: true, reasons: [] }, t);
});

test('가족·직장 대화 문장: 반말 종결(들어 줄 수 있을까?·말해 줄 수 있을까?·~줄래?·~보자 등)은 실패하고 존댓말 한 문장은 통과한다', () => {
  const banmal = [
    '"이 부분에 대해 내가 어떻게 생각하는지 나중에 또 얘기할 수 있는 거라고 생각하고 들어 줄 수 있을까?"',   // 3차 실제 가족 출력
    '"다음에 뭔가 정하기 전에 먼저 생각해 둔 게 있으면 말해 줄 수 있을까?"',
    '"이 부분은 네가 맡아 줄래?"',
    '"주말에 같이 정리해 보자."',
    '"내가 먼저 연락할까?"',
    '"그건 내가 도와줄까?"',
    '"시간 될 때 알려 줘."',
  ];
  for (const t of banmal) {
    const v = R.validateDialogueLine(t);
    assert.strictEqual(v.ok, false, t);
    assert.ok(v.reasons.some(r => r.startsWith('반말 종결')), t + ' → ' + v.reasons.join('|'));
  }
  // 가족 관계 프롬프트와 직장 프롬프트 모두 반말 예시를 명시한다
  for (const k of ['형제가족', '직장동료']) {
    const p = R.buildFreeGunghabPrompt(args(k, ''));
    assert.ok(p.includes('~줄까?, ~줄래?, ~보자, ~들어 줄 수 있을까?'), k);
  }
  const polite = [
    '"먼저 생각해 두신 게 있으면 말씀해 주실 수 있을까요?"',
    '"주말에 같이 정리해 볼까요?"',
    '"이 부분은 제가 먼저 연락드릴게요."',
    '"시간 되실 때 알려 주세요."',
    '"괜찮으시다면 일정부터 함께 확인해 보면 좋겠습니다."',
  ];
  for (const t of polite) assert.deepStrictEqual(R.validateDialogueLine(t), { ok: true, reasons: [] }, t);
  // 존댓말이어도 두 문장이면 실패
  assert.strictEqual(R.validateDialogueLine('"먼저 정리해 볼까요? 그러면 덜 헷갈릴 것 같아요."').ok, false);
});

test('프롬프트: 핵심 항목 3개는 "해설:" 줄 다음 "팁:" 줄의 두 줄이어야 한다고 명시한다', () => {
  for (const k of KEYS) {
    const p = R.buildFreeGunghabPrompt(args(k, k === '부모자녀' ? '부모' : ''));
    assert.ok(p.includes("첫 줄은 반드시 '해설:'로, 둘째 줄은 반드시 '팁:'으로 시작하세요"), k);
    assert.ok(p.includes('해설: ('), k);
  }
});
