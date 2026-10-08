import test from 'node:test'
import assert from 'node:assert/strict'
import { stripStrayMarkdown } from './markdownStrip.js'
import { buildDeepFlowTable, buildDeepChoiceTable, buildDeepClosing } from './deepTables.js'
import { summarizeMoney } from './reportSummary.js'
import { parseContentBlocks } from './contentBlocks.js'
import { DEEP_SAMPLE } from './deepSample.fixture.mjs'

const sectionsOf = (text) => { const parts = text.split(/===(.+?)===/s); const out = []; for (let i = 1; i < parts.length; i += 2) out.push({ title: parts[i].trim(), content: (parts[i + 1] || '').trim() }); return out }
const blank = (t) => t.replace(/[ \t]+/g, ' ').replace(/ $/gm, '').replace(/\n{3,}/g, '\n\n')   // 줄 끝 공백·빈 줄 수는 무시(글자는 그대로 비교)
// AI가 ** 를 어기고 쓰는 여러 모양을 같은 샘플에 넣는다(굵게 문구·소제목 통째·줄 전체·짝 안 맞음·섹션 사이 ---)
const inject = {
  '문장 중간 굵게': (t) => t.split('\n').map((l) => (l.length > 40 && !l.startsWith('===') ? l.replace(/^(.{6})(.{10})/, '$1**$2**') : l)).join('\n'),
  '줄 전체 굵게': (t) => t.split('\n').map((l) => (l.trim() && !l.startsWith('===') ? '**' + l + '**' : l)).join('\n'),
  '번호 머리·소제목 굵게': (t) => t.replace(/^(\d+\.\s)(\S+)/gm, '$1**$2**').replace(/^(📌|✅|⚠️|🔑)\s*(.+)$/gm, '$1 **$2**'),
  '짝 안 맞는 **': (t) => t.replace(/(해요\.)/g, '$1 **').replace(/(2027년)/g, '**$1'),
  '섹션 사이 ---': (t) => t.replace(/\n\n(===)/g, '\n\n---\n\n$1'),
  '모두 함께': (t) => inject['섹션 사이 ---'](inject['번호 머리·소제목 굵게'](inject['문장 중간 굵게'](t))),
}
const build = (text) => { const s = sectionsOf(text).filter((x) => x.content); return { tables: [buildDeepFlowTable(s), buildDeepChoiceTable(s), buildDeepClosing(s)], money: summarizeMoney(s), blocks: s.map((x) => parseContentBlocks(x.content)) } }
const base = build(DEEP_SAMPLE)

for (const [name, fn] of Object.entries(inject)) {
  test(`기호 제거 후 원문과 같다: ${name}`, () => {
    const dirty = fn(DEEP_SAMPLE)
    assert.ok(/\*\*|^---$/m.test(dirty), '기호가 실제로 들어갔다')
    const cleaned = stripStrayMarkdown(dirty)
    assert.ok(!/\*/.test(cleaned) && !/^---$/m.test(cleaned))
    assert.equal(blank(cleaned), blank(DEEP_SAMPLE), '글자 누락·변경 없음')
    const got = build(cleaned)
    assert.deepEqual(got.tables, base.tables, '표(흐름·선택·마무리)가 원문과 동일')
    assert.deepEqual(got.money, base.money, '요약 카드가 원문과 동일')
    assert.equal(JSON.stringify(got.blocks).replace(/ {2,}/g, ' '), JSON.stringify(base.blocks), '본문 블록(제목·문단·콜아웃)이 원문과 동일(공백 한 칸 차이만 허용)')
  })
}
test('기호를 지우지 않으면 표에 ** 가 새어 든다(수정 전 문제 재현)', () => {
  const dirty = inject['모두 함께'](DEEP_SAMPLE)
  assert.ok(/\*\*/.test(JSON.stringify(build(dirty))))
})
