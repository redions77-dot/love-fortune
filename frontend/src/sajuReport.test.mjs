import test from 'node:test'
import assert from 'node:assert'
import { readFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { sajuFacts, pillarView, ELEMENT_LABEL } from './sajuFacts.js'

const require = createRequire(import.meta.url)
const S = require('../../backend/saju.js')
const here = (p) => fileURLToPath(new URL(p, import.meta.url))

// SajuReport.jsx 를 실제로 컴파일해서 서버 렌더링(HTML)으로 확인한다. (AI·네트워크 없음)
const outDir = here('../node_modules/.cache/saju-report-test')
mkdirSync(outDir, { recursive: true })
buildSync({ entryPoints: [here('./SajuReport.jsx')], bundle: true, packages: 'external', format: 'esm', jsx: 'automatic', outfile: join(outDir, 'SajuReport.mjs'), logLevel: 'silent' })
const UI = await import(pathToFileURL(join(outDir, 'SajuReport.mjs')).href)
const SajuReport = UI.default

const P1991 = { 년주: '辛신未미', 월주: '丙병申신', 일주: '乙을丑축', 시주: '庚경辰진' }
const base = (over = {}) => ({
  name: '하늘', dateLine: '1991년 8월 23일 · 양력 · 07:30', pillars: P1991,
  core: { sentence: '주변의 요구와 기준을 민감하게 받아들이면서, 그 안에서 나만의 속도를 찾아가는 경향이 있어요.', detail: '부탁을 받거나 일을 정할 때 상대의 상황을 먼저 헤아리다가, 내 의견은 한 박자 늦게 꺼내게 될 때가 있을 수 있어요.' },
  why: '하늘님의 사주에는 나를 누르는 기운(쇠 기운)이 3곳에 있고, 내가 다루는 기운(흙 기운)도 3곳에 있어요.\n\n그래서 바깥에서 오는 기준과 요구를 자주 마주치는 구조로 읽을 수 있어요.',
  strength: '상대가 불편해하는 것을 먼저 알아차리는 힘이 있어요.\n\n일을 맡았을 때도 필요한 것을 챙기는 모습으로 나타날 수 있어요.\n\n가까운 관계와 직장에서 믿을 만한 사람으로 느껴질 수 있어요.',
  habit: '여러 사람의 필요가 한꺼번에 보일 때 거절 기준이 흐려질 수 있어요.\n\n그러면 하려던 일이 뒤로 밀려 지치기 쉬워요.\n\n불편함을 말하지 않고 넘기면 한꺼번에 지칠 수 있어요.',
  tip: '부탁을 받으면 바로 답하기 전에 달력부터 확인해 보세요. 자리가 없으면 “이번 주는 어렵고 다음 주는 가능해요”라고 먼저 말해 보세요.',
  typeInfo: { name: '뚝심 승부사형', desc: '느리지만 반드시 이긴다, 포기를 모르는 덩굴' },
  ...over,
})
const render = (props) => renderToStaticMarkup(h(SajuReport, props))
const ids = (html) => [...html.matchAll(/data-section="([a-z]+)"/g)].map((m) => m[1])

// ── 사주 값 계산: 백엔드(서버) 계산과 같은 결과 ─────────────────────────────────
const pillarsOf = (b, t) => {
  const [y, m, d] = b.split('-').map(Number)
  const dd = S.get일주(b), yy = S.get년주(y)
  return { 년주: yy.간지, 월주: S.get월주(y, m, d, yy.천간index), 일주: dd.간지, 시주: S.get시주(t, dd.천간index) || '-' }
}

test('사주 값: 오행 개수·일간·관계 그룹이 서버(backend/saju.js)의 계산과 일치한다', () => {
  let n = 0
  for (let t = Date.UTC(1950, 0, 1); t < Date.UTC(2030, 0, 1); t += 97 * 86400000) {
    const d = new Date(t).toISOString().slice(0, 10)
    for (const time of ['', '07:30', '22:10']) {
      const p = pillarsOf(d, time)
      const f = sajuFacts(p), ef = S.elementFacts({ ...p, 시주: p.시주 === '-' ? '' : p.시주 })
      assert.deepStrictEqual(f.counts, ef.counts, d + time)
      assert.strictEqual(f.dayGan, ef.dayGan); assert.strictEqual(f.dayElement, ef.dayElement)
      assert.strictEqual(f.total, Object.values(ef.counts).reduce((a, b) => a + b, 0))
      // 관계 그룹(많은 순 최대 2개): 이름·개수·위치가 서버와 같다
      const server = Object.entries(ef.groups).map(([g, arr]) => ({ label: g.replace(/\(.*\)/, ''), count: arr.length, where: arr.map((x) => x.where) }))
      for (const r of f.relations) { const s = server.find((x) => x.label === r.label); assert.ok(s, d + r.label); assert.strictEqual(s.count, r.count); assert.deepStrictEqual(s.where, r.where) }
      assert.ok(f.relations.length <= 2 && f.relations.length === Math.min(2, server.length))
      n++
    }
  }
  assert.ok(n > 150)
})

test('이번 사례(1991-08-23 07:30): 쇠 3곳·흙 3곳, 일간 乙(나무), 누르는 기운 3곳·다루는 기운 3곳', () => {
  const f = sajuFacts(P1991)
  assert.deepStrictEqual(f.counts, { 목: 1, 화: 1, 토: 3, 금: 3, 수: 0 })
  assert.strictEqual(f.dayGan, '乙'); assert.strictEqual(ELEMENT_LABEL[f.dayElement], '나무')
  assert.deepStrictEqual(f.relations.map((r) => [r.label, r.count]), [['나를 누르는 기운', 3], ['내가 다루는 기운', 3]])
  assert.deepStrictEqual(f.relations[0].where, ['년주 윗글자 辛', '월주 아랫글자 申', '시주 윗글자 庚'])
  assert.deepStrictEqual(pillarView('辛신未미'), { gan: '辛', ganKo: '신', ji: '未', jiKo: '미', ganEl: '금', jiEl: '토' })
  assert.strictEqual(pillarView('-'), null); assert.strictEqual(pillarView(''), null); assert.strictEqual(pillarView(undefined), null)
  // 시간을 모르면(시주 '-') 여섯 글자로 계산
  const f6 = sajuFacts({ ...P1991, 시주: '-' })
  assert.strictEqual(f6.total, 6)
})

// ── 리포트 화면 ───────────────────────────────────────────────────────────────
test('리포트: 01~06 구조 — 핵심 성향 → 사주 한눈에 → 이유 → 강점 → 주의 → 팁', () => {
  const html = render(base())
  assert.deepStrictEqual(ids(html), ['core', 'saju', 'why', 'strength', 'habit', 'tip'])
  const titles = ['나의 핵심 성향', '내 사주 한눈에', '이런 성향이 나오는 이유', '나의 강점', '주의할 습관', '바로 실천할 팁']
  let last = -1
  titles.forEach((t, i) => { const at = html.indexOf(t); assert.ok(at > last, t); last = at; assert.ok(html.includes(`>0${i + 1}<`), '번호 0' + (i + 1)) })
  assert.ok(html.includes('하늘님의 사주 리포트') && html.includes('1991년 8월 23일 · 양력 · 07:30') && html.includes('마이사주 · 내 사주 무료 결과'))
  // mock 시안의 안내 띠는 없다
  assert.ok(!/시안|mock|AI도 호출하지/.test(html))
  // 첫 문장은 크게(20~22px) 강조, 팁은 연한 초록 강조상자(.rpt-callout) + 19px
  assert.ok(/data-section="core"[^>]*>.*font-size:clamp[(]20px, 5[.]6vw, 22px[)]/.test(html))
  assert.ok(/data-section="tip" class="rpt-callout"/.test(html) && /font-size:19px/.test(html))
  assert.ok(html.includes('사주는 정답이 아니라 나를 바라보는 하나의 관점이에요'))
})

test('리포트: 사주 원국(시·일·월·년 순)과 오행 분포, 일간, 비유 유형, "이렇게 풀이한 이유"', () => {
  const html = render(base())
  const order = ['시주', '일주', '월주', '년주'].map((k) => html.indexOf(`data-pillar="${k}"`))
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])))
  for (const ch of ['庚', '辰', '乙', '丑', '丙', '申', '辛', '未']) assert.ok(html.includes(ch), ch)
  assert.ok(html.includes('나를 대표하는 글자') && html.includes('일간(나를 대표하는 글자)은 乙, 나무 기운이에요.'))
  assert.ok(html.includes('여덟 글자의 기운 분포'))
  const dist = html.slice(html.indexOf('data-distribution'), html.indexOf('일간(나를'))
  assert.deepStrictEqual([...dist.matchAll(/text-align:right">(\d)<\/span>/g)].map((m) => m[1]), ['1', '1', '3', '3', '0'])
  assert.ok(dist.includes('width:37.5%') && dist.includes('width:0%'))
  assert.ok(html.includes('비유로 보는 내 사주 유형') && html.includes('뚝심 승부사형') && html.includes('이런 이미지로 읽을 수 있어요: 느리지만 반드시 이긴다, 포기를 모르는 덩굴.'))
  // 이렇게 풀이한 이유 (옛 표현은 없다)
  assert.ok(html.includes('이렇게 풀이한 이유') && !html.includes('이 글이 읽은 근거'))
  assert.ok(html.includes('나를 누르는 기운 3곳 — 년주 윗글자 辛 · 월주 아랫글자 申 · 시주 윗글자 庚'))
  assert.ok(html.includes('내가 다루는 기운 3곳 — 년주 아랫글자 未 · 일주 아랫글자 丑 · 시주 아랫글자 辰'))
  // 시간을 모르는 경우: 시주 칸은 '-' 로 표시되고 오류 없이 그려진다
  const noTime = render(base({ pillars: { ...P1991, 시주: '-' }, dateLine: '1991년 8월 23일 · 양력' }))
  assert.ok(noTime.includes('data-pillar="시주"') && !noTime.includes('庚'))
  assert.ok(noTime.includes('>0</span>') || noTime.includes('>1</span>'))
})

test('리포트: 강점·주의는 문단별로 나뉘어 읽기 쉽게 보이고, 팁은 첫 문장이 강조된다', () => {
  const html = render(base())
  const strength = html.slice(html.indexOf('data-section="strength"'), html.indexOf('data-section="habit"'))
  assert.strictEqual((strength.match(/<p style="font-size:18px/g) || []).length, 3)
  const habit = html.slice(html.indexOf('data-section="habit"'), html.indexOf('data-section="tip"'))
  assert.strictEqual((habit.match(/<p style="font-size:18px/g) || []).length, 3)
  // 팁: 첫 문장은 크게, 두 번째 문장은 보조 설명
  const tip = html.slice(html.indexOf('data-section="tip"'))
  assert.ok(tip.indexOf('부탁을 받으면 바로 답하기 전에 달력부터 확인해 보세요.') < tip.indexOf('이번 주는 어렵고'))
  assert.ok(/font-size:16px[^>]*>자리가 없으면/.test(tip))
  // 소제목 이모지 기호는 화면에 나오지 않는다
  const marked = render(base({ strength: '📌 첫 문단이에요.\n\n✅ 둘째 문단이에요.' }))
  assert.ok(!/📌|✅/.test(marked) && marked.includes('첫 문단이에요.') && marked.includes('둘째 문단이에요.'))
})

test('리포트: 비어 있는 섹션은 숨기고 번호는 보이는 섹션 기준으로 이어진다', () => {
  const noStrength = render(base({ strength: '' }))
  assert.deepStrictEqual(ids(noStrength), ['core', 'saju', 'why', 'habit', 'tip'])
  assert.ok(!noStrength.includes('나의 강점') && noStrength.includes('>05<'))      // 팁이 05
  const minimal = render(base({ why: '', strength: '', habit: '', tip: '' }))
  assert.deepStrictEqual(ids(minimal), ['core', 'saju'])
  assert.ok(minimal.includes('내 사주 한눈에') && minimal.includes('나의 핵심 성향'))
  // 이름이 없으면 일반 제목, 비유 유형이 없으면 그 칸 없음
  const anon = render(base({ name: '', typeInfo: null }))
  assert.ok(anon.includes('나의 사주 리포트') && !anon.includes('비유로 보는 내 사주 유형'))
  // 관계 그룹이 없는 경우(이유 아래 근거 줄 없음)에도 오류 없이 그려진다
  assert.ok(render(base({ pillars: { 년주: '-', 월주: '-', 일주: '-', 시주: '-' } })).includes('이런 성향이 나오는 이유'))
})

// ── 기존 기능 영향 ───────────────────────────────────────────────────────────
test('기존 결과 화면은 그대로: 리포트는 내 사주 무료 결과가 준비됐을 때만 쓰이고, 유료 안내·공유·다른 서비스 화면은 유지된다', () => {
  const app = readFileSync(here('./App.jsx'), 'utf8')
  assert.ok(app.includes("import SajuReport from './SajuReport.jsx'"))
  assert.ok(app.includes("const useSajuReport = serviceType === 'saju' && !!myFree && !isBaseStreaming && !!myFree.sentence && !!sajuData?.사주"))
  // 기존 카드·아코디언은 삭제되지 않고 리포트일 때만 가려진다
  for (const gate of ['{!useSajuReport && myFree && !isBaseStreaming && myFree.sentence && (', '{!useSajuReport && myFree && !isBaseStreaming && sajuData?.사주 && (', '{!useSajuReport && sajuData?.사주 && (serviceType', '{!useSajuReport && sajuData?.사주?.일주 && (serviceType', '{!isBaseStreaming && !useSajuReport && baseShown.map(']) assert.ok(app.includes(gate), gate)
  // 유료 안내·공유·결제·이메일·PDF 는 그대로
  for (const keep of ['<PaidGuide title={SAJU_PAID.title}', 'openFullAnalysisCheckout', 'buildShareText', '<ShareModal', 'pdfCapturing', "id=\"result-content\"", 'requestPayWithEmail', "key: 'gunghab'", "screen === 'gunghab_free'", 'parseGunghabFree', 'function FullAnalysisPreviewCard(', '<ReportSection ', 'saveResultPdf', '<PdfSaveArea']) assert.ok(app.includes(keep), keep)
  // 결과 화면은 보고서 디자인(아이보리 배경 · 초록 상단 띠)을 쓰고, 리포트일 때는 SajuReport 가 헤더 없이(headless) 같은 띠 아래에 붙는다
  assert.ok(app.includes('<div className="rpt-page"') && app.includes('<ReportHero eyebrow={reportEyebrow} title={reportTitle} sub={reportSub} />') && app.includes('headless'))
  // 이 브랜치에는 삶의 이정표 코드가 없다
  assert.ok(!/DirectionFlow|이정표무료/.test(app))
  // 리포트는 입력·결제·저장 코드를 쓰지 않는다
  const src = readFileSync(here('./SajuReport.jsx'), 'utf8')
  assert.ok(!/fetch\(|localStorage|startCheckout|ShareModal|input|textarea/.test(src.replace(/\/\/.*$/gm, '')))
})
