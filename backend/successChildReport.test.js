const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSuccessChildFacts } = require('./successChild');
const { buildSuccessChildReport, toFreePreview, renderSuccessChildMail, reportFromEvents, DISCLAIMER } = require('./successChildReport');
const { SAMPLE_INPUT, SAMPLE_REPORT_TEXT } = require('./successChildSample');
const { buildCase } = require('./successChildCases');
const { buildOrderMail } = require('./secure');
const { lintSuccessChild } = require('./successChildPrompt');
const { makeValid } = require('./successChildTestKit');

const factsOf = (o) => buildSuccessChildFacts({ ...o, now: new Date(o.now || '2026-11-12T12:00:00+09:00') });
const factsA = factsOf(SAMPLE_INPUT);
const reportA = buildSuccessChildReport(SAMPLE_REPORT_TEXT, factsA, { name: '가상학생' });

test('결과 모델: 첫 화면 결론·강조 구절·대운 띠(재성 대운 강조)·메타', () => {
  assert.equal(reportA.hero.lead, '이 아이는 사업가형 사주입니다.');
  assert.deepEqual(reportA.hero.leadParts, { pre: '이 아이는 ', em: '사업가형 사주', post: '입니다.' });
  assert.ok(reportA.hero.summary.includes('사업가형은 사주의 구조를 부르는 이름이고, 사업을 해야 한다는 뜻은 아닙니다.'));
  // 첫 화면 본문에는 계산 숫자·전문 용어가 없고, 근거 줄에만 있다
  const heroBody = [reportA.hero.summary, reportA.hero.compare.study, reportA.hero.compare.biz, reportA.hero.compare.diff, reportA.hero.compare.todo, reportA.hero.compare.oneLine].join(' ');
  assert.ok(!/\d+\s*글자|숨은 글자|식상|재성|관성|인성|천간|지장간/.test(heroBody.replace(/예를 들어[^.]*\./g, '')), heroBody);
  assert.ok(reportA.hero.compare.basisLine.includes('나 자신(일간)을 뺀 7글자') && reportA.hero.compare.basisLine.includes('식상 4글자(상관 4)'), '근거 줄은 서버가 계산값으로 만든다');
  assert.deepEqual(reportA.hero.rail, [
    { year: 2019, label: '돈이 움직인다', hl: true }, { year: 2029, label: '돈이 쌓인다', hl: true },
    { year: 2039, label: '경쟁과 평가', hl: false }, { year: 2049, label: '안정된 제도', hl: false },
  ]);
  assert.deepEqual(reportA.meta, { gender: '남', birth: '2011년 1월 11일 2시 10분생', age: '올해(2026년) 만 15세' });
  assert.ok(!/학년|학령/.test(JSON.stringify(reportA)), '결과 모델에 학년 표시가 없다');
});

test('강조 구절은 A·B·C 결론마다 잡힌다(C는 "두 방향이 …")', () => {
  const em = (k) => { const c = buildCase(k); return buildSuccessChildReport(c.expanded, c.facts).hero.leadParts; };
  assert.equal(em('A').em, '사업가형 사주'); assert.equal(em('B').em, '공부형 사주');
  assert.equal(em('C').em, '공부와 사업을 함께 쓰는 사주'); assert.equal(em('C').post, '입니다.');
});

test('결과 모델: 공부 vs 사업 비교는 서버 판정(사실 3가지)과 AI 문장으로 구성되고, 점수는 없다', () => {
  const cp = reportA.hero.compare;
  assert.equal(cp.type, 'A');
  assert.equal(cp.typeName, '사업·시장 쪽 특징이 더 두드러지는 유형');
  assert.ok(cp.study && cp.biz && cp.diff && cp.oneLine);
  assert.deepEqual(cp.signals.map((s) => [s.title, s.side]), [['겉으로 드러난 천간', '사업·시장 쪽'], ['연결 구조', '사업·시장 쪽'], ['학생 시기 대운', '사업·시장 쪽']]);
  assert.ok(cp.signals[2].detail.includes('2019~2028년(8~17세) 천간 편재'));
  assert.ok(cp.note.includes('실제 성적, 재능, 진로는 아이의 관심과 경험으로 정해집니다'));
  assert.ok(!/점수|%/.test(JSON.stringify(cp)), '점수·비율을 보여 주지 않는다');
  // 근거란에도 같은 판정이 들어간다
  const entry = reportA.basis.find((e) => e.dt === '공부·사업 비교 판정');
  assert.ok(entry && entry.dd.some((l) => l.includes('설명 유형 A')) && entry.dd.some((l) => l.includes('점수나 개수의 합으로 정하지 않았고')));
});

test('결과 모델: 공부운·직업운·사업운·재물운 번호·제목·본문·예시 목록·한 줄 요약·근거', () => {
  assert.deepEqual(reportA.sections.map((s) => [s.no, s.label]), [['01', '공부운'], ['02', '직업운'], ['03', '사업운'], ['04', '재물운']]);
  const study = reportA.sections[0];
  assert.equal(study.headline, '이 아이는 읽고 외우는 공부보다, 배운 것을 직접 말하고 써 보는 공부에서 이해가 깊어집니다.');
  assert.equal(study.paras.length, 3);
  assert.equal(study.bullets.length, 3);
  assert.ok(study.bullets[0].startsWith('영어:') && study.bullets[1].startsWith('수학:') && study.bullets[2].startsWith('국어와 사회:'));
  assert.ok(study.oneLine.length > 10);
  assert.ok(study.basis.startsWith('인성 겉 2글자(편인 2)'));
  for (const s of reportA.sections) {
    assert.ok(s.headline && s.basis && s.oneLine && s.paras.length >= 2 && s.bullets.length >= 2, s.label);
    assert.ok(!s.paras.some((p) => /^(결론|근거|한 줄|예시):/.test(p) || /^- /.test(p)));
  }
  assert.equal(reportA.sections[1].bullets.length, 3, '직업은 3개');
  assert.ok(reportA.sections[1].bullets.every((b) => /필요(합니다|하고)/.test(b) && /관심을 보이면/.test(b)), '직업 예시마다 필요한 능력과 해 볼 경험이 붙는다');
  assert.ok(reportA.sections[2].bullets.every((b) => /방식입니다/.test(b) && /이어집니다|이 사주에서는/.test(b)), '사업 예시마다 방식과 서버가 붙인 추천 이유');
  const reasonOf = (b) => (b.match(/[^.]*(?:이어집니다|후보로만 소개합니다)\./) || [''])[0];
  for (const i of [1, 2]) assert.equal(new Set(reportA.sections[i].bullets.map(reasonOf)).size, 3, '추천 이유가 항목마다 다르다');
  assert.ok(reportA.sections.every((s) => s.todo && s.todo.length > 20), '항목마다 해볼 일');
});

test('결과 모델: 재물 카드는 AI가 아니라 계산값으로 만들고, 편재·정재를 큰돈·안정 수입으로 확정하지 않는다', () => {
  const coins = reportA.sections[3].coins;
  assert.deepEqual(coins.map((c) => [c.year, c.age, c.kind, c.hanja]), [['2019 ~ 2028', '8~17세 · 庚寅 대운', '편재', '偏財'], ['2029 ~ 2038', '18~27세 · 辛卯 대운', '정재', '正財']]);
  assert.ok(coins[0].text.includes('움직이는 재물과 그 재물을 다루는 감각') && coins[0].text.includes('큰돈을 번다는 뜻은 아닙니다') && coins[0].text.endsWith('이 시기 대운 천간 庚이 편재입니다.'));
  assert.ok(coins[1].text.includes('정해진 방식으로 들어와 쌓이고 지켜지는 재물') && coins[1].text.includes('수입이 안정된다는 보장은 아닙니다') && coins[1].text.endsWith('이 시기 대운 천간 辛이 정재입니다.'));
  assert.ok(!/규모가 큰|꾸준하고 안정적인 수입/.test(JSON.stringify(coins)), '이전의 확정 표현이 남아 있지 않다');
  assert.equal(reportA.sections[0].coins, undefined);
});

test('결과 모델: 10대·20대·30대 — 연도·나이·학령은 서버 계산값, 주제·해석·장면·차이는 AI', () => {
  assert.deepEqual(reportA.periods.map((p) => [p.range, p.ganji, p.god, p.ages, p.school, p.hl]), [
    ['2019 ~ 2028', '庚寅', '편재', '8~17세', '', true],
    ['2029 ~ 2038', '辛卯', '정재', '18~27세', '', true],
    ['2039 ~ 2048', '壬辰', '편관', '28~37세', '', false],
    ['2049 ~ 2058', '癸巳', '정관', '38~47세', '', false],
  ]);
  assert.ok(reportA.periods[0].theme.includes('처음 접하는'));
  assert.ok(!/庚|편재/.test(reportA.periods[0].text) && reportA.periods[0].text.includes('거래'));
  assert.ok(reportA.periodsNote.includes('만 나이와 1살 차이가 날 수 있습니다'));
  for (const p of reportA.periods) assert.ok(p.theme && p.text && p.scene && p.diff, p.range);
});

test('결과 모델: 근거란과 한계 고지(한 번)', () => {
  assert.deepEqual(reportA.basis.map((e) => e.dt), ['핵심 결론의 근거', '공부운의 근거', '직업운의 근거', '사업운의 근거', '재물운의 근거', '사주', '십성 집계 (나 자신을 뺀 글자)', '공부·사업 비교 판정', '대운', '나이', '계산 범위']);
  // 계산 숫자와 전문 용어는 본문이 아니라 맨 아래 근거란에 모인다
  assert.ok(reportA.basis[0].dd[0].includes('식상 4글자') && reportA.basis[1].dd[0].startsWith('인성 겉 2글자'));
  const core = reportA.basis.slice(5);
  assert.equal(core[0].dd[0], '庚寅년 己丑월 丙寅일 己丑시 · 일간 丙(불)');
  assert.ok(core[1].dd[0].includes('식상 4, 관성 0, 비겁 0, 인성 2, 재성 1'));
  assert.ok(core[1].dd[1].includes('식상 6, 관성 2, 비겁 2, 인성 2, 재성 3'));
  assert.ok(core[3].dd[0].startsWith('순행, 약 8세 1개월 시작 · 庚寅(편재) → 辛卯(정재) → 壬辰(편관)'));
  assert.equal(reportA.disclaimer, DISCLAIMER);
  assert.ok(DISCLAIMER.includes('보장하거나 예측하지 않습니다'));
  const body = JSON.stringify([reportA.hero, reportA.sections, reportA.periods]);
  assert.ok(!/보장하지|예측하지/.test(body), '한계 고지는 본문에 반복되지 않는다');
});

test('생성형 AI 고지: 결과 모델과 이메일에 최소 문구가 한 번씩 들어간다', () => {
  assert.equal(reportA.aiNotice, '이 결과지의 해석 문장은 생성형 AI가 작성했습니다.');
  const html = renderSuccessChildMail(reportA);
  assert.equal((html.match(/이 결과지의 해석 문장은 생성형 AI가 작성했습니다\./g) || []).length, 1);
  assert.ok(html.indexOf('생성형 AI') > html.indexOf('계산 근거와 해석의 한계'));
});

test('고객에게 나가는 모델·이메일에는 100,000원 앵커·할인율·"다음 장" 문구가 없다', () => {
  const all = JSON.stringify(reportA) + renderSuccessChildMail(reportA);
  assert.ok(!/100,?000|다음 장에서|취소선|%\s*할인/.test(all));
});

test('무료 공통 샘플: 핵심 결론과 공부운 첫 문단만 있고, 잠긴 항목의 내용은 모델에 없다', () => {
  const pv = toFreePreview(reportA);
  assert.equal(pv.preview, true);
  assert.equal(pv.hero.lead, reportA.hero.lead); assert.equal(pv.hero.summary, reportA.hero.summary); assert.equal(pv.hero.compare, null);
  assert.equal(pv.sections[0].paras.length, 1); assert.deepEqual(pv.sections[0].bullets, []); assert.equal(pv.sections[0].oneLine, '');
  for (const s of pv.sections.slice(1)) { assert.equal(s.locked, true); assert.equal(s.headline, ''); assert.deepEqual(s.paras, []); assert.deepEqual(s.bullets, []); assert.equal(s.coins, undefined); }
  assert.equal(pv.periodsLocked, true); assert.deepEqual(pv.periods, []); assert.deepEqual(pv.basis, []);
  const json = JSON.stringify(pv);
  for (const secret of ['웹툰 작가', '제과제빵사', '공인중개사', '동네 베이커리', '용돈과 세뱃돈', '식상생재', '庚寅', '규칙과 평가의 기운이 들어오는 시기']) assert.ok(!json.includes(secret), `미리보기에 유료 내용 유출: ${secret}`);
  assert.ok(json.length < JSON.stringify(reportA).length / 2.5);
});

test('다른 아이: 대운 천간에 재성이 없으면 재물 카드를 만들지 않고 "나타나지 않습니다"를 서버가 쓴다, 시간 미입력이면 안내한다', () => {
  let found = null;
  for (let y = 2005; y <= 2021 && !found; y++) for (const g of ['남성', '여성']) {
    const f = factsOf({ gender: g, solarDate: `${y}-05-20`, birthtime: '' });
    if (!f.rows.slice(0, 6).some((r) => ['편재', '정재'].includes(r.stemGod))) { found = f; break; }
  }
  assert.ok(found, '재성 대운이 없는 표본을 찾지 못함');
  const lint = lintSuccessChild(makeValid(found), found);
  assert.deepEqual(lint.hard, [], '표본 텍스트가 검사를 통과해야 한다');
  const r = buildSuccessChildReport(lint.expanded, found);
  assert.deepEqual(r.sections[3].coins, []);
  assert.ok(r.hero.rail.every((x) => !x.hl));
  assert.match(lint.expanded, /겉으로 드러난 운에는 돈과 거래의 운이 나타나지 않습니다/);
  assert.ok(r.meta.birth.includes('출생 시간 미입력'));
  assert.ok(r.periods.every((p, i) => p.range === `${found.rows[i].startYear} ~ ${found.rows[i].endYear}` && p.text.includes(String(found.rows[i].startYear))), '연도가 서버 계산값과 같다');
});

test('사주 풀이 근거 줄은 AI가 쓴 값이 아니라 서버 계산값이다(AI가 엉뚱한 숫자를 써도 결과지에는 계산값만 나온다)', () => {
  const text = SAMPLE_REPORT_TEXT.replace(/^근거: .*$/gm, '근거: 식상 99글자 · 재성 77개');
  const r = buildSuccessChildReport(text, factsA);
  assert.ok(!/99|77/.test(JSON.stringify(r.basis)) && !/99|77/.test(JSON.stringify(r.sections.map((x) => x.basis))));
  assert.ok(r.sections[3].basis.includes('2019~2028년(8~17세) 庚(편재)'));
});

test('이메일: 결과지 디자인(짙은 녹색·금색)·본문·비교 박스·예시 목록·한 줄 요약·재물 카드·근거·한계 고지, HTML 이스케이프', () => {
  const html = renderSuccessChildMail({ ...reportA, name: '<b>가상</b>' });
  assert.ok(html.includes('#1F2B28') && html.includes('#D6B36A'));
  for (const s of ['우리 애, 공부로 성공할까?', '사업가형 사주', '해볼 일', '사주 풀이 근거', '만 나이와 1살 차이가 날 수 있습니다', '공부 vs 사업', '겉으로 드러난 천간', '공부운', '사업운', '2019 ~ 2028', '편재', '偏財', '2029 ~ 2038', '10대 · 20대 · 30대 운의 변화', '8~17세', '웹툰 작가', '장면 ·', '계산 근거와 해석의 한계', '지장간 포함 기준(15개)', '실제 성적, 재능, 진로는 아이의 관심과 경험으로 정해집니다']) assert.ok(html.includes(s), s);
  assert.ok(html.includes('&lt;b&gt;가상&lt;/b&gt;') && !html.includes('<b>가상</b>'));
  assert.ok(!/학년|학령/.test(html), '이메일에 학년 표시가 없다');
  assert.equal((html.match(/보장하거나 예측하지 않습니다/g) || []).length, 1, '한계 고지는 한 번만');
  assert.ok(!/<script|javascript:/i.test(html));
});

test('buildOrderMail: success_report 이벤트로 이메일을 만들고, 이벤트가 없으면 기존 양식으로 보낸다', () => {
  const ev = [`data: ${JSON.stringify({ type: 'success_report', report: reportA })}\n\n`, `data: ${JSON.stringify({ text: SAMPLE_REPORT_TEXT })}\n\n`, `data: ${JSON.stringify({ type: 'done' })}\n\n`];
  const order = { product: 'success_child', input: { userName: '가상학생' } };
  const mail = buildOrderMail(order, ev, 'auto');
  assert.equal(mail.subject, '🌟 우리 아이 성공운명서 - 가상학생님의 결과');
  assert.ok(mail.html.includes('우리 애, 공부로 성공할까?') && mail.html.includes('2019 ~ 2028'));
  assert.equal(mail.userName, '가상학생');
  assert.ok(mail.resultText.includes('===공부운==='));
  assert.equal(buildOrderMail({ product: 'success_child', input: {} }, ev, 'manual').subject, '🌟 우리 아이 성공운명서가 도착했습니다');
  assert.equal(reportFromEvents(ev).hero.lead, reportA.hero.lead);
  assert.equal(reportFromEvents([ev[1]]), null);
  const fallback = buildOrderMail(order, [ev[1], ev[2]], 'auto');   // 모델 없음 → 표준 양식
  assert.ok(fallback.html.includes('공부운'));
  // 기존 상품 메일은 그대로
  const old = buildOrderMail({ product: 'full_child', input: { userName: 'A' } }, [`data: ${JSON.stringify({ text: '===타고난 기질===\n본문' })}\n\n`], 'auto');
  assert.ok(old.subject.includes('우리 아이 진로·학과 프리미엄'));
});

test('첫 화면: 결론·쉬운 한 문장·이번 달 해볼 일 한 가지가 결과 모델과 이메일 위쪽에 있고, 무료 샘플에도 같은 세 가지가 있다', () => {
  assert.equal(reportA.hero.lead, '이 아이는 사업가형 사주입니다.');
  assert.ok(reportA.hero.oneLine.startsWith('이 아이는 ') && reportA.hero.oneLine.length <= 80);
  assert.ok(/이번 달/.test(reportA.hero.todo) && /살펴봅니다/.test(reportA.hero.todo));
  assert.ok(reportA.hero.todoNote.includes('그 결과만으로 아이의 적성이나 미래를 정하지는 않습니다'));
  const html = renderSuccessChildMail(reportA);
  const pos = (t) => html.indexOf(t);
  assert.ok(pos('이 아이는 사업가형') < pos(reportA.hero.oneLine) && pos(reportA.hero.oneLine) < pos('이번 달 해볼 일') && pos('이번 달 해볼 일') < pos(reportA.hero.summary.slice(0, 20)), '결론 → 한 문장 → 이번 달 해볼 일 → 요약 순서');
  const pv = toFreePreview(reportA);
  assert.equal(pv.hero.oneLine, reportA.hero.oneLine); assert.equal(pv.hero.todo, reportA.hero.todo); assert.equal(pv.hero.todoNote, reportA.hero.todoNote);
  for (const k of ['A', 'B', 'C']) { const c = buildCase(k); const rp = buildSuccessChildReport(c.expanded, c.facts); assert.ok(rp.hero.oneLine && /이번 달/.test(rp.hero.todo), k); }
});
