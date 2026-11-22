// 우리 아이 성공사주 — 검사에 걸린 '문장'만 같은 뜻으로 다시 쓰게 하는 단계.
// 전체를 처음부터 다시 만들면 다른 문장이 새로 걸리므로, 걸린 문장 몇 개만 작은 호출로 고쳐 쓰고 서버가 그 자리에 끼운 뒤 전체를 다시 검사한다.
// 원칙: 문장을 지우지 않는다(지워서 통과시키지 않음). 고쳐 쓴 문장이 원래 뜻·토큰·분량을 크게 벗어나면 받아들이지 않는다.
// 이 모듈은 lint 함수를 인자로 받는다(successChildPrompt 와 순환 참조를 피하기 위함).

const TOKEN_RE = /\{[^{}\n]{1,20}\}/g;
const PREFIX_RE = /^(\s*[-•]\s+[^:]{1,40}:\s*|\s*[-•]\s+|(?:결론|요약|근거|주제|해석|차이|한 줄|공부 쪽|사업 쪽|장면|예시|해볼 일):\s*)/;
const IGNORED_CODES = new Set(['structure', 'length', 'truncated']);
const SENT_SPLIT = /(?<=[.!?])\s+/;

// 줄 하나를 문장 단위로 나눈다. 첫 문장 앞의 "결론:"·"- 판사:" 같은 머리말은 prefix 로 떼어 둔다.
function unitsOfLine(line) {
  const pm = PREFIX_RE.exec(line);
  const prefix = pm ? pm[0] : '';
  const rest = line.slice(prefix.length);
  const out = []; let pos = 0;
  for (const part of rest.split(SENT_SPLIT)) {
    const i = rest.indexOf(part, pos); if (i < 0) continue;
    pos = i + part.length;
    if (part.trim()) out.push({ start: prefix.length + i, end: prefix.length + i + part.length, text: part });
  }
  return { prefix, units: out };
}

const norm = (m) => String(m).replace(/\d+/g, '#');
function countMap(hard) { const c = new Map(); for (const h of hard) { if (IGNORED_CODES.has(h.code)) continue; const k = norm(h.message); c.set(k, (c.get(k) || 0) + 1); } return c; }

// 어느 문장이 어느 위반의 원인인지 찾는다: 그 문장을 (메모리에서만) 빼 보았을 때 위반이 줄어들면 원인이다.
// 같은 위반이 여러 문장에 걸리는 되풀이(repeat) 계열은 마지막 문장을 고친다.
function locateBadSentences(text, facts, lint) {
  const base = lint(text, facts);
  const baseCount = countMap(base.hard);
  if (!baseCount.size) return { items: [], unresolved: [] };
  const lines = text.split('\n');
  const items = []; const explained = new Map();
  lines.forEach((line, li) => {
    if (!line.trim() || /^===.+===\s*$/.test(line.trim()) || /^\[대운\d\]\s*$/.test(line.trim()) || /^근거:/.test(line.trim())) return;
    const { prefix, units } = unitsOfLine(line);
    units.forEach((u, ui) => {
      const cutLine = line.slice(0, u.start) + line.slice(u.end);
      const trial = lines.slice(); trial[li] = cutLine;
      const after = countMap(lint(trial.join('\n'), facts).hard);
      const gone = [];
      for (const [k, n] of baseCount) if ((after.get(k) || 0) < n) gone.push(k);
      if (gone.length) items.push({ li, ui, prefix, unit: u, reasons: gone });
    });
  });
  // 되풀이 계열: 같은 위반을 푸는 문장이 둘 이상이면 마지막 것만 남긴다
  const byReason = new Map();
  for (const it of items) for (const k of it.reasons) { if (!byReason.has(k)) byReason.set(k, []); byReason.get(k).push(it); }
  const keep = new Set();
  for (const [k, list] of byReason) {
    const isRepeat = /되풀이|두 번 이상|번 나옵니다/.test(k);
    if (isRepeat) { keep.add(list[list.length - 1]); explained.set(k, true); } else { list.forEach((x) => keep.add(x)); explained.set(k, true); }
  }
  const chosen = items.filter((x) => keep.has(x));
  // 되풀이 계열 때문에 뽑힌 문장은 그 이유만 가진다
  for (const it of chosen) it.reasons = it.reasons.filter((k) => !/되풀이|두 번 이상|번 나옵니다/.test(k) || byReason.get(k)[byReason.get(k).length - 1] === it);
  const unresolved = [...baseCount.keys()].filter((k) => !explained.has(k));
  return { items: chosen.filter((x) => x.reasons.length), unresolved, base };
}

const readableReason = (k) => k.replace(/#/g, 'N').replace(/\(핵심 결론 "차이:"와 시기별 운에서만 씁니다\)/, '').slice(0, 140);

function buildRepairPrompt(items) {
  const lines = items.map((it, i) => `${i + 1}. [${it.title}] ${it.sentence}\n   문제: ${it.reasons.map(readableReason).join(' / ')}${it.retry ? '\n   ※ 앞서 고쳐 쓴 결과에도 같은 문제가 남았습니다. 문제 표현을 반드시 없애고 다른 말로 바꾸세요.' : ''}`).join('\n');
  return `아래는 부모에게 전하는 아이 사주 결과지의 문장입니다. 번호 문장마다 "문제"에 적힌 점만 고쳐 같은 뜻의 문장 하나로 다시 쓰세요.

[고치는 규칙]
- 원래 뜻과 정보는 그대로 두고 문제가 된 표현만 바꿉니다. 새로운 사실·숫자·연도·나이·학년을 더하지 않습니다.
- "~하지 않지만", "~이 약하지만"처럼 없다·약하다고 한정한 말은 고친 뒤에도 그 뜻(없다·약하다)을 그대로 남깁니다. 없다고 한 것을 있다고 쓰지 않습니다.
- 문제가 된 표현은 반드시 다른 표현으로 바꿉니다. 문제 표현을 그대로 두지 않습니다.
- 문장 하나를 문장 하나로 바꿉니다(길이는 비슷하게). 문장을 줄이거나 지우지 않습니다.
- {…}로 된 표시는 글자 그대로 둡니다.
- 아이가 실제로 그렇게 한다는 말("스스로 ~합니다", "집중이 잘됩니다", "누가 시키지 않아도", "~하는 감각이 있습니다")은 쓰지 않습니다. 대신 "이 사주에서는 ~ 쪽이 두드러집니다", "~ 방식이 잘 맞습니다", "~에서 힘이 납니다", "할 일을 미리 정해 두면 ~ 환경이 어울립니다"처럼 사주가 가리키는 방향이나 부모가 만들어 줄 환경으로 씁니다.
- "겉으로"·"속에서"·"윗글자" 같은 위치 설명은 쓰지 않고, 학년(예: 고학년)은 쓰지 않습니다.
- 같은 내용이 다른 항목에 이미 있다는 문제면, 이 문장은 그 항목에서 알려 주지 않은 새 정보(생활 속 모습, 해 볼 일)로 바꿉니다.
- 문체는 "~합니다·~입니다"로 합니다.

[문장]
${lines}

[답하는 형식] 번호와 고친 문장만 한 줄씩 씁니다. 설명은 쓰지 않습니다.
1. 고친 문장
2. 고친 문장`;
}

function parseRepairReply(reply, n) {
  const out = new Map();
  for (const l of String(reply || '').split('\n')) { const m = /^\s*(\d{1,2})[.)]\s*(.+?)\s*$/.exec(l); if (m && Number(m[1]) >= 1 && Number(m[1]) <= n) out.set(Number(m[1]), m[2]); }
  return out;
}

const tokensOf = (s) => (String(s).match(TOKEN_RE) || []).sort().join('|');
const bigrams = (s) => { const t = String(s).replace(TOKEN_RE, '').replace(/[\s.,·!?"'“”()]/g, ''); const set = new Set(); for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2)); return set; };
// 고쳐 쓴 문장이 받아들일 만한지: 한 줄·문장부호로 끝남·토큰 같음·새 숫자 없음·길이 비슷·원래 문장과 어휘가 어느 정도 겹침
// 위반 이유 문구에서 문제가 된 표현을 뽑는다: "…표현(누가 시키지 않아도)", "겉으로" 같은 위치 설명
function triggersOf(reasons = []) {
  const out = [];
  for (const r of reasons) {
    for (const m of String(r).matchAll(/표현\(([^()]{2,30})\)/g)) if (!/계산 숫자/.test(m[1])) out.push(...m[1].split(/,\s*/));
    for (const m of String(r).matchAll(/"([^"]{2,12})" 같은/g)) out.push(m[1]);
  }
  return [...new Set(out.map((x) => x.trim()).filter((x) => x.length >= 2))];
}
const NEG_RE = /(않|없|못|아니|아닙|말고)/g;
function acceptableRewrite(before, after, reasons = []) {
  if (!after || /\n/.test(after) || /[{}]/.test(after.replace(TOKEN_RE, ''))) return '형식';
  if (!/[.!]$/.test(after.trim())) return '문장 끝';
  if (tokensOf(before) !== tokensOf(after)) return '표시({…}) 변경';
  // 새 숫자를 더하는 것만 막는다(원문에 있던 숫자를 빼거나 "○월 ○일"로 바꾸는 것은 허용)
  const nums = (s) => String(s).replace(TOKEN_RE, '').match(/\d+/g) || [];
  const beforeNums = new Set(nums(before));
  if (nums(after).some((n) => !beforeNums.has(n))) return '새 숫자';
  // 2단계 시험에서 "겉으로 크게 드러나지 않지만"이 "특징도 있어"로 뜻이 뒤집힌 일이 있었다: 없다·약하다고 한정한 문장은 고친 뒤에도 그 한정이 남아야 한다
  if (/(않지만|없지만|아니지만|못하지만|않으나|않고도)/.test(before) && !/(않|없|아니|못|약하|덜|아직)/.test(after)) return '한정 표현이 사라짐';
  // 문제 표현이 그대로 남았거나(2단계 시험: "스스로 판단"), 문제 표현과 상관없는 부정·한정이 사라져 뜻이 뒤집히면 받아들이지 않는다
  const trig = triggersOf(reasons);
  for (const t of trig) if (after.includes(t)) return '문제 표현이 그대로 남음';
  let base = before; for (const t of trig) base = base.split(t).join('');
  if ((base.match(NEG_RE) || []).length > (after.match(NEG_RE) || []).length) return '부정·한정 표현이 사라짐';
  // 같은 문장이 다른 항목에 되풀이된다는 문제는 "새 정보로 바꾸라"는 요청이라 길이·어휘 겹침 기준을 넓힌다(토큰·숫자·부정 표현 기준은 그대로)
  const lenient = reasons.some((x) => /되풀이/.test(x));
  const r = after.length / Math.max(1, before.length); if (r < 0.55 || r > (lenient ? 2.8 : 1.8)) return '길이';
  const a = bigrams(before), b = bigrams(after); let inter = 0; for (const x of a) if (b.has(x)) inter++;
  const jac = inter / Math.max(1, a.size + b.size - inter);
  // 되풀이·단정 문제는 문장의 형태를 바꾸라는 요청이라("~할 수 있습니다" → "이 사주에서는 ~ 쪽이 두드러집니다") 어휘 겹침 기준을 낮춘다. 토큰·숫자·부정 표현 기준은 그대로다.
  const reform = lenient || reasons.some((x) => /단정/.test(x));
  if (jac < (lenient ? 0 : reform ? 0.08 : 0.22)) return '뜻이 달라짐';
  return '';
}

// 예시용 숫자("매일 20개씩")는 "예를 들어"와 함께 써야 한다. 뜻을 바꾸지 않는 결정적 보정이라 AI 호출 없이 서버가 "예를 들어 "를 문장 앞에 붙인다.
// 토큰({…}) 밖에 숫자가 있는 문장만 대상이다(날짜·나이는 토큰으로만 쓰므로 AI가 쓴 숫자는 모두 예시 숫자다).
function addExampleMarker(text) {
  const fixes = [];
  const lines = text.split('\n').map((line) => {
    if (!line.trim() || /^===.+===\s*$/.test(line.trim()) || /^\[대운\d\]\s*$/.test(line.trim()) || /^근거:/.test(line.trim())) return line;
    const { units } = unitsOfLine(line); let out = line;
    for (const u of units.slice().reverse()) {
      if (!/\d/.test(u.text.replace(TOKEN_RE, '')) || /예를 들어/.test(u.text)) continue;
      const fixed = '예를 들어 ' + u.text; out = out.slice(0, u.start) + fixed + out.slice(u.end); fixes.push({ before: u.text, after: fixed, reasons: ['예시 숫자에 "예를 들어" 추가(서버 보정)'] });
    }
    return out;
  });
  return { text: lines.join('\n'), fixes };
}

// text: 검사에 걸린 AI 원문. lint(text, facts) → {hard, soft}. callRepair(prompt) → { text }.
// 돌려주는 값: { text, repairs:[{before,after,reasons}], rejected:[...], rounds, unresolved } — 호출한 쪽이 다시 검사해 통과 여부를 정한다.
async function repairSentences({ text, facts, lint, callRepair, maxRounds = 2, titleOf = () => '' }) {
  const pre = addExampleMarker(text);
  let cur = pre.text; const tried = new Set(); const repairs = [...pre.fixes]; const rejected = []; let rounds = 0; let unresolved = [];
  for (; rounds < maxRounds; rounds++) {
    const loc = locateBadSentences(cur, facts, lint);
    unresolved = loc.unresolved;
    if (!loc.items.length) break;
    const secAt = (li) => { let t = ''; const ls = cur.split('\n'); for (let i = 0; i <= li; i++) { const h = /^===(.+)===\s*$/.exec(ls[i].trim()); if (h) t = h[1].trim(); } return t; };
    const items = loc.items.map((it) => ({ ...it, title: secAt(it.li), sentence: it.unit.text, retry: tried.has(it.unit.text) }));
    items.forEach((it) => tried.add(it.sentence));
    const reply = await callRepair(buildRepairPrompt(items));
    const got = parseRepairReply(reply && reply.text !== undefined ? reply.text : reply, items.length);
    const lines = cur.split('\n');
    // 같은 줄의 여러 문장을 고칠 때 위치가 어긋나지 않게 뒤에서부터 끼운다
    const order = items.map((it, i) => ({ it, i })).sort((x, y) => (y.it.li - x.it.li) || (y.it.unit.start - x.it.unit.start));
    let changed = 0;
    for (const { it, i } of order) {
      const after = got.get(i + 1); const why = after ? acceptableRewrite(it.sentence, after, it.reasons) : '답 없음';
      if (why) { rejected.push({ before: it.sentence, after: after || '', why }); continue; }
      const line = lines[it.li];
      lines[it.li] = line.slice(0, it.unit.start) + after + line.slice(it.unit.end);
      repairs.push({ before: it.sentence, after, reasons: it.reasons }); changed++;
    }
    cur = lines.join('\n');
  }
  return { text: cur, repairs, rejected, rounds, unresolved };
}

module.exports = { addExampleMarker, triggersOf, repairSentences, locateBadSentences, buildRepairPrompt, parseRepairReply, acceptableRewrite, unitsOfLine };
