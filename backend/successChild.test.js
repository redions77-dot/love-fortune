const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { PRODUCTS, PAID_ONLY_ANALYSIS_TYPES } = require('./secure');
const { SUCCESS_CHILD, isProductOrderable, schoolLabelOfYear, manAge, buildSuccessChildFacts } = require('./successChild');

const at = (iso) => new Date(iso + 'T12:00:00+09:00');   // KST 정오 기준 '오늘'
const facts = (opts = {}) => buildSuccessChildFacts({ gender: '남성', solarDate: '2012-07-14', birthtime: '20:30', now: at('2026-11-12'), ...opts });

test('상품 정책: 이름·가격(50,000원 단일)이 서버 상수로 고정된다', () => {
  assert.strictEqual(SUCCESS_CHILD.name, '우리 아이 성공사주');
  assert.strictEqual(SUCCESS_CHILD.reportName, '우리 아이 성공운명서');
  assert.strictEqual(SUCCESS_CHILD.amount, 50000);
  const p = PRODUCTS.success_child;
  assert.strictEqual(p.amount, 50000);
  assert.strictEqual(p.name, '우리 아이 성공사주');
  assert.strictEqual(p.analysisType, '성공사주');
  assert.strictEqual(p.kind, 'personal');
  assert.match(p.emailLabel, /우리 아이 성공운명서/);
  assert.ok(PAID_ONLY_ANALYSIS_TYPES.has('성공사주'), '무료 경로(/api/analyze)로 부를 수 없어야 한다');
});

test('기존 상품은 그대로다 (금액·이름·유형·접두어 고정)', () => {
  const snap = Object.fromEntries(Object.entries(PRODUCTS).filter(([k]) => k !== 'success_child').map(([k, v]) => [k, [v.amount, v.name, v.kind, v.analysisType || null, v.prefix]]));
  assert.deepStrictEqual(snap, {
    full_saju: [1990, '마이사주 전체 분석', 'personal', '전체', 'saju'],
    full_child: [9900, '마이사주 자녀운 프리미엄', 'personal', '자녀천명', 'child'],
    full_nohu: [1990, '마이사주 전체 분석', 'personal', '노후', 'saju'],
    deep: [9900, '마이사주 심화 분석', 'personal', '심화', 'deep'],
    gunghab: [1990, '마이사주 궁합 분석', 'gunghab', '궁합', 'gunghab'],
    gilil: [9900, '마이사주 길일 추천', 'gilil', null, 'gilil'],
    baeknyeon: [99000, '마이사주 100년 사주 인생 꿀팁', 'baeknyeon', '100년꿀팁', 'baek'],
  });
  for (const t of ['궁합', '100년꿀팁', '심화', '길일']) assert.ok(PAID_ONLY_ANALYSIS_TYPES.has(t), t);
  assert.ok(!PAID_ONLY_ANALYSIS_TYPES.has('자녀천명'), '기존 무료 자녀 풀이(자녀천명)는 그대로 무료 경로를 쓴다');
});

test('출시 안전 스위치: SUCCESS_CHILD_ENABLED=1 일 때만 성공사주 주문을 받는다', () => {
  assert.strictEqual(isProductOrderable('success_child', {}), false);
  assert.strictEqual(isProductOrderable('success_child', { SUCCESS_CHILD_ENABLED: '0' }), false);
  assert.strictEqual(isProductOrderable('success_child', { SUCCESS_CHILD_ENABLED: 'true' }), false);
  assert.strictEqual(isProductOrderable('success_child', { SUCCESS_CHILD_ENABLED: '1' }), true);
  for (const k of Object.keys(PRODUCTS).filter((x) => x !== 'success_child')) assert.strictEqual(isProductOrderable(k, {}), true, k + ' 는 스위치와 무관해야 한다');
});

test('주문 생성 경로에 안전 스위치·성별·생년월일 확인이 연결되어 있다', () => {
  const src = fs.readFileSync(path.join(__dirname, 'secure.js'), 'utf8');
  const i = src.indexOf('async function createOrder');
  const body = src.slice(i, src.indexOf('app.post(\'/api/orders\'', i));
  assert.ok(body.indexOf('isProductOrderable(productKey)') > 0 && body.indexOf('isProductOrderable(productKey)') < body.indexOf('INSERT INTO orders'), '주문 저장 전에 스위치를 확인해야 한다');
  assert.ok(/SUCCESS_CHILD\.key[\s\S]*남성[\s\S]*여성/.test(body));
});

test('server.js 성공사주 분기: 계산값을 만들고, 어떤 경우에도 응답을 끝내 기본(무료 사주) 프롬프트로 떨어지지 않는다', () => {
  const src = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  const a = src.indexOf("if (type === '성공사주')");
  const b = src.indexOf('// ── /성공사주 ──');
  assert.ok(a > 0 && b > a);
  const seg = src.slice(a, b);
  assert.ok(/buildSuccessChildFacts/.test(seg));
  assert.ok((seg.match(/return res\.end\(\)/g) || []).length >= 3, '계산 실패·검사 실패·정상 모두 여기서 끝난다');
  assert.ok(a < src.indexOf("if (type === '궁합'"), '성공사주 분기는 다른 유형 분기보다 앞이어야 한다');
  // AI 호출·검사 연결은 successChildPrompt.test.js 에서 확인한다
});

test('나이·학령: 2012-07-14생은 2026-11-12에 만 14세, 중학교 2학년', () => {
  const f = facts();
  assert.strictEqual(f.age.man, 14);
  assert.strictEqual(f.age.school, '중학교 2학년');
  assert.strictEqual(f.age.asOf, '2026-11-12');
});

test('나이·학령: 생일 전후, 3월 학년 전환, 1~2월생(빠른 생일), 연도별 학령', () => {
  const b = { year: 2012, month: 7, day: 14 };
  assert.strictEqual(manAge(b, { year: 2026, month: 7, day: 13 }), 13);
  assert.strictEqual(manAge(b, { year: 2026, month: 7, day: 14 }), 14);
  assert.strictEqual(schoolLabelOfYear(b, 2026, 2), '중학교 1학년');   // 3월 전에는 지난 학년
  assert.strictEqual(schoolLabelOfYear(b, 2026, 3), '중학교 2학년');
  assert.strictEqual(schoolLabelOfYear(b, 2019, 6), '초등 1학년');
  assert.strictEqual(schoolLabelOfYear(b, 2024, 6), '초등 6학년');
  assert.strictEqual(schoolLabelOfYear(b, 2028, 6), '고등 1학년');
  assert.strictEqual(schoolLabelOfYear(b, 2030, 6), '고등 3학년');
  assert.strictEqual(schoolLabelOfYear(b, 2031, 6), '고등학교 졸업 이후');
  assert.strictEqual(schoolLabelOfYear(b, 2018, 6), '취학 전');
  // 2012년 2월생은 빠른 생일이라 2018년에 초등 1학년
  const feb = { year: 2012, month: 2, day: 10 };
  assert.strictEqual(schoolLabelOfYear(feb, 2018, 6), '초등 1학년');
  assert.strictEqual(schoolLabelOfYear(feb, 2026, 6), '중학교 3학년');
});

test('계산값 블록: 명식·십성 두 집계·대운(연도·나이)이 정확히 들어가고 학년은 들어가지 않는다', () => {
  const f = facts();
  const t = f.text;
  assert.match(t, /명식: 년주 壬辰 \/ 월주 丁未 \/ 일주 丙子 \/ 시주 戊戌/);
  assert.match(t, /천간·지지 본기 기준\(7글자\):.*식상 4, 재성 0, 관성 2, 인성 0, 비겁 1/);
  assert.match(t, /지장간 포함 기준\(14개\):.*식상 4, 재성 1, 관성 4, 인성 2, 비겁 3/);
  assert.match(t, /방향: 순행 \/ 시작: 출생 후 7세 10개월/);
  assert.match(t, /2020~2029년\(8~17세\) 戊申: 천간 戊 식신 \/ 지지 申 본기 庚 편재/);
  assert.match(t, /2030~2039년\(18~27세\) 己酉: 천간 己 상관/);
  assert.match(t, /2040~2049년\(28~37세\) 庚戌: 천간 庚 편재/);
  assert.ok(!/학년|졸업|학령/.test(t), 'AI에게는 학년·학령을 넘기지 않는다');
  assert.ok(!/2080~2089년/.test(t), 'AI에게는 대운 6개까지만 넘긴다');
  assert.strictEqual((t.match(/^- 대운\d: \d{4}~\d{4}년\(/gm) || []).length, 6);
  assert.match(t, /2050~2059년\(38~47세.*辛亥: 천간 辛 정재/);
  assert.match(t, /戊申.*← 현재 대운/);
  assert.match(t, /기준일 2026-11-12 현재 만 14세\n/);
  assert.strictEqual(f.currentIdx, 0);
  assert.strictEqual(f.rows[2].ageFrom, 28);
  // 계산하지 않은 항목이 AI에게 명시된다
  assert.match(t, /\[계산하지 않은 항목[^\]]*\]\n- 신강·신약, 용신, 격국, 신살, 세운/);
  // 두 집계를 섞지 말라는 규칙과 위치별 지장간 정보
  assert.match(t, /섞어서 쓰지 말고/);
  assert.match(t, /일지 子|일주 지지 子/);
  assert.match(t, /戌|술/);
});

test('계산값 블록: 절입 경계·시간 미입력 경고와 역행 대운', () => {
  const near = facts({ solarDate: '2012-08-07', birthtime: '11:20' });   // 입추 11:30 근처
  assert.match(near.text, /절입 시각과 20분 이내/);
  const noTime = facts({ solarDate: '2012-02-04', birthtime: '' });      // 입춘 당일, 시간 없음
  assert.match(noTime.text, /출생 시간이 없고 그날 절입이 있어/);
  assert.match(noTime.text, /시주 미입력/);
  const girl = facts({ gender: '여성' });                                // 양간 + 여성 = 역행
  assert.match(girl.text, /방향: 역행/);
  assert.match(girl.text, /丙午|乙巳/);
  const ok = facts({ solarDate: '2012-07-14', birthtime: '20:30' });
  assert.ok(!/절입 시각과 20분 이내|출생 시간이 없고/.test(ok.text));
});

test('입력 검증: 성별 없음·잘못된 생년월일은 계산하지 않는다', () => {
  assert.throws(() => facts({ gender: '' }), /성별/);
  assert.throws(() => facts({ gender: '미입력' }), /성별/);
  assert.throws(() => facts({ solarDate: '1800-01-01' }), /생년월일/);
  assert.throws(() => facts({ solarDate: 'abcd' }), /생년월일/);
});

test('다양한 생년월일시: 모든 표본에서 8개 대운과 두 십성 집계가 일관된다', () => {
  const people = [['남성', '2010-03-05', '07:30'], ['여성', '2015-12-31', '23:40'], ['남성', '2018-02-04', ''], ['여성', '2008-01-20', '00:10'], ['남성', '2021-05-05', '10:00'], ['여성', '2005-02-04', '02:00']];
  for (const [g, d, tm] of people) {
    const f = facts({ gender: g, solarDate: d, birthtime: tm });
    assert.strictEqual(f.rows.length, 8, d);
    assert.ok(f.calc.tenGods.withHidden.total >= f.calc.tenGods.surface.total, d);
    f.rows.forEach((r, i) => { if (i) assert.strictEqual(r.startYear >= f.rows[i - 1].startYear + 9, true, d + ' 대운 간격'); assert.strictEqual(r.endYear >= r.startYear + 9 - 0, true); });
    assert.ok(f.text.includes('[계산하지 않은 항목'), d);
    assert.ok(f.age.man >= 0, d);
  }
});
