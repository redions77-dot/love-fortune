const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const KoreanLunarCalendar = require('korean-lunar-calendar');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://love-fortune-nu.vercel.app',
    'https://mysaju.shop',
    'https://www.mysaju.shop',
  ]
}));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL_FREE = 'claude-haiku-4-5-20251001';
const MODEL_PAID = 'claude-sonnet-4-5-20250929';

app.get('/ping', (req, res) => res.json({ ok: true }));

// 손없는 날 체크
function getSonNobunNal(lunarDay) {
  return [9, 10, 19, 20, 29, 30].includes(lunarDay);
}

// 목적별 멘트 풀
function getComment(purpose) {
  const comments = {
    이사: ['새 공간에 좋은 기운이 가득 드는 날','이동과 변화에 흐름이 순조로운 날','안정적으로 자리잡기 좋은 날','재물운을 품고 들어가기 좋은 날','귀인이 새집에 복을 가져다주는 날','가족 모두에게 편안한 기운이 흐르는 날'],
    계약: ['좋은 인연으로 맺어지기 좋은 날','약속이 단단하게 이어지는 날','재물운이 계약서에 깃드는 날','믿을 수 있는 흐름이 만들어지는 날','귀인의 도움으로 일이 풀리는 날'],
    개업: ['새 출발에 기운이 활짝 열리는 날','재물운이 문 앞으로 들어오는 날','좋은 손님과 인연이 닿는 날','사업의 흐름이 순조롭게 시작되는 날','귀인이 첫걸음을 함께 해주는 날','번창의 기운이 자리를 잡는 날'],
    결혼: ['두 사람의 인연이 가장 빛나는 날','행복한 출발을 축복받기 좋은 날','좋은 기운이 두 사람을 감싸는 날','평생 함께할 약속을 맺기 좋은 날','가족과 귀인의 복이 함께하는 날'],
    수술: ['몸의 회복에 기운이 도와주는 날','안정적으로 치유가 시작되는 날','좋은 흐름 속에 건강을 되찾는 날','귀인의 손길이 함께하는 날','몸과 마음이 편안하게 나아가는 날'],
    시험: ['그동안의 노력이 빛을 발하는 날','집중력과 기운이 최고조인 날','좋은 결과를 향해 흐름이 열리는 날','귀인의 기운이 함께하는 날','자신감이 가장 충만해지는 날'],
  };
  const list = comments[purpose] || comments['이사'];
  return list[Math.floor(Math.random() * list.length)];
}

// 6개월치 길일 API
app.post('/api/gilil', (req, res) => {
  const { purpose } = req.body;
  const results = {};
  const today = new Date();

  for (let m = 0; m < 6; m++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const gililDays = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const calendar = new KoreanLunarCalendar();
      calendar.setSolarDate(targetYear, targetMonth, d);
      const lunarDay = calendar.getLunarCalendar().day;

      if (getSonNobunNal(lunarDay)) {
        gililDays.push({ date: d, comment: getComment(purpose) });
      }
    }

    results[`${targetYear}-${targetMonth}`] = {
      year: targetYear,
      month: targetMonth,
      days: gililDays
    };
  }

  res.json({ success: true, data: results });
});


function lunarToSolar(year, month, day) {
  const calendar = new KoreanLunarCalendar();
  calendar.setLunarDate(year, month, day, false);
  return calendar.getSolarCalendar();
}

const 천간 = ['甲갑','乙을','丙병','丁정','戊무','己기','庚경','辛신','壬임','癸계'];
const 지지 = ['子자','丑축','寅인','卯묘','辰진','巳사','午오','未미','申신','酉유','戌술','亥해'];

function get일주(birthdate) {
  const 기준일 = new Date('1900-01-01');
  const 날짜 = new Date(birthdate);
  const 차이 = Math.round((날짜 - 기준일) / (1000 * 60 * 60 * 24));
  const 천간index = ((차이) % 10 + 10) % 10;
  const 지지index = ((10 + 차이) % 12 + 12) % 12;
  return { 간지: 천간[천간index] + 지지[지지index], 천간index };
}

function get년주(year) {
  const 차이 = year - 1984;
  const 천간index = ((차이) % 10 + 10) % 10;
  const 지지index = ((차이) % 12 + 12) % 12;
  return { 간지: 천간[천간index] + 지지[지지index], 천간index };
}

const 절기시작일 = [6, 4, 6, 5, 6, 6, 7, 7, 8, 8, 7, 7];
function getSajuMonth(month, day) {
  if (day < 절기시작일[month - 1]) return month <= 1 ? 12 : month - 1;
  return month;
}

function get월주(year, month, day, 년천간index) {
  const 양력month = getSajuMonth(month, day);
  const 양력월지지 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];
  const 양력월사주순번 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const 월지index = 양력월지지[양력month - 1];
  const 사주순번 = 양력월사주순번[양력month - 1];
  const 월간시작표 = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
  const 월간index = (월간시작표[년천간index] + (사주순번 - 1)) % 10;
  return 천간[월간index] + 지지[월지index];
}

// ✅ 시주 계산 — 30분 이동 기준 (전통 만세력 표준)
// 자시(子時) 시작 = 23:30 기준
function get시주(birthtime, 일천간index) {
  if (!birthtime) return null;
  const [h] = birthtime.split(':').map(Number);
  // 정시 기준: 각 시의 시작은 홀수시 정각 (子=23시, 丑=01시, 寅=03시...)
  const 시간대 = [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,0]
  const 시지index = 시간대[h];
  const 시간시작표 = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
  const 시천간index = (시간시작표[일천간index] + 시지index) % 10;
  return 천간[시천간index] + 지지[시지index];
}

function get시지라벨(시주) {
  if (!시주) return null;
  const 지지한자 = 시주.replace(/[가-힣]/g, '').slice(-1);
  const map = {
    '子': { 투자: '금융·저축·현금성 자산', 거주: '북쪽, 물 가까운 곳' },
    '丑': { 투자: '부동산·토지·실물 자산', 거주: '북동쪽, 조용한 주거지' },
    '寅': { 투자: '성장주·스타트업·콘텐츠', 거주: '동북쪽, 숲이나 공원 근처' },
    '卯': { 투자: '문화·미디어·플랫폼', 거주: '동쪽, 햇빛 잘 드는 동향 집' },
    '辰': { 투자: '부동산·인프라·장기 투자', 거주: '동남쪽, 탁 트인 전망' },
    '巳': { 투자: 'IT·전자·에너지·고성장', 거주: '남동쪽, 밝고 활기찬 신도시' },
    '午': { 투자: '주식·금융 상품', 거주: '남쪽, 따뜻한 도심지' },
    '未': { 투자: '부동산·안정 배당주', 거주: '남서쪽, 안정된 주거지' },
    '申': { 투자: '금·우량주·채권', 거주: '서남쪽, 정돈된 아파트' },
    '酉': { 투자: '금융·보험·수익형 자산', 거주: '서쪽, 조용한 주거지' },
    '戌': { 투자: '부동산·실물 자산', 거주: '서북쪽, 넓은 주거 환경' },
    '亥': { 투자: '해외 투자·유동성 자산', 거주: '북서쪽, 개방적인 공간' },
  };
  return map[지지한자] || null;
}

function getAgeGroup(birthYear) {
  const age = 2026 - birthYear;
  if (age <= 22) return 'young';
  if (age <= 35) return 'young_adult';
  return 'adult';
}

function getAgeBasedFreeSection(birthYear, maritalStatus) {
  const age = 2026 - birthYear;
  const group = getAgeGroup(birthYear);

  if (group === 'young') {
    return `===Part 2. 지금 이 시기===
이 사람은 현재 ${age}세입니다. (250~300자)
첫 문단: 타고난 공부 스타일과 재능이 빛나는 분야를 정확하게 찌르세요. 이 사람만의 특징이 드러나야 해요.
두 번째 문단: 지금 이 시기 학업 에너지의 흐름.
마지막 줄: "🔒 이 재능으로 돈을 버는 구체적인 방법이 이 사주에 숨어 있습니다. 잘 맞는 직업 5가지 + 돈이 되는 타이밍은 전체 분석에서 확인하세요"`;
  }

  if (group === 'young_adult') {
    if (maritalStatus === '미혼') {
      return `===Part 2. 지금 이 시기===
이 사람은 현재 ${age}세 미혼입니다. (250~300자)
첫 문단: 이 사람이 끌리는 유형과 실제로 잘 맞는 유형의 차이, 연애에서 반복하는 패턴을 정확하게 찌르세요.
두 번째 문단: 지금 이 시기 인연운의 흐름. "언제 만나는지"는 알려주지 마세요.
마지막 줄: "🔒 이 패턴을 알면 연애가 달라집니다. 인연을 만나는 구체적 시기·이 사람에게 맞는 배우자 유형·결혼 타이밍은 전체 분석에서 확인하세요"`;
    }
    return `===Part 2. 지금 이 시기===
이 사람은 현재 ${age}세 기혼입니다. (250~300자)
첫 문단: 지금 부부 사이의 에너지 흐름, 강한 부분과 약한 부분을 정확하게 찌르세요.
두 번째 문단: 지금 이 시기 부부 관계의 흐름 방향만.
마지막 줄: "🔒 부부 사이에 주기적으로 찾아오는 위기 시기가 있습니다. 그 시기와 넘기는 방법은 전체 분석에서 확인하세요"`;
  }

  return `===Part 2. 지금 이 시기===
이 사람은 현재 ${age}세입니다. (250~300자)
첫 문단: 지금 이 나이에 이 사주에서 가장 중요한 흐름이 무엇인지 정확하게 찌르세요. 이 사람의 사주에서 실제로 두드러지는 특징이어야 해요.
두 번째 문단: 현재 시기가 이 사람에게 어떤 의미인지 방향만.
마지막 줄: "🔒 지금 이 시기가 당신에게 기회인지 위기인지, 전체 분석에서 확인하세요. 지금 행동하느냐 아니냐가 앞으로 5년을 바꿉니다"`;
}

function getAgeBasedPaidSection(birthYear, maritalStatus) {
  const age = 2026 - birthYear;
  const group = getAgeGroup(birthYear);

  if (group === 'young') {
    return `===Part 4-1. 직업 · 진로 심화===
무료에서 쓴 재능 방향은 반복하지 마세요. (500~600자)
첫 문단: 이 사주에 가장 잘 맞는 직업 5~6가지를 구체적으로 예시하고, 직장인/프리랜서/창업 중 어떤 방향이 맞는지 설명하세요.
두 번째 문단: 입시나 취업에서 유리한 구체적 시기, 현재 학업·진로 흐름을 이 사람의 사주 구조 기준으로 설명하세요.`;
  }

  if (group === 'young_adult') {
    if (maritalStatus === '미혼') {
      return `===Part 6-1. 인연운 심화===
무료에서 쓴 패턴·유형 설명은 반복하지 마세요. (500~600자)
첫 문단: 인연을 만날 가능성이 높은 구체적 시기와 상황, 배우자가 될 사람의 특징.
두 번째 문단: 이 사주가 결혼으로 이어지기 위한 조건, 가까운 시기의 인연운 흐름.`;
    }
    return `===Part 6-1. 부부운 심화===
무료에서 쓴 내용은 반복하지 마세요. (500~600자)
첫 문단: 앞으로 부부 사이에 좋은 시기와 갈등이 생기기 쉬운 구체적 시기.
두 번째 문단: 배우자 복 상세 분석, 가정운·자녀운의 흐름.`;
  }

  return `===運 · 앞으로의 핵심 흐름===
무료에서 쓴 내용은 반복하지 마세요. (500~600자)
첫 문단: 앞으로 5~10년 안에 이 사람에게 중요한 변화가 예상되는 시기와 내용. 이 사람의 사주 구조에서 실제로 보이는 것만.
두 번째 문단: 지금 이 시기를 어떻게 보내는 것이 이 사주에 맞는지 구체적으로.`;
}

const 공통규칙 = `작성 규칙 (반드시 지킬 것):
1. 호칭: 분석 대상을 항상 이름이 있으면 "OO님"으로, 없으면 "당신"으로. "형님" "누나" "어르신" 등 절대 금지. 반드시 매 문단마다 이름+님으로 호칭하세요. 절대로 "님"만 단독으로 사용하지 마세요.
2. 말투: 따뜻하고 공감 가는 존댓말. "맞아요, 당신이 그럴 수밖에 없었어요" 같은 공감이 먼저 나와야 해요. 반말 절대 금지. 딱딱한 분석 말투 금지
3. 희망: 힘든 부분을 말할 때도 반드시 희망적인 마무리로. "하지만 이 시기를 넘기면 반드시 좋아져요" 같은 따뜻한 마무리 필수
4. 쉬운 말: 한자 사용 절대 금지. 모든 단어는 한글로만 작성. "투자(投資)" "자산(資産)" 등 일반 단어도 한자 병기 절대 금지. "인성" → "나를 도와주는 기운", "식신" → "타고난 재능"
5. 나열 금지: 숫자 목록(1. 2. 3.)이나 하이픈(-) 금지 — 자연스러운 문장으로
6. 마크다운 금지: **, ##, * 등 기호 사용 금지
7. 문단 구성: 첫 문단은 "맞아, 당신이 이런 사람이지" 하는 공감, 둘째 문단은 사주 근거
8. 차별화: 이 사람의 사주에서 실제로 두드러지는 특징만. 누구에게나 해당되는 말은 금지
9. 연도 언급: 이 사주에서 실제로 중요한 해일 때만 언급. 아니면 굳이 쓰지 마세요
10. 요일 언급 절대 금지
10-1. 나이 표기: 반드시 숫자로. "쉰살" "마흔" "서른" 등 한글 나이 표기 절대 금지. 예: 50세, 40대, 30대
10-2. 연도 표기: 반드시 숫자로. "이천이십팔년" 등 한글 연도 표기 절대 금지. 예: 2028년
11. 마무리: 각 섹션 마지막은 반드시 따뜻하고 희망적인 한 문장으로 끝내세요
12. 유행어·밈: 전체에서 최대 1개
13. 역경 재해석: 힘들었던 시기나 단점을 말할 때 반드시 "그럴 수밖에 없는 이유가 있었어요"로 먼저 공감하고, "이 시기가 지나면 반드시 열립니다"로 희망을 주세요. 힘든 사주는 없어요 — 방향을 모르는 사주가 있을 뿐이에요
14. 단점의 재프레임: 약점을 약점으로 끝내지 마세요. "아직 안 핀 것", "방향만 바꾸면 강점이 되는 것"으로 반드시 전환하세요
15. 꿈과 희망: 분석 전체에 걸쳐 읽는 사람이 "그래, 열심히 하면 좋은 날이 오겠구나"를 느낄 수 있어야 해요. 운명을 알려주는 게 아니라 방향을 알려주는 거예요. 이 사주로 잘 살 수 있다는 확신을 주세요
16. MBTI 교차 분석: MBTI가 입력된 경우, 사주와 MBTI가 일치하는 부분과 충돌하는 부분을 자연스럽게 언급하세요. 예: "INFJ이신데 사주 기운이 OO라서, 직관은 맞지만 에너지 소모가 심한 구조예요" 식으로`;

async function streamToClient(res, prompt, model, maxTokens = 4000) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const stream = await anthropic.messages.stream({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
        }
      }
      return;
    } catch (e) {
      const isOverloaded = e?.error?.error?.type === 'overloaded_error' || e?.status === 529;
      if (isOverloaded && attempt < maxRetries) {
        const delay = attempt * 3000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
     throw e;
    }
  }
}

async function getScoreOnly(sajuInfo) {
  // 사주 정보에서 일주 추출해서 규칙 기반 점수 생성
  const 천간점수 = { '甲': 72, '乙': 68, '丙': 81, '丁': 76, '戊': 65, '己': 70, '庚': 78, '辛': 83, '壬': 74, '癸': 69 }
  const 지지점수 = { '子': 5, '丑': -3, '寅': 8, '卯': 3, '辰': -2, '巳': 7, '午': 10, '未': 1, '申': 6, '酉': 4, '戌': -1, '亥': 2 }
  const 영역보정 = { '재물': 0, '애정': 3, '직업': -2, '건강': 5 }

  // infoBlock에서 일주 파싱
  const 일주match = sajuInfo.match(/일주:\s*([甲乙丙丁戊己庚辛壬癸])[가-힣]([子丑寅卯辰巳午未申酉戌亥])[가-힣]/)
  const 월주match = sajuInfo.match(/월주:\s*([甲乙丙丁戊己庚辛壬癸])[가-힣]([子丑寅卯辰巳午未申酉戌亥])[가-힣]/)
  const 년주match = sajuInfo.match(/년주:\s*([甲乙丙丁戊己庚辛壬癸])[가-힣]([子丑寅卯辰巳午未申酉戌亥])[가-힣]/)

  const base = (천간점수[일주match?.[1]] || 72) + (지지점수[일주match?.[2]] || 0)
  const 월보정 = (지지점수[월주match?.[2]] || 0) * 0.3
  const 년보정 = (지지점수[년주match?.[2]] || 0) * 0.2
  const 종합 = Math.round(Math.min(95, Math.max(50, base + 월보정 + 년보정)))

  const scores = {
    종합,
    재물: Math.min(95, Math.max(50, 종합 + 영역보정.재물 + (지지점수[일주match?.[2]] || 0) - 2)),
    애정: Math.min(95, Math.max(50, 종합 + 영역보정.애정 - (지지점수[월주match?.[2]] || 0))),
    직업: Math.min(95, Math.max(50, 종합 + 영역보정.직업 + (지지점수[년주match?.[2]] || 0))),
    건강: Math.min(95, Math.max(50, 종합 + 영역보정.건강 - 3)),
  }
  // 중복 방지
  const keys = ['재물','애정','직업','건강']
  keys.forEach((k, i) => { if (scores[k] === scores.종합) scores[k] += (i % 2 === 0 ? 3 : -3) })

 return Promise.resolve(JSON.stringify(scores))
}

// 대운 계산 함수
function getDaeun(year, month, day, gender, 년천간index, 월주간지) {
  // 월주 천간/지지 인덱스 추출
  const 월간한자 = 월주간지[0]
  const 월지한자 = 월주간지.replace(/[가-힣]/g, '')[1]
  const 월간index = 천간.findIndex(t => t[0] === 월간한자)
  const 월지index = 지지.findIndex(t => t[0] === 월지한자)

  // 순행/역행: 양간+남성 or 음간+여성 → 순행
  const 양간index = [0,2,4,6,8]
  const isYang = 양간index.includes(년천간index)
  const isMale = gender === '남성'
  const 순행 = (isYang && isMale) || (!isYang && !isMale)

  // 가장 가까운 절기까지 날수 계산
  const 절기일 = [6,4,6,5,6,6,7,7,8,8,7,7]
  let 날수 = 0
  if (순행) {
    // 다음 절기까지
    const 이번달절기 = 절기일[month - 1]
    if (day < 이번달절기) {
      날수 = 이번달절기 - day
    } else {
      const 다음달 = month % 12
      const 다음달절기 = 절기일[다음달]
      const 이번달말일 = new Date(year, month, 0).getDate()
      날수 = (이번달말일 - day) + 다음달절기
    }
  } else {
    // 이전 절기까지
    const 이번달절기 = 절기일[month - 1]
    if (day >= 이번달절기) {
      날수 = day - 이번달절기
    } else {
      const 전달index = (month - 2 + 12) % 12
      const 전달절기 = 절기일[전달index]
      날수 = day + 전달절기
    }
  }

  const 시작나이 = Math.round(날수 / 3)

  // 대운 목록 생성 (8개)
  const 대운목록 = []
  for (let i = 0; i < 8; i++) {
    const 나이 = 시작나이 + (i * 10)
    const 천간idx = 순행
      ? (월간index + 1 + i) % 10
      : ((월간index - 1 - i) % 10 + 10) % 10
    const 지지idx = 순행
      ? (월지index + 1 + i) % 12
      : ((월지index - 1 - i) % 12 + 12) % 12
    대운목록.push({ 나이, 간지: 천간[천간idx] + 지지[지지idx] })
  }

  return { 시작나이, 순행, 대운목록 }
}

// 사주 계산 공통 함수
function calcSaju(birthdate, birthtime, isLunar) {
  const rawDate = new Date(birthdate);
  let year = rawDate.getFullYear();
  let month = rawDate.getMonth() + 1;
  let day = rawDate.getDate();

  if (isLunar) {
    try {
      const solar = lunarToSolar(year, month, day);
      year = solar.year; month = solar.month; day = solar.day;
    } catch (e) { console.error('음력 변환 오류:', e); }
  }

  const birthdate_solar = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const 일주obj = get일주(birthdate_solar);
  const 년주obj = get년주(year);
  const 일주 = 일주obj.간지;
  const 년주 = 년주obj.간지;
  const 월주 = get월주(year, month, day, 년주obj.천간index);
  const 시주 = get시주(birthtime, 일주obj.천간index);

  return { year, month, day, 일주, 년주, 월주, 시주, 일천간index: 일주obj.천간index, 년천간index: 년주obj.천간index };
}

app.post('/api/analyze', async (req, res) => {
  const { gender, birthdate, birthtime, mbti, blood, type, isPaid, isLunar, maritalStatus, userName } = req.body;

  if (!birthdate) return res.status(400).json({ error: '생년월일을 입력해주세요.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const keepalive = setInterval(() => { if (!res.writableEnded) res.write(': keepalive\n\n'); }, 20000);
  res.on('close', () => clearInterval(keepalive));

  const saju = calcSaju(birthdate, birthtime, isLunar);
  const { year, month, day, 일주, 년주, 월주, 시주, 년천간index } = saju;

  // 대운 계산
  const daeunInfo = getDaeun(year, month, day, gender, 년천간index, 월주)
  const currentAge = 2026 - year
  const currentDaeun = daeunInfo.대운목록.find((d, i) => {
    const next = daeunInfo.대운목록[i + 1]
    return currentAge >= d.나이 && (!next || currentAge < next.나이)
  })
  const nextDaeun = currentDaeun ? daeunInfo.대운목록[daeunInfo.대운목록.indexOf(currentDaeun) + 1] : null
  const nextNextDaeun = nextDaeun ? daeunInfo.대운목록[daeunInfo.대운목록.indexOf(nextDaeun) + 1] : null

  const daeunBlock = `[대운 정보]
- 대운 시작 나이: ${daeunInfo.시작나이}세 (${daeunInfo.순행 ? '순행' : '역행'})
- 현재 대운: ${currentDaeun ? `${currentDaeun.간지} (${currentDaeun.나이}세~${(currentDaeun.나이 + 9)}세)` : '미상'}
- 다음 대운: ${nextDaeun ? `${nextDaeun.간지} (${nextDaeun.나이}세~${(nextDaeun.나이 + 9)}세)` : '미상'}
- 그 다음 대운: ${nextNextDaeun ? `${nextNextDaeun.간지} (${nextNextDaeun.나이}세~${(nextNextDaeun.나이 + 9)}세)` : '미상'}`
  const 시지힌트 = get시지라벨(시주);

  const 투자거주힌트 = 시지힌트
    ? `시주 지지 기반 힌트 (투자 섹션에 자연스럽게 녹여주세요):
  - 투자에 유리한 방향: ${시지힌트.투자}
  - 실거주에 좋은 환경: ${시지힌트.거주}`
    : `시주 정보 없음 — 일주 지지 기준으로 투자/거주 방향을 분석해주세요.`;

  const sajuData = { 년주, 월주, 일주, 시주: 시주 || '-' };
  res.write(`data: ${JSON.stringify({
    type: 'saju',
    사주: sajuData,
    생년월일: `${year}년 ${month}월 ${day}일${isLunar ? ' (음력→양력)' : ''}`,
    maritalStatus,
    ageGroup: getAgeGroup(year),
  })}\n\n`);

    const infoBlock = `[기본 정보]
- 이름: ${userName}
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일 (현재 ${2026 - year}세)
- 태어난 시간: ${birthtime || '미입력'}
- MBTI: ${mbti || '미입력'}
- 혈액형: ${blood ? blood + '형' : '미입력'}
- 결혼 상태: ${maritalStatus || '미입력'}

[사주팔자]
- 년주: ${년주} / 월주: ${월주} / 일주: ${일주} / 시주: ${시주 || '미입력'}

${daeunBlock}`;

// ── 궁합 ──────────────────────────────────────────
  if (type === '궁합') {
    const { partnerBirthdate, partnerGender, partnerBirthtime, partnerIsLunar, myName, partnerName } = req.body;
    if (!partnerBirthdate) {
      res.write(`data: ${JSON.stringify({ error: '상대방 생년월일을 입력해주세요.' })}\n\n`);
      return res.end();
    }
    const nameA = myName || 'A'
    const nameB = partnerName || 'B'
    const pSaju = calcSaju(partnerBirthdate, partnerBirthtime, partnerIsLunar);
    const 관계유형 = req.body.관계유형 || '연인'

const 관계프롬프트 = {
  연인: `===성격 궁합===
(500~600자) 두 사람 성격이 어떻게 만나는지 솔직하게.
첫 문단: ${nameA}님과 ${nameB}님 각자의 사주 기질을 먼저 짚고, 둘이 만났을 때 시너지가 나는 부분을 구체적으로.
두 번째 문단: 실제 갈등이 생길 수 있는 지점과 이유.
마지막 줄: 이 성격 조합을 한 마디로 표현하는 키워드.

===돈 궁합===
(500~600자) 함께하면 재물이 늘어나는 구조인지 솔직하게.
첫 문단: 두 사람 각자의 재물 스타일과 돈을 대하는 방식의 차이.
두 번째 문단: 함께 돈을 모으려면 어떤 역할 분담이 맞는지, 조심해야 할 돈 관련 패턴.
마지막 줄: 이 두 사람이 부자가 되려면 반드시 해야 할 한 가지.

===결혼 궁합===
(500~600자) 이 두 사람이 함께 살면 어떤 그림이 펼쳐지는지 솔직하게.
첫 문단: 결혼 초반 분위기, 서로에게 도움이 되는 부분과 긴장이 생기는 부분.
두 번째 문단: 결혼 후 5~10년 사이 조심해야 할 시기나 패턴.
마지막 줄: 오래 함께하려면 반드시 기억해야 할 한 문장.

===두 사람의 앞으로 3년===
(600~700자) 2027년~2029년 이 커플에게 어떤 시기인지 구체적으로.
첫 문단: 2027년 관계에서 중요한 변화나 기회.
두 번째 문단: 2028년 결혼·동거·재물에서 좋은 타이밍인지.
세 번째 문단: 2029년 관계 방향.
마지막 줄: 앞으로 3년 중 가장 중요한 해 하나.

===궁합 총평===
(300~400자) 궁합 점수는 반드시 65점 이상.
첫 문단: 궁합 점수를 100점 만점으로 표현하고 이유 설명.
두 번째 문단: 잘 살기 위한 핵심 조언 2가지.`,

  직장상사: `===왜 이 상사가 나를 힘들게 하는가===
(500~600자) ${nameA}님 입장에서 공감부터.
첫 문단: ${nameA}님의 사주 기질과 ${nameB}님(상사)의 사주 기질이 어떻게 충돌하는지. "당신이 힘든 게 당연해요"로 시작해서 사주 근거로 설명.
두 번째 문단: 이 상사가 ${nameA}님에게 특히 까다롭게 구는 사주적 이유. 악의가 아니라 기질 차이임을 따뜻하게.
마지막 줄: 이 관계를 한 마디로 표현하는 키워드.

===이 상사, 어떻게 하면 잘 지낼 수 있나===
(500~600자) 실질적인 직장 생존 전략.
첫 문단: ${nameB}님(상사) 사주에서 이 사람이 좋아하는 것과 싫어하는 것. 어떻게 접근하면 관계가 풀리는지 구체적으로.
두 번째 문단: ${nameA}님이 이 상사 앞에서 절대 하면 안 되는 행동 2가지, 반대로 효과적인 행동 2가지.
마지막 줄: 이 상사를 내 편으로 만드는 가장 빠른 방법 한 가지.

===이 관계, 언제쯤 나아지나===
(400~500자) 시기 예측.
첫 문단: 지금 이 관계가 힘든 이유가 시기적인 문제인지 구조적인 문제인지.
두 번째 문단: 관계가 나아질 수 있는 시기나 조건. 반대로 더 힘들어질 수 있는 시기 경고.
마지막 줄: 지금 당장 ${nameA}님이 할 수 있는 가장 현실적인 한 가지.

===이 상사 밑에서 내가 성장할 수 있나===
(400~500자) 커리어 관점.
첫 문단: 이 사주 조합에서 ${nameA}님이 ${nameB}님 상사 밑에서 얻을 수 있는 것과 잃을 수 있는 것.
두 번째 문단: 이 관계가 ${nameA}님 커리어에 도움이 되는 조건, 반대로 빨리 벗어나야 하는 신호.
마지막 줄: 이 상사와의 관계에서 ${nameA}님이 놓치지 말아야 할 것.

===관계 총평===
(300~400자)
첫 문단: 이 조합을 100점 만점으로 표현하고 (직장 궁합 기준), 이유를 따뜻하게.
두 번째 문단: ${nameA}님에게 전하는 위로와 핵심 조언.
마지막 줄: 이 관계에서 ${nameA}님이 기억해야 할 한 문장.`,

  직장동료: `===우리, 왜 이렇게 안 맞을까===
(500~600자)
첫 문단: 두 사람의 사주 기질 차이에서 오는 갈등 구조. 악의가 아니라 기질 차이임을 설명.
두 번째 문단: 어떤 상황에서 특히 부딪히는지, 서로 오해하기 쉬운 포인트.
마지막 줄: 이 조합을 한 마디로.

===같이 일하면 어떤 팀이 되나===
(500~600자)
첫 문단: 이 두 사주가 협업할 때 시너지 나는 부분, 서로 보완하는 역할.
두 번째 문단: 프로젝트나 업무에서 충돌이 생기기 쉬운 상황과 예방법.
마지막 줄: 이 팀이 잘 되려면 반드시 필요한 한 가지.

===이 동료, 내 편으로 만들 수 있나===
(400~500자)
첫 문단: 이 사주 조합에서 관계가 좋아지는 조건, 상대방이 ${nameA}님을 신뢰하게 되는 상황.
두 번째 문단: 조심해야 할 행동과 효과적인 접근법.
마지막 줄: 지금 당장 써먹을 수 있는 한 가지.

===앞으로 이 관계===
(300~400자) 직장에서 이 관계가 어떻게 흘러가는지. 좋아지는 시기, 조심해야 할 시기.

===관계 총평===
(300~400자) 직장 동료 궁합 점수와 핵심 조언.`,

  친구: `===우리가 오래된 친구인 이유===
(500~600자)
첫 문단: 두 사람의 사주에서 오래 이어질 수 있는 인연의 근거. 서로 끌리는 이유를 사주로.
두 번째 문단: 친구 사이에서 반복되는 갈등 패턴과 그 사주적 이유.
마지막 줄: 이 우정을 한 마디로.

===이 친구, 내 진짜 편인가===
(500~600자)
첫 문단: 이 사주 조합에서 ${nameB}님이 ${nameA}님에게 어떤 존재인지. 귀인인지 에너지를 소모시키는 관계인지 솔직하게.
두 번째 문단: 이 친구와 함께하면 좋은 것과 조심해야 할 것.
마지막 줄: 이 친구를 대하는 ${nameA}님만의 방법.

===우정이 흔들리는 순간===
(400~500자)
첫 문단: 이 두 사주에서 관계가 멀어지기 쉬운 상황이나 시기.
두 번째 문단: 위기를 넘기는 방법, 이 우정을 지키는 조건.
마지막 줄: 이 친구와 평생 가려면 기억해야 할 한 가지.

===앞으로 3년 이 우정===
(300~400자) 2027~2029년 이 우정의 흐름.

===관계 총평===
(300~400자) 우정 궁합 점수와 핵심 조언.`,

  가족: `===왜 가족인데 이렇게 힘들까===
(500~600자)
첫 문단: ${nameA}님과 ${nameB}님의 사주 기질 차이에서 오는 갈등 구조. "가족이라서 더 힘든 게 맞아요"로 공감부터.
두 번째 문단: 이 두 사주가 만났을 때 특히 부딪히는 상황과 이유.
마지막 줄: 이 관계를 한 마디로.

===이 가족, 어떻게 이해할 수 있나===
(500~600자)
첫 문단: ${nameB}님의 사주 기질로 왜 이런 행동을 하는지. 이해할 수 있는 사주적 근거.
두 번째 문단: ${nameA}님이 이 가족 앞에서 소진되지 않는 방법.
마지막 줄: 이 가족을 대하는 가장 현명한 방법 한 가지.

===이 관계, 나아질 수 있나===
(400~500자)
첫 문단: 관계가 나아질 수 있는 시기나 조건.
두 번째 문단: 반대로 거리를 두는 게 나은 신호가 보이는 경우.
마지막 줄: 지금 ${nameA}님이 할 수 있는 가장 현실적인 한 가지.

===이 가족에게서 받을 수 있는 것===
(300~400자) 힘든 관계지만 이 인연에서 ${nameA}님이 얻을 수 있는 것. 사주적으로 이 관계가 ${nameA}님에게 주는 의미.

===관계 총평===
(300~400자) 가족 궁합 점수와 따뜻한 위로.`,
}

const prompt = `당신은 한국의 사주·명리학 전문가입니다.
두 사람의 관계를 쉽고 솔직하게 분석해주세요.
${공통규칙}

[${nameA} (나)]
- 성별: ${gender || '미입력'} / 생년월일: ${year}년 ${month}월 ${day}일 (${2026 - year}세)
- 년주: ${년주} / 월주: ${월주} / 일주: ${일주} / 시주: ${시주 || '미입력'}

[${nameB} (상대방)]
- 성별: ${pSaju.year ? partnerGender || '미입력' : '미입력'} / 생년월일: ${pSaju.year}년 ${pSaju.month}월 ${pSaju.day}일 (${2026 - pSaju.year}세)
- 년주: ${pSaju.년주} / 월주: ${pSaju.월주} / 일주: ${pSaju.일주} / 시주: ${pSaju.시주 || '미입력'}

관계 유형: ${관계유형}
두 사람을 "${nameA}님"과 "${nameB}님"으로 구분해서 표현하세요.
아래 섹션을 ===섹션제목=== 형태로 작성하세요.

${관계프롬프트[관계유형] || 관계프롬프트['연인']}`

    // 두 사람 사주팔자 데이터를 먼저 전송
    res.write(`data: ${JSON.stringify({
      type: 'gunghab_saju',
      my: { name: nameA, 년주, 월주, 일주, 시주: 시주 || '-' },
      partner: { name: nameB, 년주: pSaju.년주, 월주: pSaju.월주, 일주: pSaju.일주, 시주: pSaju.시주 || '-' }
    })}\n\n`);

    try {
      await streamToClient(res, prompt, MODEL_PAID, 6000);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`);
    }
    return res.end();
  }

  // ── 자녀 천명 분석 ──────────────────────────────────
  if (type === '자녀천명') {
    const childAge = 2026 - year
    const childAgeGroup = childAge <= 13 ? '초등' : childAge <= 16 ? '중등' : childAge <= 19 ? '고등' : '대학이상'

    const childBasePrompt = `당신은 한국의 사주·명리학 전문가이자 아동 교육 전문가입니다.
부모가 읽을 것이므로, 따뜻하고 공감 가는 말투로 이 아이의 타고난 본질을 설명해주세요.
현재는 2026년입니다.

[아이 정보]
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일 (현재 ${childAge}세, ${childAgeGroup})
- 태어난 시간: ${birthtime || '미입력'}
- MBTI: ${mbti || '미입력'}

[사주팔자]
- 년주: ${년주} / 월주: ${월주} / 일주: ${일주} / 시주: ${시주 || '미입력'}

작성 규칙:
1. 호칭: 항상 "이 아이" 또는 "아이"로. "당신" 절대 금지
2. 부모 입장에서 "맞아, 우리 아이가 딱 이래!"가 나와야 함
3. 쉬운 말 사용 — 한자 용어 금지
4. 숫자 목록이나 하이픈 나열 금지 — 자연스러운 문장으로
5. 마크다운 기호 금지
6. 이 아이만의 특징이어야 함 — 누구에게나 해당되는 말 금지

아래 3개 섹션만 작성하세요. 각 섹션은 ===섹션제목=== 형태로 구분하세요.

===타고난 기질===
(400~450자) 이 아이의 본질적인 성격을 부모가 "맞아!"라고 느낄 만큼 정확하게.
첫 문단: 이 아이를 한 마디로 표현하는 이미지로 시작해서, 집에서 보이는 행동 패턴과 감정 표현 방식, 친구들 사이에서 어떤 아이인지를 구체적으로. 부모가 매일 보는 장면이 떠오를 만큼 생생하게 써주세요.
두 번째 문단: 사주 구조로 왜 이런 기질이 나오는지 부모가 이해하기 쉽게. 이 기질의 강점과 함께, 부모가 놓치기 쉬운 이 아이의 숨겨진 면도 짚어주세요.
마지막 줄: "🔒 이 기질을 살리면 어떤 아이로 크는지, 반대로 억누르면 어떻게 되는지는 전체 분석에서 확인하세요"

===재능의 씨앗===
(350~400자) 이 아이가 타고난 재능이 어느 방향으로 향하는지.
첫 문단: 이 아이가 유독 빠져드는 것, 반복해도 안 지치는 것, 가르쳐주지 않아도 잘하는 것이 무엇인지 구체적으로. 이과/문과/예체능 방향 중 어디서 두각을 나타낼지.
두 번째 문단: 지금 이 시기(${childAge}세) 이 아이의 에너지 흐름이 어떤지, 어떤 자극을 줄 때 눈이 빛나는지. 지금 이 시기에 맞는 활동이나 환경을 한 가지만 구체적으로 예시해주세요.
마지막 줄: "📚 지금 어떤 학원에 돈을 써야 하는지, 반대로 효과 없는 사교육은 무엇인지 — 전체 분석에서 확인하세요. 잘못된 방향에 쓰는 학원비가 제일 아깝습니다"

===이 아이가 힘든 순간===
(300~350자) 이 아이가 스트레스받는 상황과 그 이유를 부모가 이해할 수 있게.
첫 문단: 부모가 "아, 그래서 그랬구나"라고 느낄 내용이어야 해요. 단점이 아니라 기질의 특성으로 설명해주세요. 이 아이가 말로 표현 못 하는 속마음까지 짚어주세요.
두 번째 문단: 이런 순간에 부모가 흔히 하는 실수와, 이 아이에게 실제로 통하는 대응 방식을 대비해서 설명해주세요.
마지막 줄: "💡 이 아이의 반항기는 언제 오는지, 그때 어떻게 대응해야 관계가 안 틀어지는지 — 전체 분석에서 미리 확인해두세요. 아는 부모와 모르는 부모의 차이가 큽니다"`;
    const childPaidPrompt = `당신은 한국의 사주·명리학 전문가이자 아동 진로 전문가입니다.
부모가 실질적으로 도움받을 수 있도록 구체적으로 분석해주세요.
현재는 2026년입니다.

[아이 정보]
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일 (현재 ${childAge}세, ${childAgeGroup})
- 태어난 시간: ${birthtime || '미입력'}

[사주팔자]
- 년주: ${년주} / 월주: ${월주} / 일주: ${일주} / 시주: ${시주 || '미입력'}

작성 규칙:
1. 호칭: "이 아이" 또는 "아이"로. "당신" 절대 금지
2. 무료에서 쓴 기질·재능 방향은 반복하지 말고 새로운 각도로
3. 쉬운 말, 나열 금지, 마크다운 금지
4. 부모가 오늘 바로 써먹을 수 있는 실용적 내용 포함
5. 말투는 단호하고 직접적으로. "이 아이에게는 OO가 맞아요" "OO는 절대 안 돼요" 수준으로 콕 찍어서. 두루뭉술한 표현 절대 금지
6. 추천 직업은 반드시 구체적 직업명으로. "창의적인 분야" 같은 추상적 표현 금지. 예: 게임 개발자, 영상 PD, 건축가, 데이터 분석가
7. 공부법도 구체적으로. "집중력이 좋아요" 금지. "오전 10시~12시 혼자 공부, 암기보다 개념 이해 방식" 수준으로
8. 마지막 문장만 따뜻하고 희망적으로 마무리

아래 섹션을 ===섹션제목=== 형태로 작성하세요.

===이 아이에게 맞는 직업 방향===
(500~600자)
첫 문단: 이 사주에서 가장 잘 맞는 직업군 5~6가지를 구체적으로 예시하고 왜 맞는지 설명하세요. 직장인/프리랜서/창업 중 어떤 방향이 맞는지, 어떤 환경에서 능력이 폭발하는지.
두 번째 문단: 이과/문과/예체능 중 어디가 유리한지, 어떤 전공이 잘 맞는지 구체적으로.

===공부가 잘 되는 방법===
(400~500자)
첫 문단: 이 아이가 집중력이 올라가는 상황과 시간대, 혼자 공부가 맞는지 그룹이 맞는지, 어떤 방식으로 배울 때 가장 잘 흡수하는지.
두 번째 문단: 반대로 이 아이에게 절대 하면 안 되는 공부 방식, 부모가 조심해야 할 행동 패턴.

===입시·취업 유리한 시기===
(300~400자) 이 사주에서 시험 운이 강한 나이대를 구체적으로. 현재 ${childAge}세 기준으로 앞으로 언제가 가장 중요한 시기인지. 조심해야 할 시기도 포함.

===친구 관계 패턴===
(300~350자) 이 아이가 어떤 친구들과 잘 맞는지, 또래 관계에서 보이는 특징, 갈등이 생기는 상황과 이유. 부모가 도와줄 수 있는 방법.

===이 아이의 인생 흐름===
(400~500자) 3단계로 나눠서:
- 지금~20대 초반: 어떤 시기인지, 무엇에 집중해야 하는지
- 20대 중반~30대: 어떤 방향으로 흘러가는지, 기회가 오는 시기
- 30대 이후: 이 사주가 꽃피는 시기는 언제인지
부모가 아이의 미래를 이해하는 데 도움이 되는 내용으로.

===이 아이를 키우는 핵심 비법===
(300~400자) 이 아이의 잠재력을 최대로 끌어내기 위해 부모가 해야 할 것과 절대 하면 안 되는 것. 오늘 바로 써먹을 수 있는 구체적 조언 포함.

===이 아이가 빛나는 조건===
(250~300자) 이 사주에서 이 아이의 잠재력이 폭발하는 환경을 구체적으로.
첫 문단: 이 아이가 집중력이 올라가고 자신감이 생기는 공간·분위기·관계의 특징. 어떤 선생님 스타일에서 능력이 폭발하는지.
두 번째 문단: 이 아이 방 환경, 공부 공간 세팅, 루틴에서 부모가 바로 적용할 수 있는 구체적인 조언 1~2가지.
부모가 오늘 당장 바꿔볼 수 있는 내용으로 마무리해주세요.`;
    try {
      if (!isPaid) {
        await streamToClient(res, childBasePrompt, MODEL_FREE, 2500);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'paid_start' })}\n\n`);
        await streamToClient(res, childPaidPrompt, MODEL_PAID, 6000);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`);
    }
    return res.end();
  }

  // ── 노후 분석 ──────────────────────────────────
if (type === '노후') {
  const nohuBasePrompt = `당신은 한국의 사주·명리학 전문가입니다.
현재는 2026년입니다.

${infoBlock}

${공통규칙}

아래 3개 섹션만 작성하세요. 각 섹션은 ===섹션제목=== 형태로 구분하세요.

===말년 재물운===
(300~350자)
첫 문단: 노후에 돈이 안정적으로 들어오는 구조인지, 말년 재물의 흐름을 솔직하게.
두 번째 문단: 노후 재물에서 가장 조심해야 할 패턴 하나.
마지막 줄: "🔒 노후 자산을 지키는 구체적 방법과 절대 하면 안 되는 투자 실수는 전체 분석에서 확인하세요"

===건강운===
(250~300자)
첫 문단: 이 사주에서 특히 챙겨야 할 신체 부위나 건강 패턴.
두 번째 문단: 지금부터 관리하면 노후가 달라지는 한 가지.
마지막 줄: "🔒 건강 위기가 올 수 있는 나이대와 예방법은 전체 분석에서 확인하세요"

===황혼 인연===
(250~300자)
첫 문단: 노후 인간관계와 가족 관계의 흐름, 의지할 수 있는 사람이 있는 사주인지.
두 번째 문단: 황혼 인연운, 외롭지 않게 사는 이 사주만의 조건.
마지막 줄: "🔒 황혼기에 진짜 내 편이 되는 사람의 특징은 전체 분석에서 확인하세요"

// 교체 후
===__행운미리보기__===
이 사주의 행운 색깔 하나만 알려주세요.
형식: 색깔: O
절대 다른 항목(마스코트, 방향, 숫자, 아이템)은 쓰지 마세요. 색깔 한 줄만.

===__운세점수__===
`;


const nohuPaidPrompt = `당신은 한국의 사주·명리학 전문가입니다.
현재는 2026년입니다.

${infoBlock}

${공통규칙}

무료 분석 내용은 반복하지 마세요. 각 섹션은 ===섹션제목=== 형태로 구분하세요.

===노후 재물 심화===
(500~600자)
첫 문단: 노후 자산을 지키는 이 사주만의 전략, 수익형 자산 방향, 절대 하면 안 되는 투자 실수.
두 번째 문단: 재물이 안정되는 구체적 나이대와 그 전에 준비해야 할 것.

===건강 심화===
(400~500자)
첫 문단: 건강 위기가 올 수 있는 나이대, 특히 챙겨야 할 신체 부위와 관리법.
두 번째 문단: 이 사주에 맞는 생활 습관, 오래 건강하게 사는 조건.

===황혼 인연 심화===
(400~500자)
첫 문단: 가족 관계 흐름, 자녀와의 관계, 노후에 의지가 되는 사람.
두 번째 문단: 황혼 인연운, 새로운 인연이 생기는 시기와 조건.

===노후 투자 · 부동산===
(400~500자)
첫 문단: 이 사주에 맞는 노후 자산 운용 방향. 부동산/금융/현금 중 어떤 비중이 맞는지.
두 번째 문단: 절대 하면 안 되는 투자 실수, 노후 수익 파이프라인 전략.

===緣 · 사람과 인연===
(400~500자)
첫 문단: 노후에 진짜 내 편이 되는 사람의 특징, 독이 되는 사람 유형.
두 번째 문단: 황혼기 귀인이 나타나는 상황, 인간관계에서 조심해야 할 패턴.

===月運 · 월별 운세===
2026년 7월부터 2027년 6월까지 월별 운세 흐름을 한 줄씩. 형식: 7월: (내용) / 8월: (내용) / 9월: (내용) / 10월: (내용) / 11월: (내용) / 12월: (내용) / 2027년 1월: (내용) / 2월: (내용) / 3월: (내용) / 4월: (내용) / 5월: (내용) / 6월: (내용)
모든 달이 좋거나 나쁜 말로 채워지면 안 됩니다. 이 사주에서 실제로 보이는 흐름 기준으로.

색깔: O / 마스코트: O / 방향: O / 숫자: O / 아이템: O
중요: 각 항목에 딱 1개만. 쉼표나 슬래시로 여러 개 나열하면 절대 안 됩니다. 색깔 하나, 마스코트 하나, 방향 하나, 숫자 하나, 아이템 하나. 예시: 색깔: 파란색 / 마스코트: 거북이 / 방향: 남쪽 / 숫자: 7 / 아이템: 가죽 지갑
(노후 시기에 특히 도움이 되는 아이템 기준으로)

===노후를 빛나게 하는 법===
(400~500자)
첫 문단: 이 사주가 노후에 진짜 행복해지는 조건, 지금부터 준비하면 달라지는 것들.
두 번째 문단: 오늘 바로 실천할 수 있는 구체적 행동 조언.`
  try {
    if (!isPaid) {
      await streamToClient(res, nohuBasePrompt, MODEL_FREE, 2500);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'paid_start' })}\n\n`);
      await streamToClient(res, nohuPaidPrompt, MODEL_PAID, 6000);
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`);
  }
  return res.end();
  // ── 길일 추천 ──────────────────────────────────
  if (type === '길일') {
    const { 목적 } = req.body;

const gililPrompt = `당신은 한국의 사주·명리학 전문가입니다.
현재는 2026년입니다. 오늘 날짜 기준으로 앞으로 3개월 이내 날짜만 추천하세요.

[의뢰인 사주 정보]
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일
- 태어난 시간: ${birthtime || '미입력'}
- 년주: ${년주} / 월주: ${월주} / 일주: ${일주} / 시주: ${시주 || '미입력'}

[목적]
${목적}

작성 규칙:
1. 반드시 ${목적}에 맞는 구체적인 날짜를 추천하세요
2. 날짜는 2026년 기준 앞으로 3개월 이내로만
3. 요일 언급 금지
4. 어려운 한자 용어 금지
5. 숫자 목록이나 하이픈 나열 금지
6. 마크다운 기호 금지
7. 따뜻하고 공감 가는 말투

아래 4개 섹션을 ===섹션제목=== 형태로 작성하세요.

===${목적}과 이 사주===
(250~300자)
이 사람의 사주에서 ${목적}과 관련된 기운을 분석해주세요.
첫 문단: 이 사주가 ${목적}에 어떤 특성을 가지고 있는지, 유리한 점과 조심해야 할 점을 구체적으로.
두 번째 문단: ${목적}을 앞두고 이 사람이 특히 신경써야 할 한 가지.

===추천 길일 3가지===
(400~500자)
이 사람의 사주와 가장 잘 맞는 날짜 3개를 구체적으로 추천하세요.
반드시 아래 형식으로 작성하세요:

○월 ○일 — 이 날을 추천하는 이유를 이 사람의 사주 구조와 연결해서 2~3문장으로.

○월 ○일 — 이 날을 추천하는 이유를 이 사람의 사주 구조와 연결해서 2~3문장으로.

○월 ○일 — 이 날을 추천하는 이유를 이 사람의 사주 구조와 연결해서 2~3문장으로.

마지막 줄: 세 날짜 중 가장 강력한 날 하나를 꼭 짚어주세요.

===피해야 할 시기===
(200~250자)
앞으로 3개월 안에 ${목적}을 피해야 할 시기나 날짜를 2개 구체적으로 알려주세요.
이유를 이 사람의 사주 기준으로 설명해주세요.

===${목적} 성공을 위한 조언===
(250~300자)
날짜 외에 이 사람이 ${목적}을 잘 마무리하기 위해 사주 기준으로 실천할 수 있는 구체적인 조언 2~3가지.
따뜻하고 희망적인 마무리로 끝내주세요.`;
    try {
      await streamToClient(res, gililPrompt, MODEL_PAID, 4000);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`);
    }
    return res.end();
  }
}
  // ── 9900원 심화 분석 ──────────────────────────────────
  if (type === '심화') {
   const deepPrompt = `당신은 한국의 사주·명리학 전문가입니다.
쉽고 따뜻한 말투로 분석해주세요. 현재는 2026년입니다.
MBTI는 반드시 영문 대문자로 표기하세요. (예: ESFJ, INTJ, ENFP) 절대로 한글로 풀어쓰지 마세요.
문장은 자연스러운 한국어로 써주세요. 어색하거나 번역투 표현은 절대 사용하지 마세요.

${infoBlock}

${공통규칙}

각 섹션은 ===섹션제목=== 형태로 구분하세요.

[중요] 각 섹션은 서로 내용이 겹치면 안 됩니다. 大運은 큰 흐름만, 運路는 현재 대운 디테일만, 年運은 2027년만, 貴人은 기본 분석 緣 섹션과 완전히 다른 각도(귀인을 만나는 구체적 상황·시기 중심)로 작성하세요.

===大運 · 10년 대운 흐름===
(900~1000자) 이 사람의 앞으로 10년 대운을 3단계로 나눠서.
첫 문단: 지금 이 시기(2026~2028) — 기회인지 준비 시기인지 단호하게 콕 찍어서. 지금 당장 해야 할 것과 절대 하면 안 되는 것을 구체적으로.
두 번째 문단: 중간 시기(2029~2031) — 재물·직업·인간관계 중 가장 크게 움직이는 영역 하나만 콕 찍어서. 이 시기를 어떻게 준비하느냐가 인생을 바꾼다는 걸 단호하게.
세 번째 문단: 후반 시기(2032~2036) — 이 사주가 꽃피는 시기가 언제인지 구체적으로. 지금부터 뭘 준비하면 달라지는지 행동 단위로.
마지막 줄: 앞으로 10년 중 가장 중요한 해 하나만 콕 찍고, 그 해를 잘 보내기 위한 핵심 한 가지. 따뜻하고 희망적으로 마무리.

===運路 · 대운 상세 분석===
(900~1000자) 이 사람의 대운 흐름을 구체적으로.
첫 문단: 현재 대운 기운을 콕 찍어서 — 이 대운이 이 사람에게 득인지 실인지 단호하게. 재물·직업·인간관계 중 지금 가장 크게 움직이는 영역 하나만.
두 번째 문단: 현재 대운에서 가장 좋은 시기 콕 찍어서, 절대 조심해야 할 시기도 콕 찍어서. "이 시기에 이걸 하면 후회해요" 수준으로 단호하게.
세 번째 문단: 다음 대운이 언제 시작되는지, 어떤 기운으로 바뀌는지. 지금부터 뭘 준비하면 달라지는지 행동 단위로.
마지막 줄: 이 대운을 가장 잘 활용하는 핵심 한 가지. 따뜻하고 희망적으로 마무리.

===年運 · 2027년 흐름===
(900~1000자) 2027년 전체 흐름.
첫 문단: 2027년이 이 사람에게 상승인지 안정인지 전환점인지 단호하게 콕 찍어서. 두루뭉술하게 말하지 말고 "2027년은 OO의 해예요" 수준으로.
두 번째 문단: 2027년 상반기(1~6월) — 재물·직업·인간관계 중 가장 중요한 것 하나만 콕 찍어서 구체적으로.
세 번째 문단: 2027년 하반기(7~12월) — 절대 조심해야 할 달 하나, 적극적으로 움직여야 할 달 하나 콕 찍어서.
마지막 줄: 2027년 핵심 조언 한 문장. 따뜻하고 희망적으로 마무리.

===貴人 · 귀인 분석===
(900~1000자) 기본 분석에서 귀인의 특징은 이미 다뤘어요. 여기서는 절대 반복하지 마세요. 대신 이것만:
첫 문단: 귀인을 만날 수 있는 구체적 시기(연도·계절)와 상황(어떤 자리·어떤 계기). "이런 사람 만나면 절대 놓치지 마세요" 수준으로 단호하게.
두 번째 문단: 귀인을 만날 가능성이 높은 구체적 시기와 상황. 반대로 내 발목 잡는 사람 유형도 콕 찍어서 — "이런 사람은 멀리하세요" 단호하게.
마지막 줄: 귀인을 알아보고 잡는 이 사주만의 방법. 따뜻하고 희망적으로 마무리.

===道 · 지금 해야 할 것 vs 하지 말아야 할 것===
(900~1000자) 이 사주 기준으로 지금 이 시기에 맞는 행동 전략.
첫 문단: 지금 당장 시작해야 할 것 2~3가지를 콕 찍어서. 추상적인 말 금지 — "매일 OO하세요" 수준으로 구체적으로. 왜 지금이 타이밍인지 단호하게.
두 번째 문단: 지금 절대 하면 안 되는 것 2~3가지 콕 찍어서. "지금 이걸 하면 반드시 후회해요" 수준으로 단호하게. 사주 근거도 붙여서.
마지막 줄: 2027년을 맞이하기 위해 지금 가장 중요한 한 가지. 따뜻하고 희망적으로 마무리.`;

    try {
      res.write(`data: ${JSON.stringify({ type: 'paid_start' })}\n\n`);
      await streamToClient(res, deepPrompt, MODEL_PAID, 8000);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`);
    }
    return res.end();
  }
  // ── 무료 프롬프트 ──────────────────────────────────
  const basePrompt = `당신은 한국의 사주·명리학 전문가입니다.
읽는 사람이 "이거 나 얘기잖아?"라고 느낄 만큼 이 사람만의 특징을 정확하게 분석해주세요.
현재는 2026년입니다.

${infoBlock}

${공통규칙}

중요: 아래 3개 섹션만 작성하세요. 다른 섹션은 절대 추가하지 마세요.
각 섹션은 ===섹션제목=== 형태로 구분하세요.

===Part 0. 나를 읽다===
(300~350자)
첫 문단: 이 사람을 딱 한 마디로 표현하는 이미지로 시작해서, 겉모습과 속마음의 차이, 주변이 이 사람을 어떻게 느끼는지 정확하게. 이 사주 구조에서 실제로 두드러지는 특징이어야 해요.
두 번째 문단: 사주 구조로 왜 이런 특성이 나오는지 쉬운 말로.
마지막 줄: 이 사주를 딱 한 단어로 표현하는 키워드를 제시하되 그 의미와 영향은 알려주지 마세요. 형식: "🔒 이 사주를 한 단어로 표현하면 '[키워드]'입니다. 이 키워드가 당신의 돈·직업·연애에 어떻게 작용하는지는 전체 분석에서 확인하세요"

===Part 1. 돈의 흐름===
(250~300자)
첫 문단: 돈이 들어오는 방식 (한방형/꾸준형/말년형 중 이 사주에 맞는 것), 돈을 잃는 패턴이 있다면 정확하게.
두 번째 문단: 이 사주에서 돈이 가장 크게 움직이는 나이대가 있는데, 그 나이대만 범위로 힌트 (예: "30대 후반", "40대 중반"). 구체적 내용은 절대 알려주지 마세요.
마지막 줄: "🔒 그 시기를 앞두고 지금 반드시 알아야 할 한 가지가 있습니다. 구체적 시기·절대 하면 안 되는 돈 실수·투자 방향은 전체 분석에서 확인하세요"

${getAgeBasedFreeSection(year, maritalStatus)}

===__행운미리보기__===
이 사주의 행운 색깔 하나만 알려주세요.
형식: 색깔: O
절대 다른 항목(마스코트, 방향, 숫자, 아이템)은 쓰지 마세요. 색깔 한 줄만.

`;

  // ── 유료 전용 프롬프트 ──────────────────────────────
  const paidOnlyPrompt = `당신은 한국의 사주·명리학 전문가입니다.
쉽고 솔직한 말투로 분석해주세요. 현재는 2026년입니다.

${infoBlock}

${공통규칙}

[중요] 무료 분석에서 이미 다룬 내용 (사주 기운, 재물 패턴 힌트, 나이대별 핵심운 방향)은 절대 반복하지 마세요.

각 섹션은 ===섹션제목=== 형태로 구분하세요.

===財運 · 인생 재물 전체===
(500~600자) 이 사람의 인생 전체 재물 흐름.
첫 문단: 3단계로 나눠서 — 젊은 시절(20~30대) 돈 흐름 / 중년(40~50대) 재물이 가장 크게 움직이는 시기 구체적으로 / 말년(60대 이후) 노후가 괜찮은 사주인지 솔직하게. 좋은 말만 하지 말고 이 사주에서 돈이 새는 패턴을 콕 찍어서.
두 번째 문단: 절대 하면 안 되는 돈 실수를 구체적으로 (예: "보증 서면 안 돼요", "공동 투자는 독이에요"). 돈이 가장 잘 모이는 조건도 뾰족하게.
어투는 단호하고 직접적으로. 마지막 문장만 따뜻하고 희망적으로.

===職 · 직업과 커리어===
(500~600자)
첫 문단: 이 사주에 가장 잘 맞는 직업을 3~4가지 콕 찍어서. 직업명을 구체적으로 (예: 컨설턴트, 강사, 부동산 중개인 등). 단순 나열이 아니라 왜 이 사주에 맞는지 이유를 붙여서. 직장인/프리랜서/사업 중 어떤 구조가 맞는지, 어떤 환경에서 능력이 폭발하는지.
두 번째 문단: 커리어에서 크게 도약할 수 있는 구체적 시기, 절대 큰 결정 내리면 안 되는 시기. 단호하고 직접적인 어투로.

===富 · 투자와 부동산===
(500~600자) 주식 투자 성향 / 부동산 투자 방향 / 실거주 환경 / 수익 파이프라인 전략 — 4가지를 자연스러운 문장으로.
${투자거주힌트}
어투는 단호하고 직접적으로. "이 사주에서 OO는 독이에요", "지금 OO하면 후회해요" 같은 강한 표현 사용. 좋은 것만 말하지 말고 하면 안 되는 것도 콕 찍어서.
마지막 줄: "이 사주에 가장 잘 맞는 핵심 투자 방식은 O입니다. 반대로 절대 손대면 안 되는 것은 O입니다."
${getAgeBasedPaidSection(year, maritalStatus)}

===緣 · 사람과 인연===
(400~500자)
첫 문단: 진짜 내 편이 되어줄 사람의 특징을 콕 찍어서 (직업군, 성격, 띠 등 구체적으로). 반대로 이 사주에서 독이 되는 사람 유형도 단호하게 — "이런 사람 곁에 두면 반드시 손해봐요" 수준으로.
두 번째 문단: 인간관계에서 이 사람이 반복하는 실수 패턴을 찌르고, 귀인이 나타나는 구체적 상황. 마지막 문장만 따뜻하고 희망적으로.

===月運 · 월별 운세===
2026년 7월부터 2027년 6월까지 월별 운세 흐름을 한 줄씩. 형식: 7월: (내용) / 8월: (내용) / 9월: (내용) / 10월: (내용) / 11월: (내용) / 12월: (내용) / 2027년 1월: (내용) / 2월: (내용) / 3월: (내용) / 4월: (내용) / 5월: (내용) / 6월: (내용)
모든 달이 좋거나 나쁜 말로 채워지면 안 됩니다. 이 사주에서 실제로 보이는 흐름 기준으로.

===幸 · 나를 돕는 것들===
색깔: O / 마스코트: O / 방향: O / 숫자: O / 아이템: O
중요: 각 항목에 딱 1개만.

===道 · 이 사주로 잘 사는 법===
(400~500자)
첫 문단: 이 사주가 잘 풀리는 조건을 딱 2~3가지만 콕 찍어서. "이것만 지키면 돼요" 수준으로 단호하게. 반대로 이 사주가 망하는 패턴도 하나만 찌르기.
두 번째 문단: 지금 당장 오늘부터 실천할 수 있는 행동 조언 2가지. 추상적인 말 금지 — "매일 아침 OO하세요" 수준으로 구체적으로. 마지막 문장은 따뜻하고 희망적으로 마무리.`;

// 유료 분석 후 점수도 별도 요청

  try {
    if (!isPaid) {
      // 무료: haiku로 3섹션만
      await streamToClient(res, basePrompt, MODEL_FREE, 3500);
    } else {
      // 유료: 무료 재호출 없이 바로 paid_start → 유료 전용만 스트리밍
      // (무료 결과는 프론트에서 그대로 유지됨)
      res.write(`data: ${JSON.stringify({ type: 'paid_start' })}\n\n`);
      await streamToClient(res, paidOnlyPrompt, MODEL_PAID, 10000);
    }
    // 점수 별도 요청
if (true) {
  try {
    const scoreText = await getScoreOnly(infoBlock);
    const scoreJson = scoreText.match(/\{[\s\S]*?\}/)?.[0];
    if (scoreJson) res.write(`data: ${JSON.stringify({ type: 'score', text: `===__운세점수__===\n${scoreJson}` })}\n\n`);
  } catch {}
}
res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (e) {
    console.error(e);
    res.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`);
  }

  res.end();
});

// ── PDF 생성 API ──────────────────────────────────────
app.post('/api/pdf', async (req, res) => {
  const { html, filename } = req.body;
  if (!html) return res.status(400).json({ error: 'html 없음' });

  let browser;
  try {
    const chromium = require('@sparticuz/chromium');
    const puppeteer = require('puppeteer-core');

    // Render 환경에서 chromium 실행 파일 경로 명시
    const executablePath = process.env.CHROME_PATH
      || await chromium.executablePath('/opt/render/.cache/puppeteer/chrome')
      || '/usr/bin/google-chrome-stable';

    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1280, height: 800 },
      executablePath,
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
      printBackground: true,
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename || '마이사주_결과')}.pdf`);
    res.send(pdf);
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    console.error('PDF 생성 오류:', e);
    res.status(500).json({ error: 'PDF 생성 실패' });
  }
});

// ── 이메일 발송 API ──────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !html) return res.status(400).json({ error: '이메일 또는 내용 없음' });

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `마이사주 <${process.env.GMAIL_USER}>`,
      to,
      subject: subject || '마이사주 분석 결과',
      html,
    });

    res.json({ success: true });
  } catch (e) {
    console.error('이메일 발송 오류:', e);
    res.status(500).json({ error: '이메일 발송 실패' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
