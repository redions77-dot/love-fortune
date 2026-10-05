import test from 'node:test'
import assert from 'node:assert'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const outDir = here('../node_modules/.cache/pdf-save-test')
mkdirSync(outDir, { recursive: true })
buildSync({ entryPoints: [here('./reportBlocks.jsx')], bundle: true, packages: 'external', format: 'esm', jsx: 'automatic', outfile: join(outDir, 'reportBlocks.mjs'), logLevel: 'silent' })
const { PdfSaveArea } = await import(pathToFileURL(join(outDir, 'reportBlocks.mjs')).href)
const app = readFileSync(here('./App.jsx'), 'utf8')
const count = (s, t) => s.split(t).length - 1

test('저장 영역: 기본 화면에는 PDF 저장하기 버튼과 작은 도움말 링크만 있고, 인쇄 버튼·모바일 안내는 접혀 있다', () => {
  const html = renderToStaticMarkup(h(PdfSaveArea, { onSave: () => true }))
  assert.strictEqual(count(html, 'PDF 저장하기'), 1)
  assert.ok(html.includes('저장이 안 되나요?') && html.includes('aria-expanded="false"'))
  assert.ok(!html.includes('인쇄 · PDF로 저장') && !html.includes('모바일에서는 PDF 저장이 되지 않을 수 있어요'))
  assert.ok(html.includes('data-pdf-exclude="true"') && html.includes('no-print'))   // PDF·인쇄물에는 나오지 않는다
})

test('저장 영역: 같은 줄에 처음으로 같은 버튼을 둘 수 있고, 진행 중에는 비활성화할 수 있다', () => {
  const html = renderToStaticMarkup(h(PdfSaveArea, { onSave: () => true, disabled: true, beside: h('button', null, '← 처음으로') }))
  assert.ok(html.includes('← 처음으로') && html.includes('disabled'))
})

test('결과 화면: 큰 인쇄 버튼과 중복 PDF 문구는 없고, 저장 영역은 심화·궁합 상세·궁합 무료·전체/무료 결과에 하나씩 연결된다', () => {
  assert.ok(!app.includes('<PrintButton') && !app.includes('인쇄 · PDF로 저장'))
  assert.ok(!app.includes('모바일에서는 PDF 저장이 되지 않을 수 있어요'))      // 도움말 안으로 옮겨졌다
  for (const old of ['심화 분석 저장하기 (PDF)', '궁합 분석 저장하기 (PDF)', '📄 PDF 저장']) assert.ok(!app.includes(old), old)
  for (const onSave of ['saveDeepPdf', 'saveGunghabPdf', 'saveGunghabFreePdf']) assert.strictEqual(count(app, `<PdfSaveArea onSave={${onSave}}`), 1, onSave)
  assert.strictEqual(count(app, '<PdfSaveArea onSave={saveResultPdf}'), 2)   // 결제 후(처음으로와 한 줄) / 무료 결과
})

test('저장 방식: 기존 이미지 PDF 저장 함수를 그대로 쓰고, 실패하면 도움말을 펼치도록 성공 여부를 돌려준다(화면 크기로 판단하지 않는다)', () => {
  assert.ok(app.includes("await exportResultPDF(spec)") && app.includes('return true') && app.includes('return false'))
  const blocks = readFileSync(here('./reportBlocks.jsx'), 'utf8')
  assert.ok(blocks.includes("typeof window.print === 'function'"))
  assert.ok(!/innerWidth|matchMedia|userAgent|screen\.width/.test(blocks.replace(/\/\/.*$/gm, '')))
})
