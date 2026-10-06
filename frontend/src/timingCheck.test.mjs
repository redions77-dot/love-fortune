import test from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { readDirectives, pairDirectives, statusAgainst, rangeOf } from './timingCheck.js'
import { buildDeepChoiceTable, diagnoseDeepTables } from './deepTables.js'
import { DEEP_SAMPLE } from './deepSample.fixture.mjs'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const sectionsOf = (text) => { const parts = text.split(/===(.+?)===/s); const out = []; for (let i = 1; i < parts.length; i += 2) out.push({ title: parts[i].trim(), content: (parts[i + 1] || '').trim() }); return out }
const stances = (t) => readDirectives(t).map((d) => d.stance)
const pair = (a, b) => pairDirectives([...readDirectives(a), ...readDirectives(b)])
const kind = (p) => (p.opposed.length ? 'opposed' : p.ambiguous.length ? 'ambiguous' : 'ok')

test('가능성·흐름 설명은 행동 권고가 아니다 — "유리하다·풀린다"라는 단어만으로 판단하지 않는다', () => {
  assert.deepStrictEqual(readDirectives('큰 결정은 2028년부터 2032년 사이에 유리해질 수 있어요.'), [])
  assert.deepStrictEqual(readDirectives('큰 투자는 2028~2032년에 풀리는 시기예요.'), [])
  assert.deepStrictEqual(readDirectives('사업 확장 쪽 기운이 유리하게 흐르는 해예요.'), [])
  assert.deepStrictEqual(stances('큰 투자는 2028년부터 2030년 사이에 하는 것이 유리해요.'), ['go'])      // 행동 권고(하는 것이 유리)
  assert.deepStrictEqual(stances('사업 확장은 2029년부터 하기 좋아요.'), ['go'])
  assert.deepStrictEqual(stances('큰 결정은 신중하게 접근해야 해요.'), [])                                 // 신중히 검토(careful)는 비교 대상이 아님
  // 가능성 설명 + 반대 방향 행동 권고는 상반이 아니다
  assert.strictEqual(kind(pair('큰 결정은 2028년부터 2032년 사이에 유리해질 수 있어요.', '큰 결정은 2030년까지 미루세요.')), 'ok')
})

test('미루라 / 미루지 말라: 뜻이 뒤집히는 부정형을 구분한다', () => {
  assert.deepStrictEqual(readDirectives('큰 결정은 2029년까지 미루세요.').map((d) => [d.stance, d.range]), [['stop', [-Infinity, 2029]]])
  assert.deepStrictEqual(readDirectives('큰 결정은 2029년까지 미루지 마세요.').map((d) => [d.stance, d.range]), [['go', [-Infinity, 2029]]])
  assert.deepStrictEqual(stances('큰 투자를 피하지 않아도 돼요.'), [])                                       // 부정형 "피하지 않아도" 는 권고가 아님
  // 같은 결정·같은 기간에 미루라와 미루지 말라 → 명확한 상반
  assert.strictEqual(kind(pair('큰 결정은 2029년까지 미루세요.', '큰 결정은 2028년부터 2030년까지 미루지 마세요.')), 'opposed')
  // 기간이 없으면 모호(어느 쪽도 고르지 않음)
  assert.strictEqual(kind(pair('큰 결정은 2029년까지 미루세요.', '큰 결정은 미루지 마세요.')), 'ambiguous')
  // 미루는 기간이 끝난 뒤에 하라는 건 상반이 아니다(2027년까지 미루고 2028년부터 하기 좋음)
  assert.strictEqual(kind(pair('큰 결정은 2027년까지 미루세요.', '큰 결정은 2028년부터 2030년 사이에 하기 좋아요.')), 'ok')
  assert.strictEqual(kind(pair('큰 결정은 2028년 이후로 미루세요.', '큰 결정은 2028년부터 2032년 사이에 하는 것이 유리해요.')), 'ok')
})

test('작은 결정과 큰 결정은 서로 비교하지 않는다', () => {
  assert.deepStrictEqual(readDirectives('작은 투자는 지금 시작해도 좋아요.'), [])
  assert.deepStrictEqual(readDirectives('소액 투자는 2029년까지 해도 괜찮아요.'), [])
  assert.deepStrictEqual(readDirectives('작은 기회(이직 제안, 소규모 프로젝트, 작은 투자)는 2027년부터 반갑게 받아들여도 괜찮아요.'), [])
  assert.strictEqual(kind(pair('작은 투자는 2028년부터 하기 좋아요.', '큰 투자는 2030년까지 하지 마세요.')), 'ok')
  assert.strictEqual(kind(pair('큰 투자는 2028년부터 2030년 사이에 하기 좋아요.', '큰 투자는 2030년까지 하지 마세요.')), 'opposed')
})

test('결정의 종류·행동이 다르면 같은 결정이 아니다(결혼 vs 투자, 투자 실행 vs 투자 제안 수락)', () => {
  assert.strictEqual(kind(pair('큰 투자는 2028년부터 2030년 사이에 하기 좋아요.', '결혼은 2030년까지 미루세요.')), 'ok')
  assert.strictEqual(kind(pair('큰 투자는 2028년부터 2030년 사이에 하기 좋아요.', '지인이 소개하는 투자 제안은 2030년까지 받아들이지 마세요.')), 'ok')
  // 큰 결정(총칭)은 모든 큰 결정 종류의 실행과 같은 결정이다
  assert.strictEqual(kind(pair('큰 결정은 2028년부터 2030년 사이에 하기 좋아요.', '사업 확장은 2029년까지 하지 마세요.')), 'opposed')
})

test('조건이 다르면 같은 결정이 아니다 — 기간이 겹쳐도 원문을 유지하고 모호로만 남긴다', () => {
  const p = pair('큰 투자는 2028년부터 2030년 사이에 하기 좋아요.', '큰 빚을 내서 투자하는 것은 2030년까지 피하세요.')
  assert.strictEqual(kind(p), 'ambiguous')                                   // 빚을 낸 투자 ≠ 일반 큰 투자
  assert.strictEqual(readDirectives('충동적으로 사업을 시작하면 안 돼요.')[0].conditional, true)
  assert.strictEqual(readDirectives('큰 투자는 하지 마세요.')[0].conditional, false)
})

test('애매하면 모호: 기간이 한쪽에만 있거나 둘 다 없을 때', () => {
  assert.strictEqual(kind(pair('큰 투자는 2028년부터 하기 좋아요.', '큰 투자는 지금 하지 마세요.')), 'ambiguous')
  assert.strictEqual(kind(pair('큰 투자는 하기 좋아요.', '큰 투자는 하지 마세요.')), 'ambiguous')
  assert.deepStrictEqual(rangeOf('2028년부터 2030년 사이에', 'go'), [2028, 2030])
  assert.deepStrictEqual(rangeOf('아직 모르겠어요', 'go'), null)
})

test('첨부 형태의 실제 결과: 유리 + 신중은 정상, 조건 붙은 금지문은 모호로만 남고 원문(표 행)은 유지된다', () => {
  const secs = sectionsOf(DEEP_SAMPLE)
  const t = buildDeepChoiceTable(secs)
  assert.ok(t.rows.some((r) => r[0].main === '큰 결정'))
  assert.strictEqual(t.note, null)
  const codes = diagnoseDeepTables(secs).map((d) => d.code)
  assert.ok(!codes.includes('timing-opposed'))
  assert.ok(codes.every((c) => c === 'timing-ambiguous'))
  // 행 자체의 판정
  const row = '큰 결정(사업 확장, 큰 투자, 결혼, 퇴사)은 2032년까지 신중하게 접근해야 하고, 2033년 이후에는 물 기운이 강해지면서 에너지 소모가 커지니 큰 결정은 2028년부터 2032년 사이에 하는 것이 가장 유리해요.'
  assert.strictEqual(statusAgainst(row, []), 'ok')
})

test('백엔드 공통 규칙과 같은 기준: 유리·신중은 함께 가능, 같은 결정의 정반대 권고만 금지, N+1년 규칙은 없다', () => {
  const rules = readFileSync(here('../../backend/timingRules.js'), 'utf8')
  const server = readFileSync(here('../../backend/server.js'), 'utf8')
  assert.ok(rules.includes('"유리한 시기"와 "신중하게 검토할 시기"는 함께 쓸 수 있어요'))
  assert.ok(rules.includes('같은 종류의 결정') && rules.includes('같은 시기'))
  const ruleSrc = rules.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')   // 주석은 제외하고 실제 규칙 문구만 본다
  for (const old of ['N년 다음 해부터', 'M은 반드시 N보다', '겹치면 안 됩니다', 'N+1', '신중 구간 끝']) assert.ok(!ruleSrc.includes(old), old)
  // server.js 에는 시기 규칙과 상관없는 문구('섹션 내용이 겹치면 안 됩니다')가 있으므로 시기 규칙 문구만 확인한다
  for (const old of ['N년 다음 해부터', 'M은 반드시 N보다', 'N+1', '신중한 구간과 검토하기 좋은 구간이', '몇 년까지 신중해야 하고']) assert.ok(!server.includes(old), old)
  // 프런트가 보는 기준(행동 권고·종류·행동·조건·기간)이 백엔드 규칙 문구에도 같은 순서로 들어 있다
  for (const word of ['행동', '종류', '조건', '시기']) assert.ok(rules.includes(word), word)
})
