const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const S = require('./saju');
const T = require('./solarTerms');
const J = require('./jijanggan');
const { calcChildSaju } = require('./childCalc');

const calc = (birthdate, birthtime, gender = '남성') => calcChildSaju({ gender, birthdate, birthtime });
const P = (birthdate, birthtime, gender) => calc(birthdate, birthtime, gender).pillars;

// ── 공개된 절입 시각(KST). KASI 달력자료 2024 + month2k(한국표준시) 2012·2005. 2026-11-12 확인.
const REF = {
  2024: '1/6 5:49,2/4 17:27,3/5 11:23,4/4 16:02,5/5 9:10,6/5 13:10,7/6 23:20,8/7 9:09,9/7 12:11,10/8 4:00,11/7 7:20,12/7 0:17',
  2012: '1/6 7:44,2/4 19:22,3/5 13:21,4/4 18:05,5/5 11:20,6/5 15:26,7/7 1:41,8/7 11:30,9/7 14:29,10/8 6:12,11/7 9:26,12/7 2:19',
  2005: '1/5 15:03,2/4 2:43,3/5 20:45,4/5 1:34,5/5 18:53,6/5 23:02,7/7 9:17,8/7 19:03,9/7 21:57,10/8 13:33,11/7 16:42,12/7 9:33',
};

test('절입 시각: 공개 기준값 36개와 최대 12분 이내로 일치한다', () => {
  let n = 0, worst = 0;
  for (const [y, s] of Object.entries(REF)) {
    const jie = T.jieOfYear(Number(y));
    s.split(',').forEach((t, i) => {
      const [md, hm] = t.split(' ');
      const [m, d] = md.split('/').map(Number), [h, mi] = hm.split(':').map(Number);
      const diff = Math.abs(jie[i].ms - T.kstToMs(Number(y), m, d, h, mi)) / 60000;
      worst = Math.max(worst, diff); n++;
      assert.ok(diff <= 12, `${y} ${jie[i].name} 오차 ${diff.toFixed(1)}분`);
    });
  }
  assert.strictEqual(n, 36);
  assert.ok(worst > 0);
});

test('지장간표: 구조 검증(정기 1개·마지막, 30일 합계, 정기 오행 = 지지 오행)', () => {
  for (const b of J.BRANCHES) {
    const rows = J.hiddenStems(b);
    assert.strictEqual(rows.filter((r) => r.role === '정기').length, 1, b);
    assert.strictEqual(rows[rows.length - 1].role, '정기', b);
    assert.strictEqual(rows.reduce((a, r) => a + r.days, 0), 30, b);
    assert.strictEqual(J.ELEMENT[J.mainStem(b)], { 수: '수', 토: '토', 목: '목', 화: '화', 금: '금' }[S.지오행[b]], b + ' 정기 오행이 지지 오행과 다름');
  }
  assert.match(J.HIDDEN_STEM_TABLES[J.DEFAULT_TABLE].status, /검수 전/);
});

test('십성: 일간 甲 기준 10천간 전체 + 모든 일간에서 10십성이 정확히 한 번씩 나온다', () => {
  const expectJia = { 甲: '비견', 乙: '겁재', 丙: '식신', 丁: '상관', 戊: '편재', 己: '정재', 庚: '편관', 辛: '정관', 壬: '편인', 癸: '정인' };
  for (const [s, g] of Object.entries(expectJia)) assert.strictEqual(J.tenGod('甲', s), g, '甲→' + s);
  for (const dm of J.STEMS) assert.deepStrictEqual([...J.STEMS].map((s) => J.tenGod(dm, s)).sort(), [...J.TEN_GODS].sort(), dm);
  // 일간 丙 (샘플)
  const expectBing = { 壬: '편관', 癸: '정관', 甲: '편인', 乙: '정인', 丙: '비견', 丁: '겁재', 戊: '식신', 己: '상관', 庚: '편재', 辛: '정재' };
  for (const [s, g] of Object.entries(expectBing)) assert.strictEqual(J.tenGod('丙', s), g, '丙→' + s);
});

test('가상 학생 A(2012-07-14 20:30 남): 명식, 두 가지 십성 집계, 정밀 대운', () => {
  const r = calc('2012-07-14', '20:30');
  assert.deepStrictEqual(r.pillars, { 년주: '壬辰', 월주: '丁未', 일주: '丙子', 시주: '戊戌' });
  assert.strictEqual(r.boundary.nearBoundary, false);
  // 천간·지지 본기 기준 (기존 샘플 값)
  assert.deepStrictEqual(r.tenGods.surface.groups, { 비겁: 1, 식상: 4, 재성: 0, 관성: 2, 인성: 0 });
  assert.strictEqual(r.tenGods.surface.total, 7);
  // 지장간 포함 (손계산과 일치해야 한다)
  assert.deepStrictEqual(r.tenGods.withHidden.groups, { 비겁: 3, 식상: 4, 재성: 1, 관성: 4, 인성: 2 });
  assert.deepStrictEqual(r.tenGods.withHidden.gods, { 비견: 0, 겁재: 3, 식신: 3, 상관: 1, 편재: 0, 정재: 1, 편관: 2, 정관: 2, 편인: 0, 정인: 2 });
  assert.strictEqual(r.tenGods.withHidden.total, 14);
  assert.notDeepStrictEqual(r.tenGods.surface.groups, r.tenGods.withHidden.groups); // 두 집계가 섞이지 않는다
  // 대운
  assert.strictEqual(r.daeun.forward, true);
  assert.strictEqual(r.daeun.startAge.years, 7);
  assert.strictEqual(r.daeun.startAge.months, 10);
  assert.ok(r.daeun.startAge.days >= 14 && r.daeun.startAge.days <= 16, '일수 ' + r.daeun.startAge.days);
  assert.strictEqual(r.daeun.startDate.slice(0, 7), '2020-05');
  assert.deepStrictEqual(r.daeun.list.slice(0, 5).map((x) => x.ganji), ['戊申', '己酉', '庚戌', '辛亥', '壬子']);
  assert.deepStrictEqual(r.daeun.list.slice(0, 4).map((x) => x.stemGod), ['식신', '상관', '편재', '정재']);
  assert.deepStrictEqual(r.daeun.list.slice(0, 4).map((x) => x.branchMainGod), ['편재', '정재', '식신', '편관']);
  assert.deepStrictEqual(r.daeun.list.slice(0, 4).map((x) => x.startYear), [2020, 2030, 2040, 2050]);
  // 이전 본문 문장의 근거가 무너지는 지점: 대운 지지에 재성, 원국 지장간에 인성·재성이 있다
  assert.ok(r.daeun.list[0].branchHidden.some((h) => h.god === '편재'));
  const hiddenGods = r.tenGods.positions.filter((p) => p.hidden).flatMap((p) => p.hidden.map((h) => h.god));
  assert.ok(hiddenGods.includes('정인') && hiddenGods.includes('정재'));
});

test('회귀: 고정 절기표가 틀리던 생일을 절입 시각으로 바로잡는다', () => {
  // 2012 입춘 19:22 — 이전 엔진은 2월 4일 하루 전체를 입춘 이후(壬辰년 壬寅월)로 계산했다
  const pre = P('2012-02-04', '10:00');
  assert.deepStrictEqual([pre.년주, pre.월주], ['辛卯', '辛丑']);
  assert.strictEqual(pre.일주, S.get일주('2012-02-04').간지.replace(/[가-힣]/g, ''));
  assert.strictEqual(P('2012-02-04', '21:00').년주, '壬辰');
  assert.strictEqual(P('2012-02-04', '21:00').월주, '壬寅');
  // 2005 입춘 02:43
  assert.strictEqual(P('2005-02-04', '01:00').월주, '丁丑');
  assert.strictEqual(P('2005-02-04', '01:00').년주, '甲申');
  assert.strictEqual(P('2005-02-04', '03:30').월주, '戊寅');
  assert.strictEqual(P('2005-02-04', '03:30').년주, '乙酉');
  // 2024 입춘 17:27
  assert.deepStrictEqual([P('2024-02-04', '12:00').년주, P('2024-02-04', '12:00').월주], ['癸卯', '乙丑']);
  assert.deepStrictEqual([P('2024-02-04', '18:00').년주, P('2024-02-04', '18:00').월주], ['甲辰', '丙寅']);
  // 2012 소서 01:41 — 이전 엔진은 7월 7일 00:00부터 未월
  assert.strictEqual(P('2012-07-07', '00:30').월주, '丙午');
  assert.strictEqual(P('2012-07-07', '03:00').월주, '丁未');
  // 2012 입추 11:30
  assert.strictEqual(P('2012-08-07', '11:00').월주, '丁未');
  assert.strictEqual(P('2012-08-07', '12:00').월주, '戊申');
  // 이전 엔진과 실제로 다른 값이었음을 고정(회귀 테스트가 의미를 잃지 않게)
  const [y, m, d] = [2012, 2, 4];
  const old = S.get월주(y, m, d, S.get년주(2012).천간index);
  assert.strictEqual(old.replace(/[가-힣]/g, ''), '壬寅');
});

test('년주·월주는 입춘·절입 직전과 직후에서만 바뀐다 (12개 월 경계, 2012년)', () => {
  const jie = T.jieOfYear(2012);
  const seen = [];
  for (const j of jie) {
    const k = T.kstParts(j.ms);
    const before = T.kstToMs(k.year, k.month, k.day, k.hour, k.minute) - 40 * 60000;
    const after = before + 80 * 60000;
    const pb = T.kstParts(before), pa = T.kstParts(after);
    const fmt = (p) => [`${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`, `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`];
    const a = P(...fmt(pb)).월주, b = P(...fmt(pa)).월주;
    assert.notStrictEqual(a, b, j.name);
    seen.push(b);
  }
  // 壬辰년 정월부터: 壬寅 癸卯 甲辰 乙巳 丙午 丁未 戊申 己酉 庚戌 辛亥 壬子 癸丑 (五虎遁)
  assert.deepStrictEqual(seen.slice(1, 12).concat(seen[0]).length, 12);
  assert.deepStrictEqual(['壬寅', '癸卯', '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子'], seen.slice(1));
});

test('대운 방향: 양남·음녀는 순행, 음남·양녀는 역행', () => {
  const dirs = {};
  for (const [label, date, g] of [['양남', '2012-07-14', '남성'], ['양녀', '2012-07-14', '여성'], ['음남', '2011-06-15', '남성'], ['음녀', '2011-06-15', '여성']]) dirs[label] = calc(date, '10:00', g).daeun.forward;
  assert.deepStrictEqual(dirs, { 양남: true, 양녀: false, 음남: false, 음녀: true });
  // A가 여자(역행): 직전 절입 소서(2012-07-07 01:41)까지 → 약 2년 7개월, 丙午 乙巳 甲辰 癸卯
  const f = calc('2012-07-14', '20:30', '여성');
  assert.strictEqual(f.daeun.basis, '출생 전 마지막 절입(소서)까지');
  assert.strictEqual(f.daeun.startAge.years, 2);
  assert.strictEqual(f.daeun.startAge.months, 7);
  assert.deepStrictEqual(f.daeun.list.slice(0, 4).map((x) => x.ganji), ['丙午', '乙巳', '甲辰', '癸卯']);
});

test('시간 미입력·경계 근접 표시', () => {
  const noTime = calc('2012-02-04', '');
  assert.strictEqual(noTime.pillars.시주, null);
  assert.strictEqual(noTime.boundary.ambiguousBecauseTimeUnknown, true); // 입춘 당일은 시간 없이 확정 불가
  assert.strictEqual(calc('2012-07-14', '').boundary.ambiguousBecauseTimeUnknown, false);
  assert.strictEqual(calc('2012-08-07', '11:20').boundary.nearBoundary, true);   // 입추 11:30 근처
  assert.strictEqual(calc('2012-08-07', '15:00').boundary.nearBoundary, false);
});

test('다양한 생년월일시 표본: 일주·시주는 기존 엔진과 같고, 월·년주는 라이브러리와 절입 당일을 뺀 모든 날 일치', (t) => {
  let lib;
  try { lib = require('@fullstackfamily/manseryeok'); } catch { lib = null; }
  const samples = [['1957-03-21', '06:15'], ['1969-11-02', '23:40'], ['1976-08-08', '13:05'], ['1984-01-01', '00:10'], ['1991-05-27', '18:45'], ['2000-02-29', '04:20'], ['2003-10-31', '21:50'], ['2018-12-25', '09:00'], ['2019-06-30', '15:30'], ['2025-09-09', '11:11']];
  let compared = 0;
  for (const [d, tm] of samples) {
    const r = calc(d, tm);
    const [y, m, day] = d.split('-').map(Number);
    const dayP = S.get일주(d);
    assert.strictEqual(r.pillars.일주, dayP.간지.replace(/[가-힣]/g, ''), d);
    assert.strictEqual(r.pillars.시주, S.get시주(tm, dayP.천간index).replace(/[가-힣]/g, ''), d);
    assert.ok(r.daeun.list.length === 8 && r.tenGods.withHidden.total >= r.tenGods.surface.total);
    const jieToday = T.jieOfYear(y).concat(T.jieOfYear(y - 1)).some((j) => { const k = T.kstParts(j.ms); return k.year === y && k.month === m && k.day === day; });
    if (lib && !jieToday) {
      const L = lib.calculateSajuSimple(y, m, day, Number(tm.slice(0, 2)));
      assert.strictEqual(L.yearPillarHanja, r.pillars.년주, d + ' 년주');
      assert.strictEqual(L.monthPillarHanja, r.pillars.월주, d + ' 월주');
      compared++;
    }
  }
  if (!lib) t.diagnostic('라이브러리 없음: 외부 대조 생략');
  else assert.ok(compared >= 8, '외부 대조 표본 ' + compared);
});

test('외부 만세력 라이브러리와 1950~2030년 매일(정오) 대조: 절입 당일을 뺀 날은 100% 일치', (t) => {
  let lib; try { lib = require('@fullstackfamily/manseryeok'); } catch { return t.skip('라이브러리 없음'); }
  let n = 0, skipped = 0;
  const jieDays = new Set();
  for (let y = 1949; y <= 2031; y++) for (const j of T.jieOfYear(y)) { const k = T.kstParts(j.ms); jieDays.add(`${k.year}-${k.month}-${k.day}`); }
  const mismatches = [];
  // 외부 라이브러리의 알려진 결함: 1950~1961년 일부 12월 31일에 엉뚱한 년주(예: 1950-12-31 → 丙午)를 돌려준다. 이 날짜는 제외하고 독립 공식(년주=그 해 간지)으로 따로 검증한다.
  const LIB_DEFECT = new Set(['1950-12-31', '1951-12-31', '1955-12-31', '1957-12-31', '1958-12-31', '1959-12-31', '1960-12-31', '1961-12-31']);
  let defectSeen = 0;
  for (let ms = Date.UTC(1950, 0, 1); ms < Date.UTC(2031, 0, 1); ms += 86400000) {
    const dt = new Date(ms), y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const day = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const r = calc(day, '12:00');
    let L; try { L = lib.calculateSajuSimple(y, m, d, 12); } catch { skipped++; continue; }
    n++;
    if (LIB_DEFECT.has(day)) {
      // 12월 31일은 대설~소한 사이(子월)이고 입춘 전이므로 년주는 그 해 간지여야 한다
      assert.strictEqual(r.pillars.년주, S.get년주(y).간지.replace(/[가-힣]/g, ''), day);
      assert.ok(L.yearPillarHanja !== r.pillars.년주, day + ' 라이브러리 결함이 사라졌다면 이 목록에서 뺀다');
      defectSeen++;
      continue;
    }
    if (L.dayPillarHanja !== r.pillars.일주) mismatches.push(day + ' 일주');
    // 라이브러리의 월 경계는 날짜 단위 표라서 절입 당일·전후 하루는 다를 수 있다 (공개 기준값 2005·2012·2024에서는 절입 당일에만 달랐고 절입 시각 쪽이 맞았다)
    const near = [-1, 0, 1].some((o) => { const x = new Date(ms + o * 86400000); return jieDays.has(`${x.getUTCFullYear()}-${x.getUTCMonth() + 1}-${x.getUTCDate()}`); });
    if (!near && (L.yearPillarHanja !== r.pillars.년주 || L.monthPillarHanja !== r.pillars.월주)) mismatches.push(day + ' 년월주');
  }
  assert.ok(n > 29000, '대조한 날 ' + n);
  assert.ok(skipped < 100, '라이브러리가 예외를 던진 날 ' + skipped);
  assert.strictEqual(defectSeen, LIB_DEFECT.size);
  assert.deepStrictEqual(mismatches.slice(0, 5), [], `불일치 ${mismatches.length}건`);
});

test('이전 고정 절기표 엔진과의 차이는 절입 전후 하루 이내에만 생긴다 (2005~2024, 정오)', () => {
  let diffDays = 0, total = 0;
  for (let ms = Date.UTC(2005, 0, 1); ms < Date.UTC(2025, 0, 1); ms += 86400000) {
    const dt = new Date(ms), y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const day = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const r = calc(day, '12:00');
    const sy = (m < 2 || (m === 2 && d < S.절기시작일[1])) ? y - 1 : y;
    const yp = S.get년주(sy);
    const oldMonth = S.get월주(y, m, d, yp.천간index).replace(/[가-힣]/g, '');
    const oldYear = yp.간지.replace(/[가-힣]/g, '');
    total++;
    if (oldMonth !== r.pillars.월주 || oldYear !== r.pillars.년주) {
      diffDays++;
      const near = [-1, 0, 1].some((o) => T.jieOfYear(y).concat(T.jieOfYear(y - 1)).some((j) => { const k = T.kstParts(j.ms); const x = new Date(ms + o * 86400000); return k.year === x.getUTCFullYear() && k.month === x.getUTCMonth() + 1 && k.day === x.getUTCDate(); }));
      assert.ok(near, day + ' 이전 엔진과 차이가 절입 근처가 아님');
    }
  }
  assert.ok(diffDays > 0 && diffDays / total < 0.04, `차이 ${diffDays}/${total}`);
});

test('격리: 계산 모듈은 successChild.js 한 곳으로만 쓰이고, 기존 계산·상품 파일은 쓰지 않으며, 용신·신강신약을 계산하지 않는다', () => {
  // 기존 사주 계산·프롬프트 파일은 새 계산 모듈을 참조하지 않는다 (기존 상품의 계산이 바뀌지 않는다)
  for (const f of ['saju.js', 'relations.js', 'freeActions.js', 'freeInput.js', 'deepYear.js', 'timingRules.js']) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.ok(!/childCalc|jijanggan|solarTerms|successChild/.test(src), f + ' 가 새 계산 모듈을 참조함');
  }
  // 서버 쪽에서는 successChild.js 만 가져온다 (계산 모듈을 직접 가져다 쓰지 않는다)
  for (const f of ['server.js', 'secure.js']) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.ok(!/require\('\.\/(childCalc|jijanggan|solarTerms)'\)/.test(src), f + ' 가 계산 모듈을 직접 참조함');
    assert.ok(/require\('\.\/successChild'\)/.test(src), f + ' 에 successChild 연결이 없음');
  }
  const out = JSON.stringify(calc('2012-07-14', '20:30'));
  assert.ok(!/용신|신강|신약/.test(out.replace(/용신·신강신약은 계산하지 않았다\./, '')));
});
