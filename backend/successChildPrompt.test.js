const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildSuccessChildFacts } = require('./successChild');
const { SECTION_TITLES, PERIOD_COUNT, MAX_LEN, buildSuccessChildPrompt, lintSuccessChild, injectReasons, finalizeSuccessChild, generateSuccessChild, parseSections } = require('./successChildPrompt');
const { SAMPLE_INPUT, SAMPLE_RAW_TEXT, SAMPLE_REPORT_TEXT } = require('./successChildSample');
const { CASES, buildCase } = require('./successChildCases');
const QC = require('./successChildQc.fixture');
const QC2 = require('./successChildQc2.fixture');
const QC3 = require('./successChildQc3.fixture');
const QC4 = require('./successChildQc4.fixture');
const QC5 = require('./successChildQc5.fixture');
const { makeValid } = require('./successChildTestKit');
const { pickExamples, plainSignals, JOB_DICT, BIZ_DICT } = require('./successChildPlain');
const { expandTokens } = require('./successChildTokens');

const now = new Date('2026-11-12T12:00:00+09:00');
const factsOf = (o) => buildSuccessChildFacts({ ...o, now });
const factsA = factsOf(SAMPLE_INPUT);
const GOLDEN = SAMPLE_RAW_TEXT;   // 공통 샘플(가상 학생 A = 사례 A), AI 출력 형식(토큰)
const hardCodes = (r) => r.hard.map((h) => h.code);
const hardMsgs = (r) => r.hard.map((h) => h.message).join(' | ');
// 샘플의 한 문장을 바꿔 넣는다
const swap = (from, to) => { assert.ok(GOLDEN.includes(from), '샘플에 없는 문장: ' + from); return GOLDEN.replace(from, to); };
// 검사 규칙 시험용으로 문장을 바꿔 넣는 자리: 사례 A 재물운의 '근거:' 줄(전문 용어를 써도 되는 줄)
const SENT = '사주 원국 재성 겉 1글자(편재 1)';

test('프롬프트: 계산값 블록·쉬운 말 용어집·판정 근거·시기별 요약·첫 문장·추천 후보와 새 쓰기 규칙·6개 섹션과 [대운N] 형식이 들어가고, 연도는 박아 두지 않는다', () => {
  const p = buildSuccessChildPrompt(factsA.text);
  assert.ok(p.includes(factsA.text));
  for (const s of ['[쉬운 말 용어집', '[판정 근거 쉬운 말', '[시기별 쉬운 말 요약', '[재물 시기', '[핵심 결론 첫 문장', '[직업·사업 추천 후보', '[공부 vs 사업 비교 — 서버 판정', '설명 유형 A']) assert.ok(factsA.text.includes(s), s);
  for (const t of SECTION_TITLES) assert.ok(p.includes(`===${t}===`), t);
  for (const s of ['{대운1}~{대운6}', '{재성대운}', '{재성속운}', '단호한 다·나·까', '해요체', '해석됩니다', '볼 수 있습니다', '가장 먼 일입니다', '면책·한계 문장', '위로, 칭찬·격려·대화법', '[직업·사업 예시 사전', '[추천 후보] 3개씩'.replace('[추천 후보] 3개씩', '서버의 [직업·사업 추천 후보]'), '"근거:" 줄은 쓰지 않습니다', '서버가 정한 문장을 정확히 그대로', '쉬운 말로 쓰는 방법', '물음표 문장', '"~십시오"', '"짜임", "숨은 글자", "눈에 보이는 글자" 같은 말은 쓰지 않습니다', '사업운 예시 정확히 3개', '"관심을 보이면"으로 시작하는 해 볼 경험', '분량은 정해 두지 않습니다', '[항목마다 맡은 역할', '[해볼 일 쓰는 방법]', '이번 달', '돈 관리 방법', '학년, 학령, 입학, 빠른 생일은 언급하지 않습니다', '"예를 들어"와 함께', '"결론:"은 이 아이에게 무엇이 맞는지 알려 주는 긍정적인 문장', '[대운1]', `[대운${PERIOD_COUNT}]`]) assert.ok(p.includes(s), s);
  const rules = p.slice(p.indexOf('[해석의 바탕'));
  assert.ok(!/(?:19|20)\d{2}년/.test(rules), '규칙 안에 특정 연도를 박아 두지 않는다');
  assert.ok(buildSuccessChildPrompt(factsA.text, ['연도를 직접 썼습니다']).includes('앞선 결과에서 고쳐야 할 점'));
  assert.ok(!p.includes('앞선 결과에서 고쳐야 할 점'));
});

test('공통 샘플(가상 학생 A)은 새 검사를 한 번에 통과하고, 토큰은 서버 계산값으로 바뀌며, 분량은 5,500자 이상이다', () => {
  const r = lintSuccessChild(GOLDEN, factsA);
  assert.deepEqual(r.hard, []);
  assert.deepEqual(r.soft, []);
  assert.deepEqual(Object.keys(r.sections), SECTION_TITLES);
  assert.equal(finalizeSuccessChild(GOLDEN, factsA), SAMPLE_REPORT_TEXT);
  assert.ok(r.total >= 5500 && r.total <= 7500, '분량 ' + r.total);
  assert.ok(!/[{}]/.test(r.expanded));
  assert.ok(r.expanded.includes('2019~2028년(8~17세)은 움직이는 돈의 흐름입니다. 2029~2038년(18~27세)은 쌓이는 돈의 흐름입니다'));
  assert.ok(r.expanded.includes('庚(편재)') && r.expanded.includes('辛(정재)'));
});

test('사례 A·B·C 전체 결과지는 모두 새 검사를 통과하고(위반·참고 사항 0), 유형이 A·B·C이며, 분량이 5,500~7,500자다', () => {
  const want = { A: 'A', B: 'B', C: 'C' };
  for (const k of ['A', 'B', 'C']) {
    const c = buildCase(k);
    const r = lintSuccessChild(c.raw, c.facts);
    assert.deepEqual(r.hard, [], `${k}: ${hardMsgs(r)}`);
    if (k === 'A') assert.deepEqual(r.soft, [], k);   // A만 B안 문체(해볼 일 포함)로 수정됨
    else assert.ok(r.soft.every((m) => /해볼 일/.test(m)), `${k}: ${r.soft}`);
    assert.equal(c.facts.compare.type, want[k], k);
    assert.ok(r.total >= 5500 && r.total <= 7500, `${k} 분량 ${r.total}`);
    assert.ok(!/[{}]/.test(r.expanded), k);
  }
});

test('다른 아이(여성·다른 생일·시간 모름·재성 대운 없음)도 같은 토큰 형식으로 정상 결과가 통과하고, 샘플 A 문장은 걸린다', () => {
  const kids = [['여성', '2015-12-31', '23:40'], ['남성', '2010-03-05', '07:30'], ['여성', '2008-09-23', ''], ['여성', '2005-05-20', '']];
  for (const [g, d, tm] of kids) {
    const f = factsOf({ gender: g, solarDate: d, birthtime: tm });
    const ok = lintSuccessChild(makeValid(f), f);
    assert.deepEqual(ok.hard.filter((h) => h.code !== 'length' && h.code !== 'jargon'), [], `${d}: ${hardMsgs(ok)}`);
    assert.ok(!/[{}]/.test(ok.expanded));
    // 공통 샘플 A 의 내용(상관 4 등)은 이 아이의 계산값과 달라서 걸린다
    assert.ok(lintSuccessChild(GOLDEN, f).hard.length > 0, d);
  }
});

test('수정 전 실제 AI 결과 3개(가상 아이)의 오류를 새 검사가 모두 잡는다 (회귀)', () => {
  const kid = (id) => { const k = QC.find((x) => x.id === id); return { k, f: factsOf(k.input), r: lintSuccessChild(k.text, factsOf(k.input)) }; };
  for (const id of [1, 2, 3]) {
    const { r } = kid(id);
    const msgs = hardMsgs(r);
    assert.ok(r.hard.length > 10, `kid${id}`);
    assert.match(msgs, /연도를 직접 썼습니다/, `kid${id} 연도`);
    assert.match(msgs, /나이를 직접 썼습니다/, `kid${id} 나이`);
    assert.match(msgs, /연령대 표현/, `kid${id} 연령대`);
    assert.match(msgs, /\[대운1\] 블록이 없습니다/, `kid${id} 형식`);
    assert.ok(hardCodes(r).includes('length'), `kid${id} 기준 표기 반복`);
  }
  assert.ok(hardCodes(kid(1).r).includes('hedge'), 'kid1 "해석됩니다" 8회');
  assert.match(hardMsgs(kid(2).r), /명리 사전에 없는 규칙/, 'kid2 지장간 순서 해석');
  assert.match(hardMsgs(kid(3).r), /능력이 없다고 단정하는 표현\(가장 먼 일\)/, 'kid3 능력 단정');
  assert.match(hardMsgs(kid(3).r), /학년 표현을 직접 썼습니다/, 'kid3 학년');
  // 오류의 핵심: 첫 화면 요약의 "2030년(18세)부터 편재와 정재", "2037년 이후 편재"
  assert.ok(kid(1).r.bad.some((b) => b.title === '핵심 결론' && b.reasons.some((x) => /연도를 직접/.test(x))));
  assert.ok(kid(2).r.bad.some((b) => b.title === '핵심 결론' && b.reasons.some((x) => /연도를 직접/.test(x))));
});

test('토큰 규칙: 모르는 토큰, 직접 쓴 연도·나이·연령대·학년, 필수 {재성대운} 누락', () => {
  const g = (s) => lintSuccessChild(s, factsA);
  assert.match(hardMsgs(g(swap(SENT, '{대운9}에 큰 변화가 옵니다.'))), /알 수 없는 토큰 \{대운9\}/);
  assert.match(hardMsgs(g(swap(SENT, '2075년에 큰 변화가 옵니다.'))), /연도를 직접 썼습니다/);
  assert.match(hardMsgs(g(swap(SENT, '28세에 큰 변화가 옵니다.'))), /나이를 직접 썼습니다/);
  assert.match(hardMsgs(g(swap(SENT, '20대에 큰 변화가 옵니다.'))), /연령대 표현/);
  assert.match(hardMsgs(g(swap(SENT, '고등 3학년에 큰 변화가 옵니다.'))), /학년 표현/);
  assert.match(hardMsgs(g(GOLDEN.replace(/\{재성대운\} 전통 명리학에서/, '전통 명리학에서'))), /재물운에 \{재성대운\}/);
  // 핵심 결론에는 {재성대운}을 넣지 않는다(재물운에서 한 번만)
  assert.equal((GOLDEN.match(/\{재성대운\}/g) || []).length, 1);
  // 토큰으로 쓴 연도·나이·학령은 통과
  assert.deepEqual(g(swap(SENT, '{대운3}에 큰 변화가 옵니다. 지금은 {현재나이}입니다.')).hard, []);
});

test('대운 십성 연결: 가까운 {대운N}이 가리키는 대운의 천간·지지 십성과 같아야 한다 (수정 전 첫 번째 오류)', () => {
  const g = (s) => lintSuccessChild(swap(SENT, s), factsA);
  // 대운1=庚寅(천간 편재, 지지 본기 편인, 지장간 식신·비견·편인), 대운2=辛卯(천간 정재, 지지 본기 정인), 대운3=壬辰(천간 편관, 지지 본기 식신, 지장간 정인·정관·식신)
  assert.deepEqual(g('{대운1}의 대운 천간은 편재입니다.').hard, []);
  assert.match(hardMsgs(g('{대운1}의 대운 천간은 정재입니다.')), /\{대운1\}\(庚寅\)의 천간 십성은 정재이 아닙니다\(천간 편재/);
  assert.match(hardMsgs(g('{대운2}부터 대운 천간에 편재와 정재가 연달아 나타납니다.')), /\{대운2\}\(辛卯\)의 천간 십성은 편재이 아닙니다/);
  assert.deepEqual(g('{대운3}의 지지 본기는 식신입니다.').hard, []);
  assert.match(hardMsgs(g('{대운3}의 지지 본기는 편재입니다.')), /지지 십성은 편재이 아닙니다/);
  assert.deepEqual(g('{대운3}의 지장간에 정관이 있습니다.').hard, []);
  assert.match(hardMsgs(g('{대운2}의 지장간에 정관이 있습니다.')), /지지 십성은 정관이 아닙니다/);
  // 토큰 없이 대운 십성을 직접 말하면 연결을 확인할 수 없으므로 거부
  assert.match(hardMsgs(g('대운 천간에 편재가 나타납니다.')), /\{대운N\} 토큰과 함께/);
  // 한 문장에 여러 대운: 각 십성이 가까운 대운과 짝이 맞아야 한다
  assert.deepEqual(g('{대운1}에는 천간 편재, {대운2}에는 천간 정재가 나타납니다.').hard, []);
  assert.ok(g('{대운1}에는 천간 정재, {대운2}에는 천간 편재가 나타납니다.').hard.length >= 2, '순서를 바꿔 쓰면 둘 다 잡힌다');
});

test('천간 한자와 십성 이름의 짝은 일간 기준 계산과 맞아야 한다 (庚(정재) 같은 오류)', () => {
  const g = (s) => lintSuccessChild(swap(SENT, s), factsA);
  assert.deepEqual(g('천간은 庚(편재)입니다.').hard, []);
  assert.match(hardMsgs(g('천간은 庚(정재)입니다.')), /庚은 일간 기준 편재인데 정재이라고 썼습니다/);
  assert.match(hardMsgs(g('천간 辛은 편재입니다.')), /辛은 일간 기준 정재인데 편재이라고/);
});

test('능력 단정·사전 밖 해석·범위 밖 단언·성공 보장·계산하지 않은 항목은 잡는다', () => {
  const cases = [
    ['능력 단정', '앉아서 외우는 공부는 이 아이에게 가장 먼 일입니다.', /능력이 없다고 단정/],
    ['능력 단정2', '조직 생활은 이 아이에게 맞지 않습니다.', /능력이 없다고 단정/],
    ['지장간 순서', '지장간에 정인, 정관, 정재가 순서대로 나타나 공부에서 직장으로, 재물로 이어집니다.', /명리 사전에 없는 규칙/],
    ['일반 법칙', '식상이 관성보다 많으면 자기 방식을 드러내는 경향이 강합니다.', /명리 사전에 없는 규칙/],
    ['범위 밖', '편재나 정재는 다시 등장하지 않습니다.', /범위 밖을 단정/],
    ['평생', '이 아이는 평생 재물을 다루는 일을 합니다.', /범위 밖을 단정/],
    ['신강', '이 사주는 신강합니다.', /계산하지 않은 항목/],
    ['서울대', '서울대에 합격하는 사주입니다.', /단정하거나 약속/],
    ['금액', '40대에 10억 원을 법니다.', /단정하거나 약속/],
    ['육아', '부모는 아이를 믿어 주고 기다려 주세요.', /육아 조언/],
    ['없는 간지', '乙亥 대운이 중요합니다.', /계산값에 없는 간지 乙亥/],
    ['십성 개수', '식상이 9글자로 강합니다.', /개수 9/],
    ['성적 보장', '이 공부법을 하면 성적이 오릅니다.', /공부 방법·사업·소득 결과를 단정/],
    ['사업 성공', '이 아이가 카페를 열면 사업이 성공합니다.', /공부 방법·사업·소득 결과를 단정/],
    ['큰돈', '편재가 있어서 큰돈을 법니다.', /공부 방법·사업·소득 결과를 단정/],
    ['수입 안정', '정재 대운에는 수입이 안정됩니다.', /공부 방법·사업·소득 결과를 단정/],
    ['예시 숫자', '문제집을 매일 30쪽씩 풉니다.', /설명용 숫자는 "예를 들어"/],
  ];
  for (const [name, sentence, re] of cases) assert.match(hardMsgs(lintSuccessChild(swap(SENT, sentence), factsA)), re, name);
  // "예를 들어"와 함께 쓰면 예시 숫자는 통과, 계산값의 개수 표기도 통과
  assert.deepEqual(lintSuccessChild(swap(SENT, '예를 들어 문제집을 매일 30쪽씩 풉니다.'), factsA).hard, []);
  assert.deepEqual(lintSuccessChild(swap(SENT, '표현하는 힘은 상관 4글자이고 지장간까지 보면 식상 6개입니다.'), factsA).hard, []);
});

test('식상생재는 서버 판정이 "완성"일 때만 쓸 수 있다 (사례 B·C는 조건 미완성)', () => {
  const b = buildCase('B'), c = buildCase('C');
  assert.equal(b.facts.compare.link.status, '부분'); assert.equal(c.facts.compare.link.status, '없음'); assert.equal(factsA.compare.link.status, '완성');
  const bad = b.raw.replace(/근거: 식상 겉 2글자[^\n]+/, '근거: 식상생재 완성');
  assert.ok(bad !== b.raw);
  assert.match(hardMsgs(lintSuccessChild(bad, b.facts)), /식상생재는 서버 판정이 "완성"일 때만/);
  assert.deepEqual(lintSuccessChild(b.raw, b.facts).hard, []);
  assert.deepEqual(lintSuccessChild(c.raw, c.facts).hard, []);
});

test('구조: 섹션·필드·예시 항목 수·[대운N] 블록이 빠지면 잡고, 잘린 결과는 잡는다', () => {
  assert.ok(lintSuccessChild(GOLDEN.replace(/===재물운===[\s\S]*?(?====10대)/, ''), factsA).hard.some((h) => /재물운/.test(h.message)));
  assert.deepEqual(lintSuccessChild(GOLDEN.replace(/근거: [^\n]+\n/g, ''), factsA).hard, [], '근거 줄은 서버가 붙이므로 AI가 쓰지 않아도 된다');
  assert.ok(lintSuccessChild(GOLDEN.replace('[대운3]', '[2040~2049]'), factsA).hard.some((h) => /\[대운3\] 블록이 없습니다/.test(h.message)));
  assert.ok(lintSuccessChild(GOLDEN, factsA, { truncated: true }).hard.some((h) => h.code === 'truncated'));
  assert.ok(lintSuccessChild('===공부운===\n결론: 짧음\n짧은 본문입니다.', factsA).hard.length >= 5);
  // 새 필드: 한 줄 요약, 공부 쪽/사업 쪽/차이, 예시 항목 수, 장면
  assert.ok(lintSuccessChild(GOLDEN.replace(/한 줄: 만든 결과가 보이는 직업과[^\n]*\n/, ''), factsA).hard.some((h) => /직업운에 "한 줄:"/.test(h.message)));
  assert.ok(lintSuccessChild(GOLDEN.replace(/공부 쪽: [^\n]+\n/, ''), factsA).hard.some((h) => /핵심 결론에 "공부 쪽:"/.test(h.message)));
  assert.ok(lintSuccessChild(GOLDEN.replace(/- 공인중개사:[^\n]+\n/, ''), factsA).hard.some((h) => /직업운의 "예시:" 항목.*3개여야 합니다\(지금 2개\)/.test(h.message)));
  assert.ok(lintSuccessChild(GOLDEN.replace(/장면: 시험을 준비하면서[^\n]+\n/, ''), factsA).hard.some((h) => /\[대운1\]에 "장면:"/.test(h.message)));
  assert.ok(lintSuccessChild(GOLDEN.replace(/- 웹툰 작가:[^\n]+/, '- 웹툰 작가: 요즘 인기가 많은 직업입니다.'), factsA).hard.some((h) => /직업 예시마다 그 직업이 하는 일/.test(h.message)));
});

test('문체·보험 표현·면책은 기준을 넉넉하게 둔다: 적으면 참고만, 많을 때만 다시 쓴다', () => {
  const add = (s) => swap(SENT, s);
  const mild = lintSuccessChild(add('이 흐름이 큰 줄기예요. 그래서 중요하죠. 재능이 드러날 수 있습니다. 성장할 가능성이 있습니다. 예측하지 않습니다.'), factsA);
  assert.deepEqual(mild.hard, []);
  assert.ok(mild.soft.length >= 3);
  assert.ok(hardCodes(lintSuccessChild(add('이 흐름이 큰 줄기예요. 그래서 중요하죠. 정말 그래요.'), factsA)).includes('tone'));
  // "해석됩니다·볼 수 있습니다" 같은 표현도 보험성 표현으로 센다(3개부터 다시 쓴다)
  assert.deepEqual(lintSuccessChild(add('이 구조는 사업형으로 해석됩니다. 표현이 앞서는 구조로 볼 수 있습니다.'), factsA).hard, []);
  assert.ok(hardCodes(lintSuccessChild(add('사업형으로 해석됩니다. 전문직형으로 해석되며 표현이 앞서는 구조로 볼 수 있습니다.'), factsA)).includes('hedge'));
  assert.ok(hardCodes(lintSuccessChild(add('성공을 보장하지 않습니다. 미래를 예측하지 않습니다.'), factsA)).includes('disclaimer'));
});

test('분량: 전체 약 7,500자 안(5,000자 미만이면 참고), 섹션 1,500자 안으로. 초과하면 줄여서 다시 쓰게 한다', () => {
  assert.ok(MAX_LEN.totalHard <= 8600 && MAX_LEN.section <= 1500 && MAX_LEN.totalMin >= 5000);
  const long = '이 아이의 공부 방식은 표현하고 만들어 보는 활동에서 강점이 드러납니다. '.repeat(30);
  const r = lintSuccessChild(swap('전통 명리학에서 이 재능은 배운 것을 자기 방식으로 소화해 밖으로 내놓는 힘을 뜻합니다.', long), factsA);
  assert.ok(r.hard.some((h) => h.code === 'length' && /공부운가 \d+자입니다/.test(h.message)));
  const huge = lintSuccessChild(swap('전통 명리학에서 이 재능은 배운 것을 자기 방식으로 소화해 밖으로 내놓는 힘을 뜻합니다.', long.repeat(3)), factsA);
  assert.ok(huge.hard.some((h) => h.code === 'length' && /전체가 \d+자입니다/.test(h.message)), '전체 8,600자 초과는 다시 쓰게 한다');
  // 분량이 모자라면 다시 쓰게 하지는 않고 참고로만 남긴다
  const shortText = lintSuccessChild(GOLDEN.replace(/===사업운===[\s\S]*?(?====재물운)/, (m) => m.split('\n').filter((l) => !/^공부·전문직형과|^사업이 자리를|^- /.test(l)).join('\n') + '\n'), factsA);
  assert.ok(!hardCodes(shortText).includes('length'));
  // 기준 표기 반복
  const rep = lintSuccessChild(swap('시험 대비는 따로 챙겨야 합니다.', '천간·지지 본기 기준 식상은 4글자입니다. 지장간 포함 기준 식상은 4개입니다. 천간·지지 본기 기준 관성은 2글자입니다. 지장간 포함 기준 관성은 4개입니다. 천간·지지 본기 기준 인성은 0글자입니다.'), factsA);
  assert.ok(rep.hard.some((h) => h.code === 'length' && /기준 표기/.test(h.message)) || rep.hard.some((h) => /기준/.test(h.message)));
});

test('생성: 첫 결과가 통과하면 AI는 1번만 부르고, 토큰이 바뀐 최종 문장을 돌려준다', async () => {
  const calls = [];
  const out = await generateSuccessChild({ facts: factsA, callModel: async (p) => { calls.push(p); return { text: GOLDEN }; } });
  assert.equal(out.ok, true); assert.equal(out.attempts, 1); assert.equal(calls.length, 1);
  assert.equal(out.text, SAMPLE_REPORT_TEXT);
  assert.ok(!/[{}]/.test(out.text));
});

test('생성: 근거 위반이면 고칠 점을 넣어 1번 더 쓰고, 통과하면 그 결과를 쓴다 (최대 2번)', async () => {
  const bad = swap(SENT, '2075년에 서울대 합격 운이 옵니다.');
  const calls = [];
  const out = await generateSuccessChild({ facts: factsA, callModel: async (p) => { calls.push(p); return { text: calls.length === 1 ? bad : GOLDEN }; } });
  assert.equal(out.ok, true); assert.equal(out.attempts, 2); assert.equal(calls.length, 2);
  assert.ok(calls[1].includes('앞선 결과에서 고쳐야 할 점') && calls[1].includes('연도를 직접 썼습니다'));
  assert.equal(out.text, SAMPLE_REPORT_TEXT);
});

test('생성: 끝내 검사를 통과하지 못하면 문장을 지워 고쳐 보내지 않고 실패로 돌려준다(고객에게 가는 글이 없다), 호출은 3번을 넘지 않는다', async () => {
  const bad = swap(SENT, '2075년에 서울대 합격 운이 옵니다. 대운 천간에 편재가 나타납니다. ' + SENT);
  let n = 0;
  const out = await generateSuccessChild({ facts: factsA, callModel: async () => { n++; return { text: bad }; } });
  assert.equal(n, 3);
  assert.equal(out.ok, false); assert.equal(out.text, undefined); assert.equal(out.repaired, undefined);
  assert.ok(out.reasons.length > 0);
  assert.equal(require('./successChildPrompt').repairSuccessChild, undefined, '문장을 지워 통과시키는 함수는 없다');
});

test('생성: 첫 화면 요약에 잘못된 연도를 쓴 수정 전 오류는 고쳐서 다시 쓰게 한다', async () => {
  const wrong = swap('사업가형은 사주의 구조를 부르는 이름이고, 사업을 해야 한다는 뜻은 아닙니다.', '대운 천간에서는 2030년(18세)부터 편재와 정재가 연달아 나타납니다. 사업가형은 사주의 구조를 부르는 이름이고, 사업을 해야 한다는 뜻은 아닙니다.');
  const calls = [];
  const out = await generateSuccessChild({ facts: factsA, callModel: async (p) => { calls.push(p); return { text: calls.length === 1 ? wrong : GOLDEN }; } });
  assert.equal(calls.length, 2);
  assert.ok(calls[1].includes('연도를 직접 썼습니다') && calls[1].includes('나이를 직접 썼습니다'));
  assert.ok(!out.text.includes('2030년(18세)부터 편재'));
});

test('생성: 구조가 무너졌거나 잘렸으면 고치지 않고 실패(작업 재시도로 넘김), 호출은 3번까지', async () => {
  let n = 0;
  const out = await generateSuccessChild({ facts: factsA, callModel: async () => { n++; return { text: '===공부운===\n결론: 짧음\n본문' }; } });
  assert.equal(out.ok, false); assert.equal(n, 3); assert.ok(out.reasons.length > 0);
  let m = 0;
  const cut = await generateSuccessChild({ facts: factsA, callModel: async () => { m++; return { text: GOLDEN, truncated: true }; } });
  assert.equal(cut.ok, false); assert.equal(m, 3);
});

test('생성: 보험 표현·문체·분량만 남아도 검사를 통과하지 못한 글은 고객에게 보내지 않는다(다시 쓰기 3번 뒤 실패)', async () => {
  const hedgy = swap(SENT, '사업형으로 해석됩니다. 전문직형으로 해석되며 표현이 앞서는 구조로 볼 수 있습니다. ' + SENT);
  let n = 0;
  const out = await generateSuccessChild({ facts: factsA, callModel: async () => { n++; return { text: hedgy }; } });
  assert.equal(n, 3);
  assert.equal(out.ok, false); assert.equal(out.text, undefined);
});

test('추천 이유 삽입: 직업운·사업운 예시 항목에만 서버 문장 한 줄을 끼우고, 나머지 줄·머리글·AI 문장은 그대로다', () => {
  const out = injectReasons(GOLDEN, factsA);
  assert.deepEqual(Object.keys(parseSections(out)), SECTION_TITLES);
  const before = GOLDEN.split('\n'), after = out.split('\n');
  assert.equal(before.length, after.length);
  before.forEach((l, i) => { if (l !== after[i]) assert.ok(/^- /.test(l) && after[i].startsWith(l.split(':')[0] + ':'), '바뀐 줄은 예시 항목뿐: ' + l.slice(0, 20)); });
  assert.ok(after.filter((l, i) => l !== before[i]).length === 6, '직업 3 + 사업 3');
});

test('server.js 연결: 성공사주 분기는 검사를 통과한 결과만 보내고, 기존 상품 프롬프트는 바뀌지 않았다', () => {
  const src = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8').replace(/\r\n/g, '\n');
  const a = src.indexOf("if (type === '성공사주')"), b = src.indexOf('// ── /성공사주 ──');
  const seg = src.slice(a, b);
  assert.ok(a > 0 && b > a);
  assert.ok(/generateSuccessChild\(/.test(seg) && /anthropic\.messages\.create/.test(seg) && /MODEL_PAID/.test(seg) && /SUCCESS_CHILD_MAX_TOKENS/.test(seg));
  assert.ok(!/streamToClient|messages\.stream/.test(seg), '검사 전 글을 흘려 보내지 않는다');
  assert.ok(/if \(!out\.ok\)[\s\S]*error/.test(seg), '검사에 실패하면 결과 대신 오류로 끝낸다');
  assert.ok(/buildSuccessChildReport\(out\.text/.test(seg), '결과 모델은 토큰이 바뀐 최종 문장으로 만든다');
  assert.ok(a < src.indexOf("if (type === '궁합'"), '다른 유형 분기보다 앞에서 끝난다');
  const slice = (x, y) => { const i = src.indexOf(x); return src.slice(i, src.indexOf(y, i)); };
  const h = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
  assert.equal(h(slice("if (type === '자녀천명')", "if (type === '100년꿀팁')")), 'f7417ef7e2de008b');
  assert.equal(h(slice("if (type === '궁합' || type === '궁합무료')", "if (type === '자녀천명')")), '32cffb767295b574');
  assert.equal(h(slice("if (type === '노후')", "if (type === '길일')")), '7711aff049afb03f');
  assert.equal(h(slice("if (type === '심화')", '\n}\n')), 'ed45d6d83880bc4a');
});

test('B안 문체(유형 A): 본문에 전문 용어·한자가 있으면 걸리고, "근거:" 줄에서는 쓸 수 있다. A·B·C 모두 강제한다', () => {
  const { PLAIN_STYLE_TYPES } = require('./successChildPrompt');
  assert.deepEqual([...PLAIN_STYLE_TYPES], ['A', 'B', 'C']);
  const bad = GOLDEN.replace('가장 크게 드러나는 재능은 생각을 말과 글로 꺼내는 표현력입니다.', '가장 크게 드러나는 것은 식상이고 지장간에 인성이 있습니다.');
  assert.ok(bad !== GOLDEN);
  assert.ok(lintSuccessChild(bad, factsA).hard.some((h) => h.code === 'jargon' && /공부운: 본문에 전문 용어·계산 숫자·반복 표현·학년 표현\(식상, 지장간, 인성\)/.test(h.message)));
  assert.ok(!lintSuccessChild(GOLDEN, factsA).hard.some((h) => h.code === 'jargon'), '근거 줄의 용어는 허용');
  for (const k of ['B', 'C']) { const c = buildCase(k); assert.ok(!lintSuccessChild(c.raw, c.facts).hard.some((h) => h.code === 'jargon'), k + ' 본문에 전문 용어 없음'); const badK = c.raw.replace('이 아이는', '이 아이는 식상이 크고'); assert.ok(lintSuccessChild(badK, c.facts).hard.some((h) => h.code === 'jargon'), k + ' 도 본문 용어는 걸린다'); }
});

test('B안 문체: 핵심 결론의 첫 문장은 "이 아이는 사업가형 사주입니다."이고, 항목마다 해볼 일·한 줄 요약이 있으며, 같은 설명이 항목 사이에서 반복되지 않는다', () => {
  assert.ok(/결론: 이 아이는 사업가형 사주입니다\./.test(GOLDEN));
  const secs = parseSections(GOLDEN);
  for (const t of ['핵심 결론', '공부운', '직업운', '사업운', '재물운']) assert.ok(/^해볼 일: /m.test(secs[t]) && /^한 줄: /m.test(secs[t]), t);
  // '일곱 글자'는 반드시 '여덟 글자 중 나 자신을 뺀'으로 설명한다
  assert.ok(GOLDEN.includes('사주 여덟 글자 중 나 자신(일간)을 뺀 일곱 글자'));
  assert.ok(!/사주는 일곱 글자|사주 일곱 글자/.test(GOLDEN));
  // 전체 집계("4글자")는 핵심 결론에서만 나오고, 다른 항목에서는 같은 문장을 다시 쓰지 않는다
  const sentences = GOLDEN.split(/(?<=[.!?])\s+|\n+/).map((x) => x.replace(/^[가-힣 ]+: /, '').trim()).filter((x) => x.length > 25);
  const dup = sentences.filter((s, i) => sentences.indexOf(s) !== i);
  assert.deepEqual(dup, [], '같은 문장 반복: ' + dup.join(' | '));
});

test('아이 이야기 중심(유형 A): 본문의 계산 숫자·반복 표현·학년 표현은 걸리고, 근거 줄은 허용한다', () => {
  const cases = [
    ['계산 숫자(글자)', '가장 크게 드러나는 재능은 생각을 말과 글로 꺼내는 표현력입니다.', '가장 크게 드러나는 재능은 4글자짜리 표현력입니다.', /4글자/],
    ['반복 표현', '시험 대비는 따로 챙겨야 합니다.', '시험 대비는 숨은 글자의 짜임으로 챙겨야 합니다.', /숨은 글자|짜임/],
    ['학년', '시험 대비는 따로 챙겨야 합니다.', '고등 1학년 시험 대비는 따로 챙겨야 합니다.', /학년/],
    ['입학', '시험 대비는 따로 챙겨야 합니다.', '조기입학을 했다면 시험 대비는 따로 챙겨야 합니다.', /입학/],
  ];
  for (const [name, from, to, re] of cases) {
    const r = lintSuccessChild(swap(from, to), factsA);
    assert.ok(r.hard.some((h) => h.code === 'jargon' && re.test(h.message)), name + ': ' + hardMsgs(r));
  }
  const noExample = lintSuccessChild(swap('시험 대비는 따로 챙겨야 합니다.', '시험 대비는 하루 5개 문제를 푸는 방식으로 챙겨야 합니다.'), factsA);
  assert.ok(noExample.hard.length > 0, '"예를 들어" 없는 예시 숫자');
  assert.ok(!GOLDEN.includes('{현재학령}') && !/학년/.test(SAMPLE_REPORT_TEXT), '샘플에 학년 표시가 없다');
  assert.ok(!/학년|학령|졸업/.test(factsA.text), 'AI에게 넘기는 계산값에 학년이 없다');
});

test('실제 AI 첫 시험 결과(2026-11-13, 검사 실패 12건)는 새 검사가 문제를 모두 잡고, 고객용 결과로는 나가지 않는다 (회귀)', async () => {
  const f = factsOf(QC2.input);
  const r = lintSuccessChild(QC2.text, f);
  const msgs = hardMsgs(r);
  assert.ok(r.hard.length >= 20, '문제 수 ' + r.hard.length);
  assert.match(msgs, /"사업가형"이라는 말은 서버 판정이 유형 A일 때만/);           // 유형 B 아이에게 사업가형 사용
  assert.match(msgs, /핵심 결론 "요약:"은 "공부형은 사주의 구조를 부르는 이름이고, 공부만 해야 한다는 뜻은 아닙니다\."로 시작/);
  assert.match(msgs, /사업운의 "예시:" 항목.*3개여야 합니다\(지금 2개\)/);          // 사업 분야 3가지
  assert.match(msgs, /사업운에는 \{재성대운\}·\{재성속운\}을 쓰지 마세요/);          // 재성 문장은 재물운에서만
  assert.match(msgs, /직업운의 예시 항목은 "- 이름: 설명" 형식/);                    // 직업명 뒤에 콜론이 없음
  assert.match(msgs, /직업 예시마다 그 직업이 하는 일/);
  assert.match(msgs, /물음표 문장/); assert.match(msgs, /"~십시오"/);
  assert.match(msgs, /"규칙과 평가"이 \d+번 나옵니다/);
  assert.match(msgs, /본문에 전문 용어·계산 숫자·반복 표현·학년 표현/);
  assert.match(msgs, /편관 개수 2가 계산값과 다름|관성 개수 4가 계산값과 다름/);        // 지어낸 개수
  assert.ok(hardCodes(r).includes('grounding') && hardCodes(r).includes('tone') && hardCodes(r).includes('repeat') && hardCodes(r).includes('jargon'));
  // 서버처럼 두 번 모두 이 결과가 오면 결과지를 만들지 않는다(원문·토큰이 고객에게 나가지 않음)
  let n = 0;
  const out = await generateSuccessChild({ facts: f, callModel: async () => { n++; return { text: QC2.text }; } });
  assert.equal(n, 3); assert.equal(out.ok, false); assert.equal(out.text, undefined);
});

test('고객용 결과에는 {…} 토큰이 한 글자도 남지 않는다: 모르는 토큰·미완성 토큰이 섞여도 고쳐 보내거나 막는다', async () => {
  const f = factsA;
  for (const bad of ['{대운9}', '{대운6.모름}', '{재성대운', '대운{']) {
    const text = GOLDEN.replace('시험 대비는 따로 챙겨야 합니다.', '시험 대비는 ' + bad + ' 때문에 따로 챙겨야 합니다.');
    assert.ok(text !== GOLDEN);
    const out = await generateSuccessChild({ facts: f, callModel: async () => ({ text }) });
    if (out.ok) assert.ok(!/[{}]/.test(out.text), bad + ' 가 남았다');
  }
  const done = await generateSuccessChild({ facts: f, callModel: async () => ({ text: GOLDEN }) });
  assert.ok(done.ok && !/[{}]/.test(done.text));
});

test('재물 시기 근거: 재물운 결론·한 줄은 서버가 확정한 돈의 흐름 시기만 쓸 수 있다(없는 시기를 지어내지 못한다)', () => {
  const f = factsOf(QC2.input);          // 대운 천간에는 재성이 없고, 대운5·6의 속에서 받치는 운에 있다
  const base = makeValid(f);
  assert.deepEqual(lintSuccessChild(base, f).hard, []);
  const bad = base.replace('결론: 돈을 다루는 특징입니다', '결론: 돈의 운은 {대운3.연도}에 들어옵니다');
  assert.match(hardMsgs(lintSuccessChild(bad, f)), /재물운 "결론:"의 \{대운3\}은 돈의 흐름이 나타나는 시기가 아닙니다/);
  const ok = base.replace('결론: 돈을 다루는 특징입니다', '결론: 돈의 흐름은 {대운6.연도}에 들어옵니다');
  assert.ok(!/재물운 "결론:"의/.test(hardMsgs(lintSuccessChild(ok, f))));
  const ex = expandTokens('{재성대운} {재성속운}', f).text;
  assert.ok(ex.includes('겉으로 드러난 운에는 돈과 거래의 운이 나타나지 않습니다') && ex.includes('2064~2073년(48~57세) 쌓이는 돈의 흐름, 2074~2083년(58~67세) 움직이는 돈의 흐름이 들어옵니다'));
});

test('서버가 확정하는 것: 판정 근거 쉬운 말에는 숫자가 없고, 추천 후보는 언제나 사전 안의 직업 3개·사업 3개이며, 첫 문장은 유형별로 정해져 있다', () => {
  let n = 0;
  for (let y = 2006; y <= 2018; y++) for (const m of [1, 4, 7, 10]) for (const g of ['남성', '여성']) for (const t of ['', '05:30']) {
    const f = factsOf({ gender: g, solarDate: `${y}-${String(m).padStart(2, '0')}-15`, birthtime: t });
    const pk = pickExamples(f); n++;
    assert.equal(pk.jobs.length, 3); assert.equal(pk.biz.length, 3);
    assert.ok(pk.jobs.every((x) => Object.values(JOB_DICT).flat().includes(x)) && new Set(pk.jobs).size === 3);
    assert.ok(pk.biz.every((x) => Object.values(BIZ_DICT).flat().some((d) => x.includes(d) || d.includes(x))) && new Set(pk.biz).size === 3);
    const ps = plainSignals(f);
    assert.equal(ps.length, 4); assert.ok(ps[3].startsWith('정리:'));
    assert.ok(ps.every((x) => !/\d/.test(x.replace(/\{[^}]*\}/g, ''))), '쉬운 말 판정 근거에 숫자가 없다');
    assert.equal(lintSuccessChild(makeValid(f), f).hard.length, 0, `${y}-${m} ${g}`);
  }
  assert.ok(n >= 100);
  assert.ok(factsA.text.includes('"결론:" 줄은 정확히 "이 아이는 사업가형 사주입니다."'));
  assert.ok(factsOf({ gender: '남성', solarDate: '2011-02-27', birthtime: '13:40' }).text.includes('정확히 "이 아이는 공부형 사주입니다."'));
  assert.ok(factsOf({ gender: '여성', solarDate: '2012-02-25', birthtime: '08:30' }).text.includes('정확히 "이 아이는 공부와 사업을 함께 쓰는 사주입니다."'));
});

test('실제 AI 두 번째 시험 결과(같은 입력, 검사 실패)에서 남은 문제는 새 검사가 모두 잡는다: 지어낸 시기·연령대·학교급·행동 단정·반복·"모두 같은 쪽" (회귀)', async () => {
  const f = factsOf(QC3.input);
  const r = lintSuccessChild(QC3.text, f);
  const msgs = hardMsgs(r);
  assert.ok(r.hard.length >= 20, '문제 수 ' + r.hard.length);
  assert.match(msgs, /재물운 "결론:"의 \{대운2\}은 돈의 흐름이 나타나는 시기가 아닙니다/);           // 대운2 를 돈의 시기로 씀
  assert.match(msgs, /\{대운2\}의 겉으로 드러난 운은 "깊이 파고드는 배움"입니다\("날카롭게 드러나는 재능"이 아닙니다\)/);   // 겉/속 운을 바꿔 씀
  assert.match(msgs, /판정 근거 세 가지가 모두 같은 쪽이 아닌데/);                                    // 사실 하나가 중립인데 '모두'라고 씀
  assert.match(msgs, /아이의 실제 습관·행동을 사실처럼 단정하는 표현\((즐깁니다|지루해하지|선호합니다)\)/);
  assert.match(msgs, /초등학생|중학생|고학년/); assert.match(msgs, /직장인|대학생|취업 준비생/);          // 학교급·생애 단계 표현
  assert.match(msgs, /"10대·20대·30대" 같은 연령대 표현/);
  assert.match(msgs, /물음표 문장/);
  assert.match(msgs, /"(꾸준히 쌓는 배움|깊이 파고드는 배움)"이\(가\) \d+번 나옵니다/);                       // 용어집 표현 반복
  assert.ok(['grounding', 'tone', 'repeat', 'jargon'].every((c) => hardCodes(r).includes(c)));
  let n = 0;
  const out = await generateSuccessChild({ facts: f, callModel: async () => { n++; return { text: QC3.text }; } });
  assert.equal(n, 3); assert.equal(out.ok, false); assert.equal(out.text, undefined, '검사에 실패한 결과는 고객용 결과지로 나가지 않는다');
});

test('"큰돈을 번다는 뜻은 아닙니다" 같은 부정문은 단정·약속으로 보지 않고, 긍정 단정은 계속 잡는다', () => {
  const g = (sent) => lintSuccessChild(GOLDEN.replace('시험 대비는 따로 챙겨야 합니다.', sent), factsA);
  assert.ok(!/소득 결과를 단정|단정하거나 약속/.test(hardMsgs(g('큰돈을 번다는 뜻은 아닙니다.'))));
  assert.ok(!/소득 결과를 단정|단정하거나 약속/.test(hardMsgs(g('수입이 늘어난다는 뜻은 아닙니다.'))));
  assert.match(hardMsgs(g('이 아이는 큰돈을 법니다.')), /단정/);
});

test('프롬프트는 검사기가 막는 말을 따라 쓰게 만들지 않는다(말년·평생·큰돈 같은 금지 예시를 본문 지시에 넣지 않는다)', () => {
  const p = buildSuccessChildPrompt(factsA.text);
  const rules = p.slice(p.indexOf('[해석의 바탕'));
  assert.ok(!/말년|노년|큰돈을 번다/.test(rules.replace(/"큰돈을 번다는 뜻은 아닙니다"/g, '')));
  assert.ok(!rules.includes('{현재나이}'), '필요 없는 현재 나이 토큰을 AI에게 알려 주지 않는다');
});

test('새 상품 규칙: 해볼 일에는 관찰하는 말, 핵심 결론에는 "이번 달"과 쉬운 한 문장, 같은 문장 되풀이 금지, 분량은 강제하지 않는다', () => {
  const lint = (from, to) => lintSuccessChild(GOLDEN.replace(from, to), factsA);
  assert.match(hardMsgs(lint(/해볼 일: 저녁에 오늘 배운 것[^\n]+/, '해볼 일: 저녁에 오늘 배운 것 하나를 설명하게 합니다.')), /공부운의 "해볼 일:"에는 아이의 관심과 반응을 살펴보는 방법/);
  assert.match(hardMsgs(lint(/(해볼 일: 아이가 직접 만든 것[^\n]+?)이번 달 한 번/, '$1한 번')), /핵심 결론의 "해볼 일:"에는 "이번 달"/);
  assert.match(hardMsgs(lint(/한 줄: 이 아이는 만들고 설명할 때 가장 크게 자랍니다\./, '한 줄: 만들고 설명할 때 크게 자랍니다.')), /"한 줄:"은 "이 아이는 ~"로 시작하는 쉬운 한 문장/);
  const dupSentence = '아이가 읽은 내용을 직접 말해 보는 시간을 정해 두면 좋습니다.';
  const dup = GOLDEN.replace('시험 대비는 따로 챙겨야 합니다.', dupSentence).replace('설명이 막히는 부분이 다음 날 복습할 부분입니다.', dupSentence);
  assert.match(hardMsgs(lintSuccessChild(dup, factsA)), /같은 문장이 항목 사이에서 되풀이됩니다/);
  // 짧아도 분량 때문에 막지 않는다(상한만 있다)
  const short = lintSuccessChild(makeValid(factsA), factsA);
  assert.deepEqual(short.hard, []); assert.ok(short.total < 4000); assert.ok(!short.soft.some((m) => /분량/.test(m)));
  assert.ok(!/5,000|6,500|5,500|7,500/.test(buildSuccessChildPrompt(factsA.text)), '프롬프트에 글자 수 목표가 없다');
});

test('프롬프트: 재물운은 지금 부모가 가르쳐 볼 돈 관리 방법을 포함하고, 항목마다 역할이 정해져 있으며, 2주 활동은 관찰 방법일 뿐 적성·미래를 정하지 않는다고 쓴다', () => {
  const p = buildSuccessChildPrompt(factsA.text);
  for (const s of ['돈 관리 방법: ...', '용돈 나누기, 쓴 곳 기록하기, 사기 전에 가격 비교하기', '지금 부모가 아이에게 가르쳐 볼 수 있는 돈 관리', '시기별 운: 언제 무엇이 달라지는지', '그 결과만으로 적성이나 미래가 정해진다고 쓰지 않습니다', '이번 달에 부모가 해 볼 일 한 가지', '이 아이를 설명하는 쉬운 한 문장']) assert.ok(p.includes(s), s);
});

test('실제 AI 3차 결과(대표 평가: 상품다움)의 남은 문제만 걸리고, 좋은 점과 검사기 오탐은 걸리지 않는다 (회귀)', async () => {
  const f = factsOf(QC4.input);
  const r = lintSuccessChild(QC4.text, f);
  const msgs = hardMsgs(r);
  // 실제 오류는 계속 걸린다
  assert.match(msgs, /"전통 명리학에서"이 \d+번 나옵니다/);                 // 예시마다 같은 풀이 반복
  assert.match(msgs, /"쌓는 힘"이 \d+번 나옵니다/);
  assert.match(msgs, /"사업가형"이라는 말은 서버 판정이 유형 A일 때만/);
  for (const w of ['모습을 보입니다', '일일이 챙기지 않아도', '데 강합니다', '이해가 빠릅니다', '스스로 판단하고 처리']) assert.ok(msgs.includes(w), w);   // 확인하지 않은 능력·행동 단정
  // 구조·첫 화면·계산은 통과: 첫 문장, 직업 3·사업 3, 예시 형식, 해볼 일, 서버 확정 시기
  assert.ok(!/structure/.test(hardCodes(r).join()), '구조 위반 없음: ' + msgs);
  assert.ok(!/재물운 "결론:"|판정 근거 세 가지가 모두|연령대 표현|학년 표현|물음표/.test(msgs), '3차에서 고쳐진 오류는 다시 나오지 않는다');
  // 오탐 수정: "즐기는지 살펴봅니다"(관찰 제안)와 "쓸 수 있습니다"(방법)는 걸리지 않는다
  assert.ok(!/즐기는|실제 습관·행동을 사실처럼 단정하는 표현\(즐/.test(msgs));
  assert.ok(!/보험성 표현/.test(msgs));
  let n = 0;
  const out = await generateSuccessChild({ facts: f, callModel: async () => { n++; return { text: QC4.text }; } });
  assert.equal(n, 3); assert.equal(out.ok, false); assert.equal(out.text, undefined);
});

test('검사기 오탐 수정: 관찰 제안과 방법 문장은 통과하고, 능력·행동 단정과 아이를 풀이하는 보험 표현은 계속 잡는다', () => {
  const g = (sent) => lintSuccessChild(GOLDEN.replace('시험 대비는 따로 챙겨야 합니다.', sent), factsA);
  for (const ok of ['아이가 기록하는 과정을 즐기는지 살펴봅니다.', '아이가 이런 방식을 선호하는지 확인해 봅니다.', '정리한 노트는 시험 전에 다시 볼 자료로 쓸 수 있습니다.', '틀린 문제를 모아 두면 같은 실수를 줄일 수 있습니다.']) assert.deepEqual(g(ok).hard, [], ok);
  for (const bad of ['이 아이는 정리하는 모습을 보입니다.', '이 아이는 수학 문제를 푸는 데 강합니다.', '이 아이는 도표를 보면 이해가 빠릅니다.', '이 아이는 선생님이 챙기지 않아도 스스로 문제를 풀려는 아이입니다.', '이 아이는 숙제를 즐깁니다.']) assert.match(hardMsgs(g(bad)), /단정하는 표현/, bad);
  const hedgy = '이 아이는 꾸준함이 필요할 수 있습니다. 이 아이는 정리를 어려워할 수 있습니다. 이 아이는 반복이 도움이 될 수 있습니다.';
  assert.ok(hardCodes(g(hedgy)).includes('hedge'));
  // 예시 항목은 세 문장 이내(다섯 문장부터 막는다)
  const longBullet = GOLDEN.replace(/(- 영어: [^\n]+)/, '$1 한 문장을 더 씁니다. 또 한 문장을 더 씁니다. 그리고 한 문장을 더 씁니다.');
  assert.match(hardMsgs(lintSuccessChild(longBullet, factsA)), /예시 항목 하나가 너무 깁니다/);
});

test('프롬프트: 풀이 문장은 첫 문단에서 한 번, 예시·시기별 운에는 쓰지 않고, 능력·행동은 부모가 살펴보는 제안으로 쓰게 한다', () => {
  const p = buildSuccessChildPrompt(factsA.text);
  for (const s of ['전체에서 두 번 이하로 쓰고', '시기별 운과 예시 항목에서는 쓰지 않습니다', '예시 항목 하나는 세 문장 이내', '사주 해석과 부모가 확인할 일을 구분합니다', '서버가 사주 계산값으로 항목마다 따로 붙이므로 쓰지 않습니다', '{재성대운}·{재성속운}만 말합니다', '명리학 교재가 아닙니다', '실제 능력·습관·행동·성향을 사실처럼 쓰지 않습니다', '"~하는 모습을 보입니다", "~에 강합니다", "이해가 빠릅니다"', '정말 그런지는 부모가 직접 살펴보도록 제안합니다', '유형 B·C에서는 "사업가형"이라는 말을 어디에도 쓰지 않습니다', '"이 시기는 ~가 중심입니다"로 시작']) assert.ok(p.includes(s), s);
});
