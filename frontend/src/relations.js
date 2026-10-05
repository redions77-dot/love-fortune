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

// 내 사주 전체 분석(1,990원) 안내 — 서버 유료 프롬프트(backend/server.js paidOnlyPrompt)가 실제로 만드는 8개 항목과 같아야 한다.
// 심화 분석(9,900원)은 deepPrompt의 7개 항목. 프롬프트가 바뀌면 이 목록과 테스트(relations.test.mjs)를 함께 고친다.
export const SAJU_PAID = {
  title: '내 성향을 일과 관계에 활용하려면',
  summary: '전체 분석 8개 항목 · 월별 운세는 2027년 1월~12월(12개월)',
  bundles: [
    { title: '인생 재물운', desc: '인생 단계별 돈의 흐름, 돈이 새는 패턴, 돈이 잘 모이는 조건' },
    { title: '직업과 커리어', desc: '어울리는 직업, 능력이 살아나는 일 방식, 공부·배움 방식, 도약할 시기와 조심할 시기' },
    { title: '투자와 부동산', desc: '맞는 투자 성향과 피할 투자 방식, 부동산 방향, 수익 파이프라인' },
    { title: '나이에 맞춘 심화 풀이 1개', desc: '나이와 결혼 여부에 따라 진로·인연운·부부운·앞으로의 핵심 흐름 중 하나가 들어가요' },
    { title: '사람과 인연', desc: '곁에 둘 사람과 조심할 사람, 인간관계에서 반복하는 패턴' },
    { title: '월별 운세 (2027년 1월~12월)', desc: '2027년 12개월의 달마다 흐름' },
    { title: '나를 돕는 것들', desc: '행운 색깔·마스코트·방향·숫자·아이템' },
    { title: '이 사주로 잘 사는 법', desc: '잘 풀리는 조건, 조심할 패턴, 매일 해볼 실천 조언' },
  ],
  // 결제 전에 기본과 심화의 차이를 알 수 있게 하는 안내 (심화 항목은 deepPrompt의 7개 섹션)
  deepNote: '심화 분석(9,900원)은 전체 분석과 별도 상품이에요. 종합 흐름 요약·수비학 운명수·10년 대운·대운 상세·내년 흐름·귀인·해야 할 것과 하지 말아야 할 것, 7가지를 따로 풀어드려요.',
}

// 내 사주 "자세한 풀이 살펴보기"에서 펼쳐지는 상품 안내용 요약. 위 SAJU_PAID.bundles 의 실제 항목 중 일·돈·관계에 해당하는 3개만 골라
// "무엇이 더 구체적으로 풀리는지"를 짧게 설명한다. 설명은 해당 bundles[].desc 에 이미 있는 내용만 쓴다(새 기능·혜택·수치·확정 표현을 만들지 않는다).
// 무료 풀이가 보여주는 범위는 parseMyFree 의 5개 섹션(핵심 성향·이유·강점·주의할 습관·실천 팁)이다. relations.test.mjs 가 항목 이름과 문구를 확인한다.
export const SAJU_PAID_FREE_NOTE = '무료 풀이는 핵심 성향·강점·주의할 습관·실천 팁을 중심으로 보여드려요. 전체 분석은 이를 바탕으로 아래 주제를 더 구체적으로 풀어드려요.'
export const SAJU_PAID_HIGHLIGHTS = [
  { topic: '돈', bundle: '인생 재물운', text: '인생 단계별 돈의 흐름, 돈이 새는 패턴, 돈이 잘 모이는 조건을 따로 자세히 풀어드려요.' },
  { topic: '일', bundle: '직업과 커리어', text: '어울리는 직업과 능력이 살아나는 일 방식, 도약할 시기와 조심할 시기를 살펴봐요.' },
  { topic: '관계', bundle: '사람과 인연', text: '곁에 둘 사람과 조심할 사람, 인간관계에서 반복하는 패턴을 더 구체적으로 짚어드려요.' },
]
// 풀이 대상 기간과 결과 받는 방법은 구분해서 안내한다. (결과 보관 기간은 서비스 정책에 정해진 문구가 없어 적지 않는다.)
export const SAJU_PAID_FACTS = [
  { label: '풀이 기간', text: '월별 운세는 2027년 1월~12월(12개월)을 풀어드려요.' },
  { label: '결과 받기', text: '결제 후 풀이를 생성해요. 완료된 결과는 PDF로 저장하거나 이메일로 받을 수 있어요.' },
]

// ── 무료 결과 파싱 ──────────────────────────────
// 예상한 섹션 제목(expected)과 글자가 다른 제목(예: AI가 제목을 깨뜨린 경우)이 와도 내용이 사라지지 않게 한다.
// 모르는 제목은 "앞서 읽은 예상 제목 다음 순서에서 아직 비어 있는 첫 제목"으로 보고 그 자리에 넣는다.
// 이미 읽은 제목과 같은 제목이 또 오거나 자리를 못 찾으면 버린다. '예시 표시'는 화면 안내용이라 건너뛴다.
function resolveSections(text, expected) {
  const parts = String(text || '').split(/===(.+?)===/s)
  const map = new Map()
  let last = -1
  for (let i = 1; i < parts.length; i += 2) {
    const raw = parts[i].trim()
    const body = (parts[i + 1] || '').trim()
    if (raw === '예시 표시') { if (!map.has(raw)) map.set(raw, body); continue }
    let idx = expected.indexOf(raw)
    if (idx < 0) idx = expected.findIndex((t, j) => j > last && !map.has(t))
    if (idx < 0 || map.has(expected[idx])) continue
    map.set(expected[idx], body)
    last = idx
  }
  return map
}
// 대화 문장 검증 — backend/relations.js 의 validateDialogueLine 과 같은 규칙이다 (relations.test.mjs 가 서로 같은 결과를 내는지 확인한다).
// 정확히 한 문장 + 존댓말일 때만 화면에 쓴다. 통과하지 못하면 문장을 고쳐 쓰지 않고 숨긴다.
export function validateDialogueLine(line) {
  const reasons = []
  const t = String(line || '').trim().replace(/^["“”']+|["“”']+$/g, '').trim()
  if (!t) return { ok: false, reasons: ['대화 문장이 비어 있음'] }
  const sentences = t.split(/(?<=[.?!])\s+/).map(x => x.trim()).filter(Boolean)
  if (sentences.length !== 1) reasons.push('한 문장이 아님(' + sentences.length + '문장)')
  const POLITE = /(요|니다|니까|죠|세요|까요)$/
  const BANMAL = /(까|줄래|할래|볼래|보자|하자|해줘|줘|거야|같아|있어|없어|어|아|지|야|해)$/
  for (const x of sentences) {
    const e = x.replace(/[.?!…\s"”'’)]+$/g, '')
    if (POLITE.test(e)) continue
    reasons.push((BANMAL.test(e) ? '반말 종결: ' : '존댓말이 아님: ') + e.slice(-12))
  }
  return { ok: reasons.length === 0, reasons }
}

const COMMENT_RE = /^해설\s*[:：]\s*/
const TIP_RE = /^팁\s*[:：]\s*/

// 바 3개의 해설/팁은 "해설:" "팁:" 줄에서 읽는다. 형식이 어긋나면 섹션 전체를 해설로 보여준다.
export function parseGunghabFree(text, bars) {
  const m = resolveSections(text, ['한 줄 요약', '관계 요약', ...(bars || []).map(b => b.label), '잘 맞는 점', '조율할 점', '대화 문장'])
  const outBars = (bars || []).map((b) => {
    const body = m.get(b.label)
    if (!body) return { ...b, comment: '', tip: '', issues: ['섹션 없음'] }
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean)
    const commentLine = lines.find(l => COMMENT_RE.test(l))
    const tipLine = lines.find(l => TIP_RE.test(l))
    if (!commentLine && !tipLine) return { ...b, comment: lines.join(' '), tip: '', issues: ['해설: 라벨 없음', '팁 없음'] }
    let comment = commentLine ? commentLine.replace(COMMENT_RE, '') : ''
    const issues = []
    if (!commentLine) {
      // "해설:" 줄만 빠진 경우: 팁 앞에 있는 AI의 원문 줄을 해설로 읽는다 (프런트가 새로 만들지 않는다)
      const before = lines.slice(0, lines.indexOf(tipLine)).filter(l => !TIP_RE.test(l))
      if (before.length) { comment = before.join(' '); issues.push('해설: 라벨 없음(팁 앞의 줄을 해설로 읽음)') } else issues.push('해설 없음')
    }
    if (!tipLine) issues.push('팁 없음')
    return { ...b, comment, tip: tipLine ? tipLine.replace(TIP_RE, '') : '', issues }
  })
  return {
    demo: m.get('예시 표시') || '',
    headline: (m.get('한 줄 요약') || '').split('\n')[0].trim(),
    summary: m.get('관계 요약') || '',
    bars: outBars,
    barIssues: outBars.flatMap(b => (b.issues || []).map(i => b.label + ': ' + i)),
    good: m.get('잘 맞는 점') || '',
    tune: m.get('조율할 점') || '',
    // 검증을 통과한 대화 문장만 내보낸다. 실패하면 빈 값(화면에서 '이렇게 말해보세요' 카드가 사라진다). AI 재호출·문장 변환은 하지 않는다.
    line: dialogueOrEmpty(m.get('대화 문장')),
    lineRejected: !!(m.get('대화 문장') || '').trim() && !validateDialogueLine(m.get('대화 문장')).ok,
  }
}

function dialogueOrEmpty(raw) {
  const t = (raw || '').trim()
  return t && validateDialogueLine(t).ok ? t : ''
}

// 파싱이 안 되어 원문을 그대로 보여주는 경우에도 검증에 실패한 대화 문장은 빼고 보여준다.
export function safeGunghabText(text, bars) {
  const raw = String(text || '')
  if (!raw.includes('===')) return raw
  const expected = ['한 줄 요약', '관계 요약', ...(bars || []).map(b => b.label), '잘 맞는 점', '조율할 점', '대화 문장']
  const m = resolveSections(raw, expected)
  if (!m.size) return raw
  return expected.filter(t => m.has(t) && !(t === '대화 문장' && !dialogueOrEmpty(m.get(t))))
    .map(t => '===' + t + '===' + String.fromCharCode(10) + m.get(t)).join(String.fromCharCode(10, 10))
}

// 내 사주: 핵심 한 문장(첫 줄) + 생활 속 설명(나머지)
export function parseMyFree(text) {
  const m = resolveSections(text, ['핵심 한 문장', '이런 성향이 나오는 이유', '나의 강점', '주의할 습관', '바로 실천할 팁'])
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
