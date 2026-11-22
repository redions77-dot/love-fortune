// 자녀운명서(full_child) 전용 사주 계산: 절입 시각 기준 년주·월주, 지장간·십성, 정밀 대운.
// 기존 saju.js(고정 절기일 근사)와 server.js(getDaeun)는 다른 상품이 계속 쓰므로 수정하지 않고, 이 모듈이 별도로 계산한다.
// 용신·신강신약은 계산하지 않는다(전문가 검수 전). 일주·시주는 기존 saju.js 규칙(자정 기준 일주, 23:30부터 자시)을 그대로 쓴다.

const S = require('./saju');
const T = require('./solarTerms');
const J = require('./jijanggan');

const stemChar = (i) => J.STEMS[i];
const branchChar = (i) => J.BRANCHES[i];
const BOUNDARY_WARN_MIN = 20; // 절입 시각 계산 오차(공개 기준값 대조 최대 약 9분)를 고려한 경계 근접 경고 범위

const pad2 = (n) => String(n).padStart(2, '0');
const dateStr = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;

// 년간 index 와 사주 월 순번(寅=1..丑=12)으로 월간 index (五虎遁: 甲己→丙寅, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅)
const monthStemIndex = (yearStemIdx, seq) => ([2, 4, 6, 8, 0, 2, 4, 6, 8, 0][yearStemIdx] + (seq - 1)) % 10;

// 달력 단위 덧셈(년·월·일)
function addYMD(y, m, d, dy, dm, dd) {
  const t = new Date(Date.UTC(y + dy, m - 1 + dm, d + dd));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

// birthdate 'YYYY-MM-DD'(양력), birthtime 'HH:MM' 또는 빈 값, gender '남성'|'여성'
function calcChildSaju({ gender, birthdate, birthtime, table = J.DEFAULT_TABLE }) {
  const [y, mo, d] = String(birthdate).split('-').map(Number);
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(birthtime || '').trim());
  const timeKnown = !!(m && Number(m[1]) <= 23 && Number(m[2]) <= 59);
  const hh = timeKnown ? Number(m[1]) : 12, mi = timeKnown ? Number(m[2]) : 0; // 시간 미입력이면 정오로 두고 경계 여부를 따로 표시한다
  const birthMs = T.kstToMs(y, mo, d, hh, mi);

  const { prev, next, sajuYear } = T.termAt(birthMs);
  const yearP = S.get년주(sajuYear);
  const monthStemIdx = monthStemIndex(yearP.천간index, prev.seq);
  const monthBranchIdx = prev.branch;
  const dayP = S.get일주(dateStr(y, mo, d));
  const hourStr = timeKnown ? S.get시주(`${pad2(hh)}:${pad2(mi)}`, dayP.천간index) : null;

  const strip = (s) => (s ? s.replace(/[가-힣]/g, '') : null);
  const pillars = {
    년주: strip(yearP.간지), 월주: stemChar(monthStemIdx) + branchChar(monthBranchIdx), 일주: strip(dayP.간지), 시주: strip(hourStr),
  };
  const dayStem = pillars.일주[0];

  // 경계 근접: 직전·다음 절입과의 거리(분). 시간 미입력이면 같은 날 절입이 있으면 '확정 불가'
  const minToPrev = (birthMs - prev.ms) / 60000, minToNext = (next.ms - birthMs) / 60000;
  const sameDayJie = !timeKnown && (T.kstParts(prev.ms).day === d && T.kstParts(prev.ms).month === mo || T.kstParts(next.ms).day === d && T.kstParts(next.ms).month === mo);
  const boundary = {
    prevJie: { name: prev.name, kst: T.kstParts(prev.ms) }, nextJie: { name: next.name, kst: T.kstParts(next.ms) },
    nearBoundary: timeKnown ? Math.min(minToPrev, minToNext) <= BOUNDARY_WARN_MIN : false,
    ambiguousBecauseTimeUnknown: sameDayJie,
  };

  // ── 십성 집계: 위치별 목록 + 두 가지 집계(천간·지지 본기 / 지장간 포함)를 분리한다 ──
  const cols = [['년주', pillars.년주], ['월주', pillars.월주], ['일주', pillars.일주], ['시주', pillars.시주]].filter(([, p]) => p);
  const positions = [];
  const surface = J.emptyCounts(), withHidden = J.emptyCounts();
  for (const [name, p] of cols) {
    const stem = p[0], branch = p[1];
    if (!(name === '일주')) {
      const god = J.tenGod(dayStem, stem);
      positions.push({ where: name + ' 천간', char: stem, god, scope: 'stem' });
      J.addTo(surface, god); J.addTo(withHidden, god);
    } else positions.push({ where: '일주 천간', char: stem, god: '일간(본인)', scope: 'self' });
    const hidden = J.hiddenStems(branch, table).map((h) => ({ ...h, god: J.tenGod(dayStem, h.stem) }));
    const main = hidden.find((h) => h.role === '정기');
    positions.push({ where: name + ' 지지', char: branch, mainStem: main.stem, mainGod: main.god, hidden, scope: 'branch' });
    J.addTo(surface, main.god);
    hidden.forEach((h) => J.addTo(withHidden, h.god));
  }

  // ── 정밀 대운 ──
  const yearYang = ['甲', '丙', '戊', '庚', '壬'].includes(stemChar(yearP.천간index));
  const male = gender === '남성';
  const forward = (yearYang && male) || (!yearYang && !male);
  const target = forward ? next : prev;
  const diffDays = Math.abs(target.ms - birthMs) / 86400000;
  const yearsFloat = diffDays / 3;                          // 3일 = 1년
  const sy = Math.floor(yearsFloat);
  const monthsFloat = (yearsFloat - sy) * 12;
  const sm = Math.floor(monthsFloat);
  const sd = Math.round((monthsFloat - sm) * 30);
  const start = addYMD(y, mo, d, sy, sm, sd);
  const daeun = [];
  for (let i = 0; i < 8; i++) {
    const stemIdx = forward ? (monthStemIdx + 1 + i) % 10 : ((monthStemIdx - 1 - i) % 10 + 10) % 10;
    const branchIdx = forward ? (monthBranchIdx + 1 + i) % 12 : ((monthBranchIdx - 1 - i) % 12 + 12) % 12;
    const s = stemChar(stemIdx), b = branchChar(branchIdx);
    const from = addYMD(start.year, start.month, start.day, i * 10, 0, 0);
    const hidden = J.hiddenStems(b, table).map((h) => ({ ...h, god: J.tenGod(dayStem, h.stem) }));
    daeun.push({
      ganji: s + b, startDate: dateStr(from.year, from.month, from.day), startYear: from.year, startAgeYears: sy + i * 10,
      stemGod: J.tenGod(dayStem, s), branchMainStem: hidden.find((h) => h.role === '정기').stem, branchMainGod: hidden.find((h) => h.role === '정기').god, branchHidden: hidden,
    });
  }

  return {
    input: { gender, birthdate, birthtime: timeKnown ? `${pad2(hh)}:${pad2(mi)}` : '', timeKnown },
    pillars, dayStem, sajuYear, boundary,
    tenGods: { table, tableStatus: J.HIDDEN_STEM_TABLES[table].status, positions, surface, withHidden },
    daeun: { forward, basis: forward ? `출생 후 첫 절입(${target.name})까지` : `출생 전 마지막 절입(${target.name})까지`, diffDays: Math.round(diffDays * 1000) / 1000, startAge: { years: sy, months: sm, days: sd }, startDate: dateStr(start.year, start.month, start.day), list: daeun },
    notes: [
      '용신·신강신약은 계산하지 않았다.',
      '십성 집계는 천간·지지 본기(surface)와 지장간 포함(withHidden) 두 가지이며 서로 다른 값이다. 개수만으로 능력이나 미래를 확정하지 않는다.',
      '절입 시각은 천문 계산(공개 기준값 36개 대조 오차 약 9분 이내)이고 KST 기준이다. 써머타임과 과거 표준시 변경은 반영하지 않았다.',
      '일주는 자정 기준, 시주는 23:30부터 자시로 보는 기존 규칙을 따른다.',
    ],
  };
}

module.exports = { calcChildSaju, BOUNDARY_WARN_MIN, monthStemIndex };
