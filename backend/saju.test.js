const test = require('node:test');
const assert = require('node:assert');
const S = require('./saju');
const R = require('./relations');

const day = (b) => S.get일주(b);
const pillars = (b, t) => {
  const [y, m, d] = b.split('-').map(Number);
  const dd = day(b), yy = S.get년주(y);
  return { 년주: yy.간지, 월주: S.get월주(y, m, d, yy.천간index), 일주: dd.간지, 시주: S.get시주(t, dd.천간index) || '' };
};
const hanja = (s) => s.replace(/[가-힣]/g, '');

test('일주: 독립 공식(율리우스 일수)과 1950~2030년 표본이 모두 일치한다', () => {
  const 간 = '甲乙丙丁戊己庚辛壬癸', 지 = '子丑寅卯辰巳午未申酉戌亥';
  let n = 0;
  for (let t = Date.UTC(1950, 0, 1); t < Date.UTC(2030, 0, 1); t += 37 * 86400000) {
    const days = t / 86400000;
    const idx60 = (days + 2440577) % 60;                    // 2000-01-01(JDN 2451545) = 戊午(54)
    const expect = 간[idx60 % 10] + 지[idx60 % 12];
    const d = new Date(t).toISOString().slice(0, 10);
    assert.strictEqual(hanja(day(d).간지), expect, d);
    n++;
  }
  assert.ok(n > 700);
  // 널리 알려진 기준일
  assert.strictEqual(hanja(day('2000-01-01').간지), '戊午');
  assert.strictEqual(hanja(day('2024-01-01').간지), '甲子');
  assert.strictEqual(hanja(day('1949-10-01').간지), '甲子');
});

test('이번 개인 사례(1991-08-23 07:30)의 년·월·일·시주', () => {
  const p = pillars('1991-08-23', '07:30');
  assert.deepStrictEqual([hanja(p.년주), hanja(p.월주), hanja(p.일주), hanja(p.시주)], ['辛未', '丙申', '乙丑', '庚辰']);
});

test('시주는 시·분을 모두 반영한다 (30분 이동 기준, 경계 시각 포함)', () => {
  const g = day('1991-08-23').천간index;           // 乙일
  const h = (t) => hanja(S.get시주(t, g));
  assert.strictEqual(h('07:29'), '己卯');
  assert.strictEqual(h('07:30'), '庚辰');        // 이전에는 07:30~07:59 도 卯로 계산되었다
  assert.strictEqual(h('07:59'), '庚辰');
  assert.strictEqual(h('09:29'), '庚辰');
  assert.strictEqual(h('09:30'), '辛巳');
  assert.strictEqual(h('23:29'), hanja(S.get시주('22:00', g)));   // 亥
  assert.strictEqual(h('23:30'), '丙子');
  assert.strictEqual(h('00:00'), '丙子');
  assert.strictEqual(h('01:29'), '丙子');
  assert.strictEqual(h('01:30'), '丁丑');
  // 12개 시 모두: 구간 시작 시각마다 지지가 순서대로 바뀐다
  const starts = ['23:30', '01:30', '03:30', '05:30', '07:30', '09:30', '11:30', '13:30', '15:30', '17:30', '19:30', '21:30'];
  assert.deepStrictEqual(starts.map(t => hanja(S.get시주(t, g)).slice(1)), [...'子丑寅卯辰巳午未申酉戌亥']);
});

test('시간이 비었거나 형식이 잘못되면 시주를 계산하지 않는다 (엉뚱한 값을 만들지 않는다)', () => {
  for (const t of ['', undefined, null, '25:00', '12:75', 'abc', '7시']) assert.strictEqual(S.get시주(t, 0), null, String(t));
});

test('일간별 시간 천간 (甲己일 子시=甲子, 乙庚=丙子, 丙辛=戊子, 丁壬=庚子, 戊癸=壬子)', () => {
  const zi = (g) => hanja(S.get시주('00:00', g));
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(zi), ['甲子', '丙子', '戊子', '庚子', '壬子', '甲子', '丙子', '戊子', '庚子', '壬子']);
});

test('AI 전달용 계산값 표: 오행·음양·분포·일간 기준 관계가 대응표와 일치', () => {
  const t = S.factsBlock(pillars('1991-08-23', '07:30'));
  assert.match(t, /년주 辛未: 윗글자 辛\(쇠 기운, 음\) \/ 아랫글자 未\(흙 기운, 음\)/);   // 未는 음 (이전 AI 설명은 '양의 흙'이라 오류)
  assert.match(t, /월주 丙申: 윗글자 丙\(불 기운, 양\) \/ 아랫글자 申\(쇠 기운, 양\)/);
  assert.match(t, /일간\(나를 대표하는 글자\): 乙 = 나무 기운, 음/);
  assert.match(t, /오행 분포\(8글자\): 나무 1 · 불 1 · 흙 3 · 쇠 3 · 물 0/);
  assert.match(t, /월주 윗글자 丙=내가 키워주는 기운/);            // 나무(乙)가 불(丙)을 키운다
  assert.match(t, /월주 아랫글자 申=나를 누르는 기운/);            // 쇠가 나무를 누른다
  assert.ok(!/상극 관계라/.test(t));
});

test('출생 시간이 없으면 시주 항목을 만들지 않고 6글자로 계산한다', () => {
  const t = S.factsBlock(pillars('1991-08-23', ''));
  assert.match(t, /시주: 출생 시간 미입력/);
  assert.match(t, /오행 분포\(6글자\)/);
});

test('두 사람 관계의 항목별 근거가 계산값과 대응표로 만들어진다', () => {
  const a = pillars('1995-06-12', '14:20'), b = pillars('1984-09-30', '');
  const basis = R.calcRelationBasis(a, b);
  assert.strictEqual(basis.length, 3);
  assert.match(basis[0], /甲.*丁.*나무 기운이 불 기운을 키워주는 관계\(상생\)/);
  assert.match(basis[1], /戌.*卯.*육합/);
  assert.match(basis[2], /午.*酉.*불 기운이 쇠 기운을 누르는 관계\(상극\)/);
  const bars = R.buildBars('직장동료', R.calcRelationLevels(a, b), basis);
  assert.deepStrictEqual(bars.map(x => x.level), ['high', 'high', 'low']);       // 수준과 근거가 같은 계산에서 나온다
  const p = R.buildFreeGunghabPrompt({ relKey: '직장동료', role: '', nameA: '가', nameB: '나', my: { ...a, gender: '여성' }, partner: { ...b, gender: '남성' }, ages: { a: '30대', b: '40대' }, bars });
  assert.ok(p.includes('근거(서버 계산): ' + basis[0]) && p.includes('[사주 계산값') && p.includes('출생 시간 미입력'));
});

test('프롬프트: 해요체 통일·계산값 밖 해석 금지·가족/직장 표현 규칙', () => {
  const a = pillars('1988-11-04', ''), b = pillars('1993-02-17', '');
  const mk = (k) => R.buildFreeGunghabPrompt({ relKey: k, role: '', nameA: '가', nameB: '나', my: { ...a, gender: '남성' }, partner: { ...b, gender: '여성' }, ages: { a: '30대', b: '30대' }, bars: R.buildBars(k, ['mid', 'mid', 'mid'], ['x', 'y', 'z']) });
  for (const k of ['연인', '부부', '형제가족', '친구', '직장동료']) {
    const p = mk(k);
    assert.ok(p.includes("'~합니다', '~습니다', '~입니다', '~맞춥니다' 같은 합쇼체도 쓰지 마세요.") && p.includes('모든 문장은 해요체'), k);
    assert.ok(p.includes("[사주 계산값]과 각 항목의 '근거'에 없는 오행·음양·상생상극·합충은 새로 만들어 설명하지 마세요."), k);
    assert.ok(p.includes('짧은 1~2문장'), k);
    assert.ok(p.includes('호칭은 생략해도 자연스럽게') && p.includes('3인칭으로 부르며 말하지 말고') && !p.includes('너·당신'), k);   // 너·당신을 강제하지 않는다
  }
  assert.match(mk('형제가족'), /연락·부탁·모임·생활 분담 같은 가족 상황으로 설명하고, 업무·프로젝트·효율 같은 직장 표현은 쓰지 마세요/);
  assert.match(R.situationsFor(R.RELATIONS.형제가족, ''), /연락.*부탁.*가족 모임.*생활 분담|연락.*부탁.*모임.*생활비·돌봄/);
  assert.match(mk('직장동료'), /역할을 일방적으로 정해주는 말 대신, 역할을 함께 확인하고 정하는 말로 쓰세요/);
  assert.match(mk('직장동료'), /역할은 정해주지 않고 함께 확인하는 문장/);
});

test('성격·행동 단정 금지와 오행 임의 인과 금지 규칙이 개인 풀이·관계 풀이 프롬프트 모두에 있다', () => {
  const a = pillars('1988-11-04', ''), b = pillars('1993-02-17', '');
  const rel = R.buildFreeGunghabPrompt({ relKey: '형제가족', role: '', nameA: '가', nameB: '나', my: { ...a, gender: '남성' }, partner: { ...b, gender: '여성' }, ages: { a: '30대', b: '30대' }, bars: R.buildBars('형제가족', ['mid', 'mid', 'mid'], ['x', 'y', 'z']) });
  const rule = S.규칙문;
  for (const text of [rule, rel]) {
    assert.ok(/차분하다, 내향적이다, 활동적이다, 행동력이 좋다/.test(text));
    assert.ok(text.includes('쇠가 흙을 일군다'));
    assert.ok(text.includes('뒷받침되지 않'));
  }
  assert.ok(rule.includes("'일간 기준 다른 글자의 기운'과 항목별 '근거'에 적힌 것만"));
  assert.ok(rule.includes('입력한 MBTI 등은 사주 계산값과 충돌하거나 근거가 약하면 언급하지 않아도 돼요'));
  assert.ok(rel.includes("조율할 점의 핵심 단어를 포함") && rel.includes("'그런 뜻이 아니었는데', '미안해', '그렇게 들렸다면' 같은 해명·사과 금지"));
});

test('내 사주 무료 프롬프트: 쉬운 첫 문장, 이유는 근거 1~2개, MBTI 억지 반영 없음, 합쇼체 금지', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, 'server.js'), 'utf8');
  const free = src.slice(src.indexOf('const basePrompt'), src.indexOf('const paidOnlyPrompt'));
  const must = [
    '첫 줄: 오행·기운·일간 같은 전문용어 없이, 쉬운 생활 언어로 핵심 특징을',
    '사주 근거는 여기에 붙이지 마세요',
    '(150~300자) 위 [사주 계산값]에서 가장 뚜렷한 근거 1~2개만 골라',
    "'~합니다', '~습니다', '~입니다', '~맞춥니다' 같은 합쇼체도 쓰지 마세요",
    '입력한 MBTI는 사주 계산값과 충돌하거나 근거가 약하면 언급하지 않아도 돼요',
    '뒷받침되지 않는 성격·행동',
  ];
  for (const m of must) assert.ok(free.includes(m), m);
  // MBTI 교차 분석을 강제하는 공통 규칙 16번은 무료 프롬프트의 선별 규칙에서 빠진다
  assert.ok(src.includes('|10-2|12|17|18)') && !src.includes('|12|16|17|18)'));
});

test('서버 확정 오행 사실: 개수·위치·일간 관계가 독립 계산과 일치한다 (AI가 다시 세지 않는다)', () => {
  const 간 = '甲乙丙丁戊己庚辛壬癸', 지 = '子丑寅卯辰巳午未申酉戌亥';
  const 오행간 = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'], 오행지 = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];
  const 생 = (a, b) => ['목화', '화토', '토금', '금수', '수목'].includes(a + b), 극 = (a, b) => ['목토', '토수', '수화', '화금', '금목'].includes(a + b);
  let checked = 0;
  for (let t = Date.UTC(1950, 0, 1); t < Date.UTC(2030, 0, 1); t += 53 * 86400000) {
    const d = new Date(t).toISOString().slice(0, 10);
    for (const time of ['', '07:30', '22:10']) {
      const p = pillars(d, time);
      const f = S.elementFacts(p);
      const chars = [];
      for (const k of ['년주', '월주', '일주', '시주']) if (p[k]) { const h = hanja(p[k]); chars.push(h[0], h[1]); }
      const cnt = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
      chars.forEach((c, i) => { cnt[i % 2 === 0 ? 오행간[간.indexOf(c)] : 오행지[지.indexOf(c)]]++; });
      assert.deepStrictEqual(f.counts, cnt, d + time);
      const X = 오행간[간.indexOf(hanja(p.일주)[0])];
      assert.strictEqual(f.dayElement, X);
      const total = Object.values(f.groups).reduce((s, a) => s + a.length, 0);
      assert.strictEqual(total, chars.length - 1, '일간 자신 제외 ' + d);
      for (const [name, arr] of Object.entries(f.groups)) for (const x of arr) {
        const e = x.element;
        if (name === '나를 누르는 기운') assert.ok(극(e, X));
        else if (name === '내가 다루는 기운') assert.ok(극(X, e));
        else if (name === '나를 도와주는 기운') assert.ok(생(e, X));
        else if (name.startsWith('내가 키워주는 기운')) assert.ok(생(X, e));
        else if (name === '나와 같은 기운') assert.strictEqual(e, X);
        else assert.fail('알 수 없는 관계 ' + name);
        assert.ok(!x.where.startsWith('일주 윗글자'), '일간 자신이 다른 글자로 세어짐');
      }
      checked++;
    }
  }
  assert.ok(checked > 400);
});

test('이번 실제 오류 사례(1991-08-23 07:30)의 서버 확정값: 쇠 3곳·흙 3곳, 일주 윗글자 乙은 쇠가 아니다', () => {
  const f = S.elementFacts(pillars('1991-08-23', '07:30'));
  assert.deepStrictEqual(f.counts, { 목: 1, 화: 1, 토: 3, 금: 3, 수: 0 });
  assert.deepStrictEqual(f.positions.금, ['년주 윗글자 辛', '월주 아랫글자 申', '시주 윗글자 庚']);
  assert.deepStrictEqual(f.groups['나를 누르는 기운'].map(x => x.where), ['년주 윗글자 辛', '월주 아랫글자 申', '시주 윗글자 庚']);
  assert.ok(!f.positions.금.some(w => w.startsWith('일주')));
  assert.deepStrictEqual(f.standard, ['물 기운은 나무 기운을 도와주는 관계(상생)', '나무 기운은 불 기운을 키워주는 관계(상생)', '나무 기운은 흙 기운을 다루는 관계(상극)', '쇠 기운은 나무 기운을 누르는 관계(상극)']);
  const block = S.factsBlock(pillars('1991-08-23', '07:30'));
  assert.ok(block.includes('쇠 3곳(년주 윗글자 辛, 월주 아랫글자 申, 시주 윗글자 庚)') && block.includes('흙 3곳') && block.includes('나를 누르는 기운 3곳'));
  assert.ok(block.includes('이 4가지 외의 오행 관계는 설명 금지'));
  assert.ok(S.규칙문.includes('[역할 분리]') && S.규칙문.includes('다시 세거나 오행 관계를 판단·계산하지 말고') && S.규칙문.includes('토양'));
});

test('내 사주 무료 프롬프트: 강점·주의할 습관만 분량을 늘렸고(2~3문단), 새 이론 금지·역할 분리·나머지 분량은 그대로다', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, 'server.js'), 'utf8');
  const free = src.slice(src.indexOf('const basePrompt'), src.indexOf('const paidOnlyPrompt'));
  // 강점·주의: 200~330자, 2~3문단, 문단 사이 빈 줄, 새로운 사주 이론·계산값 밖 근거 금지
  assert.strictEqual((free.match(/\(200~330자, 2~3문단\)/g) || []).length, 2);
  assert.ok(free.includes('나의 강점·주의할 습관은 2~3개 문단으로 나누어 쓰고 문단 사이는 빈 줄로 구분하세요'));
  assert.strictEqual((free.match(/\[사주 계산값\]에 없는 근거나 새로운 사주 이론은 더하지 마세요/g) || []).length, 2);
  assert.ok(free.includes('관계·일에서 나타날 수 있는 모습') && free.includes('이 성향이 지나칠 때 피곤해지거나 어려움이 생길 수 있는 상황'));
  // 기존 역할 분리 규칙은 유지: 강점에는 강점만, 주의에는 주의점만, 행동은 팁에만
  assert.ok(free.includes('강점만 쓰세요') && free.includes('주의점만 쓰세요') && free.includes("행동 권유는 아래 '바로 실천할 팁'에만 쓰세요"));
  // 다른 섹션 분량은 그대로
  assert.ok(free.includes('(150~300자) 위 [사주 계산값]에서 가장 뚜렷한 근거 1~2개만 골라') && free.includes('(짧은 1~2문장)'));
  assert.ok(!/\(100~200자\)/.test(free));
  // 분량이 늘어도 끊기지 않도록 출력 한도를 늘렸다 (무료 사주 호출만)
  assert.ok(src.includes('streamToClient(res, basePrompt, MODEL_FREE, 3600)'));
  assert.ok(src.includes('streamToClient(res, childBasePrompt, MODEL_FREE, 2500)') && src.includes('streamToClient(res, nohuBasePrompt, MODEL_FREE, 2500)'));
});
