// 실제 AI 풀이 품질 확인용 최소 점검 (3건: 내 사주 1, 형제자매·가족 궁합 1, 직장 동료 궁합 1).
// 기본은 계획만 출력한다(네트워크·AI 호출 없음). 실제 호출은 아래 두 조건이 모두 있을 때만 한다.
//   1) 실제 키가 설정된 로컬 백엔드(node server.js, ANTHROPIC_BASE_URL 없이)가 떠 있을 것
//   2) CONFIRM_REAL_AI_CALLS=yes  와 --run 플래그
// 사용:  node dev/quality-check.js            → 계획·예상 비용만 출력
//        CONFIRM_REAL_AI_CALLS=yes node dev/quality-check.js --run   → 3건 실제 호출 후 점검 리포트 저장
// 입력은 모두 가상의 성인 정보다. 키 값은 이 스크립트가 읽지도 출력하지도 않는다.
const fs = require('fs');
const os = require('os');
const path = require('path');

const API = process.env.QC_API || 'http://localhost:4000';
const OUT_DIR = process.env.QC_OUT || path.join(os.tmpdir(), 'mysaju-quality');

const CASES = [
  { id: 'saju', label: '내 사주 무료', body: { type: '기본', gender: '여성', birthdate: '1991-08-23', birthtime: '07:30', isLunar: false, maritalStatus: '미혼', mbti: 'ISFJ', blood: 'A', userName: '하늘', isPaid: false }, maxTokens: 3000 },
  { id: 'family', label: '형제자매·기타 가족 궁합 무료', body: { type: '궁합무료', 관계유형: '형제가족', 내역할: '', gender: '남성', birthdate: '1988-11-04', birthtime: '', isLunar: false, myName: '도윤', partnerGender: '여성', partnerBirthdate: '1993-02-17', partnerBirthtime: '', partnerIsLunar: false, partnerName: '서연', isPaid: false }, maxTokens: 2500 },
  { id: 'work', label: '직장 동료·상사 궁합 무료', body: { type: '궁합무료', 관계유형: '직장동료', 내역할: '', gender: '여성', birthdate: '1995-06-12', birthtime: '14:20', isLunar: false, myName: '지우', partnerGender: '남성', partnerBirthdate: '1984-09-30', partnerBirthtime: '', partnerIsLunar: false, partnerName: '민준', isPaid: false }, maxTokens: 2500 },
];

// 비용 계산 근거: claude-haiku-4-5 입력 $1 / 출력 $5 (100만 토큰당). 프롬프트 약 2,400~2,900자.
const PRICE = { inPerM: 1, outPerM: 5 };
function plan() {
  const rows = CASES.map(c => ({ ...c, inTokMax: 4500, outTokMax: c.maxTokens, outTokTypical: 2000 }));
  const worst = rows.reduce((s, r) => s + r.inTokMax * PRICE.inPerM / 1e6 + r.outTokMax * PRICE.outPerM / 1e6, 0);
  const typical = rows.reduce((s, r) => s + 3500 * PRICE.inPerM / 1e6 + r.outTokTypical * PRICE.outPerM / 1e6, 0);
  console.log('모델: claude-haiku-4-5-20251001 (무료 풀이 공통, server.js MODEL_FREE)');
  rows.forEach(r => console.log(`- ${r.label}: 최대 출력 ${r.maxTokens}토큰`));
  console.log(`예상 총비용: 일반적으로 약 $${typical.toFixed(3)}, 상한(입력 4,500토큰·출력 한도까지 전부 사용) $${worst.toFixed(3)}`);
  console.log('점검 항목: 입력 반영/구체성, 연애·결혼 해석 혼입, 해석-팁 연결, 형식·화면 표시, 상투적 고생·불안 표현');
}

// ── 응답 수집 ──
async function call(body) {
  const res = await fetch(API + '/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const raw = await res.text();
  const out = { text: '', done: false, error: '', meta: null, sajuEvent: null };
  for (const block of raw.split('\n\n')) {
    const line = block.split('\n').find(l => l.startsWith('data: '));
    if (!line) continue;
    let j; try { j = JSON.parse(line.slice(6)); } catch { continue; }
    if (j.type === 'done') out.done = true;
    else if (j.type === 'gunghab_saju') out.meta = j;
    else if (j.type === 'saju') out.sajuEvent = j;
    else if (j.error) out.error = j.error;
    else if (typeof j.text === 'string' && !j.type) out.text += j.text;
  }
  return out;
}

// ── 점검 ──
const ROMANCE = /결혼|연애|배우자|연인|혼인|이성|애정|사랑|데이트|동거/;
const STOCK = /그동안 많이 힘드|많이 힘드셨|그럴 수밖에 없었|고생 많으셨|얼마나 힘드/;
const NEG = /힘들|힘드|고생|불안|외로|상처|걱정|아픔|괴로/g;
const SECTION_RE = /===(.+?)===/g;
const HANJA = /[一-鿿]/;
// 따옴표 안(대화 문장)은 해요체 검사에서 뺀다
const stripQuotes = (t) => t.replace(/"[^"\n]*"/g, '').replace(/“[^”\n]*”/g, '');
// 해요체가 아닌 문장 끝(~다, ~합니다, ~습니다 등)을 찾는다
function nonHaeyo(t) {
  const out = [];
  for (const raw of stripQuotes(t).split(/\n+/)) {
    const line = raw.replace(/^\s*(해설|팁)\s*[:：]\s*/, '').trim();
    if (!line || line.startsWith('===')) continue;
    for (const sent of line.split(/(?<=[.!?])\s+/)) {
      const e = sent.trim().replace(/[.!?)"”'\s]+$/g, '');
      if (e && /다$/.test(e)) out.push(e.slice(-25));
    }
  }
  return out;
}
// 계산값·입력값으로 뒷받침되지 않는 성격·행동 단정 어휘
const TRAITS = /차분|내향|외향|활동적|행동력|침묵으로|말없이|말 없이|직관적|소극적|적극적|낯을 가|추진력이 좋/;
// 오행끼리의 임의 인과: 표(상생/상극)에 없는 방향이면 위반
const EL = { 나무: '목', 불: '화', 흙: '토', 쇠: '금', 물: '수' };
const SANG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }, GEUK = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
function badElementClaims(t) {
  const bad = [];
  const re = /(나무|불|흙|쇠|물)(?: 기운)?(?:이|가|은|는)\s*(나무|불|흙|쇠|물)(?: 기운)?(?:을|를)\s*(키워|키우|누르|눌러|일구|일군|생해|도와|극해)/g;
  let m;
  while ((m = re.exec(t))) {
    const a = EL[m[1]], b = EL[m[2]], v = m[3];
    const ok = /키워|키우|생해|도와/.test(v) ? SANG[a] === b : /누르|눌러|극해/.test(v) ? GEUK[a] === b : false;
    if (!ok) bad.push(m[0]);
  }
  return bad;
}
// 표준 상생·상극에서 한 단계 더 나간 비유·인과 (예: "쇠가 나무를 다듬는 도구로 작동", "압력이 성장에 도움")
const OVERREACH = /(도구|무기|재료|연료)(로|처럼)\s*(작동|쓰이|쓰여|활용|기능)|다듬는 도구|압력(이|은|을).{0,15}(성장|밑거름|도움이)|눌리면서\s*오히려|오히려\s*(단단|강해|성장)/;
// 계산값만으로 단정된 구체적 심리·행동 (이번 확인에서 실제로 나온 표현들)
const ASSERT_BEHAVIOR = /범위를\s*(계속\s*)?넓혀가?려|넓히려는 경향|무게감을 느끼|조심스러워하는 경향|빠르게 표현하는 경향|천천히 생각해서 말하는 경향|책임감을 느끼는 편|책임감이 (있|강)/;
// 입력하지 않은 지난 일·특정 행동을 가정하는 대화
const ASSUMED_PAST = /요즘|자꾸|맨날|매번|항상 그렇|또 이렇게|지난번|아까/;
// 존댓말(해요체·합쇼체) 문장 끝 / 반말 문장 끝
const POLITE_END = /(요|니다|니까|죠|세요|까요)[?.!]?$/;
const sentencesOf = (t) => t.replace(/^["“]|["”]$/g, '').split(/(?<=[.?!])\s+/).map(x => x.trim()).filter(Boolean);
const { validateDialogueLine } = require('../relations');
const sections = (t) => { const parts = t.split(/===(.+?)===/s); const m = {}; for (let i = 1; i < parts.length; i += 2) m[parts[i].trim()] = (parts[i + 1] || '').trim(); return m; };
const words = (t) => (t.match(/[가-힣]{2,}/g) || []).filter(w => !/^(있어요|해보세요|이에요|같아요|수도|경향|해보면|좋아요|있을|나타날|때문에)$/.test(w));
const overlap = (a, b) => { const A = new Set(words(a).map(w => w.slice(0, 2))); return words(b).map(w => w.slice(0, 2)).filter(w => A.has(w)); };
const bigrams = (t) => { const s = t.replace(/\s+/g, ''); const set = new Set(); for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2)); return set; };
const jaccard = (a, b) => { const A = bigrams(a), B = bigrams(b); let n = 0; A.forEach(x => { if (B.has(x)) n++; }); return n / (A.size + B.size - n || 1); };

function common(c, o, add) {
  add('스트림이 완료(done)되고 오류 없음', o.done && !o.error, o.error);
  add('문장이 끝맺음으로 마무리(잘림 없음)', /[.!?요다"”)]\s*$/.test(o.text.trim()), o.text.trim().slice(-30));
  add('점수·순위·퍼센트·연도·나이 숫자 없음', !/(\d+\s*점|상위|\d+\s*%|\d{4}\s*년|\d{1,3}\s*세)/.test(o.text), (o.text.match(/\d+\s*점|상위|\d+\s*%|\d{4}\s*년|\d{1,3}\s*세/) || [])[0]);
  add('한자·마크다운 기호 없음', !HANJA.test(o.text) && !/\*\*|^#{1,6} /m.test(o.text));
  add('상투적 일괄 공감 문구 없음', !STOCK.test(o.text), (o.text.match(STOCK) || [])[0]);
  add('해요체 통일 (~다/~합니다/~습니다 없음, 대화 문장 제외)', nonHaeyo(o.text).length === 0, nonHaeyo(o.text).join(' | '));
  add('계산값·입력값에 없는 성격·행동 단정 어휘 없음 (차분·내향·활동적·행동력 등)', !TRAITS.test(o.text), (o.text.match(TRAITS) || [])[0]);
  add('오행끼리의 임의 인과(상생·상극 표에 없는 설명) 없음', badElementClaims(o.text).length === 0 && !/흙을 일군|일군다|일구/.test(o.text), badElementClaims(o.text).join(' | '));
  add('표준 오행 관계에서 한 단계 더 나간 비유·인과 없음 ("도구로 작동", "압력이 성장에 도움" 등)', !OVERREACH.test(o.text), (o.text.match(OVERREACH) || [])[0]);
  add('계산값만으로 한 구체적 심리·행동 단정 없음 ("범위를 넓히려", "무게감을 느낀다" 등)', !ASSERT_BEHAVIOR.test(o.text), (o.text.match(ASSERT_BEHAVIOR) || [])[0]);
  add('"undefined"·빈 입력 흔적 없음', !/undefined|null/.test(o.text));
}

function checkSaju(c, o, add) {
  const s = sections(o.text);
  const need = ['핵심 한 문장', '이런 성향이 나오는 이유', '나의 강점', '주의할 습관', '바로 실천할 팁'];
  add('형식: 요구한 5개 섹션 모두 존재', need.every(k => s[k]), need.filter(k => !s[k]).join(','));
  add('형식: 정해진 섹션 외 추가 섹션 없음', Object.keys(s).every(k => need.includes(k)), Object.keys(s).filter(k => !need.includes(k)).join(','));
  const core = (s['핵심 한 문장'] || '').split('\n').filter(Boolean);
  add('핵심 한 문장: 첫 줄 한 문장 + 생활 장면 설명', core.length >= 2 && (core[0].match(/[.!?]|요\.|다\./g) || []).length <= 2, core[0]);
  add('별명식 유형 이름(~형) 없음', !/[가-힣]{2,}형(이에요|입니다|이라|으로|이다)/.test(o.text));
  add('팁이 주의할 습관과 같은 장면·주제로 연결 (겹치는 말 2개 이상, 수동 확인 권장)', overlap(s['주의할 습관'] || '', s['바로 실천할 팁'] || '').length >= 2, overlap(s['주의할 습관'] || '', s['바로 실천할 팁'] || '').join(','));
  add('일반 조언("충분히 쉬세요" 등) 없음', !/충분히 쉬|긍정적으로 생각|스트레스를 풀/.test(s['바로 실천할 팁'] || ''));
  const han = (t) => String(t || '').replace(/[가-힣]/g, '');
  const sj = (o.sajuEvent && o.sajuEvent.사주) || {};
  add('계산 경로: 응답의 년·월·일·시주가 검증값(辛未·丙申·乙丑·庚辰)과 같음', han(sj.년주) === '辛未' && han(sj.월주) === '丙申' && han(sj.일주) === '乙丑' && han(sj.시주) === '庚辰', JSON.stringify(sj));
  add('핵심 한 문장 첫 줄은 오행 전문용어 없이 쉬운 말 (기운·오행·일간·일주 없음)', !/기운|오행|일간|일주|나무|흙|쇠/.test(core[0] || ''), core[0]);
  add('강점 섹션에는 강점만 (행동 권유 "~세요"·부담/주의 표현 없음)', !/세요[.!]?(\s|$)|무게감|부담|힘들|주의/.test(s['나의 강점'] || ''), (s['나의 강점'] || '').slice(-60));
  add('주의할 습관 섹션에는 주의점만 (행동 권유 "~세요" 없음, 행동은 팁 섹션에)', !/세요[.!]?(\s|$)/.test(s['주의할 습관'] || ''), (s['주의할 습관'] || '').slice(-60));
  add('입력하지 않은 일·프로젝트·직장 가정 없음', !/프로젝트|업무|회사|직장/.test(o.text), (o.text.match(/프로젝트|업무|회사|직장/) || [])[0]);
  add('이유 섹션은 짧게 (350자 이하)', (s['이런 성향이 나오는 이유'] || '').length <= 350, String((s['이런 성향이 나오는 이유'] || '').length));
}

function checkGunghab(c, o, add) {
  const s = sections(o.text);
  const bars = (o.meta && o.meta.bars) || [];
  const need = ['한 줄 요약', '관계 요약', ...bars.map(b => b.label), '잘 맞는 점', '조율할 점', '대화 문장'];
  add('형식: 요구한 섹션 모두 존재 (바 3개 포함)', bars.length === 3 && need.every(k => s[k]), need.filter(k => !s[k]).join(','));
  add('형식: 추가 섹션 없음', Object.keys(s).every(k => need.includes(k)), Object.keys(s).filter(k => !need.includes(k)).join(','));
  add('한 줄 요약은 한 문장', ((s['한 줄 요약'] || '').split('\n').filter(Boolean).length === 1));
  const tips = bars.map(b => ((s[b.label] || '').split('\n').find(l => /^팁\s*[:：]/.test(l.trim())) || '').replace(/^\s*팁\s*[:：]\s*/, ''));
  const cmts = bars.map(b => ((s[b.label] || '').split('\n').find(l => /^해설\s*[:：]/.test(l.trim())) || '').replace(/^\s*해설\s*[:：]\s*/, ''));
  add('각 바에 해설 1줄 + 팁 1줄', tips.every(Boolean) && cmts.every(Boolean), JSON.stringify({ tips, cmts }));
  add('세 팁이 서로 다른 상황·행동', new Set(tips).size === 3 && jaccard(tips[0], tips[1]) < 0.5 && jaccard(tips[1], tips[2]) < 0.5);
  add('각 팁이 같은 항목의 해설과 연결 (겹치는 말 1개 이상, 수동 확인 권장)', tips.every((t, i) => overlap(cmts[i], t).length >= 1));
  add('일반 조언 없음', !/대화를 많이 하세요|서로 존중하세요|이해하려고 노력/.test(o.text));
  add('대화 문장은 따옴표 한 문장, 조율할 점과 연결', /^["“].+["”]$/s.test((s['대화 문장'] || '').trim()) && overlap(s['조율할 점'] || '', s['대화 문장'] || '').length >= 1, s['대화 문장']);
  const lineSent = sentencesOf((s['대화 문장'] || '').trim());
  add('대화 문장은 정확히 한 문장', lineSent.length === 1, s['대화 문장']);
  const dl = validateDialogueLine(s['대화 문장']);
  add('대화 문장은 존댓말 (가족·직장 모두 반말 금지, 직장은 필수)', dl.ok, dl.reasons.join(' | ') + ' → ' + s['대화 문장']);
  add('대화 문장이 지난 일·특정 행동을 가정하지 않음 ("요즘 자꾸" 등)', !ASSUMED_PAST.test(s['대화 문장'] || ''), (s['대화 문장'] || '').match(ASSUMED_PAST) && (s['대화 문장'] || '').match(ASSUMED_PAST)[0]);
  const names = [c.body.myName, c.body.partnerName].filter(Boolean);
  const traitSent = o.text.split(/(?<=[.?!])\s+|\n/).filter(x => names.some(n => new RegExp(n + '님(은|는)[^.]{0,40}경향이 있').test(x)));
  add('한 사람의 성향을 "OO님은 ~하는 경향이 있어요"로 단정하지 않음 (관계에서 생길 수 있는 상황으로)', traitSent.length === 0, traitSent[0]);
  add('대화 문장이 이미 있었던 갈등을 가정하지 않음 (해명·사과 표현 없음)', !/그런 뜻이 아니|미안해|죄송|그렇게 들렸다면|오해하게 해서|지난번에/.test(s['대화 문장'] || ''), s['대화 문장']);
  add('연애·결혼 상대 해석 혼입 없음 (가족·직장)', !ROMANCE.test(o.text), (o.text.match(ROMANCE) || [])[0]);
  const REL_WORDS = c.id === 'work' ? ['업무', '일정', '피드백', '역할', '마감', '우선순위', '회의', '협업', '책임'] : ['가족', '명절', '모임', '부탁', '거리', '비교', '형제', '자매', '남매', '연락'];
  const hit = REL_WORDS.filter(w => o.text.includes(w));
  add('관계에 맞는 실제 상황어 사용 (2개 이상)', hit.length >= 2, hit.join(','));
}

function screenCheck(c, o, add, rel) {
  // 화면과 같은 파서로 읽어 비어 있는 칸이 없는지 본다 (frontend/src/relations.js)
  if (c.id === 'saju') {
    const r = rel.parseMyFree(o.text);
    add('화면 표시: 핵심 문장·설명·이유·강점·습관·팁이 모두 파싱됨', !!(r.sentence && r.detail && r.why && r.strength && r.habit && r.tip), JSON.stringify(Object.keys(r).filter(k => !r[k])));
  } else {
    const r = rel.parseGunghabFree(o.text, (o.meta && o.meta.bars) || []);
    add('화면 파서가 해설·팁 누락을 감지하지 않음 (바 3개 모두 "해설:"+"팁:" 라벨)', !(r.barIssues || []).length, (r.barIssues || []).join(' | '));
    add('화면 표시: 한 줄 요약·요약·바 3개(해설+팁)·잘 맞는 점·조율할 점·대화 문장 파싱됨', !!(r.headline && r.summary && r.good && r.tune && r.line) && r.bars.length === 3 && r.bars.every(b => b.comment && b.tip));
  }
}

async function run() {
  const rel = await import(require('url').pathToFileURL(path.join(__dirname, '..', '..', 'frontend', 'src', 'relations.js')).href);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outputs = {}; const report = [];
  for (const c of CASES) {
    const o = await call(c.body);
    outputs[c.id] = o;
    const checks = [];
    const add = (name, ok, extra) => checks.push({ name, ok: !!ok, extra: ok ? '' : String(extra || '').slice(0, 200) });
    common(c, o, add);
    (c.id === 'saju' ? checkSaju : checkGunghab)(c, o, add);
    screenCheck(c, o, add, rel);
    const neg = (o.text.match(NEG) || []).length;
    report.push({ id: c.id, label: c.label, chars: o.text.length, negativeWordCount: neg, checks });
  }
  const fam = outputs.family.text, work = outputs.work.text;
  const sim = jaccard(fam, work);
  const negAll = Object.values(outputs).every(o => (o.text.match(NEG) || []).length >= 3);
  report.push({ id: 'cross', label: '3건 비교', checks: [
    { name: '가족 vs 직장 궁합 풀이가 서로 다름 (글자쌍 유사도 0.35 미만)', ok: sim < 0.35, extra: 'similarity=' + sim.toFixed(2) },
    { name: '3건 모두에 같은 고생·불안 계열 표현이 3회 이상 붙지 않음', ok: !negAll, extra: '' },
  ] });
  fs.writeFileSync(path.join(OUT_DIR, 'quality-outputs.json'), JSON.stringify({ saju: outputs.saju.text, '형제자매·기타 가족': outputs.family.text, '직장 동료·상사': outputs.work.text, meta: { saju: outputs.saju.sajuEvent, family: outputs.family.meta, work: outputs.work.meta } }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'quality-report.json'), JSON.stringify(report, null, 2));
  for (const r of report) { console.log(`\n[${r.label}]`); r.checks.forEach(k => console.log((k.ok ? '  PASS ' : '  FAIL ') + k.name + (k.ok ? '' : '  → ' + k.extra))); }
  console.log('\n저장 위치:', OUT_DIR, '(quality-report.json, quality-outputs.json)');
  console.log('※ 자동 점검은 형식·금지 표현·연결 휴리스틱만 본다. 문장의 자연스러움과 구체성은 quality-outputs.json을 직접 읽어 판단한다.');
}

module.exports = { OVERREACH, ASSERT_BEHAVIOR, ASSUMED_PAST, POLITE_END, sentencesOf };
if (require.main === module) (async () => {
  plan();
  if (!process.argv.includes('--run')) { console.log('\n(계획만 출력했습니다. 실제 호출은 하지 않았습니다.)'); return; }
  if (process.env.CONFIRM_REAL_AI_CALLS !== 'yes') { console.log('\nCONFIRM_REAL_AI_CALLS=yes 가 없어 실행하지 않습니다.'); process.exit(2); }
  const ping = await fetch(API + '/ping').then(r => r.ok).catch(() => false);
  if (!ping) { console.log('\n백엔드(' + API + ')에 연결할 수 없습니다. 실제 키로 backend 를 먼저 실행하세요.'); process.exit(2); }
  await run();
})();
