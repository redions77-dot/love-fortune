// 무료 분석(/api/analyze) 요청 본문 검증. AI를 부르기 전에 필드 타입을 확인해, 잘못된 요청은 4xx로 끝낸다.
// 문자열이어야 하는 필드에 숫자·객체·배열 등이 오면 이후 .trim() 같은 호출에서 예외가 나므로 여기서 막는다.
const STRING_FIELDS = [
  'gender', 'maritalStatus', 'birthdate', 'birthtime', 'mbti', 'blood', 'type', 'userName', 'previousText',
  'partnerGender', 'partnerBirthdate', 'partnerBirthtime', 'myName', 'partnerName', '관계유형', '내역할',
];
const BOOL_FIELDS = ['isLunar', 'partnerIsLunar'];
const toBool = (v) => v === true || v === 'true' || v === '1' || v === 1;

const BAD_REQUEST = '요청 형식이 올바르지 않아요. 페이지를 새로고침한 뒤 다시 시도해주세요.';

// 반환: { ok: true, value } 또는 { ok: false, status, error }
function parseFreeAnalysisBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, status: 400, error: BAD_REQUEST };
  const value = {};
  for (const key of STRING_FIELDS) {
    const v = body[key];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'string') return { ok: false, status: 400, error: BAD_REQUEST };
    value[key] = v;
  }
  for (const key of BOOL_FIELDS) if (body[key] !== undefined) value[key] = toBool(body[key]);
  return { ok: true, value };
}

module.exports = { parseFreeAnalysisBody, STRING_FIELDS, BAD_REQUEST };
