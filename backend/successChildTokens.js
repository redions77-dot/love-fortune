// 서버가 확정한 값만 결과지 문장에 들어가게 하는 토큰.
// AI는 연도·나이·학령·대운 십성을 직접 쓰지 않고 {대운3}, {대운3.천간십성} 같은 토큰으로만 쓴다. 서버가 계산값으로 바꿔 넣으므로 연도와 십성이 서로 엉킬 수 없다.
// 이 파일은 AI를 호출하지 않는다.

const PERIOD_ROWS = 6;   // 계산값 블록과 토큰이 다루는 대운 수(AI에게 보여 주는 범위)

const rowOf = (facts, k) => (k >= 1 && k <= Math.min(PERIOD_ROWS, facts.rows.length) ? facts.rows[k - 1] : null);
const rangeText = (r) => `${r.startYear}~${r.endYear}년`;
const ageText = (r) => `${r.ageFrom}~${r.ageTo}세`;
const WEALTH = ['편재', '정재'];

// 한 대운이 가진 십성들: 천간 하나, 지지 본기 하나, 지장간 여러 개
function godsOfRow(r) {
  const branch = new Set([r.branchMainGod, ...r.branchHidden.map((h) => h.god)]);
  return { stem: r.stemGod, branch, all: new Set([r.stemGod, ...branch]) };
}

// 대운 천간의 재성 등장 시기를 계산 범위와 함께 밝히는 확정 문장
function wealthSentence(facts) {
  const rows = facts.rows.slice(0, PERIOD_ROWS);
  const scope = `10년 단위로 바뀌는 운(대운)은 ${rows.length}개(${rows[0].ageFrom}~${rows[rows.length - 1].ageTo}세)입니다.`;
  const hit = rows.filter((r) => WEALTH.includes(r.stemGod));
  if (!hit.length) return `${scope} 그중 겉으로 드러난 운에는 돈과 거래의 운이 나타나지 않습니다.`;
  const WORD = { 편재: '움직이는 돈의 흐름', 정재: '쌓이는 돈의 흐름' };
  // 시기가 하나면 한 문장, 둘 이상이면 시기마다 한 문장으로 끊어 휴대전화로 읽기 쉽게 한다(연도·나이·뜻은 그대로)
  if (hit.length === 1) return `${scope} 그중 겉으로 드러난 운에서 돈과 거래의 운이 들어오는 시기는 ${rangeText(hit[0])}(${ageText(hit[0])}) ${WORD[hit[0].stemGod]}입니다.`;
  return `${scope} 그중 겉으로 드러난 운에서 돈과 거래의 운이 들어오는 시기는 다음과 같습니다. ${hit.map((r) => `${rangeText(r)}(${ageText(r)})은 ${WORD[r.stemGod]}입니다.`).join(' ')}`;
}

// 속에서 받치는 운(대운 지지 본기)에 재성이 나타나는 시기. 겉으로 드러난 운과 따로 알려 준다.
function innerWealthSentence(facts) {
  const rows = facts.rows.slice(0, PERIOD_ROWS);
  const hit = rows.filter((r) => WEALTH.includes(r.branchMainGod));
  if (!hit.length) return '속에서 받치는 운에는 돈의 흐름이 따로 들어오지 않습니다.';
  const WORD = { 편재: '움직이는 돈의 흐름', 정재: '쌓이는 돈의 흐름' };
  return `속에서 받치는 운에는 ${hit.map((r) => `${rangeText(r)}(${ageText(r)}) ${WORD[r.branchMainGod]}`).join(', ')}이 들어옵니다.`;
}

const FIELDS = {
  연도: (r) => rangeText(r),
  나이: (r) => ageText(r),
  간지: (r) => r.ganji,
  천간: (r) => r.ganji[0],
  천간십성: (r) => r.stemGod,
  지지십성: (r) => r.branchMainGod,
};

// 토큰 이름 → 값. 모르는 이름이면 null.
function tokenValue(facts, name) {
  if (name === '현재나이') return `만 ${facts.age.man}세`;
  if (name === '현재학령') return facts.age.school;
  if (name === '재성대운') return wealthSentence(facts);
  if (name === '재성속운') return innerWealthSentence(facts);
  const m = /^대운(\d)(?:\.([가-힣]+))?$/.exec(name);
  if (!m) return null;
  const r = rowOf(facts, Number(m[1]));
  if (!r) return null;
  if (!m[2]) return `${rangeText(r)}(${ageText(r)})`;
  return FIELDS[m[2]] ? FIELDS[m[2]](r) : null;
}

const TOKEN_RE = /\{([^{}\n]{1,20})\}/g;

// 텍스트의 토큰을 계산값으로 바꾼다. unknown 은 바꾸지 못한 토큰 이름들.
function expandTokens(text, facts) {
  const unknown = [];
  const out = String(text).replace(TOKEN_RE, (all, name) => { const v = tokenValue(facts, name.trim()); if (v === null) { unknown.push(name); return all; } return v; });
  return { text: out, unknown };
}

module.exports = { innerWealthSentence, PERIOD_ROWS, WEALTH, TOKEN_RE, rowOf, godsOfRow, wealthSentence, tokenValue, expandTokens, rangeText, ageText };
