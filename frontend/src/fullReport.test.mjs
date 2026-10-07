import test from 'node:test'
import assert from 'node:assert'
import { mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { overviewFor, monthMap, dashboardKeywords } from './fullReport.js'
import { parseContentBlocks } from './contentBlocks.js'
import { buildResultPdfItems } from './pdfItems.js'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const outDir = here('../node_modules/.cache/full-report-test')
mkdirSync(outDir, { recursive: true })
const bundle = async (entry, out) => {
  buildSync({ entryPoints: [here(entry)], bundle: true, packages: 'external', format: 'esm', jsx: 'automatic', outfile: join(outDir, out), logLevel: 'silent' })
  return import(pathToFileURL(join(outDir, out)).href)
}
const FR = await bundle('./FullReport.jsx', 'FullReport.mjs')
const PDF = await bundle('./pdfExport.jsx', 'pdfExport.mjs')
const REPORT = (await bundle('./SajuReport.jsx', 'SajuReport.mjs')).default

const MONEY = `📌 인생 단계별 돈 흐름
1. 젊은 시절(20~30대) — 들어오는 돈보다 나가는 돈이 눈에 띄는 시기예요. 배우는 데 쓰는 돈이 많아요.
2. 중년(40~50대) — 돈이 가장 크게 움직이는 시기예요. 이유는 일의 기반이 단단해지기 때문이에요.
3. 말년(60대 이후) — 노후는 준비한 만큼 안정적이에요. 꾸준히 모으면 괜찮아요.

⚠️ 이 사주의 돈 새는 패턴
보증이나 지인 투자 부탁은 거절하는 편이 좋아요. 사람에게 약한 부분이 돈으로 나가기 쉬워요.

📌 돈이 가장 잘 모이는 조건
고정 수입을 먼저 만든 뒤 나눠 쓰면 잘 모여요. 순서가 중요해요.

🔑 마무리: 천천히 쌓는 힘이 있는 사주예요.`
const JOB = `공부·배움은 혼자 정리하는 방식이 잘 맞아요.

📌 이 사주에 맞는 직업
1. 품질관리·회계검토·계약관리
기준을 적용해 오류를 찾는 힘이 있어요. 그래서 명확한 기준이 있는 일에 맞아요.
같은 분야에서도 검토 역할이 더 맞아요.

2. 교육기획·상담
사람의 말을 오래 듣는 편이에요. 그래서 상담과 교육 일에 힘을 쓰기 쉬워요.

3. 운영관리·일정조율
여러 일을 순서대로 맞추는 감각이 있어요.

📌 잘 맞는 업무 환경
역할과 기준이 분명하고 혼자 집중할 시간이 있는 환경이에요.

📌 덜 맞는 업무 환경
기준이 자주 바뀌고 즉흥적인 요청이 많은 환경이에요.`
const PEOPLE = `📌 진짜 내 편이 되어줄 사람
차분하고 약속을 지키는 사람이에요. 말수는 적어도 오래 곁에 남아요.

⚠️ 독이 되는 사람 유형
부탁을 계속 늘려 가는 사람은 거리를 두는 편이 좋아요.

📌 인간관계에서 반복하는 실수 패턴
거절을 미루다 관계가 무거워지는 패턴이에요.`
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i === 0 ? '2027년 ' : ''}${i + 1}월: ${['정리가 필요한 달이에요', '새 인연이 보여요', '쉬어가는 흐름이에요'][i % 3]}, 무리하지 마세요.`).join('\n')
const LUCKY = `색깔: 초록\n마스코트: 거북이\n방향: 동쪽\n숫자: 3\n아이템: 나무 필통`
const CLOSE = `📌 이 사주가 잘 풀리는 조건
1. 약속은 적게, 지키는 것에 집중하세요.
2. 쉬는 시간을 먼저 정하세요.

⚠️ 이 사주가 망하는 패턴
부탁을 거절하지 못해 일이 쌓이는 패턴이에요.

📌 지금 당장 실천할 행동 조언
1. 매일 저녁 10분 내일 할 일을 적으세요.
2. 부탁은 하루 뒤에 답하세요.

🔑 마무리: 당신은 천천히 가도 멀리 가는 사람이에요.`

test('財運: 인생 단계 타임라인 3칸 + 모이는 조건/새는 패턴 비교(원문 문장만)', () => {
  const ov = overviewFor('財運 · 인생 재물 전체', MONEY)
  assert.strictEqual(ov.timeline.items.length, 3)
  assert.deepStrictEqual(ov.timeline.items.map((s) => s.when), ['젊은 시절(20~30대)', '중년(40~50대)', '말년(60대 이후)'])
  assert.ok(ov.compare.left.text.includes('고정 수입') && ov.compare.right.text.includes('보증'))
  assert.ok(MONEY.includes(ov.compare.right.text) && ov.timeline.items.every((s) => MONEY.includes(s.text)))
})

test('職: 추천 직업 1/2/3 카드 + 환경 비교', () => {
  const ov = overviewFor('職 · 직업과 커리어', JOB)
  assert.strictEqual(ov.jobs.length, 3)
  assert.deepStrictEqual(ov.jobs.map((j) => j.n), [1, 2, 3])
  assert.strictEqual(ov.jobs[0].title, '품질관리·회계검토·계약관리')
  assert.ok(ov.jobs[0].why.startsWith('기준을 적용해'))
  assert.ok(ov.compare.left.text.includes('혼자 집중') && ov.compare.right.text.includes('자주 바뀌고'))
})

test('緣: 내 편 vs 독이 되는 사람', () => {
  const ov = overviewFor('緣 · 사람과 인연', PEOPLE)
  assert.ok(ov.compare.left.text.includes('약속을 지키는') && ov.compare.right.text.includes('부탁을 계속'))
})

test('月運: 12개월이 모두 읽힐 때만 YEAR MAP, 각 달의 첫 구절만', () => {
  const ov = overviewFor('月運 · 월별 운세', MONTHS)
  assert.strictEqual(ov.map.cells.length, 12)
  assert.strictEqual(ov.map.year, '2027')
  assert.strictEqual(ov.map.cells[0].phrase, '정리가 필요한 달이에요')
  const eleven = MONTHS.split('\n').slice(0, 11).join('\n')
  assert.strictEqual(overviewFor('月運 · 월별 운세', eleven), null)
  assert.strictEqual(monthMap([{ lead: '1월:', text: 'a' }]), null)
})

test('幸: 5칸 태그, 모든 줄이 태그가 되면 본문 대신 태그만', () => {
  const ov = overviewFor('幸 · 나를 돕는 것들', LUCKY)
  assert.strictEqual(ov.tags.length, 5)
  assert.ok(ov.covers)
  const html = renderToStaticMarkup(h(FR.FullSection, { title: '幸 · 나를 돕는 것들', content: LUCKY, part: 6 }))
  assert.ok(html.includes('data-fa="lucky"') && html.includes('나무 필통') && !html.includes('rpt-p'))
})

test('道: 결론 페이지가 원문 모든 줄을 담을 때만 본문을 대신한다', () => {
  const ov = overviewFor('道 · 이 사주로 잘 사는 법', CLOSE)
  assert.ok(ov.conclusion)
  const html = renderToStaticMarkup(h(FR.FullSection, { title: '道 · 이 사주로 잘 사는 법', content: CLOSE, part: 7 }))
  for (const line of CLOSE.split('\n').filter(Boolean)) {
    const t = line.replace(/^[📌⚠️🔑]+\s*/u, '').replace(/^마무리:\s*/, '').replace(/^\d+\.\s*/, '')
    assert.ok(html.includes(t.replace(/&/g, '&amp;')), '빠진 문장: ' + line)
  }
  assert.ok(html.includes('앞으로 기억할 나의 기준') && html.includes('data-fa="final"'))
  // 원문에 결론 구조 밖의 줄이 있으면 결론 페이지로 대체하지 않고 본문을 그대로 쓴다
  const odd = CLOSE.replace('🔑 마무리', '추가로 하는 말이에요.\n\n🔑 마무리')
  const html2 = renderToStaticMarkup(h(FR.FullSection, { title: '道 · 이 사주로 잘 사는 법', content: odd, part: 7 }))
  assert.ok(html2.includes('추가로 하는 말이에요.'))
})

test('본문은 항상 그대로: 한눈에 보는 카드가 있어도 원문 문장이 모두 나온다(財運·職·緣)', () => {
  for (const [title, text] of [['財運 · 인생 재물 전체', MONEY], ['職 · 직업과 커리어', JOB], ['緣 · 사람과 인연', PEOPLE]]) {
    const html = renderToStaticMarkup(h(FR.FullSection, { title, content: text, part: 6 }))
    assert.ok(html.includes('class="fa-unit"'), title + ' 카드')
    for (const b of parseContentBlocks(text)) {
      const lines = b.type === 'compare' ? [...b.left.items, ...b.right.items].map((x) => x.text) : b.type === 'p' || b.type === 'li' ? [b.text] : []
      for (const t of lines) assert.ok(html.includes(t), title + ' 빠진 문장: ' + t)
    }
  }
})

test('해당 없는 섹션·읽히지 않는 내용은 카드 없이 기존 본문만', () => {
  assert.strictEqual(overviewFor('알 수 없는 제목', '그냥 문단이에요.'), null)
  const html = renderToStaticMarkup(h(FR.FullSection, { title: '財運 · 인생 재물 전체', content: '그냥 한 문단이에요.', part: 6 }))
  assert.ok(!html.includes('fa-unit') && html.includes('그냥 한 문단이에요.'))
})

test('첫 페이지: 키워드는 계산값에서만, 점수·퍼센트 표현 없음', () => {
  const pillars = { 년주: '辛신未미', 월주: '丙병申신', 일주: '乙을丑축', 시주: '庚경辰진' }
  const kw = dashboardKeywords(pillars, { name: '풀밭 위의 나무' })
  assert.ok(kw.length >= 2 && kw.length <= 3 && kw[0] === '풀밭 위의 나무')
  assert.ok(kw.every((k) => !/\d+\s*(점|%)/.test(k)))
})

test('웹: 무료 화면은 그대로, full 일 때만 Dashboard·FullSummary', () => {
  const props = { name: '하늘', dateLine: '', pillars: { 년주: '辛신未미', 월주: '丙병申신', 일주: '乙을丑축', 시주: '庚경辰진' }, core: { sentence: '핵심 문장이에요.', detail: '' }, why: '이유예요.', strength: '강점이에요.', habit: '습관이에요.', tip: '', actions: [], typeInfo: { name: '풀밭 위의 나무', desc: '설명' }, summary: { kind: 'saju', title: '한눈에 보기', headline: '핵심 문장이에요.', compare: { left: { label: '강점', text: '강점이에요.' }, right: { label: '주의할 점', text: '습관이에요.' } }, action: null, actionList: ['하나', '둘', '셋'], actionLabel: '지금 당장 할 일, 딱 3가지' } }
  const free = renderToStaticMarkup(h(REPORT, props))
  assert.ok(!free.includes('fa-dash') && !free.includes('fa-summary') && free.includes('data-section="saju"'))
  const full = renderToStaticMarkup(h(REPORT, { ...props, full: true }))
  assert.ok(full.includes('data-fa-dashboard') && full.includes('fa-keycard') && full.includes('fa-act-n'))
  assert.ok(full.indexOf('data-fa-dashboard') < full.indexOf('fa-summary') && full.indexOf('fa-summary') < full.indexOf('data-section="core"'))
  assert.strictEqual((full.match(/data-pillar="/g) || []).length, 4, '사주표는 한 번만')
})

test('PDF: 전체 분석은 카드를 블록 단위(keepAll)로 계획에 넣고, 무료는 변하지 않는다', () => {
  const paid = [{ title: '職 · 직업과 커리어', content: JOB }, { title: '月運 · 월별 운세', content: MONTHS }, { title: '道 · 이 사주로 잘 사는 법', content: CLOSE }]
  const pillars = { 년주: '辛신未미', 월주: '丙병申신', 일주: '乙을丑축', 시주: '庚경辰진' }
  const sajuData = { 사주: pillars }
  const items = buildResultPdfItems({ full: true, useSajuReport: true, sajuSummary: { kind: 'saju', title: '한눈에 보기', headline: '문장.', compare: null, actionList: ['가', '나', '다'], actionLabel: '지금 당장 할 일, 딱 3가지' }, coreSections: [{ title: '나의 핵심 성향', content: '문장.' }], paidSections: paid, sajuData, typeInfo: { name: '나무', desc: '설명' } })
  assert.ok(items.find((x) => x.kind === 'saju').full && items.find((x) => x.kind === 'summary' && x.full))
  const plan = PDF.buildPdfPlan(items)
  const units = plan.filter((p) => String(p.meta.group).endsWith('.o'))
  assert.ok(units.length >= 6, '카드 단위 블록 ' + units.length)
  const html = plan.map((p) => renderToStaticMarkup(p.node)).join('')
  assert.ok(html.includes('data-fa="month-map"') && html.includes('data-fa="job"') && html.includes('data-fa="final"'))
  assert.ok(!html.includes('id="share-card"'), 'PDF 안에 중복 id 없음')
  // 월별 원문(타임라인)은 카드와 함께 그대로 남는다
  assert.ok(html.includes('rpt-tl-text'))
  const free = buildResultPdfItems({ useSajuReport: true, coreSections: [{ title: '나의 핵심 성향', content: '문장.' }], paidSections: [], sajuData })
  assert.ok(!JSON.stringify(free).includes('"full"'))
})

test('깨진·불완전한 AI 응답에서도 원문이 하나도 빠지지 않고, 예외도 없다', () => {
  const cases = [
    ['財運 · 인생 재물 전체', '1. 젊은 시절 — 한 줄만 있어요.\n\n⚠️ 이 사주의 돈 새는 패턴\n한 문장이에요.'],
    ['職 · 직업과 커리어', '📌 이 사주에 맞는 직업\n1. 하나만 있는 직업\n설명이에요.'],
    ['職 · 직업과 커리어', '제목 없이 문단만 있어요.\n\n두 번째 문단이에요.'],
    ['緣 · 사람과 인연', '📌 진짜 내 편이 되어줄 사람\n설명만 있고 상대 항목이 없어요.'],
    ['月運 · 월별 운세', '2027년 1월: 첫 달이에요.\n2월: 둘째 달이에요.\n3월: 셋째 달이에요.'],
    ['月運 · 월별 운세', MONTHS.split('\n').map((l, i) => (i === 4 ? '5월: ' : l)).join('\n')],
    ['幸 · 나를 돕는 것들', '색깔: 초록\n마스코트: 거북이\n추가 설명 문장이에요.'],
    ['道 · 이 사주로 잘 사는 법', '📌 이 사주가 잘 풀리는 조건\n1. 하나예요.\n\n마지막 말은 구조 밖의 문장이에요.'],
    ['富 · 투자와 부동산', '🔑\n'],
    ['財運 · 인생 재물 전체', ''],
  ]
  for (const [title, text] of cases) {
    const html = renderToStaticMarkup(h(FR.FullSection, { title, content: text, part: 6 }))
    const { replaceBody } = FR.unitsForSection(title, text)
    if (replaceBody) continue
    const flat = (b) => (b.type === 'compare' ? [...b.left.items, ...b.right.items] : b.type === 'callout' ? b.items : b.type === 'timeline' ? b.items.map((x) => ({ text: x.text })) : b.type === 'steps' ? b.items : [b])
    for (const b of parseContentBlocks(text)) for (const x of flat(b)) {
      const t = (x.text || '').replace(/&/g, '&amp;')
      if (t.trim() && b.type !== 'h3') assert.ok(html.includes(t), title + ' 빠진 문장: ' + x.text)
    }
  }
})
