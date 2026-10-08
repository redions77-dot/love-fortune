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
