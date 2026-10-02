import { SHARE_URL } from './hosts.js'

// 관계 궁합 UI 상수. 값(key)·상세 풀이 묶음은 backend/relations.js 와 같아야 한다
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

// 상세 풀이(유료) 안내: 얻는 도움을 드러내는 제목 + 묶음 3~4개. 묶음 설명은 실제 유료 프롬프트의 섹션 내용만 쓴다.
export const GUNGHAB_PAID = {
  연인: {
    title: '이 사람과 더 편안하게 지내려면',
    bundles: [
      { title: '서로를 이해하기', desc: '각자의 기질과 편한 속도·표현 방식, 끌리는 이유와 부딪히는 지점' },
      { title: '오해와 갈등 풀기', desc: '표현 방식 차이로 생기기 쉬운 오해와 상황별 해결 문장, 자주 반복될 수 있는 갈등과 대화로 푸는 순서' },
      { title: '관계를 이어가는 법', desc: '서로에게 필요한 것과 지켜주면 좋은 것, 핵심 정리와 이번 주에 해볼 행동 한 가지' },
    ],
  },
  부부: {
    title: '함께 사는 일상을 더 편하게 하려면',
    bundles: [
      { title: '생활 리듬 맞추기', desc: '두 사람의 생활 속도·선호 차이와 편하게 맞추는 방법' },
      { title: '마음과 역할 조율하기', desc: '오래 함께한 사이에서 쌓이기 쉬운 서운함과 표현 방법, 역할 분담과 의사결정에서 부딪히기 쉬운 지점' },
      { title: '앞으로를 위한 정리', desc: '앞으로 몇 년 동안 신경 쓰면 좋은 관계의 흐름, 핵심 정리와 이번 주에 해볼 행동 한 가지' },
    ],
  },
  부모자녀: {
    title: '서로 더 편하게 대화하려면',
    bundles: [
      { title: '서로 다른 표현 이해하기', desc: '기질 차이로 같은 말도 다르게 들릴 수 있는 지점, 자주 생길 수 있는 어긋남과 바로 써볼 수 있는 말' },
      { title: '거리와 응원', desc: '보호와 독립 사이에서 서로 존중하는 거리 두기, 상대에게 해주면 좋은 것과 조심하면 좋은 말' },
      { title: '정리', desc: '핵심 정리와 이번 주에 해볼 행동 한 가지' },
    ],
  },
  형제가족: {
    title: '가족과 거리를 편하게 조절하려면',
    bundles: [
      { title: '서로의 성향 이해하기', desc: '같은 가족이어도 다르게 느끼고 표현하는 지점, 오래된 역할·비교·기대가 관계에 주는 영향과 조율법' },
      { title: '거리와 대화', desc: '가까움을 유지하면서 부담을 줄이는 거리 두기, 자주 반복될 수 있는 장면과 바로 써볼 수 있는 말' },
      { title: '정리', desc: '핵심 정리와 이번 주에 해볼 행동 한 가지' },
    ],
  },
  친구: {
    title: '이 친구와 오래 편하게 지내려면',
    bundles: [
      { title: '우정이 이어지는 방식', desc: '두 사람이 편해지는 이유와 오래 이어지게 하는 요소' },
      { title: '서운함과 약속 다루기', desc: '오해가 생기기 쉬운 상황과 부담 없이 푸는 방법, 시간·돈·약속에서 조심하면 좋은 부분과 합의 방법' },
      { title: '거리감과 정리', desc: '서로에게 맞는 연락 빈도와 만남의 방식, 핵심 정리와 이번 주에 해볼 행동 한 가지' },
    ],
  },
  직장동료: {
    title: '이 사람과 더 편하게 일하려면',
    bundles: [
      { title: '일하는 방식 맞추기', desc: '기질로 본 두 사람의 업무 스타일과 보완되는 지점, 시너지가 나는 조합과 역할을 나누는 방법' },
      { title: '말이 잘 통하게', desc: '오해가 생기기 쉬운 표현과 정중하게 전달하는 말' },
      { title: '힘든 상황 대처와 정리', desc: '마감·의견 충돌 등 압박 상황에서 관계를 지키는 방법, 핵심 정리와 이번 주에 해볼 행동 한 가지' },
    ],
  },
}

// 내 사주 전체 분석(1,990원) 안내 — 서버의 유료 프롬프트 섹션(재물·직업·투자·인연·월별·행운 요소·잘 사는 법)을 쉬운 말로 묶은 것
export const SAJU_PAID = {
  title: '내 성향을 일과 관계에 활용하려면',
  bundles: [
    { title: '일과 돈', desc: '인생 단계별 돈의 흐름과 돈이 새는 패턴, 어울리는 직업과 일하는 시기, 공부·배움 방식, 투자·부동산 방향' },
    { title: '사람과 인연', desc: '인간관계와 인연의 흐름, 조심하면 좋은 사람 유형' },
    { title: '달마다의 흐름과 나를 돕는 것', desc: '달마다의 흐름, 행운 색깔·마스코트·방향·숫자·아이템' },
    { title: '이 사주로 잘 사는 법', desc: '잘 풀리는 조건, 조심할 패턴, 매일 해볼 실천 조언' },
  ],
}

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
    demo: m.get('예시 표시') || '',
    headline: (m.get('한 줄 요약') || '').split('\n')[0].trim(),
    summary: m.get('관계 요약') || '',
    bars: outBars,
    good: m.get('잘 맞는 점') || '',
    tune: m.get('조율할 점') || '',
    line: (m.get('대화 문장') || '').trim(),
  }
}

// 내 사주: 핵심 한 문장(첫 줄) + 생활 속 설명(나머지)
export function parseMyFree(text) {
  const m = sectionMap(text)
  const core = (m.get('핵심 한 문장') || '').split('\n').map(l => l.trim()).filter(Boolean)
  return {
    demo: m.get('예시 표시') || '',
    sentence: core[0] || '',
    detail: core.slice(1).join(' '),
    why: m.get('이런 성향이 나오는 이유') || '',
    strength: m.get('나의 강점') || '',
    habit: m.get('주의할 습관') || '',
    tip: m.get('바로 실천할 팁') || '',
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

// sentence: 실제 무료 결과의 핵심 한 문장(내 사주) 또는 한 줄 요약(관계 궁합)
export function buildShareText({ sentence, fallback, people = [] }) {
  const body = scrubPersonal(sentence, people) || fallback
  return `${body}\n\n너는 어때? 궁금하면 무료로 볼 수 있어요 👉 ${SHARE_URL}`
}
