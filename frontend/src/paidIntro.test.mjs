import test from 'node:test'
import assert from 'node:assert'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SAJU_PAID, SAJU_PAID_FREE_NOTE, SAJU_PAID_HIGHLIGHTS, SAJU_PAID_FACTS } from './relations.js'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const outDir = here('../node_modules/.cache/paid-intro-test')
mkdirSync(outDir, { recursive: true })
const bundle = (entry, name) => { buildSync({ entryPoints: [here(entry)], bundle: true, packages: 'external', format: 'esm', jsx: 'automatic', outfile: join(outDir, name), logLevel: 'silent' }); return import(pathToFileURL(join(outDir, name)).href) }
const PaidIntro = (await bundle('./PaidIntro.jsx', 'PaidIntro.mjs')).default
const PaidGuide = (await bundle('./PaidGuide.jsx', 'PaidGuide.mjs')).default
const app = readFileSync(here('./App.jsx'), 'utf8')

// 불안 자극·확정·근거 없는 수치·혜택 표현이 없어야 한다
const FORBIDDEN = /확정|보장|반드시|무조건|100%|\d+\s*%|할인|마감|오늘만|지금만|정확도|평생|언제든|적중/

test('상품 안내 문구: 일·돈·관계 3개는 실제 유료 항목(SAJU_PAID)에서 가져오고, 설명은 그 항목 설명과 같은 내용이다', () => {
  assert.strictEqual(SAJU_PAID_HIGHLIGHTS.length, 3)
  assert.deepStrictEqual(SAJU_PAID_HIGHLIGHTS.map(x => x.topic), ['돈', '일', '관계'])
  for (const x of SAJU_PAID_HIGHLIGHTS) {
    const b = SAJU_PAID.bundles.find(y => y.title === x.bundle)
    assert.ok(b, x.bundle + ' 은(는) 실제 유료 항목이어야 함')
    // 설명 속 핵심 표현이 해당 항목의 실제 설명(desc)에도 있어야 한다 (새 기능·혜택을 만들지 않음)
    const keys = { 돈: ['인생 단계별 돈의 흐름', '돈이 새는 패턴', '돈이 잘 모이는 조건'], 일: ['어울리는 직업', '능력이 살아나는 일 방식', '도약할 시기와 조심할 시기'], 관계: ['곁에 둘 사람과 조심할 사람', '인간관계에서 반복하는 패턴'] }[x.topic]
    for (const k of keys) { assert.ok(x.text.includes(k), x.topic + ': ' + k); assert.ok(b.desc.includes(k), x.bundle + ' desc: ' + k) }
  }
})

test('풀이 기간과 결과 받기는 구분해서 적고, 확인된 내용만 쓴다', () => {
  assert.deepStrictEqual(SAJU_PAID_FACTS.map(x => x.label), ['풀이 기간', '결과 받기'])
  assert.ok(SAJU_PAID_FACTS[0].text.includes('2027년 1월~12월(12개월)') && SAJU_PAID.summary.includes('2027년 1월~12월(12개월)'))
  // 결과 받기: PDF 저장·이메일 받기만(실제 기능). 보관 기간·재열람 약속은 쓰지 않는다.
  assert.strictEqual(SAJU_PAID_FACTS[1].text, '결제 후 풀이를 생성해요. 완료된 결과는 PDF로 저장하거나 이메일로 받을 수 있어요.')
  assert.ok(!/보관|재열람|다시 볼|평생|언제든/.test(SAJU_PAID_FACTS[1].text))
  // 앱 안에 실제 PDF 저장·이메일 받기가 있다
  assert.ok(app.includes('📄 PDF 저장') && app.includes('sendOrderEmail(paidOrdersRef.current.full'))
})

test('새 안내 문구에는 불안 자극·확정·수치·할인·마감 표현이 없다', () => {
  const all = [SAJU_PAID_FREE_NOTE, ...SAJU_PAID_HIGHLIGHTS.map(x => x.text), ...SAJU_PAID_FACTS.map(x => x.text)].join(' ')
  assert.ok(!FORBIDDEN.test(all), all.match(FORBIDDEN)?.[0])
  // 무료 풀이 설명은 실제 무료 섹션(핵심 성향·강점·주의할 습관·실천 팁)과 일치한다
  assert.ok(['핵심 성향', '강점', '주의할 습관', '실천 팁'].every(k => SAJU_PAID_FREE_NOTE.includes(k)))
})

test('접힌 상태: 소개 문구와 버튼만 보이고, 가격·결제 버튼은 아직 보이지 않는다', () => {
  const html = renderToStaticMarkup(h(PaidIntro, null, h(PaidGuide, { title: SAJU_PAID.title, bundles: SAJU_PAID.bundles, summary: SAJU_PAID.summary, priceText: '1,990원', buttonText: '전체 분석 보기 · 1,990원', onBuy: () => {}, highlights: SAJU_PAID_HIGHLIGHTS, freeNote: SAJU_PAID_FREE_NOTE, facts: SAJU_PAID_FACTS })))
  assert.ok(html.includes('내 사주, 조금 더 궁금해졌나요?'))
  assert.ok(html.includes('기본 풀이에서 살펴본 내용을 바탕으로,<br/>궁금한 주제를 더 자세히 알아보세요.'))
  assert.ok(html.includes('상품별 풀이 내용과 가격을 확인한 뒤 선택할 수 있어요.'))
  assert.ok(html.includes('자세한 풀이 살펴보기 →') && html.includes('aria-expanded="false"'))
  assert.ok(!html.includes('1,990원') && !html.includes('전체 분석 보기 ·') && !html.includes('paid-product-info'))
  assert.ok(html.includes('hidden'))
})

test('펼친 상태: 일·돈·관계 3개와 전체 항목, 풀이 기간·결과 받기, 가격이 보인다', () => {
  const html = renderToStaticMarkup(h(PaidIntro, { defaultOpen: true }, h(PaidGuide, { title: SAJU_PAID.title, bundles: SAJU_PAID.bundles, summary: SAJU_PAID.summary, deepNote: SAJU_PAID.deepNote, priceText: '1,990원', buttonText: '전체 분석 보기 · 1,990원', onBuy: () => {}, highlights: SAJU_PAID_HIGHLIGHTS, freeNote: SAJU_PAID_FREE_NOTE, facts: SAJU_PAID_FACTS })))
  assert.ok(html.includes('aria-expanded="true"') && html.includes('안내 접기'))
  assert.strictEqual((html.match(/data-highlight=/g) || []).length, 3)
  for (const x of SAJU_PAID_HIGHLIGHTS) assert.ok(html.includes(x.bundle))
  assert.ok(html.includes('전체 8개 항목 모두 보기'))
  for (const b of SAJU_PAID.bundles) assert.ok(html.includes(b.title), b.title)
  assert.ok(html.includes('풀이 기간') && html.includes('결과 받기') && html.includes('가격 1,990원 · 1회 결제') && html.includes('전체 분석 보기 · 1,990원'))
  assert.ok(html.includes(SAJU_PAID.deepNote))     // 심화 분석(9,900원)은 별도 상품이라는 기존 안내 유지
})

test('버튼 클릭만으로 결제·풀이 생성이 시작되지 않는다: 소개 버튼은 펼침만, 결제는 안내 안의 구매 버튼에서만', () => {
  const src = readFileSync(here('./PaidIntro.jsx'), 'utf8').replace(/\/\/.*$/gm, '')
  assert.ok(src.includes('setOpen(o => !o)'))
  assert.ok(!/onBuy|fetch\(|checkout|Checkout|IMP|requestPay|startCheckout|createOrder/.test(src))
  // 구매 버튼(openFullAnalysisCheckout)은 App 에서 PaidGuide 의 onBuy 로만 연결된다
  const uses = app.split('\n').filter(l => l.includes("openFullAnalysisCheckout('result_card')"))
  assert.strictEqual(uses.length, 1); assert.ok(uses[0].includes('onBuy={'))
  assert.ok(app.includes('<PaidIntro>') && app.includes('<PaidGuide title={SAJU_PAID.title}'))
})

test('첫 화면: 소개 문장과 무료 안내가 새 문구로 바뀌고, 제목·버튼·기존 문구 정리가 맞다', () => {
  assert.ok(app.includes('일도, 돈도, 사람 관계도.') && app.includes('내 사주에는 어떤 이야기가 담겨 있을까요?'))
  assert.ok(app.includes('기본 풀이는 무료로 볼 수 있어요.') && app.includes('더 자세한 풀이를 원할 때 유료 상품을 선택해주세요.'))
  // 제목과 메인 버튼 유지
  assert.ok(app.includes('나, 앞으로<br/>잘 풀릴까?') && app.includes('내 사주 무료로 보기 →') && app.includes('onClick={goSaju}'))
  // 예전 소개 문장과 중복되던 하단 무료 안내는 정리됐다
  assert.ok(!app.includes('사주로 나를 이해하고,') && !app.includes('바로 써볼 말을 찾아보세요'))
  assert.ok(!app.includes('무료 요약은 결제 없이 볼 수 있어요. 더 깊은 상세 풀이는 요약을 본 뒤 선택할 수 있고, 유료(1,990원)예요.'))
  // 무료 안내는 시작 버튼 바로 뒤에 있다
  const iBtn = app.indexOf('내 사주 무료로 보기 →'), iNote = app.indexOf('기본 풀이는 무료로 볼 수 있어요.')
  assert.ok(iBtn > 0 && iNote > iBtn && iNote - iBtn < 600)
  // 결제 없이 무료 결과까지: 무료 분석 API 는 주문 없이 호출된다
  assert.ok(app.includes("type: apiType, isPaid: false"))
})

// ── 문구 정리(A): 실제 제공 기능·가격·상품명과 일치 ──
const secure = readFileSync(here('../../backend/secure.js'), 'utf8')
const productOf = (key) => {
  const line = secure.split('\n').find(l => l.startsWith('  ' + key + ':'))
  if (!line) return null
  const a = line.match(/amount: (\d+)/), e = line.match(/autoEmail: (true|false)/)
  return { amount: Number(a[1]), autoEmail: e ? e[1] === 'true' : undefined }
}

test('결제 후 문구: 재열람·보관 약속이 없고, 생성 흐름·PDF 저장·이메일 받기만 안내한다', () => {
  for (const bad of ['평생 재열람', '언제든 다시', '계속 볼 수', '즉시 열림', '바로 만들어', '바로 전송돼요', '결과를 저장할 수 없어요']) assert.ok(!app.includes(bad), bad)
  assert.ok(app.includes("{ icon: '⚡', label: '결제 후 생성' }") && app.includes("{ icon: '📧', label: '이메일 받기' }") && app.includes("{ icon: '📄', label: 'PDF 저장' }"))
  assert.ok(app.includes('결제 후 풀이를 생성해요.') && app.includes('이메일 없이 결제하시면 결과를 자동으로 보내드릴 수 없어요. 완료 후 PDF 저장이나 이메일 받기를 이용해주세요.'))
  assert.ok(!app.includes('화면을 닫으면 결과를 다시 볼 수 없어요'))
  assert.ok(app.includes('받은 메일함에서 다시 볼 수 있어요'))     // 고객의 메일함 이야기이지 서비스 보관 약속이 아니다
})

test('이메일 모달: 자동 발송은 서버가 실제로 자동 발송하는 상품(전체 분석·자녀운·심화)에만 안내한다', () => {
  assert.strictEqual(productOf('full_saju')?.autoEmail, true); assert.strictEqual(productOf('full_child')?.autoEmail, true); assert.strictEqual(productOf('full_nohu')?.autoEmail, true)
  assert.strictEqual(productOf('deep')?.autoEmail, true); assert.strictEqual(productOf('gunghab')?.autoEmail, false); assert.strictEqual(productOf('baeknyeon')?.autoEmail, false)
  assert.ok(app.includes("emailModal.productName === '전체 분석' || emailModal.productName === '자녀운 프리미엄' || emailModal.productName === '심화 분석' ? '📧 결과가 완성되면 이메일로도 보내드려요' : '📧 결과가 완성되면 결과 화면에서 이메일로 받을 수 있어요'"))
})

test('이메일 안내: 발송 성공을 확인하지 않고 "보내드렸어요"라고 단정하지 않으며, 수동 이메일 받기 버튼은 유지된다', () => {
  assert.ok(!app.includes('로 결과를 보내드렸어요') && !app.includes('이메일 발송 완료'))
  assert.ok(app.includes('id="result-email-input"') && app.includes('id="gunghab-email-input"') && app.includes('sendDeepEmail'))
})

test('심화 분석 안내: 전체 분석과 별도 상품이라고만 하고, 포함·보관을 단정하지 않으며 항목 수(7)가 실제와 같다', () => {
  assert.ok(SAJU_PAID.deepNote.includes('심화 분석(9,900원)은 전체 분석과 별도 상품이에요') && SAJU_PAID.deepNote.includes('7가지'))
  assert.ok(!/포함|그대로 남|줄지 않|기본 풀이|평생|언제든/.test(SAJU_PAID.deepNote))
  const deepItems = app.match(/const DEEP_ITEMS = \[([\s\S]*?)\n\]/)[1].split('\n').filter(l => l.trim().startsWith("'"))
  assert.strictEqual(deepItems.length, 7)
  const serverSrc = readFileSync(here('../../backend/server.js'), 'utf8')
  const deepBlock = serverSrc.slice(serverSrc.indexOf('9900원 심화 분석'), serverSrc.indexOf('streamToClient(res, deepPrompt'))
  assert.strictEqual((deepBlock.match(/^===.+===$/gm) || []).length, 7)   // 서버 심화 프롬프트(deepPrompt)의 실제 섹션 수
  // 결과 화면의 구분선·카드: 상품명을 정확히 쓴다(무료 풀이 / 전체 분석 / 심화 분석)
  assert.ok(app.includes('— 여기까지가 전체 분석(1,990원)이에요 —') && app.includes('전체 분석과 별도 상품이에요. 아래 7가지를 따로 풀어드려요.'))
  assert.ok(!app.includes('기본 풀이(1,990원)'))
})

test('화면의 가격 표시는 서버 상품 가격과 일치한다', () => {
  const amt = (k) => productOf(k).amount
  assert.strictEqual(amt('full_saju'), 1990); assert.strictEqual(amt('full_nohu'), 1990); assert.strictEqual(amt('gunghab'), 1990)
  assert.strictEqual(amt('deep'), 9900); assert.strictEqual(amt('full_child'), 9900); assert.strictEqual(amt('gilil'), 9900); assert.strictEqual(amt('baeknyeon'), 99000)
  // UI 표시
  assert.ok(app.includes('priceText="1,990원"') && app.includes('GUNGHAB_PRICE_TEXT') && readFileSync(here('./relations.js'), 'utf8').includes("GUNGHAB_PRICE_TEXT = '1,990원'"))
  assert.ok(app.includes('심화 분석 (9,900원)') && app.includes("'9,900원 결제하기 →'") && app.includes('길일 찾기 (9,900원)') && app.includes('99,000원 결제하고 받기') && app.includes('유료 99,000원'))
  assert.ok(app.includes("serviceType === 'child' ? '9,900원' : '1,990원'"))
  // 할인·취소선 가격 표시는 없다
  assert.ok(!/line-through|19,900원|50% ?할인/.test(app))
})

test('심화 분석 결제 안내의 항목 설명은 실제 심화 항목(DEEP_ITEMS)과 같다 — 근거 없는 항목 이름을 쓰지 않는다', () => {
  for (const stale of ['재물·커리어 심층 분석', '전환점 정확한 연도', '오행으로 본 나의 커리어 계절', '절대 하면 안 되는 결정 1가지', '귀인 시기 · 행동 전략']) assert.ok(!app.includes(stale), stale)
  assert.ok(app.includes('종합 흐름 요약 · 수비학 운명수 · 10년 대운 · 귀인 · 해야 할 것과 하지 말아야 할 것'))
  assert.ok(app.includes('{DEEP_ITEMS.map((t, i) => ('))
  // 모달 안내 줄은 단어 중간에서 끊기지 않는다
  assert.ok(/lineHeight: 2\.2, margin: 0, wordBreak: 'keep-all' \}\}>\s*\{emailModal\.productName/.test(app))
})

test('이메일 입력창 안내: 실제 사용 범위(결과 발송·결제·문의 확인·구매 기록과 함께 저장)와 맞고, 재열람은 말하지 않는다', () => {
  const line = '🔒 이메일은 결과 발송과 결제·문의 확인에만 쓰이고, 구매 기록과 함께 저장돼요'
  assert.ok(app.includes(line) && !app.includes('이메일은 결과 발송에만 사용돼요'))
  assert.ok(!/재열람|다시 열|다시 찾|언제든/.test(line))
  // 근거 1) 서버가 주문과 결과 사본에 이메일을 저장한다(구매 기록과 함께 저장)
  assert.ok(/INSERT INTO orders \([^)]*email/.test(secure) && /INSERT INTO results \(email,/.test(secure))
  // 근거 2) 결과 발송(자동/수동)과 운영자 조회·재발송(문의 확인)에 쓰인다
  assert.ok(secure.includes('sendWithQuota') && secure.includes('/api/admin/results/search') && secure.includes("'o.email = $1'"))
  // 근거 3) 결제창(포트원)에 구매자 이메일로 전달된다
  assert.ok(/buyer_email: email \|\| ''/.test(app) || /buyer_email/.test(app))
  // 이 외의 용도(분석 도구 전달·광고성 발송)는 코드에 없다
  assert.ok(!/(trackEvent|gtag|fbq)\([^)]*(email|preEmail)/.test(app))
  assert.ok(!/newsletter|marketing|promo|광고성|뉴스레터/i.test(secure))
})
