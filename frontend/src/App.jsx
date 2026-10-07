import { useEffect, useState, useRef } from 'react'
import { API_URL } from './apiConfig.js'
import { PAYMENT_CONFIG, isAnalyticsHost } from './paymentConfig.js'
import GunghabBars from './GunghabBars.jsx'
import ShareModal from './ShareModal.jsx'
import PaidGuide from './PaidGuide.jsx'
import PaidIntro from './PaidIntro.jsx'
import SajuReport from './SajuReport.jsx'
import SajuTable from './SajuTable.jsx'
import { SUBHEAD_EMOJIS } from './contentBlocks.js'
import { ReportHero, ReportSection, ReportSummary, ReportTable, ClosingBlock, PdfSaveArea, CompareBlock, renderFormattedContent } from './reportBlocks.jsx'
import { exportResultPDF } from './pdfExport.jsx'
import { PRODUCT, productTitle, pdfFileName, birthMetaLine } from './reportMeta.js'
import { buildResultPdfItems, buildDeepPdfItems } from './pdfItems.js'
import { buildDeepFlowTable, buildDeepChoiceTable, buildDeepClosing } from './deepTables.js'
import { summarizeSaju, summarizeMoney, summarizeGunghabFree, summarizeGunghabPaid } from './reportSummary.js'
import { isAdminEntry } from './adminLink.js'
import { emailPrefillFor, prefillSignature } from './emailPrefill.js'
import { RELATION_OPTIONS, RELATION_GROUPS, RELATION_ROLES, GUNGHAB_PAID, GUNGHAB_PRICE_TEXT, SAJU_PAID, SAJU_PAID_FREE_NOTE, SAJU_PAID_HIGHLIGHTS, SAJU_PAID_FACTS, parseGunghabFree, parseMyFree, buildShareText, safeGunghabText } from './relations.js'

// 공통 이벤트 트래킹 — 이미 연결된 도구(GA4 gtag, Meta Pixel fbq)가 있으면 그쪽으로 보내고,
// 없으면 조용히 무시한다. 나중에 다른 분석 도구를 붙일 때도 호출부는 바꿀 필요 없이 이 함수만 확장하면 된다.
function trackEvent(name, params = {}) {
  try {
    if (typeof window === 'undefined' || !isAnalyticsHost(window.location.hostname)) return
    if (typeof window.gtag === 'function') window.gtag('event', name, params)
    if (typeof window.fbq === 'function') window.fbq('trackCustom', name, params)
  } catch {}
}

const 일주타입명 = {
  '甲子': { name: '고요한 선구자형', desc: '물 위에 뿌리내린 나무, 조용하지만 멈추지 않는다' },
  '甲寅': { name: '천하제일형', desc: '나무 위의 나무, 타고난 리더십으로 판을 만든다' },
  '甲辰': { name: '용의 날개형', desc: '땅속 용처럼 때를 기다렸다 한 번에 도약한다' },
  '甲午': { name: '태양의 나무형', desc: '빛을 향해 끝없이 자라는, 열정이 무기인 사람' },
  '甲申': { name: '벼락출세형', desc: '금이 나무를 다듬듯, 시련이 나를 완성시킨다' },
  '甲戌': { name: '황야의 개척자형', desc: '척박한 땅에서도 뿌리내리는 불굴의 생명력' },
  '乙丑': { name: '뚝심 승부사형', desc: '느리지만 반드시 이긴다, 포기를 모르는 덩굴' },
  '乙卯': { name: '봄의 주인공형', desc: '제철을 만난 꽃처럼, 빛날 때 확실히 빛난다' },
  '乙巳': { name: '화려한 생존형', desc: '불 속에서도 피어나는 꽃, 위기가 오히려 기회다' },
  '乙未': { name: '부드러운 강자형', desc: '겉은 온화하지만 속은 단단한 대나무 같은 사람' },
  '乙酉': { name: '정밀한 장인형', desc: '금속 위의 꽃, 디테일로 승부하는 완벽주의자' },
  '乙亥': { name: '깊은 물의 꽃형', desc: '수면 아래 조용히 피어나는 연꽃, 내면이 무기다' },
  '丙子': { name: '냉철한 태양형', desc: '뜨거운 열정 속 차가운 이성, 감성과 논리를 동시에' },
  '丙寅': { name: '천하를 밝히는형', desc: '숲 위로 떠오르는 태양, 타고난 카리스마로 무대를 장악한다' },
  '丙辰': { name: '폭발적 에너지형', desc: '용과 태양의 만남, 한번 불붙으면 아무도 못 막는다' },
  '丙午': { name: '순수 불꽃형', desc: '가장 뜨겁고 가장 순수한 불, 진심이 모든 걸 이긴다' },
  '丙申': { name: '빛나는 검형', desc: '태양이 금속을 달구듯, 열정이 재능을 날카롭게 한다' },
  '丙戌': { name: '황혼의 빛형', desc: '지는 해가 가장 아름답듯, 후반으로 갈수록 빛난다' },
  '丁丑': { name: '동토의 불꽃형', desc: '차가운 땅 속 꺼지지 않는 불씨, 역경이 연료다' },
  '丁卯': { name: '봄밤의 촛불형', desc: '부드럽고 따뜻하게 주변을 밝히는, 사람을 끄는 매력' },
  '丁巳': { name: '불의 정수형', desc: '불 속의 불, 한 분야에서 최고가 되기 위해 태어났다' },
  '丁未': { name: '여름 밤하늘형', desc: '뜨거운 감성과 깊은 내면, 예술적 영혼의 소유자' },
  '丁酉': { name: '보석 세공사형', desc: '정밀한 불꽃이 원석을 보석으로, 집중력이 압도적이다' },
  '丁亥': { name: '깊은 바다의 등대형', desc: '어둠 속에서도 방향을 잃지 않는, 타인의 나침반' },
  '戊子': { name: '지혜로운 산형', desc: '물을 품은 산처럼, 유연함과 단단함을 동시에 가졌다' },
  '戊寅': { name: '대산의 호랑이형', desc: '산 위의 호랑이, 한번 마음먹으면 반드시 정상에 선다' },
  '戊辰': { name: '대지의 용형', desc: '대륙을 움직이는 힘, 스케일이 남다른 대기만성형' },
  '戊午': { name: '타오르는 대지형', desc: '태양이 내리쬐는 산, 에너지 넘치고 추진력이 폭발한다' },
  '戊申': { name: '철옹산형', desc: '금을 품은 산, 한번 결심하면 누구도 흔들 수 없다' },
  '戊戌': { name: '불굴의 영토형', desc: '불을 품은 땅, 강한 의지로 자기만의 세계를 구축한다' },
  '己丑': { name: '묵묵한 수확자형', desc: '차가운 논밭을 일구는 농부, 성실함이 결국 이긴다' },
  '己卯': { name: '봄밭의 씨앗형', desc: '때를 알고 싹을 틔운다, 준비된 자에게 기회가 온다' },
  '己巳': { name: '뜨거운 대지형', desc: '불 위의 땅, 뜨거운 열정으로 무엇이든 키워낸다' },
  '己未': { name: '풍요로운 들판형', desc: '여름 들판처럼 풍성한 감수성, 사람을 살리는 따뜻함' },
  '己酉': { name: '정돈된 수확형', desc: '논밭 위의 금, 체계적이고 완성도 높은 결과물을 낸다' },
  '己亥': { name: '물을 품은 땅형', desc: '깊은 땅속 지하수처럼, 보이지 않는 곳에서 세상을 지탱한다' },
  '庚子': { name: '냉철한 원석형', desc: '물속의 쇠, 감성을 품은 원칙주의자' },
  '庚寅': { name: '호랑이 발톱형', desc: '날카롭고 강렬하게, 한번 목표를 잡으면 놓지 않는다' },
  '庚辰': { name: '용광로형', desc: '거대한 용이 금속을 녹이듯, 압도적인 존재감으로 판을 바꾼다' },
  '庚午': { name: '불꽃 단련형', desc: '불로 단련된 검, 시련을 거칠수록 더 빛난다' },
  '庚申': { name: '최강 원칙형', desc: '금 위의 금, 기준이 가장 높고 가장 단단한 사람' },
  '庚戌': { name: '불 속의 강철형', desc: '제련이 끝난 강철, 완성된 자신만의 세계가 있다' },
  '辛丑': { name: '땅속 보석형', desc: '아직 발견되지 않은 보석, 늦게 빛나지만 가장 오래 빛난다' },
  '辛卯': { name: '봄의 보석형', desc: '봄 숲속 빛나는 이슬, 섬세함과 감각으로 사람을 매료시킨다' },
  '辛巳': { name: '불꽃 보석형', desc: '불에 정제된 보석, 극한의 압력이 나를 완성시킨다' },
  '辛未': { name: '여름 보석형', desc: '따뜻한 감성의 보석, 공감 능력으로 사람의 마음을 얻는다' },
  '辛酉': { name: '순수 보석형', desc: '가장 정교하고 가장 아름다운, 완벽을 추구하는 장인' },
  '辛亥': { name: '깊은 물속 보석형', desc: '수면 아래 빛나는 보석, 알수록 더 매력적인 사람' },
  '壬子': { name: '깊은 바다형', desc: '가장 깊고 넓은 물, 끝을 알 수 없는 무한한 가능성' },
  '壬寅': { name: '폭포형', desc: '산에서 내리꽂히는 폭포, 거침없는 추진력으로 판을 뒤집는다' },
  '壬辰': { name: '용이 된 강형', desc: '용이 사는 강, 한번 흐르기 시작하면 아무도 막을 수 없다' },
  '壬午': { name: '뜨거운 강형', desc: '태양 아래 달리는 강, 열정과 유연함이 공존하는 희귀한 사람' },
  '壬申': { name: '금산에서 솟는 샘형', desc: '바위를 뚫고 나오는 물, 어떤 장벽도 돌아서 흐른다' },
  '壬戌': { name: '대지를 적시는형', desc: '사막을 적시는 비, 척박한 환경을 기회로 바꾸는 능력' },
  '癸丑': { name: '동토의 지하수형', desc: '얼어붙은 땅 아래 흐르는 물, 겉과 속이 전혀 다른 사람' },
  '癸卯': { name: '봄비형', desc: '봄을 깨우는 첫 비, 조용하지만 세상을 바꾸는 힘이 있다' },
  '癸巳': { name: '신비한 증기형', desc: '불 위의 물이 만드는 안개, 아무도 예측할 수 없는 매력' },
  '癸未': { name: '여름 소나기형', desc: '뜨거운 여름을 식히는 소나기, 나타나면 분위기가 바뀐다' },
  '癸酉': { name: '이슬형', desc: '새벽 이슬처럼 섬세하고 순수한, 디테일에서 차이가 난다' },
  '癸亥': { name: '대해의 근원형', desc: '모든 물의 시작점, 깊이를 알 수 없는 내면의 소유자' },
}
const BLOOD_LIST = ['A', 'B', 'O', 'AB']
const STEPS = ['gender', 'marital', 'birthdate', 'birthtime', 'blood']
// [보안] 운영자 여부는 서버 세션(HttpOnly 쿠키)으로만 판단한다. 관리자 비밀값은 프런트엔드에 두지 않는다.
// 운영자 API(/api/admin/*)는 같은 도메인으로 요청한다 (운영: Vercel rewrite → 백엔드, 로컬: Vite 프록시).
const ORDER_STORE_KEY = 'mysaju_orders'
const ADMIN_HINT_KEY = 'mysaju_admin_hint'
const ORDER_KEEP_MS = 2 * 24 * 60 * 60 * 1000

// [보안] 주문 토큰은 모바일 결제 후 페이지가 다시 열려도 결제를 확인할 수 있도록 이 브라우저에만 보관한다.
function rememberOrder(order) {
  try {
    const all = JSON.parse(localStorage.getItem(ORDER_STORE_KEY) || '{}')
    const now = Date.now()
    for (const [id, v] of Object.entries(all)) if (!v || now - (v.savedAt || 0) > ORDER_KEEP_MS) delete all[id]
    all[order.orderId] = { orderToken: order.orderToken, product: order.product, savedAt: now }
    localStorage.setItem(ORDER_STORE_KEY, JSON.stringify(all))
  } catch {}
}
function recallOrder(orderId) {
  try {
    const v = orderId && JSON.parse(localStorage.getItem(ORDER_STORE_KEY) || '{}')[orderId]
    return v ? { orderId, orderToken: v.orderToken, product: v.product } : null
  } catch { return null }
}
async function readJson(res) { try { return await res.json() } catch { return {} } }

// [보안] 결제 후 서버가 포트원 결제 내역(주문번호·상태·금액)을 확인한다. 일시적인 조회 실패만 재시도한다.
async function confirmPayment(order, impUid) {
  let lastError = '결제 확인이 지연되고 있어요. 잠시 후 다시 시도해주세요.'
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, attempt * 2000))
    let res
    try {
      res = await fetch(`${API_URL}/api/orders/${encodeURIComponent(order.orderId)}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderToken: order.orderToken, impUid }) })
    } catch { continue }
    const json = await readJson(res)
    if (res.ok && json.status === 'paid') return
    if (json.error) lastError = json.error
    if (res.status < 500) throw new Error(lastError)
  }
  throw new Error(lastError)
}

// [보안] 결제된 주문의 분석 결과를 받는다. 서버는 주문당 생성을 한 번만 실행하고,
// 생성 중이면 이어서, 완료됐으면 저장된 결과를 처음부터 다시 보내준다. 연결이 끊기면 제한적으로 재시도한다.
async function streamOrderAnalysis(order, { onEvent, onReset, signal }) {
  const delays = [0, 3000, 8000, 15000]
  let lastError = null
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await new Promise(r => setTimeout(r, delays[attempt]))
    if (attempt > 0) onReset?.()
    let gotDone = false, retryable = true
    try {
      const res = await fetch(`${API_URL}/api/orders/${encodeURIComponent(order.orderId)}/analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderToken: order.orderToken }), signal })
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
          if (json.type === 'job_status') continue
          if (json.type === 'done') gotDone = true
          onEvent(json)
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e
      lastError = '서버에 연결할 수 없습니다.'
    }
    if (gotDone) return { ok: true }
    if (!retryable) break
  }
  return { ok: false, error: lastError || '분석을 완료하지 못했어요. 잠시 후 다시 시도해주세요.' }
}

// [보안] 이메일은 서버가 저장한 결과로 서버가 만들어 보낸다. (주문 토큰 필요, 횟수 제한)
async function sendOrderEmail(order, email) {
  if (!order) throw new Error('발송 오류가 발생했습니다.')
  const res = await fetch(`${API_URL}/api/orders/${encodeURIComponent(order.orderId)}/email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderToken: order.orderToken, email }) })
  if (!res.ok) throw new Error((await readJson(res)).error || '발송 오류가 발생했습니다.')
}

const fullProductFor = (st) => st === 'child' ? 'full_child' : st === '노후' ? 'full_nohu' : 'full_saju'

// [보안] 모바일 결제 복귀 주소는 결과를 다 받은 뒤에 지운다. 그 전에 새로고침하면 같은 주문의 결과를 이어서 받는다.
function clearPaymentReturnUrl() {
  if (new URLSearchParams(window.location.search).get('payment')) window.history.replaceState({}, '', window.location.pathname)
}

const LOADING_STAGES = ['사주 데이터를 읽고 있어요', '기운의 흐름을 분석하고 있어요', '당신만의 풀이를 만들고 있어요']

function removeMarkers(text) {
  return text.split('===').filter((_, i) => i % 2 === 0).join('').replace(/^#{1,6}\s+.+$/gm, '').replace(/\n{3,}/g, '\n\n').trim()
}
// 이미 생성된 무료/유료 분석에서 어떤 재물 패턴(꾸준형/한방형 등)이 나왔는지 감지해서,
// 심화분석 유도 티저가 그 패턴과 반대되는 내용을 새로 지어내지 않도록 맞는 버전을 고른다.
function getMoneyTeaserVariant(refText) {
  const t = refText || ''
  const steady = /꾸준|차곡차곡|안정형/.test(t)
  const volatile = /한방|파도|기복|굴곡/.test(t)
  if (steady && !volatile) return 'steady'
  if (volatile && !steady) return 'volatile'
  return 'neutral'
}
const MONEY_TEASER_VARIANTS = {
  steady: {
    visible: `이 사주는 재물이 한 번에 크게 들어오기보다 꾸준히 쌓이는 안정형 구조를 가지고 있어요. 지금까지도 큰 사고 없이 차곡차곡 모아온 편이었을 거예요.

다만 이 구조에서 진짜 중요한 건 "얼마나 버느냐"가 아니라 "어디서 새느냐"예요. 감정적인 지출이나 주변 사람 때문에 나가는 돈이 분명히 있어요.

커리어 방향도 흥미로운 흐름이 보여요. 타고난 기질상`,
    blurred: `조직보다는 자율적인 환경에서 능력이 폭발하는 구조인데, 특히 올해 하반기부터 귀인의 기운이 강하게 들어오고 있어요. 이 귀인은 직장 상사일 수도 있고, 뜻밖의 인연을 통해 새로운 기회로 연결될 수 있어요.

장기적으로 이 재물을 제대로 쌓으려면 반드시 지켜야 할 관리법이 하나 있어요. 이걸 놓치면 지금까지 모은 게 흔들릴 수 있습니다.`,
  },
  volatile: {
    visible: `이 사주는 재물의 흐름이 일정하지 않고 큰 파도처럼 밀려왔다 빠지는 구조를 가지고 있어요. 지금까지 돈이 모이다가도 어느 순간 빠져나가는 경험을 반복하셨을 거예요.

하지만 이 구조는 약점이 아니에요. 오히려 큰 기회를 잡을 수 있는 타이밍이 분명하게 존재하는 사주예요. 지금 이 시기의 에너지 흐름을 보면, 곧 재물운이 크게 열리는 전환점이 다가오고 있어요.

커리어 방향도 흥미로운 흐름이 보여요. 타고난 기질상`,
    blurred: `조직보다는 자율적인 환경에서 능력이 폭발하는 구조인데, 특히 올해 하반기부터 귀인의 기운이 강하게 들어오고 있어요. 이 귀인은 직장 상사일 수도 있고, 뜻밖의 인연을 통해 새로운 기회로 연결될 수 있어요.

대운의 흐름을 보면, 앞으로 3년 안에 반드시 잡아야 할 타이밍이 하나 있어요. 이 시기를 놓치면 다음 기회는 꽤 오래 기다려야 합니다.`,
  },
  neutral: {
    visible: `이 사주는 커리어 방향에서 뚜렷한 신호가 먼저 보여요. 타고난 기질상 조직보다는 자율적인 환경에서 능력이 폭발하는 구조예요.

특히 올해 하반기부터 귀인의 기운이 강하게 들어오고 있어요. 이 귀인은 직장 상사일 수도 있고, 뜻밖의 인연을 통해 새로운 기회로 연결될 수 있어요.

재물의 흐름도 이 사주만의 뚜렷한 패턴이 있는데, 앞서 나온 분석과 이어서 보면`,
    blurred: `왜 지금이 중요한 시기인지 훨씬 더 확실해져요.

대운의 흐름을 보면, 앞으로 3년 안에 반드시 잡아야 할 타이밍이 하나 있어요. 이 시기를 놓치면 다음 기회는 꽤 오래 기다려야 합니다.`,
  },
}
// 심화 분석(9,900원)의 실제 항목 — backend/server.js deepPrompt의 7개 섹션과 같아야 한다.
const DEEP_ITEMS = [
  '종합 흐름 요약 — 지금 시기의 성격과 작은 기회·큰 결정의 기준',
  '수비학으로 본 운명수',
  '10년 대운 흐름',
  '대운 상세 분석',
  '내년 흐름',
  '귀인 분석',
  '지금 해야 할 것 vs 하지 말아야 할 것',
]
function parseSections(text) {
  const sections = []
  const seen = new Set()
  const parts = text.split(/===(.+?)===/s)
  if (parts[0]?.trim()) sections.push({ title: '분석 결과', content: parts[0].trim() })
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim()
    if (!seen.has(title)) { seen.add(title); sections.push({ title, content: parts[i + 1]?.trim() || '' }) }
  }
  return sections
}
// 섹션 본문을 📌 소제목 단위 블록으로 분리 (🔒 잠금 문구는 별도 블록)
function splitSectionBlocks(content) {
  const lines = (content || '').split('\n')
  const blocks = []
  let current = null
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    if (t.startsWith('🔒')) {
      if (current) { blocks.push(current); current = null }
      blocks.push({ header: null, bodyLines: [line], isLock: true })
    } else if (SUBHEAD_EMOJIS.some(e => t.startsWith(e))) {
      if (current) blocks.push(current)
      current = { header: line, bodyLines: [] }
    } else {
      if (!current) current = { header: null, bodyLines: [] }
      current.bodyLines.push(line)
    }
  }
  if (current) blocks.push(current)
  return blocks
}
// 문장 끝부분(핵심 결론) 1~2문장만 블러 대상으로 분리하고, 그 앞의 설명·서사는 전부 선명하게 유지
function splitLastSentences(text, hideCount = 2) {
  const clean = (text || '').trim()
  if (!clean) return { visible: '', hidden: '' }
  const boundaries = []
  for (let i = 0; i < clean.length - 1; i++) {
    if (clean[i] === '.' && clean[i + 1] === ' ') boundaries.push(i + 1)
  }
  boundaries.push(clean.length)
  const totalSentences = boundaries.length
  if (totalSentences <= 1) return { visible: '', hidden: clean }
  const keepCount = Math.max(totalSentences - hideCount, 1)
  const cut = boundaries[keepCount - 1]
  return { visible: clean.slice(0, cut).trim(), hidden: clean.slice(cut).trim() }
}
// 무료 결과에서 "결론만 블러" 처리할 섹션별 📌 소제목 인덱스(0부터).
// '돈의 흐름'/'지금 이 시기'는 기본 사주(basePrompt) 전용 섹션 제목이며(자녀/노후 등 다른 상품은 이 제목을 쓰지 않음),
// 백엔드가 더 이상 이 두 섹션에 정확한 나이·연도 결론을 생성하지 않으므로(전체 분석 전용으로 이동) 블러 대상을 비워
// 기본 사주에서만 비활성화한다. 이 맵을 참조하는 렌더 박스(전체 분석 공개 배지 등) 자체는 자녀/노후 결과에서도
// 그대로 쓰이는 공용 UI라 건드리지 않았다 — blurIdx가 비면 해당 상품들처럼 그냥 전체가 그대로 노출될 뿐이다.
const CONCLUSION_BLUR_INDEX = {}
// 선택된 항목을 색상 외에 체크 표시로도 구분 (버튼에 position: 'relative' 필요)
function CheckMark({ on }) {
  if (!on) return null
  return <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 8, fontSize: 12, fontWeight: 800, color: '#633B50', lineHeight: 1 }}>✓</span>
}

function DateRow({ year, setYear, month, setMonth, day, setDay, lunar, setLunar }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button aria-pressed={!lunar} style={{ position: 'relative', flex: 1, padding: '10px', fontSize: 13, fontWeight: !lunar ? 600 : 400, border: `1px solid ${!lunar ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: !lunar ? '#F6F0F3' : '#FFFFFF', color: !lunar ? '#633B50' : '#62616C', cursor: 'pointer' }} onClick={() => setLunar(false)}><CheckMark on={!lunar} />양력</button>
        <button aria-pressed={lunar} style={{ position: 'relative', flex: 1, padding: '10px', fontSize: 13, fontWeight: lunar ? 600 : 400, border: `1px solid ${lunar ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: lunar ? '#F6F0F3' : '#FFFFFF', color: lunar ? '#633B50' : '#62616C', cursor: 'pointer' }} onClick={() => setLunar(true)}><CheckMark on={lunar} />음력</button>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        <input style={{ width: 90, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="년도" value={year} onChange={e => setYear(e.target.value.slice(0,4))} />
        <span style={{ fontSize: 14, color: '#62616C' }}>년</span>
        <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="월" value={month} onChange={e => setMonth(e.target.value.slice(0,2))} />
        <span style={{ fontSize: 14, color: '#62616C' }}>월</span>
        <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="일" value={day} onChange={e => setDay(e.target.value.slice(0,2))} />
        <span style={{ fontSize: 14, color: '#62616C' }}>일</span>
      </div>
    </>
)
}


// 섹션이 화면에 실제로 노출됐을 때 한 번만 이벤트를 쏘는 감지용 마커.
// 레이아웃에 영향을 주지 않도록 높이 1px짜리 요소를 섹션 바로 앞에 둔다.
function SectionViewTracker({ eventName, params }) {
  const ref = useRef(null)
  const firedRef = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el || firedRef.current || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !firedRef.current) {
          firedRef.current = true
          trackEvent(eventName, params)
          io.disconnect()
        }
      })
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [eventName])
  return <div ref={ref} style={{ height: 1 }} aria-hidden="true" />
}

// D. FULL ANALYSIS 미리보기 카드 목록 — 핵심 4개는 항상 보여주고, 나머지 4개는 아코디언으로 접어둔다.
// 유료 본문 문장을 그대로 블러 처리해 길게 나열하지 않고, 짧은 미리보기 두 줄만 노출한다.
const FULL_ANALYSIS_PRIMARY = [
  { title: '돈이 가장 크게 움직이는 시기', line1: '이 사주에서 돈이 가장 크게 들어오는 나이가 따로 정해져 있어요.', line2: '정확한 연도와 그 전에 준비해야 할 것은 전체 분석에서 확인할 수 있어요.' },
  { title: '나에게 맞는 직업과 돈 버는 방식', line1: '어떤 환경에서 능력이 폭발하는지 이 사주가 답을 갖고 있어요.', line2: '구체적인 직업 방향과 지금 움직여야 할 타이밍은 전체 분석에서 공개돼요.' },
  { title: '투자·부동산에서 피해야 할 선택', line1: '지금 이 사주에서 절대 손대면 안 되는 투자가 따로 있어요.', line2: '어떤 선택을 피해야 하는지는 전체 분석에서 확인할 수 있어요.' },
  { title: '사람과 인연의 변화 시기', line1: '곁에 두면 손해 보는 사람과 진짜 내 편의 특징이 따로 있어요.', line2: '귀인을 만나는 구체적인 시기는 전체 분석에서 공개돼요.' },
]
const FULL_ANALYSIS_MORE = [
  { title: '月運 · 월별 운세', line1: '앞으로 12개월, 좋은 달과 조심할 달이 따로 있어요.', line2: '이번 달과 다음 달의 흐름은 전체 분석에서 확인할 수 있어요.' },
  { title: '幸 · 나를 돕는 것들', line1: '이 사주와 맞는 행운 마스코트·방향·숫자·아이템이 있어요.', line2: '행운 색깔 외 나머지 4가지는 전체 분석에서 공개돼요.' },
  { title: '道 · 사주를 잘 쓰는 법', line1: '이 사주가 잘 풀리는 조건이 딱 2가지예요.', line2: '반대로 망하는 패턴도 전체 분석에서 확인할 수 있어요.' },
  { title: '진로 · 인연 심화', line1: '나이대별로 지금 집중해야 할 영역이 따로 있어요.', line2: '지금 시기에 맞는 진로·인연 심화 분석이 전체 분석에 있어요.' },
]
function FullAnalysisPreviewCard({ title, line1, line2 }) {
  return (
    <div className="rpt-list-item">
      <h3 className="rpt-h3">✦ {title}</h3>
      <p className="rpt-p">{line1}</p>
      <p className="rpt-note">{line2}</p>
    </div>
  )
}

// ── [보안] 운영자 화면 (?view=admin): 서버 세션으로 인증하고 조회·재발송·재생성은 서버 API로만 처리 ──
function AdminPanel({ onAuthChange, onExit, entry = false }) {
  const [authState, setAuthState] = useState('checking')
  const [tokenInput, setTokenInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [remember, setRemember] = useState(!!entry)   // 관리자 전용 주소로 열렸을 때만 기본 선택: 이 기기를 1년간 기억
  const [adminEmail, setAdminEmail] = useState('')
  const [adminResults, setAdminResults] = useState([])
  const [adminOrders, setAdminOrders] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminSendingId, setAdminSendingId] = useState(null)
  const [adminStatus, setAdminStatus] = useState({})
  const [orderStatus, setOrderStatus] = useState({})
  const [orderEmail, setOrderEmail] = useState({})

  const adminFetch = (path, body) => fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })

  function setAuthed(on) {
    setAuthState(on ? 'in' : 'out'); onAuthChange(on)
    try { if (on) localStorage.setItem(ADMIN_HINT_KEY, '1'); else localStorage.removeItem(ADMIN_HINT_KEY) } catch {}
  }

  useEffect(() => {
    adminFetch('/api/admin/session').then(readJson).then(j => { setAuthed(!!j.admin); if (j.admin && entry) onExit() }).catch(() => setAuthState('out'))
  }, []) // eslint-disable-line

  async function login() {
    if (!tokenInput) return
    setLoggingIn(true); setLoginError('')
    try {
      const res = await adminFetch('/api/admin/login', { token: tokenInput, remember })
      const json = await readJson(res)
      if (res.ok) { setTokenInput(''); setAuthed(true); if (entry) onExit() }
      else setLoginError(json.error || '인증에 실패했습니다.')
    } catch { setLoginError('서버에 연결할 수 없습니다.') }
    setLoggingIn(false)
  }

  async function logout() {
    try { await adminFetch('/api/admin/logout', {}) } catch {}
    setAuthed(false); setAdminResults([]); setAdminOrders([])
  }

  // 이메일이면 결과·주문을, 주문번호(포트원 관리자 화면의 주문번호)면 주문을 찾는다.
  async function fetchAdminResults() {
    const query = adminEmail.trim()
    if (!query) { alert('이메일 주소 또는 주문번호를 입력해주세요'); return }
    const byEmail = query.includes('@')
    setAdminLoading(true); setAdminResults([]); setAdminOrders([]); setAdminStatus({}); setOrderStatus({})
    try {
      const [rRes, oRes] = await Promise.all([
        byEmail ? adminFetch('/api/admin/results/search', { email: query }) : null,
        adminFetch('/api/admin/orders/search', byEmail ? { email: query } : { orderId: query }),
      ])
      if (rRes?.status === 401 || oRes.status === 401) { setAuthed(false); return }
      const [rJson, oJson] = await Promise.all([rRes ? readJson(rRes) : { success: true, results: [] }, readJson(oRes)])
      if (rJson.success) setAdminResults(rJson.results.filter(r => r.type === 'deep'))
      else alert(rJson.error || '조회 실패')
      if (oJson.success) setAdminOrders(oJson.orders)
      else alert(oJson.error || '조회 실패')
    } catch { alert('서버에 연결할 수 없습니다.') }
    finally { setAdminLoading(false) }
  }

  async function sendAdminResult(result) {
    setAdminSendingId(result.id)
    try {
      const res = await adminFetch(`/api/admin/results/${result.id}/email`, {})
      const data = await readJson(res)
      setAdminStatus(prev => ({ ...prev, [result.id]: data.success ? 'sent' : 'error' }))
      if (!data.success && data.error) alert(data.error)
    } catch {
      setAdminStatus(prev => ({ ...prev, [result.id]: 'error' }))
    }
    setAdminSendingId(null)
  }

  // action: verify(포트원 결제 확인) | regenerate(결과 다시 생성) | send(결과 이메일 발송)
  async function orderAction(order, action) {
    setOrderStatus(prev => ({ ...prev, [order.id]: 'working' }))
    try {
      const res = await adminFetch(`/api/admin/orders/${encodeURIComponent(order.id)}/${action}`, { email: orderEmail[order.id] || undefined })
      const data = await readJson(res)
      setOrderStatus(prev => ({ ...prev, [order.id]: res.ok ? `${action}:ok` : 'error' }))
      if (!res.ok) alert(data.error || '요청 실패')
      else if (action === 'verify') setAdminOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'paid' } : o))
    } catch {
      setOrderStatus(prev => ({ ...prev, [order.id]: 'error' }))
    }
  }

  const jobLabel = { done: '생성 완료', generating: '생성 중', failed: '생성 실패' }
  const boxStyle = { background: '#FFFFFF', border: '1px solid #DEDFE5', borderRadius: 12, padding: '16px', marginBottom: 12 }
  const inputStyle = { flex: 1, padding: '12px 14px', fontSize: 14, border: '1px solid #DEDFE5', borderRadius: 8, background: '#FFFFFF', color: '#24232B', boxSizing: 'border-box' }
  const primaryBtn = { padding: '12px 18px', fontSize: 14, fontWeight: 700, background: '#633B50', color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }
  const subBtn = { flex: 1, padding: '10px 14px', fontSize: 13, background: 'none', border: '1px solid #DEDFE5', borderRadius: 8, cursor: 'pointer', color: '#62616C' }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F5F7', padding: '40px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#633B50', marginBottom: 20, textAlign: 'center' }}>🔮 심화분석 결과 발송</h1>
        {authState === 'checking' && <p style={{ fontSize: 13, color: '#62616C', textAlign: 'center' }}>확인 중...</p>}
        {authState === 'out' && (
          <form onSubmit={e => { e.preventDefault(); login() }} style={{ ...boxStyle, padding: '20px' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#24232B', marginBottom: 10 }}>운영자 인증</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="password" autoComplete="off" placeholder="운영자 토큰" value={tokenInput} onChange={e => setTokenInput(e.target.value)} style={inputStyle} />
              <button type="submit" style={primaryBtn} disabled={loggingIn}>{loggingIn ? '확인 중...' : '로그인'}</button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: '#62616C' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> 이 기기에서 계속 관리자로 사용 (1년 · 내 기기에서만 선택하세요)
            </label>
            {loginError && <p style={{ fontSize: 13, color: '#C53A3A', marginTop: 10 }}>{loginError}</p>}
          </form>
        )}
        {authState === 'in' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input style={inputStyle} type="text" placeholder="고객 이메일 또는 주문번호" value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') fetchAdminResults() }}
              />
              <button style={primaryBtn} onClick={fetchAdminResults} disabled={adminLoading}>
                {adminLoading ? '조회 중...' : '조회'}
              </button>
            </div>
            {adminLoading && <p style={{ fontSize: 13, color: '#62616C', textAlign: 'center' }}>조회 중...</p>}
            {!adminLoading && adminResults.length === 0 && (
              <p style={{ fontSize: 13, color: '#62616C', textAlign: 'center' }}>이메일을 입력하고 조회하면 심화분석 결과 목록이 나타나요. 주문번호로는 주문만 찾을 수 있어요.</p>
            )}
            {adminResults.map(r => (
              <div key={r.id} style={boxStyle}>
                <p style={{ fontSize: 13, color: '#62616C', marginBottom: 8 }}>{r.userName || '이름 없음'} · {new Date(r.createdAt).toLocaleString('ko-KR')}</p>
                <p style={{ fontSize: 13, color: '#24232B', maxHeight: 60, overflow: 'hidden', marginBottom: 12, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{r.resultText.slice(0, 120)}...</p>
                <button
                  style={{ width: '100%', padding: '10px', fontSize: 13, fontWeight: 700, background: adminStatus[r.id] === 'sent' ? 'rgba(74,222,128,0.15)' : '#633B50', color: adminStatus[r.id] === 'sent' ? '#1E7F4F' : '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  onClick={() => sendAdminResult(r)} disabled={adminSendingId === r.id}
                >
                  {adminSendingId === r.id ? '발송 중...' : adminStatus[r.id] === 'sent' ? '✅ 발송 완료' : adminStatus[r.id] === 'error' ? '⚠️ 발송 실패 · 재발송' : '📧 이 결과 이메일로 발송'}
                </button>
              </div>
            ))}
            {adminOrders.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#24232B', marginBottom: 10 }}>주문 내역</p>
                {adminOrders.map(o => (
                  <div key={o.id} style={boxStyle}>
                    <p style={{ fontSize: 13, color: '#62616C', marginBottom: 6 }}>{o.productName} · {Number(o.amount).toLocaleString('ko-KR')}원{o.isComp ? ' · 운영자' : ''} · {new Date(o.createdAt).toLocaleString('ko-KR')}</p>
                    <p style={{ fontSize: 12, color: '#62616C', marginBottom: 6, wordBreak: 'break-all' }}>주문번호 {o.id}</p>
                    <p style={{ fontSize: 13, color: '#24232B' }}>{o.userName || '이름 없음'} · {o.status === 'paid' ? '결제 확인' : '결제 대기'} · {jobLabel[o.jobStatus] || '생성 전'}{o.hasEmail ? '' : ' · 이메일 없음'}</p>
                    {!o.hasEmail && o.product !== 'gilil' && o.status === 'paid' && o.jobStatus !== 'generating' && (
                      <input style={{ ...inputStyle, width: '100%', marginTop: 10 }} type="email" placeholder="결과를 받을 고객 이메일" value={orderEmail[o.id] || ''} onChange={e => setOrderEmail(prev => ({ ...prev, [o.id]: e.target.value }))} />
                    )}
                    {o.status !== 'paid' && (
                      <button style={{ ...primaryBtn, width: '100%', padding: '10px', fontSize: 13, marginTop: 10 }} disabled={orderStatus[o.id] === 'working'} onClick={() => orderAction(o, 'verify')}>
                        {orderStatus[o.id] === 'working' ? '확인 중...' : '💳 포트원 결제 확인'}
                      </button>
                    )}
                    {o.status === 'paid' && o.product !== 'gilil' && o.jobStatus !== 'done' && o.jobStatus !== 'generating' && (
                      <button style={{ ...primaryBtn, width: '100%', padding: '10px', fontSize: 13, marginTop: 10 }} disabled={orderStatus[o.id] === 'working' || orderStatus[o.id] === 'regenerate:ok'} onClick={() => orderAction(o, 'regenerate')}>
                        {orderStatus[o.id] === 'regenerate:ok' ? '✅ 재생성 시작 (완료 후 이메일 발송)' : orderStatus[o.id] === 'working' ? '요청 중...' : '🔁 결과 다시 생성하기'}
                      </button>
                    )}
                    {o.status === 'paid' && o.product !== 'gilil' && o.jobStatus === 'done' && (
                      <button style={{ ...primaryBtn, width: '100%', padding: '10px', fontSize: 13, marginTop: 10 }} disabled={orderStatus[o.id] === 'working' || orderStatus[o.id] === 'send:ok'} onClick={() => orderAction(o, 'send')}>
                        {orderStatus[o.id] === 'send:ok' ? '✅ 발송 완료' : orderStatus[o.id] === 'working' ? '발송 중...' : '📧 결과 이메일 발송'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button style={subBtn} onClick={onExit}>결제 없이 서비스 테스트</button>
              <button style={subBtn} onClick={logout}>로그아웃</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const _qs = new URLSearchParams(window.location.search)
  const _adminEntry = isAdminEntry(window.location.pathname)   // 관리자 전용 주소(즐겨찾기)로 들어왔는가
  const _mobilePayment = _qs.get('payment')
  const _impSuccess = _qs.get('imp_success')

  useEffect(() => {
    const ping = () => fetch(`${API_URL}/ping`).catch(() => {})
    ping(); const id = setInterval(ping, 30000); return () => clearInterval(id)
  }, [])

  // [보안] 모바일 결제 후 복귀: 이 브라우저에 보관한 주문으로 서버가 결제를 확인한 뒤에만 분석을 시작한다.
  useEffect(() => {
    const returnHandlers = { gunghab: handleGunghabAnalyze, paid: handlePaidAnalyze, deep: handleDeepAnalyze, gilil: handleGililAnalyze, '백년': handle백년Analyze }
    const handler = returnHandlers[_mobilePayment]
    if (!handler) return
    const clearUrl = () => window.history.replaceState({}, '', window.location.pathname)
    if (_impSuccess === 'false') { alert('결제가 취소되었습니다.'); clearUrl(); return }
    if (_impSuccess !== 'true') return
    const order = recallOrder(_qs.get('merchant_uid'))
    if (!order) { alert('결제 정보를 확인할 수 없어요. 결제가 완료되었다면 고객센터로 문의해주세요.'); clearUrl(); return }
    let cancelled = false
    const t = setTimeout(() => {
      confirmPayment(order, _qs.get('imp_uid'))
        .then(() => { if (!cancelled) handler(order) })
        .catch((e) => alert(e.message))
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, []) // eslint-disable-line

  const [screen, setScreen] = useState(() => {
    if (_qs.get('view') === 'admin' || isAdminEntry(window.location.pathname)) return 'admin_email'
    if (_mobilePayment === 'gunghab' && _impSuccess === 'true') return 'result'
    if (_mobilePayment === 'paid' && _impSuccess === 'true') return 'result'
    if (_mobilePayment === 'deep' && _impSuccess === 'true') return 'deep_result'
    if (_mobilePayment === 'gilil' && _impSuccess === 'true') return 'gilil_result'
    if (_mobilePayment === '백년' && _impSuccess === 'true') return '백년_result'
    return 'landing'
  })
  const [serviceType, setServiceType] = useState(() => {
    if (_mobilePayment === 'gunghab' && _impSuccess === 'true') return 'gunghab'
    if (_mobilePayment === 'paid' && _impSuccess === 'true') return _qs.get('st') || 'saju'
    return null
  })
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState(() => _qs.get('g') || '')
  const [maritalStatus, setMaritalStatus] = useState(() => _qs.get('ms') || '')
  const [birthYear, setBirthYear] = useState(() => _qs.get('by') || '')
  const [birthMonth, setBirthMonth] = useState(() => _qs.get('bm') || '')
  const [birthDay, setBirthDay] = useState(() => _qs.get('bd') || '')
  const [isLunar, setIsLunar] = useState(() => _qs.get('il') === '1')
  const [timeHour, setTimeHour] = useState('')
  const [timeMin, setTimeMin] = useState('')
  const [timeAmPm, setTimeAmPm] = useState('오전')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [mbti, setMbti] = useState('')
  const [blood, setBlood] = useState(() => _qs.get('blood') || '')
  const [phase, setPhase] = useState('input')
  const [freeError, setFreeError] = useState(null)
  const freeInFlightRef = useRef(false)
  const [sajuData, setSajuData] = useState(null)
  const [baseText, setBaseText] = useState('')
  const [paidText, setPaidText] = useState('')
  const [isPaidStreaming, setIsPaidStreaming] = useState(false)
  const [isBaseStreaming, setIsBaseStreaming] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [isDeepPaid, setIsDeepPaid] = useState(false)
  const [showSajuStruct, setShowSajuStruct] = useState(false) // '내 사주 구성 보기' 접기/펼치기
  const [emailModal, setEmailModal] = useState(null)
  const [pdfCapturing, setPdfCapturing] = useState(false)
  // 다운로드 PDF(이미지 방식). 접혀 있던 사주 표를 저장하는 동안만 펼쳐서 캡처한다.
  const savePdf = async (spec) => {
    setPdfCapturing(true)
    try {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      await exportResultPDF(spec)
      return true
    } catch (e) { console.error('PDF 저장 실패', e); return false }   // 실패 안내는 PdfSaveArea 가 '저장이 안 되나요?'를 펼쳐 보여준다
    finally { setPdfCapturing(false) }
  }
  const [preEmail, setPreEmail] = useState('')
  const [emailPrefill, setEmailPrefill] = useState(null)   // { email, sig } 같은 입력의 심화 결제에만 미리 채움 (새 분석·입력 변경 시 사용 안 함)
  const [deepAutoEmail, setDeepAutoEmail] = useState(null)   // 심화 결제 때 입력한 이메일: null=알 수 없음, ''=이메일 없이 결제
  const [deepText, setDeepText] = useState('')
  const [isDeepStreaming, setIsDeepStreaming] = useState(false)
  const [openCheongan, setOpenCheongan] = useState(null)
  const [deepEmailInput, setDeepEmailInput] = useState('')
  const [deepEmailSent, setDeepEmailSent] = useState(false)
  const [moreAnalysisOpen, setMoreAnalysisOpen] = useState(false)

  const [관계유형, set관계유형] = useState(() => _qs.get('rt') || '')
  const [관계그룹, set관계그룹] = useState(() => RELATION_GROUPS.find(g => g.types.includes(_qs.get('rt')))?.key || '')
  const [관계역할, set관계역할] = useState(() => _qs.get('rr') || '')
  const [gunghabFreeText, setGunghabFreeText] = useState('')
  const [gunghabFreePhase, setGunghabFreePhase] = useState('input') // input | streaming | done | error
  const [gunghabFreeError, setGunghabFreeError] = useState(null)
  const [shareDraft, setShareDraft] = useState(null) // 공유 확인 창에 보여줄 문구 (null이면 닫힘)
  const [gunghabStep, setGunghabStep] = useState(0)
  const [partnerGender, setPartnerGender] = useState(() => _qs.get('pg') || '')
  const [partnerBirthYear, setPartnerBirthYear] = useState(() => _qs.get('pby') || '')
  const [partnerBirthMonth, setPartnerBirthMonth] = useState(() => _qs.get('pbm') || '')
  const [partnerBirthDay, setPartnerBirthDay] = useState(() => _qs.get('pbd') || '')
  const [partnerIsLunar, setPartnerIsLunar] = useState(() => _qs.get('pil') === '1')
  const [partnerTimeHour, setPartnerTimeHour] = useState(() => _qs.get('pth') || '')
  const [partnerTimeMin, setPartnerTimeMin] = useState(() => _qs.get('ptm') || '')
  const [partnerTimeAmPm, setPartnerTimeAmPm] = useState(() => _qs.get('ptap') || '오전')
  const [partnerTimeUnknown, setPartnerTimeUnknown] = useState(() => _qs.get('ptu') === '1')
  const [myName, setMyName] = useState(() => _qs.get('mn') || '')
  const [partnerName, setPartnerName] = useState(() => _qs.get('pn') || '')
  const [gunghabText, setGunghabText] = useState('')
  const [isGunghabStreaming, setIsGunghabStreaming] = useState(false)
  const [gunghabSajuData, setGunghabSajuData] = useState(null)
  const [gilil목적, setGilil목적] = useState(() => _qs.get('gp') || '')
  const [gililText, setGililText] = useState('')
  const [isGililStreaming, setIsGililStreaming] = useState(false)
  const [gililData, setGililData] = useState(null)

  const [백년Name, set백년Name] = useState(() => _qs.get('hn') || '')
  const [백년BirthYear, set백년BirthYear] = useState(() => _qs.get('hby') || '')
  const [백년BirthMonth, set백년BirthMonth] = useState(() => _qs.get('hbm') || '')
  const [백년BirthDay, set백년BirthDay] = useState(() => _qs.get('hbd') || '')
  const [백년IsLunar, set백년IsLunar] = useState(false)
  const [백년TimeHour, set백년TimeHour] = useState(() => _qs.get('hth') || '')
  const [백년TimeMin, set백년TimeMin] = useState(() => _qs.get('htm') || '')
  const [백년TimeAmPm, set백년TimeAmPm] = useState('오전')
  const [백년TimeUnknown, set백년TimeUnknown] = useState(false)
  const [백년Text, set백년Text] = useState('')
  const [is백년Streaming, setIs백년Streaming] = useState(false)
  const [백년Email, set백년Email] = useState('')
  const [백년Gender, set백년Gender] = useState('')
  const [백년EmailSent, set백년EmailSent] = useState(false)
  const [백년EmailInput, set백년EmailInput] = useState('')

  const abortRef = useRef(null)
  const isPaidSectionRef = useRef(false)
  const freeResultViewedRef = useRef(false)
  const freeRefRef = useRef('')      // [보안] 서버가 저장한 무료 결과 참조 (결과 화면 이메일용)
  const paidOrdersRef = useRef({})   // [보안] 상품별 결제 완료 주문 { full, deep, gunghab, gilil, baeknyeon }
  const [isAdmin, setIsAdmin] = useState(false)

  // [보안] 운영자 로그인 기록이 있는 브라우저에서만 서버에 세션을 확인한다.
  useEffect(() => {
    let hint = false
    try { hint = localStorage.getItem(ADMIN_HINT_KEY) === '1' } catch {}
    if (!hint || _qs.get('view') === 'admin' || _adminEntry) return   // 관리자 진입 주소는 AdminPanel 이 세션을 확인한다
    fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' }).then(readJson)
      .then(j => { setIsAdmin(!!j.admin); if (!j.admin) { try { localStorage.removeItem(ADMIN_HINT_KEY) } catch {} } })
      .catch(() => {})
  }, []) // eslint-disable-line

  useEffect(() => {
    if (screen === 'result' && phase === 'done' && !isPaid && !freeResultViewedRef.current) {
      freeResultViewedRef.current = true
      trackEvent('free_result_viewed', { service_type: serviceType })
    }
  }, [screen, phase, isPaid, serviceType])

  const currentStepId = STEPS[step]
  const progress = (step / STEPS.length) * 100

  const birthdate = (birthYear.length === 4 && birthMonth && birthDay) ? `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}` : ''
  const birthdateValid = birthYear.length === 4 && Number(birthMonth) >= 1 && Number(birthMonth) <= 12 && Number(birthDay) >= 1 && Number(birthDay) <= 31
  const birthtime = timeUnknown ? '' : (() => {
    if (!timeHour || !timeMin) return ''
    let h = Number(timeHour)
    if (timeAmPm === '오전' && h === 12) h = 0
    if (timeAmPm === '오후' && h !== 12) h += 12
    return `${String(h).padStart(2,'0')}:${String(timeMin).padStart(2,'0')}`
  })()
  const birthtimeValid = timeUnknown || (timeHour !== '' && timeMin !== '')

  function canGoNext() {
    if (currentStepId === 'gender') return gender !== ''
    if (currentStepId === 'birthdate') return birthdateValid
    if (currentStepId === 'birthtime') return birthtimeValid
    return true
  }
  function goNext() {
    trackEvent('input_step_completed', { step: step + 1, step_id: currentStepId, service_type: serviceType })
    if (currentStepId === 'gender' && (serviceType === 'child' || serviceType === '노후')) { setStep(s => s + 2); return }
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else if (serviceType === 'deep') {
      if (isAdmin) { setScreen('deep_result'); startCheckout({ product: 'deep', input: personalInput(), onPaid: (order) => handleDeepAnalyze(order) }); return }
      setScreen('deep_result')
    } else handleFreeAnalyze()
  }
  function goBack() {
    if (currentStepId === 'birthdate' && (serviceType === 'child' || serviceType === '노후')) { setStep(s => s - 2); return }
    if (step > 0) setStep(s => s - 1); else setScreen('landing')
  }

  async function streamAnalyze({ body, onSaju, onGunghabSaju, onBaseText, onPaidText, onDone, onError }) {
    const ctrl = new AbortController(); abortRef.current = ctrl
    const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal })
    if (!res.ok) { onError?.(`서버 오류가 발생했습니다 (${res.status})`); return }
    const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''; let gotDone = false
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'saju') onSaju?.(json)
          else if (json.type === 'paid_start') isPaidSectionRef.current = true
          else if (json.type === 'done') { gotDone = true; onDone?.() }
          else if (json.type === 'free_ref') freeRefRef.current = json.id
          else if (json.type === 'gunghab_saju') onGunghabSaju?.(json)
          else if (json.error) onError?.(json.error)
          else if (json.text) { if (isPaidSectionRef.current) onPaidText?.(json.text); else onBaseText?.(json.text) }
        } catch {}
      }
    }
    if (!gotDone) onError?.('서버 연결이 중단되었습니다. 다시 시도해주세요.')
  }

  // ── handleFreeAnalyze — 로딩 화면 추가 ──
  async function handleFreeAnalyze() {
    if (freeInFlightRef.current) return // 진행 중 중복 요청 방지
    freeInFlightRef.current = true
    trackEvent('free_analysis_started', { service_type: serviceType })
    setPhase('streaming'); setBaseText(''); setPaidText(''); setSajuData(null); setFreeError(null)
    setIsBaseStreaming(true); isPaidSectionRef.current = false; setScreen('result'); freeRefRef.current = ''
    const apiType = serviceType === 'child' ? '자녀천명' : serviceType === '노후' ? '노후' : '기본'
    let failed = false
    // 실패 시 결과 화면에 오류 안내를 띄운다. 첫 메시지를 유지하고, 재시도는 사용자가 버튼으로만 한다.
    const fail = (msg) => { failed = true; setFreeError(prev => prev || msg); setPhase('error'); setIsBaseStreaming(false) }
    try {
      await streamAnalyze({
        body: { gender, maritalStatus, birthdate, birthtime, mbti, blood, type: apiType, isPaid: false, isLunar, userName: myName },
        onSaju: (d) => { setSajuData(d) },
        onBaseText: (t) => setBaseText(prev => prev + t),
        onPaidText: () => {},
        onDone: () => {
          if (failed) return
          setIsBaseStreaming(false); setPhase('done')
        },
        onError: (e) => fail(e),
      })
    } catch (e) {
      if (e.name !== 'AbortError') fail('서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.')
      else { setPhase('input'); setIsBaseStreaming(false) }
    } finally {
      freeInFlightRef.current = false
    }
  }

  // [보안] 결제: 서버가 만든 주문의 주문번호·금액으로 결제창을 열고, 결제가 끝나면 서버가 포트원 결제를 확인한다.
  // 운영자 세션이 있으면 서버가 결제 없는 주문(status: paid)을 만들어 준다.
  function personalInput() {
    return { gender, maritalStatus, birthdate, birthtime, mbti, blood, isLunar, userName: myName }
  }

  async function createOrder(product, input, email) {
    const res = await fetch(isAdmin ? '/api/admin/orders' : `${API_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: isAdmin ? 'same-origin' : 'omit', body: JSON.stringify({ product, input, email: email || undefined }) })
    const json = await readJson(res)
    if (!res.ok || !json.orderId) throw new Error(json.error || '결제를 준비하지 못했어요. 잠시 후 다시 시도해주세요.')
    rememberOrder(json)
    return json
  }

  async function startCheckout({ product, input, email, buyerName, buyerEmail, redirectParams, onPaid }) {
    // 결제 설정이 없으면(미리보기 등) 주문 생성·결제창 모두 열지 않는다. 운영 가맹점 코드로 대체하지 않는다.
    if (!PAYMENT_CONFIG.code) { alert(PAYMENT_CONFIG.error); return }
    let order
    try { order = await createOrder(product, input, email) } catch (e) { alert(e.message); return }
    if (order.status === 'paid') { onPaid(order, true); return }
    const IMP = window.IMP; IMP.init(PAYMENT_CONFIG.code)
    const _params = new URLSearchParams(redirectParams || {}).toString()
    IMP.request_pay({ pg: 'html5_inicis', pay_method: 'card', merchant_uid: order.orderId, name: order.name, amount: order.amount, buyer_name: buyerName || '고객', ...(buyerEmail !== undefined ? { buyer_email: buyerEmail } : {}), m_redirect_url: `${window.location.origin}${window.location.pathname}?${_params}` }, async (rsp) => {
      if (!rsp.success) { alert('결제가 취소되었습니다.'); return }
      try { await confirmPayment(order, rsp.imp_uid) } catch (e) { alert(e.message); return }
      onPaid(order, false)
    })
  }

  function deepCheckout(email, afterPaid) {
    return {
      product: 'deep', input: { ...personalInput(), previousText: [baseText, paidText].filter(t => t && t.trim()).join('\n\n') }, email, buyerName: myName || '고객', buyerEmail: email || '',
      redirectParams: { payment: 'deep', g: gender, ms: maritalStatus, by: birthYear, bm: birthMonth, bd: birthDay, il: isLunar ? '1' : '0', bt: birthtime || '', mbti: mbti || '', blood: blood || '', mn: myName || '' },
      onPaid: (order, comp) => { if (!comp && window.fbq) window.fbq('track', 'Purchase', { value: order.amount, currency: 'KRW' }); setDeepAutoEmail(email || ''); afterPaid(order) },
    }
  }

  async function handlePaidAnalyze(order) {
    paidOrdersRef.current.full = order
    const _baseAtStart = baseText
    setPaidText(''); setIsPaidStreaming(true); isPaidSectionRef.current = false
    try {
      const ctrl = new AbortController(); abortRef.current = ctrl
      const result = await streamOrderAnalysis(order, {
        signal: ctrl.signal,
        onReset: () => { setPaidText(''); setBaseText(_baseAtStart); isPaidSectionRef.current = false },
        onEvent: (json) => {
          if (json.type === 'saju') setSajuData(json)
          else if (json.type === 'paid_start') isPaidSectionRef.current = true
          else if (json.text && !json.type) { if (isPaidSectionRef.current) setPaidText(prev => prev + json.text); else setBaseText(prev => prev + json.text) }
        },
      })
      if (result.ok) clearPaymentReturnUrl(); else alert(result.error)
    } catch (e) { if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.') }
    setIsPaidStreaming(false); setIsPaid(true)
    // 결과 저장과 결제 전 입력 이메일로의 자동 발송은 서버가 생성 완료 후 처리한다.
  }

  async function handleDeepAnalyze(order) {
    paidOrdersRef.current.deep = order
    setDeepText(''); setIsDeepStreaming(true)
    let fullDeepText = ''
    try {
      const ctrl = new AbortController(); abortRef.current = ctrl
      const result = await streamOrderAnalysis(order, {
        signal: ctrl.signal,
        onReset: () => { fullDeepText = ''; setDeepText('') },
        onEvent: (json) => {
          if (json.type === 'saju') setSajuData(json.사주 ? { 사주: json.사주, 생년월일: json.생년월일 } : null)
          else if (json.text) { fullDeepText += json.text; setDeepText(prev => prev + json.text) }
        },
      })
      if (result.ok) clearPaymentReturnUrl(); else alert(result.error)
    } catch (e) { if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.') }
    setIsDeepStreaming(false)
    if (fullDeepText.trim()) setIsDeepPaid(true)
  }

  function requestPayWithEmail(productName, onConfirm) {
    // 같은 사람·같은 입력으로 이어지는 심화 결제에만 방금 쓴 이메일을 미리 채운다. (고객이 확인·수정 가능)
    const sig = prefillSignature(personalInput())
    setPreEmail(emailPrefillFor(productName, emailPrefill, sig))
    setEmailModal({ productName, onConfirm: (email) => { setPreEmail(email || ''); if (email) setEmailPrefill({ email, sig }); onConfirm(email) } })
  }

  // 무료 결과 페이지의 '전체 분석 1,990원' 결제 진입점 — 어느 teaser에서 눌렀는지(location)만 추가로 기록한다.
  function openFullAnalysisCheckout(location) {
    trackEvent('paid_teaser_clicked', { location })
    requestPayWithEmail('전체 분석', (email) => {
      if (!isAdmin) trackEvent('payment_page_opened', { location })
      startCheckout({
        product: 'full_saju', input: { ...personalInput(), previousText: baseText, freeRef: freeRefRef.current }, email, buyerName: myName || '고객', buyerEmail: email || '',
        redirectParams: { payment: 'paid', st: serviceType || 'saju', g: gender, ms: maritalStatus, by: birthYear, bm: birthMonth, bd: birthDay, il: isLunar ? '1' : '0', bt: birthtime || '', mbti: mbti || '', blood: blood || '', mn: myName || '' },
        onPaid: (order, comp) => {
          if (comp) setIsPaid(true)
          else { if (window.fbq) window.fbq('track', 'Purchase', { value: order.amount, currency: 'KRW' }); trackEvent('payment_completed', { location, amount: order.amount }) }
          handlePaidAnalyze(order)
        },
      })
    })
  }

  function handleRestart() {
    const wasEmailSent = document.getElementById('result-email-input')?.dataset?.sent === 'true' || document.getElementById('gunghab-email-input')?.dataset?.sent === 'true'
    if (isPaid && !wasEmailSent) { const confirmed = window.confirm('📧 이메일로 결과를 받으셨나요?\n\n[취소] 돌아가서 이메일 받기\n[확인] 그냥 나가기'); if (!confirmed) return }
    abortRef.current?.abort()
    freeResultViewedRef.current = false
    setPreEmail(''); setEmailPrefill(null); setDeepAutoEmail(null)
    setScreen('landing'); setServiceType(null); setStep(0)
    setGender(''); setMaritalStatus(''); setBirthYear(''); setBirthMonth(''); setBirthDay('')
    setIsLunar(false); setTimeHour(''); setTimeMin(''); setTimeAmPm('오전'); setTimeUnknown(false)
    setMbti(''); setBlood(''); setPhase('input'); setSajuData(null); setBaseText(''); setPaidText('')
    setIsBaseStreaming(false); setIsPaidStreaming(false); setIsPaid(false)
    setGunghabStep(1); set관계유형(''); set관계그룹(''); set관계역할(''); setGunghabFreeText(''); setGunghabFreePhase('input'); setGunghabFreeError(null); setShareDraft(null); setShowSajuStruct(false); setPartnerGender(''); setPartnerBirthYear(''); setPartnerBirthMonth(''); setPartnerBirthDay('')
    setPartnerIsLunar(false); setPartnerTimeHour(''); setPartnerTimeMin(''); setPartnerTimeAmPm('오전'); setPartnerTimeUnknown(false)
    setMyName(''); setPartnerName(''); setGunghabText(''); setIsGunghabStreaming(false); setGunghabSajuData(null)
    setGilil목적(''); setGililText(''); setIsGililStreaming(false); isPaidSectionRef.current = false
    setDeepText(''); setIsDeepStreaming(false); setIsDeepPaid(false); setDeepEmailInput(''); setDeepEmailSent(false)
    set백년Text(''); setIs백년Streaming(false); set백년Name(''); set백년BirthYear(''); set백년BirthMonth(''); set백년BirthDay(''); set백년TimeHour(''); set백년TimeMin(''); set백년TimeAmPm('오전'); set백년TimeUnknown(false); set백년Email(''); set백년EmailSent(false); set백년EmailInput(''); set백년Gender('')
  }

  const 백년Birthdate = (백년BirthYear.length === 4 && 백년BirthMonth && 백년BirthDay) ? `${백년BirthYear}-${String(백년BirthMonth).padStart(2,'0')}-${String(백년BirthDay).padStart(2,'0')}` : ''
  const 백년BirthdateValid = 백년BirthYear.length === 4 && Number(백년BirthMonth) >= 1 && Number(백년BirthMonth) <= 12 && Number(백년BirthDay) >= 1 && Number(백년BirthDay) <= 31
  const 백년Birthtime = 백년TimeUnknown ? '' : (() => { if (!백년TimeHour || !백년TimeMin) return ''; let h = Number(백년TimeHour); if (백년TimeAmPm === '오전' && h === 12) h = 0; if (백년TimeAmPm === '오후' && h !== 12) h += 12; return `${String(h).padStart(2,'0')}:${String(백년TimeMin).padStart(2,'0')}` })()
  const 백년BirthtimeValid = 백년TimeUnknown || (백년TimeHour !== '' && 백년TimeMin !== '')

  const partnerBirthdate = (partnerBirthYear.length === 4 && partnerBirthMonth && partnerBirthDay) ? `${partnerBirthYear}-${String(partnerBirthMonth).padStart(2,'0')}-${String(partnerBirthDay).padStart(2,'0')}` : ''
  const partnerBirthtime = partnerTimeUnknown ? '' : (() => {
    if (!partnerTimeHour || !partnerTimeMin) return ''
    let h = Number(partnerTimeHour)
    if (partnerTimeAmPm === '오전' && h === 12) h = 0
    if (partnerTimeAmPm === '오후' && h !== 12) h += 12
    return `${String(h).padStart(2,'0')}:${String(partnerTimeMin).padStart(2,'0')}`
  })()
  const partnerBirthdateValid = partnerBirthYear.length === 4 && Number(partnerBirthMonth) >= 1 && Number(partnerBirthMonth) <= 12 && Number(partnerBirthDay) >= 1 && Number(partnerBirthDay) <= 31
  const partnerBirthtimeValid = partnerTimeUnknown || (partnerTimeHour !== '' && partnerTimeMin !== '')

  // 관계 궁합 무료 풀이 — 결제 없이 요약·핵심 3가지·대화 문장까지 완결해서 보여준다.
  async function handleGunghabFree() {
    if (freeInFlightRef.current) return
    freeInFlightRef.current = true
    trackEvent('gunghab_free_started', { relation: 관계유형 })
    isPaidSectionRef.current = false
    setGunghabFreeText(''); setGunghabSajuData(null); setGunghabFreeError(null); setGunghabFreePhase('streaming'); setScreen('gunghab_free')
    let failed = false
    const fail = (msg) => { failed = true; setGunghabFreeError(prev => prev || msg); setGunghabFreePhase('error') }
    try {
      await streamAnalyze({
        body: { type: '궁합무료', gender, birthdate, birthtime, isLunar, partnerGender, partnerBirthdate, partnerBirthtime, partnerIsLunar, myName, partnerName, 관계유형, 내역할: 관계역할, isPaid: false },
        onGunghabSaju: (d) => setGunghabSajuData(d),
        onBaseText: (t) => setGunghabFreeText(prev => prev + t),
        onDone: () => { if (!failed) setGunghabFreePhase('done') },
        onError: (e) => fail(e),
      })
    } catch (e) { if (e.name !== 'AbortError') fail('서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.') }
    finally { freeInFlightRef.current = false }
  }

  // 관계 상세 풀이(유료) 결제 시작 — 무료 결과 화면에서만 선택해서 들어온다.
  function startGunghabPaid() {
    startCheckout({
      product: 'gunghab', input: { gender, birthdate, birthtime, isLunar, partnerGender, partnerBirthdate, partnerBirthtime, partnerIsLunar, myName, partnerName, 관계유형, 내역할: 관계역할 }, buyerName: myName || '고객',
      redirectParams: { payment: 'gunghab', rt: 관계유형, rr: 관계역할, g: gender, by: birthYear, bm: birthMonth, bd: birthDay, il: isLunar ? '1' : '0', bt: birthtime || '', mn: myName || '', pn: partnerName || '', pg: partnerGender, pby: partnerBirthYear, pbm: partnerBirthMonth, pbd: partnerBirthDay, ptu: partnerTimeUnknown ? '1' : '0', pil: partnerIsLunar ? '1' : '0', pbt: partnerBirthtime, ptap: partnerTimeAmPm },
      onPaid: (order) => handleGunghabAnalyze(order),
    })
  }

  async function handleGunghabAnalyze(order) {
    paidOrdersRef.current.gunghab = order
    setGunghabText(''); setIsGunghabStreaming(true); setScreen('result')
    try {
      const ctrl = new AbortController(); abortRef.current = ctrl
      const result = await streamOrderAnalysis(order, {
        signal: ctrl.signal,
        onReset: () => { setGunghabText('') },
        onEvent: (json) => { if (json.type === 'gunghab_saju') setGunghabSajuData(json); else if (json.text) setGunghabText(prev => prev + json.text) },
      })
      if (result.ok) clearPaymentReturnUrl(); else alert(result.error)
    } catch (e) { if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.') }
    setIsGunghabStreaming(false)
  }

  async function handleGililAnalyze(order) {
    paidOrdersRef.current.gilil = order
    setGililData(null); setIsGililStreaming(true); setScreen('gilil_result')
    try {
      const res = await fetch(`${API_URL}/api/orders/${encodeURIComponent(order.orderId)}/analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderToken: order.orderToken }) })
      const data = await readJson(res)
      if (data.success) { setGililData(data.data); clearPaymentReturnUrl() } else alert(data.error || '서버에 연결할 수 없습니다.')
    } catch (e) { alert('서버에 연결할 수 없습니다.') }
    setIsGililStreaming(false)
  }

  async function handle백년Analyze(order) {
    paidOrdersRef.current.baeknyeon = order
    set백년Text(''); setIs백년Streaming(true); setScreen('백년_result')
    try {
      const ctrl = new AbortController(); abortRef.current = ctrl
      const result = await streamOrderAnalysis(order, {
        signal: ctrl.signal,
        onReset: () => { set백년Text('') },
        onEvent: (json) => { if (json.text) set백년Text(prev => prev + json.text) },
      })
      if (result.ok) clearPaymentReturnUrl(); else alert(result.error)
    } catch (e) { if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.') }
    setIs백년Streaming(false)
  }

  // ── 100년 입력 ──
  if (screen === '백년_input') {
    const canNext = 백년BirthdateValid && 백년BirthtimeValid && 백년Name.trim().length > 0 && 백년Gender !== ''
    return (
      <div style={{ minHeight: '100vh', background: '#F4F5F7', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: '#FFFFFF', borderBottom: '1px solid #DEDFE5' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#24232B', marginBottom: 10 }}>마이사주</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>100년 사주 인생 꿀팁</h1>
          <p style={{ fontSize: 12, color: '#62616C' }}>지금부터 100세까지, 매년 사주 꿀팁을 드려요</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>이름을 알려주세요</h2>
          <input style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 600, border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', boxSizing: 'border-box', marginBottom: 24 }} placeholder="이름 (예: 홍길동)" value={백년Name} onChange={e => set백년Name(e.target.value)} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>성별을 알려주세요</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button aria-pressed={백년Gender === '남성'} style={{ position: 'relative', flex: 1, padding: '10px', fontSize: 13, fontWeight: 백년Gender === '남성' ? 600 : 400, border: `1px solid ${백년Gender === '남성' ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: 백년Gender === '남성' ? '#F6F0F3' : '#FFFFFF', color: 백년Gender === '남성' ? '#633B50' : '#62616C', cursor: 'pointer' }} onClick={() => set백년Gender('남성')}><CheckMark on={백년Gender === '남성'} />남성</button>
            <button aria-pressed={백년Gender === '여성'} style={{ position: 'relative', flex: 1, padding: '10px', fontSize: 13, fontWeight: 백년Gender === '여성' ? 600 : 400, border: `1px solid ${백년Gender === '여성' ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: 백년Gender === '여성' ? '#F6F0F3' : '#FFFFFF', color: 백년Gender === '여성' ? '#633B50' : '#62616C', cursor: 'pointer' }} onClick={() => set백년Gender('여성')}><CheckMark on={백년Gender === '여성'} />여성</button>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>생년월일을 알려주세요</h2>
          <DateRow year={백년BirthYear} setYear={set백년BirthYear} month={백년BirthMonth} setMonth={set백년BirthMonth} day={백년BirthDay} setDay={set백년BirthDay} lunar={백년IsLunar} setLunar={set백년IsLunar} />
          {백년BirthdateValid && <p style={{ fontSize: 13, color: '#633B50', fontWeight: 600, marginBottom: 20 }}>✓ {백년BirthYear}년 {백년BirthMonth}월 {백년BirthDay}일</p>}
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#24232B', marginTop: 8, marginBottom: 6 }}>태어난 시간을 알려주세요</h2>
          <button aria-pressed={백년TimeUnknown} style={{ position: 'relative', width: '100%', padding: '12px', fontSize: 13, border: `1px solid ${백년TimeUnknown ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: 백년TimeUnknown ? '#F6F0F3' : '#FFFFFF', color: 백년TimeUnknown ? '#633B50' : '#62616C', cursor: 'pointer', marginBottom: 10 }} onClick={() => set백년TimeUnknown(v => !v)}><CheckMark on={백년TimeUnknown} />
            {백년TimeUnknown ? '✓ 모름으로 입력' : '시간을 모르는 경우 클릭'}
          </button>
          {!백년TimeUnknown && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select style={{ flex: 1, padding: '14px 8px', fontSize: 15, border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B' }} value={백년TimeAmPm} onChange={e => set백년TimeAmPm(e.target.value)}>
                <option value="오전">오전</option><option value="오후">오후</option>
              </select>
              <input style={{ flex: 1, padding: '14px 8px', fontSize: 18, fontWeight: 700, border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="시" min="1" max="12" value={백년TimeHour} onChange={e => set백년TimeHour(e.target.value.slice(0,2))} />
              <span style={{ color: '#62616C', fontSize: 18 }}>:</span>
              <input style={{ flex: 1, padding: '14px 8px', fontSize: 18, fontWeight: 700, border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="분" min="0" max="59" value={백년TimeMin} onChange={e => set백년TimeMin(e.target.value.slice(0,2))} />
            </div>
          )}
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#F4F5F7', borderTop: '1px solid #DEDFE5', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', fontSize: 15, cursor: 'pointer', color: '#62616C' }} onClick={() => setScreen('landing')}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 600, background: !canNext ? '#E4E5EA' : '#633B50', color: !canNext ? '#62616C' : '#FFFFFF', border: 'none', borderRadius: 10, cursor: !canNext ? 'not-allowed' : 'pointer' }} disabled={!canNext} onClick={() => setScreen('백년_payment')}>
            다음 — 결제하기
          </button>
        </div>
      </div>
    )
  }

  // ── 100년 결제 ──
  if (screen === '백년_payment') {
    function doPay() {
      startCheckout({
        product: 'baeknyeon', input: { gender: 백년Gender, birthdate: 백년Birthdate, birthtime: 백년Birthtime, userName: 백년Name }, buyerName: 백년Name || '고객',
        redirectParams: { payment: '백년', hn: 백년Name, hby: 백년BirthYear, hbm: 백년BirthMonth, hbd: 백년BirthDay, hth: 백년TimeHour || '', htm: 백년TimeMin || '' },
        onPaid: (order) => handle백년Analyze(order),
      })
    }
    return (
      <div style={{ minHeight: '100vh', background: '#F4F5F7', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: '#FFFFFF', borderBottom: '1px solid #DEDFE5' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#24232B', marginBottom: 10 }}>마이사주</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>100년 사주 인생 꿀팁</h1>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 120px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #DEDFE5', borderRadius: 14, padding: '24px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#62616C', marginBottom: 4 }}>이름: {백년Name}</p>
            <p style={{ fontSize: 13, color: '#62616C' }}>생년월일: {백년BirthYear}년 {백년BirthMonth}월 {백년BirthDay}일{백년Birthtime ? ` · ${백년TimeAmPm} ${백년TimeHour}시 ${백년TimeMin}분` : ' · 시간 미입력'}</p>
          </div>
          <div style={{ background: '#FFFFFF', border: '2px solid #633B50', borderRadius: 14, padding: '28px 24px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
              <span style={{ fontSize: 40, fontWeight: 900, color: '#633B50' }}>99,000</span>
              <span style={{ fontSize: 18, color: '#633B50', fontWeight: 700 }}>원</span>
            </div>
            <div style={{ fontSize: 13, color: '#62616C', lineHeight: 1.8 }}>
              ✦ 현재 나이부터 100세까지 매년 꿀팁<br/>
              ✦ 재물운·관계운·건강운 키워드 매년 제공<br/>
              ✦ 이메일로 전체 결과 발송
            </div>
          </div>
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#F4F5F7', borderTop: '1px solid #DEDFE5', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', fontSize: 15, cursor: 'pointer', color: '#62616C' }} onClick={() => setScreen('백년_input')}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 16, fontWeight: 800, background: '#633B50', color: '#FFFFFF', border: 'none', borderRadius: 10, cursor: 'pointer' }} onClick={doPay}>
            🌟 99,000원 결제하고 받기
          </button>
        </div>
      </div>
    )
  }

  // ── 100년 결과 ──
  if (screen === '백년_result') {
    const yearBlocks = []
    if (백년Text) {
      const parts = 백년Text.split(/(?=\d{4}년\s*\(\d+세\)\s*━)/g)
      parts.forEach(block => {
        const headerMatch = block.match(/^(\d{4}년\s*\(\d+세\))\s*━+/)
        if (headerMatch) {
          const header = headerMatch[1]
          const body = block.slice(headerMatch[0].length).trim()
          yearBlocks.push({ header, body })
        } else if (block.trim() && yearBlocks.length === 0) {
          yearBlocks.push({ header: '', body: block.trim() })
        }
      })
    }
    function send백년Email() {
      if (!백년EmailInput.includes('@')) { alert('이메일 주소를 확인해주세요'); return }
      sendOrderEmail(paidOrdersRef.current.baeknyeon, 백년EmailInput)
        .then(() => { set백년Email(백년EmailInput); set백년EmailSent(true) })
        .catch((e) => alert(e.message))
    }
    return (
      <div className="rpt-page" style={{ display: 'flex', flexDirection: 'column' }}>
        <ReportHero eyebrow="MYSAJU REPORT · 100 YEARS" title="100년 사주 인생 꿀팁" sub={백년Name ? `${백년Name}님 · ${백년BirthYear}년생` : ''} />
        <div className="rpt-inner rpt-wrap" style={{ paddingTop: 28 }}>
          {is백년Streaming && yearBlocks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5F5E55' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#2F5D44' }}>{백년Name || ''}님의 100년 인생 꿀팁 생성 중...</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>지금부터 100세까지 매년 분석 중이에요</p>
            </div>
          )}
          {!is백년Streaming && !백년EmailSent && 백년Text && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#2F5D44', marginBottom: 8 }}>📧 이메일로 전체 결과 받기</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ flex: 1, padding: '12px', fontSize: 14, border: '1px solid #E4E1D4', borderRadius: 8, background: '#FFFFFF', color: '#22211C', boxSizing: 'border-box' }} type="email" placeholder="이메일 주소" value={백년EmailInput} onChange={e => set백년EmailInput(e.target.value)} />
                <button style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={send백년Email}>발송</button>
              </div>
            </div>
          )}
          {백년EmailSent && <p style={{ textAlign: 'center', fontSize: 13, color: '#2F5D44', marginBottom: 16 }}>✅ 이메일로 발송됐어요</p>}
          {yearBlocks.length > 0 ? yearBlocks.map((block, i) => (
            <section key={i} className="rpt-section" style={{ marginTop: i === 0 ? 8 : 44 }}>
              {block.header && <h2 className="rpt-h2">{block.header}</h2>}
              {renderFormattedContent(block.body)}
            </section>
          )) : (백년Text && !is백년Streaming && (
            <div className="rpt-stream">{백년Text}</div>
          ))}
          {is백년Streaming && yearBlocks.length > 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#5F5E55', fontSize: 13 }}>⟳ 계속 생성 중...</div>
          )}
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#FBFAF5', borderTop: '1px solid #E4E1D4', padding: '12px 16px 24px', maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
          <button style={{ width: '100%', padding: '14px', fontSize: 14, fontWeight: 600, background: '#EEF3EA', color: '#2F5D44', border: '1px solid #E4E1D4', borderRadius: 10, cursor: 'pointer' }} onClick={handleRestart}>← 처음으로</button>
        </div>
      </div>
    )
  }

  // ── 길일 입력 ──
  if (screen === 'gilil_input') {
    const 목적목록 = [{ value: '이사', emoji: '🏠' },{ value: '계약', emoji: '📝' },{ value: '개업', emoji: '🎊' },{ value: '결혼', emoji: '💍' },{ value: '수술', emoji: '🏥' },{ value: '시험', emoji: '📚' }]
    const canNext = gilil목적 !== '' && birthdateValid
    return (
      <div style={{ minHeight: '100vh', background: '#F4F5F7', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: '#FFFFFF', borderBottom: '1px solid #DEDFE5' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#24232B', marginBottom: 10 }}>마이사주</p>
          <h1 style={{ wordBreak: 'keep-all', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>길일 추천</h1>
          <p style={{ fontSize: 12, color: '#62616C' }}>내 사주와 맞는 좋은 날을 찾아드려요</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>어떤 날을 찾고 계세요?</h2>
          <p style={{ fontSize: 13, color: '#62616C', marginBottom: 20 }}>목적을 선택해주세요</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {목적목록.map(({ value, emoji }) => (
              <button key={value} aria-pressed={gilil목적 === value} style={{ position: 'relative', padding: '16px 8px', border: `2px solid ${gilil목적 === value ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: gilil목적 === value ? '#F6F0F3' : '#FFFFFF', cursor: 'pointer', textAlign: 'center' }} onClick={() => setGilil목적(value)}><CheckMark on={gilil목적 === value} />
                <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
                <div style={{ fontSize: 13, fontWeight: gilil목적 === value ? 700 : 400, color: gilil목적 === value ? '#633B50' : '#62616C' }}>{value}</div>
              </button>
            ))}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>생년월일을 알려주세요</h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
            <input style={{ width: 90, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="년도" value={birthYear} onChange={e => setBirthYear(e.target.value.slice(0,4))} />
            <span style={{ fontSize: 14, color: '#62616C' }}>년</span>
            <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="월" value={birthMonth} onChange={e => setBirthMonth(e.target.value.slice(0,2))} />
            <span style={{ fontSize: 14, color: '#62616C' }}>월</span>
            <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="일" value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0,2))} />
            <span style={{ fontSize: 14, color: '#62616C' }}>일</span>
          </div>
          {birthdateValid && <p style={{ fontSize: 13, color: '#633B50', textAlign: 'center', fontWeight: 600 }}>✓ {birthYear}년 {birthMonth}월 {birthDay}일</p>}
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#F4F5F7', borderTop: '1px solid #DEDFE5', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', fontSize: 15, cursor: 'pointer', color: '#62616C' }} onClick={() => setScreen('landing')}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 600, background: !canNext ? '#E4E5EA' : '#633B50', color: !canNext ? '#62616C' : '#FFFFFF', border: 'none', borderRadius: 10, cursor: !canNext ? 'not-allowed' : 'pointer' }} disabled={!canNext}
            onClick={() => startCheckout({ product: 'gilil', input: { purpose: gilil목적 }, buyerName: '고객', redirectParams: { payment: 'gilil', gp: gilil목적, by: birthYear, bm: birthMonth, bd: birthDay }, onPaid: (order) => handleGililAnalyze(order) })}>
            📅 길일 찾기 (9,900원)
          </button>
        </div>
      </div>
    )
  }

  // ── 심화 결과 ──
  if (screen === 'deep_result') {
    const deepSections = parseSections(deepText)
    function sendDeepEmail() {
      if (!deepEmailInput.includes('@')) { alert('이메일 주소를 확인해주세요'); return }
      sendOrderEmail(paidOrdersRef.current.deep, deepEmailInput)
        .then(() => setDeepEmailSent(true))
        .catch((e) => alert(e.message))
    }
    const deepShown = deepSections.filter(sec => sec.title !== '분석 결과' && !sec.title.includes('운의계절') && sec.content?.trim())
    const deepSubtitle = sajuData?.생년월일 ? birthMetaLine({ dateText: sajuData.생년월일, isLunar, birthtime, pillars: sajuData.사주 }) : ''
    const deepTitle = productTitle('deep', myName)
    const deepMoneySummary = !isDeepStreaming ? summarizeMoney(deepShown) : null
    // 심화 표·마무리: 같은 고객의 심화 풀이 문장에서만 고른다(새 AI 호출 없음). 근거가 부족하면 해당 표는 만들지 않는다.
    const deepFlowTable = !isDeepStreaming ? buildDeepFlowTable(deepShown) : null
    const deepChoiceTable = !isDeepStreaming ? buildDeepChoiceTable(deepShown) : null
    const deepClosing = !isDeepStreaming ? buildDeepClosing(deepShown) : null
    const deepSummaryIdx = deepShown.findIndex(sec => /종합s*흐름/.test(sec.title))   // 표는 종합 요약 바로 다음에 놓는다
    const saveDeepPdf = () => savePdf({
      filename: pdfFileName('deep', myName),
      title: deepTitle, eyebrow: `마이사주 · ${PRODUCT.deep.label}`, subtitle: deepSubtitle, footerLabel: PRODUCT.deep.label,
      items: buildDeepPdfItems({ sajuData, moneySummary: deepMoneySummary, sections: deepShown, fallbackText: removeMarkers(deepText), flowTable: deepFlowTable, choiceTable: deepChoiceTable, closing: deepClosing }),
    })
    return (
      <div className="rpt-page" style={{ display: 'flex', flexDirection: 'column' }}>
        <ReportHero eyebrow={`마이사주 · ${PRODUCT.deep.label}`} title={deepTitle} sub={deepSubtitle} />
        <div id="deep-result-content" className="rpt-inner rpt-wrap">
  {/* 공통 사주표 (무료·전체·심화 같은 모양) */}
  {sajuData?.사주 && (
    <section className="rpt-section" style={{ marginTop: 28 }}>
      <h2 className="rpt-h2">내 사주 한눈에</h2>
      <SajuTable pillars={sajuData.사주} />
    </section>
  )}


          {/* ── 미리보기 모드 (결제 전) ── */}
          {!isDeepPaid && !isDeepStreaming && (
            <>
              {/* 페인포인트 후킹 박스 */}
              <div style={{ background: '#FFFFFF', border: '1.5px solid #E4E1D4', borderRadius: 16, padding: '28px 22px', marginBottom: 20 }}>
                <p style={{ fontSize: 19, fontWeight: 700, color: '#22211C', marginBottom: 16, lineHeight: 1.5 }}>혹시, 이런 순간 없으셨어요?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 14, color: '#2F5D44', marginTop: 2, flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: 16, color: '#22211C', lineHeight: 1.6 }}>돈이 언제쯤 풀릴지 막막할 때</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 14, color: '#2F5D44', marginTop: 2, flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: 16, color: '#22211C', lineHeight: 1.6 }}>이 선택이 맞는지 흔들릴 때</span>
                  </div>
                </div>
              </div>

              {/* 블러+컷오프 샘플 텍스트 — 이미 생성된 무료 분석과 같은 재물 패턴으로 표시 */}
              {(() => {
                const _teaser = MONEY_TEASER_VARIANTS[getMoneyTeaserVariant(baseText)]
                return (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 12, padding: '20px 18px', marginBottom: 20, overflow: 'hidden' }}>
                    <div style={{ fontSize: 18, lineHeight: 2.2, color: '#22211C', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{_teaser.visible}</div>
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: 18, lineHeight: 2.2, color: '#22211C', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', filter: 'blur(6px)', userSelect: 'none', pointerEvents: 'none' }}>{_teaser.blurred}</div>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0.95) 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#2F5D44', textAlign: 'center', lineHeight: 1.6, padding: '0 20px' }}>여기서부터는 더 자세히 봐드려야 해요</p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* 받는 것 리스트 */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 16, padding: '22px 20px', marginBottom: 20 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#22211C', marginBottom: 16 }}>9,900원 결제하면 이렇게 받아요</p>
                {DEEP_ITEMS.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < DEEP_ITEMS.length - 1 ? 12 : 0 }}>
                    <span style={{ fontSize: 14, color: '#2F5D44', marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 15, color: '#22211C', lineHeight: 1.5 }}>{t}</span>
                  </div>
                ))}
              </div>

              {/* 결과 받는 방법 안내 */}
              <p style={{ fontSize: 13, color: '#5F5E55', textAlign: 'center', lineHeight: 1.6, marginBottom: 16, wordBreak: 'keep-all' }}>결제 후 분석이 시작되며, 완성된 결과는 PDF로 저장하거나 이메일로 받을 수 있어요.</p>

              {/* 결제 버튼 */}
              <button style={{ width: '100%', padding: '18px', fontSize: 18, fontWeight: 800, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 14, cursor: 'pointer', letterSpacing: '0.02em', boxShadow: 'none', marginBottom: 8 }}
                onClick={() => { requestPayWithEmail('심화 분석', (email) => startCheckout(deepCheckout(email, (order) => handleDeepAnalyze(order)))) }}>지금 심화분석 확인하기 →</button>
              <p style={{ fontSize: 12, color: '#5F5E55', textAlign: 'center', marginBottom: 20 }}>결제 즉시 분석이 시작돼요</p>

              <button style={{ width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid #E4E1D4', borderRadius: 10, cursor: 'pointer', color: '#5F5E55' }} onClick={handleRestart}>← 처음으로</button>
            </>
          )}

          {/* ── 실제 결과 모드 (결제 후) ── */}

          {isDeepStreaming && !deepText && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 12, padding: '24px 20px', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#2F5D44', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                <span style={{ fontSize: 14, color: '#5F5E55', marginLeft: 8 }}>🔮 심화 분석 중이에요...</span>
              </div>
            </div>
          )}
          {isDeepStreaming && deepText && (
            <div className="rpt-stream" style={{ marginTop: 28 }}>{removeMarkers(deepText)}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}
          {!isDeepStreaming && (() => {
            if (deepShown.length > 0) return (
              <>
                <ReportSummary data={deepMoneySummary} />
                {deepSummaryIdx < 0 && <>{deepFlowTable && <ReportTable {...deepFlowTable} />}{deepChoiceTable && <ReportTable {...deepChoiceTable} />}</>}
                {deepShown.map((sec, i) => (
                  <div key={i}>
                    <ReportSection title={sec.title} content={sec.content} part={i + 1} />
                    {i === deepSummaryIdx && <>{deepFlowTable && <ReportTable {...deepFlowTable} />}{deepChoiceTable && <ReportTable {...deepChoiceTable} />}</>}
                  </div>
                ))}
                {deepClosing && <ClosingBlock closing={deepClosing} />}
              </>
            )
            if (isDeepPaid && deepText.trim()) return <div className="rpt-stream" style={{ marginTop: 28 }}>{removeMarkers(deepText)}</div>
            return null
          })()}

          {isDeepPaid && (
            <div data-pdf-exclude="true">
              {!deepEmailSent && deepAutoEmail !== null && (
                <p style={{ fontSize: 13, color: '#2F5D44', textAlign: 'center', lineHeight: 1.7, marginBottom: 10, wordBreak: 'keep-all' }}>
                  {deepAutoEmail ? <>📧 입력하신 {deepAutoEmail}로도 결과를 보내드려요.<br/>메일이 보이지 않으면 아래에서 직접 받을 수 있어요.</> : '이메일 없이 결제하셨어요. 아래에서 이메일로 받거나 PDF로 저장해주세요.'}
                </p>
              )}
              {!deepEmailSent ? (
                <div style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#2F5D44', marginBottom: 8 }}>📧 이메일로 결과 받기</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ flex: 1, padding: '12px', fontSize: 14, border: '1px solid #E4E1D4', borderRadius: 8, background: '#FFFFFF', color: '#22211C', boxSizing: 'border-box' }} type="email" placeholder="이메일 주소" value={deepEmailInput} onChange={e => setDeepEmailInput(e.target.value)} />
                    <button style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={sendDeepEmail}>발송</button>
                  </div>
                </div>
              ) : (
                <p style={{ textAlign: 'center', fontSize: 13, color: '#2F5D44', marginBottom: 16 }}>✅ 이메일로 발송됐어요</p>
              )}
              <PdfSaveArea onSave={saveDeepPdf} />
              <button style={{ width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid #E4E1D4', borderRadius: 10, cursor: 'pointer', color: '#5F5E55', marginTop: 10 }} onClick={handleRestart}>처음으로 돌아가기</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── 길일 결과 ──
  if (screen === 'gilil_result') {
    const months = gililData ? Object.values(gililData) : []
    const [selMonth, setSelMonth] = useState(0)
    const [selDay, setSelDay] = useState(null)
    const cur = months[selMonth]
    return (
      <div className="rpt-page" style={{ display: 'flex', flexDirection: 'column' }}>
        <ReportHero eyebrow="MYSAJU REPORT · AUSPICIOUS DAYS" title={`${gilil목적} 길일 추천`} />
        <div className="rpt-inner" style={{ paddingBottom: 100 }}>
          {isGililStreaming && <div style={{ textAlign: 'center', padding: '60px 0', color: '#5F5E55', fontSize: 14 }}>🔍 길일을 찾고 있어요...</div>}
          {!isGililStreaming && gililData && (
            <>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '16px 0 12px', scrollbarWidth: 'none' }}>
                {months.map((m, i) => <button key={i} aria-pressed={selMonth === i} onClick={() => { setSelMonth(i); setSelDay(null) }} style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 20, fontSize: 12, border: '1px solid', cursor: 'pointer', borderColor: selMonth === i ? '#2F5D44' : '#E4E1D4', background: selMonth === i ? '#EEF3EA' : '#FFFFFF', color: selMonth === i ? '#2F5D44' : '#5F5E55', fontWeight: selMonth === i ? 700 : 400 }}>{selMonth === i ? '✓ ' : ''}{m.month}월</button>)}
              </div>
              {cur && (
                <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E1D4', borderRadius: 12, padding: '14px 12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 8 }}>
                    {['일','월','화','수','목','금','토'].map((d, i) => <div key={d} style={{ fontSize: 11, padding: '2px 0', color: i === 0 ? '#C53A3A' : '#5F5E55' }}>{d}</div>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {(() => {
                      const startDay = new Date(cur.year, cur.month - 1, 1).getDay()
                      const daysInMonth = new Date(cur.year, cur.month, 0).getDate()
                      const gililMap = {}; cur.days.forEach(d => { gililMap[d.date] = d.comment })
                      const cells = []
                      for (let i = 0; i < startDay; i++) cells.push(<div key={`e${i}`} />)
                      for (let d = 1; d <= daysInMonth; d++) {
                        const isGilil = !!gililMap[d], isSun = (startDay + d - 1) % 7 === 0, isSelected = selDay === d
                        cells.push(<div key={d} onClick={() => isGilil && setSelDay(isSelected ? null : d)} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 12, borderRadius: 8, cursor: isGilil ? 'pointer' : 'default', background: isGilil ? '#EEF3EA' : 'transparent', border: isSelected ? '1.5px solid #2F5D44' : isGilil ? '0.5px solid #2F5D44' : 'none', color: isGilil ? (isSun ? '#C53A3A' : '#2F5D44') : (isSun ? '#C53A3A' : '#5F5E55'), fontWeight: isGilil ? 600 : 400 }}>
                          {d}{isGilil && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2F5D44', marginTop: 2 }} />}
                        </div>)
                      }
                      return cells
                    })()}
                  </div>
                  {selDay && cur.days.find(d => d.date === selDay) && (
                    <div style={{ background: '#EEF3EA', border: '0.5px solid #E4E1D4', borderRadius: 8, padding: '8px 12px', fontSize: 16, color: '#2F5D44', lineHeight: 1.7, marginTop: 12 }}>
                      {cur.month}월 {selDay}일 — {cur.days.find(d => d.date === selDay).comment}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ position: 'fixed', bottom: 0, width: '100%', background: '#FBFAF5', borderTop: '1px solid #E4E1D4', padding: '12px 20px' }}>
          <button onClick={handleRestart} style={{ width: '100%', padding: '14px', borderRadius: 10, border: '1px solid #E4E1D4', background: 'transparent', color: '#5F5E55', fontSize: 14, cursor: 'pointer' }}>처음으로 돌아가기</button>
        </div>
      </div>
    )
  }

  // ── 궁합 입력 ──
  if (screen === 'gunghab_input') {
    const isStep0 = gunghabStep === 0
    const isStep1 = gunghabStep === 1
    const myBirthdateValid = birthYear.length === 4 && Number(birthMonth) >= 1 && Number(birthMonth) <= 12 && Number(birthDay) >= 1
    const myBirthtimeValid = timeUnknown || (timeHour !== '' && timeMin !== '')
    const canStep1Next = gender !== '' && myBirthdateValid && myBirthtimeValid
    const canStep2Next = partnerGender !== '' && partnerBirthdateValid && partnerBirthtimeValid
    const step0Valid = 관계유형 !== '' && (관계유형 !== '부모자녀' || 관계역할 !== '')

    const TimeSelector = ({ ampm, setAmpm, hour, setHour, min, setMin, unknown, setUnknown }) => (
      <>
        <button aria-pressed={unknown} style={{ position: 'relative', width: '100%', padding: '13px 16px', border: `1px solid ${unknown ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: unknown ? '#F6F0F3' : '#FFFFFF', color: unknown ? '#633B50' : '#62616C', fontSize: 14, fontWeight: unknown ? 600 : 400, cursor: 'pointer', textAlign: 'center', marginBottom: 16 }} onClick={() => { setUnknown(true); setHour(''); setMin('') }}><CheckMark on={unknown} />✓ 태어난 시간 모름</button>
        {!unknown && (
          <>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#633B50', marginBottom: 8 }}>오전 / 오후</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {['오전','오후'].map(ap => <button key={ap} aria-pressed={ampm === ap} style={{ position: 'relative', padding: '14px', fontSize: 15, fontWeight: ampm === ap ? 700 : 400, border: `2px solid ${ampm === ap ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: ampm === ap ? '#F6F0F3' : '#FFFFFF', color: ampm === ap ? '#633B50' : '#62616C', cursor: 'pointer' }} onClick={() => setAmpm(ap)}><CheckMark on={ampm === ap} />{ap === '오전' ? '🌅' : '🌇'} {ap}</button>)}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#633B50', marginBottom: 8 }}>시 선택</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => <button key={h} aria-pressed={hour === String(h)} style={{ position: 'relative', padding: '12px 4px', fontSize: 14, fontWeight: hour === String(h) ? 700 : 400, border: `1px solid ${hour === String(h) ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: hour === String(h) ? '#F6F0F3' : '#FFFFFF', color: hour === String(h) ? '#633B50' : '#62616C', cursor: 'pointer', textAlign: 'center' }} onClick={() => setHour(String(h))}><CheckMark on={hour === String(h)} />{h}시</button>)}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#633B50', marginBottom: 8 }}>분 선택</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {['00','10','20','30','40','50'].map(m => <button key={m} aria-pressed={min === m} style={{ position: 'relative', padding: '12px 4px', fontSize: 14, fontWeight: min === m ? 700 : 400, border: `1px solid ${min === m ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: min === m ? '#F6F0F3' : '#FFFFFF', color: min === m ? '#633B50' : '#62616C', cursor: 'pointer', textAlign: 'center' }} onClick={() => setMin(m)}><CheckMark on={min === m} />{m}분</button>)}
            </div>
            {hour && min && <p style={{ fontSize: 13, color: '#633B50', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>✓ {ampm} {hour}시 {min}분</p>}
          </>
        )}
        {unknown && <button style={{ fontSize: 13, color: '#62616C', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' }} onClick={() => setUnknown(false)}>시간 직접 선택하기</button>}
      </>
    )

        return (
      <div style={{ minHeight: '100vh', background: '#F4F5F7', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: '#FFFFFF', borderBottom: '1px solid #DEDFE5' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#24232B', marginBottom: 10 }}>마이사주</p>
          <h1 style={{ wordBreak: 'keep-all', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>관계 궁합</h1>
          <p style={{ fontSize: 12, color: '#62616C' }}>{isStep0 ? '어떤 관계를 분석할까요?' : isStep1 ? '먼저 내 정보를 입력해주세요' : '이제 상대방 정보를 입력해주세요'}</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ height: 2, background: '#FFFFFF', borderRadius: 99, margin: '14px 0 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: isStep0 ? '33%' : isStep1 ? '66%' : '100%', background: '#633B50', borderRadius: 99, transition: 'width 0.35s ease' }} />
          </div>
          <p style={{ fontSize: 11, color: '#62616C', textAlign: 'right', marginTop: 4, marginBottom: 8 }}>{isStep0 ? '1' : isStep1 ? '2' : '3'} / 3</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
          {isStep0 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>두 분은 어떤 사이인가요?</h2>
              <p style={{ fontSize: 13, color: '#62616C', marginBottom: 24 }}>관계에 따라 궁합을 다르게 풀어드려요</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {RELATION_GROUPS.map(({ key: value, emoji, label, sub, types }) => (
                  <button key={value}
                    aria-pressed={관계그룹 === value} style={{ position: 'relative', padding: '18px 20px', border: `2px solid ${관계그룹 === value ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: 관계그룹 === value ? '#F6F0F3' : '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.15s' }}
                    onClick={() => { set관계그룹(value); if (types.length === 1) { set관계유형(types[0]); set관계역할('') } else if (!types.includes(관계유형)) { set관계유형(''); set관계역할('') } }}><CheckMark on={관계그룹 === value} />
                    <span style={{ fontSize: 28 }}>{emoji}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 관계그룹 === value ? '#633B50' : '#24232B' }}>{label}</div>
                      <div style={{ fontSize: 12, color: '#62616C', marginTop: 2 }}>{sub}</div>
                    </div>
                  </button>
                ))}
              </div>
              {(() => {
                const grp = RELATION_GROUPS.find(g => g.key === 관계그룹)
                if (!grp || grp.types.length < 2) return null
                return (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#633B50', marginBottom: 8 }}>{grp.key === 'lover' ? '어떤 사이인가요?' : '어느 쪽에 가까운가요?'}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {RELATION_OPTIONS.filter(o => grp.types.includes(o.key)).map(({ key, label, sub }) => (
                        <button key={key} aria-pressed={관계유형 === key} onClick={() => { set관계유형(key); if (key !== '부모자녀') set관계역할('') }} style={{ position: 'relative', padding: '14px 12px', border: '2px solid ' + (관계유형 === key ? '#633B50' : '#DEDFE5'), borderRadius: 10, background: 관계유형 === key ? '#F6F0F3' : '#FFFFFF', cursor: 'pointer', textAlign: 'left' }}>
                          <CheckMark on={관계유형 === key} />
                          <div style={{ fontSize: 14, fontWeight: 600, color: 관계유형 === key ? '#633B50' : '#24232B' }}>{label}</div>
                          <div style={{ fontSize: 12, color: '#62616C', marginTop: 2 }}>{sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}
              {관계유형 === '부모자녀' && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#633B50', marginBottom: 8 }}>내가 어느 쪽인가요?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {RELATION_ROLES.map(({ key, label, sub }) => (
                      <button key={key} aria-pressed={관계역할 === key} onClick={() => set관계역할(key)} style={{ position: 'relative', padding: '14px 12px', border: '2px solid ' + (관계역할 === key ? '#633B50' : '#DEDFE5'), borderRadius: 10, background: 관계역할 === key ? '#F6F0F3' : '#FFFFFF', cursor: 'pointer', textAlign: 'left' }}>
                        <CheckMark on={관계역할 === key} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: 관계역할 === key ? '#633B50' : '#24232B' }}>{label}</div>
                        <div style={{ fontSize: 12, color: '#62616C', marginTop: 2 }}>{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {isStep1 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>나의 정보</h2>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#633B50', marginBottom: 8 }}>이름 (선택)</p>
                <input style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', boxSizing: 'border-box' }} type="text" placeholder="내 이름을 입력해주세요" value={myName} onChange={e => setMyName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {['여성','남성'].map(g => <button key={g} aria-pressed={gender === g} style={{ position: 'relative', padding: '22px 16px', border: `2px solid ${gender === g ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: gender === g ? '#F6F0F3' : '#FFFFFF', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }} onClick={() => setGender(g)}><CheckMark on={gender === g} /><span style={{ fontSize: 16, fontWeight: 600, color: gender === g ? '#633B50' : '#24232B' }}>{g}</span></button>)}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 12 }}>내 생년월일 · 시간</h2>
              <DateRow year={birthYear} setYear={setBirthYear} month={birthMonth} setMonth={setBirthMonth} day={birthDay} setDay={setBirthDay} lunar={isLunar} setLunar={setIsLunar} />
              <TimeSelector ampm={timeAmPm} setAmpm={setTimeAmPm} hour={timeHour} setHour={setTimeHour} min={timeMin} setMin={setTimeMin} unknown={timeUnknown} setUnknown={setTimeUnknown} />
            </>
          )}
          {!isStep0 && !isStep1 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 6 }}>상대방 정보</h2>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#633B50', marginBottom: 8 }}>상대방 이름 (선택)</p>
                <input style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', color: '#24232B', boxSizing: 'border-box' }} type="text" placeholder="상대방 이름을 입력해주세요" value={partnerName} onChange={e => setPartnerName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {['여성','남성'].map(g => <button key={g} aria-pressed={partnerGender === g} style={{ position: 'relative', padding: '22px 16px', border: `2px solid ${partnerGender === g ? '#633B50' : '#DEDFE5'}`, borderRadius: 10, background: partnerGender === g ? '#F6F0F3' : '#FFFFFF', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }} onClick={() => setPartnerGender(g)}><CheckMark on={partnerGender === g} /><span style={{ fontSize: 16, fontWeight: 600, color: partnerGender === g ? '#633B50' : '#24232B' }}>{g}</span></button>)}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#24232B', marginBottom: 12 }}>상대방 생년월일 · 시간</h2>
              <DateRow year={partnerBirthYear} setYear={setPartnerBirthYear} month={partnerBirthMonth} setMonth={setPartnerBirthMonth} day={partnerBirthDay} setDay={setPartnerBirthDay} lunar={partnerIsLunar} setLunar={setPartnerIsLunar} />
              <TimeSelector ampm={partnerTimeAmPm} setAmpm={setPartnerTimeAmPm} hour={partnerTimeHour} setHour={setPartnerTimeHour} min={partnerTimeMin} setMin={setPartnerTimeMin} unknown={partnerTimeUnknown} setUnknown={setPartnerTimeUnknown} />
            </>
          )}
          {!isStep0 && !isStep1 && (
            <div style={{ marginTop: 28, background: '#FFFFFF', border: '1px solid #DEDFE5', borderRadius: 16, padding: '20px 18px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#633B50', marginBottom: 10 }}>무료 요약에서 확인할 수 있어요</p>
              {['관계 한 줄 요약과 짧은 설명', '이 관계의 핵심 3가지와 짧은 해설·행동 팁', '잘 맞는 점 1개와 조율할 점 1개', '바로 써볼 수 있는 대화 문장 1개'].map(t => (
                <div key={t} style={{ display: 'flex', gap: 8, fontSize: 14, color: '#24232B', lineHeight: 1.6, marginBottom: 6 }}><span style={{ color: '#633B50' }}>✓</span><span>{t}</span></div>
              ))}
              <p style={{ fontSize: 12, color: '#62616C', lineHeight: 1.6, margin: '10px 0 0', wordBreak: 'keep-all' }}>무료 요약은 결제 없이 볼 수 있어요. 더 깊은 상세 풀이(유료)는 요약을 본 뒤 선택할 수 있어요.</p>
            </div>
          )}
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#F4F5F7', borderTop: '1px solid #DEDFE5', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid #DEDFE5', borderRadius: 10, background: '#FFFFFF', fontSize: 15, cursor: 'pointer', color: '#62616C' }} onClick={() => {
  if (isStep0) setScreen('landing')
  else if (isStep1) setGunghabStep(0)
  else setGunghabStep(1)
}}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 600, background: (isStep0 ? !step0Valid : isStep1 ? !canStep1Next : !canStep2Next) ? '#E4E5EA' : '#633B50', color: (isStep0 ? !step0Valid : isStep1 ? !canStep1Next : !canStep2Next) ? '#62616C' : '#FFFFFF', border: 'none', borderRadius: 10, cursor: (isStep0 ? !step0Valid : isStep1 ? !canStep1Next : !canStep2Next) ? 'not-allowed' : 'pointer' }}
            disabled={isStep0 ? !step0Valid : isStep1 ? !canStep1Next : !canStep2Next}
           onClick={() => {
  if (isStep0) { setGunghabStep(1); return }
  if (isStep1) { setGunghabStep(2); return }
              handleGunghabFree()
            }}>
            {isStep0 ? '다음 — 내 정보 입력' : isStep1 ? '다음 — 상대방 정보 입력' : '무료로 관계 보기'}
          </button>
        </div>
      </div>
    )
  }

  // ── 관계 궁합 무료 결과 ──
  if (screen === 'gunghab_free') {
    const relLabel = gunghabSajuData?.relation?.label || RELATION_OPTIONS.find(o => o.key === 관계유형)?.label || '관계'
    const parsed = gunghabFreePhase === 'done' ? parseGunghabFree(gunghabFreeText, gunghabSajuData?.bars) : null
    const readable = parsed && (parsed.summary || parsed.good || parsed.tune)
    const paidInfo = GUNGHAB_PAID[관계유형]
    const card = { background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 14, padding: '20px 18px', marginTop: 28 }
    const compareItems = (t) => String(t || '').split(/\n+/).map(x => x.trim()).filter(Boolean).map(x => ({ text: x }))
    // 화면에 보이는 무료 요약 그대로(한 줄 요약·일상·그래프·잘 맞는 점·조율할 점·대화 문장)를 PDF로 저장한다.
    const saveGunghabFreePdf = () => {
      const fs = parsed ? [
        parsed.summary && { title: '일상에서는 이렇게 나타날 수 있어요', content: parsed.summary },
        parsed.good && { title: '잘 맞는 점', content: parsed.good },
        parsed.tune && { title: '조율할 점', content: parsed.tune },
        parsed.line && { title: '이렇게 말해보세요', content: parsed.line },
      ].filter(Boolean) : []
      return savePdf({
        filename: '마이사주_궁합요약_' + (myName || '결과'),
        title: relLabel + ' 관계, 한눈에 보기', eyebrow: '관계 궁합 · 무료 요약', subtitle: '',
        items: [
          ...(parsed?.headline ? [{ kind: 'summary', data: { kind: 'gunghab-head', title: '이 관계를 한 줄로', headline: parsed.headline } }] : []),
          { kind: 'card', selector: '[data-pdf-card="bars"]' },
          ...fs.map((sec, i) => ({ kind: 'section', title: sec.title, content: sec.content, part: i + 1 })),
        ],
      })
    }
    return (
      <div className="rpt-page">
        <ReportHero eyebrow="관계 궁합 · 무료 요약" title={relLabel + ' 관계, 한눈에 보기'} />
        <div id="gunghab-free-content" className="rpt-inner rpt-wrap">

          {gunghabFreePhase === 'streaming' && (
            <div role="status" style={card}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {[0,1,2].map(n => <div key={n} style={{ width: 10, height: 10, borderRadius: '50%', background: '#2F5D44', animation: 'pulse 1.2s ease-in-out ' + (n * 0.2) + 's infinite' }} />)}
                <span style={{ fontSize: 17, color: '#22211C', marginLeft: 10 }}>두 사람의 관계를 살펴보고 있어요</span>
              </div>
            </div>
          )}

          {gunghabFreePhase === 'error' && (
            <div role="alert" style={{ ...card, border: '1px solid #C53A3A' }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#C53A3A', margin: '0 0 6px' }}>풀이를 불러오지 못했어요</p>
              <p style={{ fontSize: 15, color: '#5F5E55', lineHeight: 1.7, margin: '0 0 16px', wordBreak: 'keep-all' }}>{gunghabFreeError || '잠시 후 다시 시도해주세요.'}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ flex: 1, padding: '14px', fontSize: 16, fontWeight: 700, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer' }} onClick={handleGunghabFree}>다시 시도</button>
                <button style={{ flex: 1, padding: '14px', fontSize: 16, background: '#FFFFFF', color: '#22211C', border: '1px solid #E4E1D4', borderRadius: 12, cursor: 'pointer' }} onClick={() => { setGunghabFreePhase('input'); setScreen('gunghab_input') }}>입력 화면으로</button>
              </div>
            </div>
          )}

          {parsed && !readable && (
            <p className="rpt-stream" style={{ marginTop: 28 }}>{removeMarkers(safeGunghabText(gunghabFreeText, gunghabSajuData?.bars))}</p>
          )}

          {readable && (
            <>
              {parsed.demo && <div role="note" style={{ background: '#FFF8E1', border: '1px solid #E8D9A8', borderRadius: 10, padding: '10px 14px', marginTop: 20, fontSize: 14, color: '#6B5B1F', wordBreak: 'keep-all' }}>{parsed.demo}</div>}
              {parsed.headline && <ReportSummary data={{ kind: 'gunghab-head', title: '이 관계를 한 줄로', headline: parsed.headline }} />}
              {parsed.summary && (
                <section className="rpt-section" style={{ marginTop: 40 }}>
                  <h3 className="rpt-h3" style={{ marginTop: 0 }}>일상에서는 이렇게 나타날 수 있어요</h3>
                  {renderFormattedContent(parsed.summary)}
                </section>
              )}
              <GunghabBars bars={parsed.bars} />
              {(parsed.good && parsed.tune) ? (
                <CompareBlock left={{ head: '잘 맞는 점', items: compareItems(parsed.good) }} right={{ head: '조율할 점', items: compareItems(parsed.tune) }} />
              ) : (
                <>
                  {parsed.good && <section className="rpt-section" style={{ marginTop: 32 }}><h3 className="rpt-h3" style={{ marginTop: 0 }}>잘 맞는 점</h3>{renderFormattedContent(parsed.good)}</section>}
                  {parsed.tune && <section className="rpt-section" style={{ marginTop: 32 }}><h3 className="rpt-h3" style={{ marginTop: 0 }}>조율할 점</h3>{renderFormattedContent(parsed.tune)}</section>}
                </>
              )}
              {parsed.line && (
                <div className="rpt-callout">
                  <p className="rpt-callout-head">이렇게 말해보세요</p>
                  <p className="rpt-p" style={{ fontWeight: 600, marginBottom: 0 }}>{parsed.line}</p>
                </div>
              )}
              <div data-pdf-exclude="true">
                <button style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 600, background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 10, cursor: 'pointer', color: '#2F5D44', margin: '20px 0' }}
                  onClick={() => setShareDraft(buildShareText({ sentence: parsed.headline, fallback: '사주로 우리 관계를 가볍게 살펴봤어요. 너는 어때?', people: [[myName, '나'], [partnerName, '상대']] }))}>
                  이 결과 요약 공유하기
                </button>

                {paidInfo && <PaidGuide title={paidInfo.title} bundles={paidInfo.bundles} priceText={GUNGHAB_PRICE_TEXT} buttonText={'상세 풀이 보기 · ' + GUNGHAB_PRICE_TEXT} onBuy={startGunghabPaid} />}
              </div>
              <PdfSaveArea onSave={saveGunghabFreePdf} />
            </>
          )}

          <button data-pdf-exclude="true" style={{ width: '100%', padding: '14px', fontSize: 15, background: 'none', border: '1px solid #E4E1D4', borderRadius: 10, cursor: 'pointer', color: '#5F5E55', marginTop: 20 }} onClick={handleRestart}>처음으로 돌아가기</button>
        </div>
        {shareDraft !== null && <ShareModal initialText={shareDraft} onClose={() => setShareDraft(null)} />}
      </div>
    )
  }

  // ── 궁합 결과 ──
  if (screen === 'result' && serviceType === 'gunghab') {
    const gunghabSections = parseSections(gunghabText)
    const gunghabTitle = (gunghabSajuData?.relation?.label || '관계') + ' 상세 풀이'
    const gunghabSubtitle = gunghabSajuData?.my?.name && gunghabSajuData?.partner?.name ? gunghabSajuData.my.name + '님 · ' + gunghabSajuData.partner.name + '님' : ''
    // 무료 요약에서 검증을 통과한 대화 문장이 있을 때만 '바로 써볼 대화 방법'으로 쓴다
    const gunghabFreeLine = gunghabFreeText ? parseGunghabFree(gunghabFreeText, gunghabSajuData?.bars).line : ''
    const gunghabSummary = !isGunghabStreaming ? summarizeGunghabPaid(gunghabSections, gunghabFreeLine) : null
    const saveGunghabPdf = () => savePdf({
      filename: '마이사주_궁합분석_' + (myName || '결과'),
      title: gunghabTitle, eyebrow: 'MYSAJU REPORT · RELATIONSHIP', subtitle: gunghabSubtitle,
      items: [
        ...(gunghabSummary ? [{ kind: 'summary', data: gunghabSummary }] : []),
        { kind: 'card', selector: '[data-pdf-card="pair"]' },
        { kind: 'card', selector: '[data-pdf-card="bars"]' },
        ...gunghabSections.map((sec, i) => ({ kind: 'section', title: sec.title, content: sec.content, part: i + 1 })),
      ],
    })
    return (
      <div className="rpt-page">
        <ReportHero eyebrow="MYSAJU REPORT · RELATIONSHIP" title={gunghabTitle} sub={gunghabSubtitle} />
        <div id="gunghab-result-content" className="rpt-inner rpt-wrap">
          <ReportSummary data={gunghabSummary} />
          {gunghabSajuData && (
            <div data-pdf-card="pair" className="rpt-card" style={{ padding: '22px 14px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#2F5D44', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 10 }}>두 사람의 사주팔자</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ label: gunghabSajuData.my.name + '님', data: gunghabSajuData.my }, { label: gunghabSajuData.partner.name + '님', data: gunghabSajuData.partner }].map(({ label, data }) => (
                  <div key={label} style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 10, padding: '14px 10px' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#2F5D44', textAlign: 'center', marginBottom: 8 }}>{label}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[{ k: '시주(時)', v: data.시주 }, { k: '일주(日)', v: data.일주 }, { k: '월주(月)', v: data.월주 }, { k: '년주(年)', v: data.년주 }].map(({ k, v }) => (
                        <div key={k} style={{ textAlign: 'center', background: '#FFFFFF', borderRadius: 7, padding: '10px 4px', border: '1px solid #E4E1D4' }}>
                          <span style={{ fontSize: 11, color: '#5F5E55', display: 'block', marginBottom: 4 }}>{k}</span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#22211C' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isGunghabStreaming && gunghabText && <div className="rpt-stream" style={{ marginTop: 28 }}>{removeMarkers(gunghabText)}<span style={{ opacity: 0.4 }}>▌</span></div>}
          {isGunghabStreaming && !gunghabText && <div style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 12, padding: '24px 20px', marginBottom: 12 }}><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#2F5D44', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}<span style={{ fontSize: 14, color: '#5F5E55', marginLeft: 8 }}>💕 두 사람의 궁합을 분석하고 있어요...</span></div></div>}
          {!isGunghabStreaming && <GunghabBars bars={gunghabSajuData?.bars} />}
          {!isGunghabStreaming && gunghabSections.map((sec, i) => <ReportSection key={i} title={sec.title} content={sec.content} part={i + 1} />)}
          <div data-pdf-exclude="true">
          <PdfSaveArea onSave={saveGunghabPdf} disabled={isGunghabStreaming || !gunghabText} />
          <button style={{ width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid #E4E1D4', borderRadius: 10, cursor: 'pointer', color: '#5F5E55', marginTop: 10 }} onClick={handleRestart}>처음으로 돌아가기</button>
            <div style={{ marginTop: 20, background: '#EEF3EA', border: '1px solid #E4E1D4', borderRadius: 12, padding: '20px' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#2F5D44', marginBottom: 6 }}>📧 이메일로 결과 받기</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input id="gunghab-email-input" type="email" placeholder="이메일 주소 입력" style={{ flex: 1, padding: '10px 14px', fontSize: 13, border: '1px solid rgba(180,160,110,0.4)', borderRadius: 8, background: '#FFFFFF', color: '#22211C' }} />
                <button style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={async () => {
                    const email = document.getElementById('gunghab-email-input').value
                    if (!email || !email.includes('@')) { alert('이메일 주소를 확인해주세요.'); return }
                    const btn = document.querySelector('#gunghab-email-input + button'); btn.textContent = '발송 중...'; btn.disabled = true
                    try { await sendOrderEmail(paidOrdersRef.current.gunghab, email); document.getElementById('gunghab-email-input').dataset.sent = 'true'; alert('이메일을 발송했어요! 😊') } catch (e) { alert(e.message || '발송 오류가 발생했습니다.') }
                    finally { btn.textContent = '발송'; btn.disabled = false }
                  }}>발송</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

 // ── 이메일 모달 ──
if (emailModal) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(36,35,43,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}>
      <div style={{ background: '#FFFFFF', border: '1px solid #DEDFE5', borderRadius: 20, padding: '36px 28px', maxWidth: 380, width: '100%' }}>
        {emailModal.productName === '심화 분석' ? (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#24232B', textAlign: 'center', marginBottom: 8, lineHeight: 1.5 }}>막혔던 부분,<br/>지금 다 풀어드릴게요</p>
            <p style={{ fontSize: 13, color: '#24232B', textAlign: 'center', marginBottom: 18, lineHeight: 1.6 }}>종합 흐름 요약 · 수비학 운명수 · 10년 대운 · 귀인 · 해야 할 것과 하지 말아야 할 것</p>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#633B50' }}>9,900원</span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#62616C', textAlign: 'center', marginBottom: 20 }}>결제 후 풀이를 생성해요.</p>
          </>
        ) : emailModal.productName === '자녀운 프리미엄' ? (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#24232B', textAlign: 'center', marginBottom: 8, lineHeight: 1.5 }}>이 아이, 어떤 학과가<br/>맞는지 알려드릴게요</p>
            <p style={{ fontSize: 13, color: '#24232B', textAlign: 'center', marginBottom: 18, lineHeight: 1.6 }}>추천학과 5개 · 맞는 직업 방향 · 입시 유리한 시기 · 공부가 잘 되는 방법까지</p>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#633B50' }}>9,900원</span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#62616C', textAlign: 'center', marginBottom: 20 }}>결제 후 풀이를 생성해요.</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 32, textAlign: 'center', marginBottom: 10 }}>📧</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#633B50', textAlign: 'center', marginBottom: 20, wordBreak: 'keep-all', lineHeight: 1.4 }}>결과 받을 이메일을<br/>입력해주세요</p>
          </>
        )}
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: '#24232B', lineHeight: 2.2, margin: 0, wordBreak: 'keep-all' }}>
            {emailModal.productName === '전체 분석' || emailModal.productName === '자녀운 프리미엄' || emailModal.productName === '심화 분석' ? '📧 결과가 완성되면 이메일로도 보내드려요' : '📧 결과가 완성되면 결과 화면에서 이메일로 받을 수 있어요'}<br/>
            🔒 이메일은 결과 발송과 결제·문의 확인에만 쓰이고, 구매 기록과 함께 저장돼요<br/>
            📄 결과 화면에서 PDF로 저장할 수도 있어요
          </p>
        </div>
        <input
          type="email"
          placeholder="이메일 주소 입력"
          value={preEmail}
          onChange={e => setPreEmail(e.target.value)}
          style={{ width: '100%', padding: '16px 18px', fontSize: 17, border: '1px solid #DEDFE5', borderRadius: 12, background: '#FFFFFF', color: '#24232B', boxSizing: 'border-box', marginBottom: 14 }} />
        <button
          style={{ width: '100%', padding: '18px', fontSize: 17, fontWeight: 800, background: '#633B50', color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer', marginBottom: 12, letterSpacing: '0.02em' }}
          onClick={() => { if (!preEmail || !preEmail.includes('@')) { alert('이메일 주소를 확인해주세요.'); return } const cb = emailModal.onConfirm; setEmailModal(null); cb(preEmail) }}>
          {emailModal.productName === '심화 분석' || emailModal.productName === '자녀운 프리미엄' ? '9,900원 결제하기 →' : '결제하기 →'}
        </button>
        <button
          style={{ width: '100%', padding: '14px', fontSize: 15, background: 'none', border: 'none', color: '#62616C', cursor: 'pointer' }}
          onClick={() => { const cb = emailModal.onConfirm; setEmailModal(null); cb(null) }}>
          이메일 없이 결제하기
        </button>
        <p style={{ fontSize: 13, color: '#62616C', textAlign: 'center', marginTop: 6, wordBreak: 'keep-all', textWrap: 'balance' }}>이메일 없이 결제하시면 결과를 자동으로 보내드릴 수 없어요. 완료 후 PDF 저장이나 이메일 받기를 이용해주세요.</p>
      </div>
    </div>
  )
}

  // ── 다른 풀이 (자녀 학업·진로, 100년 인생 흐름) — 기존 상품·결제는 그대로 ──
  if (screen === 'other_services') {
    const items = [
      { key: 'child', label: '자녀 학업·진로', hook: '우리 아이의 기질과 공부 방식, 맞는 직업·추천학과 5개를 부모 관점에서 풀어드려요.', price: '무료 풀이 후 상세 풀이 9,900원', onClick: () => { setServiceType('child'); setScreen('input') } },
      { key: 'baeknyeon', label: '100년 인생 흐름', hook: '지금부터 100세까지 매년의 재물·관계·건강 흐름 키워드를 정리해드려요.', price: '유료 99,000원', onClick: () => setScreen('백년_input') },
    ]
    return (
      <div style={{ minHeight: '100vh', background: '#F4F5F7' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#24232B', textAlign: 'center', margin: '8px 0 6px' }}>다른 풀이</h1>
          <p style={{ fontSize: 13, color: '#62616C', textAlign: 'center', margin: '0 0 20px' }}>필요할 때만 골라서 볼 수 있어요.</p>
          {items.map(({ key, label, hook, price, onClick }) => (
            <div key={key} onClick={onClick} style={{ background: '#FFFFFF', border: '1px solid #DEDFE5', borderRadius: 12, padding: '18px 16px', marginBottom: 12, cursor: 'pointer' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#24232B', margin: '0 0 6px' }}>{label}</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#62616C', margin: '0 0 8px', wordBreak: 'keep-all' }}>{hook}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#633B50', margin: 0 }}>{price}</p>
            </div>
          ))}
          <button style={{ width: '100%', padding: '14px', fontSize: 15, background: '#FFFFFF', border: '1px solid #DEDFE5', borderRadius: 10, cursor: 'pointer', color: '#62616C', marginTop: 8 }} onClick={() => setScreen('landing')}>← 처음으로</button>
        </div>
      </div>
    )
  }

  // ── 랜딩 ──
  if (screen === 'landing') {
    const C = { bg: '#F4F5F7', card: '#FFFFFF', text: '#24232B', sub: '#62616C', accent: '#633B50', line: '#DEDFE5' }
    const goSaju = () => { setServiceType('saju'); setScreen('input') }
    const cardStyle = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '18px 14px 10px', display: 'flex', flexDirection: 'column', minHeight: 188, cursor: 'pointer', textAlign: 'left' }
    const cardLabelStyle = { fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8, wordBreak: 'keep-all' }
    const cardHookStyle = { fontSize: 13, color: C.sub, lineHeight: 1.6, whiteSpace: 'pre-line', wordBreak: 'keep-all', flex: 1, marginBottom: 10 }
    const cardBtnStyle = { width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 700, background: 'transparent', color: C.text, border: 'none', borderTop: `1px solid ${C.line}`, cursor: 'pointer', textAlign: 'left' }
    const footerLinkStyle = { fontSize: 13, color: C.sub, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', background: C.bg, color: C.text }}>
        <div style={{ background: C.card, borderBottom: `1px solid ${C.line}`, textAlign: 'center', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: C.sub, wordBreak: 'keep-all' }}>
          {isAdmin ? '🔧 관리자 테스트 모드 — 결제 없이 유료 결과를 확인할 수 있어요' : '회원가입 없이 바로 확인 — 무료로 먼저 보세요'}
        </div>

        {/* 첫 화면 */}
        <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '24px 24px 36px', textAlign: 'center', boxSizing: 'border-box' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>마이사주</p>
          <h1 style={{ wordBreak: 'keep-all', fontSize: 34, fontWeight: 700, color: C.text, marginBottom: 14, lineHeight: 1.3, letterSpacing: '-0.02em' }}>나, 앞으로<br/>잘 풀릴까?</h1>
          <p style={{ wordBreak: 'keep-all', fontSize: 16, color: C.text, lineHeight: 1.75, marginBottom: 28 }}>
            <span style={{ display: 'block' }}>일도, 돈도, 사람 관계도.</span>
            <span style={{ display: 'block', textWrap: 'balance' }}>내 사주에는 어떤 이야기가 담겨 있을까요?</span>
          </p>
          <button
            style={{ width: '100%', maxWidth: 360, minHeight: 52, padding: '14px 20px', fontSize: 16, fontWeight: 700, background: C.accent, color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer', wordBreak: 'keep-all' }}
            onClick={goSaju}>
            내 사주 무료로 보기 →
          </button>
          <div style={{ maxWidth: 360, margin: '16px auto 0' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.7, margin: 0, wordBreak: 'keep-all' }}>기본 풀이는 무료로 볼 수 있어요.</p>
            <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.7, margin: 0, wordBreak: 'keep-all', textWrap: 'balance' }}>더 자세한 풀이를 원할 때 유료 상품을 선택해주세요.</p>
          </div>
        </div>

        {/* 메뉴 2개 — 메뉴 이름보다 얻는 도움을 먼저 설명 */}
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: 18, color: C.text, textAlign: 'center', marginBottom: 16, fontWeight: 700 }}>무엇을 알아볼까요?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { key: 'saju', label: '내 사주', hook: '무료 요약: 핵심 성향 · 강점 1개 · 주의할 습관 1개 · 오늘 해볼 팁 1개', sub: '입력: 성별, 결혼 상태, 생년월일, 태어난 시간(모르면 "모름" 선택). 혈액형은 선택이에요.', btn: '내 사주 무료 요약 보기 →', onClick: goSaju },
              { key: 'gunghab', label: '관계 궁합', hook: '무료 요약: 관계 한 줄 요약 · 핵심 3가지 · 잘 맞는 점과 조율할 점 · 바로 써볼 대화 문장', sub: '입력: 두 사람의 성별, 생년월일, 태어난 시간(모르면 "모름" 선택). 연인·부부·가족·친구·직장 동료 중 고를 수 있어요.', btn: '관계 궁합 무료 요약 보기 →', onClick: () => { setServiceType('gunghab'); setGunghabStep(0); set관계유형(''); set관계그룹(''); set관계역할(''); setScreen('gunghab_input') } },
            ].map(({ key, label, hook, sub, btn, onClick }) => (
              <div key={key} onClick={onClick} style={{ ...cardStyle, minHeight: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 6 }}>무료 요약</div>
                <div style={cardLabelStyle}>{label}</div>
                <div style={{ ...cardHookStyle, flex: 'none' }}>{hook}</div>
                <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, marginBottom: 10, wordBreak: 'keep-all' }}>{sub}</div>
                <button style={cardBtnStyle} onClick={e => { e.stopPropagation(); onClick() }}>{btn}</button>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid ' + C.line, marginTop: 20 }} />
          <p style={{ textAlign: 'center', margin: '8px 0 0' }}><button onClick={() => setScreen('other_services')} style={footerLinkStyle}>다른 풀이 보기</button></p>
        </div>

        {/* 푸터 */}
        <div style={{ borderTop: `1px solid ${C.line}`, padding: '28px 0 40px', background: C.card, marginTop: 'auto' }}>
          <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '0 16px', boxSizing: 'border-box', overflowWrap: 'anywhere' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>봄결</p>
            <div style={{ display: 'flex', columnGap: 16, rowGap: 4, marginTop: 16, flexWrap: 'wrap' }}>
              <button onClick={() => setScreen('terms')} style={footerLinkStyle}>이용약관</button>
              <button onClick={() => setScreen('privacy')} style={footerLinkStyle}>개인정보처리방침</button>
              <button onClick={() => setScreen('refund')} style={footerLinkStyle}>환불정책</button>
              <button onClick={() => window.open('https://open.kakao.com/me/mysajushop', '_blank')} style={footerLinkStyle}>고객문의</button>
            </div>
            <p style={{ fontSize: 11, color: C.sub, marginTop: 12 }}>© 2026 봄결. All rights reserved.</p>
          </div>
        </div>
      </div>
    )
  }

// ── 입력 화면 ──
if (screen === 'input') {
  const serviceNames = { saju: '나의 사주', child: '우리 아이 진로·학과 프리미엄', deep: '사주 심화 분석' }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F5F7', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ textAlign: 'center', padding: '24px 24px 20px', background: '#FFFFFF', borderBottom: '1px solid #DEDFE5' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#24232B', marginBottom: 10 }}>마이사주</p>
        <h1 style={{ wordBreak: 'keep-all', fontSize: 22, fontWeight: 800, color: '#24232B', marginBottom: 8 }}>{serviceNames[serviceType] || '사주 분석'}</h1>
        <p style={{ fontSize: 14, color: '#62616C' }}>아래 정보를 입력하면 무료 요약을 먼저 확인해드려요</p>
      </div>

      {/* 진행바 */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ height: 4, background: '#DEDFE5', borderRadius: 99, margin: '16px 0 0', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#633B50', borderRadius: 99, transition: 'width 0.35s ease' }} />
        </div>
        <p style={{ fontSize: 12, color: '#62616C', textAlign: 'right', marginTop: 6 }}>{step + 1} / {STEPS.length}</p>
      </div>

      {/* 본문 */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 20px 190px', width: '100%', boxSizing: 'border-box', flex: 1 }}>

        {/* 섹션 제목 */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#24232B', lineHeight: 1.2, wordBreak: 'keep-all', margin: 0, marginBottom: 8 }}>
            {currentStepId === 'gender' && '성별을 알려주세요'}
            {currentStepId === 'marital' && '결혼 상태를 알려주세요'}
            {currentStepId === 'birthdate' && '생년월일을 알려주세요'}
            {currentStepId === 'birthtime' && '태어난 시간을 알려주세요'}
            {currentStepId === 'blood' && '혈액형을 선택해주세요'}
          </h2>
          <p style={{ fontSize: 15, color: '#62616C', margin: 0 }}>
            {currentStepId === 'gender' && '사주 풀이에 사용돼요'}
            {currentStepId === 'marital' && '사주 풀이에 사용돼요'}
            {currentStepId === 'birthdate' && '숫자로 직접 입력해주세요'}
            {currentStepId === 'birthtime' && '모르셔도 괜찮아요'}
            {currentStepId === 'blood' && '선택하지 않아도 분석은 가능해요'}
          </p>
        </div>

        {/* ── 성별 ── */}
        {currentStepId === 'gender' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#633B50', marginBottom: 10 }}>이름 (선택)</p>
              <input
                style={{ width: '100%', fontSize: 18, padding: '18px 20px', border: '1px solid #DEDFE5', borderRadius: 14, background: '#FFFFFF', color: '#24232B', boxSizing: 'border-box' }}
                type="text" placeholder="이름을 입력해주세요" value={myName} onChange={e => setMyName(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {['여성','남성'].map(g => (
                <button key={g}
                  aria-pressed={gender === g}
                  style={{ position: 'relative', padding: '30px 16px', border: `2px solid ${gender === g ? '#633B50' : '#DEDFE5'}`, borderRadius: 16, background: gender === g ? '#F6F0F3' : '#FFFFFF', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, transition: 'all 0.15s' }}
                  onClick={() => setGender(g)}>
                  <CheckMark on={gender === g} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: gender === g ? '#633B50' : '#24232B' }}>{g}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── 결혼 상태 ── */}
        {currentStepId === 'marital' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[{ value: '미혼', sub: '결혼 전이거나 현재 혼자예요' }, { value: '기혼', sub: '결혼해서 살고 있어요' }].map(({ value, sub }) => (
              <button key={value}
                aria-pressed={maritalStatus === value}
                style={{ position: 'relative', padding: '24px 24px', border: `2px solid ${maritalStatus === value ? '#633B50' : '#DEDFE5'}`, borderRadius: 16, background: maritalStatus === value ? '#F6F0F3' : '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20, transition: 'all 0.15s' }}
                onClick={() => setMaritalStatus(value)}>
                <CheckMark on={maritalStatus === value} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: maritalStatus === value ? '#633B50' : '#24232B' }}>{value}</div>
                  <div style={{ fontSize: 14, color: '#62616C', marginTop: 4 }}>{sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── 생년월일 ── */}
        {currentStepId === 'birthdate' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {[['양력', false], ['음력', true]].map(([label, val]) => (
                <button key={label}
                  aria-pressed={isLunar === val}
                  style={{ position: 'relative', flex: 1, padding: '16px', fontSize: 16, fontWeight: isLunar === val ? 700 : 400, border: `2px solid ${isLunar === val ? '#633B50' : '#DEDFE5'}`, borderRadius: 12, background: isLunar === val ? '#F6F0F3' : '#FFFFFF', color: isLunar === val ? '#633B50' : '#62616C', cursor: 'pointer' }}
                  onClick={() => setIsLunar(val)}><CheckMark on={isLunar === val} />{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <input
                style={{ flex: '1.6 1 0', minWidth: 0, padding: '22px 4px', fontSize: 24, fontWeight: 800, border: '1px solid #DEDFE5', borderRadius: 14, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }}
                type="number" inputMode="numeric" placeholder="년도" value={birthYear} onChange={e => setBirthYear(e.target.value.slice(0,4))} />
              <span style={{ fontSize: 18, color: '#62616C', fontWeight: 600 }}>년</span>
              <input
                style={{ flex: '1 1 0', minWidth: 0, padding: '22px 4px', fontSize: 24, fontWeight: 800, border: '1px solid #DEDFE5', borderRadius: 14, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }}
                type="number" inputMode="numeric" placeholder="월" value={birthMonth} onChange={e => setBirthMonth(e.target.value.slice(0,2))} />
              <span style={{ fontSize: 18, color: '#62616C', fontWeight: 600 }}>월</span>
              <input
                style={{ flex: '1 1 0', minWidth: 0, padding: '22px 4px', fontSize: 24, fontWeight: 800, border: '1px solid #DEDFE5', borderRadius: 14, background: '#FFFFFF', color: '#24232B', textAlign: 'center', boxSizing: 'border-box' }}
                type="number" inputMode="numeric" placeholder="일" value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0,2))} />
              <span style={{ fontSize: 18, color: '#62616C', fontWeight: 600 }}>일</span>
            </div>
            {birthdateValid && (
              <p style={{ fontSize: 16, color: '#633B50', textAlign: 'center', fontWeight: 700, marginTop: 8 }}>
                ✓ {birthYear}년 {birthMonth}월 {birthDay}일 {isLunar ? '(음력)' : '(양력)'}
              </p>
            )}
          </>
        )}

        {/* ── 시간 ── */}
        {currentStepId === 'birthtime' && (
          <>
            <button
              aria-pressed={timeUnknown}
              style={{ width: '100%', padding: '20px 16px', border: `2px solid ${timeUnknown ? '#633B50' : '#DEDFE5'}`, borderRadius: 14, background: timeUnknown ? '#F6F0F3' : '#FFFFFF', color: timeUnknown ? '#633B50' : '#62616C', fontSize: 18, fontWeight: timeUnknown ? 700 : 400, cursor: 'pointer', textAlign: 'center', marginBottom: 24 }}
              onClick={() => { setTimeUnknown(true); setTimeHour(''); setTimeMin('') }}>
              {timeUnknown ? '✓ ' : ''}태어난 시간 모름
            </button>
            {!timeUnknown && (
              <>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#633B50', marginBottom: 12 }}>오전 / 오후</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  {['오전','오후'].map(ap => (
                    <button key={ap}
                      aria-pressed={timeAmPm === ap}
                      style={{ position: 'relative', padding: '20px', fontSize: 18, fontWeight: timeAmPm === ap ? 700 : 400, border: `2px solid ${timeAmPm === ap ? '#633B50' : '#DEDFE5'}`, borderRadius: 14, background: timeAmPm === ap ? '#F6F0F3' : '#FFFFFF', color: timeAmPm === ap ? '#633B50' : '#62616C', cursor: 'pointer' }}
                      onClick={() => setTimeAmPm(ap)}><CheckMark on={timeAmPm === ap} />{ap}</button>
                  ))}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#633B50', marginBottom: 12 }}>시 선택</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                    <button key={h}
                      aria-pressed={timeHour === String(h)}
                      style={{ position: 'relative', padding: '18px 4px', fontSize: 17, fontWeight: timeHour === String(h) ? 700 : 400, border: `2px solid ${timeHour === String(h) ? '#633B50' : '#DEDFE5'}`, borderRadius: 12, background: timeHour === String(h) ? '#F6F0F3' : '#FFFFFF', color: timeHour === String(h) ? '#633B50' : '#62616C', cursor: 'pointer' }}
                      onClick={() => setTimeHour(String(h))}><CheckMark on={timeHour === String(h)} />{h}시</button>
                  ))}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#633B50', marginBottom: 12 }}>분 선택</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {['00','10','20','30','40','50'].map(m => (
                    <button key={m}
                      aria-pressed={timeMin === m}
                      style={{ position: 'relative', padding: '18px 4px', fontSize: 17, fontWeight: timeMin === m ? 700 : 400, border: `2px solid ${timeMin === m ? '#633B50' : '#DEDFE5'}`, borderRadius: 12, background: timeMin === m ? '#F6F0F3' : '#FFFFFF', color: timeMin === m ? '#633B50' : '#62616C', cursor: 'pointer' }}
                      onClick={() => setTimeMin(m)}><CheckMark on={timeMin === m} />{m}분</button>
                  ))}
                </div>
                {timeHour && timeMin && (
                  <p style={{ fontSize: 16, color: '#633B50', textAlign: 'center', fontWeight: 700 }}>✓ {timeAmPm} {timeHour}시 {timeMin}분</p>
                )}
              </>
            )}
            {timeUnknown && (
              <button style={{ fontSize: 14, color: '#62616C', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' }} onClick={() => setTimeUnknown(false)}>시간 직접 선택하기</button>
            )}
          </>
        )}

        {/* ── 혈액형 ── */}
        {currentStepId === 'blood' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {BLOOD_LIST.map(b => (
              <button key={b}
                aria-pressed={blood === b}
                style={{ position: 'relative', padding: '32px 16px', fontSize: 28, fontWeight: blood === b ? 800 : 600, border: `2px solid ${blood === b ? '#633B50' : '#DEDFE5'}`, borderRadius: 16, background: blood === b ? '#F6F0F3' : '#FFFFFF', color: blood === b ? '#633B50' : '#62616C', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => setBlood(blood === b ? '' : b)}><CheckMark on={blood === b} />{b}형</button>
            ))}
          </div>
        )}

      </div>

      {/* 하단 버튼 */}
      <div style={{ position: 'fixed', bottom: 0, background: '#FFFFFF', borderTop: '1px solid #DEDFE5', padding: '14px 20px calc(20px + env(safe-area-inset-bottom))', maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
        {currentStepId === 'blood' && serviceType === 'child' && (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#633B50', background: '#F6F0F3', border: '1px solid #DEDFE5', borderRadius: 8, padding: '10px 16px', textAlign: 'center', marginBottom: 8 }}>
            ✦ 입력하면 무료로 일부 먼저 확인할 수 있어요
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
        <button
          style={{ flex: '0 0 auto', padding: '18px 24px', border: '1px solid #DEDFE5', borderRadius: 14, background: '#FFFFFF', fontSize: 20, cursor: 'pointer', color: '#62616C' }}
          onClick={goBack}>←</button>
        <button
          style={{ flex: 1, padding: '18px', fontSize: 18, fontWeight: 700, background: !canGoNext() ? '#E4E5EA' : '#633B50', color: !canGoNext() ? '#62616C' : '#FFFFFF', border: 'none', borderRadius: 14, cursor: !canGoNext() ? 'not-allowed' : 'pointer', letterSpacing: '0.02em' }}
          onClick={goNext} disabled={!canGoNext()}>
          {currentStepId === 'blood'
            ? (serviceType === 'deep' ? '심화 분석받기 (9,900원) 🔮' : serviceType === 'child' ? '무료로 자녀 풀이 보기 →' : '무료로 내 사주 보기 →')
            : '다음 →'}
        </button>
        </div>
      </div>
    </div>
  )
}
// ── 결과 화면 ──
if (screen === 'result') {
  const baseSections = parseSections(baseText)
  const paidSections = parseSections(paidText)
  const myFree = serviceType === 'saju' ? parseMyFree(baseText) : null
  const useSajuReport = serviceType === 'saju' && !!myFree && !isBaseStreaming && !!myFree.sentence && !!sajuData?.사주
  const 리포트일주 = sajuData?.사주?.일주 || ''
  const 리포트유형 = 리포트일주 ? (일주타입명[리포트일주[0] + 리포트일주[2]] || null) : null
  const baseShown = baseSections.filter(s => !s.title.includes('행운미리보기') && !s.title.includes('운세점수') && s.title !== '공유 문장' && s.title !== '핵심 한 문장' && s.title !== '예시 표시')
  // 상품 표시: 무료 핵심 풀이 / 전체 분석 — 표지 제목·상단 띠·PDF 파일명·쪽 아래 글자가 같은 기준을 쓴다(reportMeta.js).
  const paidShown = paidSections.filter(s => s.content?.trim())    // 내용이 없는 항목 때문에 PART 번호가 건너뛰지 않게
  const productKind = useSajuReport && paidShown.length > 0 && !isPaidStreaming ? 'full' : 'free'
  const reportDateLine = sajuData?.생년월일 ? birthMetaLine({ dateText: sajuData.생년월일, isLunar, birthtime, pillars: sajuData.사주 }) : ''
  const reportTitle = useSajuReport ? productTitle(productKind, myName) : serviceType === 'child' ? '우리 아이 진로·학과 풀이' : serviceType === '노후' ? '노후 운세 풀이' : '나의 사주 풀이'
  const reportEyebrow = useSajuReport ? `마이사주 · ${PRODUCT[productKind].label}` : 'MYSAJU REPORT'
  const reportSub = useSajuReport ? reportDateLine : [myName && myName + '님', sajuData?.생년월일].filter(Boolean).join(' · ')
  // 핵심 요약: 이미 나온 풀이 문장에서만 고른다(새 AI 호출·점수·예측 없음). 무료 화면에는 무료 내용만, 재물·직업은 결제 후 전체 분석에서만.
  const sajuSummary = useSajuReport ? summarizeSaju(myFree) : null
  const moneySummary = isPaid && !isPaidStreaming && paidSections.length ? summarizeMoney(paidSections) : null
  const reportCoreSections = useSajuReport ? [
    { title: '나의 핵심 성향', content: [myFree.sentence, myFree.detail].filter(Boolean).join('\n') },
    { title: '이런 성향이 나오는 이유', content: removeMarkers(myFree.why || '') },
    { title: '나의 강점', content: removeMarkers(myFree.strength || '') },
    { title: '주의할 습관', content: removeMarkers(myFree.habit || '') },
    { title: '바로 실천할 팁', content: removeMarkers(myFree.tip || '') },
  ].filter(s => s.content.trim()) : []
  const corePartCount = useSajuReport ? reportCoreSections.length : baseShown.length   // 웹·PDF 모두 PART 번호는 여기서 이어 붙인다(사주표는 번호 없음)
  const saveResultPdf = () => savePdf({
    filename: useSajuReport ? pdfFileName(productKind, myName) : '마이사주_분석결과_' + (myName || '결과'),
    title: reportTitle, eyebrow: reportEyebrow, subtitle: reportSub, footerLabel: useSajuReport ? PRODUCT[productKind].label : '',
    items: buildResultPdfItems({ useSajuReport, sajuSummary, coreSections: reportCoreSections, baseShown, paidSections: paidShown, moneySummary, sajuData, typeInfo: 리포트유형 }),
  })
  return (
    <div className="rpt-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <ReportHero eyebrow={reportEyebrow} title={reportTitle} sub={reportSub} />
      <div id="result-content" className="rpt-inner rpt-wrap">

        {/* 예시 응답으로 화면을 볼 때만 나타나는 표시 (실제 AI 풀이에는 없음) */}
        {myFree && !isBaseStreaming && myFree.demo && (
          <div role="note" style={{ background: '#FFF8E1', border: '1px solid #E8D9A8', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#6B5B1F', wordBreak: 'keep-all' }}>{myFree.demo}</div>
        )}

        {/* 내 사주 무료 결과 리포트: 핵심 성향 → 사주 한눈에 → 이유 → 강점 → 주의 → 팁 */}
        {useSajuReport && (
          <SajuReport
            headless
            summary={sajuSummary}
            name={myName}
            dateLine={`${sajuData.생년월일}${isLunar ? '' : ' · 양력'}${birthtime ? ' · ' + birthtime : ''}`}
            pillars={sajuData.사주}
            core={{ sentence: myFree.sentence, detail: myFree.detail }}
            why={removeMarkers(myFree.why)}
            strength={removeMarkers(myFree.strength)}
            habit={removeMarkers(myFree.habit)}
            tip={removeMarkers(myFree.tip)}
            typeInfo={리포트유형}
          />
        )}

        {/* 맨 위: 핵심 성향 한 문장 + 짧은 생활 속 설명 (리포트가 아닐 때의 기존 화면) */}
        {!useSajuReport && myFree && !isBaseStreaming && myFree.sentence && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 16, padding: '22px 20px', marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#2F5D44', margin: '0 0 8px' }}>내 사주의 핵심 성향</p>
            <p style={{ fontSize: 19, fontWeight: 800, color: '#22211C', lineHeight: 1.6, margin: '0 0 10px', wordBreak: 'keep-all' }}>{myFree.sentence}</p>
            {myFree.detail && <p style={{ fontSize: 15, lineHeight: 1.8, color: '#5F5E55', margin: 0, wordBreak: 'keep-all' }}>{myFree.detail}</p>}
          </div>
        )}

        {/* 사주팔자 표는 접어 두고 필요할 때만 펼친다 */}
        {!useSajuReport && myFree && !isBaseStreaming && sajuData?.사주 && (
          <button data-pdf-exclude="true" aria-expanded={showSajuStruct} onClick={() => setShowSajuStruct(v => !v)} style={{ width: '100%', padding: '12px 16px', fontSize: 14, fontWeight: 600, background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 12, color: '#2F5D44', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}><span>내 사주 구성 보기</span><span>{showSajuStruct ? '▲' : '▼'}</span></button>
        )}

        {/* 사주팔자 카드 */}
        {!useSajuReport && sajuData?.사주 && (serviceType !== 'saju' || showSajuStruct || pdfCapturing) && (
          <section className="rpt-section" style={{ marginTop: 28 }}>
            <h2 className="rpt-h2">내 사주 한눈에</h2>
            <SajuTable pillars={sajuData.사주} />
          </section>
        )}

{/* 일주 타입 카드 */}
{!useSajuReport && sajuData?.사주?.일주 && (serviceType !== 'saju' || showSajuStruct || pdfCapturing) && (() => {
  const 일주원문 = sajuData.사주.일주  // 예: "辛신亥해"
const 일주키 = 일주원문[0] + 일주원문[2]  // "辛" + "亥" = "辛亥"
  const 타입 = 일주타입명[일주키]
  if (!타입) return null
  const 오행색 = { '甲': '#1E7F4F', '乙': '#1E7F4F', '丙': '#C53A3A', '丁': '#C53A3A', '戊': '#8A5F0E', '己': '#8A5F0E', '庚': '#5F6B7A', '辛': '#5F6B7A', '壬': '#2563EB', '癸': '#2563EB' }
  const 색 = 오행색[일주키[0]] || '#2F5D44'
  return (
    <div id="share-card" data-pdf-card="type" className="rpt-card" style={{ borderColor: `${색}40` }}>
      <p style={{ fontSize: 11, color: '#2F5D44', fontWeight: 600, letterSpacing: '0.12em', marginBottom: 12 }}>비유로 보는 내 사주 유형</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: `${색}18`, border: `1px solid ${색}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 색, fontFamily: 'Georgia, serif', flexShrink: 0 }}>{일주키}</div>
        <div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#22211C', marginBottom: 4 }}>{타입.name}</p>
          <p style={{ fontSize: 13, color: '#5F5E55', lineHeight: 1.6 }}>{'이런 이미지로 읽을 수 있어요: ' + 타입.desc}</p>
          <p style={{ fontSize: 12, color: '#5F5E55', lineHeight: 1.6, marginTop: 6 }}>사주 글자를 쉽게 떠올리도록 붙인 비유예요. 성격을 단정하는 이름이 아니니 참고만 하세요.</p>
        </div>
      </div>
     
    </div>
  )
})()}


        {/* 스트리밍 텍스트 */}
        {isBaseStreaming && baseText && (
          <div className="rpt-stream" style={{ marginTop: 28 }}>
            {removeMarkers(baseText)}<span style={{ opacity: 0.4 }}>▌</span>
          </div>
        )}

        {/* 무료 풀이 첫 응답 대기 */}
        {phase === 'streaming' && isBaseStreaming && !baseText && (
          <div role="status" style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 14, padding: '28px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#2F5D44', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              <span style={{ fontSize: 16, color: '#22211C', marginLeft: 10 }}>사주 풀이를 준비하고 있어요</span>
            </div>
          </div>
        )}

        {/* 무료 풀이 실패 — 입력값은 그대로 두고 수동 재시도만 허용 */}
        {phase === 'error' && (
          <div role="alert" style={{ background: '#FFFFFF', border: '1px solid #C53A3A', borderRadius: 14, padding: '22px 20px', marginBottom: 14 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#C53A3A', marginBottom: 6 }}>풀이를 불러오지 못했어요</p>
            <p style={{ fontSize: 14, color: '#5F5E55', lineHeight: 1.6, wordBreak: 'keep-all', marginBottom: 16 }}>{freeError || '잠시 후 다시 시도해주세요.'}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 700, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer' }}
                onClick={handleFreeAnalyze}>다시 시도</button>
              <button style={{ flex: 1, padding: '14px', fontSize: 15, background: '#FFFFFF', color: '#22211C', border: '1px solid #E4E1D4', borderRadius: 12, cursor: 'pointer' }}
                onClick={() => { setPhase('input'); setFreeError(null); setScreen('input') }}>입력 화면으로</button>
            </div>
          </div>
        )}

        {/* 기본 분석 결과 — 보고서처럼 이어지는 본문 */}
{!isBaseStreaming && !useSajuReport && baseShown.map((sec, i) => {
  const isBlurred = serviceType !== 'saju' && i >= 1

  if (isBlurred && !isPaid) {
    const blurIdx = CONCLUSION_BLUR_INDEX[sec.title] || []
    const blocks = splitSectionBlocks(sec.content)
    let headerCount = -1
    const isMoneySection = sec.title === '돈의 흐름'
    const isCurrentPeriodSection = sec.title === '지금 이 시기'
    return (
      <div key={i}>
        {isMoneySection && <SectionViewTracker eventName="money_section_viewed" params={{ service_type: serviceType }} />}
        {isCurrentPeriodSection && <SectionViewTracker eventName="current_period_section_viewed" params={{ service_type: serviceType }} />}
        <section className="rpt-section">
          <p className="rpt-kicker">PART {i + 1}</p>
          <div className="rpt-h2-row">
            <h2 className="rpt-h2">{sec.title}</h2>
            <span className="rpt-badge">전체 분석 공개</span>
          </div>
          {blocks.map((block, bi) => {
            if (block.isLock) {
              return <p key={bi} className="rpt-lock">{block.bodyLines.join('\n')}</p>
            }
            headerCount++
            const bodyText = block.bodyLines.join(' ').replace(/\s+/g, ' ').trim()
            const shouldBlur = blurIdx.includes(headerCount) && bodyText
            const { visible, hidden } = shouldBlur ? splitLastSentences(bodyText, 2) : { visible: bodyText, hidden: '' }
            return (
              <div key={bi}>
                {block.header && <h3 className="rpt-h3">{block.header}</h3>}
                <p className="rpt-p">
                  {visible && <span>{visible} </span>}
                  {hidden && <span style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>{hidden}</span>}
                </p>
              </div>
            )
          })}
        </section>
      </div>
    )
  }

  return (
    <div key={i}>
      {i === 0 && (
        <p className="rpt-note" style={{ margin: '28px 0 -36px', fontWeight: 600, color: '#2F5D44' }}>
          🔮 사주 분석으로 읽는 나의 성향
        </p>
      )}
      <ReportSection title={sec.title} content={sec.content} part={i + 1} />
    </div>
  )
})}


        {/* 유료 스트리밍 텍스트 */}
        {isPaidStreaming && paidText && (
          <div className="rpt-stream" style={{ marginTop: 28 }}>
            {removeMarkers(paidText)}<span style={{ opacity: 0.4 }}>▌</span>
          </div>
        )}

        {/* 유료 분석 아코디언 */}
        {!isPaidStreaming && paidShown.length > 0 && (
          <>
            <p className="rpt-kicker rpt-divider-label">✦ 전체 분석 결과 ✦</p>
            <ReportSummary data={moneySummary} />
            {paidShown.map((sec, i) => <ReportSection key={i} title={sec.title} content={sec.content} part={corePartCount + i + 1} />)}
          </>
        )}

        {/* 내 사주 — 무료 요약 뒤에 선택 사항으로만 안내 */}
        {phase === 'done' && !isPaid && !isPaidStreaming && serviceType === 'saju' && (
          <div data-pdf-exclude="true">
            <PaidIntro>
              <PaidGuide title={SAJU_PAID.title} bundles={SAJU_PAID.bundles} summary={SAJU_PAID.summary} deepNote={SAJU_PAID.deepNote} highlights={SAJU_PAID_HIGHLIGHTS} freeNote={SAJU_PAID_FREE_NOTE} facts={SAJU_PAID_FACTS} priceText="1,990원" buttonText="전체 분석 보기 · 1,990원" onBuy={() => openFullAnalysisCheckout('result_card')} />
            </PaidIntro>
          </div>
        )}

        {/* 결제 유도 카드 */}
        {phase === 'done' && !isPaid && !isPaidStreaming && serviceType !== 'saju' && (
  <div data-pdf-exclude="true" style={{ background: '#FFFFFF', borderRadius: 16, padding: '28px 20px', marginBottom: 16, border: '1px solid #E4E1D4' }}>
    <p style={{ fontSize: 12, color: '#2F5D44', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 16, textAlign: 'center' }}>FULL ANALYSIS</p>
    {serviceType === 'child' || serviceType === '노후' ? (
      (serviceType === 'child'
        ? [
            { title: '타고난 기질 · 성격 심층 분석', first: '이 아이는 겉으로 보이는 것과 속마음이 완전히 달라요. ', blurred: '잘 웃고 사교적으로 보이지만, 실은 혼자만의 세계가 넓고 감정이 깊은 아이예요. 이 기질을 모르면 엉뚱한 방향으로 키울 수 있어요.' },
            { title: '학습 스타일 · 공부가 잘 되는 환경', first: '이 아이는 시각적으로 배울 때 흡수가 가장 빨라요. ', blurred: '학원 수업보다 영상이나 그림으로 이해하는 타입이에요. 오전 시간대에 집중력이 최고조인 사주 구조를 갖고 있어요.' },
            { title: '재능의 씨앗 · 빛나는 분야', first: '이 아이가 반복해도 안 지치는 것이 진짜 재능이에요. ', blurred: '부모가 보기엔 놀이 같지만, 이 사주에서는 그게 나중에 돈이 되는 분야와 직접 연결돼요. 방향만 잡아주면 빛나요.' },
            { title: '이 아이에게 맞는 직업 방향', first: '이 사주에 딱 맞는 직업이 6가지 보여요. ', blurred: '창의력과 분석력이 동시에 필요한 분야에서 두각을 나타내는 사주예요. 이과/문과/예체능 중 어디로 가야 하는지도 나와요.' },
            { title: '추천학과 5개', first: '이 아이의 사주 구조에 딱 맞는 학과가 있어요. ', blurred: '기질과 오행을 근거로 구체적 학과명 5개를 이유와 함께 알려드려요. 추상적 표현 없이 정확한 학과명으로 나와요.' },
            { title: '또래 관계 · 친구 패턴', first: '이 아이가 친구 사이에서 어떤 역할인지 보여요. ', blurred: '리더형인지 참모형인지, 갈등이 생기는 패턴과 부모가 도와줄 수 있는 방법이 나와요.' },
            { title: '부모와의 관계 · 키우는 법', first: '이 아이에게 절대 하면 안 되는 말이 있어요. ', blurred: '사주 구조상 이 아이가 스트레스받는 상황이 정해져 있어요. 반항기가 오는 시기와 대응법도 미리 알 수 있어요.' },
            { title: '이 아이의 인생 흐름', first: '지금부터 20대까지, 30대까지의 흐름이 보여요. ', blurred: '이 사주가 꽃피는 시기가 언제인지, 지금 무엇에 집중해야 하는지 단계별로 나와요.' },
            { title: '입시 · 취업 유리한 시기', first: '시험 운이 가장 강한 나이대가 따로 있어요. ', blurred: '이 사주에서 합격 확률이 높은 시기와 반대로 조심해야 할 시기가 구체적으로 나와요.' },
            { title: '이 아이가 빛나는 조건', first: '어떤 환경에서 집중력과 자신감이 올라가는지 보여요. ', blurred: '선생님 스타일, 공부 공간, 루틴까지 부모가 오늘 당장 바꿔볼 수 있는 구체적인 조건이 나와요.' },
            { title: '키우는 핵심 비법', first: '이 아이의 잠재력을 최대로 끌어내는 조건이 있어요. ', blurred: '해야 할 것과 절대 하면 안 되는 것, 오늘 바로 써먹을 수 있는 구체적 조언이 나와요.' },
          ]
        : [
            { title: '노후 재물 심화 분석', first: '노후에 자산이 안정적으로 유지되는 구조인지 보여요. ', blurred: '수익형 자산 방향, 절대 하면 안 되는 투자 실수, 재물이 안정되는 구체적 나이대가 나와요.' },
            { title: '건강 심화 분석', first: '건강 위기가 올 수 있는 나이대가 따로 있어요. ', blurred: '특히 챙겨야 할 신체 부위와 관리법, 오래 건강하게 사는 이 사주만의 생활 습관이 나와요.' },
            { title: '황혼 인연 심화', first: '노후에 진짜 의지가 되는 사람의 특징이 보여요. ', blurred: '자녀와의 관계 흐름, 새로운 인연이 생기는 시기와 조건이 구체적으로 나와요.' },
            { title: '노후 투자 · 부동산', first: '이 사주에 맞는 노후 자산 운용 방향이 나와요. ', blurred: '부동산/금융/현금 비중, 절대 하면 안 되는 투자 실수, 노후 수익 파이프라인 전략이 보여요.' },
            { title: '緣 · 사람과 인연', first: '노후에 진짜 내 편이 되는 사람의 특징이 나와요. ', blurred: '독이 되는 사람 유형, 황혼기 귀인이 나타나는 상황, 인간관계에서 조심해야 할 패턴이 보여요.' },
            { title: '月運 · 월별 운세', first: '앞으로 12개월의 운세 흐름이 한눈에 보여요. ', blurred: '매달 좋은 시기와 조심할 시기가 다르기 때문에 타이밍을 아는 것이 가장 중요해요.' },
            { title: '幸 · 나를 돕는 것들', first: '행운 색깔·마스코트·방향·숫자·아이템이 나와요. ', blurred: '노후 시기에 특히 도움이 되는 아이템 기준으로 선별된 행운 요소예요.' },
            { title: '노후를 빛나게 하는 법', first: '이 사주가 노후에 진짜 행복해지는 조건이 있어요. ', blurred: '지금부터 준비하면 달라지는 것들, 오늘 바로 실천할 수 있는 구체적 행동 조언이 나와요.' },
            { title: '道 · 이 사주로 잘 사는 법', first: '이 사주가 잘 풀리는 조건이 딱 2가지예요. ', blurred: '반대로 망하는 패턴도 있는데, 아는 것과 모르는 것의 차이가 생각보다 크게 나요.' },
            { title: '총운 정리', first: '전체 분석을 한 문장으로 정리해드려요. ', blurred: '이 사주의 핵심 키워드와 앞으로 가장 중요한 시기, 지금 당장 해야 할 한 가지가 나와요.' },
          ]
      ).map((item, idx) => (
        <div key={idx} className="rpt-list-item">
          <h3 className="rpt-h3">✦ {item.title}</h3>
          <p className="rpt-p">
            <span>{item.first}</span>
            <span style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>{item.blurred}</span>
          </p>
        </div>
      ))
    ) : (
      <>
        {FULL_ANALYSIS_PRIMARY.map((item, idx) => <FullAnalysisPreviewCard key={idx} {...item} />)}
        <button
          onClick={() => setMoreAnalysisOpen(o => !o)}
          style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, background: '#EEF3EA', border: '1px solid #E4E1D4', borderRadius: 10, color: '#2F5D44', cursor: 'pointer', marginBottom: moreAnalysisOpen ? 10 : 0 }}>
          {moreAnalysisOpen ? '숨기기 ▲' : '그 밖에 포함된 분석 4개 더 보기 ▼'}
        </button>
        {moreAnalysisOpen && FULL_ANALYSIS_MORE.map((item, idx) => <FullAnalysisPreviewCard key={idx} {...item} />)}
      </>
    )}
    <p style={{ fontSize: 12, color: '#5F5E55', textAlign: 'center', marginTop: 10 }}>총 {serviceType === 'child' ? '11' : '10'}개 섹션 · 이 모든 내용이 {serviceType === 'child' ? '9,900원' : '1,990원'}</p>
    <div style={{ textAlign: 'center', marginTop: 12 }}>
      <p style={{ fontSize: 14, color: '#5F5E55' }}>↓ 아래 버튼으로 결제하세요</p>
    </div>
  </div>
)}

        {/* 유료 분석 로딩 */}
        {isPaidStreaming && !paidText && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 14, padding: '28px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#2F5D44', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              <span style={{ fontSize: 16, color: '#5F5E55', marginLeft: 10 }}>전체 사주를 분석하고 있어요...</span>
            </div>
          </div>
        )}

{/* 심화분석 업셀 — 미리보기 인라인. PDF에는 포함하지 않음(data-pdf-exclude) */}
    {((isPaid && serviceType === 'saju') || serviceType === 'deep') && (
      <div data-pdf-exclude="true" style={{ marginTop: 28, marginBottom: 10 }}>
        {/* 기본 풀이가 끝났음을 알리는 구분선 — 아래 카드는 별도 상품(심화 분석) 안내이며 기본 풀이의 일부가 아니다 */}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#5F5E55', textAlign: 'center', margin: '0 0 14px', letterSpacing: '0.04em' }}>— 여기까지가 전체 분석(1,990원)이에요 —</p>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #2F5D44', borderRadius: 16, padding: '22px 20px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#2F5D44', margin: '0 0 4px' }}>선택 · 별도 상품</p>
          <p style={{ fontSize: 17, fontWeight: 800, color: '#22211C', margin: '0 0 6px', wordBreak: 'keep-all' }}>심화 분석 (9,900원)</p>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: '#5F5E55', margin: '0 0 12px', wordBreak: 'keep-all' }}>전체 분석과 별도 상품이에요. 아래 7가지를 따로 풀어드려요.</p>
          {DEEP_ITEMS.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < DEEP_ITEMS.length - 1 ? 10 : 0 }}>
              <span style={{ fontSize: 14, color: '#2F5D44', marginTop: 1, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 15, color: '#22211C', lineHeight: 1.5, wordBreak: 'keep-all' }}>{t}</span>
            </div>
          ))}
        </div>

        {/* 결과 받는 방법 안내 */}
        <p style={{ fontSize: 13, color: '#5F5E55', textAlign: 'center', lineHeight: 1.6, marginBottom: 16, wordBreak: 'keep-all' }}>결제 후 분석이 시작되며, 완성된 결과는 PDF로 저장하거나 이메일로 받을 수 있어요.</p>

        {/* 결제 버튼 */}
        <button style={{ width: '100%', padding: '18px', fontSize: 18, fontWeight: 800, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 14, cursor: 'pointer', letterSpacing: '0.02em', boxShadow: 'none', marginBottom: 8 }}
          onClick={() => { requestPayWithEmail('심화 분석', (email) => startCheckout(deepCheckout(email, (order) => { setScreen('deep_result'); handleDeepAnalyze(order) }))) }}>지금 심화분석 확인하기 →</button>
        <p style={{ fontSize: 12, color: '#5F5E55', textAlign: 'center' }}>결제 즉시 분석이 시작돼요</p>
      </div>
    )}


    {/* 하단 액션 영역 — 버튼/공유 등 UI 전용이라 PDF에는 포함하지 않음 */}
    <div data-pdf-exclude="true" style={{ borderTop: '1px solid #E4E1D4', marginTop: 32, paddingTop: 24 }}>

      {/* 이메일 — 접이식 */}
      {isPaid && (
          <div style={{ marginBottom: 20 }}>
            {preEmail && <p style={{ fontSize: 13, color: '#2F5D44', textAlign: 'center', lineHeight: 1.7, marginBottom: 10, wordBreak: 'keep-all' }}>📧 입력하신 {preEmail}로 결과를 보내드려요.<br/>메일이 보이지 않으면 아래에서 직접 받을 수 있어요.</p>}
            <p style={{ fontSize: 13, color: '#5F5E55', textAlign: 'center', marginBottom: 10 }}>📧 결과를 이메일로 받아 두면 받은 메일함에서 다시 볼 수 있어요</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="result-email-input" type="email" placeholder="이메일 주소 입력"
                style={{ flex: 1, padding: '12px 14px', fontSize: 14, border: '1px solid #E4E1D4', borderRadius: 10, background: '#FFFFFF', color: '#22211C' }} />
              <button style={{ padding: '12px 18px', fontSize: 14, fontWeight: 600, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={async () => {
                  const email = document.getElementById('result-email-input').value
                  if (!email || !email.includes('@')) { alert('이메일 주소를 확인해주세요.'); return }
                  const btn = document.querySelector('#result-email-input + button'); btn.textContent = '발송 중...'; btn.disabled = true
                  try {
                    await sendOrderEmail(paidOrdersRef.current.full, email)
                    document.getElementById('result-email-input').dataset.sent = 'true'
                    alert('이메일을 발송했어요! 😊')
                  } catch (e) { alert(e.message || '발송 오류가 발생했습니다.') }
                  finally { btn.textContent = '발송'; btn.disabled = false }
                }}>발송</button>
            </div>
          </div>
      )}

      {/* PDF + 처음으로 — 결제 완료 후에만 표시 */}
      {isPaid && <PdfSaveArea onSave={saveResultPdf} disabled={isBaseStreaming || isPaidStreaming}
        beside={<button
          style={{ flex: 1, padding: '14px', fontSize: 14, background: 'none', border: '1px solid #E4E1D4', borderRadius: 10, cursor: 'pointer', color: '#5F5E55' }}
          onClick={handleRestart}>
          ← 처음으로
        </button>} />}

      {/* 결과 요약 공유 — 공유할 내용을 먼저 확인한 뒤 직접 보낸다 */}
      <button style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 600, background: '#FFFFFF', border: '1px solid #E4E1D4', borderRadius: 10, cursor: 'pointer', color: '#2F5D44', marginBottom: 10 }}
        onClick={() => setShareDraft(buildShareText({ sentence: serviceType === 'saju' ? parseMyFree(baseText).sentence : '', fallback: '사주로 내 성향을 가볍게 살펴봤어요. 너는 어떤 편이야?', people: [[myName, '나']] }))}>
        결과 요약 공유하기
      </button>

    </div>
    {!isPaid && !isBaseStreaming && !isPaidStreaming && phase !== 'error' && (baseText || paidText) && <PdfSaveArea onSave={saveResultPdf} />}
      </div>
      {phase === 'done' && !isPaid && !isPaidStreaming && serviceType !== 'saju' && (
        <div className="no-print" style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, zIndex: 999,
          background: '#FFFFFF', borderTop: '1px solid #E4E1D4',
          padding: '10px 16px calc(10px + env(safe-area-inset-bottom))', boxSizing: 'border-box',
        }}>
            <button
              style={{ width: '100%', padding: '16px', fontSize: 17, fontWeight: 800, background: '#2F5D44', color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              onClick={() => { requestPayWithEmail(serviceType === 'child' ? '자녀운 프리미엄' : '전체 분석', (email) => startCheckout({ product: fullProductFor(serviceType), input: { ...personalInput(), previousText: baseText, freeRef: freeRefRef.current }, email, buyerName: myName || '고객', buyerEmail: email || '', redirectParams: { payment: 'paid', st: serviceType || 'saju', g: gender, ms: maritalStatus, by: birthYear, bm: birthMonth, bd: birthDay, il: isLunar ? '1' : '0', bt: birthtime || '', mbti: mbti || '', blood: blood || '', mn: myName || '' }, onPaid: (order, comp) => { if (comp) setIsPaid(true); else if (window.fbq) window.fbq('track', 'Purchase', { value: order.amount, currency: 'KRW' }); handlePaidAnalyze(order) } })) }}>
              <span>{serviceType === 'child' ? '자녀 풀이 전체 보기 →' : '전체 분석 보기 →'}</span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.3 }}>
                <span style={{ fontSize: 16, fontWeight: 900 }}>{serviceType === 'child' ? '9,900원' : '1,990원'}</span>
              </span>
            </button>
        </div>
      )}
      {shareDraft !== null && <ShareModal initialText={shareDraft} onClose={() => setShareDraft(null)} />}
    </div>
  )
}

  // ── [보안] 운영자 화면 (?view=admin) — 인증·권한 확인은 서버 세션으로만 ──
  if (screen === 'admin_email') return <AdminPanel entry={_adminEntry} onAuthChange={setIsAdmin} onExit={() => { window.history.replaceState({}, '', window.location.pathname); setScreen('landing') }} />

  // ── 약관/정책 화면들 ──
  if (screen === 'refund') return (
  <div style={{ minHeight: '100vh', background: '#F4F5F7', padding: '40px 20px 80px' }}>
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#633B50', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#24232B', marginBottom: 4 }}>환불정책</h1>
      <p style={{ fontSize: 13, color: '#62616C', marginBottom: 32 }}>시행일: 2026년 6월 21일</p>

      <div style={{ background: '#F6F0F3', border: '1px solid #DEDFE5', borderRadius: 12, padding: '16px 18px', marginBottom: 28 }}>
        <p style={{ fontSize: 14, color: '#633B50', fontWeight: 700, marginBottom: 6 }}>⚠️ 구매 전 꼭 확인해주세요</p>
        <p style={{ fontSize: 13, color: '#24232B', lineHeight: 1.8 }}>본 서비스는 결제 즉시 생성되는 1회성 디지털 콘텐츠로, 결제 완료 후에는 원칙적으로 환불이 불가합니다. 결제 전 서비스 내용을 충분히 확인해 주세요.</p>
      </div>

      <div style={{ fontSize: 14, color: '#24232B', lineHeight: 2.2 }}>
        <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제1조 (디지털 콘텐츠의 특성)</p>
        <p style={{ marginBottom: 24 }}>마이사주(mysaju.shop) 서비스는 이용자가 입력한 정보를 바탕으로 AI가 즉시 생성하는 1회성 맞춤형 디지털 콘텐츠입니다. 결제가 완료되는 즉시 콘텐츠 생성이 시작되며, 이용자 요청에 따라 개인화된 풀이가 제공됩니다.</p>

        <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제2조 (환불 불가 원칙)</p>
        <p style={{ marginBottom: 8 }}>① 결제 완료 후 콘텐츠 생성이 시작된 경우, 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제5호에 따라 디지털 콘텐츠의 특성상 청약 철회 및 환불이 불가합니다.</p>
        <p style={{ marginBottom: 24 }}>② 이용자는 결제 전 서비스 소개 페이지에서 제공 내용을 충분히 확인하시기 바랍니다.</p>

        <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제3조 (예외적 환불 사유)</p>
        <p style={{ marginBottom: 8 }}>다음의 경우에 한해 환불 신청을 검토합니다.</p>
        <p style={{ marginBottom: 8 }}>① 결제는 완료되었으나 서비스 시스템 오류로 인해 콘텐츠가 전혀 생성·제공되지 않은 경우</p>
        <p style={{ marginBottom: 8 }}>② 동일한 정보로 중복 결제가 발생한 경우 (중복분에 한해 환불)</p>
        <p style={{ marginBottom: 24 }}>③ 기타 회사의 귀책사유로 서비스 이용이 불가한 경우</p>

        <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제4조 (환불 신청 방법)</p>
        <p style={{ marginBottom: 8 }}>환불 신청은 결제일로부터 7일 이내에 아래 방법으로 요청하시기 바랍니다.</p>
        <p style={{ marginBottom: 8 }}>· 카카오톡 오픈채팅: <span style={{ color: '#633B50' }}>open.kakao.com/me/mysajushop</span></p>
        <p style={{ marginBottom: 8 }}>· 이메일: <span style={{ color: '#633B50' }}>redions77@naver.com</span></p>
        <p style={{ marginBottom: 24 }}>· 요청 시 포함 사항: 결제일시, 결제금액, 환불 사유 및 증빙자료</p>

        <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제5조 (환불 처리 기간)</p>
        <p style={{ marginBottom: 8 }}>· 신용카드: 카드사 정책에 따라 영업일 기준 3~7일</p>
        <p style={{ marginBottom: 24 }}>· 간편결제(카카오페이 등): 영업일 기준 1~3일</p>

        <div style={{ borderTop: '1px solid #DEDFE5', paddingTop: 24, marginTop: 8 }}>
          <p style={{ fontSize: 12, color: '#62616C', lineHeight: 2 }}>
            상호: 봄결 · 대표자: 손영주<br/>
            사업자등록번호: 291-17-02825<br/>
            통신판매업신고: 제2026-별내-1183호<br/>
            사업장: 경기도 남양주시 별내3로 322, 701호 -V133호<br/>
            전화: 010-9772-1987 · 이메일: redions77@naver.com
          </p>
        </div>
      </div>
    </div>
  </div>
)
  if (screen === 'terms') return (
    <div style={{ minHeight: '100vh', background: '#F4F5F7', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#633B50', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#24232B', marginBottom: 4 }}>이용약관</h1>
        <p style={{ fontSize: 13, color: '#62616C', marginBottom: 32 }}>시행일: 2026년 6월 21일</p>
        <div style={{ fontSize: 14, color: '#24232B', lineHeight: 2.2 }}>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제1조 (목적)</p>
          <p style={{ marginBottom: 24 }}>이 약관은 봄결(이하 "회사")이 운영하는 마이사주(mysaju.shop) 서비스의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제2조 (서비스 내용)</p>
          <p style={{ marginBottom: 24 }}>회사는 이용자가 입력한 생년월일, 성별 등 정보를 바탕으로 AI가 생성하는 사주 분석 콘텐츠를 제공합니다. 본 서비스는 오락·참고 목적의 콘텐츠이며, 의학·법률·재무 등 전문적 조언을 대체하지 않습니다.</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제3조 (이용 계약)</p>
          <p style={{ marginBottom: 24 }}>이용자가 서비스를 이용하거나 결제를 진행하면 본 약관에 동의한 것으로 간주합니다.</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제4조 (결제 및 요금)</p>
          <p style={{ marginBottom: 8 }}>① 서비스 요금은 결제 화면에 표시된 금액을 따릅니다.</p>
          <p style={{ marginBottom: 24 }}>② 결제는 KG이니시스를 통한 신용카드 및 간편결제로 이루어집니다.</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제5조 (콘텐츠의 한계)</p>
          <p style={{ marginBottom: 24 }}>AI가 생성하는 사주 분석 결과는 참고용이며, 결과의 정확성·완전성을 보장하지 않습니다. 이용자는 본 서비스 결과를 전적으로 신뢰하여 중요한 결정을 내리지 않도록 합니다.</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제6조 (환불)</p>
          <p style={{ marginBottom: 24 }}>환불에 관한 사항은 별도의 환불정책을 따릅니다.</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제7조 (면책)</p>
          <p style={{ marginBottom: 24 }}>회사는 이용자가 서비스 결과를 근거로 내린 판단이나 행동에 대해 책임을 지지 않습니다.</p>
          <div style={{ borderTop: '1px solid #DEDFE5', paddingTop: 24, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: '#62616C', lineHeight: 2 }}>
              상호: 봄결 · 대표자: 손영주<br/>
              사업자등록번호: 291-17-02825<br/>
              통신판매업신고: 제2026-별내-1183호<br/>
              이메일: redions77@naver.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  if (screen === 'privacy') return (
    <div style={{ minHeight: '100vh', background: '#F4F5F7', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#633B50', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#24232B', marginBottom: 4 }}>개인정보처리방침</h1>
        <p style={{ fontSize: 13, color: '#62616C', marginBottom: 32 }}>시행일: 2026년 6월 21일</p>
        <div style={{ fontSize: 14, color: '#24232B', lineHeight: 2.2 }}>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제1조 (수집하는 개인정보)</p>
          <p style={{ marginBottom: 8 }}>회사는 서비스 제공을 위해 다음 정보를 수집합니다.</p>
          <p style={{ marginBottom: 8 }}>· 필수: 생년월일, 태어난 시간(선택), 성별</p>
          <p style={{ marginBottom: 24 }}>· 선택: 이름, 이메일 주소, MBTI, 혈액형</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제2조 (수집 목적)</p>
          <p style={{ marginBottom: 8 }}>· 사주 분석 콘텐츠 생성 및 제공</p>
          <p style={{ marginBottom: 8 }}>· 이메일 입력 시: 분석 결과 발송 및 재열람 서비스 제공</p>
          <p style={{ marginBottom: 24 }}>· 결제 처리 (KG이니시스를 통해 처리되며, 카드 정보는 회사가 저장하지 않습니다)</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제3조 (보유 및 이용 기간)</p>
          <p style={{ marginBottom: 24 }}>수집된 생년월일, 분석 결과 등 입력 정보는 재열람 서비스 제공 및 서비스 품질 향상을 위해 저장될 수 있습니다. 이메일 주소는 결과 재조회를 위한 식별자로 사용됩니다. 이용자가 열람·삭제를 요청하는 경우 지체 없이 파기합니다.</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제4조 (제3자 제공)</p>
          <p style={{ marginBottom: 24 }}>회사는 이용자의 개인정보를 결제 처리(KG이니시스) 외 제3자에게 제공하지 않습니다.</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제5조 (이용자 권리)</p>
          <p style={{ marginBottom: 24 }}>이용자는 개인정보 열람·삭제를 요청할 수 있습니다. 문의는 redions77@naver.com으로 연락해 주세요.</p>
          <p style={{ fontWeight: 700, color: '#633B50', fontSize: 15, marginBottom: 8 }}>제6조 (개인정보보호책임자)</p>
          <p style={{ marginBottom: 24 }}>· 성명: 손영주 · 이메일: redions77@naver.com</p>
          <div style={{ borderTop: '1px solid #DEDFE5', paddingTop: 24, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: '#62616C', lineHeight: 2 }}>
              상호: 봄결 · 대표자: 손영주<br/>
              사업자등록번호: 291-17-02825<br/>
              통신판매업신고: 제2026-별내-1183호<br/>
              이메일: redions77@naver.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return null
  return null
}
