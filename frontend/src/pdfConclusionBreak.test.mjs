import test from 'node:test'
import assert from 'node:assert'
import { mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { buildSync } from 'esbuild'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const outDir = here('../node_modules/.cache/pdf-conclusion-test')
mkdirSync(outDir, { recursive: true })
buildSync({ entryPoints: [here('./pdfExport.jsx')], bundle: true, packages: 'external', format: 'esm', jsx: 'automatic', outfile: join(outDir, 'pdfExport.mjs'), logLevel: 'silent' })
const PDF = await import(pathToFileURL(join(outDir, 'pdfExport.mjs')).href)

const CLOSE = `📌 이 사주가 잘 풀리는 조건
1. 약속은 적게, 지키는 것에 집중하세요.
2. 쉬는 시간을 먼저 정하세요.

⚠️ 이 사주가 망하는 패턴
부탁을 거절하지 못해 일이 쌓이는 패턴이에요.

📌 지금 당장 실천할 행동 조언
1. 매일 저녁 10분 내일 할 일을 적으세요.
2. 부탁은 하루 뒤에 답하세요.

🔑 마무리: 당신은 천천히 가도 멀리 가는 사람이에요.`

const TITLE = '道 · 이 사주로 잘 사는 법'
const metaOf = (full) => PDF.buildPdfPlan([{ kind: 'section', title: TITLE, content: CLOSE, part: 7, ...(full ? { full: true } : {}) }]).map((p) => p.meta)

test('전체 분석 결론: 제목 + 카드가 카드 단위 블록이고, 제목과 첫 블록은 항상 함께 다닌다', () => {
  const m = metaOf(true)
  assert.ok(m.length >= 5, '제목 + 카드 단위 블록 ' + m.length)
  assert.strictEqual(m[0].keep, true, '제목은 다음 블록과 함께')
  assert.strictEqual(m[1].keep, true, '머리글(앞으로 기억할 나의 기준)은 첫 카드와 함께')
  assert.ok(m.slice(1).every((x) => x.keepAll && x.group === m[1].group), '카드는 한 쪽에 들어가면 통째로')
})

test('무료·비전체 결과는 결론 카드 블록을 만들지 않는다', () => {
  assert.ok(metaOf(false).every((x) => !String(x.group).endsWith('.o')), '카드 단위 블록 없음(본문 그대로)')
})

// 제목 + 카드 전체가 한 쪽보다 길 때: 제목이 쪽 끝에 홀로 남지 않고 첫 카드와 함께 간다
const block = (h, meta) => ({ h, topPad: 0, sec: 9, group: '9.0', ...meta })
function conclusionBlocks(unitHs, before = []) {
  return [
    ...before,
    block(90, { keep: true, group: '9.0' }),                                                  // 제목
    ...unitHs.map((h, i) => block(h, { group: '9.o', keepAll: true, ...(i === 0 ? { keep: true } : {}) })),
  ]
}
const pageOf = (pages, idx) => pages.findIndex((p) => p.list.some((b) => b.idx === idx))

test('제목+카드가 한 쪽을 넘어도 제목은 첫 카드와 같은 쪽 (새 쪽 맨 위에서 시작하는 경우)', () => {
  const pages = PDF.paginateBlocks(conclusionBlocks([70, 330, 140, 280, 150]), 0)   // 제목 90 + 카드 합 970 → 한 쪽(983) 초과, 카드 합만은 한 쪽 이하
  assert.strictEqual(pageOf(pages, 0), pageOf(pages, 1), '제목과 머리글')
  assert.strictEqual(pageOf(pages, 1), pageOf(pages, 2), '머리글과 첫 카드')
  assert.ok(pages.length >= 2)
})

test('앞 내용이 있는 쪽에서 시작해도 제목만 쪽 끝에 남지 않는다', () => {
  const before = [block(600, { sec: 1, group: '1.0' })]
  const pages = PDF.paginateBlocks(conclusionBlocks([70, 330, 140, 280, 150], before), 0)
  const t = 1
  assert.strictEqual(pageOf(pages, t), pageOf(pages, t + 1))
  assert.strictEqual(pageOf(pages, t + 1), pageOf(pages, t + 2))
})

test('전체가 한 쪽에 들어가면 예전처럼 한 쪽에 모은다', () => {
  const pages = PDF.paginateBlocks(conclusionBlocks([70, 150, 100, 120, 90]), 0)
  assert.strictEqual(pages.length, 1)
})

// ── 職 · 직업과 커리어: 추천 직업 카드 1·2·3은 한 쪽에 함께 ──
const JOB = `📌 이 사주에 맞는 직업
1. 품질관리·회계검토·계약관리
기준을 적용해 오류를 찾는 힘이 있어요.

2. 교육기획·상담
사람의 말을 오래 듣는 편이에요.

3. 운영관리·일정조율
여러 일을 순서대로 맞추는 감각이 있어요.

📌 잘 맞는 업무 환경
역할과 기준이 분명하고 혼자 집중할 시간이 있는 환경이에요.

📌 덜 맞는 업무 환경
기준이 자주 바뀌고 즉흥적인 요청이 많은 환경이에요.`
const jobMeta = (full) => PDF.buildPdfPlan([{ kind: 'section', title: '職 · 직업과 커리어', content: JOB, part: 8, ...(full ? { full: true } : {}) }]).map((p) => p.meta)

test('職: 직업 카드 3장은 별도 묶음(keepAll)으로 함께 다니고, 환경 비교 카드는 그 묶음에 넣지 않는다', () => {
  const m = jobMeta(true)
  const jobs = m.filter((x) => String(x.group).endsWith('.j'))
  assert.strictEqual(jobs.length, 3)
  assert.ok(jobs.every((x) => x.keepAll))
  assert.ok(m.some((x) => String(x.group).endsWith('.o')), '환경 비교 카드는 기존 묶음')
  assert.ok(jobMeta(false).every((x) => !String(x.group).endsWith('.j')), '전체 분석이 아니면 변화 없음')
})

test('職: 직업 카드 2장까지만 남는 쪽이면 제목과 카드 3장을 함께 다음 쪽으로 넘긴다', () => {
  const job = (n) => block(150, { group: '9.j', keepAll: true })
  const blocks = [block(600, { sec: 1, group: '1.0' }), block(90, { keep: true }), job(), job(), job(), block(190, { group: '9.o' }), block(60, { group: '9.0' })]
  const pages = PDF.paginateBlocks(blocks, 0)   // 쪽 높이 983: 600+90+150+150 = 990 > 983 → 카드 3장 모두 다음 쪽
  const p = (i) => pageOf(pages, i)
  assert.strictEqual(p(1), p(2)); assert.strictEqual(p(2), p(3)); assert.strictEqual(p(3), p(4))
  assert.notStrictEqual(p(0), p(1))
})

test('職: 카드 3장 뒤 환경·설명은 남는 공간이 없으면 다음 쪽으로 자연스럽게 넘어간다', () => {
  const job = () => block(300, { group: '9.j', keepAll: true })
  const blocks = [block(40, { keep: true }), job(), job(), job(), block(190, { group: '9.o' })]   // 40+900 = 940, 환경 190은 다음 쪽
  const pages = PDF.paginateBlocks(blocks, 0)
  assert.strictEqual(pageOf(pages, 0), pageOf(pages, 3))
  assert.strictEqual(pageOf(pages, 4), pageOf(pages, 0) + 1)
})

test('결론: 카드가 4장 이상이면 마지막 두 카드(행동 조언 + 마지막 한 문장)는 한 블록', () => {
  const m = metaOf(true)
  assert.strictEqual(m.length, 5, '제목 + 카드 블록 4(마지막은 두 장)')
})
