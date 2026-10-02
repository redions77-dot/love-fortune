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
    assert.ok(p.includes("모든 문장은 해요체(~해요, ~이에요, ~예요)로 끝내세요. '~다', '~이다' 같은 평서체는 쓰지 마세요."), k);
    assert.ok(p.includes("[사주 계산값]과 각 항목의 '근거'에 없는 오행·음양·상생상극·합충은 새로 만들어 설명하지 마세요."), k);
    assert.ok(p.includes('짧은 1~2문장'), k);
    assert.ok(p.includes('호칭은 생략해도 자연스럽게') && p.includes('3인칭으로 부르며 말하지 말고') && !p.includes('너·당신'), k);   // 너·당신을 강제하지 않는다
  }
  assert.match(mk('형제가족'), /연락·부탁·모임·생활 분담 같은 가족 상황으로 설명하고, 업무·프로젝트·효율 같은 직장 표현은 쓰지 마세요/);
  assert.match(R.situationsFor(R.RELATIONS.형제가족, ''), /연락.*부탁.*가족 모임.*생활 분담|연락.*부탁.*모임.*생활비·돌봄/);
  assert.match(mk('직장동료'), /역할을 일방적으로 정해주는 말 대신, 역할을 함께 확인하고 정하는 말로 쓰세요/);
  assert.match(mk('직장동료'), /역할은 정해주지 않고 함께 확인하는 문장/);
});
