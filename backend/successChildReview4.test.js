// 실제 AI 4차 결과(2026-11-13) 평가 반영 시험: 설명 반복, 시기·위치 모순, 아이 행동 단정, 직업·사업 이유(서버 작성), 검사 실패 결과는 보내지 않기.
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSuccessChildFacts } = require('./successChild');
const { lintSuccessChild, injectReasons, generateSuccessChild, parseSections } = require('./successChildPrompt');
const { SAMPLE_INPUT, SAMPLE_RAW_TEXT } = require('./successChildSample');
const { pickExamples, reasonFor, JOB_INFO, BIZ_INFO } = require('./successChildPlain');
const { expandTokens } = require('./successChildTokens');
const QC2 = require('./successChildQc2.fixture');
const QC5 = require('./successChildQc5.fixture');

const now = new Date('2026-11-12T12:00:00+09:00');
const factsOf = (o) => buildSuccessChildFacts({ ...o, now });
const factsA = factsOf(SAMPLE_INPUT);
const GOLDEN = SAMPLE_RAW_TEXT;
const hardCodes = (r) => r.hard.map((h) => h.code);
const hardMsgs = (r) => r.hard.map((h) => h.message).join(' | ');

test('실제 AI 4차 결과(설명 반복·이유 반복·시기 모순·행동 단정)는 새 검사가 문제를 모두 잡고, 고객용 결과로는 나가지 않는다 (회귀)', async () => {
  const f = factsOf(QC5.input);
  const r = lintSuccessChild(QC5.text, f);
  const msgs = hardMsgs(r);
  assert.ok(r.hard.length >= 40, '문제 수 ' + r.hard.length);
  // 같은 명리학 설명·용어 반복
  assert.match(msgs, /"전통 명리학에서"이 \d+번 나옵니다/);
  assert.match(msgs, /시기별 운을 뺀 전체에서 "안정된 제도 안의 인정"이\(가\) \d+번/);
  assert.match(msgs, /뜻을 풀이하는 문장이 두 번 이상 나옵니다/);
  assert.match(msgs, /공부운의 예시 항목에는 풀이 문장/);
  // 직업·사업 추천 이유를 AI가 이름만 바꿔 반복하는 것을 막는다: 예시 항목에 "이 아이"·"사주"·용어집 표현 금지
  assert.match(msgs, /직업운의 예시 항목에 "이 아이"·"사주"를 쓰지 마세요/);
  assert.match(msgs, /사업운의 예시 항목에 "이 아이"·"사주"를 쓰지 마세요/);
  assert.match(msgs, /직업운의 예시 항목에 용어집 표현/);
  // 위치 설명·지장간 노출
  assert.match(msgs, /"겉에" 같은 위치 설명은 쓰지 마세요/);
  assert.match(msgs, /학년 표현\(지장간/);
  // 재물운 앞뒤 모순의 원인: 재물운 본문 {대운N}, 사업운에서 돈의 흐름 + 시기
  assert.match(msgs, /재물운 본문에는 \{대운N\} 토큰을 쓰지 마세요/);
  assert.match(msgs, /사업운: 돈의 흐름을 시기\(\{대운N\}\)와 함께 쓰지 마세요/);
  // 확인하지 않은 아이의 행동·능력을 사실처럼 쓴 문장
  for (const w of ['누가 시키지 않아도', '누가 옆에서 가르쳐 주지 않아도', '스스로 판단', '혼자 사무소를 열어도 운영할 수', '혼자서도 약국을 운영']) assert.ok(msgs.includes(w), w);
  assert.match(msgs, /"이 아이는 ~할 수 있습니다"/);
  assert.match(msgs, /재물운: 연도를 직접 썼습니다/);
  // 3번 모두 이 결과가 오면 결과지를 만들지 않는다. 문장을 지워 통과시키지 않는다
  let n = 0;
  const out = await generateSuccessChild({ facts: f, callModel: async () => { n++; return { text: QC5.text }; } });
  assert.equal(n, 3); assert.equal(out.ok, false); assert.equal(out.text, undefined); assert.equal(out.repaired, undefined);
  assert.ok(out.reasons.length > 0);
});

test('위치·시기 모순 방지: 돈의 흐름의 시기와 위치는 서버 문장만 말하고, 시기별 운에는 그 시기에 없는 힘을 쓰지 못한다', () => {
  const f = factsA;   // 대운1 庚寅(천간 편재), 대운2 辛卯(천간 정재)
  const g = (from, to) => { assert.ok(GOLDEN.includes(from), from); return lintSuccessChild(GOLDEN.replace(from, to), f); };
  assert.match(hardMsgs(g('이 아이는 거래와 돈 계산을 먼저 접하고,', '이 아이는 {대운1}에 거래와 돈 계산을 먼저 접하고,')), /재물운 본문에는 \{대운N\}/);
  assert.match(hardMsgs(g('이 아이는 거래와 돈 계산을 먼저 접하고,', '이 아이는 겉으로 드러난 곳에서 거래와 돈 계산을 먼저 접하고,')), /위치 설명/);
  assert.match(hardMsgs(g('시험 대비는 따로 챙겨야 합니다.', '움직이는 돈의 흐름은 {대운3}에 들어옵니다.')), /돈의 흐름을 시기\(\{대운N\}\)와 함께 쓰지 마세요/);
  // "생활 속에서" 같은 일반 표현은 위치 설명이 아니다
  assert.deepEqual(g('시험 대비는 따로 챙겨야 합니다.', '생활 속에서 시험 대비는 따로 챙겨야 합니다.').hard, []);
  // 시기별 운: 그 시기에 없는 힘을 쓰면 걸리고, 있는 힘은 통과한다
  const r1 = f.rows[0];
  const have = [r1.stemGod, r1.branchMainGod, ...r1.branchHidden.map((h) => h.god)];
  assert.ok(!have.includes('정관'));
  assert.match(hardMsgs(g('주제: 거래와 만들기를 처음 접하는 시기', '주제: 안정된 제도 안의 인정을 받는 시기')), /\[대운1\]에 "안정된 제도 안의 인정"이\(가\) 없는데 썼습니다/);
  assert.deepEqual(g('주제: 거래와 만들기를 처음 접하는 시기', '주제: 움직이는 돈의 흐름이 들어오는 시기').hard, []);
  // 서버 문장은 겉(천간)과 속(지지)을 따로 말하며, 한쪽에 없다고 전체에 없다고 쓰지 않는다
  const ex = expandTokens('{재성대운} {재성속운}', factsOf(QC2.input)).text;
  assert.ok(!/안에는 돈과 거래의 운\(재성\)이 나타나지 않습니다/.test(ex));
  assert.ok(ex.includes('겉으로 드러난 운에는 돈과 거래의 운이 나타나지 않습니다') && ex.includes('속에서 받치는 운에는 2064~2073년'));
  assert.ok(!/\(편재\)|\(정재\)/.test(expandTokens('{재성대운} {재성속운}', factsA).text), '서버 문장에도 전문 용어 괄호를 붙이지 않는다');
});

test('아이의 실제 행동·능력 단정은 계속 잡고, 부모가 살펴보는 제안과 사주 방향 문장은 통과한다', () => {
  const g = (sent) => lintSuccessChild(GOLDEN.replace('시험 대비는 따로 챙겨야 합니다.', sent), factsA);
  for (const bad of ['이 아이는 누가 옆에서 가르쳐 주지 않아도 문제집을 혼자 풀어 나갑니다.', '이 아이는 응급 상황에서도 스스로 판단하고 움직일 수 있습니다.', '이 아이는 혼자서도 약국을 운영할 수 있습니다.', '이 아이는 목표가 분명하면 집중이 잘됩니다.', '이 아이는 누가 시키지 않아도 일을 찾아 합니다.']) assert.match(hardMsgs(g(bad)), /단정/, bad);
  for (const ok of ['아이가 스스로 이어 가는지 살펴봅니다.', '사주에서는 정해진 기준 안에서 쌓는 방식이 잘 맞는 방향입니다.', '부모는 이 방식이 맞는지 두 주 동안 살펴볼 수 있습니다.']) assert.deepEqual(g(ok).hard, [], ok);
});

test('직업·사업 추천 이유는 서버가 사주 계산값으로 항목마다 다르게 붙이고, 사주에 없는 힘이면 없다고 밝힌다', () => {
  const out = injectReasons(GOLDEN, factsA);
  const secs = parseSections(out);
  const reasons = (t) => secs[t].split('\n').filter((l) => /^- /.test(l)).map((l) => (l.match(/[^.]*(?:이어집니다|후보로만 소개합니다)\./) || [''])[0].trim());
  for (const t of ['직업운', '사업운']) { const r = reasons(t); assert.equal(r.length, 3); assert.ok(r.every(Boolean), t); assert.equal(new Set(r).size, 3, t + ' 이유가 서로 다르다'); }
  // 같은 십성이 근거여도 일의 모습이 다르다(이름만 바꾼 반복이 아니다)
  assert.equal(new Set(['회계사', '간호사', '공무원'].map((n) => JOB_INFO[n].work)).size, 3);
  // 사주에 그 힘이 없으면 추천 근거를 지어내지 않는다
  let none = null;
  for (let y = 2006; y <= 2018 && !none; y++) for (const gd of ['남성', '여성']) { const ff = factsOf({ gender: gd, solarDate: `${y}-06-15`, birthtime: '' }); const name = Object.keys(JOB_INFO).find((n) => reasonFor(ff, n, 'job').startsWith('이 사주에서는')); if (name) { none = { ff, name }; break; } }
  assert.ok(none, '근거가 없는 표본을 찾지 못함');
  assert.match(reasonFor(none.ff, none.name, 'job'), /^이 사주에서는 .+이 뚜렷하게 나타나지 않아 후보로만 소개합니다\. 아이가 .+방식에 관심을 보이는지 먼저 살펴봅니다\.$/);
  assert.equal(reasonFor(factsA, '없는 직업', 'job'), '');
  assert.ok([...Object.values(BIZ_INFO), ...Object.values(JOB_INFO)].every((x) => /방식$/.test(x.work)), '일의 방식으로 끝나야 조사가 맞는다');
});

test('다른 사주 유형·다른 아이에서 직업과 사업 추천이 실제로 달라진다(모든 아이에게 같은 추천을 하지 않는다)', () => {
  const by = { A: [], B: [], C: [] };
  for (let y = 2006; y <= 2018; y++) for (const m of [1, 3, 5, 7, 9, 11]) for (const gd of ['남성', '여성']) for (const t of ['', '05:30', '13:40']) {
    const d = String(((y * 7 + m * 3) % 27) + 1).padStart(2, '0');
    const f = factsOf({ gender: gd, solarDate: `${y}-${String(m).padStart(2, '0')}-${d}`, birthtime: t });
    const pk = pickExamples(f);
    by[f.compare.type].push({ f, pk });
    assert.equal(new Set(pk.jobs.map((n) => reasonFor(f, n, 'job'))).size, 3, '같은 결과지 안에서 직업 이유가 서로 다르다');
    assert.equal(new Set(pk.biz.map((n) => reasonFor(f, n, 'biz'))).size, 3, '같은 결과지 안에서 사업 이유가 서로 다르다');
  }
  for (const k of ['A', 'B', 'C']) {
    const list = by[k]; assert.ok(list.length >= 20, k + ' 표본 ' + list.length);
    assert.ok(new Set(list.map((x) => x.pk.jobs.join('|'))).size >= 10, k + ' 직업 조합이 다양하다');
    assert.ok(new Set(list.map((x) => x.pk.biz.join('|'))).size >= 8, k + ' 사업 조합이 다양하다');
  }
  const setOf = (k) => new Set(by[k].flatMap((x) => x.pk.jobs));
  for (const [a, b] of [['A', 'B'], ['A', 'C']]) { const common = [...setOf(a)].filter((x) => setOf(b).has(x)).length; assert.ok(common <= Math.min(setOf(a).size, setOf(b).size) * 0.7, `${a}-${b} 공통 ${common}`); }
  // 참고: 유형 B와 C는 같은 십성 그룹(관성·인성·식상)에서 후보를 고르므로 후보 풀이 같고 순서·조합만 아이마다 달라진다(위 조합 다양성으로 확인).
  // 같은 입력이면 같은 추천(안정성)
  const i = { gender: '남성', solarDate: '2011-02-27', birthtime: '13:40' };
  assert.deepEqual(pickExamples(factsOf(i)), pickExamples(factsOf(i)));
  assert.ok(hardCodes(lintSuccessChild(GOLDEN, factsA)).length === 0);
});

test('5차 평가 반영: 관찰 문장·필요 조건 문장은 단정으로 보지 않고, 성향 단정과 사주 방향을 능력처럼 쓴 문장은 계속 잡는다', () => {
  const g = (sent) => lintSuccessChild(GOLDEN.replace('시험 대비는 따로 챙겨야 합니다.', sent), factsA);
  for (const ok of ['반복해서 정리하는 과정을 지루해하지 않고 이어 가는지 확인합니다.', '아이가 규칙을 따르고 반복하는 과정을 지루해하지 않는 분야가 무엇인지 확인하는 시기입니다.', '세금 신고와 계약서 작성 같은 절차를 스스로 처리할 수 있어야 합니다.']) assert.deepEqual(g(ok).hard, [], ok);
  for (const bad of ['이 아이는 반복하는 과정을 지루해하지 않습니다.', '이 아이의 체계적인 성향과 맞습니다.', '혼자서도 맡은 일을 끝까지 밀고 나갈 수 있는 방향입니다.', '누가 지켜보지 않아도 자기 속도로 밀고 나갈 수 있는 방향입니다.']) assert.match(hardMsgs(g(bad)), /단정/, bad);
  const p = require('./successChildPrompt').buildSuccessChildPrompt(factsA.text);
  assert.ok(p.includes('숫자가 든 문장마다 그 문장 안에 "예를 들어"') && p.includes('체계적인 성향'));
});

test('6차 평가 반영: 검사기 오탐 2건(시기별 운 "~시기입니다", "순서대로 채워 나가는 공부 방식")은 통과하고, 실제 문제 4건은 계속 잡는다', () => {
  const QC6 = require('./successChildQc6.fixture');
  const r = lintSuccessChild(QC6.raw, factsOf(QC6.input));
  const m = hardMsgs(r);
  assert.ok(!/스스로 판단/.test(m), '시기별 운의 "스스로 판단하고 결정하는 시기입니다"는 단정이 아니다');
  assert.ok(!/지장간 순서/.test(m), '교재를 순서대로 채워 나가는 공부 방식은 지장간 순서 해석이 아니다');
  assert.match(m, /누가 시키지 않아도/);
  assert.equal((m.match(/위치 설명/g) || []).length, 2, '공부운·재물운의 "겉으로"');
  assert.match(m, /되풀이/);
  assert.equal(r.hard.length, 5, '실제 문제 4건 + "해낼 힘이 있는" 단정 1건');
  // 지장간 순서를 실제로 풀이하는 문장은 계속 잡는다
  assert.match(hardMsgs(lintSuccessChild(GOLDEN.replace('시험 대비는 따로 챙겨야 합니다.', '지장간에 정인, 정관, 정재가 순서대로 나타나 공부에서 직장으로, 재물로 이어집니다.'), factsA)), /명리 사전에 없는/);
  // 시기별 운이 아니면 같은 문장도 단정으로 본다
  assert.match(hardMsgs(lintSuccessChild(GOLDEN.replace('시험 대비는 따로 챙겨야 합니다.', '이 아이는 스스로 판단하고 결정하는 시기입니다.'), factsA)), /단정/);
});

test('직업·사업 추천 이유는 항목 순서에 따라 문형이 돌아가고(같은 결과지에서 같은 틀 반복 없음), 모두 사주 계산값 문장으로 끝난다', () => {
  const pk = pickExamples(factsA);
  for (const [names, kind] of [[pk.jobs, 'job'], [pk.biz, 'biz']]) {
    const rs = names.map((n, i) => reasonFor(factsA, n, kind, i));
    assert.equal(new Set(rs.map((x) => x.split(/[ ,]/).slice(0, 3).join(' '))).size >= 2 || rs.some((x) => /후보로만/.test(x)), true, '문형이 돌아간다');
    for (const x of rs) assert.match(x, /이어집니다\.$|살펴봅니다\.$/);
  }
  const hit = ['job', 'biz'].flatMap((k) => (k === 'job' ? pk.jobs : pk.biz).map((n) => [n, k])).find(([n, k]) => /이어집니다/.test(reasonFor(factsA, n, k)));
  const variants = new Set([0, 1, 2].map((i) => reasonFor(factsA, hit[0], hit[1], i)));
  assert.equal(variants.size, 3, '세 문형은 서로 다르다');
});

test('문장 호흡: 생성 지침에 짧은 문장·문단 끊기·상담사 어조가 들어 있고, 서버가 쓰는 재물 시기·추천 이유 문장은 두 문장으로 짧아졌으며, 긴 문장이 많으면 참고로만 알린다(통과를 막지 않는다)', () => {
  const p = require('./successChildPrompt').buildSuccessChildPrompt(factsA.text);
  for (const k of ['[문장 호흡', '40자 안팎', '60자를 넘기지 않습니다', '2~3문장', '말만 바꿔 되풀이하지 않습니다', '상담사가 엄마 앞에서', '새로운 단정을 만들지 않습니다']) assert.ok(p.includes(k), k);
  // 서버 확정 재물 시기 문장: 연도·나이는 그대로, 한 문장 100자 이상 → 두 문장
  const w = require('./successChildTokens').wealthSentence(factsA);
  assert.ok(w.split(/(?<=[.!?])\s+/).every((s) => s.length < 80), '한 문장이 80자를 넘지 않는다');
  assert.ok(/2019~2028년\(8~17세\)은 움직이는 돈의 흐름입니다\. 2029~2038년\(18~27세\)은 쌓이는 돈의 흐름입니다\./.test(w));
  // 직업·사업 추천 이유: 두 문장, 뜻(이 사주에 있는 힘 → 일의 방식)과 '이어집니다' 끝맺음 유지
  const pk = pickExamples(factsA);
  for (const [names, kind] of [[pk.jobs, 'job'], [pk.biz, 'biz']]) names.forEach((n, i) => {
    const r = reasonFor(factsA, n, kind, i);
    if (/후보로만/.test(r)) return;
    assert.equal(r.split(/(?<=[.!?])\s+/).length, 2, r);
    assert.match(r, /이어집니다\.$/);
  });
  // 긴 문장(70자 초과) 4개 이상이면 참고(soft)만 늘고 hard 는 늘지 않는다
  const longSent = '이 아이는 정해진 범위를 반복해서 익히는 방식에서 힘이 나고, 그 방식은 시험 준비뿐 아니라 자격을 준비하거나 제도 안에서 인정을 받는 길에도 이어지며, 학년이 올라갈수록 더 중요해집니다.';
  const base = lintSuccessChild(GOLDEN, factsA);
  const many = lintSuccessChild(GOLDEN.replace('시험 대비는 따로 챙겨야 합니다.', '시험 대비는 따로 챙겨야 합니다. ' + [longSent, longSent.replace('이 아이는', '이 아이에게는'), longSent.replace('이 아이는', '엄마가 보기에 이 아이는'), longSent.replace('이 아이는', '이 사주에서 이 아이는')].join(' ')), factsA);
  assert.ok(many.soft.some((s) => /긴 문장 \d+개/.test(s)));
  assert.ok(!base.soft.some((s) => /긴 문장/.test(s)));
});
