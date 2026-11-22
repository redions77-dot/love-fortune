import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  isSuccessSajuPath, formatWon, isSameAmount, isValidDateStr, isValidTimeStr, isValidEmail, validateForm, buildOrderInput, birthSummary,
  priceView, parseReturnParams, CONSENT_LINES, LANDING_ITEMS, LANDING_NOTICES, LIST_AMOUNT, PRODUCT_NAME, REPORT_NAME, AI_NOTICE_LANDING, AI_NOTICE_CONSENT, LANDING_PARENT, BUYER_NAME, SAMPLE_NOTICE,
} from './successSajuLogic.js'
import { BUSINESS_LINES, POLICY_LINKS, CUSTOMER_CONTACT_URL } from './businessInfo.js'
import sampleReport from './sampleReport.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const today = new Date('2026-11-12T12:00:00+09:00')

test('경로: /success-saju(끝 슬래시 허용)에서만 새 화면, 홈과 다른 주소는 기존 앱', () => {
  for (const p of ['/success-saju', '/success-saju/']) assert.equal(isSuccessSajuPath(p), true, p)
  for (const p of ['/', '', '/admin-bomgyeol-2027', '/success-saju-x', '/x/success-saju', undefined]) assert.equal(isSuccessSajuPath(p), false, String(p))
})

test('가격 표시: 50,000원 단일 판매가, 유효한 체험 코드면 0원(무료 체험), 앵커·취소선·할인율 없음', () => {
  assert.equal(LIST_AMOUNT, 50000)
  assert.equal(formatWon(50000), '50,000원')
  assert.equal(formatWon(30000), '30,000원')
  const plain = priceView(null)
  assert.deepEqual([plain.amount, plain.discounted, plain.note], [50000, false, ''])
  const trial = priceView({ amount: 0, listAmount: 50000 })
  assert.deepEqual([trial.amount, trial.discounted, trial.label, trial.note], [0, true, '무료 체험', '판매가 50,000원'])
  assert.equal(formatWon(0), '0원')
  const shown = JSON.stringify([plain, trial])
  assert.ok(!/100,?000|%|취소선/.test(shown))
  // 결제 직전 금액 대조
  assert.equal(isSameAmount(30000, 30000), true)
  assert.equal(isSameAmount(30000, 50000), false)
  assert.equal(isSameAmount(50000, '50000'), true)
})

test('입력 검사: 성별·생년월일·출생 시간·이메일', () => {
  const ok = { gender: '남성', birthdate: '2012-07-14', birthtime: '20:30', timeUnknown: false, email: 'a@b.com' }
  assert.deepEqual(validateForm(ok, today), {})
  assert.deepEqual(validateForm({ ...ok, birthtime: '', timeUnknown: true }, today), {})
  assert.deepEqual(validateForm({ ...ok, birthtime: '' }, today), {}, '시간은 비워 둘 수 있다')
  assert.ok(validateForm({ ...ok, gender: '' }, today).gender)
  assert.ok(validateForm({ ...ok, gender: '미입력' }, today).gender)
  for (const bad of ['', '2012-13-01', '2012-02-30', '1919-12-31', '2026-11-13', 'abcd', '2012/07/14']) assert.ok(validateForm({ ...ok, birthdate: bad }, today).birthdate, bad)
  assert.equal(isValidDateStr('2026-11-12', today), true)
  assert.equal(isValidDateStr('1920-01-01', today), true)
  assert.ok(validateForm({ ...ok, birthtime: '25:00' }, today).birthtime)
  assert.ok(validateForm({ ...ok, birthtime: '12:60' }, today).birthtime)
  assert.equal(isValidTimeStr('00:00'), true)
  for (const bad of ['', 'a@', 'a@b', 'a b@c.com', '@b.com']) assert.ok(validateForm({ ...ok, email: bad }, today).email, bad)
  assert.equal(isValidEmail('buyer@example.co.kr'), true)
  assert.deepEqual(Object.keys(validateForm({}, today)).sort(), ['birthdate', 'email', 'gender'])
})

test('서버 주문 입력: 양력만, 시간 모름이면 빈 값, 이름은 30자까지, MBTI 등 다른 항목은 없다', () => {
  const input = buildOrderInput({ gender: '여성', birthdate: '2015-03-02', birthtime: ' 07:05 ', timeUnknown: false, userName: ' 가나다 ' })
  assert.deepEqual(input, { gender: '여성', birthdate: '2015-03-02', birthtime: '07:05', isLunar: false, userName: '가나다' })
  assert.equal(buildOrderInput({ gender: '남성', birthdate: '2012-07-14', birthtime: '20:30', timeUnknown: true }).birthtime, '')
  assert.equal(buildOrderInput({ gender: '남성', birthdate: '2012-07-14', userName: 'x'.repeat(50) }).userName.length, 30)
  assert.ok(!('mbti' in input) && !('blood' in input))
})

test('확인 화면 요약 문구', () => {
  assert.equal(birthSummary({ birthdate: '2012-07-14', birthtime: '20:30', timeUnknown: false }), '2012년 7월 14일 (양력) · 20시 30분')
  assert.equal(birthSummary({ birthdate: '2012-07-14', birthtime: '07:05', timeUnknown: false }), '2012년 7월 14일 (양력) · 7시 5분')
  assert.equal(birthSummary({ birthdate: '2012-07-14', birthtime: '', timeUnknown: true }), '2012년 7월 14일 (양력) · 출생 시간 모름')
})

test('모바일 결제 복귀 주소: 성공사주 주문번호만 인정하고, 성공 여부는 imp_success·imp_uid 로 판단한다', () => {
  const oid = 'success_1794388209668_f56551f4cb13'
  assert.deepEqual(parseReturnParams(`?imp_uid=imp_123456789&merchant_uid=${oid}&imp_success=true`), { merchantUid: oid, impUid: 'imp_123456789', success: true })
  assert.deepEqual(parseReturnParams(`?imp_uid=imp_123456789&merchant_uid=${oid}&imp_success=false`), { merchantUid: oid, impUid: 'imp_123456789', success: false })
  assert.equal(parseReturnParams(`?merchant_uid=${oid}&imp_success=true`).success, false, 'imp_uid 가 없으면 성공이 아니다')
  assert.equal(parseReturnParams(`?imp_uid=bad&merchant_uid=${oid}&imp_success=true`).success, false)
  for (const s of ['', '?payment=paid', '?merchant_uid=full_1_abcdef123456&imp_uid=imp_123456789', '?merchant_uid=success_1_zz', undefined]) assert.equal(parseReturnParams(s), null, String(s))
})

test('고객 문구: 다·나·까 문체, 환불·보장 안내, 100,000원·다음 장 문구 없음', () => {
  assert.equal(PRODUCT_NAME, '우리 아이 성공사주')
  assert.equal(REPORT_NAME, '우리 아이 성공운명서')
  assert.equal(CONSENT_LINES.length, 5)
  assert.ok(CONSENT_LINES.some((t) => t.includes('환불')) && CONSENT_LINES.some((t) => t.includes('보장하거나 예측하지 않습니다')))
  // 환불 안내는 기존 환불정책과 같은 취지: 청약철회 제한 + 법정 환불 사유(시스템 오류·중복 결제·표시·광고와 다른 제공)는 환불
  const refund = CONSENT_LINES.find((t) => t.includes('청약철회'))
  assert.ok(refund && /시스템 오류/.test(refund) && /중복 결제/.test(refund) && /표시·광고와 다르게/.test(refund))
  assert.ok(CONSENT_LINES.some((t) => /만 14세 미만/.test(t) && t.includes("보호자(법정대리인)")), '보호자 확인 문구')
  assert.ok(AI_NOTICE_CONSENT.includes('국외 이전') && AI_NOTICE_CONSENT.includes('이름과 이메일은 제외'))
  const texts = [...CONSENT_LINES, ...LANDING_ITEMS.flat(), LANDING_PARENT, ...LANDING_NOTICES]
  for (const t of texts) assert.ok(!/(해요|예요|거든요|죠)[.?!]?$/.test(t), t)
  assert.ok(!texts.join(' ').match(/100,?000|다음 장|할인율|취소선/))
  assert.deepEqual(LANDING_ITEMS.map(([t]) => t), ['공부운', '직업운', '사업운', '재물운', '시기별 운'])
  assert.deepEqual(LANDING_ITEMS.map(([, d]) => d), ['우리 아이에게 어울리는 공부 방법과 과목별 실천법', '눈여겨볼 직업 3가지와 추천 이유, 아이에게 권할 경험', '살펴볼 만한 사업 분야 3가지와 필요한 능력, 생활 속 실천법', '돈을 벌고 관리하는 방식, 재물운이 나타나는 시기', '10대·20대·30대 이후, 나이와 연도로 살펴보는 운의 변화'])
  assert.equal(LANDING_PARENT, '아이의 가능성을 살펴보는 데서 끝나지 않습니다. 부모가 지금 아이와 함께 해볼 수 있는 일까지 담았습니다.')
  assert.ok(!texts.join(' ').match(/구조가 보이는지|학령|학년|보장합니다|성공합니다/), '옛 문구·보장 표현이 없다')
})

test('결과 샘플 미리보기 데이터는 백엔드 결과 빌더가 만든 값과 같다 (결과 화면과 같은 모델)', () => {
  const root = path.join(here, '..', '..', '..', 'backend')
  const { buildSuccessChildFacts } = require(path.join(root, 'successChild.js'))
  const { buildSuccessChildReport, toFreePreview } = require(path.join(root, 'successChildReport.js'))
  const { SAMPLE_INPUT, SAMPLE_REPORT_TEXT } = require(path.join(root, 'successChildSample.js'))
  const facts = buildSuccessChildFacts({ ...SAMPLE_INPUT, now: new Date(SAMPLE_INPUT.now) })
  assert.deepEqual(sampleReport, JSON.parse(JSON.stringify(toFreePreview(buildSuccessChildReport(SAMPLE_REPORT_TEXT, facts, { name: '가상 학생 A' })))))
  assert.equal(sampleReport.name, '가상 학생 A')
  // 무료 공통 샘플: 핵심 결론 + 공부운 첫 문단만. 잠긴 항목의 내용은 데이터에 없다.
  assert.equal(sampleReport.preview, true)
  assert.equal(sampleReport.sections[0].paras.length, 1)
  assert.ok(sampleReport.sections.slice(1).every((s) => s.locked && !s.headline && s.paras.length === 0 && !s.coins))
  assert.equal(sampleReport.periodsLocked, true)
  const raw = JSON.stringify(sampleReport)
  for (const secret of ['웹툰 작가', '제과제빵사', '공인중개사', '동네 베이커리', '용돈과 세뱃돈', '식상생재']) assert.ok(!raw.includes(secret), secret)
})

test('결과 화면: 비교 박스·예시 목록·한 줄 요약·장면·잠금 표시가 있고, 디자인 색 변수만 쓴다', () => {
  const jsx = fs.readFileSync(path.join(here, 'SuccessReport.jsx'), 'utf8')
  const css = fs.readFileSync(path.join(here, 'successSaju.css'), 'utf8')
  for (const s of ['r.hero.compare', 'ss-compare', 's.bullets', 'ss-ex', 's.oneLine', 'ss-one', 'p.scene', 's.todo', 'ss-todo', 'r.periodsNote', 's.locked', 'r.periodsLocked', 's.previewCut']) assert.ok(jsx.includes(s), s)
  const added = css.slice(css.indexOf('/* 공부 vs 사업 비교 박스'))
  assert.ok(added.length > 200)
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(added), '추가한 스타일은 색을 변수로만 쓴다')
})

test('격리: 기존 앱 파일은 새 화면을 직접 가져오지 않고(lazy 로만), 새 화면 파일은 기존 App.jsx 를 가져오지 않는다', () => {
  const src = (f) => fs.readFileSync(path.join(here, '..', f), 'utf8')
  assert.ok(!/from '\.\/successSaju\/(SuccessSaju|SuccessReport)/.test(src('main.jsx')), 'main.jsx 는 정적 import 하지 않는다')
  assert.ok(/React\.lazy\(\(\) => import\('\.\/successSaju\/SuccessSaju\.jsx'\)\)/.test(src('main.jsx')))
  assert.ok(!/successSaju/.test(src('App.jsx')), 'App.jsx 는 새 화면과 무관하다')
  for (const f of ['SuccessSaju.jsx', 'SuccessReport.jsx', 'successSajuApi.js']) assert.ok(!/from '\.\.\/App\.jsx'/.test(fs.readFileSync(path.join(here, f), 'utf8')), f)
  assert.ok(!/orderRecovery/.test(fs.readFileSync(path.join(here, 'successSajuApi.js'), 'utf8')))
})

test('생성형 AI 사용 고지: 판매 화면 안내와 결제 전 확인에 들어 있고, 전달 항목은 실제 AI 입력(이름·이메일 제외)과 같다', () => {
  assert.ok(LANDING_NOTICES.includes(AI_NOTICE_LANDING) && /생성형 AI/.test(AI_NOTICE_LANDING))
  assert.ok(CONSENT_LINES.includes(AI_NOTICE_CONSENT))
  assert.match(AI_NOTICE_CONSENT, /성별·생년월일·태어난 시간\(이름과 이메일은 제외\)/)
  assert.match(AI_NOTICE_CONSENT, /미국의 AI 서비스 제공사\(Anthropic\)/)
  for (const t of [AI_NOTICE_LANDING, AI_NOTICE_CONSENT]) assert.ok(!/(해요|예요|거든요|죠)[.?!]?$/.test(t), t)
  // 실제로 AI 에 가는 계산값 블록에는 이름·이메일이 없다
  const { buildSuccessChildFacts } = require(path.join(here, '..', '..', '..', 'backend', 'successChild.js'))
  const f = buildSuccessChildFacts({ gender: '남성', solarDate: '2012-07-14', birthtime: '20:30', now: new Date('2026-11-12T12:00:00+09:00') })
  assert.ok(!/@|이름|이메일|가상 학생/.test(f.text.replace(/이름과 이메일/g, '')))
})

test('사업자 정보·정책 링크: 기존 사이트(App.jsx)의 문구를 그대로 재사용하고, 정책 주소는 기존 앱이 열어 준다', () => {
  const app = fs.readFileSync(path.join(here, '..', 'App.jsx'), 'utf8')
  for (const line of BUSINESS_LINES) for (const part of line.split(' · ')) {
    assert.ok(app.includes(part), '기존 사이트에 없는 사업자 정보: ' + part)   // 새로 만든 값이 없어야 한다
  }
  assert.deepEqual(BUSINESS_LINES.map((l) => l.split(':')[0]), ['상호', '사업자등록번호', '통신판매업신고', '사업장', '전화'])
  assert.ok(app.includes(CUSTOMER_CONTACT_URL), '고객문의 링크도 기존 홈 푸터와 같다')
  assert.deepEqual(POLICY_LINKS.map((p) => p.label), ['이용약관', '개인정보처리방침', '환불정책'])
  for (const p of POLICY_LINKS) {
    assert.equal(p.href, '/?policy=' + p.key)
    assert.ok(app.includes("setScreen('" + p.key + "')"), p.key + ' 화면이 기존 앱에 있다')
  }
  // 기존 앱: ?policy= 값이 정책 화면 3개일 때만 그 화면으로 연다
  assert.ok(app.includes("['terms', 'privacy', 'refund'].includes(_qs.get('policy'))"))
  const jsx = fs.readFileSync(path.join(here, 'SuccessSaju.jsx'), 'utf8')
  assert.equal((jsx.match(/<SaleFooter \/>/g) || []).length, 3, '판매 첫 화면·입력·결제 전 확인 화면에 푸터가 있다')
  assert.ok(/target="_blank" rel="noopener noreferrer"/.test(jsx))
})

test('결제창 구매자 이름은 아이 이름이 아니라 "고객"이고, 샘플 화면에 예시 안내 문구가 있다', () => {
  assert.equal(BUYER_NAME, '고객')
  assert.equal(SAMPLE_NOTICE, '지금 보고 계신 결과지는 가상 인물의 샘플입니다. 핵심 결론과 공부운 일부를 미리 보여드립니다. 전체 결과지에는 추천 직업 3가지, 사업 분야 3가지, 재물운, 시기별 해석과 부모가 실천할 수 있는 내용이 담겨 있습니다. 실제 결과는 입력하신 아이의 생년월일시에 따라 달라집니다.')
  const jsx = fs.readFileSync(path.join(here, 'SuccessSaju.jsx'), 'utf8')
  assert.ok(/buyer_name: BUYER_NAME,/.test(jsx), '결제창 호출이 고정 이름을 쓴다')
  assert.ok(!/buyer_name:[^,]*userName/.test(jsx), '아이 이름을 결제사로 보내지 않는다')
  assert.ok(/<div className="ss-banner">\{SAMPLE_NOTICE\}<\/div>\s*<SuccessReport report=\{sampleReport\} \/>/.test(jsx), '샘플 결과지 바로 위에 안내가 있다')
  assert.ok(!/SAMPLE_NOTICE/.test(fs.readFileSync(path.join(here, 'SuccessReport.jsx'), 'utf8')), '실제 결과 화면에는 샘플 문구가 나오지 않는다')
})

test('결과 화면 첫 화면 순서: 결론 → 쉬운 한 문장 → 이번 달 해볼 일 → 요약, 스타일은 색 변수만 쓴다', () => {
  const jsx = fs.readFileSync(path.join(here, 'SuccessReport.jsx'), 'utf8')
  const css = fs.readFileSync(path.join(here, 'successSaju.css'), 'utf8')
  const i = (t) => jsx.indexOf(t)
  assert.ok(i('ss-key-lead') > 0 && i('ss-key-lead') < i('ss-key-one') && i('ss-key-one') < i('ss-key-todo') && i('ss-key-todo') < i('ss-key-sub'))
  assert.ok(jsx.includes('이번 달 해볼 일') && jsx.includes('r.hero.todoNote'))
  assert.ok(!/r\.hero\.compare\.(todo|oneLine)/.test(jsx), '비교 박스 안에서 중복 표시하지 않는다')
  const added = css.slice(css.indexOf('.ss-key-one'))
  assert.ok(added.length > 100 && !/#[0-9a-fA-F]{3,6}\b/.test(added.split('.ss-key-todo small')[0] + added.split('.ss-key-todo small')[1].split('\n')[0]))
})

test('판매 화면: 카페 할인코드·할인 확인 호출이 없고, 체험 코드 입력 → 0원 → 결제 없이 무료 발급 흐름이 연결되어 있다', () => {
  const jsx = fs.readFileSync(path.join(here, 'SuccessSaju.jsx'), 'utf8')
  const api = fs.readFileSync(path.join(here, 'successSajuApi.js'), 'utf8')
  assert.ok(!/checkDiscount|discountCode|\/api\/discount|카페 회원가|할인코드|DAECHIDONG/.test(jsx + api), '할인코드 흔적이 없다')
  assert.ok(/\/api\/trial\/check/.test(api) && /\/api\/trial\/redeem/.test(api))
  assert.ok(/체험 코드/.test(jsx) && /결제 없이 결과지 받기/.test(jsx), '체험 코드 입력과 무료 발급 버튼')
  // 유효한 체험 코드(0원)이면 포트원 결제창 대신 서버 무료 발급을 쓰고, 일반 결제 경로(IMP.request_pay)는 그대로다
  assert.ok(/if \(applied && applied\.amount === 0\) return startTrial\(\)/.test(jsx))
  assert.ok(/IMP\.request_pay\(/.test(jsx) && /createOrder\(\{ input: buildOrderInput\(form\), email: form\.email\.trim\(\), consent: true \}\)/.test(jsx))
  // 무료 체험 주문에는 환불 버튼·환불 안내를 보여 주지 않는다
  assert.ok(/!trialOrder && !\/접수되었습니다\/\.test\(refundMsg\)/.test(jsx))
})
