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

test('F: 날짜·시각 형식 검증 — 없는 날짜·잘못된 시각은 400, 정상·윤년·음력 30일은 통과', () => {
  const p = (o) => parseFreeAnalysisBody({ ...base, ...o });
  for (const bad of ['abc', '1990-5-5', '1990-02-30', '1999-02-29', '1990-04-31', '1899-01-01', '2999-01-01', '1990-13-01']) {
    assert.equal(p({ birthdate: bad }).ok, false, bad);
  }
  assert.equal(p({ birthdate: '2000-02-29' }).ok, true);
  assert.equal(p({ birthdate: '1990-02-30', isLunar: true }).ok, true);
  assert.equal(p({ birthtime: '24:00' }).ok, false);
  assert.equal(p({ birthtime: '12:60' }).ok, false);
  for (const good of ['0:00', '00:00', '12:00', '23:59', '']) assert.equal(p({ birthtime: good }).ok, true, good);
  assert.equal(p({ type: '궁합무료', partnerBirthdate: '1991-02-30' }).ok, false);
});
test('F: 긴 문자열은 최대 길이로 잘라서 쓴다', () => {
  const r = parseFreeAnalysisBody({ ...base, userName: 'a'.repeat(500), previousText: 'b'.repeat(50000) });
  assert.equal(r.value.userName.length, 30);
  assert.equal(r.value.previousText.length, 12000);
});
