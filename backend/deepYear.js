// 심화 분석의 "연운·수비학" 기준 연도. 현재 연도(thisYear)가 아니라 내년을 기준으로 풀이한다.
// 현재 날짜·출생 정보·대운 계산은 이 값을 쓰지 않고 그대로 현재 연도를 쓴다.

// 연도의 각 자리를 더해 한 자리가 될 때까지 줄인다. 계산 과정을 문자열로도 돌려준다.
// 예) 2026 → "2+0+2+6 = 10 → 1+0 = 1" (1), 2027 → "2+0+2+7 = 11 → 1+1 = 2" (2)
function numerologyYear(year) {
  let digits = String(year).split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  let formula = `${digits.join('+')} = ${sum}`;
  while (sum >= 10) {
    digits = String(sum).split('').map(Number);
    sum = digits.reduce((a, b) => a + b, 0);
    formula += ` → ${digits.join('+')} = ${sum}`;
  }
  return { num: sum, formula };
}

// thisYear: 서버의 현재 연도. 반환값의 year 가 심화 풀이(수비학·年運)의 기준 연도다.
function deepYearContext(thisYear) {
  const year = thisYear + 1;
  const { num, formula } = numerologyYear(year);
  return { year, num, formula };
}

module.exports = { numerologyYear, deepYearContext };
