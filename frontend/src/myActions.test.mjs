import test from 'node:test'
import assert from 'node:assert'
import { readFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseMyFree, parseMyActions } from './relations.js'
import { summarizeSaju } from './reportSummary.js'
import { buildResultPdfItems } from './pdfItems.js'

const require = createRequire(import.meta.url)
const BACK = require('../../backend/freeActions.js')
const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const outDir = here('../node_modules/.cache/my-actions-test')
mkdirSync(outDir, { recursive: true })
const bundle = async (entry, out) => {
  buildSync({ entryPoints: [here(entry)], bundle: true, packages: 'external', format: 'esm', jsx: 'automatic', outfile: join(outDir, out), logLevel: 'silent' })
  return import(pathToFileURL(join(outDir, out)).href)
}
const UI = await bundle('./reportBlocks.jsx', 'reportBlocks.mjs')
const REPORT = (await bundle('./SajuReport.jsx', 'SajuReport.mjs')).default
const PDF = await bundle('./pdfExport.jsx', 'pdfExport.mjs')

const ACTIONS = `1. 답장은 한 박자 늦추기
부탁 메시지를 받으면 바로 답하지 말고 먼저 오늘 일정표를 열어 보세요. 그다음 아래 문장을 보내고, 저녁에 수락할지 정하세요.
💬 "일정 확인해 보고 오늘 저녁까지 답드릴게요."

2. 거절은 대안 하나와 함께
어렵다고 정한 부탁은 거절만 보내지 말고 가능한 때를 하나 붙이세요. 이번 주에 한 번만 해봐도 충분해요.
💬 "이번 주는 어려워요. 다음 주라면 가능해요."

3. 겹치는 약속 하나 먼저 정리하기
조율을 잘하는 감각을 내 일에도 쓰세요. 이번 주 약속 중 시간이 겹치는 것 하나를 골라, 상대가 묻기 전에 순서를 먼저 제안해 보세요.`
const NEW_TEXT = `===핵심 한 문장===
주변의 기준을 민감하게 받아들이는 경향이 있어요.
부탁을 받을 때 이런 모습이 나타날 수 있어요.

===이런 성향이 나오는 이유===
나를 누르는 기운이 3곳에 있어요.

===나의 강점===
상대가 불편해하는 것을 먼저 알아차리는 힘이 있어요.

===주의할 습관===
여러 사람의 필요가 한꺼번에 보일 때 거절 기준이 흐려질 수 있어요.

===지금 당장 할 일, 딱 3가지===
${ACTIONS}
`
const OLD_TEXT = NEW_TEXT.replace(/===지금 당장 할 일, 딱 3가지===[\s\S]*$/, '===바로 실천할 팁===\n부탁을 받으면 바로 답하기 전에 달력부터 확인해 보세요.')

test('새 결과: 행동 3개(제목·방법·💬 문장)로 읽히고, 문장이 없는 항목은 빈 문자열', () => {
  const r = parseMyFree(NEW_TEXT)
  assert.strictEqual(r.actions.length, 3)
  assert.deepStrictEqual(r.actions.map(a => a.title), ['답장은 한 박자 늦추기', '거절은 대안 하나와 함께', '겹치는 약속 하나 먼저 정리하기'])
  assert.strictEqual(r.actions[0].say, '일정 확인해 보고 오늘 저녁까지 답드릴게요.')
  assert.strictEqual(r.actions[2].say, '')
  assert.ok(r.actions[1].how.includes('거절만 보내지 말고'))
  assert.strictEqual(r.tip, '')
  assert.ok(r.sentence && r.why && r.strength && r.habit)
})

test('예전 결과(바로 실천할 팁)도 그대로 읽힌다: tip 은 남고 actions 는 비어 있다', () => {
  const r = parseMyFree(OLD_TEXT)
  assert.deepStrictEqual(r.actions, [])
  assert.ok(r.tip.startsWith('부탁을 받으면'))
  assert.ok(r.sentence && r.habit)
})

test('3개가 아니거나 번호가 어긋나면 일부만 보이지 않고 통째로 숨긴다', () => {
  assert.deepStrictEqual(parseMyActions('1. 하나\n방법을 길게 적어요 가나다라마바사.\n\n2. 둘\n방법을 길게 적어요 가나다라마바사.'), [])
  assert.deepStrictEqual(parseMyActions(''), [])
  assert.deepStrictEqual(parseMyActions(undefined), [])
  assert.strictEqual(parseMyActions('① 가\n나나나\n② 다\n라라라\n③ 마\n바바바').length, 3)
})

test('서버(freeActions.js)와 화면 파서가 같은 입력에서 같은 결과를 낸다', () => {
  const pick = (a) => a.map(({ n, title, how, say }) => ({ n, title, how, say }))
  const server = BACK.parseActions(ACTIONS)
  assert.deepStrictEqual(parseMyActions(ACTIONS), pick(server))
  const formatted = BACK.formatActions(server)
  assert.deepStrictEqual(parseMyActions(formatted), pick(server))
  // 검수용 근거 줄이 섞여 있어도 화면 파서는 무시한다
  const withBasis = formatted.split('\n').flatMap((l) => (/^\d\. /.test(l) ? [l, '[근거: 주의할 습관 — "구절"]'] : [l])).join('\n')
  assert.ok(withBasis.includes('[근거:'))
  assert.deepStrictEqual(parseMyActions(withBasis), pick(server))
})

test('한눈에 보기: 새 결과는 행동 제목 3개만, 예전 결과는 팁 첫 문장', () => {
  const s = summarizeSaju(parseMyFree(NEW_TEXT))
  assert.deepStrictEqual(s.actionList, ['답장은 한 박자 늦추기', '거절은 대안 하나와 함께', '겹치는 약속 하나 먼저 정리하기'])
  assert.strictEqual(s.action, null)
  assert.strictEqual(s.actionLabel, '지금 당장 할 일, 딱 3가지')
  const html = renderToStaticMarkup(h(UI.ReportSummary, { data: s }))
  assert.ok(html.includes('data-summary-actions') && html.includes('<ol') && html.includes('답장은 한 박자 늦추기'))
  assert.ok(!html.includes('일정 확인해 보고'), '요약에는 방법·문장이 나오지 않는다')
  const old = summarizeSaju(parseMyFree(OLD_TEXT))
  assert.strictEqual(old.actionList, null)
  assert.strictEqual(old.actionLabel, '지금 해볼 행동')
  assert.ok(old.action.startsWith('부탁을 받으면'))
})

const props = (text) => {
  const r = parseMyFree(text)
  return { name: '하늘', dateLine: '', pillars: { 년주: '辛신未미', 월주: '丙병申신', 일주: '乙을丑축', 시주: '庚경辰진' }, core: { sentence: r.sentence, detail: r.detail }, why: r.why, strength: r.strength, habit: r.habit, tip: r.tip, actions: r.actions, summary: summarizeSaju(r) }
}

test('본문: 마지막에 "지금 당장 할 일, 딱 3가지" 상자(번호·제목·방법·그대로 쓸 말)가 나오고 옛 팁 상자는 나오지 않는다', () => {
  const html = renderToStaticMarkup(h(REPORT, props(NEW_TEXT)))
  assert.ok(html.includes('data-section="actions"') && !html.includes('data-section="tip"') && !html.includes('바로 실천할 팁'))
  assert.strictEqual((html.match(/data-action="/g) || []).length, 3)
  assert.ok(html.includes('일정 확인해 보고 오늘 저녁까지 답드릴게요.') && html.includes('이번 주는 어려워요. 다음 주라면 가능해요.'))
  assert.ok(html.includes('>PART 5<'), '핵심 성향·이유·강점·습관 다음 PART 5')
  // 한눈에 보기(제목)가 본문 앞에, 본문 마지막에 방법이 있다
  assert.ok(html.indexOf('data-summary-actions') < html.indexOf('data-section="actions"'))
})

test('본문: 예전 결과는 예전 팁 상자 그대로', () => {
  const html = renderToStaticMarkup(h(REPORT, props(OLD_TEXT)))
  assert.ok(html.includes('data-section="tip"') && html.includes('바로 실천할 팁') && !html.includes('data-section="actions"'))
})

test('PDF: 화면과 같은 PART·같은 컴포넌트로 행동 3개가 항목별 블록으로 들어간다', () => {
  const r = parseMyFree(NEW_TEXT)
  const core = [
    { title: '나의 핵심 성향', content: r.sentence },
    { title: '나의 강점', content: r.strength },
    { title: '주의할 습관', content: r.habit },
    { title: '지금 당장 할 일, 딱 3가지', actions: r.actions, content: '' },
  ]
  const items = buildResultPdfItems({ useSajuReport: true, coreSections: core, paidSections: [] })
  const a = items.find(x => x.kind === 'actions')
  assert.strictEqual(a.part, 4)
  assert.strictEqual(a.actions.length, 3)
  const plan = PDF.buildPdfPlan(items)
  const html = plan.map(p => renderToStaticMarkup(p.node)).join('')
  assert.strictEqual((html.match(/data-action="/g) || []).length, 3)
  assert.ok(html.includes('지금 당장 할 일, 딱 3가지') && html.includes('일정 확인해 보고 오늘 저녁까지 답드릴게요.'))
})

test('연결: 홈 카드 문구와 App 의 표시·PDF 연결', () => {
  const app = readFileSync(here('./App.jsx'), 'utf8')
  assert.ok(app.includes('지금 당장 할 일 3가지') && !app.includes('오늘 해볼 팁 1개'))
  assert.ok(app.includes('actions={myFree.actions}') && app.includes("title: '지금 당장 할 일, 딱 3가지', actions: myFree.actions"))
})

test('안전망: 행동 3가지를 만들지 못했으면(actions_failed) 섹션을 숨기지 않고 "다시 만들기"를 보여 준다', () => {
  const p = props(OLD_TEXT.replace(/===바로 실천할 팁===[sS]*$/, ''))
  const failed = renderToStaticMarkup(h(REPORT, { ...p, actionsFailed: true, onRetryActions: () => {} }))
  assert.ok(failed.includes('data-section="actions-failed"') && failed.includes('지금 당장 할 일, 딱 3가지') && failed.includes('다시 만들기') && failed.includes('>PART 5<'))
  const normal = renderToStaticMarkup(h(REPORT, props(NEW_TEXT)))
  assert.ok(!normal.includes('actions-failed') && !normal.includes('다시 만들기'))
  const app = readFileSync(here('./App.jsx'), 'utf8')
  assert.ok(app.includes("json.type === 'actions_failed'") && app.includes('onActionsFailed: () => setActionsFailed(true)') && app.includes('onRetryActions={handleFreeAnalyze}'))
})
