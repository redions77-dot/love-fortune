import test from 'node:test'
import assert from 'node:assert'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseContentBlocks } from './contentBlocks.js'
import { takeSentences, summarizeSaju, summarizeMoney, summarizeGunghabFree, summarizeGunghabPaid } from './reportSummary.js'
import { parseMyFree, parseGunghabFree } from './relations.js'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const outDir = here('../node_modules/.cache/report-summary-test')
mkdirSync(outDir, { recursive: true })
const bundle = (entry, name) => { buildSync({ entryPoints: [here(entry)], bundle: true, packages: 'external', format: 'esm', jsx: 'automatic', outfile: join(outDir, name), logLevel: 'silent' }); return import(pathToFileURL(join(outDir, name)).href) }
const UI = await bundle('./reportBlocks.jsx', 'reportBlocks.mjs')
const PDF = await bundle('./pdfExport.jsx', 'pdfExport.mjs')
const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim()
// 운영 화면의 parseSections 와 같은 방식으로 ===제목=== 구간을 나눈다
const sectionsOf = (text) => { const parts = text.split(/===(.+?)===/s); const out = []; for (let i = 1; i < parts.length; i += 2) out.push({ title: parts[i].trim(), content: (parts[i + 1] || '').trim() }); return out }
// 요약의 모든 문장은 원문(공백 정리 후)에 그대로 들어 있어야 한다 — 새 문장·수치를 만들지 않는다.
const inSource = (summary, source) => {
  const src = norm(source)
  const texts = [summary.headline, summary.compare?.left?.text, summary.compare?.right?.text, summary.strengthOnly, summary.cautionOnly, summary.action, ...(summary.rows || []).map(r => r.text)].filter(Boolean)
  return texts.every(t => src.includes(norm(t)))
}

const FREE_MY = `===핵심 한 문장===
주변의 기준을 민감하게 받아들이면서 나만의 속도를 찾아가는 경향이 있어요.
부탁을 받거나 일을 정할 때 이런 모습이 나타날 수 있어요.

===이런 성향이 나오는 이유===
나를 누르는 기운이 3곳에 있어요.

===나의 강점===
상대가 불편해하는 것을 먼저 알아차리는 힘이 있어요.

일을 맡았을 때도 필요한 것을 챙기는 모습으로 나타나요.

===주의할 습관===
여러 사람의 필요가 한꺼번에 보일 때 거절 기준이 흐려질 수 있어요.

===바로 실천할 팁===
부탁을 받으면 바로 답하기 전에 달력부터 확인해 보세요. 자리가 없으면 "이번 주는 어렵고 다음 주는 가능해요"라고 먼저 말해 보세요.`

test('takeSentences: 문장 단위로만 자르고, 첫 문장이 한도를 넘으면 생략한다', () => {
  assert.strictEqual(takeSentences('첫째예요. 둘째예요. 셋째예요.', 2, 100), '첫째예요. 둘째예요.')
  assert.strictEqual(takeSentences('첫째예요. 둘째예요.', 1, 100), '첫째예요.')
  assert.strictEqual(takeSentences('가'.repeat(300) + '.', 1, 190), null)
  assert.strictEqual(takeSentences('', 1), null)
  assert.strictEqual(takeSentences('📌 이모지로 시작해요. 다음 문장이에요.', 1), '이모지로 시작해요.')
})

test('내 사주 요약: 핵심 성향 · 강점/주의 비교 · 지금 해볼 행동 — 원문에 있는 문장만', () => {
  const my = parseMyFree(FREE_MY)
  const s = summarizeSaju(my)
  assert.strictEqual(s.kind, 'saju')
  assert.ok(s.headline.startsWith('주변의 기준을'))
  assert.deepStrictEqual([s.compare.left.label, s.compare.right.label], ['강점', '주의할 점'])
  assert.strictEqual(s.compare.left.text, '상대가 불편해하는 것을 먼저 알아차리는 힘이 있어요.')
  assert.ok(s.compare.right.text.startsWith('여러 사람의 필요가'))
  assert.strictEqual(s.actionLabel, '지금 해볼 행동')
  assert.ok(s.action.startsWith('부탁을 받으면 바로 답하기 전에'))
  assert.ok(inSource(s, FREE_MY))
  // 점수·확률·예측 같은 새 숫자는 없다
  assert.ok(!/\d+\s*(점|%|퍼센트)/.test(JSON.stringify(s)))
})

test('내 사주 요약: 없는 항목은 생략하고, 아무것도 없으면 null', () => {
  const onlyCore = summarizeSaju(parseMyFree('===핵심 한 문장===\n나는 이런 사람이에요.'))
  assert.ok(onlyCore.headline && !onlyCore.compare && !onlyCore.action)
  const oneSide = summarizeSaju(parseMyFree('===핵심 한 문장===\n나는 이런 사람이에요.\n\n===나의 강점===\n꾸준해요.'))
  assert.ok(!oneSide.compare && oneSide.strengthOnly === '꾸준해요.')
  assert.strictEqual(summarizeSaju(parseMyFree('')), null)
  assert.strictEqual(summarizeSaju(null), null)
})

const GUNGHAB_FREE = `===한 줄 요약===
서로 다른 속도가 만나는 관계예요.

===관계 요약===
일상에서는 이렇게 나타날 수 있어요.

===잘 맞는 점===
서로의 약한 부분을 자연스럽게 채워줘요. 한쪽이 미루면 다른 쪽이 앞장서요.

===조율할 점===
감정을 말로 꺼내는 속도가 달라요.

===대화 문장===
"지금 이야기해도 괜찮을까요?"`

test('궁합 요약: 잘 맞는 점 / 부딪히기 쉬운 점 / 바로 써볼 대화 방법', () => {
  const parsed = parseGunghabFree(GUNGHAB_FREE, [])
  const s = summarizeGunghabFree(parsed)
  assert.deepStrictEqual([s.compare.left.label, s.compare.right.label], ['잘 맞는 점', '부딪히기 쉬운 점'])
  assert.strictEqual(s.compare.left.text, '서로의 약한 부분을 자연스럽게 채워줘요.')
  assert.strictEqual(s.compare.right.text, '감정을 말로 꺼내는 속도가 달라요.')
  assert.strictEqual(s.actionLabel, '바로 써볼 대화 방법')
  assert.strictEqual(s.action, parsed.line)
  assert.ok(inSource(s, GUNGHAB_FREE))
})

test('궁합 요약: 검증을 통과하지 못한 대화 문장(반말)은 쓰지 않는다 / 내용이 없으면 null', () => {
  const bad = summarizeGunghabFree(parseGunghabFree(GUNGHAB_FREE.replace('"지금 이야기해도 괜찮을까요?"', '"지금 얘기할래?"'), []))
  assert.ok(bad.compare && !bad.action)
  assert.strictEqual(summarizeGunghabFree(parseGunghabFree('', [])), null)
  assert.strictEqual(summarizeGunghabFree(null), null)
})

const PAID = `===財運 · 인생 재물 전체===
📌 인생 단계별 돈 흐름
1. 젊은 시절은 월급처럼 꾸준히 들어오는 흐름이 중심이에요. 특징과 패턴이 있어요.

2. 중년에는 돈이 크게 움직여요.

⚠️ 이 사주의 돈 새는 패턴
사람 때문에 쓰는 돈이 생각보다 많아요. 모임이 겹치면 지출이 늘어요.

📌 돈이 가장 잘 모이는 조건
기록하는 습관이 있을 때예요.

===職 · 직업과 커리어===
📌 이 사주에 맞는 직업
1. 기획자 — 이유

📌 직장인 / 프리랜서 / 사업 중 어떤 구조, 어떤 환경에서 능력이 폭발하는지
역할이 분명한 조직에서 실력이 잘 드러나요. 기준이 자주 바뀌면 지치기 쉬워요.

===月運 · 월별 운세===
2027년 1월: 정리가 잘 되는 달이에요.
2월: 사람을 만날 일이 늘어요.
3월: 한 해를 돌아보는 달이에요.`

test('재물·직업 요약: 실제 프롬프트 구조("인생 단계별 돈 흐름")에서는 단계별 첫 항목을 쓰지 않고 이 항목만 생략한다', () => {
  const secs = sectionsOf(PAID)
  const s = summarizeMoney(secs)
  assert.deepStrictEqual(s.rows.map(r => r.label), ['돈이 새기 쉬운 곳', '나에게 맞는 일의 환경'])
  assert.strictEqual(s.rows[0].text, '사람 때문에 쓰는 돈이 생각보다 많아요.')
  assert.strictEqual(s.rows[1].text, '역할이 분명한 조직에서 실력이 잘 드러나요.')
  assert.ok(inSource(s, PAID))
  // 젊은 시절 같은 단계별 문장은 어떤 항목에도 들어가지 않는다
  assert.ok(!JSON.stringify(s).includes('젊은 시절'))
  assert.ok(!s.rows.some(r => r.label === '돈이 들어오는 방식'))
  // 재물/직업 섹션이 없거나 소제목이 없으면 만들지 않는다
  assert.strictEqual(summarizeMoney([{ title: '月運 · 월별 운세', content: '2027년 1월: 좋아요.' }]), null)
  assert.strictEqual(summarizeMoney([{ title: '財運', content: '그냥 문단이에요.' }]), null)
  assert.strictEqual(summarizeMoney([{ title: '財運 · 인생 재물 전체', content: '📌 인생 단계별 돈 흐름\n1. 젊은 시절은 꾸준해요.\n\n2. 중년에는 커져요.' }]), null)
  assert.strictEqual(summarizeMoney([]), null)
})

test('재물·직업 요약: 수입 방식·재물 흐름을 직접 설명하는 소제목이 결과에 있으면 그 문장을 쓴다(일반 문단만)', () => {
  const base = (head, body) => [{ title: '財運 · 재물', content: `${head}\n${body}\n\n⚠️ 돈 새는 패턴\n충동구매가 잦아요.` }]
  const direct = summarizeMoney(base('📌 돈이 들어오는 방식', '월급처럼 꾸준히 들어오는 편이에요. 큰 한 방은 드물어요.'))
  assert.deepStrictEqual(direct.rows.map(r => r.label), ['돈이 들어오는 방식', '돈이 새기 쉬운 곳'])
  assert.strictEqual(direct.rows[0].text, '월급처럼 꾸준히 들어오는 편이에요.')
  const flow = summarizeMoney(base('📌 재물 흐름', '들어오는 돈보다 나가는 돈의 시기가 눈에 띄어요.'))
  assert.strictEqual(flow.rows[0].label, '돈이 들어오는 방식')
  // 같은 소제목이어도 나이·시기로 나뉜 제목이거나 번호 목록이면 쓰지 않는다
  assert.ok(!summarizeMoney(base('📌 20~30대 돈이 들어오는 방식', '꾸준해요.')).rows.some(r => r.label === '돈이 들어오는 방식'))
  assert.ok(!summarizeMoney(base('📌 돈이 들어오는 방식', '1. 첫째는 월급이에요.\n\n2. 둘째는 부수입이에요.')).rows.some(r => r.label === '돈이 들어오는 방식'))
})

test('관계 상세 풀이 요약: ✅/⚠️ 소제목이 있을 때만, 대화 문장은 무료 요약의 검증된 문장일 때만', () => {
  const secs = [{ title: '서로를 이해하기', content: '✅ 잘 맞는 부분\n서로의 속도를 존중해요. 편안해요.\n\n⚠️ 부딪히는 부분\n표현 방식이 달라요.' }]
  const s = summarizeGunghabPaid(secs, '"지금 이야기해도 괜찮을까요?"')
  assert.strictEqual(s.compare.left.text, '서로의 속도를 존중해요.')
  assert.strictEqual(s.compare.right.text, '표현 방식이 달라요.')
  assert.strictEqual(s.action, '"지금 이야기해도 괜찮을까요?"')
  assert.strictEqual(summarizeGunghabPaid([{ title: 'x', content: '그냥 문단이에요.' }], ''), null)
  assert.ok(!summarizeGunghabPaid(secs, '').action)
})

test('본문 블록: 월 목록→타임라인, ✅+⚠️→비교, 단계 소제목+번호→단계, 🔑→강조상자, 한 줄뿐인 월은 그대로', () => {
  const b = parseContentBlocks(PAID.split('===月運 · 월별 운세===')[1])
  assert.strictEqual(b[0].type, 'timeline'); assert.strictEqual(b[0].items.length, 3)
  assert.strictEqual(parseContentBlocks('2027년 1월: 하나뿐이에요.')[0].type, 'p')
  const cmp = parseContentBlocks('✅ 좋은 점\n서로 편해요.\n\n⚠️ 조심할 점\n말이 어긋나요.')
  assert.strictEqual(cmp.length, 1); assert.strictEqual(cmp[0].type, 'compare')
  // 너무 긴 ✅/⚠️ 쌍은 비교표로 만들지 않고 본문 그대로 둔다
  const longPair = parseContentBlocks('✅ 좋은 점\n' + '가'.repeat(400) + '.\n\n⚠️ 조심할 점\n' + '나'.repeat(300) + '.')
  assert.ok(longPair.every(x => x.type !== 'compare'))
  const steps = parseContentBlocks('📌 대화로 푸는 순서\n1. 먼저 듣기\n2. 내 마음 말하기\n3. 함께 정하기')
  assert.deepStrictEqual(steps.map(x => x.type), ['h3', 'steps']); assert.strictEqual(steps[1].items.length, 3)
  assert.deepStrictEqual(parseContentBlocks('📌 직업 목록\n1. 기획자\n2. 교사').map(x => x.type), ['h3', 'li', 'li'])
  assert.strictEqual(parseContentBlocks('🔑 행동 팁\n오늘 하나만 해보세요.')[0].type, 'callout')
  assert.deepStrictEqual(parseContentBlocks(''), [])
})

test('요약 컴포넌트: 값이 있는 칸만 그려지고, 비교표·행동 상자 마크업이 나온다', () => {
  const html = renderToStaticMarkup(h(UI.ReportSummary, { data: summarizeSaju(parseMyFree(FREE_MY)) }))
  assert.ok(html.includes('한눈에 보기') && html.includes('rpt-compare') && html.includes('강점') && html.includes('주의할 점') && html.includes('지금 해볼 행동') && html.includes('rpt-callout'))
  const rows = renderToStaticMarkup(h(UI.ReportSummary, { data: summarizeMoney(sectionsOf(PAID)) }))
  assert.ok(rows.includes('재물·직업 한눈에 보기') && rows.includes('<dl') && !rows.includes('rpt-compare') && rows.includes('돈이 새기 쉬운 곳'))
  assert.strictEqual(renderToStaticMarkup(h(UI.ReportSummary, { data: null })), '')
})

test('타임라인·단계 컴포넌트는 순서 목록으로 읽힌다', () => {
  const html = renderToStaticMarkup(h(UI.ContentBlock, { b: { type: 'timeline', items: [{ lead: '2027년 1월:', text: '좋아요.' }, { lead: '2월:', text: '보통이에요.' }] } }))
  assert.strictEqual((html.match(/<ol class="rpt-timeline"/g) || []).length, 2); assert.ok(html.includes('2027년 1월:') && html.includes('보통이에요.'))
})

// ── PDF 페이지 나눔 규칙 ──
const blk = (h, o = {}) => ({ h, topPad: 0, keep: false, sec: 's', cont: false, ...o })
const HERO = 28   // 1쪽 상단 띠 높이를 이 값으로 두면 1쪽도 2쪽 이후와 같은 높이(983px)를 쓴다
test('PDF 나눔: 제목은 뒤 본문 한 덩어리와 함께 있고, 쪽 끝에 제목만 남지 않는다', () => {
  const pages = PDF.paginateBlocks([blk(300, { sec: 'a' }), blk(500, { sec: 'a' }), blk(60, { keep: true, sec: 'b' }), blk(150, { sec: 'b' })], HERO)
  pages.forEach(p => { const last = p.list[p.list.length - 1]; assert.ok(!last.keep, '쪽 끝에 제목만 남음') })
  assert.strictEqual(pages.length, 2)
})
test('PDF 나눔: 섹션의 마지막 항목만 다음 쪽 맨 위에 떨어지지 않는다(월별 운세)', () => {
  // 한 쪽(≈983) 안에 10월~11월이 들어가고 12월은 안 들어가는 상황
  const blocks = [blk(100, { keep: true, sec: 'm' }), blk(700, { sec: 'm' }), blk(110, { sec: 'm' }), blk(110, { sec: 'm' })]
  const pages = PDF.paginateBlocks(blocks, HERO)
  assert.strictEqual(pages.length, 2)
  assert.strictEqual(pages[1].list.length, 2, '마지막 항목 혼자 넘어감')
  assert.strictEqual(pages[0].list.length, 3 - 1)
})
test('PDF 나눔: 제목 바로 뒤 문단은 끌어오지 않아 제목만 남지 않는다 / 긴 문단은 문장 경계로 나뉜다', () => {
  const pages = PDF.paginateBlocks([blk(600, { sec: 'a' }), blk(60, { keep: true, sec: 'b' }), blk(120, { sec: 'b' }), blk(300, { sec: 'b' })], HERO)
  pages.forEach(p => assert.ok(!p.list[p.list.length - 1].keep))
  const long = '가나다라마바사아자차카타파하 첫 문장이에요. '.repeat(1) + '두 번째 문장은 조금 더 길게 이어서 씁니다 정말로 길게요. '.repeat(14)
  const parts = PDF.splitLongParagraph({ type: 'p', text: long })
  assert.ok(parts.length > 1 && parts.every(p => p.text.length > 20))
  assert.strictEqual(parts.map(p => p.text).join(' ').replace(/\s+/g, ' ').trim(), long.replace(/\s+/g, ' ').trim())
  assert.strictEqual(PDF.splitLongParagraph({ type: 'p', lead: '2027년 1월:', text: long }).length, 1)
})

// ── 화면 연결: 권한·범위 ──
test('요약은 보이는 범위만 쓴다: 재물·직업은 결제 후 전체 분석에서만, 새 AI 호출·점수 없음', () => {
  const app = readFileSync(here('./App.jsx'), 'utf8')
  assert.ok(app.includes('const moneySummary = isPaid && !isPaidStreaming && paidSections.length ? summarizeMoney(paidSections) : null'))
  assert.ok(app.includes('const sajuSummary = useSajuReport ? summarizeSaju(myFree) : null'))
  const src = readFileSync(here('./reportSummary.js'), 'utf8').replace(/\/\/.*$/gm, '')
  assert.ok(!/fetch\(|localStorage|XMLHttpRequest|Math\.random/.test(src))
  const css = readFileSync(here('./index.css'), 'utf8')
  assert.ok(css.includes('@page { size: A4;') && css.includes('@media print') && css.includes('[data-pdf-exclude="true"]') && css.includes('print-color-adjust: exact'))
  for (const sel of ['.no-print', '.rpt-callout', '.rpt-compare', '.rpt-timeline li']) assert.ok(css.slice(css.indexOf('@media print')).includes(sel), sel)
})

// ── 다크모드/강제 다크에도 인쇄·PDF는 항상 밝게 ──
test('밝은 테마 고정: meta color-scheme, :root color-scheme, 인쇄 색 명시, 다운로드 PDF 흰 바탕', () => {
  const html = readFileSync(here('../index.html'), 'utf8')
  assert.ok(/<meta name="color-scheme" content="only light"/.test(html) && /<meta name="supported-color-schemes" content="light"/.test(html))
  const css = readFileSync(here('./index.css'), 'utf8')
  assert.ok(css.includes(':root { color-scheme: only light; }'))
  const print = css.slice(css.indexOf('@media print'))
  // 인쇄: 흰 바탕·진한 글자를 명시하고, 그림자는 제거
  assert.ok(/html, body, #root \{ background: #fff !important; color: #111 !important; \}/.test(print))
  assert.ok(print.includes('box-shadow: none !important') && print.includes('color-scheme: only light'))
  // 인쇄에서는 그래프 채움을 뺀 모든 배경(카드·요약·비교 칸·강조 상자·표 셀)을 투명(흰 종이)으로 — 어둡게 바뀐 배경이 인쇄될 수 없다
  assert.ok(print.includes('.rpt-page *:not(i):not([style*="flex: 1"])') && /background-color: transparent !important; background-image: none !important;/.test(print))
  // 모든 요소를 한꺼번에 검정으로 덮지 않는다(오행·그래프 색 유지)
  assert.ok(!/\*\s*\{[^}]*\bcolor:\s*#?(000|111)/.test(print.replace(/html, body, #root[^}]*\}/, '')))
  // 배경 색 유지(exact)는 그래프 채움(오행 분포 막대·관계 항목 칸)에만. 카드·요약·강조 상자·비교 칸에는 걸지 않는다
  const exactRules = print.split('\n').filter(l => l.includes('{') && l.includes('print-color-adjust: exact'))
  assert.strictEqual(exactRules.length, 1)
  assert.ok(exactRules[0].includes('[data-distribution] i') && exactRules[0].includes('flex: 1'))
  assert.ok(!/rpt-(card|summary|callout|compare-col|badge|step-n)/.test(exactRules[0]))
  assert.ok(!/\.rpt-(callout|compare-good|compare-warn|badge|step-n)\s*\{[^}]*background:\s*#/.test(print))
  // 다운로드 PDF(이미지 방식): 캡처 바탕은 흰색, 캡처 문서는 라이트 고정
  const pdf = readFileSync(here('./pdfExport.jsx'), 'utf8')
  assert.ok(!pdf.includes('#FBFAF5') && (pdf.match(/backgroundColor: '#FFFFFF'/g) || []).length === 2 && pdf.includes("stage.style.colorScheme = 'light'"))
  assert.ok(css.includes('.pdf-page { background: #fff; color: #111; }'))
  // 화면 상태를 바꾸지 않는다: 인쇄는 window.print() 만 호출하고 API 호출이 없다
  const blocks = readFileSync(here('./reportBlocks.jsx'), 'utf8')
  assert.ok(blocks.includes('onClick={() => window.print()}') && !/fetch\(/.test(blocks))
})
