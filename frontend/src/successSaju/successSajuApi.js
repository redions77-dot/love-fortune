// '우리 아이 성공사주' 서버 호출. 기존 마이사주 결제 흐름(App.jsx)과 같은 방식(주문 생성 → 결제 → 서버가 결제 확인 → 결과 수신)을 이 화면 전용으로 옮긴 것이다.
import { API_URL } from '../apiConfig.js'
import { PRODUCT_KEY } from './successSajuLogic.js'

async function readJson(res) { try { return await res.json() } catch { return {} } }
const post = (path, body, signal) => fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })

// 무료 체험 코드 확인(코드를 사용 처리하지 않는다). 맞으면 { amount: 0, listAmount }, 아니면 예외(고객에게 보여 줄 메시지).
export async function checkTrialCode(code) {
  let res
  try { res = await post('/api/trial/check', { code }) } catch { throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.') }
  const json = await readJson(res)
  if (!res.ok || !json.valid) throw new Error(json.error || '사용할 수 없는 코드예요. 코드를 다시 확인해 주세요.')
  return { amount: json.amount, listAmount: json.listAmount }
}

// 무료 체험: 서버가 코드를 다시 확인한 뒤 결제 없이 무료 주문을 만든다(유료와 같은 전체 결과지). 반환: { orderId, orderToken, trial: true, ... }
export async function redeemTrial({ code, input, email, consent }) {
  let res
  try { res = await post('/api/trial/redeem', { code, input, email, consent }) } catch { throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.') }
  const json = await readJson(res)
  if (!res.ok || !json.orderId) throw new Error(json.error || '무료 체험을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  return json
}

// 주문 생성. 금액은 서버가 정해서 돌려준다.
export async function createOrder({ input, email, consent }) {
  let res
  try { res = await post('/api/orders', { product: PRODUCT_KEY, input, email, consent }) } catch { throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.') }
  const json = await readJson(res)
  if (!res.ok || !json.orderId) throw new Error(json.error || '결제를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  return json
}

// 결제 후 서버가 포트원 결제 내역(주문번호·상태·금액)을 확인한다. 일시적인 조회 실패만 재시도한다.
export async function confirmPayment(order, impUid) {
  let lastError = '결제 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, attempt * 2000))
    let res
    try { res = await post(`/api/orders/${encodeURIComponent(order.orderId)}/verify`, { orderToken: order.orderToken, impUid }) } catch { continue }
    const json = await readJson(res)
    if (res.ok && json.status === 'paid') return
    if (json.error) lastError = json.error
    if (res.status < 500) throw new Error(lastError)
  }
  throw new Error(lastError)
}

// 결제된 주문의 결과를 받는다. 서버는 주문당 생성을 한 번만 하고, 생성 중이면 이어서, 완료됐으면 저장된 결과를 다시 보낸다(AI 재호출 없음).
// 반환: { ok: true, report } | { ok: false, error }
export async function fetchReport(order, { signal, onWaiting } = {}) {
  const delays = [0, 3000, 8000, 15000, 15000, 15000, 15000, 15000]
  let lastError = null
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await new Promise((r) => setTimeout(r, delays[attempt]))
    let report = null, gotDone = false, retryable = true
    try {
      const res = await post(`/api/orders/${encodeURIComponent(order.orderId)}/analysis`, { orderToken: order.orderToken }, signal)
      if (!res.ok) {
        lastError = (await readJson(res)).error || `서버 오류가 발생했습니다 (${res.status})`
        if (res.status < 500 && res.status !== 429) break
        continue
      }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let json; try { json = JSON.parse(line.slice(6)) } catch { continue }
          if (json.error) { lastError = json.error; if (json.retryable === false) retryable = false; continue }
          if (json.type === 'job_status') { onWaiting?.(); continue }
          if (json.type === 'success_report' && json.report) report = json.report
          if (json.type === 'done') gotDone = true
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e
      lastError = '서버에 연결할 수 없습니다.'
    }
    if (gotDone && report) return { ok: true, report }
    if (gotDone && !report) { lastError = '결과를 불러오지 못했습니다.'; break }
    if (!retryable) break
  }
  return { ok: false, error: lastError || '결과지를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}

// 결과지를 받기 전의 전액 환불 요청(주문 토큰으로 본인 확인). 반환: { ok: true } | { ok: false, error }
export async function requestRefund(order) {
  let res
  try { res = await post(`/api/orders/${encodeURIComponent(order.orderId)}/refund`, { orderToken: order.orderToken }) } catch { return { ok: false, error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' } }
  const json = await readJson(res)
  if (res.ok && json.status === 'refunded') return { ok: true }
  return { ok: false, error: json.error || '환불을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}
