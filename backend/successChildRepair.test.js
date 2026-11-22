// 걸린 문장만 같은 뜻으로 고쳐 쓰는 단계(successChildRepair) 무료 시험. 유료 AI 호출 없음: 고쳐 쓰는 모델은 사람이 쓴 답으로 대신한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSuccessChildFacts } = require('./successChild');
const { lintSuccessChild, generateSuccessChild, finalizeSuccessChild } = require('./successChildPrompt');
const { expandTokens } = require('./successChildTokens');
const R = require('./successChildRepair');
const QC6 = require('./successChildQc6.fixture');
const QC7 = require('./successChildQc7.fixture');

const now = new Date('2026-11-12T12:00:00+09:00');
const facts = buildSuccessChildFacts({ ...QC7.input, now });

// 사람이 쓴 "자연스러운 고쳐 쓰기" 답(실제 모델 답이 아니라 이 단계의 동작을 확인하기 위한 것)
const REWRITES = [
  ['스스로 판단하고 밀고 나가는 독립심도', '혼자 해내는 힘도 함께 있어, 계획을 직접 세우고 이끌어 가는 방식과 잘 맞습니다.'],
  ['가격을 따지고 값을 비교하는 감각이 있습니다', '사업이나 거래 쪽 특징은 크게 두드러지지 않지만, 가격을 따지고 값을 비교하는 일은 연습으로 키워 갈 수 있는 쪽입니다.'],
  ['집중이 잘됩니다', '안정된 제도 안의 인정을 받는 방향이 있어, 학교 시험이나 경시대회처럼 기준이 명확한 목표를 세우는 방식이 잘 맞습니다.'],
  ['누가 옆에서 계속 지켜보지 않아도', '혼자 해내는 힘도 함께 있어, 할 일을 미리 정해 두는 방식이 잘 맞습니다.'],
  ['초등학교 고학년부터는', '지금부터 여러 분야의 책을 읽히고, 박물관이나 직업 체험관에 데려가 직접 보고 느낄 기회를 만들어 줍니다.'],
  ['혼자 결정하고 운영하는 힘도 있어', '사업을 한다면 작은 규모로 시작해 꾸준히 키워 가는 방식이 잘 맞습니다.'],
  ['혼자서도 해낼 힘이 있는 아이입니다', '이 아이는 정해진 기준 안에서 차근차근 쌓아 가는 방식이 잘 맞는 아이입니다.'],
  ['누가 시키지 않아도', '혼자 해내려는 마음도 있어서, 할 일을 정해 두는 방식이 묵묵히 밀고 나가는 방향과 잘 맞습니다.'],
  ['겉으로는 안정된 제도 안의 인정', '안정된 제도 안의 인정과 경쟁이 강한 평가 환경이 있고, 배움을 쌓는 힘이 받쳐 줍니다.'],
  ['{대운1}, {대운2}는 모두 배움을 쌓는 운입니다.', '{대운1}, {대운2}는 모두 배움을 쌓는 운이어서, 지금 만든 공부 습관이 오래 이어집니다.'],
  ['돈의 흐름이 겉으로 드러나고', '{대운5.나이}({대운5.연도})부터 돈의 흐름이 들어오고, 그 전까지는 배운 것을 쌓는 시기입니다.'],
];
function fakeRepair(table = REWRITES, calls = []) {
  return async (prompt) => {
    calls.push(prompt);
    const items = [...prompt.matchAll(/^(\d+)\. \[[^\]]*\] (.+)$/gm)];
    return { text: items.map((m) => { const hit = table.find(([k]) => m[2].includes(k)); return `${m[1]}. ${hit ? hit[1] : m[2]}`; }).join('\n') };
  };
}
const sentencesCount = (t) => t.split(/(?<=[.!?])\s+|\n+/).filter((x) => x.trim()).length;
const bodyChars = (t) => t.replace(/\s/g, '').length;

test('걸린 문장 위치 찾기: 6·7차 위반이 모두 문장 하나로 좁혀지고 빠르다', () => {
  for (const [fx, n] of [[QC7, 6], [QC6, 5]]) {
    const f = buildSuccessChildFacts({ ...fx.input, now });
    const t0 = Date.now();
    const loc = R.locateBadSentences(fx.raw, f, lintSuccessChild);
    assert.equal(loc.items.length, n);
    assert.equal(loc.unresolved.length, 0);
    assert.ok(Date.now() - t0 < 5000);
    for (const it of loc.items) assert.ok(it.unit.text.length < 200, '문장 하나만 대상');
  }
  const loc7 = R.locateBadSentences(QC7.raw, facts, lintSuccessChild).items.map((x) => x.unit.text).join('\n');
  for (const k of ['스스로 판단하고', '집중이 잘됩니다', '누가 옆에서 계속 지켜보지 않아도', '고학년', '겉으로 크게 드러나지']) assert.ok(loc7.includes(k), k);
});

test('7차 원문: 고쳐 쓰기 후 검사 통과, 문장 수와 분량은 줄지 않고, 고친 문장 외에는 한 글자도 바뀌지 않는다', async () => {
  const calls = []; let full = 0;
  const out = await generateSuccessChild({ facts, callModel: async () => { full++; return { text: QC7.raw, truncated: false }; }, callRepair: fakeRepair(REWRITES, calls) });
  assert.equal(out.ok, true);
  assert.equal(full, 1, '전체 생성은 1번만');
  assert.ok(calls.length <= 2);
  assert.equal(out.repairs.length, 6);
  const before = finalizeSuccessChild(QC7.raw, facts);
  assert.ok(sentencesCount(out.text) >= sentencesCount(before), '문장이 지워지지 않았다');
  assert.ok(bodyChars(out.text) >= bodyChars(before) * 0.97, '분량이 줄지 않았다');
  let back = out.text;
  for (const r of out.repairs) { const a = expandTokens(r.after, facts).text; assert.ok(back.includes(a), '끼워진 문장'); back = back.replace(a, expandTokens(r.before, facts).text); }
  assert.equal(back, before, '고친 문장 5개를 되돌리면 원문과 같다');
  for (const bad of ['집중이 잘됩니다', '지켜보지 않아도', '고학년', '스스로 판단하고']) assert.ok(!out.text.includes(bad), bad);
});

test('6차 원문(모순된 재물운 결론, 시기 문장 반복, 위치어)도 고쳐 쓰기로 통과한다', async () => {
  const f6 = buildSuccessChildFacts({ ...QC6.input, now });
  const out = await generateSuccessChild({ facts: f6, callModel: async () => ({ text: QC6.raw }), callRepair: fakeRepair() });
  assert.equal(out.ok, true, JSON.stringify(out.reasons || ''));
  assert.equal(out.repairs.length, 5);
});

test('고쳐 쓴 문장이 뜻·표시·분량을 해치면 받아들이지 않고, 끝내 통과하지 못하면 고객에게 보내지 않는다 (삭제로 통과 금지)', async () => {
  const cases = [
    ['빈 답', ''],
    ['전혀 다른 뜻', '오늘 저녁에는 가족과 함께 맛있는 음식을 먹으러 나가 보세요.'],
    ['너무 짧게 줄임', '잘 맞습니다.'],
    ['새 숫자 추가', '하루 30분씩 할 일을 정해 두는 방식이 묵묵히 밀고 나가는 방향과 잘 맞습니다.'],
  ];
  for (const [name, rewrite] of cases) {
    let calls = 0, repairCalls = 0;
    const out = await generateSuccessChild({ facts, callModel: async () => { calls++; return { text: QC7.raw }; }, callRepair: async (p) => { repairCalls++; return { text: p.split('\n').filter((l) => /^\d+\. \[/.test(l)).map((l) => `${l.match(/^(\d+)\./)[1]}. ${rewrite}`).join('\n') }; } });
    assert.equal(out.ok, false, name);
    assert.equal(calls, 3, name + ': 기존 최대 3회 안에서만 전체 생성');
    assert.ok(repairCalls <= 6, name + ': 고쳐 쓰기 호출도 상한 안');
    assert.equal(out.text, undefined, '실패하면 본문을 주지 않는다');
  }
  assert.equal(R.acceptableRewrite('{대운1}, {대운2}는 모두 배움을 쌓는 운입니다.', '모두 배움을 쌓는 운입니다.'), '표시({…}) 변경');
  assert.equal(R.acceptableRewrite('가나다라마바사 아자차카타파하 거너더러머버서입니다.', '가나다라마바사 아자차카타파하 거너더러머버서입니다'), '문장 끝');
});

test('고쳐 쓰기 호출은 문장, 문제, 규칙만 보내고 입력(생년월일, 성별)이나 전체 결과지는 보내지 않는다', async () => {
  const calls = [];
  await generateSuccessChild({ facts, callModel: async () => ({ text: QC7.raw }), callRepair: fakeRepair(REWRITES, calls) });
  const p = calls[0];
  assert.ok(p.length < 4000, '작은 호출');
  assert.ok(!/2016|05:30|@|남성|남아/.test(p.replace(/\{[^}]*\}/g, '')), '개인정보 없음');
  assert.ok(p.includes('문장 하나를 문장 하나로') && p.includes('지우지 않습니다') && p.includes('글자 그대로'));
});

test('고쳐 쓰기를 주지 않으면 예전과 똑같이 동작하고, 구조가 깨진 글은 고쳐 쓰지 않고 전체 재생성으로 넘어간다', async () => {
  let n = 0;
  const out = await generateSuccessChild({ facts, callModel: async () => { n++; return { text: QC7.raw }; } });
  assert.equal(out.ok, false); assert.equal(n, 3);
  let rc = 0;
  const broken = QC7.raw.replace('===사업운===', '===사업===');
  const o2 = await generateSuccessChild({ facts, callModel: async () => ({ text: broken }), callRepair: async () => { rc++; return { text: '' }; } });
  assert.equal(o2.ok, false); assert.equal(rc, 0, '구조 오류는 문장 고쳐 쓰기 대상이 아니다');
});

test('이미 통과한 글은 고쳐 쓰기를 거치지 않는다(호출 없음)', async () => {
  const { SAMPLE_INPUT, SAMPLE_RAW_TEXT } = require('./successChildSample');
  const fa = buildSuccessChildFacts({ ...SAMPLE_INPUT, now });
  let rc = 0;
  const out = await generateSuccessChild({ facts: fa, callModel: async () => ({ text: SAMPLE_RAW_TEXT }), callRepair: async () => { rc++; return { text: '' }; } });
  assert.equal(out.ok, true); assert.equal(rc, 0); assert.equal(out.repairs, undefined);
});

test('2단계 실제 시험에서 나온 뜻 뒤집힘("겉으로 크게 드러나지 않지만" → "특징도 있어")은 거절하고, 한정을 남긴 고쳐 쓰기는 받아들인다', () => {
  const before = '사업이나 거래 쪽 특징은 겉으로 크게 드러나지 않지만, 가격을 따지고 값을 비교하는 감각이 있습니다.';
  assert.equal(R.acceptableRewrite(before, '사업이나 거래 쪽 특징도 있어, 가격을 따지고 값을 비교하는 활동을 접하게 해 주면 좋습니다.'), '한정 표현이 사라짐');
  assert.equal(R.acceptableRewrite(before, '사업이나 거래 쪽 특징은 크게 두드러지지 않지만, 가격을 따지고 값을 비교하는 활동을 접하게 해 주면 좋습니다.'), '');
  const p = R.buildRepairPrompt([{ title: '핵심 결론', sentence: before, reasons: ['x'] }]);
  assert.ok(p.includes('그 뜻(없다·약하다)을 그대로 남깁니다') && p.includes('그대로 두지 않습니다'));
});

test('문제 표현이 그대로 남은 답, 문제와 상관없는 부정이 사라진 답은 거절하고, 다음 라운드에 다시 요청한다', async () => {
  const reasons = ['핵심 결론: 아이의 실제 습관·행동을 사실처럼 단정하는 표현(스스로 판단)'];
  const b = '스스로 판단하고 밀고 나가는 독립심도 함께 있어, 혼자서 계획을 세우고 해내는 일과 잘 맞습니다.';
  assert.deepEqual(R.triggersOf(reasons), ['스스로 판단']);
  assert.equal(R.acceptableRewrite(b, '스스로 판단하고 밀고 나가는 독립심도 함께 있어, 혼자서 계획을 세우고 해내는 방식이 잘 맞습니다.', reasons), '문제 표현이 그대로 남음');
  assert.equal(R.acceptableRewrite(b, '밀고 나가는 독립적인 방식도 함께 있어, 혼자서 계획을 세우고 해내는 방식이 잘 맞습니다.', reasons), '');
  const rs = ['공부운: 아이의 실제 습관·행동을 사실처럼 단정하는 표현(집중이 잘)'];
  assert.equal(R.acceptableRewrite('목표를 세우면 집중이 잘되지만 시험 전에는 따로 챙기지 않으면 흐트러집니다.', '목표를 세우는 방식이 잘 맞고 시험 전에는 챙기면 좋습니다.', rs), '부정·한정 표현이 사라짐');
  // 같은 문장이 두 번째 라운드에도 걸리면 "※ 앞서 고쳐 쓴 결과에도 같은 문제가 남았습니다"가 붙는다
  const prompts = [];
  const sameAgain = async (p) => { prompts.push(p); return { text: p.split('\n').filter((l) => /^\d+\. \[/.test(l)).map((l) => l.replace(/^(\d+)\. \[[^\]]*\] /, '$1. ')).join('\n') }; };
  const rp = await R.repairSentences({ text: QC7.raw, facts, lint: lintSuccessChild, callRepair: sameAgain, maxRounds: 2 });
  assert.equal(prompts.length, 2);
  assert.ok(!prompts[0].includes('같은 문제가 남았습니다. 문제 표현을') && prompts[1].includes('같은 문제가 남았습니다. 문제 표현을'));
  assert.equal(rp.repairs.length, 0);
});

test('아이에게 힘·능력·감각·독립심이 "있다"고 말하는 문장은 잡고, 사주 풀이·서버 용어집 표현·시기별 운·살펴보는 문장은 통과한다', () => {
  const g = (sent) => lintSuccessChild(require('./successChildSample').SAMPLE_RAW_TEXT.replace('시험 대비는 따로 챙겨야 합니다.', sent), buildSuccessChildFacts({ ...require('./successChildSample').SAMPLE_INPUT, now }));
  const msg = (r) => r.hard.map((h) => h.message).join(' | ');
  for (const bad of ['혼자 결정하고 운영하는 힘도 있어, 작은 규모로 시작하는 방식이 잘 맞습니다.', '가격을 따지고 값을 비교하는 감각이 있습니다.', '맡은 일을 혼자 끝까지 책임지려는 독립심도 함께 있어서 잘 맞습니다.']) assert.match(msg(g(bad)), /그런 힘·능력이 실제로 있다고 단정/, bad);
  for (const ok of ['혼자 해내는 힘도 함께 있어서 할 일을 미리 정해 두는 방식과 잘 맞습니다.', '이 아이의 사주에는 반복하며 자라는 재능이 있습니다.', '가격을 따지는 감각이 있는지는 용돈을 쓸 때 살펴봅니다.', '스스로 처리할 수 있는 능력이 있어야 합니다.']) assert.doesNotMatch(msg(g(ok)), /그런 힘·능력이 실제로 있다고 단정/, ok);
});

test('실제 AI가 소액 시험에서 낸 고쳐 쓴 문장으로 5·6·7차 원문을 다시 돌려 보면(호출 없음) 모두 검사를 통과하고 고친 곳 외에는 그대로다', async () => {
  const REAL = require('./successChildRepairReal.fixture');
  const fx = { 5: REAL.run5Raw, 6: QC6.raw, 7: QC7.raw };
  for (const k of ['5', '6', '7']) {
    const table = REAL.pairs[k];
    const callRepair = async (p) => ({ text: [...p.matchAll(/^(\d+)\. \[[^\]]*\] (.+)$/gm)].map((m) => { const hit = table.find(([b]) => b === m[2]); return `${m[1]}. ${hit ? hit[1] : m[2]}`; }).join('\n') });
    const f = buildSuccessChildFacts({ ...REAL.input, now });
    const out = await generateSuccessChild({ facts: f, callModel: async () => ({ text: fx[k] }), callRepair });
    assert.equal(out.ok, true, `${k}차: ${(out.reasons || []).join(' | ')}`);
    const before = finalizeSuccessChild(fx[k], f);
    assert.ok(sentencesCount(out.text) >= sentencesCount(before), `${k}차: 문장이 줄지 않았다`);
    assert.ok(bodyChars(out.text) >= bodyChars(before) * 0.97, `${k}차: 분량이 줄지 않았다`);
  }
});

test('예시 숫자에는 서버가 "예를 들어"를 붙이고(뜻 변화 없음, AI 호출 없음), 이미 있거나 숫자가 없는 문장은 건드리지 않는다', () => {
  const t = '===공부운===\n- 영어: 단어를 날짜별로 나눠 매일 20개씩 외웁니다. 주말에 다시 테스트합니다.\n해볼 일: 두 주 동안 예를 들어 매일 5개씩 풉니다. 아이가 지루해하는지 살펴봅니다.\n차이: {대운1}, {대운2}는 모두 배움을 쌓는 운입니다.';
  const r = R.addExampleMarker(t);
  assert.equal(r.fixes.length, 1);
  assert.ok(r.text.includes('- 영어: 예를 들어 단어를 날짜별로 나눠 매일 20개씩 외웁니다. 주말에 다시 테스트합니다.'));
  assert.ok(r.text.includes('해볼 일: 두 주 동안 예를 들어 매일 5개씩 풉니다. 아이가 지루해하는지 살펴봅니다.'));
  assert.ok(r.text.includes('차이: {대운1}, {대운2}는 모두 배움을 쌓는 운입니다.'));
});
