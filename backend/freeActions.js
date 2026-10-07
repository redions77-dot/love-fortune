// 무료 '내 사주' 결과의 마지막 섹션 "지금 당장 할 일, 딱 3가지" — 프롬프트 규칙, 형식 해석, 형식 검증.
// 앞 4개 섹션(Haiku)이 끝난 뒤 Sonnet 으로 따로 만든다(server.js writeActions). 모델은 풀이 전체에서 행동 후보를 속으로 비교해
// 가장 가치 있는 3개만 출력한다(후보 목록은 출력하지 않는다).
// 검증은 AI 호출 없이 하는 결정적 검사만 한다. 세 단계로 나눈다:
//   hard  — 명백한 화면 오류·안전 문제. 못 고치면 보내지 않는다(안전망).
//   soft  — 사용자가 바로 보는 명백한 결함. 재생성 트리거가 된다. 2번 시도 후에도 남으면 repair 로 고쳐서 보낸다.
//   notes — 키워드만으로 정확히 판단하기 어려운 것(제목 길이·유사도·장면 반복·두루뭉술 표현 일부). 재생성하지 않고 로그만 남긴다.

const ACTIONS_TITLE = '지금 당장 할 일, 딱 3가지';
const ACTIONS_MARK = `===${ACTIONS_TITLE}===`;
// 모델이 가끔 "=== 제목 ==="처럼 공백을 넣어 쓰므로, 찾을 때는 공백을 허용한다.
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const markRe = (title) => new RegExp(`={3}\\s*${escapeRe(title)}\\s*={3}`);
const ACTIONS_MARK_RE = markRe(ACTIONS_TITLE);

// 프롬프트에 그대로 들어가는 규칙(짧게 유지한다. 정답 예시는 넣지 않는다).
const ACTIONS_RULES = `위 풀이(핵심 한 문장·이유·강점·주의할 습관)를 읽은 사람이 마지막에 "그래서 나는 뭘 하면 되는데?"라고 묻습니다. 정말 도움이 되는 행동 3개만 주세요.

속으로 먼저 풀이 전체에서 행동으로 바꿀 수 있는 후보를 여러 개 떠올려 비교하세요. 서로 겹치는 것, 누구에게나 해당하는 뻔한 것, 주의할 습관을 오히려 키우는 것, 풀이에 근거가 약한 것은 버리고, 이 사람에게 효과가 가장 큰 3개만 고르세요. 후보 목록이나 고민 과정은 출력하지 말고 최종 3개만 쓰세요.

최종 3개 기준:
- 서로 다른 문제나 다른 장면을 다루세요. 같은 이야기를 쪼개거나 바꿔 말하지 마세요.
- 오늘~이번 주 안에 바로 할 수 있는 작은 행동이에요. 구체성은 도구·숫자·요일·생활 장면을 붙여서 만드는 게 아니에요. 풀이에서 이 사람의 습관이나 강점이 실제로 드러나는 순간을 먼저 잡고, 그 순간에 하던 행동 하나를 무엇으로 바꿀지 쓰세요. 타이머·메모·목록·기록은 그 도구 자체가 풀이와 직접 이어질 때만 쓰세요. 생각하기·마음먹기처럼 머릿속에서 끝나는 행동은 안 돼요.
- 풀이에 실제 근거가 있어야 해요. 새 성향이나 새 사주 이론을 만들지 마세요. 방법 안에 이 행동이 이 사람에게 왜 필요한지를 한 문장으로 자연스럽게 녹이세요(풀이 문장을 그대로 베끼지 마세요).
- '주의할 습관'을 키우거나 굳히는 행동은 안 돼요.
- 누구에게나 할 수 있는 뻔한 조언은 안 돼요.
- 강점을 쓰는 행동은 필수가 아니에요. 자연스러울 때만, "더 많이"가 아니라 이 사람에게 도움이 되는 방향으로 쓰세요.
- 입력에 없는 직업·직장·가족·연애·생활환경을 만들어 내지 말고 "일", "가까운 사람"처럼 일반적으로 쓰세요(결혼 상태가 기혼으로 입력된 경우에만 "배우자"를 쓸 수 있어요). 풀이에 그런 말이 나와도 행동에는 쓰지 마세요. 구체적으로 보이려고 출근·생활 루틴을 새로 만들지도 마세요.
- 나이·연도·점수, 근거 없는 요일·긴 기간은 쓰지 마세요.
- 💬는 말하거나 보낼 문장이 정말 필요한 행동에만, 따로 한 줄로 쓰세요. 그대로 보낼 수 있는 완성된 존댓말 문장이고, 끝까지 본문과 같은 방향이어야 해요. "○○" 같은 빈칸은 안 돼요.
- 시키는 문장은 "~하세요", 설명하는 문장은 "~해요"로 쓰세요. 제목과 방법은 같은 행동을 말해야 해요. 합쇼체·한자·마크다운은 쓰지 마세요.

형식(번호는 이 섹션에서만 써요):
1. 제목(20자 안팎, 제목만 읽어도 무엇을 하는지 보이게)
방법 1~3문장.
💬 "문장"(필요할 때만)

2. (같은 형식)

3. (같은 형식)`;

// ── 해석 ──────────────────────────────────────────
// ===제목=== 아래 본문(제목 줄 제외)을 꺼낸다. 없으면 null.
function sectionBody(text, title) {
  const t = String(text || '');
  const m = t.match(markRe(title));
  if (!m) return null;
  const rest = t.slice(m.index + m[0].length);
  const next = rest.search(/\n===[^=\n]+===/);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}
const extractActionsSection = (text) => sectionBody(text, ACTIONS_TITLE);

// 검증을 통과한 3개를 화면·저장에 쓰는 표준 형식으로 다시 쓴다(프런트 파서가 읽는 형식).
function formatActions(items) {
  return items.map((it) => [`${it.n}. ${it.title}`, it.how, it.say ? `💬 "${it.say}"` : ''].filter(Boolean).join('\n')).join('\n\n');
}

const HEADER_RE = /^\s*(?:([1-3])[.)．]|([①②③]))\s*(.+?)\s*$/;
const CIRCLED = { '①': 1, '②': 2, '③': 3 };
const stripQuotes = (s) => s.replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, '');

// "1. 제목 / 방법 / 💬 문장" 덩어리를 [{n, title, how, say}] 로 바꾼다. 형식이 어긋나면 있는 만큼만 돌려준다.
// (모델이 "근거:" 줄을 붙여도 무시한다.)
function parseActions(body) {
  const items = [];
  let cur = null;
  for (const raw of String(body || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(HEADER_RE);
    if (h && !line.startsWith('💬')) {
      cur = { n: Number(h[1] || CIRCLED[h[2]]), title: h[3].replace(/^\*+|\*+$/g, '').trim(), how: '', say: '' };
      items.push(cur);
    } else if (cur) {
      if (/^\[?\s*(근거|이유)\s*[:：]/.test(line)) continue;
      if (line.startsWith('💬')) cur.say = stripQuotes(line.replace(/^💬\s*/, ''));
      else cur.how = (cur.how ? cur.how + ' ' : '') + line.replace(/^[→▶·-]\s*/, '');
    }
  }
  return items;
}

// ── 검증 ──────────────────────────────────────────
// 사용자가 직접 지적한 대표적인 추상 표현(재생성 트리거). 나머지 의식·gimmick 류는 로그만 남긴다.
const VAGUE_SOFT = ['신중하게', '긍정적으로', '우선순위를 정해', '결정을 믿고', '의견을 표현해', '마음의 여유', '중심을 잡', '자신을 믿', '좋은 습관을 만들', '생각을 멈춰', '마음속으로'];
const VAGUE_NOTE = ['여유를 가져', '여유를 가지', '생각해 보세요', '생각해보세요', '노력해 보세요', '노력해보세요', '마음을 편하게', '충분히 쉬', '스스로를 믿', '마음을 다잡', '조심하세요', '균형을 맞춰', '시간을 가져', '의식해', '의도적으로', '인정해 보세요', '인정해보세요', '마음을 비우', '느껴 보세요', '느껴보세요', '속으로 다짐', '속으로 되뇌', '10초', '심호흡', '숨을 한 번', '숨을 크게', '속으로 10', '속으로 세', '손가락으로'];
const POLITE = /(요|니다|니까|죠|세요|까요|시죠)$/;
const FORMAL_END = /(합니다|습니다|입니다|됩니다|십시오)[.!\s]*$/;
const HANJA = /[一-鿿]/;
const TIME_FACT = /(19|20)\d{2}\s*년|\d{1,3}\s*세(?![계상])|\d{1,2}\s*월(?!요일)/;
const SCORE = /\d+\s*%|상위\s*\d+|\d+\s*점(?!검|심)/;
const PLACEHOLDER = /○○|△△|□□|\(요약\)|\(\s*[^)]{0,8}\s*\)\s*[—-]/;
const POINTING = /(^|[\s,"])(이렇게|이런 이유|그 일|이런 식으로)(\s|[.,?!"]|$)/;
// 입력(성별·결혼 상태·생년월일 등)에 없는 직업·가족·연애 상황.
const JOB_WORDS = /회사|상사|직장|동료|부하 ?직원|보고서|회의|프로젝트|업무|거래처|고객|출근|퇴근|야근|계약서|서류|팀원|팀장|조직|후배|(^|[^가-힣])팀(이나|에서|과|은|이|을|의|\s|$)/;
const FAMILY_WORDS = /애인|연인|남자친구|여자친구|자녀|아이들|부모님|시댁|처가|아내|남편/;
// 근거 없이 만든 임의의 요일·긴 기간(retry). "하루 뒤" 같은 짧은 기간 표현은 로그만 남긴다.
const ARBITRARY_DATE = /(월|화|수|목|금|토|일)요일|\d+\s*개월|(\d+|[한두세네]) ?달 (동안|간)|\d+\s*년/;
const SHORT_PERIOD = /일주일 (뒤|후)|한 달 (뒤|후)|이틀 (뒤|후)|며칠 (뒤|후)|하루 (뒤|후)|\d+\s*주(일)? ?(동안|간)/;
// 앞 풀이의 주의할 습관을 오히려 키우는 "명백한 처방": 습관이 왼쪽 유형이고, 행동이 오른쪽처럼 그 습관을 그대로 시키는 경우만(표현 변형을 쫓지 않는다).
const OPPOSITES = [
  { name: '미루기·결정 지연', habit: /미루|미뤄|보류|주저|망설|결정(을)? (늦|끌|못)|결정하지 못|오래 (고민|생각)/, action: /미루세요|미뤄 ?(두|보|놓)세요|보류하세요|뒤로 (미루|넘기)/ },
  { name: '방식·기준 고수', habit: /고수|고집|같은 방식|이전 방식|익숙한 방식|기존 (방식|방법)|(한 번|한번) 정한|바꾸지 (못|않)/, action: /그대로 (반복|유지)(하세요|해)|방법(을)? 바꾸지 (말|마)|다시 고민하지 말/ },
  { name: '남에게 에너지를 쓰고 떠안기', habit: /떠안|떠맡|도맡|혼자 (끌어안|책임)|남(의|을)? (일|필요)|맞춰 주|맞추다 보|응하다 보/, action: /더 도우|더 도와|더 챙기|먼저 연락해|필요한 (거|것) 있으면 말씀/ },
];
// 기본값처럼 반복되기 쉬운 장면(로그만).
const DEFAULT_SCENES = [
  { name: '부탁·요청에 바로 답하지 않기', action: /(부탁|요청|제안)[^.]{0,30}(바로|그 자리|즉시)[^.]{0,20}(답|대답|승낙|받아들)|(바로|그 자리에서)[^.]{0,12}(답하지|대답하지|승낙하지)/ },
  { name: '할 일 목록 적기·동그라미', action: /동그라미|할 일[^.]{0,12}(적|목록)/ },
];
const TITLE_IMMEDIATE = /(바로|즉시|그 자리에서)[^,]{0,12}(답|대답|하기|받기|정하기|말하기)/;
const BODY_DELAY = /생각해 ?(볼게요|보고|본 뒤)|하루 (안에|뒤|후)|나중에|확인하고 (답|연락|말씀)|보류|미룬 뒤|뒤에 (답|정|말)/;
const SENTENCE_SPLIT = /(?<=[.?!])\s+/;

const bigrams = (s) => { const t = s.replace(/\s+/g, ''); const set = new Set(); for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2)); return set; };
function similarity(a, b) {
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; A.forEach((x) => { if (B.has(x)) inter++; });
  return inter / (A.size + B.size - inter);
}

// items 를 검사한다. opts.sections = { habit, ... } 가 있으면 반대 방향(명백한 처방) 검사도 한다. opts.married 가 true 면 "배우자"를 허용한다.
// 반환: { ok, hard, soft, notes, reasons } — reasons = hard + soft (재생성할 때 모델에게 알려 주는 이유). notes 는 로그 전용.
function validateActions(items, opts = {}) {
  const hard = [];
  const soft = [];
  const notes = [];
  const list = Array.isArray(items) ? items : [];
  if (list.length !== 3 || list.some((it, i) => it.n !== i + 1)) {
    hard.push(`행동이 정확히 3개(1번·2번·3번)여야 해요. 지금은 ${list.length}개예요.`);
    return { ok: false, hard, soft, notes, reasons: [...hard] };
  }
  const sec = opts.sections || null;
  list.forEach((it) => {
    const tag = `${it.n}번`;
    const all = [it.title, it.how, it.say].join(' ');
    // hard: 명백한 화면 오류·안전
    if (it.title.length < 2) hard.push(`${tag} 제목이 없어요.`);
    if (it.how.length < 10) hard.push(`${tag} 방법이 없거나 너무 짧아요.`);
    if (HANJA.test(all)) hard.push(`${tag}에 한자가 있어요.`);
    if (/\*\*|^#|##/.test(all)) hard.push(`${tag}에 마크다운 기호가 있어요.`);
    if (TIME_FACT.test(all)) hard.push(`${tag}에 나이·연도·월 같은 구체적인 시기 숫자가 있어요.`);
    if (SCORE.test(all)) hard.push(`${tag}에 퍼센트·점수 같은 수치 평가가 있어요.`);
    if (PLACEHOLDER.test(it.how)) hard.push(`${tag} 방법에 "○○" 같은 빈칸이 있어요. 빈칸 없이 완성된 문장으로 쓰세요.`);
    // soft: 사용자가 바로 보는 명백한 결함(재생성)
    if (it.title.length > 40) soft.push(`${tag} 제목이 너무 길어요(지금 ${it.title.length}자). 20자 안팎으로 짧게 쓰세요.`);
    if (PLACEHOLDER.test(it.say)) soft.push(`${tag} 💬 문장에 "○○", "(요약)" 같은 빈칸이 있어요. 그대로 쓸 수 있는 완성된 문장으로 쓰세요.`);
    if (it.say && POINTING.test(it.say)) soft.push(`${tag} 💬 문장이 "이렇게/이런 이유/그 일"처럼 내용을 가리키기만 해요. 실제 내용을 넣으세요.`);
    const impolite = it.say ? it.say.split(SENTENCE_SPLIT).map((x) => x.replace(/[.?!…~\s"”'’)]+$/g, '')).filter(Boolean).find((x) => !POLITE.test(x)) : null;
    if (impolite) soft.push(`${tag} 💬 문장은 존댓말(해요체)이어야 해요: "${impolite.slice(-14)}"`);
    if (it.how.includes('💬')) soft.push(`${tag} 💬 문장은 방법 문장 안에 섞지 말고 따로 한 줄로 쓰세요.`);
    if (it.how.length < 20) soft.push(`${tag} 방법이 너무 짧아요. 언제·무엇을·어떻게 하는지 쓰세요.`);
    if (it.how.length > 400) soft.push(`${tag} 방법이 너무 길어요. 1~3문장으로 줄이세요.`);
    if (it.say && (it.say.length < 5 || it.say.length > 110)) soft.push(`${tag} 💬 문장은 5~110자여야 해요.`);
    const vs = VAGUE_SOFT.find((w) => (it.title + ' ' + it.how).includes(w) || it.say.includes(w));
    if (vs) soft.push(`${tag}에 추상적인 표현("${vs}")이 있어요. 무엇을 어떻게 하는지로 풀어 쓰세요.`);
    if (it.how.split(SENTENCE_SPLIT).some((x) => FORMAL_END.test(x))) soft.push(`${tag} 방법은 해요체로 써야 해요.`);
    if (JOB_WORDS.test(all)) soft.push(`${tag}에 입력에 없는 직장 상황이 있어요. "일", "모임"처럼 일반적으로 쓰세요.`);
    const fam = all.match(FAMILY_WORDS) || (!opts.married && all.match(/배우자/));
    if (fam) soft.push(`${tag}에 입력에 없는 가족·연애 상황("${fam[0]}")이 있어요. 가정하지 말고 일반적으로 쓰세요.`);
    if (ARBITRARY_DATE.test(all)) soft.push(`${tag}에 근거 없는 요일·긴 기간("${all.match(ARBITRARY_DATE)[0]}")이 있어요. "오늘 저녁", "이번 주 안에"처럼 가까운 때만 쓰세요.`);
    if (sec && sec.habit) {
      const opp = OPPOSITES.find((o) => o.habit.test(sec.habit) && o.action.test(all));
      if (opp) soft.push(`${tag}이 '주의할 습관'(${opp.name})을 줄이는 대신 키우는 처방이에요. 습관을 줄이는 방향으로 바꾸세요.`);
    }
    // notes: 키워드로 정확히 판단하기 어려운 것(로그만)
    if (it.title.length > 32 && it.title.length <= 40) notes.push(`${tag} 제목이 길어요(${it.title.length}자).`);
    const vn = VAGUE_NOTE.find((w) => (it.title + ' ' + it.how).includes(w) || it.say.includes(w));
    if (vn) notes.push(`${tag}에 두루뭉술하거나 형식적일 수 있는 표현("${vn}").`);
    if (SHORT_PERIOD.test(all)) notes.push(`${tag}에 임의 기간 표현("${all.match(SHORT_PERIOD)[0]}").`);
    const sc = DEFAULT_SCENES.find((d) => d.action.test(it.title + ' ' + it.how));
    if (sc) notes.push(`${tag}이 흔한 장면('${sc.name}').`);
    if (TITLE_IMMEDIATE.test(it.title) && !/(하지 ?(않|말)|말기|말고|(^|\s)안 )/.test(it.title) && BODY_DELAY.test(it.how)) notes.push(`${tag} 제목은 "바로"인데 방법은 시간을 두라고 해요.`);
  });
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    if (similarity(list[i].title + ' ' + list[i].how, list[j].title + ' ' + list[j].how) > 0.4) notes.push(`${list[i].n}번과 ${list[j].n}번이 비슷해요.`);
  }
  return { ok: hard.length === 0 && soft.length === 0, hard, soft, notes, reasons: [...hard, ...soft] };
}

// 2번 시도 후에도 soft 만 남았을 때 "고쳐서 보낸다": 문제 있는 💬 문장은 빼고(행동은 그대로), 방법 안에 섞인 💬 표시는 지운다.
// 행동 3개와 제목·방법 본문은 바꾸지 않는다. hard 가 남아 있으면 쓰지 않는다.
function repairActions(items) {
  return items.map((it) => {
    const out = { ...it, how: it.how.replace(/💬\s*/g, '').replace(/\s{2,}/g, ' ').trim() };
    const badSay = it.say && (PLACEHOLDER.test(it.say) || POINTING.test(it.say) || VAGUE_SOFT.some((w) => it.say.includes(w)) || it.say.length < 5 || it.say.length > 110
      || it.say.split(SENTENCE_SPLIT).map((x) => x.replace(/[.?!…~\s"”'’)]+$/g, '')).filter(Boolean).some((x) => !POLITE.test(x)));
    if (badSay) out.say = '';
    return out;
  });
}

// 여러 시도 중 가장 나은 후보를 고른다(마지막 시도를 무조건 쓰지 않는다): ① hard 실패가 없는 것 ② soft 문제가 적은 것(같으면 나중 시도).
// attempts: [{ items, check }] — check 는 validateActions 결과. hard 가 없는 후보가 하나도 없으면 null.
function pickBestAttempt(attempts) {
  const ok = (attempts || []).filter((a) => a && a.check && a.check.hard.length === 0);
  if (!ok.length) return null;
  return ok.reduce((best, a) => (a.check.soft.length <= best.check.soft.length ? a : best));
}

// Sonnet 에게 이 섹션만 쓰게 하는 프롬프트. 앞 섹션은 바꾸지 못하고, 풀이 전체(핵심 한 문장·이유·강점·주의할 습관)를 근거로 쓴다.
// reasons 가 있으면(재생성) 앞 시도의 문제점을 알려 준다.
function buildActionsPrompt({ infoBlock, sections, reasons = [] }) {
  const prev = [['나의 핵심 한 문장', sections.core], ['이런 성향이 나오는 이유', sections.why], ['나의 강점', sections.strength], ['주의할 습관', sections.habit]]
    .filter(([, v]) => v && v.trim()).map(([k, v]) => `[${k}]\n${v.trim()}`).join('\n\n');
  const problems = reasons.length ? `\n[앞서 쓴 "${ACTIONS_TITLE}"의 문제점 — 이번에는 고쳐서 쓰세요]\n${reasons.map((r) => '- ' + r).join('\n')}\n` : '';
  return `당신은 한국의 사주·명리학 전문가입니다. 아래 무료 풀이를 읽은 사람이 바로 행동할 수 있도록, 마지막 섹션 "${ACTIONS_TITLE}"만 써주세요.

${infoBlock}

[이미 작성된 풀이 — 이 내용은 바꾸지 말고, 이 안에서만 근거를 찾으세요]
${prev}
${problems}
[작성할 섹션]
${ACTIONS_RULES}

출력은 ${ACTIONS_MARK} 줄로 시작하고, 그 아래 1. 2. 3. 세 개만 쓰세요. 다른 설명은 쓰지 마세요.`;
}

module.exports = { ACTIONS_TITLE, ACTIONS_MARK, ACTIONS_MARK_RE, ACTIONS_RULES, sectionBody, formatActions, extractActionsSection, parseActions, validateActions, repairActions, pickBestAttempt, buildActionsPrompt };
