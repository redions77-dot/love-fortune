// '우리 아이 성공사주'(success_child): 상품 상수, 나이·학령 계산, AI에게 넘길 '서버 계산값 블록'.
// 사주 계산은 childCalc.js(절입 시각 기준 명식, 지장간 포함 십성, 정밀 대운)를 그대로 쓴다. 이 파일은 계산을 새로 만들지 않고 연결만 한다.
// 용신·신강신약은 계산하지 않는다. 계산에 없는 값은 AI가 지어내지 못하도록 '계산하지 않은 항목'을 블록 끝에 명시한다.

const { calcChildSaju } = require('./childCalc');
const { kstParts } = require('./solarTerms');
const { compareDirection, renderCompareText } = require('./successChildCompare');
const { renderPlainBlocks } = require('./successChildPlain');

const SUCCESS_CHILD = Object.freeze({
  key: 'success_child',
  name: '우리 아이 성공사주',
  reportName: '우리 아이 성공운명서',
  amount: 50000,       // 일반 판매가 (서버만 정한다)
  analysisType: '성공사주',
});

// 결제 전 안내 문구 버전(주문에 함께 기록해 어떤 안내를 확인하고 결제했는지 남긴다). 문구를 바꾸면 이 값도 바꾼다.
const SUCCESS_CONSENT_VERSION = 'success-checkout-2026-11-v3';

// 출시 안전 스위치: SUCCESS_CHILD_ENABLED=1 일 때만 주문을 받는다. (기본 꺼짐 — 운영에 코드가 먼저 올라가도 판매되지 않는다)
const isProductOrderable = (productKey, env = process.env) => productKey !== SUCCESS_CHILD.key || env.SUCCESS_CHILD_ENABLED === '1';

const { PERIOD_ROWS: TEXT_DAEUN_ROWS } = require('./successChildTokens');   // AI에게는 대운 6개까지만 넘긴다(토큰도 같은 범위)
const pad2 = (n) => String(n).padStart(2, '0');

// 학령: 초1 입학 연도 = (출생 학년도) + 7, 학년도는 3월 시작이라 1~2월생은 앞 학년(빠른 생일). 일반 기준이며 조기·유예 입학은 반영하지 않는다.
function schoolLabelOfYear(birth, year, month = 6) {
  const schoolBirthYear = birth.month <= 2 ? birth.year - 1 : birth.year;
  let n = year - (schoolBirthYear + 7) + 1;
  if (month < 3) n -= 1;                 // 3월 전에는 아직 지난 학년
  if (n <= 0) return '취학 전';
  if (n <= 6) return `초등 ${n}학년`;
  if (n <= 9) return `중학교 ${n - 6}학년`;
  if (n <= 12) return `고등 ${n - 9}학년`;
  return '고등학교 졸업 이후';
}

// 대운 구간의 학령 표시: 학생 시기에만 쓰고, 졸업 이후에는 표시하지 않는다(나이만 쓴다)
const GRAD = '고등학교 졸업 이후';
function schoolRangeText(from, to) {
  if (from === GRAD) return '';
  return to === GRAD ? from + ' 이후' : (from === to ? from : from + '~' + to);
}

// 만 나이(기준일 now, KST 날짜)
function manAge(birth, now) {
  let a = now.year - birth.year;
  if (now.month < birth.month || (now.month === birth.month && now.day < birth.day)) a -= 1;
  return a;
}

const toDateObj = (s) => { const [y, m, d] = s.split('-').map(Number); return { year: y, month: m, day: d }; };
const dateStrOf = (o) => `${o.year}-${pad2(o.month)}-${pad2(o.day)}`;

// solarDate: 양력 'YYYY-MM-DD'(음력 입력은 서버가 먼저 양력으로 바꿔서 넘긴다), birthtime: 'HH:MM' 또는 빈 값
function buildSuccessChildFacts({ gender, solarDate, birthtime, now = new Date() }) {
  if (gender !== '남성' && gender !== '여성') throw new Error('성별이 필요합니다.');
  const birth = toDateObj(String(solarDate));
  if (!birth.year || !birth.month || !birth.day || birth.year < 1920) throw new Error('생년월일을 확인해 주세요.');
  const today = kstParts(now.getTime());
  const calc = calcChildSaju({ gender, birthdate: dateStrOf(birth), birthtime });

  const list = calc.daeun.list;
  const rows = list.map((d, i) => {
    const endYear = i + 1 < list.length ? list[i + 1].startYear - 1 : d.startYear + 9;
    return {
      ...d, endYear,
      ageFrom: d.startYear - birth.year, ageTo: endYear - birth.year,       // 연 나이(해당 연도 − 출생 연도)
      schoolFrom: schoolLabelOfYear(birth, d.startYear), schoolTo: schoolLabelOfYear(birth, endYear),
      schoolRange: schoolRangeText(schoolLabelOfYear(birth, d.startYear), schoolLabelOfYear(birth, endYear)),
    };
  });
  const todayStr = dateStrOf(today);
  let currentIdx = -1;
  rows.forEach((d, i) => { if (todayStr >= d.startDate) currentIdx = i; });

  const age = { man: manAge(birth, today), school: schoolLabelOfYear(birth, today.year, today.month), asOf: todayStr };
  const facts = { calc, age, rows, currentIdx };
  facts.compare = compareDirection(facts);
  facts.text = renderFactsText({ gender, birth, calc, age, rows, currentIdx }) + '\n\n' + renderCompareText(facts.compare) + '\n\n' + renderPlainBlocks(facts);
  return facts;
}

function renderFactsText({ gender, birth, calc, age, rows, currentIdx }) {
  const L = [];
  L.push('[아이 정보 — 서버 계산]');
  L.push(`- 성별: ${gender}`);
  L.push(`- 생년월일(양력): ${dateStrOf(birth)} / 태어난 시간: ${calc.input.timeKnown ? calc.input.birthtime : '미입력'}`);
  L.push(`- 기준일 ${age.asOf} 현재 만 ${age.man}세`);
  L.push('');
  L.push('[사주 계산값 — 서버가 계산한 값]');
  const P = calc.pillars;
  L.push(`- 명식: 년주 ${P.년주} / 월주 ${P.월주} / 일주 ${P.일주} / 시주 ${P.시주 || '미입력(계산하지 않음)'}`);
  L.push(`- 일간: ${calc.dayStem}`);
  const pj = calc.boundary.prevJie.kst, nj = calc.boundary.nextJie.kst;
  L.push(`- 월주 근거: 직전 절입 ${calc.boundary.prevJie.name} ${pj.year}-${pad2(pj.month)}-${pad2(pj.day)} ${pad2(pj.hour)}:${pad2(pj.minute)}(KST), 다음 절입 ${calc.boundary.nextJie.name} ${nj.year}-${pad2(nj.month)}-${pad2(nj.day)} ${pad2(nj.hour)}:${pad2(nj.minute)}`);
  if (calc.boundary.nearBoundary) L.push('- 주의: 출생 시각이 절입 시각과 20분 이내라 월주(또는 년주)가 달라질 수 있는 경계입니다.');
  if (calc.boundary.ambiguousBecauseTimeUnknown) L.push('- 주의: 출생 시간이 없고 그날 절입이 있어 월주를 확정할 수 없습니다.');
  L.push('');
  L.push('[십성 — 일간 기준, 일간 자신 제외]');
  const fmtCounts = (c) => `${['식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인', '비견', '겁재'].filter((g) => c.gods[g]).map((g) => `${g} ${c.gods[g]}`).join(', ') || '없음'} / 그룹: 식상 ${c.groups.식상}, 재성 ${c.groups.재성}, 관성 ${c.groups.관성}, 인성 ${c.groups.인성}, 비겁 ${c.groups.비겁}`;
  L.push(`- 천간·지지 본기 기준(${calc.tenGods.surface.total}글자): ${fmtCounts(calc.tenGods.surface)}`);
  L.push(`- 지장간 포함 기준(${calc.tenGods.withHidden.total}개): ${fmtCounts(calc.tenGods.withHidden)}`);
  L.push('- 위 두 집계는 서로 다른 값입니다. 섞어서 쓰지 말고, 어느 기준인지 밝혀서 쓰세요.');
  for (const p of calc.tenGods.positions) {
    if (p.scope === 'self') L.push(`- ${p.where} ${p.char}: 일간(본인)`);
    else if (p.scope === 'stem') L.push(`- ${p.where} ${p.char}: ${p.god}`);
    else L.push(`- ${p.where} ${p.char}: 본기 ${p.mainStem} ${p.mainGod} / 지장간 ${p.hidden.map((h) => `${h.stem} ${h.god}(${h.role})`).join(', ')}`);
  }
  L.push('');
  L.push('[대운 — 번호(대운1~대운' + Math.min(TEXT_DAEUN_ROWS, rows.length) + ')로 부르고, 연도·나이·십성은 토큰으로만 쓰세요]');
  L.push(`- 방향: ${calc.daeun.forward ? '순행' : '역행'} / 시작: 출생 후 ${calc.daeun.startAge.years}세 ${calc.daeun.startAge.months}개월 ${calc.daeun.startAge.days}일(${calc.daeun.startDate}) — ${calc.daeun.basis}`);
  rows.slice(0, TEXT_DAEUN_ROWS).forEach((d, i) => {
    L.push(`- 대운${i + 1}: ${d.startYear}~${d.endYear}년(${d.ageFrom}~${d.ageTo}세) ${d.ganji}: 천간 ${d.ganji[0]} ${d.stemGod} / 지지 ${d.ganji[1]} 본기 ${d.branchMainStem} ${d.branchMainGod} / 지장간 ${d.branchHidden.map((h) => `${h.stem} ${h.god}`).join(', ')}${i === currentIdx ? ' ← 현재 대운' : ''}`);
  });
  L.push('- 연도 범위는 대운 시작일이 속한 연도부터 10년 단위이며, 시작일은 생일과 절입 계산에 따라 1년 안팎 달라질 수 있습니다.');
  L.push('');
  L.push('[계산하지 않은 항목 — 이 항목은 결과에 쓰지 마세요]');
  L.push('- 신강·신약, 용신, 격국, 신살, 세운(해마다의 운), 지지끼리의 합·충·형·파·해');
  L.push(`- 지장간은 ${calc.tenGods.tableStatus} 표를 따랐습니다. 월주·대운은 절입 시각 기준이며 절입 시각 계산 오차는 약 9분 이내입니다.`);
  return L.join('\n');
}

module.exports = { SUCCESS_CHILD, SUCCESS_CONSENT_VERSION, isProductOrderable, schoolLabelOfYear, manAge, buildSuccessChildFacts };
