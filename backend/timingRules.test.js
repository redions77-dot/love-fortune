// 시기 판단 공통 기준(timingRules.js)이 전체 분석·심화 프롬프트에 연결돼 있는지 확인한다. AI 호출·DB 없음.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { TIMING_RULES, DEEP_BIG_DECISION_LINE, PAID_CAUTION_HEADING } = require('./timingRules');

const server = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

test('공통 기준: 서버 계산 대운 연도만 쓰고, 상반된 권고만 막고, 단정 표현을 줄이게 한다', () => {
  assert.ok(TIMING_RULES.includes('[대운 정보]') && TIMING_RULES.includes('새 구간을 만들지 마세요'));
  assert.ok(TIMING_RULES.includes('같은 결정(같은 종류·같은 행동·같은 시기)에 대해서만 정반대로 권하지 마세요'));
  assert.ok(/"절대", "반드시", "무조건", "어떤 이유로도"/.test(TIMING_RULES));
  assert.ok(!/\d{4}년/.test(TIMING_RULES), '연도를 하드코딩하지 않는다');
});

test('정상적인 설명을 막지 않는다: 유리함과 신중히 검토는 함께 쓸 수 있고, 연도 겹침·N+1년 규칙은 없다', () => {
  assert.ok(TIMING_RULES.includes('"유리한 시기"와 "신중하게 검토할 시기"는 함께 쓸 수 있어요'));
  assert.ok(TIMING_RULES.includes('이 시기가 유리하지만 신중히 검토하세요'));
  assert.ok(!TIMING_RULES.includes('N년 다음 해부터') && !DEEP_BIG_DECISION_LINE.includes('M은 반드시 N보다'));
  assert.ok(!DEEP_BIG_DECISION_LINE.includes('겹치면 안 됩니다'));
  assert.ok(DEEP_BIG_DECISION_LINE.includes('함께 쓸 수는 있지만') && DEEP_BIG_DECISION_LINE.includes('같은 종류의 결정을 같은 시기에 하지 말라고 하면서'));
  assert.ok(!/\d{4}/.test(DEEP_BIG_DECISION_LINE));
});

test('서버 프롬프트 연결: 전체 분석·심화 모두 공통 기준을 넣고, 예전의 단정 소제목·자유 형식 문장은 없다', () => {
  assert.strictEqual(server.split('${TIMING_RULES}').length - 1, 2);                 // paidOnlyPrompt + deepPrompt
  assert.ok(server.includes('${DEEP_BIG_DECISION_LINE}') && server.includes('${PAID_CAUTION_HEADING}'));
  assert.ok(!server.includes('절대 큰 결정 내리면 안 되는 시기'));
  assert.ok(!server.includes('몇 년까지 신중해야 하고 몇 년 이후에 풀리는지'));
  assert.strictEqual(PAID_CAUTION_HEADING, '⚠️ 큰 결정은 신중하게 볼 시기');
  // 대운 연도 계산·표기 규칙은 그대로(서버가 계산한 값을 계속 쓴다)
  assert.ok(server.includes('[대운 표기 규칙 — 반드시 지킬 것]') && server.includes('${daeunBlock}'));
  // 심화 표(프런트)가 읽는 소제목 형식은 바뀌지 않았다
  for (const keep of ['절대 조심해야 할 달', '적극적으로 움직여야 할 달', '📌 지금 당장 시작해야 할 것', '🔑 지금부터 준비할 것']) assert.ok(server.includes(keep), keep);
});

test('프런트 판단 기준과 같은 구분이 규칙에 들어 있다: 가능성 설명 vs 행동 권고, 같은 결정만, 조건 명시, 미루라/미루지 말라 동시 금지', () => {
  assert.ok(TIMING_RULES.includes('가능성이나 흐름을 설명하는 말과') && TIMING_RULES.includes('행동을 권하는 말은 구분'));
  assert.ok(TIMING_RULES.includes('같은 종류·같은 행동·같은 시기'));
  assert.ok(TIMING_RULES.includes('"미루세요"라고 하면서 "미루지 마세요') );
  assert.ok(TIMING_RULES.includes('작은 결정과 큰 결정') && TIMING_RULES.includes('제안을 받아들이는 일'));
  assert.ok(TIMING_RULES.includes('조건이 다르면 그 조건을 문장에 밝히세요'));
  // 연도를 겹치지 못하게 하는 규칙은 없다
  assert.ok(!/겹치(?:지 않|면 안)/.test(TIMING_RULES) && !/N\+1|다음 해부터/.test(TIMING_RULES));
});

test('저장된 고객 결과·DB·결제는 건드리지 않는다(이 모듈은 프롬프트 문자열만 만든다)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'timingRules.js'), 'utf8').replace(/\/\/.*$/gm, '');
  assert.ok(!/require\(|pool|query|UPDATE|INSERT|fetch\(/i.test(src));
});
