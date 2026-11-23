// '우리 아이 성공사주' 화면의 순수 로직: 경로 판별, 입력 검사, 가격 표시, 결제 복귀 주소 해석, 안내 문구.
// 가격과 할인은 서버가 정한다. 여기 값은 화면 표시용이며, 결제 직전에 서버가 만든 주문 금액과 같은지 다시 확인한다(isSameAmount).

export const SUCCESS_PATH = '/success-saju'
export const PRODUCT_KEY = 'success_child'
export const PRODUCT_NAME = '우리 아이 성공운명서'
export const REPORT_NAME = '우리 아이 성공운명서'
export const LIST_AMOUNT = 50000   // 판매가(표시용). 서버가 만든 주문 금액이 최종 기준이다.
export const MIN_BIRTH_YEAR = 1920

export const isSuccessSajuPath = (pathname) => String(pathname || '').replace(/\/+$/, '') === SUCCESS_PATH
// 홈(/)도 이 판매 화면을 연다. 주소에 값(?policy=… 정책 화면, 기존 결제 복귀 등)이 붙어 있으면 기존 앱이 처리한다.
export const isSuccessHome = (pathname, search) => isSuccessSajuPath(pathname) || (String(pathname || '').replace(/\/+$/, '') === '' && String(search || '').replace(/^\?/, '') === '')

export const formatWon = (n) => `${Number(n).toLocaleString('ko-KR')}원`

// 결제 직전 안전 확인: 화면에 보여 준 금액과 서버가 만든 주문 금액이 같아야 결제창을 연다.
export const isSameAmount = (shown, orderAmount) => Number(shown) === Number(orderAmount)

const pad2 = (n) => String(n).padStart(2, '0')
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

export function isValidDateStr(s, today = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''))
  if (!m) return false
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  if (y < MIN_BIRTH_YEAR) return false
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return false
  return String(s) <= todayStr(today)
}
export const isValidTimeStr = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); return !!m && Number(m[1]) <= 23 && Number(m[2]) <= 59 }
export const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim())

// 입력 검사. 오류가 없으면 {}.
export function validateForm({ gender, birthdate, birthtime, timeUnknown, email }, today = new Date()) {
  const e = {}
  if (gender !== '남성' && gender !== '여성') e.gender = '성별을 선택해 주세요.'
  if (!isValidDateStr(birthdate, today)) e.birthdate = `${MIN_BIRTH_YEAR}년 이후의 올바른 생년월일을 입력해 주세요.`
  if (!timeUnknown && String(birthtime || '').trim() && !isValidTimeStr(birthtime)) e.birthtime = '출생 시간을 다시 확인해 주세요.'
  if (!isValidEmail(email)) e.email = '인증에 쓸 이메일 주소를 입력해 주세요.'
  return e
}

// 서버 주문 입력. 양력 기준만 받는다(음력·윤달 입력은 없다). 출생 시간을 모르면 빈 값으로 보낸다.
export function buildOrderInput({ gender, birthdate, birthtime, timeUnknown, userName }) {
  return { gender, birthdate, birthtime: timeUnknown ? '' : String(birthtime || '').trim(), isLunar: false, userName: String(userName || '').trim().slice(0, 30) }
}

export function birthSummary({ birthdate, birthtime, timeUnknown }) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthdate || ''))
  const date = m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : ''
  const time = timeUnknown || !String(birthtime || '').trim() ? '출생 시간 모름' : `${Number(birthtime.slice(0, 2))}시 ${Number(birthtime.slice(3, 5))}분`
  return `${date} (양력) · ${time}`
}

// 결제 금액 표시. 체험 코드가 없으면 판매가 50,000원, 서버가 유효하다고 확인한 체험 코드면 0원(무료 체험)을 보여 준다. 정상가 앵커·취소선·할인율은 쓰지 않는다.
export function priceView(applied) {
  return applied
    ? { amount: applied.amount, label: '무료 체험', note: `판매가 ${formatWon(applied.listAmount ?? LIST_AMOUNT)}`, discounted: true }
    : { amount: LIST_AMOUNT, label: '결제 금액', note: '', discounted: false }
}

// 모바일 결제 후 복귀 주소(?imp_uid=…&merchant_uid=…&imp_success=true)를 해석한다. 성공사주 주문번호(success_…)만 인정한다.
export function parseReturnParams(search) {
  const q = new URLSearchParams(search || '')
  const merchantUid = q.get('merchant_uid') || ''
  if (!/^success_\d+_[0-9a-f]{12}$/.test(merchantUid)) return null
  const impSuccess = q.get('imp_success')
  const ok = impSuccess === 'true' || q.get('success') === 'true'
  return { merchantUid, impUid: q.get('imp_uid') || '', success: ok && /^imp_[0-9A-Za-z]{6,40}$/.test(q.get('imp_uid') || '') }
}

// 결제 전 확인 문구(주문에 확인한 사실로 기록된다. 문구를 바꾸면 backend/successChild.js 의 SUCCESS_CONSENT_VERSION 도 바꾼다)
// 생성형 AI 사용 고지(구매 전 판매 화면과 결제 전 확인에 표시, 결과 화면·이메일에는 backend 의 AI_NOTICE 가 표시된다). 전달 항목은 backend/successChild.js 의 계산값 블록에 실제로 들어가는 항목이다.
export const AI_NOTICE_LANDING = '결과지의 해석 문장은 생성형 AI가 작성합니다. 사주 값은 서버가 계산하고, AI는 그 값을 바탕으로 해석을 씁니다.'
export const AI_NOTICE_CONSENT = '이 결과지의 해석 문장은 생성형 AI가 작성합니다. 입력하신 성별·생년월일·태어난 시간(이름과 이메일은 제외)이 AI 처리를 위해 미국의 AI 서비스 제공사(Anthropic)로 국외 이전됩니다.'

export const CONSENT_LINES = [
  '결제가 확인되면 결과지가 바로 작성되며, 보통 1~2분 걸립니다. 결과지는 이 화면에서 바로 확인하며, 이메일로는 발송되지 않습니다. 나중에는 홈페이지의 ‘내 결과지 다시 보기’에서 이메일 인증 후 무료로 다시 볼 수 있습니다.',
  AI_NOTICE_CONSENT,
  '결과지는 결제 즉시 작성되는 디지털 콘텐츠로, 작성이 시작되면 청약철회가 제한됩니다. 다만 시스템 오류로 결과지가 제공되지 않은 경우, 중복 결제, 표시·광고와 다르게 제공된 경우 등 법령이 정한 사유에는 환불됩니다.',
  '이 결과지는 전통 명리학의 해석이며, 합격·직업·소득·재산·사업 성공을 보장하거나 예측하지 않습니다.',
  '만 14세 미만 아이의 정보는 보호자(법정대리인)가 입력하며, 보호자는 위 안내와 개인정보처리방침에 따라 아이 정보의 처리에 동의합니다.',
]
// 결제창(PG)에 넘기는 구매자 이름. 아이 이름은 결제사에 전달하지 않는다.
export const BUYER_NAME = '고객'

// 결과지 샘플 화면 안내(실제 결과지의 문장은 입력 정보에 따라 달라진다는 점)
export const SAMPLE_NOTICE = '지금 보고 계신 결과지는 가상 인물의 샘플입니다. 핵심 결론과 공부운 일부를 미리 보여드립니다. 전체 결과지에는 추천 직업 3가지, 사업 분야 3가지, 재물운, 시기별 해석과 부모가 실천할 수 있는 내용이 담겨 있습니다. 실제 결과는 입력하신 아이의 생년월일시에 따라 달라집니다.'

export const CONSENT_CHECK_LABEL = '위 안내를 모두 확인했습니다.'

export const LANDING_ITEMS = [
  ['공부운', '우리 아이에게 어울리는 공부 방법과 과목별 실천법'],
  ['직업운', '눈여겨볼 직업 3가지와 추천 이유, 아이에게 권할 경험'],
  ['사업운', '살펴볼 만한 사업 분야 3가지와 필요한 능력, 생활 속 실천법'],
  ['재물운', '돈을 벌고 관리하는 방식, 재물운이 나타나는 시기'],
  ['시기별 운', '10대·20대·30대 이후, 나이와 연도로 살펴보는 운의 변화'],
]
export const LANDING_PARENT = '아이의 가능성을 살펴보는 데서 끝나지 않습니다. 부모가 지금 아이와 함께 해볼 수 있는 일까지 담았습니다.'
export const LANDING_NOTICES = [
  '전통 명리학의 해석이며, 의학적·과학적으로 검증된 예측이 아닙니다.',
  '합격, 직업, 소득, 성공 여부를 단정하거나 보장하지 않습니다.',
  '생년월일, 성별, 출생 시간만 사용합니다. MBTI나 적성 설문은 없습니다.',
  '계산된 값과 전통 해석을 구분해 결과지에 표시합니다.',
  AI_NOTICE_LANDING,
]
