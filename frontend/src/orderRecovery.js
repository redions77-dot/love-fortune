// 결제한 결과 다시 보기 — 이 브라우저에 보관한 주문 정보를 다루는 순수 함수 모음.
// [보안] 주문 토큰은 이 파일 밖(화면)으로 내보내지 않는다. 목록에는 상품 이름과 결제 시각만 담는다.
// 이름·생년월일·분석 원문은 저장하지 않는다. 결과 본문은 항상 서버에서 주문번호+토큰으로 다시 받는다.
export const ORDER_STORE_KEY = 'mysaju_orders'
export const UNPAID_KEEP_MS = 2 * 24 * 60 * 60 * 1000     // 결제 확인 전 주문: 모바일 결제 복귀용으로만 2일
export const PAID_KEEP_MS = 30 * 24 * 60 * 60 * 1000      // 결제 확인된 주문: 결과 다시 보기용 30일
export const MAX_KEPT_ORDERS = 10

// 상품 → 복구 방식. 이 표에 없는 상품은 복구 목록에 나오지 않는다.
export const RECOVERABLE = Object.freeze({
  full_saju:  { label: '내 사주 전체 분석', kind: 'full', serviceType: 'saju' },
  full_child: { label: '자녀운 프리미엄', kind: 'full', serviceType: 'child' },
  full_nohu:  { label: '노후 운세 전체 분석', kind: 'full', serviceType: '노후' },
  deep:       { label: '심화 분석', kind: 'deep' },
  gunghab:    { label: '관계 궁합 상세 풀이', kind: 'gunghab', serviceType: 'gunghab' },
  gilil:      { label: '길일 추천', kind: 'gilil' },
  baeknyeon:  { label: '100년 사주 인생 꿀팁', kind: 'baeknyeon' },
})

const isStr = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max

function readAll(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(ORDER_STORE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch { return {} }
}
function writeAll(storage, all) {
  try { storage.setItem(ORDER_STORE_KEY, JSON.stringify(all)) } catch {}
}

const isExpired = (v, now) => {
  if (!v || typeof v !== 'object' || !isStr(v.orderToken, 200)) return true
  const keep = v.paidAt ? PAID_KEEP_MS : UNPAID_KEEP_MS
  const base = v.paidAt || v.savedAt || 0
  return !(now - base <= keep)
}

// 만료·손상된 항목을 지우고, 결제 확인된 주문이 많으면 오래된 것부터 정리한다.
function prune(all, now) {
  for (const [id, v] of Object.entries(all)) if (!isStr(id, 64) || isExpired(v, now)) delete all[id]
  const paid = Object.entries(all).filter(([, v]) => v.paidAt).sort((a, b) => b[1].paidAt - a[1].paidAt)
  for (const [id] of paid.slice(MAX_KEPT_ORDERS)) delete all[id]
  return all
}

export function rememberOrder(storage, order, now = Date.now()) {
  if (!order || !isStr(order.orderId, 64) || !isStr(order.orderToken, 200)) return
  const all = prune(readAll(storage), now)
  const prev = all[order.orderId]
  all[order.orderId] = { orderToken: order.orderToken, product: order.product, savedAt: now, ...(prev?.paidAt ? { paidAt: prev.paidAt } : {}) }
  writeAll(storage, all)
}

export function recallOrder(storage, orderId, now = Date.now()) {
  const v = isStr(orderId, 64) ? readAll(storage)[orderId] : null
  return v && !isExpired(v, now) ? { orderId, orderToken: v.orderToken, product: v.product } : null
}

// 서버가 결제를 확인한 주문만 '다시 보기' 대상으로 표시한다. (운영자 무료 주문은 표시하지 않는다.)
export function markOrderPaid(storage, orderId, now = Date.now()) {
  const all = readAll(storage)
  const v = all[orderId]
  if (!v || isExpired(v, now)) return
  if (!v.paidAt) v.paidAt = now
  writeAll(storage, prune(all, now))
}

export function forgetOrder(storage, orderId) {
  const all = readAll(storage)
  if (!(orderId in all)) return
  delete all[orderId]
  writeAll(storage, all)
}

const pad = (n) => String(n).padStart(2, '0')
export function formatPaidAt(ms) {
  const d = new Date(ms)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 첫 화면 목록: 토큰·원문 없이 { orderId, label, when }만. 같은 상품이 여러 건이면 '(2)'처럼 번호를 붙인다.
export function listRecoverable(storage, now = Date.now()) {
  const all = prune(readAll(storage), now)
  writeAll(storage, all)
  const rows = Object.entries(all)
    .filter(([, v]) => v.paidAt && RECOVERABLE[v.product])
    .sort((a, b) => b[1].paidAt - a[1].paidAt)
  const seen = {}
  const total = {}
  for (const [, v] of rows) total[v.product] = (total[v.product] || 0) + 1
  return rows.map(([orderId, v]) => {
    seen[v.product] = (seen[v.product] || 0) + 1
    const n = total[v.product] > 1 ? ` (${seen[v.product]})` : ''
    return { orderId, label: RECOVERABLE[v.product].label + n, when: formatPaidAt(v.paidAt) + ' 결제' }
  })
}

// 복구에 쓸 주문(토큰 포함)은 누르는 순간에만 꺼낸다.
export function recoveryOrder(storage, orderId, now = Date.now()) {
  const order = recallOrder(storage, orderId, now)
  if (!order || !readAll(storage)[orderId]?.paidAt || !RECOVERABLE[order.product]) return null
  return { ...order, plan: RECOVERABLE[order.product] }
}

// 유료 결과가 화면에 있거나 만들어지는 중인가 — 새로고침·탭 닫기 보호와 당겨서 새로고침 방지에 쓴다.
export function paidResultActive(s) {
  switch (s.screen) {
    case 'result': return s.serviceType === 'gunghab' ? !!(s.gunghabText || s.isGunghabStreaming) : !!(s.isPaid || s.isPaidStreaming)
    case 'deep_result': return !!(s.deepText || s.isDeepStreaming)
    case 'gilil_result': return !!(s.gililData || s.isGililStreaming)
    case '백년_result': return !!(s.백년Text || s.is백년Streaming)
    default: return false
  }
}
export const RESULT_SCREENS = ['result', 'deep_result', 'gilil_result', '백년_result']
