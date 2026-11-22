// 쉬운 말 용어집, 직업·사업 예시 사전, 서버가 확정하는 문장(판정 근거 쉬운 말, 시기별 쉬운 말 요약, 사주 풀이 근거 줄).
// AI는 개수·연도·십성을 직접 세거나 연결하지 않는다. 숫자와 십성 이름이 들어가는 줄은 이 파일에서 서버가 만든다. 이 파일은 AI를 호출하지 않는다.
const { GROUP_OF, SIDE_OF } = require('./successChildCompare');

// 십성 → 본문에 쓸 쉬운 말(전문 용어 없이)
const PLAIN_GOD = {
  비견: '혼자 해내는 힘', 겁재: '경쟁하며 밀고 나가는 힘',
  식신: '꾸준히 자라는 재능', 상관: '날카롭게 드러나는 재능',
  편재: '움직이는 돈의 흐름', 정재: '쌓이는 돈의 흐름',
  편관: '경쟁이 강한 평가 환경', 정관: '안정된 제도 안의 인정',
  편인: '깊이 파고드는 배움', 정인: '꾸준히 쌓는 배움',
};
// 십성 그룹 → 돌려 쓸 쉬운 말(같은 말을 되풀이하지 않도록 여러 개)
const PLAIN_GROUP = {
  식상: ['표현력', '만드는 재능', '생각을 꺼내 보여 주는 힘'],
  재성: ['돈 감각', '거래 감각', '값을 따지고 흥정하는 감각'],
  관성: ['시험·자격 같은 기준에 맞추는 힘', '제도 안에서 인정받는 힘', '정해진 절차를 지키는 힘'],
  인성: ['배운 것을 쌓는 힘', '학습 체력', '깊이 파고드는 힘'],
  비겁: ['혼자 해내는 힘', '독립심', '경쟁심'],
};

// 직업·사업 예시 사전(십성의 뜻에서 나온 방향 예시). 사전에 없는 직업·사업은 쓰지 않는다.
const JOB_DICT = {
  식상: ['웹툰 작가', '제과제빵사', '영상 편집자', '학원 강사', '요리사', '디자이너'],
  재성: ['공인중개사', '영업사원', '유통 MD', '무역 담당자'],
  인성: ['초등학교 교사', '연구원', '번역가', '변리사'],
  관성: ['회계사', '간호사', '공무원', '판사'],
};
const BIZ_DICT = {
  식상: ['동네 베이커리', '카페', '온라인 쇼핑몰', '온라인 강의'],
  재성: ['부동산 중개사무소', '도소매 매장', '무역'],
  인성: ['학원 운영', '교재·문제집 출판', '교재와 문제집 출판'],
  관성: ['세무사', '회계 사무소', '약국'],
};
const ALL_JOBS = Object.values(JOB_DICT).flat();
const ALL_BIZ = Object.values(BIZ_DICT).flat();
const SHOWN_BIZ = { 식상: ['동네 베이커리나 카페', '직접 만든 상품을 파는 온라인 쇼핑몰', '온라인 강의 판매'], 재성: ['부동산 중개사무소', '도소매 매장', '무역'], 인성: ['학원 운영', '교재·문제집 출판'], 관성: ['세무사·회계 사무소', '약국'] };

const ALLOWED = { A: ['식상', '재성', '인성'], B: ['관성', '인성', '식상'], C: ['관성', '식상', '인성'] };

// 예시마다 '일의 모습'(work)과 그 일에 가장 가까운 십성(pref, 가까운 순)을 정해 둔다.
// 추천 이유는 AI가 쓰지 않고, 이 아이의 사주에 pref 십성이 실제로 있는지 보고 서버가 쓴다(reasonFor).
// work 는 AI가 쓰는 '그 일이 무엇인지' 문장과 겹치지 않게 그 일의 '방식'만 짧게 적고, 반드시 '방식'으로 끝난다(뒤에 '과' 조사가 붙는다).
const JOB_INFO = {
  '웹툰 작가': { pref: ['상관', '식신'], work: '혼자 이야기를 만들어 독자의 반응을 받는 방식' },
  '제과제빵사': { pref: ['식신', '정재'], work: '같은 작업을 반복하며 손끝으로 다듬는 방식' },
  '영상 편집자': { pref: ['상관', '식신'], work: '장면을 골라 이어 붙여 흐름을 만드는 방식' },
  '학원 강사': { pref: ['식신', '정인'], work: '아는 것을 쉽게 풀어 전달하는 방식' },
  '요리사': { pref: ['식신', '정재'], work: '같은 요리를 거듭 다듬어 완성도를 높이는 방식' },
  '디자이너': { pref: ['상관', '식신'], work: '생각을 눈에 보이는 모양으로 꺼내 보이는 방식' },
  '공인중개사': { pref: ['편재', '정재'], work: '사는 사람과 파는 사람 사이에서 값과 조건을 맞추는 방식' },
  '영업사원': { pref: ['편재', '상관'], work: '사람을 만나 값과 조건을 협상하는 방식' },
  '유통 MD': { pref: ['편재', '정재'], work: '무엇을 얼마에 들여 팔지 따져 정하는 방식' },
  '무역 담당자': { pref: ['편재', '정재'], work: '나라 사이의 거래와 값을 맞추는 방식' },
  '초등학교 교사': { pref: ['정인', '정관'], work: '정해진 교과를 차례로 가르치며 이끄는 방식' },
  '연구원': { pref: ['편인', '정인'], work: '한 주제를 오래 파고들어 새로 알아내는 방식' },
  '번역가': { pref: ['정인', '편인'], work: '글을 깊이 읽고 정확하게 옮기는 방식' },
  '변리사': { pref: ['편인', '정관'], work: '기술과 법 규정을 함께 파고드는 방식' },
  '회계사': { pref: ['정관', '정재'], work: '숫자를 정해진 기준에 맞춰 확인하는 방식' },
  '간호사': { pref: ['정관', '정인'], work: '정해진 절차에 따라 사람을 돌보는 방식' },
  '공무원': { pref: ['정관', '정인'], work: '정해진 제도와 절차 안에서 일을 처리하는 방식' },
  '판사': { pref: ['편관', '정관'], work: '기준과 증거를 따져 판단하는 방식' },
};
const BIZ_INFO = {
  '동네 베이커리나 카페': { pref: ['식신', '정재'], work: '손으로 만든 것을 동네 손님에게 파는 방식' },
  '직접 만든 상품을 파는 온라인 쇼핑몰': { pref: ['상관', '편재'], work: '내가 만든 상품에 값을 붙여 온라인에서 파는 방식' },
  '온라인 강의 판매': { pref: ['식신', '정인'], work: '아는 것을 강의로 만들어 되풀이해 파는 방식' },
  '부동산 중개사무소': { pref: ['편재', '정재'], work: '사는 사람과 파는 사람을 이어 주는 방식' },
  '도소매 매장': { pref: ['편재', '정재'], work: '물건을 들여와 값을 붙여 파는 방식' },
  '무역': { pref: ['편재', '상관'], work: '다른 나라와 물건을 사고파는 방식' },
  '학원 운영': { pref: ['정인', '정관'], work: '가르치는 일을 정해진 과정과 규칙에 맞춰 꾸려 가는 방식' },
  '교재·문제집 출판': { pref: ['정인', '편인'], work: '쌓아 둔 지식을 책으로 엮어 파는 방식' },
  '세무사·회계 사무소': { pref: ['정관', '정재'], work: '자격을 갖추고 고객의 숫자와 신고를 맡는 방식' },
  '약국': { pref: ['정관', '정인'], work: '면허와 정해진 절차를 지키며 약을 조제해 파는 방식' },
};
const infoOf = (table, name) => {
  const n = String(name || '').trim();
  if (table[n]) return { key: n, ...table[n] };
  const k = Object.keys(table).find((key) => n && (n.includes(key) || key.includes(n)));
  return k ? { key: k, ...table[k] } : null;
};
const groupOfName = (dict, name) => Object.keys(dict).find((g) => dict[g].some((x) => name === x || name.includes(x) || x.includes(name))) || null;

// 이 사주에 그 십성이 얼마나 있는지: 'many'(겉으로 2번 이상) / 'surface'(겉으로 1번) / 'hidden'(지장간 깊은 곳에만) / 'none'
function presence(facts, god) {
  const t = facts.calc.tenGods; const s = (t.surface.gods || {})[god] || 0; const h = (t.withHidden.gods || {})[god] || 0;
  return s >= 2 ? 'many' : s === 1 ? 'surface' : h > 0 ? 'hidden' : 'none';
}
// 예시가 이 사주에 얼마나 가까운지(높을수록 먼저 추천): 가까운 십성이 겉으로 드러나 있으면 높고, 지장간에만 있으면 낮다.
function affinity(facts, info) {
  if (!info) return 0;
  const W = { many: 5, surface: 4, hidden: 1, none: 0 };
  return info.pref.reduce((sum, g, i) => sum + W[presence(facts, g)] * (i === 0 ? 2 : 1), 0);
}

// 추천 이유(서버가 쓴다). 항목마다 일의 모습이 다르고, 이 아이 사주에 실제로 있는 십성만 근거로 쓴다. 없으면 없다고 밝히고 후보로만 소개한다.
// 추천 이유는 휴대전화로 읽기 좋게 두 문장으로 쓴다("이 사주에 있는 힘" → "그 힘이 이어지는 일의 방식"). 문형은 항목 순서(idx)에 따라 세 가지를 돌려 쓰고, 모두 '이어집니다'로 끝난다.
const LEVEL_PHRASE = { many: '이 사주에 여러 번 나타납니다', surface: '이 사주에 뚜렷하게 나타납니다', hidden: '이 사주 안쪽에서 받쳐 줍니다' };
function reasonFor(facts, name, kind, idx = 0) {
  const table = kind === 'biz' ? BIZ_INFO : JOB_INFO; const dict = kind === 'biz' ? SHOWN_BIZ : JOB_DICT;
  const info = infoOf(table, name);
  if (!info) return '';
  const hit = info.pref.map((g) => ({ g, p: presence(facts, g) })).find((x) => x.p !== 'none');
  if (hit) {
    const L = PLAIN_GOD[hit.g], v = idx % 3;
    const P = LEVEL_PHRASE[hit.p];
    if (v === 1) return `${L} 쪽의 힘이 ${P}. 이 힘은 ${info.work}과 이어집니다.`;
    if (v === 2) return `${L} 쪽이 ${P}. 이 점이 ${info.work}과 이어집니다.`;
    return `${L} 쪽이 ${P}. 이는 ${info.work}과 이어집니다.`;
  }
  const grp = groupOfName(dict, info.key) || groupOfName(dict, name);
  const lack = grp ? PLAIN_GROUP[grp][0] : '이쪽 힘';
  return `이 사주에서는 ${lack}이 뚜렷하게 나타나지 않아 후보로만 소개합니다. 아이가 ${info.work}에 관심을 보이는지 먼저 살펴봅니다.`;
}

// 추천 후보: 판정에는 쓰지 않고, 직업·사업 예시를 고를 때만 쓴다. 유형별로 어울리는 십성 그룹 안에서 겉으로 드러난 개수 → 지장간 포함 개수 순.
// 같은 그룹 안에서는 이 사주의 십성과 가까운 예시(affinity)를 먼저 고른다.
function pickExamples(facts) {
  const t = facts.calc.tenGods; const type = facts.compare ? facts.compare.type : 'C';
  const allowed = ALLOWED[type];
  const rank = (g) => (t.surface.groups[g] || 0) * 2 + (t.withHidden.groups[g] || 0);
  const groups = allowed.filter((g) => (t.surface.groups[g] || 0) > 0).sort((a, b) => rank(b) - rank(a) || allowed.indexOf(a) - allowed.indexOf(b));
  const order = groups.length ? groups : [allowed[0]];
  const take = (dictRaw, n, table) => {
    const dict = Object.fromEntries(Object.entries(dictRaw).map(([g, list]) => [g, list.map((name, i) => ({ name, i, a: affinity(facts, infoOf(table, name)) })).sort((x, y) => y.a - x.a || x.i - y.i).map((x) => x.name)]));
    const out = []; const idx = Object.fromEntries(order.map((g) => [g, 0]));
    for (let round = 0; out.length < n && round < 8; round++) for (const g of order) { const list = dict[g]; if (out.length < n && idx[g] < list.length) out.push(list[idx[g]++]); }
    // 후보가 모자라면 같은 유형에 어울리는 다른 십성 그룹, 그래도 모자라면 사전 전체에서 채운다
    for (const g of [...allowed, ...Object.keys(dict)]) for (const name of dict[g]) if (out.length < n && !out.includes(name)) out.push(name);
    return out;
  };
  return { groups: order, jobs: take(JOB_DICT, 3, JOB_INFO), biz: take(SHOWN_BIZ, 3, BIZ_INFO) };
}

const WEALTH = ['편재', '정재'];
const periodRange = (r) => `${r.startYear}~${r.endYear}년(${r.ageFrom}~${r.ageTo}세)`;
const uniq = (a) => [...new Set(a)];
const plainOf = (gods) => uniq(gods).map((g) => PLAIN_GOD[g]).join(', ');

// 시기별 쉬운 말 요약(AI는 십성 이름 대신 이 말을 쓴다)
function periodPlainLines(facts) {
  return facts.rows.slice(0, 6).map((r, i) => {
    const hidden = r.branchHidden.map((h) => h.god).filter((g) => g !== r.stemGod && g !== r.branchMainGod);
    return `- 대운${i + 1}({대운${i + 1}}): 겉으로 드러난 운 = ${PLAIN_GOD[r.stemGod]} / 속에서 받치는 운 = ${PLAIN_GOD[r.branchMainGod]}${hidden.length ? ` / 뒤에서 함께 받치는 힘 = ${plainOf(hidden)}` : ''}`;
  });
}

// 판정 근거를 쉬운 말로(숫자 없이). AI는 핵심 결론의 '차이'에 이 세 문장의 뜻을 그대로 쓴다.
function plainSignals(facts) {
  const t = facts.calc.tenGods; const sf = t.surface; const cmp = facts.compare;
  const stems = t.positions.filter((p) => p.scope === 'stem');
  const sideN = { study: 0, biz: 0, none: 0 };
  for (const s of stems) { const sd = SIDE_OF[GROUP_OF[s.god]]; sideN[sd || 'none']++; }
  const name = { study: '공부·제도 쪽', biz: '사업·시장 쪽' };
  let s1;
  if (!stems.length) s1 = '사주에서 눈에 먼저 보이는 기운이 없어 이 항목은 판단하지 않습니다.';
  else if (sideN.study === stems.length) s1 = '사주에서 눈에 먼저 보이는 기운이 모두 공부·제도 쪽입니다.';
  else if (sideN.biz === stems.length) s1 = '사주에서 눈에 먼저 보이는 기운이 모두 사업·시장 쪽입니다.';
  else if (sideN.study && !sideN.biz) s1 = '사주에서 눈에 먼저 보이는 기운은 공부·제도 쪽이 중심이고, 나머지는 혼자 해내는 힘 쪽입니다.';
  else if (sideN.biz && !sideN.study) s1 = '사주에서 눈에 먼저 보이는 기운은 사업·시장 쪽이 중심이고, 나머지는 혼자 해내는 힘 쪽입니다.';
  else s1 = '사주에서 눈에 먼저 보이는 기운은 공부·제도 쪽과 사업·시장 쪽이 섞여 있습니다.';
  const link = cmp.link.status;
  const hasFoodWealth = (sf.groups.식상 || 0) > 0 && (sf.groups.재성 || 0) > 0;
  let s2;
  if (hasFoodWealth) s2 = '만든 것이 돈과 거래로 이어지는 연결이 사주 안에 갖춰져 있습니다.';
  else if ((sf.groups.식상 || 0) > 0) s2 = '만드는 재능은 있지만, 그것이 돈과 거래로 바로 이어지는 연결은 아직 갖춰지지 않았습니다.';
  else if ((sf.groups.관성 || 0) > 0 && !(sf.groups.재성 || 0)) s2 = '시험·자격 같은 기준에 맞추는 힘이 중심이고, 만든 것이 돈으로 이어지는 연결은 따로 보이지 않습니다.';
  else s2 = '만드는 재능과 돈 감각이 서로 이어지는 연결은 갖춰지지 않았고, 어느 한쪽으로도 기울지 않습니다.';
  void link;
  const sc = cmp.signals.find((x) => x.key === 'school');
  const side3 = sc ? sc.side : 'neutral';
  const s3 = side3 === 'study' ? '학생 시기에 걸친 {대운1}, {대운2}의 운은 공부·제도 쪽입니다.'
    : side3 === 'biz' ? '학생 시기에 걸친 {대운1}, {대운2}의 운은 사업·시장 쪽입니다.'
      : '학생 시기에 걸친 {대운1}, {대운2}의 운은 어느 한쪽으로 모이지 않습니다.';
  void name;
  const sides = cmp.signals.map((x) => x.side);
  const ns = sides.filter((x) => x === 'study').length, nb = sides.filter((x) => x === 'biz').length;
  let s4;
  if (ns === 3) s4 = '정리: 세 가지가 모두 공부·제도 쪽을 가리킵니다.';
  else if (nb === 3) s4 = '정리: 세 가지가 모두 사업·시장 쪽을 가리킵니다.';
  else if (ns >= 2 && nb === 0) s4 = '정리: 세 가지 중 두 가지가 공부·제도 쪽을 가리키고, 나머지 하나는 어느 쪽으로도 기울지 않아 공부형으로 정리합니다. 세 가지가 모두 같은 쪽이라고 쓰지 않습니다.';
  else if (nb >= 2 && ns === 0) s4 = '정리: 세 가지 중 두 가지가 사업·시장 쪽을 가리키고, 나머지 하나는 어느 쪽으로도 기울지 않아 사업가형으로 정리합니다. 세 가지가 모두 같은 쪽이라고 쓰지 않습니다.';
  else if (ns >= 1 && nb >= 1) s4 = '정리: 공부·제도 쪽과 사업·시장 쪽이 함께 나타나 두 방향을 함께 설명합니다.';
  else s4 = '정리: 한쪽을 가리키는 사실이 두 가지에 못 미쳐 두 방향을 함께 설명합니다.';
  return [s1, s2, s3, s4];
}

// 유형별 첫 문장(핵심 결론). 서버가 정한 문장을 그대로 쓴다.
const OPENING = {
  A: { lead: '이 아이는 사업가형 사주입니다.', first: '사업가형은 사주의 구조를 부르는 이름이고, 사업을 해야 한다는 뜻은 아닙니다.' },
  B: { lead: '이 아이는 공부형 사주입니다.', first: '공부형은 사주의 구조를 부르는 이름이고, 공부만 해야 한다는 뜻은 아닙니다.' },
  C: { lead: '이 아이는 공부와 사업을 함께 쓰는 사주입니다.', first: '' },
};

// 재성(돈의 흐름)이 나타나는 시기: 겉으로 드러난 운(천간)과 속에서 받치는 운(지지 본기)을 나눠 알려 준다.
function wealthPeriods(facts) {
  const rows = facts.rows.slice(0, 6);
  const outer = rows.map((r, i) => ({ r, k: i + 1 })).filter(({ r }) => WEALTH.includes(r.stemGod));
  const inner = rows.map((r, i) => ({ r, k: i + 1 })).filter(({ r }) => WEALTH.includes(r.branchMainGod));
  return { outer, inner };
}

const groupLine = (c, unit) => ['식상', '재성', '관성', '인성', '비겁'].filter((k) => c.groups[k] > 0).map((k) => `${k} ${c.groups[k]}${unit}`).join('·') || '없음';
const godsOf = (c, grp) => Object.keys(c.gods).filter((g) => GROUP_OF[g] === grp && c.gods[g] > 0).map((g) => `${g} ${c.gods[g]}`).join(', ');
const gl = (c, unit) => ['식상', '재성', '관성', '인성', '비겁'].filter((k) => c.groups[k] > 0).map((k) => `${k} ${c.groups[k]}${unit}(${godsOf(c, k)})`).join('·') || '없음';

// 각 항목의 '사주 풀이 근거' 줄. 개수·연도·십성은 모두 서버 계산값이며 AI는 이 줄을 쓰지 않는다.
function serverBasis(facts) {
  const t = facts.calc.tenGods; const sf = t.surface, wh = t.withHidden; const cmp = facts.compare;
  const stems = t.positions.filter((p) => p.scope === 'stem');
  const stemText = stems.length ? `겉으로 드러난 천간 ${stems.length}글자(${stems.map((s) => `${s.where} ${s.char} ${s.god}`).join(', ')})` : '겉으로 드러난 천간 없음';
  const schoolRows = facts.rows.slice(0, 6).map((r, i) => ({ r, i })).filter(({ r }) => r.ageFrom < 19).slice(0, 3);
  const schoolText = schoolRows.length ? `학생 시기 대운 천간 ${schoolRows.map(({ r, i }) => `대운${i + 1} ${periodRange(r)} ${r.ganji[0]}(${r.stemGod})`).join(', ')}` : '';
  const w = wealthPeriods(facts);
  const fmt = (arr, key) => arr.map(({ r }) => `${periodRange(r)} ${key === 'stem' ? r.ganji[0] + '(' + r.stemGod + ')' : r.ganji[1] + '(본기 ' + r.branchMainGod + ')'}`).join(', ');
  const ref = `사주 여덟 글자 중 나 자신(일간)을 뺀 ${sf.total}글자`;
  const hero = `${ref}에서 ${gl(sf, '글자')} · ${stemText} · 식상생재 ${cmp.link.status} · 지장간 포함 ${gl(wh, '개')}${schoolText ? ', ' + schoolText : ''} · 설명 유형 ${cmp.type}`;
  const study = `인성 겉 ${sf.groups.인성}글자(${godsOf(sf, '인성') || '없음'}) · 관성 겉 ${sf.groups.관성}글자(${godsOf(sf, '관성') || '없음'}) · 식상 겉 ${sf.groups.식상}글자 · 지장간 포함 인성 ${wh.groups.인성}개·관성 ${wh.groups.관성}개${schoolText ? ', ' + schoolText : ''}`;
  const pk = pickExamples(facts);
  const career = `${ref}에서 ${gl(sf, '글자')} · 지장간 포함 ${gl(wh, '개')} · 직업 예시는 십성의 뜻에서 고른 방향 예시(추천 후보: ${pk.jobs.join(', ')})`;
  const business = `식상 겉 ${sf.groups.식상}글자 · 재성 겉 ${sf.groups.재성}글자(지장간 포함 ${wh.groups.재성}개) · 식상생재 ${cmp.link.status} · 재성 대운 ${w.outer.length ? fmt(w.outer, 'stem') : '대운 천간에는 없음'}`;
  const wealth = `재성 겉 ${sf.groups.재성}글자·지장간 포함 ${wh.groups.재성}개 · 대운 천간 재성: ${w.outer.length ? fmt(w.outer, 'stem') : '계산한 대운 6개에는 없음'} · 대운 지지 재성: ${w.inner.length ? fmt(w.inner, 'branch') : '없음'}`;
  return { hero, study, career, business, wealth };
}

module.exports = { PLAIN_GOD, PLAIN_GROUP, JOB_DICT, BIZ_DICT, ALL_JOBS, ALL_BIZ, SHOWN_BIZ, JOB_INFO, BIZ_INFO, infoOf, reasonFor, OPENING, pickExamples, periodPlainLines, plainSignals, wealthPeriods, serverBasis };

// AI에게 넘기는 계산값 블록의 뒷부분: 쉬운 말 용어집, 판정 근거 쉬운 말, 시기별 쉬운 말 요약, 재물 시기, 첫 문장, 추천 후보
function renderPlainBlocks(facts) {
  const cmp = facts.compare; const pk = pickExamples(facts); const op = OPENING[cmp.type];
  const ps = plainSignals(facts);
  const L = [];
  L.push('[쉬운 말 용어집 — 본문에는 십성 용어·천간·지지·지장간 대신 이 말만 쓰세요. 같은 말을 되풀이하지 말고 아래 여러 표현을 돌려 쓰세요]');
  L.push(`- 십성: ${Object.entries(PLAIN_GOD).map(([g, p]) => `${g}=${p}`).join(' / ')}`);
  L.push(`- 묶음: ${Object.entries(PLAIN_GROUP).map(([g, p]) => `${g}=${p.join(', ')}`).join(' / ')}`);
  L.push('');
  L.push('[판정 근거 쉬운 말 — 핵심 결론의 "차이"에는 이 네 문장의 뜻을 숫자 없이 쓰고, 마지막 "정리"를 그대로 따르세요. 이 밖의 근거를 지어내지 마세요]');
  ps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
  L.push('');
  L.push('[시기별 쉬운 말 요약 — 시기별 운과 재물운에서 시기의 성격은 이 말로만 쓰세요. 연도·나이는 {대운N} 토큰으로 씁니다]');
  L.push(...periodPlainLines(facts));
  L.push('');
  L.push('[재물 시기 — 서버가 계산한 확정 문장. 재물운 본문에 한 번씩만 넣고, 이 밖의 재물 시기를 지어내지 마세요]');
  L.push('- 겉으로 드러난 운에서: {재성대운}');
  L.push('- 속에서 받치는 운에서: {재성속운}');
  const wr = wealthPeriods(facts); const allowed = [...new Set([...wr.outer, ...wr.inner].map((x) => x.k))].sort();
  L.push(allowed.length ? `- 재물운의 "결론:"·"한 줄:"에 {대운N.나이}({대운N.연도})를 쓸 수 있는 시기: ${allowed.map((k) => `대운${k}`).join(', ')} (이 밖의 대운은 쓰지 마세요)` : '- 재물운의 "결론:"·"한 줄:"에는 시기 토큰을 쓰지 마세요(돈의 흐름이 나타나는 대운이 없습니다)');
  L.push('');
  L.push('[핵심 결론 첫 문장 — 서버가 정한 문장]');
  L.push(`- "결론:" 줄은 정확히 "${op.lead}"`);
  if (op.first) L.push(`- "요약:"의 첫 문장은 정확히 "${op.first}"`);
  L.push('');
  L.push('[직업·사업 추천 후보 — 설명 유형 판정과 무관한 예시 후보]');
  L.push(`- 직업 예시 3개는 이 순서의 후보를 쓰세요: ${pk.jobs.join(' / ')}`);
  L.push(`- 사업 예시 3개는 이 순서의 후보를 쓰세요: ${pk.biz.join(' / ')}`);
  return L.join('\n');
}
module.exports.renderPlainBlocks = renderPlainBlocks;
