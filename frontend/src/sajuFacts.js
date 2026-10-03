// 내 사주 리포트용 순수 계산 — 서버가 계산한 네 기둥(예: "辛신未미")에서 화면에 보여 줄 값만 뽑는다.
// 오행·상생·상극 표는 backend/saju.js 와 같다(sajuReport.test.mjs 가 서로 같은 결과를 내는지 확인한다). 새 이론은 없다.

const 간오행 = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
const 지오행 = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' }
const 상생 = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const 상극 = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const 한자간 = '甲乙丙丁戊己庚辛壬癸'
const 한자지 = '子丑寅卯辰巳午未申酉戌亥'

export const ELEMENTS = ['목', '화', '토', '금', '수']
export const ELEMENT_LABEL = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' }
export const ELEMENT_COLOR = { 목: '#1E7F4F', 화: '#C53A3A', 토: '#8A5F0E', 금: '#5F6B7A', 수: '#2563EB' }   // App.jsx 의 사주팔자 카드와 같은 색

// "辛신未미" → 화면용 값. 시간을 모르면 서버가 '-' 를 보낸다 → null
export function pillarView(str) {
  const s = String(str || '')
  const gan = [...s].find((c) => 한자간.includes(c))
  const ji = [...s].find((c) => 한자지.includes(c))
  if (!gan || !ji) return null
  const gi = s.indexOf(gan), ji2 = s.indexOf(ji)
  return { gan, ganKo: s[gi + 1] && /[가-힣]/.test(s[gi + 1]) ? s[gi + 1] : '', ji, jiKo: s[ji2 + 1] && /[가-힣]/.test(s[ji2 + 1]) ? s[ji2 + 1] : '', ganEl: 간오행[gan], jiEl: 지오행[ji] }
}

function relationOf(X, Y) {
  if (X === Y) return '나와 같은 기운'
  if (상생[Y] === X) return '나를 도와주는 기운'
  if (상생[X] === Y) return '내가 키워주는 기운'
  if (상극[X] === Y) return '내가 다루는 기운'
  if (상극[Y] === X) return '나를 누르는 기운'
  return ''
}
const GROUP_ORDER = ['나를 누르는 기운', '내가 다루는 기운', '내가 키워주는 기운', '나를 도와주는 기운', '나와 같은 기운']

// pillars: { 년주, 월주, 일주, 시주 } → 오행별 개수, 일간, 일간 기준 관계 그룹(많은 순 최대 2개)
export function sajuFacts(pillars) {
  const rows = [['년주', pillars && pillars.년주], ['월주', pillars && pillars.월주], ['일주', pillars && pillars.일주], ['시주', pillars && pillars.시주]]
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  const day = pillarView(pillars && pillars.일주)
  const X = day ? day.ganEl : null
  const groups = {}
  let total = 0
  for (const [name, str] of rows) {
    const v = pillarView(str)
    if (!v) continue
    for (const [slot, ch, el] of [['윗글자', v.gan, v.ganEl], ['아랫글자', v.ji, v.jiEl]]) {
      counts[el]++; total++
      if (X && !(name === '일주' && slot === '윗글자')) {
        const g = relationOf(X, el)
        if (g) (groups[g] = groups[g] || []).push(`${name} ${slot} ${ch}`)
      }
    }
  }
  const relations = GROUP_ORDER.filter((g) => groups[g] && groups[g].length)
    .map((g) => ({ label: g, count: groups[g].length, where: groups[g] }))
    .sort((a, b) => b.count - a.count || GROUP_ORDER.indexOf(a.label) - GROUP_ORDER.indexOf(b.label))
    .slice(0, 2)
  return { counts, total, dayGan: day ? day.gan : null, dayElement: X, groups, relations }
}
