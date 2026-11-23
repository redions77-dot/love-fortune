// 고객 화면 연결 확인: 입력 → 결제/체험 코드 → 홈페이지 열람 → 이메일 인증 재열람 → 후기. 화면 코드가 서버 API 와 같은 경로·값으로 이어지는지 본다.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isSuccessHome, CONSENT_LINES, LIST_AMOUNT, PRODUCT_NAME, validateForm } from './successSajuLogic.js'
import { usageLabel, reviewLengthState, CONCERNS } from './reviewsLogic.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const read = (f) => fs.readFileSync(path.join(here, f), 'utf8')
const root = read('SuccessSaju.jsx'), api = read('successSajuApi.js'), reopen = read('Reopen.jsx'), reviews = read('Reviews.jsx'), css = read('successSaju.css')

test('홈(/)과 /success-saju 는 판매 화면, 주소에 값이 붙은 홈(정책·기존 결제 복귀)과 관리자 주소는 기존 앱', () => {
  for (const [p, s] of [['/', ''], ['', ''], ['/success-saju', ''], ['/success-saju/', '?imp_uid=x']]) assert.equal(isSuccessHome(p, s), true, p + s)
  for (const [p, s] of [['/', '?policy=terms'], ['/', '?imp_success=true'], ['/admin-bomgyeol-2027', ''], ['/x', '']]) assert.equal(isSuccessHome(p, s), false, p + s)
  assert.ok(read('../main.jsx').includes('isSuccessHome(window.location.pathname, window.location.search)'))
})

test('판매 상품은 우리 아이 성공운명서 하나, 출시 기념가 50,000원', () => {
  assert.equal(PRODUCT_NAME, '우리 아이 성공운명서'); assert.equal(LIST_AMOUNT, 50000)
  assert.ok(root.includes('출시 기념가') && root.includes('formatWon(LIST_AMOUNT)'))
  assert.ok(!/gunghab|mom_note|full_child|baeknyeon|gilil/.test(root + api), '다른 상품 연결 없음')
  assert.equal(validateForm({ gender: '남성', birthdate: '2012-07-14', timeUnknown: true, email: 'a@b.com' }, new Date('2026-11-23')).email, undefined)
})

test('입력 → 결제(50,000원) 또는 체험 코드 → 홈페이지에서 바로 열람: 이메일 발송 안내 없이 결과 화면으로 간다', () => {
  assert.ok(/createOrder\(\{ input: buildOrderInput\(form\)/.test(root) && /redeemTrial\(\{ code: code\.trim\(\)/.test(root) && /checkTrialCode\(/.test(root))
  assert.ok(root.includes("setScreen('result')") && root.includes('<SuccessReport report={report} />'))
  assert.ok(api.includes('/api/orders/${encodeURIComponent(order.orderId)}/analysis'))
  for (const t of [root, CONSENT_LINES.join(' ')]) assert.ok(!/이메일로(도)? 발송됩니다|이메일로 보내 드립니다|이메일로도 받아보실/.test(t), '이메일로 보낸다는 문구 없음')
  assert.ok(CONSENT_LINES[0].includes('이메일로는 발송되지 않습니다') && CONSENT_LINES[0].includes('내 결과지 다시 보기'))
})

test('내 결과지 다시 보기: 홈 버튼 → 이메일 → 인증번호 → 목록 → 열기, 결제·AI 재생성 호출 없음', () => {
  assert.ok(root.includes("setScreen('reopen')") && root.includes('내 결과지 다시 보기') && root.includes("screen === 'reopen'"))
  for (const p of ['/api/my-results/request', '/api/my-results/verify', '/api/my-results/list', '/api/my-results/open']) assert.ok(api.includes(p), p)
  assert.ok(reopen.includes('requestResultCode') && reopen.includes('verifyResultCode') && reopen.includes('listMyResults') && reopen.includes('openMyResult'))
  assert.ok(!/createOrder|IMP\.|redeemTrial|\/analysis/.test(reopen), '재열람 화면은 결제·생성 API 를 부르지 않는다')
  assert.ok(root.includes("setReviewAuth({ orderId: info.orderId, sessionToken: info.sessionToken })"))
})

test('후기: 승인된 실제 후기만 목록에 나오고(예시 후기 없음), 구매 인증/무료 체험을 구분하며, 결과지 아래에서 작성한다', () => {
  assert.ok(root.includes('<ReviewsSection />') && root.includes('<ReviewForm auth={reviewAuth} />'))
  assert.ok(api.includes('/api/reviews') && api.includes('/api/reviews/check'))
  assert.equal(usageLabel('paid'), '구매 인증'); assert.equal(usageLabel('trial'), '무료 체험')
  assert.ok(!/REVIEW_SAMPLES|sample/i.test(reviews), '가짜·예시 후기 없음')
  assert.ok(reviewLengthState('가'.repeat(19)).ok === false && reviewLengthState('가'.repeat(20)).ok === true && reviewLengthState('가'.repeat(501)).ok === false)
  assert.deepEqual(Object.keys(CONCERNS), ['study', 'career', 'money', 'etc'])
})

test('디자인: 기존 대치동 엄마의 고민노트 색과 문구를 판매 화면에 쓰고, 결과지 화면 디자인은 그대로다', () => {
  assert.ok(root.includes('대치동 엄마의 고민노트') && root.includes('ss-root ss-moms'))
  for (const c of ['#F4F5F7', '#24232B', '#62616C', '#633B50', '#DEDFE5']) assert.ok(css.includes(c), c)
  assert.ok(css.includes('.ss-hero { background:var(--hero)'), '결과지 hero 스타일 유지')
})
