// '공부 vs 사업' 비교 판정. 점수나 개수의 합으로 정하지 않고, 서버가 확인하는 사실 3가지가 같은 쪽을 가리키는지로 설명 유형(A·B·C)을 정한다.
//  - 사실 1: 겉으로 드러난 천간(일간 제외)의 십성이 어느 쪽 그룹인가 — 공부·제도 쪽(인성·관성) / 사업·시장 쪽(식상·재성)
//  - 사실 2: 연결 구조 — 식상 다음에 재성이 이어지는가(식상생재), 그렇지 않고 관성이 있는가
//  - 사실 3: 학생 시기(만 19세 미만)에 걸친 대운 천간의 십성이 어느 쪽인가
//  A: 사업 쪽 사실이 2개 이상이고 공부 쪽 사실이 없음 / B: 반대 / C: 그 밖의 모든 경우(두 방향을 함께 설명)
// 이 유형은 '설명 유형'이다. 성공 방향, 능력, 진로를 확정하는 값이 아니다. 이 파일은 AI를 호출하지 않는다.

const GROUP_OF = { 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성', 비견: '비겁', 겁재: '비겁' };
const SIDE_OF = { 식상: 'biz', 재성: 'biz', 인성: 'study', 관성: 'study', 비겁: null };
const SIDE_NAME = { biz: '사업·시장 쪽', study: '공부·제도 쪽' };
const SCHOOL_AGE_LIMIT = 19;     // 대운 시작 나이가 이 값 미만이면 학생 시기에 걸친 대운으로 본다

function sideOfGods(gods) {
  const sides = new Set(gods.map((g) => SIDE_OF[GROUP_OF[g]]).filter(Boolean));
  if (gods.some((g) => !SIDE_OF[GROUP_OF[g]])) return 'neutral';     // 비겁이 섞이면 한쪽으로 보지 않는다
  return sides.size === 1 ? [...sides][0] : 'neutral';
}

function compareDirection(facts) {
  const t = facts.calc.tenGods;
  const stems = t.positions.filter((p) => p.scope === 'stem');
  const stemGroups = stems.map((p) => ({ where: p.where, char: p.char, god: p.god, group: GROUP_OF[p.god] }));
  const has = (c, g) => (c.groups[g] || 0) > 0;
  const sf = t.surface, wh = t.withHidden;

  // 사실 1: 겉으로 드러난 천간
  const stemSides = new Set(stemGroups.map((s) => SIDE_OF[s.group]).filter(Boolean));
  let s1 = 'neutral';
  if (stemSides.size === 1) s1 = [...stemSides][0];
  const s1Detail = stemGroups.length
    ? `겉으로 드러난 천간 ${stemGroups.length}글자: ${stemGroups.map((s) => `${s.where} ${s.char} ${s.god}`).join(', ')}`
    : '겉으로 드러난 천간이 없습니다';

  // 사실 2: 연결 구조 (식상생재의 적용 조건: 식상과 재성이 둘 다 천간·지지 본기에 있어야 '완성')
  let link = '없음', linkDetail;
  if (has(sf, '식상') && has(sf, '재성')) { link = '완성'; linkDetail = `식상 ${sf.groups.식상}글자와 재성 ${sf.groups.재성}글자가 모두 겉으로 드러나 식상 다음에 재성이 이어집니다`; }
  else if (has(sf, '식상') && has(wh, '재성')) { link = '부분'; linkDetail = `식상은 겉으로 ${sf.groups.식상}글자이고, 재성은 겉으로는 없고 지장간에만 ${wh.groups.재성}개 있습니다`; }
  else if (has(sf, '식상')) { link = '없음'; linkDetail = `식상은 겉으로 ${sf.groups.식상}글자이지만 재성은 지장간까지 보아도 없습니다`; }
  else { link = '없음'; linkDetail = '겉으로 드러난 식상이 없어 식상 다음에 재성이 이어지는 구조가 아닙니다'; }
  let s2 = 'neutral';
  if (link === '완성') s2 = 'biz';
  else if (has(sf, '관성') && !has(sf, '재성')) s2 = 'study';     // 재성이 겉으로 있는데 식상과 이어지지 않은 경우는 한쪽으로 보지 않는다
  const s2Detail = link === '완성' ? linkDetail : (s2 === 'study' ? `${linkDetail}. 관성이 겉으로 ${sf.groups.관성}글자 있고 재성은 겉으로 없어 규칙·평가 중심의 구조입니다` : (has(sf, '재성') ? `${linkDetail}. 재성이 겉으로 ${sf.groups.재성}글자 있지만 식상과 이어지지 않아 어느 쪽으로도 정하지 않습니다` : linkDetail));

  // 사실 3: 학생 시기에 걸친 대운 천간
  const school = facts.rows.map((r, i) => ({ r, i })).filter(({ r }) => r.ageFrom < SCHOOL_AGE_LIMIT).slice(0, 3);
  const s3 = school.length ? sideOfGods(school.map(({ r }) => r.stemGod)) : 'neutral';
  const s3Detail = school.length
    ? school.map(({ r, i }) => `대운${i + 1} ${r.startYear}~${r.endYear}년(${r.ageFrom}~${r.ageTo}세) 천간 ${r.stemGod}`).join(', ')
    : '학생 시기에 걸친 대운이 없습니다';

  const signals = [
    { key: 'surface', title: '겉으로 드러난 천간', side: s1, detail: s1Detail },
    { key: 'link', title: '연결 구조', side: s2, detail: s2Detail },
    { key: 'school', title: '학생 시기 대운', side: s3, detail: s3Detail },
  ];
  const nb = signals.filter((s) => s.side === 'biz').length;
  const ns = signals.filter((s) => s.side === 'study').length;
  let type, reason;
  if (nb >= 2 && ns === 0) { type = 'A'; reason = `세 가지 사실 중 ${nb}개가 사업·시장 쪽이고 공부·제도 쪽은 없습니다`; }
  else if (ns >= 2 && nb === 0) { type = 'B'; reason = `세 가지 사실 중 ${ns}개가 공부·제도 쪽이고 사업·시장 쪽은 없습니다`; }
  else if (nb >= 1 && ns >= 1) { type = 'C'; reason = '사업·시장 쪽 사실과 공부·제도 쪽 사실이 함께 있어 두 방향이 갈립니다'; }
  else { type = 'C'; reason = '한쪽을 가리키는 사실이 2개에 못 미쳐 두 방향을 함께 설명합니다'; }

  // 예시(직업·사업)를 고를 때 참고할 순서: 지장간 포함 그룹 개수. 판정에는 쓰지 않는다.
  const order = ['식상', '재성', '관성', '인성'].map((g) => ({ g, n: wh.groups[g] })).sort((a, b) => b.n - a.n);
  return { type, reason, signals, link: { status: link, detail: linkDetail }, order, schoolRows: school.map(({ i }) => i + 1) };
}

const TYPE_NAME = { A: '사업·시장 쪽 특징이 더 두드러지는 유형', B: '공부·제도 쪽 특징이 더 두드러지는 유형', C: '두 방향을 함께 설명하는 유형' };

// AI에게 넘기는 계산값 블록
function renderCompareText(cmp) {
  const L = ['[공부 vs 사업 비교 — 서버 판정. 점수·개수 합이 아니라 아래 사실 3가지로 정한 설명 유형입니다]'];
  for (const s of cmp.signals) L.push(`- ${s.title}: ${s.side === 'neutral' ? '어느 쪽도 아님' : SIDE_NAME[s.side]} — ${s.detail}`);
  L.push(`- 식상생재 적용 조건: 식상과 재성이 모두 겉으로 드러나야 "식상생재"라고 쓸 수 있습니다. 이 아이: ${cmp.link.status}`);
  L.push(`- 설명 유형 ${cmp.type}: ${TYPE_NAME[cmp.type]} (${cmp.reason})`);
  L.push(`- 직업·사업 예시를 고를 때 참고할 순서(지장간 포함 개수, 판정에는 쓰지 않음): ${cmp.order.map((o) => `${o.g} ${o.n}`).join(' > ')}`);
  return L.join('\n');
}

module.exports = { GROUP_OF, SIDE_OF, TYPE_NAME, compareDirection, renderCompareText };
