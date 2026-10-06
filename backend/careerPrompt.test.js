// 전체 분석(paidOnlyPrompt)의 '職 · 직업과 커리어' 지시문이 구체적인 직업·직무 추천 구조를 유지하는지 확인한다. AI 호출·DB 없음.
// (실제 생성 품질은 가상 사주 3건으로 따로 확인했다 — 이 테스트는 지시문 구조가 되돌아가지 않게 지키는 용도)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const server = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const start = server.indexOf('===職 · 직업과 커리어===');
const end = server.indexOf('===富 · 투자와 부동산===', start);
const career = server.slice(start, end);

test('職 섹션 지시문이 paidOnlyPrompt 안에 한 번만 있고, 다음 섹션(富)과 구분된다', () => {
  assert.ok(start > 0 && end > start);
  assert.strictEqual(server.split('===職 · 직업과 커리어===').length - 1, 1);
  const paidStart = server.indexOf('const paidOnlyPrompt');
  assert.ok(paidStart > 0 && paidStart < start);
});

test('소제목 순서: 직업 → 잘 맞는 업무 환경 → 덜 맞는 업무 환경 → 직장인/프리랜서/사업 → 커리어 타이밍(기존 형식 유지)', () => {
  const order = ['📌 이 사주에 맞는 직업', '📌 잘 맞는 업무 환경', '📌 덜 맞는 업무 환경', '📌 직장인 / 프리랜서 / 사업 중 어떤 구조, 어떤 환경에서 능력이 폭발하는지', '📌 커리어 타이밍', '✅ 크게 도약할 수 있는 시기', '${PAID_CAUTION_HEADING}'];
  let at = -1;
  for (const h of order) { const i = career.indexOf(h); assert.ok(i > at, h); at = i; }
  // 프런트 '재물·직업 한눈에 보기'가 환경·구조 소제목에서 문장을 가져오므로 해당 소제목이 계속 있어야 한다
  assert.ok(/📌 [^\n]*(환경|구조)[^\n]*/.test(career));
});

test('추천 방식: 방향 3개 × 실제 직업·직무 2~4개, 근거→업무 방식→이유 순서, 같은 분야 안의 역할 구분', () => {
  assert.ok(career.includes('딱 3가지만 고르세요') && career.includes('10개씩 나열하지 마세요'));
  assert.ok(career.includes('실제 직업·직무 2~4개'));
  assert.ok(career.includes('① 이 사람의 [사주 계산값]에서 실제로 확인되는 특징') && career.includes('⑤ 같은 업종 안에서'));
  assert.ok(career.includes('같은 분야 안에서도 어떤 역할·업무 방식이 특히 맞고'));
  assert.ok(!career.includes('1. (직업명) — 이유'), '예전의 추상적 "(직업명) — 이유" 형식은 없다');
  assert.ok(career.includes('(800~1000자'));
});

test('구체성 유지: 사주 근거를 줄이지 않고 특징→행동→업무→직업→역할 구분까지 구체적으로 연결한다', () => {
  assert.ok(career.includes("단정은 줄이고 구체성은 높이는 것") && career.includes("설명을 줄이거나 두루뭉술하게 만들지 마세요"));
  for (const step of ['① 이 사람의 [사주 계산값]에서 실제로 확인되는 특징', '② 그 특징이 성향·행동 방식으로', '③ 실제 업무에서 어떤 행동·역할로 강점이', '④ 그래서 어떤 구체적인 직업·직무와 연결되는지', '⑤ 같은 업종 안에서 더 맞는 역할과 덜 맞는 역할']) assert.ok(career.includes(step), step);
  assert.ok(career.includes('사주 전문용어(오행 관계 등)를 없애라는 것이 아닙니다') && career.includes('현실의 행동과 직업으로 번역'));
  assert.ok(career.includes('무엇을(일정·숫자·자산·사람·품질 중)') && career.includes('신규 영업·상담·협상·교육·기존 고객 관리') && career.includes('콘텐츠 기획·디자인·브랜드 기획·공간 기획·제품 기획'));
  assert.ok(career.includes('근거 없는 정밀함'));
  assert.ok(!career.includes('(짧게)') && !career.includes('한 번, 한 문장 이내로만'), '사주 근거를 줄이라는 문구는 없다');
});

test('단정 완화: 미래 결과·특정 선택은 확정하지 않되 내용은 흐리지 않고 구체적 구조로 설명한다', () => {
  assert.ok(career.includes('이 섹션 전체(직업 추천, 직장인/프리랜서/사업 소제목, 커리어 타이밍 포함)'));
  assert.ok(career.includes('성공 여부를 확정하지 마세요'));
  assert.ok(career.includes('사업이 맞을 수도 있어요') && career.includes('내용을 흐리지 마세요'));
  assert.ok(career.includes('본인이 가격·일정·운영 방식을 결정할 수 있는 구조') && career.includes('소규모 전문 서비스업 형태'));
  assert.ok(career.includes('분량을 늘리지 마세요'));
});

test('금지 규칙: 직군명 단독·누구에게나 맞는 말·단정(천직/반드시 성공)·경력 추측·한자 노출', () => {
  for (const bad of ['"상담", "운영", "교육", "서비스"', '소통 능력이 좋다', '관리 능력이 있다', '안정적인 환경이 좋다', '사람을 돕는 일이 맞다', '사람을 잘 이해한다', '조율 능력이 있다', '꾸준히 노력하면 성과를 낸다', '창의적인 일이 맞다']) assert.ok(career.includes(bad), bad);
    assert.ok(career.includes('천직이에요') && career.includes('반드시 성공해요'));
  assert.ok(career.includes('경력·학력·자격증·현재 직업·가족 사정') && career.includes('추측해서 쓰지 마세요'));
  assert.ok(career.includes('한자(庚·甲·申·月柱·時柱 등)를 쓰지 말고'));
  // 사람마다 달라야 하고, 예시는 형식 설명용
  assert.ok(career.includes('사람마다 달라야 합니다') && career.includes('형식 설명용'));
  // 환경 두 섹션은 고정 문구 금지
  assert.strictEqual(career.split('고정 문구 금지').length - 1, 2);
});

test('범위 제한: 한 단계 연결 허용은 이 섹션에만 적용하고 공통 규칙(규칙문)·다른 섹션·임시 파일은 건드리지 않는다', () => {
  assert.ok(career.includes('이 섹션(職) 전체에만 적용') &&career.includes('이 섹션에 한해'));
  const saju = fs.readFileSync(path.join(__dirname, 'saju.js'), 'utf8');
  assert.ok(saju.includes('한 단계 더 추론한 비유·인과'));                                     // 공통 규칙 그대로
  for (const keep of ['===財運 · 인생 재물 전체===', '===富 · 투자와 부동산===', '===緣 · 사람과 인연===', '===月運 · 월별 운세===', '===道 · 이 사주로 잘 사는 법===']) assert.ok(server.includes(keep), keep);
  assert.ok(!/server\.tmp|career-test|__runAnalysis|globalThis\.__stream/.test(server), '검증용 임시 코드가 섞이지 않았다');
  assert.ok(!career.includes('`') && !/\$\{(?!PAID_CAUTION_HEADING\})/.test(career), '템플릿 문자열을 깨는 기호가 없다');
});
