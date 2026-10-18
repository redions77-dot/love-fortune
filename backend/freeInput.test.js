const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFreeAnalysisBody } = require('./freeInput');

const base = { birthdate: '1990-05-15', gender: '남', type: '기본' };

test('정상 요청은 그대로 통과하고 알 수 없는 필드는 버린다', () => {
  const r = parseFreeAnalysisBody({ ...base, isLunar: true, userName: '민수', evil: { a: 1 } });
  assert.equal(r.ok, true);
  assert.equal(r.value.birthdate, '1990-05-15');
  assert.equal(r.value.isLunar, true);
  assert.equal('evil' in r.value, false);
});
test('문자열이어야 하는 필드에 숫자·객체·배열·불린이 오면 400', () => {
  for (const bad of [123, {}, [], true, ['x']]) {
    for (const key of ['previousText', 'birthdate', 'birthtime', 'userName', 'type', 'gender']) {
      const r = parseFreeAnalysisBody({ ...base, [key]: bad });
      assert.equal(r.ok, false, `${key}=${JSON.stringify(bad)}`);
      assert.equal(r.status, 400);
    }
  }
});
test('null·누락은 없는 값으로 취급한다(기존 동작 유지)', () => {
  const r = parseFreeAnalysisBody({ ...base, previousText: null, mbti: undefined });
  assert.equal(r.ok, true);
  assert.equal('previousText' in r.value, false);
});
test('본문이 객체가 아니면 400', () => {
  for (const bad of [null, undefined, [], 'x', 5]) assert.equal(parseFreeAnalysisBody(bad).ok, false);
});
test('isLunar 는 불린으로 정규화한다', () => {
  assert.equal(parseFreeAnalysisBody({ ...base, isLunar: 'true' }).value.isLunar, true);
  assert.equal(parseFreeAnalysisBody({ ...base, isLunar: 'false' }).value.isLunar, false);
});
