// 심화 분석: 연운·수비학 기준 연도를 '내년'로 맞춘 것을 AI 호출 없이 확인한다.
// server.js 의 심화 프롬프트 템플릿을 소스에서 꺼내 가짜 값으로 렌더링해, 실제로 AI에 보낼 문장을 검사한다.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { numerologyYear, deepYearContext } = require('./deepYear');

const src = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8').replace(/\r\n/g, '\n');
const START = src.indexOf("if (type === '심화') {");
const END = src.indexOf('// ── 무료 프롬프트');
const deepBlock = src.slice(START, END);

function renderDeepPrompt(thisYear) {
  const m = deepBlock.match(/const deepPrompt = `([\s\S]*?)`;\n/);
  assert.ok(m, '심화 프롬프트 템플릿을 찾지 못했어요');
  const vars = {
    thisYear, deepYear: deepYearContext(thisYear), infoBlock: '[기본 정보]', 공통규칙: '', 일관성블록: '',
    currentStartYear: 2022, currentEndYear: 2031, nextStartYear: 2032, nextEndYear: 2041, nextNextStartYear: 2042, nextNextEndYear: 2051,
    currentDaeun: { 간지: '辛巳' }, nextDaeun: { 간지: '壬午' },
  };
  const scope = new Proxy(vars, { has: (t, k) => typeof k !== 'symbol', get: (t, k) => (k in t ? t[k] : '') });
  return new Function('scope', 'with (scope) { return `' + m[1] + '` }')(scope);
}

test('수비학 연도수: 각 자리를 더해 한 자리가 될 때까지 줄이고 계산 과정을 보여준다', () => {
  assert.deepStrictEqual(numerologyYear(2026), { num: 1, formula: '2+0+2+6 = 10 → 1+0 = 1' });
  assert.deepStrictEqual(numerologyYear(2027), { num: 2, formula: '2+0+2+7 = 11 → 1+1 = 2' });
  assert.deepStrictEqual(numerologyYear(2029), { num: 4, formula: '2+0+2+9 = 13 → 1+3 = 4' });
});

test('심화 기준 연도는 현재 연도의 다음 해다 (2026년 → 2027년)', () => {
  assert.strictEqual(deepYearContext(2026).year, 2027);
  assert.strictEqual(deepYearContext(2026).num, 2);
  assert.strictEqual(deepYearContext(2027).year, 2028);   // 내년 기준이므로 해가 바뀌면 같이 넘어간다(年運 섹션과 같은 규칙)
});

test('심화 프롬프트(현재 2026년): 수비학·궁합·年運이 모두 2027년 기준이고, 2026년 풀이 문구는 남아 있지 않다', () => {
  const p = renderDeepPrompt(2026);
  assert.ok(p.includes('내년 수: 2+0+2+7 = 11 → 1+1 = 2 → 2027년은 2의 해'));
  assert.ok(p.includes('📌 내년(2027년, 2의 해)과의 궁합') && p.includes('내년이 새로운 시작인지'));
  assert.ok(p.includes('===年運 · 2027년 흐름===') && p.includes('📌 2027년 총평') && p.includes('🔑 2027년 핵심 조언 한 문장'));
  assert.ok(p.includes('2027년을 맞이하기 위해'));
  for (const old of ['올해 수:', '올해(2026년', '2026년은 1의 해', '2+0+2+6', '年運 · 2026']) assert.ok(!p.includes(old), old);
});

test('현재 날짜·대운 등 다른 연도는 그대로다: 현재 연도, 대운 연도 표기는 바뀌지 않는다', () => {
  const p = renderDeepPrompt(2026);
  assert.ok(p.includes('현재는 2026년입니다.'));                 // 현재 날짜는 올해 그대로
  assert.ok(p.includes('현재 대운(2022~2031년)'));               // 대운 연도는 계산된 값을 그대로 사용
  assert.ok(p.includes('다음 대운 (2032~2041년)') && p.includes('그 다음 대운 (2042~2051년)'));
  assert.ok(!/\$\{thisYear \+ 1\}/.test(deepBlock));              // 심화 블록은 deepYear 로 통일됐다
});

test('수정 범위: 심화 프롬프트만 바뀌고 다른 상품 프롬프트의 현재 연도 표기는 그대로다', () => {
  assert.ok(src.includes("const { deepYearContext } = require('./deepYear');"));
  const outside = src.slice(0, START) + src.slice(END);
  assert.ok(outside.includes('현재는 2026년입니다.'));            // 자녀·노후·100년·길일·무료 프롬프트는 건드리지 않았다
  assert.ok(!renderDeepPrompt(2026).includes('올해'));            // AI에 보내는 심화 프롬프트에는 '올해' 기준 표현이 없다(소스 주석 제외)
});
