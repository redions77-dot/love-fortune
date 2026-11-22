// 12절(節) 절입 시각 정밀 계산 — 월주·입춘(년주 경계)·대운 시작 시기에 쓴다. (자녀운명서 계산 전용 모듈)
// 태양 황경(Meeus, Astronomical Algorithms ch.25 저정밀식 + 장동·광행차 보정)이 절의 황경에 닿는 순간을 이분법으로 찾는다.
// 기존 saju.js 의 '월별 고정일' 근사를 대체하는 것이 목적이며, 이 파일은 기존 상품 코드가 가져다 쓰지 않는다.
// 정확도: 공개된 KST 절입 시각(KASI 2024, month2k 2005·2012·2024) 36개와 대조해 오차를 테스트로 고정한다.
// 반환 시각은 UTC 밀리초이고, 사람이 읽는 한국 표준시(KST=UTC+9)는 kstParts()로 바꾼다. 써머타임·1954~61년 UTC+8:30 같은 과거 표준시 변경은 반영하지 않는다.

const KST_MS = 9 * 3600000;

// 12절: 황경, 사주 월 순번(寅월=1 … 丑월=12), 월지 index(子=0 … 亥=11)
const JIE = [
  { name: '소한', lon: 285, seq: 12, branch: 1 },
  { name: '입춘', lon: 315, seq: 1, branch: 2 },
  { name: '경칩', lon: 345, seq: 2, branch: 3 },
  { name: '청명', lon: 15, seq: 3, branch: 4 },
  { name: '입하', lon: 45, seq: 4, branch: 5 },
  { name: '망종', lon: 75, seq: 5, branch: 6 },
  { name: '소서', lon: 105, seq: 6, branch: 7 },
  { name: '입추', lon: 135, seq: 7, branch: 8 },
  { name: '백로', lon: 165, seq: 8, branch: 9 },
  { name: '한로', lon: 195, seq: 9, branch: 10 },
  { name: '입동', lon: 225, seq: 10, branch: 11 },
  { name: '대설', lon: 255, seq: 11, branch: 0 },
];

const rad = (d) => d * Math.PI / 180;
const norm180 = (x) => ((x + 180) % 360 + 360) % 360 - 180;
const toJD = (ms) => ms / 86400000 + 2440587.5;

// ΔT(TT-UT, 초) 근사: Espenak & Meeus 다항식 (1986~2050 구간 위주, 그 밖은 근사)
function deltaT(year) {
  if (year >= 2005 && year < 2050) { const t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
  if (year >= 1986 && year < 2005) { const t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (year >= 1961 && year < 1986) { const t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
  if (year >= 1900 && year < 1961) { const t = year - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (year >= 2050) { const u = (year - 1820) / 100; return -20 + 32 * u * u; }
  return 0;
}

// 겉보기 태양 황경(도). ms: UTC 밀리초
function sunLongitude(ms) {
  const year = new Date(ms).getUTCFullYear();
  const jde = toJD(ms) + deltaT(year) / 86400;
  const T = (jde - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(rad(M)) + (0.019993 - 0.000101 * T) * Math.sin(rad(2 * M)) + 0.000289 * Math.sin(rad(3 * M));
  const omega = 125.04 - 1934.136 * T;
  return (((L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega))) % 360) + 360) % 360;
}

const cache = new Map();
// year(양력 연도) 안에서 태양 황경이 lon 에 닿는 UTC 밀리초
function crossing(year, lon) {
  const key = year + ':' + lon;
  if (cache.has(key)) return cache.get(key);
  const guessDay = ((lon - 280 + 360) % 360) / 0.98565;           // 1월 1일 무렵 황경 ≈ 280°
  const center = Date.UTC(year, 0, 1) + guessDay * 86400000;
  let lo = center - 15 * 86400000, hi = center + 15 * 86400000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (norm180(sunLongitude(mid) - lon) < 0) lo = mid; else hi = mid;
  }
  const r = Math.round((lo + hi) / 2 / 1000) * 1000;
  cache.set(key, r);
  return r;
}

// 해당 양력 연도의 12절(소한~대설) 절입 시각 목록(시간순)
function jieOfYear(year) {
  return JIE.map((j) => ({ ...j, year, ms: crossing(year, j.lon) }));
}

const kstToMs = (y, mo, d, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - KST_MS;
function kstParts(ms) {
  const x = new Date(ms + KST_MS);
  return { year: x.getUTCFullYear(), month: x.getUTCMonth() + 1, day: x.getUTCDate(), hour: x.getUTCHours(), minute: x.getUTCMinutes() };
}

// ms 시점의 월(節 기준)과 사주 년 정보. 직전 절·다음 절도 함께 돌려준다.
function termAt(ms) {
  const y = kstParts(ms).year;
  const list = [...jieOfYear(y - 1), ...jieOfYear(y), ...jieOfYear(y + 1)].sort((a, b) => a.ms - b.ms);
  let i = list.findIndex((t) => t.ms > ms) - 1;
  const prev = list[i], next = list[i + 1];
  // 사주 년: 입춘 이후면 그 입춘이 속한 양력 연도, 이전이면 그 전 연도
  const lichun = list.filter((t) => t.name === '입춘' && t.ms <= ms).pop();
  return { prev, next, sajuYear: lichun.year };
}

module.exports = { JIE, sunLongitude, crossing, jieOfYear, termAt, kstToMs, kstParts, KST_MS };
