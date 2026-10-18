// 무료 분석(/api/analyze) 요청 본문 검증. AI를 부르기 전에 필드 타입을 확인해, 잘못된 요청은 4xx로 끝낸다.
// 문자열이어야 하는 필드에 숫자·객체·배열 등이 오면 이후 .trim() 같은 호출에서 예외가 나므로 여기서 막는다.
// 필드별 최대 길이. 넘는 부분은 잘라서 쓴다(주문 입력 검증 str()과 같은 방식).
const STRING_FIELDS = {
  gender: 10, maritalStatus: 20, birthdate: 10, birthtime: 5, mbti: 4, blood: 2, type: 10, userName: 30, previousText: 12000,
  partnerGender: 10, partnerBirthdate: 10, partnerBirthtime: 5, myName: 30, partnerName: 30, 관계유형: 10, 내역할: 4,
};
const BOOL_FIELDS = ['isLunar', 'partnerIsLunar'];
const toBool = (v) => v === true || v === 'true' || v === '1' || v === 1;

const MIN_YEAR = 1900;
const BAD_DATE = '생년월일을 확인해주세요.';
const BAD_TIME = '태어난 시간을 확인해주세요.';
const BAD_REQUEST = '요청 형식이 올바르지 않아요. 페이지를 새로고침한 뒤 다시 시도해주세요.';

// YYYY-MM-DD 형식이고 실제 있는 날짜인지 확인한다. 음력은 달 길이를 알 수 없어 일 1~30만 본다.
function isRealDate(s, lunar) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (y < MIN_YEAR || y > new Date().getFullYear() || mo < 1 || mo > 12 || d < 1) return false;
  return d <= (lunar ? 30 : new Date(Date.UTC(y, mo, 0)).getUTCDate());
}
function isRealTime(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return !!m && Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

// 반환: { ok: true, value } 또는 { ok: false, status, error }
function parseFreeAnalysisBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, status: 400, error: BAD_REQUEST };
  const value = {};
  for (const [key, max] of Object.entries(STRING_FIELDS)) {
    const v = body[key];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'string') return { ok: false, status: 400, error: BAD_REQUEST };
    value[key] = v.trim().slice(0, max);
  }
  for (const key of BOOL_FIELDS) if (body[key] !== undefined) value[key] = toBool(body[key]);
  // 비어 있는 값은 기존처럼 이후 단계(생년월일 필수 안내, 시각 미입력 처리)에 맡기고, 값이 있을 때만 형식을 본다.
  if (value.birthdate && !isRealDate(value.birthdate, value.isLunar)) return { ok: false, status: 400, error: BAD_DATE };
  if (value.partnerBirthdate && !isRealDate(value.partnerBirthdate, value.partnerIsLunar)) return { ok: false, status: 400, error: BAD_DATE };
  if (value.birthtime && !isRealTime(value.birthtime)) return { ok: false, status: 400, error: BAD_TIME };
  if (value.partnerBirthtime && !isRealTime(value.partnerBirthtime)) return { ok: false, status: 400, error: BAD_TIME };
  return { ok: true, value };
}

module.exports = { parseFreeAnalysisBody, STRING_FIELDS, BAD_REQUEST };
