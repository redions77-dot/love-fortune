import { SHARE_URL } from './hosts.js'

// 관계 궁합 UI 상수. 값(key)과 상세 풀이 섹션 제목은 backend/relations.js 와 같아야 한다
// (frontend/src/relations.test.mjs 가 서로 맞는지 확인한다).
export const GUNGHAB_PRICE_TEXT = '1,990원'

export const RELATION_OPTIONS = [
  { key: '연인', emoji: '💕', label: '연인', sub: '서로 끌리는 방식과 어긋나는 지점' },
  { key: '부부', emoji: '💍', label: '부부', sub: '함께 사는 리듬과 마음 표현' },
  { key: '부모자녀', emoji: '👨‍👩‍👧', label: '부모·자녀', sub: '표현 방식의 차이와 알맞은 거리' },
  { key: '형제가족', emoji: '🏠', label: '형제자매·기타 가족', sub: '가까워도 필요한 거리와 대화법' },
  { key: '친구', emoji: '👫', label: '친구', sub: '대화 코드와 편안한 거리' },
  { key: '직장동료', emoji: '🤝', label: '직장 동료·상사', sub: '일하는 방식과 소통 방법' },
]
export const RELATION_ROLES = [
  { key: '부모', label: '내가 부모예요', sub: '상대는 자녀' },
  { key: '자녀', label: '내가 자녀예요', sub: '상대는 부모' },
]

// 상세 풀이(유료)에서 추가로 다루는 주제 — 결제 전에 보여주는 목록
export const GUNGHAB_PAID_TOPICS = {
  연인: ['두 사람의 연애 스타일', '마음 표현과 오해', '갈등이 생겼을 때', '관계를 오래 이어가는 조건', '관계 총평'],
  부부: ['함께 사는 리듬', '마음 표현과 서운함 풀기', '돈·살림·결정 나누기', '앞으로의 흐름', '관계 총평'],
  부모자녀: ['서로를 대하는 방식의 차이', '대화가 어긋나는 순간과 풀이', '적당한 거리와 독립', '서로에게 필요한 응원', '관계 총평'],
  형제가족: ['성향 차이로 보는 서로 이해', '가족 안에서의 역할과 기대', '거리와 경계', '갈등을 줄이는 대화', '관계 총평'],
  친구: ['우정이 이어지는 방식', '서운함이 쌓이는 지점', '시간·돈·약속 다루기', '오래 가는 거리감', '관계 총평'],
  직장동료: ['일하는 방식의 차이', '협업할 때의 역할 분담', '의사소통과 피드백', '부담스러운 상황에서의 대처', '관계 총평'],
}

// 내 사주 전체 분석(1,990원)에서 무료 풀이에 더해 제공하는 풀이 (서버의 유료 프롬프트 섹션과 같다)
export const SAJU_PAID_TOPICS = [
  { title: '財運 · 인생 재물 전체', desc: '인생 단계별 돈의 흐름과 재물 패턴' },
  { title: '職 · 직업과 커리어', desc: '맞는 일하는 방식, 공부·배움 방식과 커리어 방향' },
  { title: '富 · 투자와 부동산', desc: '투자·부동산에서 맞는 방향과 조심할 점' },
  { title: '緣 · 사람과 인연', desc: '인간관계와 인연의 흐름' },
  { title: '月運 · 월별 운세', desc: '달마다의 흐름' },
  { title: '幸 · 나를 돕는 것들', desc: '행운 색깔·마스코트·방향·숫자·아이템' },
  { title: '道 · 이 사주로 잘 사는 법', desc: '잘 풀리는 조건과 조심할 패턴, 실천 조언' },
]

// ── 무료 결과 파싱 ──────────────────────────────
function sectionMap(text) {
  const parts = String(text || '').split(/===(.+?)===/s)
  const map = new Map()
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim()
    if (!map.has(title)) map.set(title, (parts[i + 1] || '').trim())
  }
  return map
}
const COMMENT_RE = /^해설\s*[:：]\s*/
const TIP_RE = /^팁\s*[:：]\s*/

// 바 3개의 해설/팁은 "해설:" "팁:" 줄에서 읽는다. 형식이 어긋나면 섹션 전체를 해설로 보여준다.
export function parseGunghabFree(text, bars) {
  const m = sectionMap(text)
  const outBars = (bars || []).map((b) => {
    const body = m.get(b.label)
    if (!body) return { ...b, comment: '', tip: '' }
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean)
    const comment = lines.find(l => COMMENT_RE.test(l))
    const tip = lines.find(l => TIP_RE.test(l))
    if (!comment && !tip) return { ...b, comment: lines.join(' '), tip: '' }
    return { ...b, comment: comment ? comment.replace(COMMENT_RE, '') : '', tip: tip ? tip.replace(TIP_RE, '') : '' }
  })
  return {
    summary: m.get('관계 요약') || '',
    bars: outBars,
    good: m.get('잘 맞는 점') || '',
    tune: m.get('조율할 점') || '',
    line: (m.get('대화 문장') || '').trim(),
    share: (m.get('공유 문장') || '').trim(),
  }
}

export function parseMyFree(text) {
  const m = sectionMap(text)
  return {
    read: m.get('나를 읽다') || '',
    strength: m.get('나의 강점') || '',
    habit: m.get('주의할 습관') || '',
    tip: m.get('바로 실천할 팁') || '',
    share: (m.get('공유 문장') || '').trim(),
  }
}

// ── 공유 ──────────────────────────────────────
// 공유 문구에서 이름·날짜·나이 같은 개인 정보를 지운다 (공유 전에 사용자가 한 번 더 확인·수정할 수 있다).
// people: [[이름, 바꿀 말], ...] 예: [[myName, '나'], [partnerName, '상대']]
export function scrubPersonal(text, people = []) {
  let t = String(text || '')
  for (const [rawName, as] of people) {
    const name = String(rawName || '').trim()
    if (name.length < 2) continue
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    t = t.replace(new RegExp(esc + '님?', 'g'), as)
  }
  return t
    .replace(/\d{4}\s*년(\s*\d{1,2}\s*월(\s*\d{1,2}\s*일)?)?/g, '')
    .replace(/\d{1,2}\s*월\s*\d{1,2}\s*일/g, '')
    .replace(/\d{1,3}\s*세/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function buildShareText({ sentence, fallback, people = [] }) {
  const body = scrubPersonal(sentence, people) || fallback
  return `${body}\n\n궁금하면 무료로 볼 수 있어요 👉 ${SHARE_URL}`
}
