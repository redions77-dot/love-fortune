import test from 'node:test'
import assert from 'node:assert'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildDeepFlowTable, buildDeepChoiceTable, buildDeepClosing, diagnoseDeepTables, shapeTable, FLOW_COLS, CHOICE_COLS, CLOSING_COLS } from './deepTables.js'
import { readDirectives, statusAgainst, firstYear } from './timingCheck.js'
import { buildResultPdfItems, buildDeepPdfItems } from './pdfItems.js'
import { PRODUCT, productTitle, pdfFileName, birthMetaLine } from './reportMeta.js'
import { DEEP_SAMPLE } from './deepSample.fixture.mjs'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const outDir = here('../node_modules/.cache/deep-tables-test')
mkdirSync(outDir, { recursive: true })
const bundle = (entry, name) => { buildSync({ entryPoints: [here(entry)], bundle: true, packages: 'external', format: 'esm', jsx: 'automatic', outfile: join(outDir, name), logLevel: 'silent' }); return import(pathToFileURL(join(outDir, name)).href) }
const UI = await bundle('./reportBlocks.jsx', 'reportBlocks.mjs')
const PDF = await bundle('./pdfExport.jsx', 'pdfExport.mjs')
const TABLE = await bundle('./SajuTable.jsx', 'SajuTable.mjs')
const sectionsOf = (text) => { const parts = text.split(/===(.+?)===/s); const out = []; for (let i = 1; i < parts.length; i += 2) out.push({ title: parts[i].trim(), content: (parts[i + 1] || '').trim() }); return out }
const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim()
const cellText = (c) => (c && typeof c === 'object' ? [c.main, c.sub].filter(Boolean).join(' ') : c || '')
const SECS = sectionsOf(DEEP_SAMPLE)
// 시기 설명이 서로 맞는 변형(신중 구간 끝 2027년 → 유리 구간 2028~2032년). 모순 처리와 정상 처리를 나눠 확인한다.
const CONSISTENT_TEXT = DEEP_SAMPLE.replace('2032년까지 신중하게 접근해야 하고, 2033년 이후에는 물 기운이 강해지면서 에너지 소모가 커지니 큰 결정은 2028년부터 2032년 사이에 하는 것이 가장 유리해요.', '2027년까지 신중하게 접근해야 하고, 2028년부터 2032년 사이에 검토하는 것이 유리해요.')

// ── 상품 표시·파일명·기본 정보 ──
test('상품 표시: 표지 제목·파일명이 무료 핵심 풀이 / 전체 분석 / 심화 분석으로 구분된다', () => {
  assert.strictEqual(productTitle('free', '가나'), '가나님의 사주 무료 핵심 풀이')
  assert.strictEqual(productTitle('full', '가나'), '가나님의 사주 전체 분석')
  assert.strictEqual(productTitle('deep', ''), '나의 사주 심화 분석')
  assert.strictEqual(pdfFileName('free', '가나'), '마이사주_무료핵심풀이_가나')
  assert.strictEqual(pdfFileName('full', '가나'), '마이사주_전체분석_가나')
  assert.strictEqual(pdfFileName('deep', '가나'), '마이사주_심화분석_가나')
  assert.strictEqual(pdfFileName('deep', ''), '마이사주_심화분석_결과')
  assert.deepStrictEqual(Object.values(PRODUCT).map((p) => p.label), ['무료 핵심 풀이', '전체 분석', '심화 분석'])
})

test('기본 정보 한 줄: 생년월일·양력/음력·출생시간을 같은 기준으로, 모르는 값은 채우지 않는다', () => {
  assert.strictEqual(birthMetaLine({ dateText: '1996년 9월 30일', isLunar: false, birthtime: '23:40', pillars: { 시주: '丙병子자' } }), '1996년 9월 30일 · 양력 · 23:40')
  // 음력 입력: 서버 표기에 이미 (음력→양력)이 있어 양력을 덧붙이지 않는다
  assert.strictEqual(birthMetaLine({ dateText: '1996년 9월 30일 (음력→양력)', isLunar: true, birthtime: '', pillars: { 시주: '丙병子자' } }), '1996년 9월 30일 (음력→양력)')
  // 시간 입력이 없고 서버도 시주를 못 구했을 때만 '출생시간 모름'
  assert.strictEqual(birthMetaLine({ dateText: '1996년 9월 30일', isLunar: false, birthtime: '', pillars: { 시주: '-' } }), '1996년 9월 30일 · 양력 · 출생시간 모름')
  assert.strictEqual(birthMetaLine({ dateText: '', isLunar: false }), '')
})

// ── 번호 체계 ──
const partsOf = (items) => items.filter((i) => i.kind === 'section').map((i) => i.part)
test('PART 번호: 사주표는 번호 없이 두고, 풀이 섹션만 1부터 끊김 없이 이어진다(무료 → 전체)', () => {
  const core = ['나의 핵심 성향', '이유', '강점', '주의', '팁'].map((title) => ({ title, content: '내용' }))
  const sajuData = { 사주: { 년주: '辛신未미', 월주: '丙병申신', 일주: '乙을丑축', 시주: '庚경辰진' } }
  const free = buildResultPdfItems({ useSajuReport: true, coreSections: core, paidSections: [], sajuData })
  assert.deepStrictEqual(partsOf(free), [1, 2, 3, 4, 5])
  assert.strictEqual(free.filter((i) => i.kind === 'saju').length, 1)
  assert.strictEqual(free[0].kind, 'saju')               // 표지 바로 아래(심화와 같은 자리), 번호 없음
  assert.strictEqual(free[1].kind, 'section')            // 요약이 없으면 바로 풀이(번호 1)
  // 내용이 비어 있는 유료 항목은 번호를 차지하지 않는다 → 5 다음은 6
  const paid = [{ title: '財運', content: '가' }, { title: '비어 있음', content: '  ' }, { title: '職', content: '나' }, { title: '富', content: '다' }]
  const full = buildResultPdfItems({ useSajuReport: true, coreSections: core, paidSections: paid, sajuData })
  assert.deepStrictEqual(partsOf(full), [1, 2, 3, 4, 5, 6, 7, 8])
  assert.strictEqual(full.filter((i) => i.kind === 'label').length, 1)
  // 풀이가 일부만 있어도(강점 없음) 번호는 실제 출력 기준
  const noStrength = buildResultPdfItems({ useSajuReport: true, coreSections: core.filter((s) => s.title !== '강점'), paidSections: paid, sajuData })
  assert.deepStrictEqual(partsOf(noStrength), [1, 2, 3, 4, 5, 6, 7])
})

test('화면과 PDF가 같은 번호 계산을 쓴다(App.jsx 가 PART 번호를 pdfItems·corePartCount 에서 이어 붙임)', () => {
  const app = readFileSync(here('./App.jsx'), 'utf8')
  assert.ok(app.includes('buildResultPdfItems(') && app.includes('buildDeepPdfItems('))
  assert.ok(app.includes('const corePartCount = useSajuReport ? reportCoreSections.length : baseShown.length'))
  assert.ok(app.includes('part={corePartCount + i + 1}'))
  assert.ok(!app.includes('reportCoreSections.length + 1) + i + 1'))      // 예전 off-by-one(PART 5 다음 PART 7) 식은 없다
  assert.ok(app.includes("filename: useSajuReport ? pdfFileName(productKind, myName)") && app.includes("filename: pdfFileName('deep', myName)"))
  assert.ok(app.includes('productTitle(productKind, myName)') && app.includes("productTitle('deep', myName)"))
  assert.ok(!app.includes('사주 심화 분석</'), '심화 제목은 productTitle 로만')
})

// ── 심화 표: 앞으로의 흐름 한눈에 ──
test('흐름 표: 열·제목이 요구대로이고, 시기·문장은 이 고객의 풀이에서만 온다', () => {
  const t = buildDeepFlowTable(SECS)
  assert.strictEqual(t.title, '앞으로의 흐름 한눈에')
  assert.deepStrictEqual(t.cols, ['시기', '흐름의 핵심', '해볼 만한 일', '신중하게 볼 일'])
  assert.ok(t.cols.length <= 4)
  assert.deepStrictEqual(t.rows.map((r) => r[0].main), ['2027년', '현재 대운', '다음 대운', '그 다음 대운'])
  assert.deepStrictEqual(t.rows.slice(1).map((r) => r[0].sub), ['2023~2032년', '2033~2042년', '2043~2052년'])
  // 모든 칸의 문장은 원문에 그대로 들어 있다(새 문장·점수·확률 없음)
  const all = norm(DEEP_SAMPLE)
  t.rows.forEach((r) => r.slice(1).forEach((c) => { const x = c && typeof c === 'object' ? c.main : c; if (x) assert.ok(all.includes(norm(x)), x) }))
  assert.ok(!/점수|확률|%|수확기|상승기·|준비기·/.test(JSON.stringify(t.rows.map((r) => r.slice(2)))))
  // 흐름 칸은 핵심 한 문장(표는 짧게, 상세 설명은 본문이 맡는다)
  assert.deepStrictEqual(t.rows.map((r) => r[1]), ['2027년은 준비와 조율의 해예요.', '이 대운은 가나님이 일에서 능력을 인정받고 역할이 커지는 상승기예요.', '재물 영역이 가장 크게 움직이는 시기예요.', '이 사주가 가장 안정되는 시기예요.'])
  assert.strictEqual(t.rows[1][2], '직장에서 맡은 업무를 꾸준히 완수하면서 작은 성과를 쌓아가세요.')
  assert.strictEqual(t.rows[1][3], '큰 빚을 내서 투자하거나 사업을 시작하는 것은 절대 피하세요.')
})

test('흐름 표: 연도·기간은 고객마다 다르다(하드코딩 없음) — 다른 연도로 바꾸면 표도 따라 바뀐다', () => {
  const shifted = DEEP_SAMPLE.replace(/2023~2032/g, '2025~2034').replace(/2033~2042/g, '2035~2044').replace(/2043~2052/g, '2045~2054').replace(/2027년 흐름/g, '2028년 흐름').replace(/📌 2027년 총평\n2027년은/, '📌 2028년 총평\n2028년은')
  const t = buildDeepFlowTable(sectionsOf(shifted))
  assert.deepStrictEqual(t.rows.map((r) => r[0].sub), ['한 해 흐름', '2025~2034년', '2035~2044년', '2045~2054년'])
  assert.strictEqual(t.rows[0][0].main, '2028년')
  assert.ok(!JSON.stringify(t).includes('2023~2032'))
})

test('흐름 표: 자료가 부족하면 확인되는 행만 보여 주거나 표를 만들지 않는다', () => {
  const onlyDaeun = SECS.filter((s) => /大運/.test(s.title))
  assert.strictEqual(buildDeepFlowTable(onlyDaeun).rows.length, 3)                 // 연운 없이 대운 3행
  const oneRow = [{ title: '大運 · 10년 대운 흐름', content: '📌 현재 대운 (2023~2032년)\n이 대운은 상승기예요.' }]
  assert.strictEqual(buildDeepFlowTable(oneRow), null)                              // 한 행뿐이면 표 생략
  assert.strictEqual(buildDeepFlowTable([]), null)
  assert.strictEqual(buildDeepFlowTable([{ title: '🧭 종합 흐름 요약', content: '문장만 있어요.' }]), null)
  assert.strictEqual(buildDeepFlowTable(null), null)
})

// ── 심화 표: 지금 나에게 맞는 선택 ──
test('선택 표: 작은 기회 / 큰 결정 기준은 종합 요약에서, 보증·금전 부탁은 근거가 있을 때만', () => {
  // 시기 설명이 맞는 결과(신중 구간 끝 2027년 → 유리 구간 2028~2032년)
  const consistent = sectionsOf(CONSISTENT_TEXT)
  const t = buildDeepChoiceTable(consistent)
  assert.strictEqual(t.title, '지금 나에게 맞는 선택')
  assert.deepStrictEqual(t.cols, ['선택의 종류', '풀이 요약', '실천 조언'])
  assert.deepStrictEqual(t.rows.map((r) => cellText(r[0])), ['작은 기회 이직 제안, 소규모 프로젝트, 새로운 인연, 작은 투자', '큰 결정 사업 확장, 큰 투자, 결혼, 퇴사', '보증·금전 부탁'])
  assert.strictEqual(t.rows[0][1], '2027년부터 반갑게 받아들여도 괜찮아요.')
  assert.strictEqual(t.rows[0][2], '특히 2028년, 2029년에 들어오는 기회는 적극적으로 검토하세요.')      // 권하는 말 → 실천 조언
  assert.strictEqual(t.rows[2][1], '특히 2027년 상반기에 이런 요청이 들어올 수 있는데, 어떤 이유로도 응하면 안 돼요.')   // 시기·상황 설명 → 풀이 요약(행동 칸에 넣지 않는다)
  assert.strictEqual(t.rows[2][2], '보증을 서거나 지인에게 큰 돈을 빌려주는 것은 절대 피하세요.')
  assert.strictEqual(t.rows[1][2], null)                                                                   // 권하는 문장이 없으면 비운다(만들어 채우지 않음)
  assert.strictEqual(t.note, null)
  // 보증 이야기가 없는 결과에서는 그 행이 없다
  const noGuarantee = sectionsOf(CONSISTENT_TEXT.replace(/보증을 서거나 지인에게 큰 돈을 빌려주는 것은 절대 피하세요. 특히 2027년 상반기에 이런 요청이 들어올 수 있는데, 어떤 이유로도 응하면 안 돼요./, '무리한 약속은 하지 마세요.'))
  assert.ok(!buildDeepChoiceTable(noGuarantee).rows.some((r) => /보증/.test(cellText(r[0]))))
  // 종합 요약에 기준이 없으면 표를 만들지 않는다
  assert.strictEqual(buildDeepChoiceTable(SECS.filter((s) => !/종합/.test(s.title))), null)
})

test('시기 판단: 유리함과 신중히 검토는 함께 성립한다 — 기간이 겹친다는 이유만으로 모순이 아니다', () => {
  // 첨부 결과의 실제 문장: "2032년까지 신중하게 접근 … 2028년부터 2032년 사이에 하는 것이 가장 유리" → 신중(careful) + 유리(go) → 문제 없음
  const t = buildDeepChoiceTable(SECS)
  assert.deepStrictEqual(t.rows.map((r) => r[0].main), ['작은 기회', '큰 결정', '보증·금전 부탁'])    // 큰 결정 행을 빼지 않는다
  assert.strictEqual(t.note, null)
  assert.ok(t.rows[1][1].includes('2032년까지 신중하게 접근해야 하고'))                                // 원문 문장 그대로
  assert.deepStrictEqual(diagnoseDeepTables(SECS).filter((d) => d.code === 'timing-opposed'), [])
  assert.deepStrictEqual(readDirectives('큰 결정은 2032년까지 신중하게 접근해야 해요.'), [])           // careful 은 지시로 읽지 않는다
  const both = readDirectives('큰 결정은 2028년부터 2032년 사이에 하는 것이 가장 유리해요.')
  assert.deepStrictEqual(both.map((d) => [d.stance, d.range]), [['go', [2028, 2032]]])
  // 유리 + 신중히 검토를 한 문장에 함께 써도 상반으로 보지 않는다
  assert.strictEqual(statusAgainst('큰 투자는 2028년부터 2030년 사이가 유리하지만 신중하게 검토하세요.', readDirectives('큰 투자는 2029년에 신중하게 보세요.')), 'ok')
})

test('상반된 권고: 같은 종류의 결정에 하지 말라와 하기 좋다가 기간까지 겹치면 그 행을 싣지 않고, 기간을 모르면 원문 그대로 두고 진단만 남긴다', () => {
  const base = ['===🧭 종합 흐름 요약===', '📌 작은 기회 vs 큰 결정 기준', '1. 작은 기회(새 모임)는 반갑게 받아들여도 좋아요. 천천히 하세요.', '', '2. 큰 투자는 2028년부터 2030년 사이에 하기 좋아요. 준비해 두세요.', '']
  const opposed = sectionsOf([...base, '===道 · 지금===', '⚠️ 하면 안 되는 것', '1. 큰 투자는 2029년까지 하지 마세요. 서두르지 마세요.', ''].join('\n'))
  const t = buildDeepChoiceTable(opposed)
  assert.strictEqual(t, null)                                             // 남은 행이 하나뿐이라 표 생략
  assert.deepStrictEqual(diagnoseDeepTables(opposed).filter((d) => d.code === 'timing-opposed').length, 1)
  const withGuarantee = sectionsOf([...base, '===道 · 지금===', '📌 지금 당장 시작해야 할 것', '1. 하나를 정리하세요. 좋아요.', '', '⚠️ 하면 안 되는 것', '1. 큰 투자는 2029년까지 하지 마세요. 서두르지 마세요.', '', '2. 보증을 서거나 돈을 빌려주는 것은 피하세요. 응하지 마세요.', ''].join('\n'))
  const t2 = buildDeepChoiceTable(withGuarantee)
  assert.deepStrictEqual(t2.rows.map((r) => r[0].main), ['작은 기회', '보증·금전 부탁'])
  assert.strictEqual(t2.note, '표에는 시기 설명이 분명한 항목만 담았어요.')
  // 기간이 겹치지 않으면(2027년까지 미루고 2028년부터 유리) 문제 없음
  const disjoint = sectionsOf([...base, '===道 · 지금===', '⚠️ 하면 안 되는 것', '1. 큰 투자는 2027년까지 하지 마세요. 서두르지 마세요.', ''].join('\n'))
  assert.deepStrictEqual(diagnoseDeepTables(disjoint).filter((d) => /timing/.test(d.code)), [])
  assert.strictEqual(buildDeepChoiceTable(disjoint).rows.length, 2)
  // 한쪽에 연도가 없으면 모호 → 어느 쪽도 고르지 않고 원문 그대로 싣고, 진단에만 남긴다
  const vague = sectionsOf([...base, '===道 · 지금===', '⚠️ 하면 안 되는 것', '1. 큰 투자는 지금 하지 마세요. 서두르지 마세요.', ''].join('\n'))
  assert.strictEqual(buildDeepChoiceTable(vague).rows.length, 2)
  assert.deepStrictEqual(diagnoseDeepTables(vague).filter((d) => /timing/.test(d.code)).map((d) => d.code), ['timing-ambiguous'])
  // 작은 결정(작은 투자)과 큰 결정의 stop 은 비교하지 않는다
  assert.deepStrictEqual(readDirectives('작은 투자(소액 적립)는 피하지 않아도 돼요.'), [])
  assert.strictEqual(statusAgainst('큰 투자는 2028년부터 2030년 사이에 하기 좋아요.', readDirectives('다른 종류인 결혼은 2029년까지 미루세요.')), 'ok')
  // 원문(SECS)은 읽기만 했고 바뀌지 않았다
  assert.ok(SECS[0].content.includes('2032년까지 신중하게 접근해야 하고'))
})

test('빈 칸이 많은 표: 빈 열은 빼고, 비어 있는 칸이 많으면 카드로 보여 주며 \'—\' 를 반복하지 않는다(새 내용을 채우지 않음)', () => {
  // 모두 빈 열은 뺀다(열 축소)
  const dropped = shapeTable({ title: 'T', cols: ['시기', '흐름', '해볼 일', '신중'], rows: [[{ main: 'a' }, '흐름1', '일1', null], [{ main: 'b' }, '흐름2', '일2', null]] })
  assert.deepStrictEqual(dropped.cols, ['시기', '흐름', '해볼 일'])
  assert.strictEqual(dropped.display, 'table')
  const empty = { title: 'T', cols: ['시기', '흐름', '해볼 일', '신중'], rows: [[{ main: 'a' }, '흐름1', '일1', null], [{ main: 'b' }, '흐름2', null, null], [{ main: 'c' }, '흐름3', null, '신3'], [{ main: 'd' }, '흐름4', null, null]] }
  const shaped = shapeTable(empty)
  assert.deepStrictEqual(shaped.cols, ['시기', '흐름', '해볼 일', '신중'])
  assert.strictEqual(shaped.display, 'cards')                                     // 남은 칸 12개 중 6개가 비어 있다
  const html = renderToStaticMarkup(h(UI.ReportTable, shaped))
  assert.ok(html.includes('rpt-as-cards') && html.includes('data-display="cards"'))
  assert.ok(!html.includes('rpt-td-empty') && !html.includes('—'))                // 빈 칸은 그리지 않는다
  assert.strictEqual((html.match(/<td /g) || []).length, 4 + 4 + 1 + 1)           // 행마다 시기 + 있는 칸만
  // 칸이 대부분 차 있으면 표 그대로
  const full = shapeTable({ title: 'T', cols: ['a', 'b', 'c'], rows: [['1', '2', '3'], ['4', '5', null]] })
  assert.strictEqual(full.display, 'table')
  // 열이 하나만 남으면 표를 만들지 않는다
  assert.strictEqual(shapeTable({ title: 'T', cols: ['a', 'b'], rows: [['1', null], ['2', null]] }), null)
  assert.strictEqual(shapeTable(null), null)
  // 첨부 형태의 정상 결과(빈 칸 25%)는 표로 유지
  assert.strictEqual(buildDeepFlowTable(SECS).display, 'table')
  // PDF 계획에서도 display 가 전달된다
  const plan = PDF.buildPdfPlan([{ kind: 'table', table: shaped }])
  assert.ok(plan.every((p) => renderToStaticMarkup(p.node).includes('data-display="cards"')))
})

test('잘못된 묶음 방지: 연도만 같다고 다른 주제의 설명을 한 행에 묶지 않는다', () => {
  // 運路의 '다음 대운 준비' 는 시작 연도가 같은 대운 행에만 쓴다("2033~2042년"의 시작은 2033)
  assert.strictEqual(firstYear('2033~2042년'), 2033)
  assert.deepStrictEqual(buildDeepFlowTable(SECS).rows[2][2], { main: '매달 급여의 최소 20퍼센트 이상을 자동이체로 저축 계좌에 넣어두세요.', sub: '지금부터 준비할 일' })   // 대운 시작(2033) 전에 지금 실천하라는 뜻임을 표시
  const wrongRoute = sectionsOf(DEEP_SAMPLE.replace('📌 다음 대운 준비 (癸계巳사, 2033년 시작)', '📌 다음 대운 준비 (癸계巳사, 2038년 시작)'))
  assert.strictEqual(buildDeepFlowTable(wrongRoute).rows[2][2], null)
  // 연운 총평 소제목의 연도가 섹션 제목의 연도와 다르면 그 해의 행으로 쓰지 않는다
  const wrongYear = sectionsOf(DEEP_SAMPLE.replace('📌 2027년 총평', '📌 2031년 총평'))
  assert.ok(!buildDeepFlowTable(wrongYear).rows.some((r) => r[0].main === '2027년'))
  // 연도·접속어로 시작하는 번호 항목은 '선택의 종류'가 되지 않는다
  const odd = sectionsOf(['===🧭 종합 흐름 요약===', '📌 작은 기회 vs 큰 결정 기준', '1. 2027년이 되면 새 일을 시작해도 좋아요. 천천히 하세요.', '', '2. 작은 기회(새 모임)는 반갑게 받아들여도 좋아요.', '', '3. 큰 결정(이직)은 신중하게 보세요. 서두르지 마세요.', ''].join('\n'))
  const ot = buildDeepChoiceTable(odd)
  assert.deepStrictEqual(ot.rows.map((r) => r[0].main), ['작은 기회', '큰 결정'])
  // 같은 문장이 해볼 일과 신중 칸에 중복으로 들어가지 않는다
  buildDeepFlowTable(SECS).rows.forEach((r) => { if (r[2] && r[3]) assert.notStrictEqual(r[2], r[3]) })
})

test('자료가 부족한 결과: 가능한 표만 만들고 이유는 점검 목록으로 남긴다(임의로 채우지 않음)', () => {
  const sparse = SECS.filter((s) => /종합/.test(s.title))
  assert.strictEqual(buildDeepFlowTable(sparse), null)
  assert.strictEqual(buildDeepClosing(sparse), null)
  assert.deepStrictEqual(diagnoseDeepTables(sparse).map((d) => d.code), ['no-flow-source', 'no-dao'])
  assert.deepStrictEqual(diagnoseDeepTables([]).map((d) => d.code), ['no-summary', 'no-flow-source', 'no-dao'])
  const noDao = SECS.filter((s) => !/道/.test(s.title))
  assert.ok(buildDeepFlowTable(noDao) && buildDeepClosing(noDao))   // 道가 없어도 마무리는 運路 준비 항목으로만 만들고
  assert.deepStrictEqual(buildDeepChoiceTable(noDao).rows.map((r) => r[0].main), ["작은 기회", "큰 결정"])   // 보증 근거(道)가 없으면 그 행만 빠진다
  assert.strictEqual(buildDeepClosing(noDao).keyline, null)
})

// ── 심화 마무리 ──
test('마무리: 핵심 문장 한 줄 + 실천표(시점은 원문에 적힌 표현만, 자동 배정 없음)', () => {
  const c = buildDeepClosing(SECS)
  assert.strictEqual(c.title, '앞으로 기억할 나의 기준')
  assert.strictEqual(c.keyline, '2027년을 맞이하기 위해 지금 가장 중요한 한 가지는 자신의 영역을 먼저 채우는 연습이에요.')
  assert.deepStrictEqual(c.table.cols, ['실천 시점', '실천할 행동', '실천 방법'])
  assert.deepStrictEqual(c.table.rows.map((r) => [r[0].main, r[0].sub]), [['오늘부터', '매일 저녁'], ['매달', ''], ['지금부터', '']])   // 원문 표현: 매일 저녁 / 매달 / 지금부터
  assert.ok(!JSON.stringify(c.table.rows).includes('앞으로 3개월'))                                              // 원문에 없는 기한을 배정하지 않는다
  assert.ok(/풀이 문장에 적힌 표현만/.test(c.table.note))
  // 시점 표현이 없는 항목은 기한을 만들지 않고 '정해진 시점 없음'
  const noTime = buildDeepClosing(sectionsOf(['===道 · 지금===', '📌 지금 당장 시작해야 할 것', '1. 하루에 한 가지를 정리하는 연습을 해보세요. 마음이 가벼워져요.', ''].join('\n')))
  assert.strictEqual(noTime.table.rows[0][0].main, '정해진 시점 없음')
  const all = norm(DEEP_SAMPLE)
  c.table.rows.forEach((r) => r.slice(1).forEach((x) => { if (x) assert.ok(all.includes(norm(x)), x) }))
  // 같은 행동(급여 20퍼센트 저축)이 道 항목과 運路 항목에 모두 있어도 한 번만 나온다
  assert.strictEqual(c.table.rows.filter((r) => /20퍼센트/.test(r[1])).length, 1)
  // 道 섹션이 없으면 만들지 않는다 / 행동 항목이 없으면 핵심 문장만
  assert.strictEqual(buildDeepClosing(SECS.filter((s) => !/道/.test(s.title) && !/運路/.test(s.title))), null)
  const onlyKey = buildDeepClosing([{ title: '道 · 지금', content: '🔑 지금은 쉬어가는 것이 좋아요. 천천히 가요.' }])
  assert.strictEqual(onlyKey.keyline, '지금은 쉬어가는 것이 좋아요.')
  assert.strictEqual(onlyKey.table, null)
})

test('심화 PDF 항목 순서: 사주표 → 요약 → 풀이(종합 요약 바로 뒤에 표 두 개) → 마무리, 번호는 풀이만 센다', () => {
  const flow = buildDeepFlowTable(SECS), choice = buildDeepChoiceTable(SECS), closing = buildDeepClosing(SECS)
  const items = buildDeepPdfItems({ sajuData: { 사주: { 년주: '丙병子자', 월주: '丁정酉유', 일주: '庚경午오', 시주: '丙병子자' } }, moneySummary: null, sections: SECS, flowTable: flow, choiceTable: choice, closing })
  const kinds = items.map((i) => i.kind)
  assert.deepStrictEqual(kinds.slice(0, 4), ['saju', 'section', 'table', 'table'])
  assert.strictEqual(kinds[kinds.length - 1], 'closing')
  assert.deepStrictEqual(partsOf(items), SECS.map((_, i) => i + 1))
  // 표가 없으면(근거 부족) 풀이만 나온다
  const plain = buildDeepPdfItems({ sajuData: null, sections: SECS, flowTable: null, choiceTable: null, closing: null })
  assert.ok(!plain.some((i) => i.kind === 'table' || i.kind === 'closing' || i.kind === 'saju'))
})

test('심화 표 생성은 새 AI 호출·점수·확률을 쓰지 않는다(소스 점검)', () => {
  const src = readFileSync(here('./deepTables.js'), 'utf8').replace(/\/\/.*$/gm, '')
  assert.ok(!/fetch\(|API_URL|anthropic|Math\.random|확률|점수/.test(src))
  assert.ok(!/2027|2028|2032|2033/.test(src), '연도 하드코딩 없음')
})

// ── 표 컴포넌트 ──
test('표 컴포넌트: 머리글·칸 라벨(모바일 카드용)·빈 칸 표시·최대 4열', () => {
  const t = buildDeepFlowTable(SECS)
  const html = renderToStaticMarkup(h(UI.ReportTable, t))
  assert.ok(html.includes('<th scope="col">시기</th>') && html.includes('data-label="신중하게 볼 일"') && html.includes('rpt-td-empty'))
  assert.ok(html.includes('앞으로의 흐름 한눈에') && html.includes('cols-4') && html.includes('rpt-row-even'))
  assert.strictEqual(renderToStaticMarkup(h(UI.ReportTable, { cols: ['a'], rows: [] })), '')
  const cont = renderToStaticMarkup(h(UI.ReportTable, { ...t, rows: [t.rows[2]], cont: true, rowOffset: 2 }))
  assert.ok(cont.includes('앞으로의 흐름 한눈에 — 이어서') && !cont.includes('rpt-row-even'))
  const closing = renderToStaticMarkup(h(UI.ClosingBlock, { closing: buildDeepClosing(SECS) }))
  assert.ok(closing.includes('앞으로 기억할 나의 기준') && closing.includes('실천표') && closing.includes('rpt-callout'))
  assert.strictEqual(renderToStaticMarkup(h(UI.ClosingBlock, { closing: null })), '')
  for (const cols of [FLOW_COLS, CHOICE_COLS, CLOSING_COLS]) assert.ok(cols.length <= 4)
})

test('공통 사주표: 무료·전체·심화가 같은 컴포넌트·같은 구조를 쓴다', () => {
  const pillars = { 년주: '丙병子자', 월주: '丁정酉유', 일주: '庚경午오', 시주: '丙병子자' }
  const html = renderToStaticMarkup(h(TABLE.default, { pillars }))
  assert.ok(html.includes('saju-pillars') && html.includes('data-element-distribution') && html.includes('일간(나를 대표하는 글자)은 庚, 쇠 기운이에요.'))
  const order = ['시주', '일주', '월주', '년주'].map((k) => html.indexOf(`data-pillar="${k}"`))
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])))
  const app = readFileSync(here('./App.jsx'), 'utf8')
  assert.strictEqual(app.split('<SajuTable pillars={sajuData.사주} />').length - 1, 2)       // 비리포트 결과 / 심화 결과
  assert.ok(!app.includes('data-pdf-card="saju" className="rpt-card"'))                      // 둥근 카드형 사주표는 없다
  const report = readFileSync(here('./SajuReport.jsx'), 'utf8')
  assert.ok(report.includes('<SajuTable pillars={pillars} />'))
})

// ── 쪽 나누기 ──
const blk = (h, o = {}) => ({ h, topPad: 0, keep: false, sec: 's', group: null, cont: false, ...o })
const HERO = 28
test('쪽 나누기: 짧은 소제목 묶음(번호 항목 포함)은 한 쪽에 통째로 — 1번만 앞 쪽에 남지 않는다', () => {
  // 본문 높이 983. 앞 블록 720 + 짧은 묶음(제목 60 + 항목 3개 110 = 390, 40% 이하)은 남은 263에 안 들어가고, 비는 공간은 28% 이하 → 통째로 다음 쪽
  const blocks = [blk(720, { sec: 'a', group: 'a.0' }), blk(60, { keep: true, sec: 'b', group: 'b.0' }), blk(110, { sec: 'b', group: 'b.0' }), blk(110, { sec: 'b', group: 'b.0' }), blk(110, { sec: 'b', group: 'b.0' })]
  const pages = PDF.paginateBlocks(blocks, HERO)
  assert.strictEqual(pages.length, 2)
  assert.deepStrictEqual(pages[1].list.map((b) => b.idx), [1, 2, 3, 4])
  assert.strictEqual(pages[1].contLabel, null)
})
test('쪽 나누기: 통째로 넘기면 쪽 아래가 28% 넘게 비는 묶음은 항목 사이에서 나누고 맨 위에 "— 이어서"를 붙인다', () => {
  // 앞 블록 683 → 남은 300. 묶음(390)을 통째로 넘기면 300(30%)이 빈다 → 제목 + 항목 1~2개는 앞 쪽에, 나머지는 "나의 강점 — 이어서"
  const g = { sec: 'b', group: 'b.0', groupHead: '나의 강점' }
  const blocks = [blk(683, { sec: 'a', group: 'a.0' }), blk(60, { keep: true, ...g }), blk(110, g), blk(110, g), blk(110, g), blk(110, g), blk(110, g)]
  const pages = PDF.paginateBlocks(blocks, HERO)
  assert.strictEqual(pages.length, 2)
  assert.deepStrictEqual(pages[0].list.map((b) => b.idx), [0, 1, 2, 3])
  assert.deepStrictEqual(pages[1].list.map((b) => b.idx), [4, 5, 6])      // 이어지는 쪽에는 항목이 둘 이상 남는다(짧은 문단 하나만 넘어가지 않음)
  assert.strictEqual(pages[1].contLabel, '나의 강점')                       // 제목 없이 시작하지 않는다
  assert.strictEqual(pages[1].used, 42 + 330)                               // '이어서' 줄 높이를 포함해 계산
})
test('쪽 나누기: 새 소제목으로 시작하는 쪽에는 "이어서"를 붙이지 않는다 / 제목만 쪽 끝에 남지 않는다', () => {
  const blocks = [blk(800, { sec: 'a', group: 'a.0' }), blk(60, { keep: true, sec: 'a', group: 'a.1', groupHead: '둘째' }), blk(150, { sec: 'a', group: 'a.1', groupHead: '둘째' })]
  const pages = PDF.paginateBlocks(blocks, HERO)
  assert.strictEqual(pages.length, 2)
  pages.forEach((p) => assert.ok(!p.list[p.list.length - 1].keep))
  assert.strictEqual(pages[1].list[0].keep, true)
  assert.strictEqual(pages[1].contLabel, null)
})
test('쪽 나누기: 표는 행 단위로 이어지고, 이어지는 행이 쪽 맨 위에 오면 제목·머리글 높이를 더해 다시 붙인다', () => {
  const rows = [0, 1, 2, 3].map((i) => blk(300, { sec: 't', group: 't.t', tcont: i > 0 }))
  const pages = PDF.paginateBlocks([blk(400, { sec: 'x', group: 'x.0' }), ...rows.map((r) => ({ ...r, sec: 't' }))], HERO)
  assert.ok(pages.length >= 2)
  const second = pages[1].list[0]
  assert.strictEqual(second.showHead, true)
  assert.ok(pages[1].used >= 300 + 90)                                      // 머리글 90px 포함
  assert.strictEqual(pages[0].list[0].showHead, false)
  assert.strictEqual(pages[1].contLabel, null)                              // 표는 '이어서' 줄 대신 표 제목으로 이어짐
})
test('쪽 나누기: 모든 블록이 정확히 한 번씩, 순서대로 배치된다(빈 쪽·누락 없음)', () => {
  const blocks = Array.from({ length: 60 }, (_, i) => blk(50 + (i * 37) % 160, { sec: 's' + Math.floor(i / 5), group: 'g' + Math.floor(i / 3), keep: i % 7 === 0, groupHead: 'h' }))
  const pages = PDF.paginateBlocks(blocks, 200)
  const idx = pages.flatMap((p) => p.list.map((b) => b.idx))
  assert.deepStrictEqual(idx, blocks.map((_, i) => i))
  assert.ok(pages.every((p) => p.list.length > 0))
  assert.ok(pages.every((p, i) => p.list.length === 1 || p.used <= p.limit + 0.5))
})

test('월별 운세: 1~6월 / 7~12월로 나누고 양쪽에 연도를 표시한다(연도는 첫 줄에서만 읽음)', () => {
  const items = Array.from({ length: 12 }, (_, i) => ({ lead: (i === 0 ? '2027년 ' : '') + (i + 1) + '월:', text: '내용' + (i + 1) }))
  const g = PDF.splitMonthGroups(items)
  assert.deepStrictEqual(g.map((x) => x.title), ['2027년 1~6월', '2027년 7~12월'])
  assert.deepStrictEqual(g.map((x) => x.items.length), [6, 6])
  assert.strictEqual(g[0].items[0].lead, '1월:')
  // 연도가 없으면 연도 없이, 월이 읽히지 않으면 나누지 않는다(null)
  assert.deepStrictEqual(PDF.splitMonthGroups(items.map((x, i) => ({ ...x, lead: (i + 1) + '월:' }))).map((x) => x.title), ['1~6월', '7~12월'])
  assert.strictEqual(PDF.splitMonthGroups([{ lead: '봄:', text: 'a' }, { lead: '여름:', text: 'b' }]), null)
  assert.deepStrictEqual(PDF.splitMonthGroups(items.slice(0, 4)).map((x) => x.title), ['2027년 1~6월'])
})

test('PDF 계획: 사주표·표·마무리는 문서 안에서 직접 그려지고(이미지 캡처 아님), 소제목 묶음에 이름이 붙는다', () => {
  const plan = PDF.buildPdfPlan([
    { kind: 'saju', pillars: { 년주: '丙병子자', 월주: '丁정酉유', 일주: '庚경午오', 시주: '丙병子자' } },
    { kind: 'section', title: '나의 강점', part: 3, content: '📌 첫 소제목\n문단입니다.\n\n📌 둘째 소제목\n1. 하나\n\n2. 둘' },
    { kind: 'table', table: { title: 'T', cols: ['a', 'b'], rows: [['1', '2'], ['3', '4'], ['5', '6']], note: '메모' } },
  ])
  assert.ok(renderToStaticMarkup(h('div', null, ...plan.map((p) => p.node))).includes('saju-pillars'))
  const heads = plan.filter((p) => p.meta.keep).map((p) => p.meta.groupHead)
  assert.deepStrictEqual(heads, ['나의 강점', '첫 소제목', '둘째 소제목'])
  assert.strictEqual(plan.filter((p) => p.meta.tcont).length, 2)         // 3행 표는 행 단위(둘째·셋째 행은 이어지는 행)
  const tableHtml = plan.filter((p) => /rpt-tchunk/.test(renderToStaticMarkup(p.node))).map((p) => renderToStaticMarkup(p.node))
  assert.strictEqual(tableHtml.length, 3)
  assert.ok(tableHtml[2].includes('메모') && !tableHtml[0].includes('메모'))
})

test('행 끝의 빈 칸이 둘 이상 이어지면 앞 칸을 넓혀 합친다(— 나란히 반복 방지, 내용 추가 없음)', () => {
  const t = buildDeepFlowTable(SECS)
  const html = renderToStaticMarkup(h(UI.ReportTable, t))
  assert.ok(html.includes('colSpan="3"') || html.includes('colspan="3"'))               // 그 다음 대운 행: 흐름 칸이 3칸을 차지
  assert.strictEqual((html.match(/rpt-td-empty/g) || []).length, 1)                       // 남는 빈 칸은 '다음 대운 · 신중' 하나뿐
  const one = renderToStaticMarkup(h(UI.ReportTable, { cols: ['a', 'b', 'c'], rows: [['1', '2', null]] }))
  assert.ok(!/colspan/i.test(one) && one.includes('rpt-td-empty'))                       // 빈 칸이 하나면 그대로
})

// ── 이번 보완: 마지막 쪽 균형 · 표 한 쪽 유지 · 짧은 이어짐 방지 ──
const sectionBlocks = (head, ...paras) => [blk(110, { keep: true, sec: head, group: head + '.0', groupHead: head }), ...paras.map((h) => blk(h, { sec: head, group: head + '.0', groupHead: head }))]
test('마지막 쪽 균형: 짧은 문단 하나만 마지막 쪽에 남지 않도록 앞 쪽 끝의 섹션 하나를 함께 옮긴다(쪽 수는 강제하지 않음)', () => {
  const blocks = [blk(528, { sec: 'U', group: 'U.0' }), ...sectionBlocks('P1', 45, 77), ...sectionBlocks('P2', 108, 77), ...sectionBlocks('P3', 108, 108), ...sectionBlocks('P4', 108, 108), ...sectionBlocks('P5', 108)]
  const pages = PDF.paginateBlocks(blocks, HERO)
  const last = pages[pages.length - 1]
  assert.ok(last.used >= 0.35 * 983, '마지막 쪽이 35% 이상 차 있다')
  assert.ok(last.list.length >= 5)                                                  // P4(3블록) + P5(2블록)
  assert.strictEqual(last.list[0].sec, 'P4')
  assert.ok(pages.every((p) => p.used <= p.limit + 0.5))
  // 균형을 맞춰도 직전 쪽이 40% 아래로 비면 옮기지 않는다
  const few = PDF.paginateBlocks([blk(900, { sec: 'A', group: 'A.0' }), ...sectionBlocks('Z', 108)], HERO)
  assert.deepStrictEqual(few.map((p) => p.list.map((b) => b.idx)), [[0], [1, 2]])
})

test('표는 한 쪽보다 길지 않으면 한 쪽에 모은다(공백이 커도 행 사이에서 나누지 않는다)', () => {
  const rows = [0, 1, 2, 3].map((i) => blk(150, { sec: 'T', group: 'T.t', tcont: i > 0, keepAll: true }))
  const pages = PDF.paginateBlocks([blk(600, { sec: 'X', group: 'X.0' }), ...rows], HERO)
  assert.deepStrictEqual(pages.map((p) => p.list.map((b) => b.idx)), [[0], [1, 2, 3, 4]])
  assert.strictEqual(pages[1].list[0].showHead, false)                                  // 표 전체가 새 쪽에서 시작하므로 머리글은 처음 것만
  // keepAll 이 없으면 같은 상황에서 행 사이에서 나뉜다(공백 28% 초과 → 항목 사이에서 나눔)
  const split = PDF.paginateBlocks([blk(600, { sec: 'X', group: 'X.0' }), ...rows.map((r) => ({ ...r, keepAll: false }))], HERO)
  assert.ok(split.length === 2 && split[0].list.length > 1)
})

test('짧은 이어짐 방지: 소제목 묶음의 마지막 짧은 문단 하나만 다음 쪽 맨 위에 넘어가지 않는다(묶음 전체가 함께 이동)', () => {
  const pages = PDF.paginateBlocks([blk(690, { sec: 'A', group: 'A.0' }), ...sectionBlocks('B', 108, 108)], HERO)
  assert.deepStrictEqual(pages.map((p) => p.list.map((b) => b.idx)), [[0], [1, 2, 3]])
  assert.strictEqual(pages[1].contLabel, null)                                          // '— 이어서' 로 시작하지 않고 제목부터 시작
})

test('PDF 항목 순서: 세 상품 모두 사주표가 표지 바로 아래에 오고 PART 번호는 그대로 이어진다', () => {
  const core = ['가', '나', '다'].map((title) => ({ title, content: '내용' }))
  const sajuData = { 사주: { 년주: '辛신未미', 월주: '丙병申신', 일주: '乙을丑축', 시주: '庚경辰진' } }
  const free = buildResultPdfItems({ useSajuReport: true, sajuSummary: { kind: 'saju' }, coreSections: core, sajuData })
  assert.deepStrictEqual(free.map((i) => i.kind), ['saju', 'summary', 'section', 'section', 'section'])
  assert.deepStrictEqual(partsOf(free), [1, 2, 3])
  const full = buildResultPdfItems({ useSajuReport: true, sajuSummary: { kind: 'saju' }, coreSections: core, paidSections: [{ title: '財', content: 'x' }], moneySummary: { kind: 'money' }, sajuData })
  assert.deepStrictEqual(full.map((i) => i.kind).slice(0, 2), ['saju', 'summary'])
  assert.deepStrictEqual(partsOf(full), [1, 2, 3, 4])
})
