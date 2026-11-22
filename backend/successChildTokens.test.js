const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSuccessChildFacts } = require('./successChild');
const { PERIOD_ROWS, expandTokens, tokenValue, wealthSentence, godsOfRow, rowOf } = require('./successChildTokens');

const now = new Date('2026-11-12T12:00:00+09:00');
const factsA = buildSuccessChildFacts({ gender: '남성', solarDate: '2012-07-14', birthtime: '20:30', now });

test('토큰: 대운 번호별 연도·나이·간지·천간·십성은 서버 계산값 그대로', () => {
  const v = (n) => tokenValue(factsA, n);
  assert.equal(v('대운1'), '2020~2029년(8~17세)');
  assert.equal(v('대운3'), '2040~2049년(28~37세)');
  assert.equal(v('대운3.연도'), '2040~2049년');
  assert.equal(v('대운3.나이'), '28~37세');
  assert.equal(v('대운3.간지'), '庚戌');
  assert.equal(v('대운3.천간'), '庚');
  assert.equal(v('대운3.천간십성'), '편재');
  assert.equal(v('대운3.지지십성'), '식신');
  assert.equal(v('대운4.천간십성'), '정재');
  assert.equal(v('대운1.지지십성'), '편재');   // 申 본기 庚
  assert.equal(v('현재나이'), '만 14세');
  assert.equal(v('현재학령'), '중학교 2학년');
});

test('토큰: 모르는 이름·범위 밖 번호는 바꾸지 않고 unknown 으로 돌려준다', () => {
  for (const n of ['대운0', `대운${PERIOD_ROWS + 1}`, '대운9', '대운3.없는필드', '아무거나', '대운3.']) assert.equal(tokenValue(factsA, n), null, n);
  const r = expandTokens('앞 {대운9} 뒤 {foo} {대운1.연도}', factsA);
  assert.equal(r.text, '앞 {대운9} 뒤 {foo} 2020~2029년');
  assert.deepEqual(r.unknown, ['대운9', 'foo']);
});

test('{재성대운}: 대운 천간의 재성을 계산 범위와 함께 밝힌 확정 문장 (재성이 없으면 없다고 사실대로)', () => {
  assert.equal(wealthSentence(factsA), '10년 단위로 바뀌는 운(대운)은 6개(8~67세)입니다. 그중 겉으로 드러난 운에서 돈과 거래의 운이 들어오는 시기는 다음과 같습니다. 2040~2049년(28~37세)은 움직이는 돈의 흐름입니다. 2050~2059년(38~47세)은 쌓이는 돈의 흐름입니다.');
  // 대운 천간에 재성이 없는 아이
  let none = null;
  for (let y = 2005; y <= 2021 && !none; y++) for (const g of ['남성', '여성']) {
    const f = buildSuccessChildFacts({ gender: g, solarDate: `${y}-05-20`, birthtime: '', now });
    if (!f.rows.slice(0, PERIOD_ROWS).some((r) => ['편재', '정재'].includes(r.stemGod))) { none = f; break; }
  }
  assert.ok(none);
  assert.match(wealthSentence(none), /^10년 단위로 바뀌는 운\(대운\)은 6개\(\d+~\d+세\)입니다\. 그중 겉으로 드러난 운에는 돈과 거래의 운이 나타나지 않습니다\.$/);
  // 재성이 첫 대운 하나에만 있는 아이(수정 전 검증의 3번 아이): 시기 하나만 나온다
  const c = buildSuccessChildFacts({ gender: '남성', solarDate: '2010-03-05', birthtime: '07:30', now });
  assert.equal(wealthSentence(c), '10년 단위로 바뀌는 운(대운)은 6개(0~59세)입니다. 그중 겉으로 드러난 운에서 돈과 거래의 운이 들어오는 시기는 2010~2019년(0~9세) 쌓이는 돈의 흐름입니다.');
});

test('대운별 십성 집합: 천간 하나, 지지(본기+지장간) 여러 개', () => {
  const g = godsOfRow(rowOf(factsA, 3));   // 庚戌: 천간 편재, 지지 본기 식신, 지장간 정재·겁재·식신
  assert.equal(g.stem, '편재');
  assert.deepEqual([...g.branch].sort(), ['겁재', '식신', '정재']);
  assert.ok(g.all.has('편재') && g.all.has('정재'));
  assert.equal(rowOf(factsA, 0), null);
  assert.equal(rowOf(factsA, PERIOD_ROWS + 1), null);
});

test('여러 아이에게서 같은 토큰이 각자의 계산값으로 바뀐다 (수정 전 오류의 근본 원인 차단)', () => {
  const kids = [['남성', '2012-07-14', '20:30'], ['여성', '2015-12-31', '23:40'], ['남성', '2010-03-05', '07:30'], ['여성', '2008-09-23', '']];
  const seen = new Set();
  for (const [g, d, tm] of kids) {
    const f = buildSuccessChildFacts({ gender: g, solarDate: d, birthtime: tm, now });
    for (let k = 1; k <= PERIOD_ROWS; k++) {
      const r = rowOf(f, k);
      assert.equal(tokenValue(f, `대운${k}`), `${r.startYear}~${r.endYear}년(${r.ageFrom}~${r.ageTo}세)`);
      assert.equal(tokenValue(f, `대운${k}.천간십성`), r.stemGod);
      assert.equal(tokenValue(f, `대운${k}.지지십성`), r.branchMainGod);
    }
    seen.add(tokenValue(f, '대운1'));
  }
  assert.equal(seen.size, 4, '아이마다 값이 다르다');
});
