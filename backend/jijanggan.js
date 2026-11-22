// 지장간(地藏干)과 십성(十星) 계산 — 자녀운명서 계산 전용 모듈.
// 이 파일은 기존 상품 코드가 가져다 쓰지 않는다.
//
// 지장간표 출처 상태(검증 현황):
//  - 'ko-wikipedia-30day' : 한국어 위키백과 「지장간」 문서의 표(여기·중기·정기와 30일 배분). 2026-11-12 원문 확인.
//    확인한 출처는 이 한 곳뿐이다. 『연해자평』·『삼명통회』·『자평진전』 등 문헌별 구성 차이는 구체적으로 대조하지 못했다.
//    따라서 이 표는 '출처 1곳 확인, 명리 전문가 검수 전'이며 최종 확정이 아니다. 표를 바꾸려면 HIDDEN_STEM_TABLES 에 항목을 추가하고
//    DEFAULT_TABLE 만 바꾸면 되도록 만들었다.

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

const ELEMENT = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' };
const YANG = new Set(['甲', '丙', '戊', '庚', '壬']);
const GENERATES = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
const CONTROLS = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

// [stem, role, days] — role: 여기/중기/정기
const HIDDEN_STEM_TABLES = {
  'ko-wikipedia-30day': {
    status: '출처 1곳(한국어 위키백과) 확인, 전문가 검수 전',
    table: {
      子: [['壬', '여기', 10], ['癸', '정기', 20]],
      丑: [['癸', '여기', 9], ['辛', '중기', 3], ['己', '정기', 18]],
      寅: [['戊', '여기', 7], ['丙', '중기', 7], ['甲', '정기', 16]],
      卯: [['甲', '여기', 10], ['乙', '정기', 20]],
      辰: [['乙', '여기', 9], ['癸', '중기', 3], ['戊', '정기', 18]],
      巳: [['戊', '여기', 7], ['庚', '중기', 7], ['丙', '정기', 16]],
      午: [['丙', '여기', 10], ['己', '중기', 9], ['丁', '정기', 11]],
      未: [['丁', '여기', 9], ['乙', '중기', 3], ['己', '정기', 18]],
      申: [['戊', '여기', 7], ['壬', '중기', 7], ['庚', '정기', 16]],
      酉: [['庚', '여기', 10], ['辛', '정기', 20]],
      戌: [['辛', '여기', 9], ['丁', '중기', 3], ['戊', '정기', 18]],
      亥: [['戊', '여기', 7], ['甲', '중기', 7], ['壬', '정기', 16]],
    },
  },
};
const DEFAULT_TABLE = 'ko-wikipedia-30day';

function hiddenStems(branch, tableName = DEFAULT_TABLE) {
  const t = HIDDEN_STEM_TABLES[tableName];
  if (!t) throw new Error('알 수 없는 지장간표: ' + tableName);
  const rows = t.table[branch];
  if (!rows) throw new Error('알 수 없는 지지: ' + branch);
  return rows.map(([stem, role, days]) => ({ stem, role, days }));
}
// 지지 본기(정기) 천간 — '천간·지지 본기 기준' 집계에 쓴다
const mainStem = (branch, tableName = DEFAULT_TABLE) => hiddenStems(branch, tableName).find((h) => h.role === '정기').stem;

// 일간 기준 십성 이름
function tenGod(dayStem, otherStem) {
  const a = ELEMENT[dayStem], b = ELEMENT[otherStem];
  if (!a || !b) throw new Error('천간이 아닙니다: ' + dayStem + ',' + otherStem);
  const same = YANG.has(dayStem) === YANG.has(otherStem);
  if (a === b) return same ? '비견' : '겁재';
  if (GENERATES[a] === b) return same ? '식신' : '상관';
  if (CONTROLS[a] === b) return same ? '편재' : '정재';
  if (CONTROLS[b] === a) return same ? '편관' : '정관';
  return same ? '편인' : '정인';
}
const GROUP = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
const TEN_GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
const GROUPS = ['비겁', '식상', '재성', '관성', '인성'];

function emptyCounts() {
  return { gods: Object.fromEntries(TEN_GODS.map((g) => [g, 0])), groups: Object.fromEntries(GROUPS.map((g) => [g, 0])), total: 0 };
}
function addTo(counts, god) { counts.gods[god]++; counts.groups[GROUP[god]]++; counts.total++; }

module.exports = { STEMS, BRANCHES, ELEMENT, HIDDEN_STEM_TABLES, DEFAULT_TABLE, hiddenStems, mainStem, tenGod, GROUP, TEN_GODS, GROUPS, emptyCounts, addTo };
