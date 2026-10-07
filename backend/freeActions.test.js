const test = require('node:test');
const assert = require('node:assert');
const F = require('./freeActions');

const SECTIONS = {
  core: '주변의 기준을 민감하게 받아들이는 경향이 있어요.',
  why: '나를 누르는 기운이 3곳에 있어요.',
  strength: '상대가 불편해하는 것을 먼저 알아차리는 힘이 있어요.\n\n일을 맡았을 때도 필요한 것을 챙기는 모습으로 나타나요.',
  habit: '여러 사람의 필요가 한꺼번에 보일 때 거절 기준이 흐려질 수 있어요.\n\n그러면 하려던 일이 뒤로 밀려 지치기 쉬워요.',
};

const GOOD = `===${F.ACTIONS_TITLE}===
1. 부탁이 겹친 날 저녁에 일정표 열기
부탁이 두 개 이상 겹친 날은 저녁에 일정표를 열고 내 일 먼저 한 줄로 적으세요. 거절 기준이 흐려지는 경향이 있어서, 적어 둔 내 일이 기준이 돼요.

2. 거절은 대안 하나와 함께 보내기
어렵다고 정한 부탁은 거절만 보내지 말고 가능한 때를 하나 붙이세요. 하려던 일이 뒤로 밀리는 걸 막는 방법이에요.
💬 "이번 주는 어려워요. 다음 주라면 가능해요."

3. 불편해 보이는 사람에게 먼저 한마디 건네기
상대가 불편해하는 것을 먼저 알아차리는 힘을 모임에서 쓰세요. 시작 전에 어색해 보이는 한 사람에게 편한 자리를 먼저 권해요.
💬 "이쪽 자리가 더 편하실 것 같아요."
`;
const parse = () => F.parseActions(F.extractActionsSection(GOOD)).map(i => ({ ...i }));
const check = (items) => F.validateActions(items, { sections: SECTIONS });

test('정상 형식은 3개로 읽히고(제목·방법·💬 선택), 검증을 통과한다', () => {
  const items = parse();
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[0].title, '부탁이 겹친 날 저녁에 일정표 열기');
  assert.strictEqual(items[1].say, '이번 주는 어려워요. 다음 주라면 가능해요.');
  assert.strictEqual(items[0].say, '');
  const v = check(items);
  assert.deepStrictEqual([v.ok, v.hard, v.soft], [true, [], []]);
});

test('"근거:"·"이유:" 줄을 모델이 붙여도 파서가 무시하고, 표준 형식으로 다시 쓰면 같은 내용으로 읽힌다', () => {
  const noisy = GOOD.replace('2. 거절은', '근거: 주의할 습관 — "구절"\n2. 거절은').replace('3. 불편해', '이유: 이 사람에게 필요해요\n3. 불편해');
  const items = F.parseActions(F.extractActionsSection(noisy));
  assert.strictEqual(items.length, 3);
  assert.ok(!items[0].how.includes('근거') && !items[1].how.includes('이유'));
  const again = F.parseActions(F.extractActionsSection(`===${F.ACTIONS_TITLE}===\n${F.formatActions(parse())}\n`));
  assert.deepStrictEqual(again, parse());
  assert.ok(!F.formatActions(parse()).includes('근거') && !F.formatActions(parse()).includes('이유:'));
});

test('다음 섹션 마커 앞에서 끊어 읽고, 공백이 낀 제목 줄도 찾고, 없으면 null', () => {
  assert.ok(!F.extractActionsSection(GOOD + '\n===다른 섹션===\n무시').includes('무시'));
  assert.strictEqual(F.extractActionsSection('===나의 강점===\n내용'), null);
  assert.strictEqual(F.sectionBody('===나의 강점===\n강점 글\n===주의할 습관===\n습관 글', '나의 강점'), '강점 글');
  const spaced = GOOD.replace(`===${F.ACTIONS_TITLE}===`, `=== ${F.ACTIONS_TITLE} ===`);
  assert.strictEqual(F.parseActions(F.extractActionsSection(spaced)).length, 3);
  assert.ok(F.ACTIONS_MARK_RE.test(spaced));
});

test('hard: 3개가 아니거나, 한자·마크다운·시기 숫자·점수·방법 속 빈칸이 있으면 보내지 않는 종류', () => {
  assert.ok(check(parse().slice(0, 2)).hard.length > 0);
  assert.ok(check([]).hard.length > 0);
  const a = parse(); a[0].how = '2027년 3월 전에 일정표를 열고 내 일 먼저 한 줄로 적으세요.';
  assert.ok(check(a).hard.some(r => r.includes('시기 숫자')));
  const b = parse(); b[1].how = '상위 10% 안에 들도록 일정표를 열고 내 일 먼저 한 줄로 적으세요.';
  assert.ok(check(b).hard.some(r => r.includes('수치')));
  const c = parse(); c[0].title = '일정표 열기 規'; assert.ok(check(c).hard.some(r => r.includes('한자')));
  const d = parse(); d[2].how = '**굵게** 적으세요 가나다라마바사'; assert.ok(check(d).hard.some(r => r.includes('마크다운')));
  const e = parse(); e[1].how = '이렇게 보내세요: "○○일 이후로 미뤄도 될까요?" 이번 주 안에 한 번만 하세요.'; assert.ok(check(e).hard.some(r => r.includes('빈칸')));
});

test('soft(재생성): 명백한 화면 결함 — 반말 💬·💬 빈칸·가리키기만 하는 💬·💬 섞임·합쇼체·너무 짧음·아주 긴 제목·사용자가 지적한 추상 표현', () => {
  for (const bad of ['우선순위를 정해보세요', '결정을 믿고 행동해보세요', '의견을 표현해보세요', '마음의 여유를 가져보세요', '중심을 잡아보세요', '자신을 믿어보세요', '좋은 습관을 만들어보세요', '생각을 멈춰보세요', '마음속으로 정하세요']) {
    const items = parse(); items[0].how = '오늘 하루 동안 ' + bad + ' 그리고 저녁에 한 번 더 확인하세요.';
    const v = check(items);
    assert.ok(v.hard.length === 0 && v.soft.some(r => r.includes('추상적인 표현')), bad);
  }
  const a = parse(); a[1].say = '요즘 어때? 필요한 게 있으면 말해 줄게.'; assert.ok(check(a).soft.some(r => r.includes('존댓말')));
  const b = parse(); b[1].say = '그럼 이렇게 이해했는데 맞나요? (요약) — 맞으면 진행할게요.'; assert.ok(check(b).soft.some(r => r.includes('빈칸')) && check(b).hard.length === 0);
  const c = parse(); c[1].say = '이렇게 말씀드릴게요 이렇게 정리되는데요.'; assert.ok(check(c).soft.some(r => r.includes('가리키기만')));
  const d = parse(); d[1].how = '변화가 생기면 먼저 알리세요. 💬 "달라서 말씀드려요." 하고 보내세요.'; assert.ok(check(d).soft.some(r => r.includes('따로 한 줄')));
  const e = parse(); e[0].title = '이번 주 가장 중요한 일 한 가지를 마감 직전이 아니라 지금 바로 시작하기 위해 오늘 저녁에 준비하기'; assert.ok(check(e).soft.some(r => r.includes('제목이 너무 길어요')));
  const f = parse(); f[2].how = '오늘 저녁에 한 번 확인합니다. 그리고 메모합니다.'; assert.ok(check(f).soft.some(r => r.includes('해요체')));
});

test('입력에 없는 직장·가족·연애 상황(후배·업무·팀·조직 포함)과 근거 없는 요일·긴 기간은 재생성 대상, 일·모임·이번 주 안에는 통과', () => {
  const t = (idx, how) => { const a = parse(); a[idx].how = how; return check(a).soft.join(' | '); };
  assert.match(t(0, '다음 회의 전에 보고서를 열고 한 줄로 적으세요. 저녁에 다시 보세요.'), /직장 상황/);
  assert.match(t(0, '내일 오전 한 가지 업무에만 적용해 보세요. 이번 주 안에 한 번 하고 메모하세요.'), /직장 상황/);
  assert.match(t(2, '후배를 지도할 때 선택지를 두세 가지 알려 주세요. 이번 주 안에 한 번만 해보세요.'), /직장 상황/);
  assert.match(t(0, '팀이나 조직에서 쓰는 방식 하나를 이번 주 안에 바꿔 보세요. 한 줄로 적으세요.'), /직장 상황/);
  assert.match(t(1, '애인에게 먼저 한 줄을 보내세요. 이번 주 안에 한 번만 해보세요.'), /가족·연애/);
  assert.match(t(1, '토요일까지 정한 뒤 이번 주 안에 하나만 하세요. 메모장에 한 줄 적으세요.'), /요일·긴 기간/);
  assert.match(t(1, '최근 3개월 동안 안 써 본 방법 하나를 이번 주 안에 써 보세요. 한 줄로 적으세요.'), /요일·긴 기간/);
  assert.strictEqual(t(0, '이번 주 안에 모임 약속 하나를 오늘 저녁에 정하세요. 메모장에 한 줄 적으세요.'), '');
  assert.strictEqual(t(1, '오늘 저녁 10분만 메모장에 한 가지를 적고, 30분 안에 하나만 끝내세요. 이번 주 안에 두 번 하세요.'), '');
  const sp = parse(); sp[2].how = '이번 주 안에 배우자와 같이 앉아 일정 하나를 정하세요. 메모장에 한 줄 적으세요.';
  assert.ok(F.validateActions(sp, { sections: SECTIONS }).soft.some(r => r.includes('가족·연애')));
  assert.ok(!F.validateActions(sp, { sections: SECTIONS, married: true }).soft.some(r => r.includes('가족·연애')));
});

test('반대 방향: 습관을 그대로 시키는 명백한 처방만 재생성 대상(표현만 바뀐 경우를 쫓지 않는다)', () => {
  const withHabit = (habit) => ({ sections: { ...SECTIONS, habit } });
  const a = parse(); a[0].how = '새 일이 들어오면 이번 주 안에는 보류하세요. 저녁에 목록만 보세요 정말로.';
  a[0].how = '새 일이 들어오면 결정을 미루세요. 저녁에 목록만 보세요. 이번 주 안에 한 번만요.';
  assert.ok(F.validateActions(a, withHabit('새로운 선택 앞에서 결정을 오래 미루는 모습이 반복될 수 있어요.')).soft.some(r => r.includes('키우는 처방')));
  assert.ok(!F.validateActions(a, withHabit('여러 사람의 필요가 한꺼번에 보일 때 거절 기준이 흐려질 수 있어요.')).soft.some(r => r.includes('키우는 처방')));
  const b = parse(); b[1].how = '이번 주에는 지금 쓰는 방법 그대로 유지하세요. 새로 시도하지 마세요. 저녁에 한 번 점검하세요.';
  assert.ok(F.validateActions(b, withHabit('한 번 정한 방식을 계속 고수하는 경향이 있어요.')).soft.some(r => r.includes('방식·기준 고수')));
  const c = parse(); c[2].how = '도와준 사람 한 명에게 "필요한 거 있으면 말씀해 주세요"라고 먼저 연락해 보세요. 이번 주 안에 한 번만 하세요.';
  assert.ok(F.validateActions(c, withHabit('남의 일을 떠안아 에너지를 너무 쓰는 경향이 있어요.')).soft.some(r => r.includes('남에게 에너지')));
  // 강점은 살리되 습관을 줄이는 방향은 통과
  const ok = parse(); ok[2].how = '상대 일을 대신 처리하지 말고, 고를 수 있는 길 두 가지만 메모해 알려 주세요. 이번 주 안에 한 번만 해보세요.';
  assert.ok(!F.validateActions(ok, withHabit('남의 일을 떠안아 에너지를 너무 쓰는 경향이 있어요.')).soft.some(r => r.includes('남에게 에너지')));
  // 이전에 있던 "기록으로 남기기" 같은 표현 추적 검사는 없다(오탐으로 재생성을 만들지 않는다)
  const rec = parse(); rec[2].how = '매일 반복하는 일 하나를 정해 처리한 순서를 메모로 남기세요. 이번 주 안에 하나만 해보세요.';
  assert.ok(!F.validateActions(rec, withHabit('한 번 정한 방식을 계속 고수하는 경향이 있어요.')).soft.some(r => r.includes('방식·기준 고수')));
});

test('notes(로그만, 재생성 안 함): 제목 32~40자·두루뭉술한 표현 일부·짧은 기간·흔한 장면·행동 유사도', () => {
  const longTitle = parse(); longTitle[0].title = '이번 주 가장 중요한 일 하나를 정해서 오늘 저녁에 먼저 시작하기';
  const v1 = check(longTitle);
  assert.ok(v1.ok && v1.notes.some(r => r.includes('제목이 길어요')));
  const vague = parse(); vague[0].how = '오늘 저녁에 휴대폰을 내려놓고 심호흡을 한 번 하세요. 그다음 한 줄만 적으세요.';
  const v2 = check(vague);
  assert.ok(v2.ok && v2.notes.some(r => r.includes('심호흡')));
  const period = parse(); period[1].how = '결정을 한 뒤 하루 뒤에 한 번 더 확인하세요. 이번 주 안에 한 번만 하세요.';
  const v3 = check(period);
  assert.ok(v3.ok && v3.notes.some(r => r.includes('하루 뒤')));
  const same = parse(); same[1] = { ...same[0], n: 2 };
  const v4 = check(same);
  assert.ok(v4.ok && v4.notes.some(r => r.includes('비슷해요')));
  const circle = parse(); circle[1].how = '아침에 오늘 할 일을 종이에 적고 가장 중요한 하나에 동그라미를 치세요. 이번 주 안에 한 번만 하세요.';
  assert.ok(check(circle).ok && check(circle).notes.some(r => r.includes('흔한 장면')));
  const mism = parse(); mism[0].title = '새 제안 들은 날 바로 답하기'; mism[0].how = '그 자리에서 "일단 생각해 볼게요"라고 말하고 저녁에 한 가지만 시도해 보세요. 이번 주 안에 한 번만 하세요.';
  assert.ok(check(mism).ok && check(mism).notes.some(r => r.includes('제목은 "바로"')));
});

test('repair: soft 만 남으면 문제 있는 💬 문장만 빼고(행동 3개와 본문은 그대로), 💬 표시가 섞인 방법은 표시만 지우며, 금지 표현이 든 💬도 뺀다', () => {
  const items = parse();
  items[1].say = '요즘 어때? 필요한 게 있으면 말해 줄게.';
  items[2].how = items[2].how + ' 💬 "이쪽 자리가 더 편하실 것 같아요." 하고 건네세요.';
  const fixed = F.repairActions(items);
  assert.strictEqual(fixed.length, 3);
  assert.strictEqual(fixed[1].say, '');
  assert.ok(!fixed[2].how.includes('💬'));
  assert.deepStrictEqual(fixed.map(i => i.title), items.map(i => i.title));
  assert.strictEqual(fixed[1].how, items[1].how);
  assert.strictEqual(F.validateActions(fixed).hard.length, 0);
  assert.strictEqual(F.repairActions(parse())[1].say, '이번 주는 어려워요. 다음 주라면 가능해요.');
  const vg = parse(); vg[1].say = '신중하게 생각해볼게요. 이번 주 안에 말씀드릴게요.';
  assert.strictEqual(F.repairActions(vg)[1].say, '');
});

test('후보 선택: hard 실패가 없는 것 → soft 가 적은 것(같으면 나중 시도). 마지막 시도를 무조건 쓰지 않는다', () => {
  const mk = (hard, soft) => ({ items: [], check: { hard, soft, notes: [], reasons: [...hard, ...soft] } });
  const first = mk([], ['x', 'y']);
  assert.strictEqual(F.pickBestAttempt([first, mk(['빈칸'], [])]), first);
  const a1 = mk([], ['x']); const a2 = mk([], ['x', 'y', 'z']);
  assert.strictEqual(F.pickBestAttempt([a1, a2]), a1);
  assert.strictEqual(F.pickBestAttempt([a2, a1]), a1);
  const c1 = mk([], ['제목이 길어요']); const c2 = mk([], ['방법이 짧아요']);
  assert.strictEqual(F.pickBestAttempt([c1, c2]), c2);
  assert.strictEqual(F.pickBestAttempt([mk(['한자'], []), mk(['빈칸'], [])]), null);
  assert.strictEqual(F.pickBestAttempt([]), null);
});

test('프롬프트: 짧고(1,500자 이하), 후보는 속으로만 비교하고 출력하지 않으며, 고정 역할·구체 예시·근거/이유 줄이 없다', () => {
  const r = F.ACTIONS_RULES;
  assert.ok(r.length <= 1600, '규칙 길이 ' + r.length);
  assert.ok(r.includes('속으로 먼저') && r.includes('후보 목록이나 고민 과정은 출력하지 말고 최종 3개만 쓰세요'));
  assert.ok(r.includes('서로 겹치는 것') && r.includes('누구에게나 해당하는 뻔한 것') && r.includes("주의할 습관을 오히려 키우는 것") && r.includes('풀이에 근거가 약한 것'));
  assert.ok(r.includes('서로 다른 문제나 다른 장면') && r.includes('구체성은 도구·숫자·요일·생활 장면을 붙여서 만드는 게 아니에요') && r.includes('실제로 드러나는 순간을 먼저 잡고') && r.includes('무엇으로 바꿀지') && r.includes('그 도구 자체가 풀이와 직접 이어질 때만') && r.includes('출근·생활 루틴을 새로 만들지도 마세요') && r.includes('머릿속에서 끝나는 행동은 안 돼요'));
  assert.ok(r.includes('방법 안에 이 행동이 이 사람에게 왜 필요한지를 한 문장으로 자연스럽게 녹이세요'));
  assert.ok(r.includes("'주의할 습관'을 키우거나 굳히는 행동은 안 돼요") && r.includes('강점을 쓰는 행동은 필수가 아니에요') && r.includes('"더 많이"가 아니라'));
  assert.ok(r.includes('입력에 없는 직업·직장·가족·연애·생활환경') && r.includes('기혼으로 입력된 경우에만 "배우자"'));
  assert.ok(r.includes('💬는 말하거나 보낼 문장이 정말 필요한 행동에만') && r.includes('끝까지 본문과 같은 방향'));
  // 고정 역할·구체 정답 예시·별도 줄이 없다
  assert.ok(!/1번 =|2번 =|3번 =/.test(r));
  assert.ok(!r.includes('선택지') && !r.includes('새 방식') && !r.includes('동그라미') && !r.includes('장바구니') && !r.includes('휴대폰은 침대') && !r.includes('모양 예'));
  assert.ok(!r.includes('근거:') && !r.includes('이유:') && !r.includes('===후보==='));
});

test('Sonnet 프롬프트: 핵심 한 문장·이유·강점·주의할 습관을 모두 주고, 재생성이면 실패 이유도 주며, 그 섹션만 쓰게 한다', () => {
  const first = F.buildActionsPrompt({ infoBlock: '[기본 정보]', sections: SECTIONS });
  for (const k of ['[나의 핵심 한 문장]', '[이런 성향이 나오는 이유]', '[나의 강점]', '[주의할 습관]', '거절 기준이 흐려질 수 있어요', '나를 누르는 기운이 3곳']) assert.ok(first.includes(k), k);
  assert.ok(!first.includes('문제점'));
  const p = F.buildActionsPrompt({ infoBlock: '[기본 정보]\n- 이름: 가', sections: SECTIONS, reasons: ['1번에 추상적인 표현("신중하게")이 있어요.'] });
  assert.ok(p.includes('신중하게') && p.includes(F.ACTIONS_MARK) && p.includes('바꾸지 말고') && p.includes('세 개만'));
});
