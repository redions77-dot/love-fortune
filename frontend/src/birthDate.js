// 생년월일 입력이 실제로 있는 날짜인지 확인한다. (없는 날짜를 그대로 보내면 서버가 다음 달 날짜로 조용히 바꿔 계산한다.)
// 양력: 달마다 마지막 날과 윤년까지 확인한다. 음력: 달 길이(29·30일)를 알려면 음력표가 필요해 월 1~12·일 1~30 범위만 확인한다.
export const MIN_BIRTH_YEAR = 1900
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()
export function isRealBirthDate(year, month, day, { lunar = false, now = new Date() } = {}) {
  const ys = String(year), y = Number(year), m = Number(month), d = Number(day)
  if (!/^\d{4}$/.test(ys) || !Number.isInteger(m) || !Number.isInteger(d)) return false
  if (y < MIN_BIRTH_YEAR || y > now.getFullYear()) return false
  if (m < 1 || m > 12 || d < 1) return false
  return d <= (lunar ? 30 : daysInMonth(y, m))
}
export const BAD_DATE_MESSAGE = '존재하지 않는 날짜예요. 년·월·일을 다시 확인해주세요.'
// 년·월·일을 모두 입력했는데 날짜가 맞지 않을 때만 안내를 보여 준다(입력 도중에는 조용히).
export const showBadDate = (year, month, day, opts) => String(year).length === 4 && month !== '' && day !== '' && !isRealBirthDate(year, month, day, opts)
