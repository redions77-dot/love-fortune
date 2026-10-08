import test from 'node:test'
import assert from 'node:assert/strict'
import { ORDER_STORE_KEY, UNPAID_KEEP_MS, PAID_KEEP_MS, MAX_KEPT_ORDERS, rememberOrder, recallOrder, markOrderPaid, forgetOrder, listRecoverable, recoveryOrder, paidResultActive } from './orderRecovery.js'

const DAY = 24 * 60 * 60 * 1000
const T0 = Date.UTC(2026, 9, 8, 3, 0, 0)
const fakeStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), raw: () => m.get(ORDER_STORE_KEY) } }
const order = (n, product = 'full_saju') => ({ orderId: 'ord_' + n, orderToken: 'secret-token-' + n, product })

test('결제 확인 전 주문은 첫 화면 목록에 나오지 않는다', () => {
  const st = fakeStorage(); rememberOrder(st, order(1), T0)
  assert.deepEqual(listRecoverable(st, T0), [])
  assert.equal(recoveryOrder(st, 'ord_1', T0), null)
  assert.ok(recallOrder(st, 'ord_1', T0), '모바일 결제 복귀용 조회는 그대로 된다')
})

test('결제 확인 후 목록에 나오고, 토큰·주문번호 원문은 화면용 목록에 없다', () => {
  const st = fakeStorage(); rememberOrder(st, order(1), T0); markOrderPaid(st, 'ord_1', T0)
  const list = listRecoverable(st, T0 + 1000)
  assert.equal(list.length, 1)
  assert.equal(list[0].label, '내 사주 전체 분석')
  assert.match(list[0].when, /결제$/)
  assert.ok(!JSON.stringify(list.map(({ label, when }) => ({ label, when }))).includes('secret-token'))
  assert.equal(recoveryOrder(st, 'ord_1', T0).orderToken, 'secret-token-1')
})

test('결제 확인 전 주문은 2일, 결제 확인된 주문은 30일 뒤 지워진다', () => {
  const st = fakeStorage()
  rememberOrder(st, order(1), T0)                       // 미결제
  rememberOrder(st, order(2), T0); markOrderPaid(st, 'ord_2', T0)
  assert.equal(recallOrder(st, 'ord_1', T0 + UNPAID_KEEP_MS + 1000), null)
  assert.ok(recallOrder(st, 'ord_2', T0 + 29 * DAY))
  assert.equal(listRecoverable(st, T0 + PAID_KEEP_MS + 1000).length, 0)
  assert.ok(!JSON.parse(st.raw()).ord_2, '만료된 항목은 저장소에서도 지운다')
  assert.ok(!JSON.parse(st.raw()).ord_1)
})

test('같은 주문을 다시 기억해도 결제 완료 표시는 유지된다', () => {
  const st = fakeStorage(); rememberOrder(st, order(1), T0); markOrderPaid(st, 'ord_1', T0)
  rememberOrder(st, order(1), T0 + 1000)
  assert.equal(listRecoverable(st, T0 + 2000).length, 1)
})

test('여러 주문은 최근 순으로, 같은 상품은 번호로 구분한다', () => {
  const st = fakeStorage()
  rememberOrder(st, order(1), T0); markOrderPaid(st, 'ord_1', T0)
  rememberOrder(st, order(2, 'deep'), T0 + 1000); markOrderPaid(st, 'ord_2', T0 + 1000)
  rememberOrder(st, order(3), T0 + 2000); markOrderPaid(st, 'ord_3', T0 + 2000)
  const list = listRecoverable(st, T0 + 3000)
  assert.deepEqual(list.map(r => r.orderId), ['ord_3', 'ord_2', 'ord_1'])
  assert.deepEqual(list.map(r => r.label), ['내 사주 전체 분석 (1)', '심화 분석', '내 사주 전체 분석 (2)'])
})

test('보관 개수는 최대 10건 — 오래된 결제부터 지운다', () => {
  const st = fakeStorage()
  for (let i = 0; i < MAX_KEPT_ORDERS + 3; i++) { rememberOrder(st, order(i), T0 + i); markOrderPaid(st, 'ord_' + i, T0 + i) }
  const ids = listRecoverable(st, T0 + 100).map(r => r.orderId)
  assert.equal(ids.length, MAX_KEPT_ORDERS)
  assert.ok(!ids.includes('ord_0') && ids.includes('ord_12'))
})

test('지원하지 않는 상품·손상된 저장값은 무시하고 오류를 내지 않는다', () => {
  const st = fakeStorage()
  st.setItem(ORDER_STORE_KEY, JSON.stringify({
    a: { orderToken: 't', product: 'unknown', savedAt: T0, paidAt: T0 },
    b: 'garbage', c: { product: 'deep', paidAt: T0 },
  }))
  assert.deepEqual(listRecoverable(st, T0), [])
  st.setItem(ORDER_STORE_KEY, '{깨진 json')
  assert.deepEqual(listRecoverable(st, T0), [])
  assert.equal(recallOrder(st, 'x', T0), null)
})

test('저장소를 쓸 수 없어도(사생활 보호 모드 등) 예외 없이 빈 목록', () => {
  const broken = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  rememberOrder(broken, order(1), T0); markOrderPaid(broken, 'ord_1', T0); forgetOrder(broken, 'ord_1')
  assert.deepEqual(listRecoverable(broken, T0), [])
  assert.equal(recallOrder(broken, 'ord_1', T0), null)
})

test('지우기: 이 기기에서 주문 정보를 삭제한다', () => {
  const st = fakeStorage(); rememberOrder(st, order(1), T0); markOrderPaid(st, 'ord_1', T0)
  forgetOrder(st, 'ord_1')
  assert.deepEqual(listRecoverable(st, T0), [])
  assert.equal(recallOrder(st, 'ord_1', T0), null)
})

test('모든 상품이 복구 방식을 가진다(무료 상품은 없음)', () => {
  const st = fakeStorage(); const products = ['full_saju', 'full_child', 'full_nohu', 'deep', 'gunghab', 'gilil', 'baeknyeon']
  products.forEach((p, i) => { rememberOrder(st, order(i, p), T0); markOrderPaid(st, 'ord_' + i, T0) })
  assert.equal(listRecoverable(st, T0).length, products.length)
})

test('paidResultActive: 유료 결과가 있을 때만 새로고침 보호', () => {
  const base = { screen: 'landing', serviceType: null }
  assert.equal(paidResultActive(base), false)
  assert.equal(paidResultActive({ ...base, screen: 'result', serviceType: 'saju', isPaid: false }), false, '무료 결과는 보호하지 않음')
  assert.equal(paidResultActive({ ...base, screen: 'result', serviceType: 'saju', isPaid: true }), true)
  assert.equal(paidResultActive({ ...base, screen: 'result', serviceType: 'saju', isPaidStreaming: true }), true)
  assert.equal(paidResultActive({ ...base, screen: 'result', serviceType: 'gunghab', gunghabText: '내용' }), true)
  assert.equal(paidResultActive({ ...base, screen: 'gunghab_free', gunghabFreeText: 'x' }), false)
  assert.equal(paidResultActive({ ...base, screen: 'deep_result', deepText: 'x' }), true)
  assert.equal(paidResultActive({ ...base, screen: 'gilil_result', isGililStreaming: true }), true)
  assert.equal(paidResultActive({ ...base, screen: '백년_result', 백년Text: 'x' }), true)
  assert.equal(paidResultActive({ ...base, screen: 'input', isPaid: true }), false)
})

test('기존 모바일 결제 복귀: 결제 확인 전 주문은 2일 안이면 그대로 조회된다 (30일 정리·지우기와 무관)', () => {
  const st = fakeStorage()
  rememberOrder(st, order(1, 'deep'), T0)
  rememberOrder(st, order(2), T0 + 1000); markOrderPaid(st, 'ord_2', T0 + 1000)   // 다른 주문이 결제 확인돼도
  forgetOrder(st, 'ord_2')                                                          // 다른 주문을 지워도
  rememberOrder(st, order(3), T0 + 2000)                                            // 새 주문이 생겨도
  assert.deepEqual(recallOrder(st, 'ord_1', T0 + UNPAID_KEEP_MS - 1000), { orderId: 'ord_1', orderToken: 'secret-token-1', product: 'deep' })
  assert.ok(recallOrder(st, 'ord_3', T0 + 3000))
})

test('지우기는 지정한 주문만 지우고 결제 복귀 중인 다른 주문은 건드리지 않는다', () => {
  const st = fakeStorage()
  rememberOrder(st, order(1), T0); markOrderPaid(st, 'ord_1', T0)
  rememberOrder(st, order(2, 'deep'), T0)           // 결제 진행 중(미확인)
  forgetOrder(st, 'ord_1')
  assert.equal(recallOrder(st, 'ord_1', T0), null)
  assert.ok(recallOrder(st, 'ord_2', T0))
  forgetOrder(st, 'does_not_exist')
  assert.ok(recallOrder(st, 'ord_2', T0))
})

test('결제 확인 전 주문의 정리 기준은 기존과 같은 2일, 결제 확인 후에는 30일까지 복귀 조회도 가능', () => {
  const st = fakeStorage()
  rememberOrder(st, order(1), T0)
  assert.ok(recallOrder(st, 'ord_1', T0 + 2 * DAY - 1000))
  assert.equal(recallOrder(st, 'ord_1', T0 + 2 * DAY + 1000), null)
  rememberOrder(st, order(2), T0); markOrderPaid(st, 'ord_2', T0)
  assert.ok(recallOrder(st, 'ord_2', T0 + 10 * DAY))
})
