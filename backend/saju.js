// 사주 계산(년·월·일·시주)과 AI에게 전달하는 "검증된 계산값 표".
// AI가 오행·음양·상생상극을 임의로 만들어 설명하지 않도록, 서버가 계산한 값과 대응표만 근거로 쓰게 한다.

const 천간 = ['甲갑', '乙을', '丙병', '丁정', '戊무', '己기', '庚경', '辛신', '壬임', '癸계'];
const 지지 = ['子자', '丑축', '寅인', '卯묘', '辰진', '巳사', '午오', '未미', '申신', '酉유', '戌술', '亥해'];

// 1900-01-01 = 甲戌일 을 기준으로 날짜 차이로 일주를 구한다.
function get일주(birthdate) {
  const 기준일 = new Date('1900-01-01');
  const 날짜 = new Date(birthdate);
  const 차이 = Math.round((날짜 - 기준일) / (1000 * 60 * 60 * 24));
  const 천간index = ((차이) % 10 + 10) % 10;
  const 지지index = ((10 + 차이) % 12 + 12) % 12;
  return { 간지: 천간[천간index] + 지지[지지index], 천간index };
}

function get년주(year) {
  const 차이 = year - 1984;
  const 천간index = ((차이) % 10 + 10) % 10;
  const 지지index = ((차이) % 12 + 12) % 12;
  return { 간지: 천간[천간index] + 지지[지지index], 천간index };
}

// 절기(월의 시작)는 월별 고정일로 근사한다. 실제 절기 시각이 하루 정도 다른 해에는 경계일(입춘·입하 등 전후 하루)이 어긋날 수 있다.
const 절기시작일 = [6, 4, 6, 5, 6, 6, 7, 7, 8, 8, 7, 7];
function getSajuMonth(month, day) {
  if (day < 절기시작일[month - 1]) return month <= 1 ? 12 : month - 1;
  return month;
}

function get월주(year, month, day, 년천간index) {
  const 양력month = getSajuMonth(month, day);
  const 양력월지지 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];
  const 양력월사주순번 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const 월지index = 양력월지지[양력month - 1];
  const 사주순번 = 양력월사주순번[양력month - 1];
  const 월간시작표 = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
  const 월간index = (월간시작표[년천간index] + (사주순번 - 1)) % 10;
  return 천간[월간index] + 지지[월지index];
}

// 시주 — 30분 이동 기준(자시 시작 23:30). 시와 분을 모두 쓴다.
//   子 23:30~01:29, 丑 01:30~03:29, 寅 03:30~05:29, 卯 05:30~07:29, 辰 07:30~09:29, 巳 09:30~11:29,
//   午 11:30~13:29, 未 13:30~15:29, 申 15:30~17:29, 酉 17:30~19:29, 戌 19:30~21:29, 亥 21:30~23:29
// (이전에는 분을 무시해 각 구간 마지막 30분, 예: 07:30~07:59 가 앞 시로 계산되었다.)
// 시간 형식이 올바르지 않으면 null (시간 미입력과 같이 처리).
function get시지index(birthtime) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(birthtime || '').trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return Math.floor(((h * 60 + min + 30) % 1440) / 120);
}
function get시주(birthtime, 일천간index) {
  const 시지index = get시지index(birthtime);
  if (시지index === null) return null;
  const 시간시작표 = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
  const 시천간index = (시간시작표[일천간index] + 시지index) % 10;
  return 천간[시천간index] + 지지[시지index];
}

// ── 오행·음양 대응표 (AI에게 그대로 전달) ──
const 간오행 = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' };
const 지오행 = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' };
const 간음양 = { 甲: '양', 乙: '음', 丙: '양', 丁: '음', 戊: '양', 己: '음', 庚: '양', 辛: '음', 壬: '양', 癸: '음' };
const 지음양 = { 子: '양', 丑: '음', 寅: '양', 卯: '음', 辰: '양', 巳: '음', 午: '양', 未: '음', 申: '양', 酉: '음', 戌: '양', 亥: '음' };
const 상생 = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
const 상극 = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
const 쉬운오행 = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' };
const 한자간 = '甲乙丙丁戊己庚辛壬癸';
const 한자지 = '子丑寅卯辰巳午未申酉戌亥';

// "丙병申신" 같은 문자열에서 천간·지지 한자를 읽는다. 없으면 null.
function parsePillar(str) {
  if (!str || str === '-') return null;
  const gan = [...str].find(c => 한자간.includes(c));
  const ji = [...str].find(c => 한자지.includes(c));
  return gan && ji ? { gan, ji } : null;
}

// 일간(나)의 오행 X 와 다른 글자의 오행 Y 의 관계를 쉬운 말로
function 관계말(X, Y) {
  if (X === Y) return '나와 같은 기운';
  if (상생[Y] === X) return '나를 도와주는 기운';
  if (상생[X] === Y) return '내가 키워주는 기운(내 에너지를 쓰는 쪽)';
  if (상극[X] === Y) return '내가 다루는 기운';
  if (상극[Y] === X) return '나를 누르는 기운';
  return '';
}

const 규칙문 = `[설명 규칙]
- 위 [사주 계산값]에 없는 오행·음양·합·충·십성·신살은 설명하지 마세요. 오행 관계는 아래 표와 계산값에 있는 것만 쓰세요.
- 상생: 나무→불→흙→쇠→물→나무 / 상극: 나무→흙→물→불→쇠→나무
- 고객에게는 한자 대신 '나무 기운, 불 기운, 흙 기운, 쇠 기운, 물 기운'처럼 쉬운 말로 설명하세요.
- 기운이 이렇다고 해서 성향이 '그래서 생긴다'고 단정하지 말고 "~로 읽을 수 있어요", "~한 경향으로 볼 수 있어요"처럼 쓰세요.`;

// pillars: { 년주, 월주, 일주, 시주 } (calcSaju 결과 형식). label: 표 머리말(예: '나', '상대방')
function factsBlock(pillars, label = '') {
  const rows = [['년주', pillars.년주], ['월주', pillars.월주], ['일주', pillars.일주], ['시주', pillars.시주]];
  const lines = [];
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  let n = 0;
  for (const [name, str] of rows) {
    const p = parsePillar(str);
    if (!p) { lines.push(`- ${name}: 출생 시간 미입력(계산하지 않음)`); continue; }
    lines.push(`- ${name} ${p.gan}${p.ji}: 윗글자 ${p.gan}(${쉬운오행[간오행[p.gan]]} 기운, ${간음양[p.gan]}) / 아랫글자 ${p.ji}(${쉬운오행[지오행[p.ji]]} 기운, ${지음양[p.ji]})`);
    counts[간오행[p.gan]]++; counts[지오행[p.ji]]++; n += 2;
  }
  const day = parsePillar(pillars.일주);
  const out = [`[사주 계산값${label ? ' — ' + label : ''} · 서버가 계산한 검증된 값]`, ...lines];
  if (day) {
    const X = 간오행[day.gan];
    out.push(`- 일간(나를 대표하는 글자): ${day.gan} = ${쉬운오행[X]} 기운, ${간음양[day.gan]}`);
    out.push(`- 오행 분포(${n}글자): ${Object.keys(counts).map(k => `${쉬운오행[k]} ${counts[k]}`).join(' · ')}`);
    const rel = [];
    for (const [name, str] of rows) {
      if (name === '일주') continue;
      const p = parsePillar(str);
      if (!p) continue;
      rel.push(`${name} 윗글자 ${p.gan}=${관계말(X, 간오행[p.gan])}, ${name} 아랫글자 ${p.ji}=${관계말(X, 지오행[p.ji])}`);
    }
    out.push(`- 일간 기준 다른 글자의 기운: ${rel.join(' / ')}`);
    out.push(`- 일주 아랫글자 ${day.ji}=${관계말(X, 지오행[day.ji])}`);
  }
  return out.join('\n');
}

module.exports = { 천간, 지지, 절기시작일, get일주, get년주, get월주, get시주, get시지index, 간오행, 지오행, 상생, 상극, 쉬운오행, parsePillar, 관계말, 규칙문, factsBlock };
