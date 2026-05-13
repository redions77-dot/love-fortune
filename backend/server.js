const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const KoreanLunarCalendar = require('korean-lunar-calendar');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 음력→양력 변환
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

function get시주(birthtime, 일천간index) {
  if (!birthtime) return null;
  const [h] = birthtime.split(':').map(Number);
  const 시지index = Math.floor(((h + 1) % 24) / 2) % 12;
  const 시간시작표 = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
  const 시천간index = (시간시작표[일천간index] + 시지index) % 10;
  return 천간[시천간index] + 지지[시지index];
}

// 시주 지지 → 투자/거주 방향
function get시지라벨(시주) {
  if (!시주) return null;
  const 지지한자 = 시주.replace(/[가-힣]/g, '').slice(-1);
  const map = {
    '子': { 투자: '금융·저축·현금성 자산 (유동성이 높은 것)', 거주: '북쪽 방향, 물 가까운 곳이나 낮은 지대' },
    '丑': { 투자: '부동산·토지·안정적인 실물 자산', 거주: '북동쪽, 조용하고 안정된 주거지' },
    '寅': { 투자: '성장주·스타트업·교육·콘텐츠 분야', 거주: '동북쪽, 숲이나 공원 가까운 곳' },
    '卯': { 투자: '문화·예술·미디어·플랫폼 관련 업종', 거주: '동쪽, 햇빛이 잘 드는 동향 집' },
    '辰': { 투자: '부동산·인프라·장기 안정 투자', 거주: '동남쪽, 탁 트인 전망이 있는 곳' },
    '巳': { 투자: 'IT·전자·에너지·고성장 분야', 거주: '남동쪽, 밝고 활기찬 신도시나 상업지구' },
    '午': { 투자: '주식·금융 상품·유동성 자산', 거주: '남쪽, 따뜻하고 활기찬 도심지' },
    '未': { 투자: '부동산·전통 업종·안정 배당주', 거주: '남서쪽, 주거 환경이 안정된 곳' },
    '申': { 투자: '금·귀금속·우량주·채권', 거주: '서남쪽, 정돈된 주거 단지나 아파트' },
    '酉': { 투자: '금융·보험·안정적 수익형 자산', 거주: '서쪽, 조용하고 깔끔한 주거지' },
    '戌': { 투자: '부동산·리모델링·실물 자산', 거주: '서북쪽, 넓고 여유 있는 주거 환경' },
    '亥': { 투자: '무역·해외 투자·유동성 자산', 거주: '북서쪽, 물 가까운 곳이나 개방적인 공간' },
  };
  return map[지지한자] || null;
}

// 결혼상태별 포커스 — 무료/유료 완전 분리
function getMaritalFocus(maritalStatus) {
  switch (maritalStatus) {
    case '미혼':
      return {
        label: '미혼',
        // 무료: 인연의 느낌과 분위기 중심
        focus: `===인연운===
이 사람은 미혼입니다. (400~500자, 자연스러운 문장으로)
어떤 시기에 인연이 찾아오는지, 어떤 스타일의 사람과 잘 맞는지, 어떤 상황에서 만날 가능성이 높은지, 연애할 때 이 사람만의 특징을 설레고 따뜻한 말투로 써주세요.`,
        // 유료: 사주 구조 근거 + 결혼 타이밍 + 패턴 분석 — 무료 내용 반복 금지
        paidFocus: `===인연운 심화===
무료에서 쓴 인연의 분위기·스타일 설명은 반복하지 마세요.
이번엔 다른 각도로 분석해주세요. (500~600자)
배우자 자리(사주 구조상 배우자를 나타내는 기운)의 특징, 결혼 가능성이 높은 구체적 시기, 이 사주가 연애에서 반복하기 쉬운 패턴과 그 이유, 그리고 결혼으로 이어지려면 무엇이 필요한지를 써주세요.`
      };
    case '기혼':
      return {
        label: '기혼',
        // 무료: 지금 부부 사이의 분위기와 흐름
        focus: `===부부운===
이 사람은 기혼입니다. (400~500자, 자연스러운 문장으로)
지금 부부 사이의 전반적인 분위기, 배우자와 잘 맞는 점과 갈등이 생기기 쉬운 부분, 2026년 부부 관계의 흐름을 현실적이고 따뜻하게 써주세요.`,
        // 유료: 사주 구조 근거 + 배우자 복 + 가정운 — 무료 내용 반복 금지
        paidFocus: `===부부운 심화===
무료에서 쓴 부부 분위기·갈등 패턴 설명은 반복하지 마세요.
이번엔 다른 각도로 분석해주세요. (500~600자)
사주 구조로 보는 배우자 복이 있는지, 2026년 부부 사이에 특히 주의해야 할 시기와 좋은 시기, 가정운과 자녀운의 흐름을 써주세요.`
      };
    case '돌싱':
      return {
        label: '돌싱(이혼 1회)',
        focus: `===재혼운===
이 사람은 이혼 경험이 있습니다. (400~500자, 자연스러운 문장으로)
다음 인연이 찾아오는 시기와 분위기, 다음 인연은 어떤 스타일인지, 새 출발을 위해 사주가 전하는 메시지를 판단 없이 따뜻하게 써주세요.`,
        paidFocus: `===재혼운 심화===
무료에서 쓴 다음 인연의 분위기·시기 설명은 반복하지 마세요.
이번엔 다른 각도로 분석해주세요. (500~600자)
전 결혼에서 반복되기 쉬운 패턴과 그 사주적 이유, 재혼 상대로 잘 맞는 유형, 혼자인 지금 이 시간의 의미와 어떻게 활용하면 좋은지를 써주세요.`
      };
    case '돌싱2+':
      return {
        label: '돌싱2+(이혼 2회 이상)',
        focus: `===재혼운 · 결혼 패턴===
이 사람은 이혼을 두 번 이상 경험했습니다. (400~500자, 자연스러운 문장으로)
이런 패턴이 반복된 이유를 사주 관점에서 따뜻하게 설명하고, 앞으로의 인연운과 이 사주의 진짜 강점을 비판 없이 공감하는 말투로 써주세요.`,
        paidFocus: `===결혼 패턴 심화===
무료에서 쓴 반복 패턴의 이유 설명은 반복하지 마세요.
이번엔 다른 각도로 분석해주세요. (500~600자)
반복을 끊기 위해 실제로 바꿀 수 있는 것, 재혼 가능성과 잘 맞는 상대 유형, 혼자 살아도 행복한 사주인지 재혼이 더 맞는 사주인지를 써주세요.`
      };
    default:
      return {
        label: '미입력',
        focus: `===인연운===
연애운과 결혼운을 전반적으로 분석해주세요. (400~500자)`,
        paidFocus: `===인연운 심화===
무료에서 쓴 내용은 반복하지 말고, 사주 구조 근거와 구체적 시기 중심으로 새롭게 써주세요. (500~600자)`
      };
  }
}

app.post('/api/analyze', async (req, res) => {
  const { gender, birthdate, birthtime, mbti, blood, type, isPaid, isLunar, maritalStatus } = req.body;

  if (!birthdate) return res.status(400).json({ error: '생년월일을 입력해주세요.' });

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
  const marital = getMaritalFocus(maritalStatus);
  const 시지힌트 = get시지라벨(시주);

  const 투자거주힌트 = 시지힌트
    ? `시주 지지 기반 힌트 (이 내용을 투자 섹션에 자연스럽게 녹여주세요):
  - 투자에 유리한 방향: ${시지힌트.투자}
  - 실거주에 좋은 환경: ${시지힌트.거주}`
    : `시주 정보 없음 — 일주 지지 기준으로 투자/거주 방향을 분석해주세요.`;

  // ─────────────────────────────────────────
  // 공통 시스템 지시
  // ─────────────────────────────────────────
  const 공통규칙 = `작성 규칙 (반드시 지킬 것):
1. 쉬운 말 사용 — 어려운 한자 용어는 쓰지 말고 쉬운 말로 대체. 예: "인성" → "나를 도와주는 기운", "비겁" → "나와 비슷한 기운의 사람들", "식신" → "타고난 재능과 표현력", "편관" → "나를 이끄는 강한 기운"
2. 숫자 목록(1. 2. 3.)이나 하이픈(-) 나열 형식 금지 — 자연스러운 문장으로 풀어 쓸 것
3. 마크다운 기호(**, ##, * 등) 사용 금지
4. 각 섹션은 두 문단으로 구성 — 첫 문단: 공감 가는 설명, 둘째 문단: 사주 근거를 쉬운 말로
5. 인터넷 유행어·밈은 전체 응답에서 최대 2개`;

  // ─────────────────────────────────────────
  // 무료 프롬프트 — 4섹션
  // ─────────────────────────────────────────
  const basePrompt = `당신은 한국의 사주·명리학 전문가입니다.
쉽고 따뜻한 말투로, 읽는 사람이 "맞아, 이게 나야"라고 느낄 수 있게 분석해주세요.
현재 연도는 2026년(丙午년)입니다.

[기본 정보]
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일 ${isLunar ? '(음력→양력)' : '(양력)'}
- 태어난 시간: ${birthtime || '미입력'}
- MBTI: ${mbti || '미입력'}
- 혈액형: ${blood ? blood + '형' : '미입력'}
- 결혼 상태: ${marital.label}

[사주팔자]
- 년주: ${년주} / 월주: ${월주} / 일주: ${일주} / 시주: ${시주 || '미입력'}

${공통규칙}

아래 4개 섹션을 ===섹션제목=== 형태로 구분해서 작성하세요.

===나의 사주 기운===
(400~500자) 이 사람을 한 마디로 표현하는 비유로 시작해서, 겉모습과 속마음의 차이, 타고난 성향을 공감 가는 말투로 풀어주세요. 두 번째 문단에서 사주 구조가 왜 이런 특성을 만드는지 쉬운 말로 설명하세요.

===재물운===
(400~500자) 첫 문단: 돈이 들어오는 방식, 이 사람만의 돈 버는 스타일, 돈과의 관계를 구체적이고 공감 가는 말투로 설명하세요. 두 번째 문단: 돈을 모을 때 유리한 조건, 조심해야 할 상황, 2026년 재물 흐름의 핵심 포인트를 쉬운 말로 설명하세요.
마지막 줄: "💰 직업·투자·부동산 상세 분석은 전체 분석에서 확인하세요"

===학운 · 재능===
(400~500자) 첫 문단: 어떤 방식으로 배울 때 잘 흡수하는지, 타고난 재능이 빛나는 분야, 집중력이 잘 발휘되는 상황을 공감 가는 말투로 설명하세요. 두 번째 문단: 태어난 시간(${birthtime ? birthtime + ', 시주: ' + (시주 || '계산불가') : '시간 미입력 — 일주 기준으로 분석'})이 재능과 어떤 연관인지, 2026년에 자격증·시험·새 배움을 시작하기 좋은 시기가 있다면 알려주세요.
마지막 줄: "📚 직업·커리어 상세 분석은 전체 분석에서 확인하세요"

${marital.focus}`;

  // ─────────────────────────────────────────
  // 유료 전용 프롬프트 — 무료와 완전 분리된 6섹션
  // 무료에서 나온 내용(사주 기운, 재물운 기본, 학운, 인연/부부운 기본)은 다루지 않음
  // ─────────────────────────────────────────
  const paidOnlyPrompt = `당신은 한국의 사주·명리학 전문가입니다.
쉽고 따뜻한 말투로 분석해주세요.
현재 연도는 2026년(丙午년)입니다.

[기본 정보]
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일
- 태어난 시간: ${birthtime || '미입력'}
- MBTI: ${mbti || '미입력'}
- 혈액형: ${blood ? blood + '형' : '미입력'}
- 결혼 상태: ${marital.label}

[사주팔자]
- 년주: ${년주} / 월주: ${월주} / 일주: ${일주} / 시주: ${시주 || '미입력'}

${공통규칙}

이미 무료 분석에서 다음 내용을 설명했습니다:
- 전체적인 사주 기운과 성격 특징
- 재물이 들어오는 방식과 2026년 재물 흐름 개요
- 학습 스타일과 재능 분야 개요
- 인연운/부부운의 전반적인 분위기와 흐름

아래 6개 섹션은 위 내용과 겹치지 않게, 완전히 새로운 각도로 분석해주세요.
각 섹션은 ===섹션제목=== 형태로 구분하세요.

===직업운 · 커리어===
(500~600자) 첫 문단: 이 사주에 가장 잘 맞는 직업군 3~4가지를 구체적으로 예시하고, 직장인이 맞는지 프리랜서·사업이 맞는지, 어떤 환경에서 능력이 폭발하는지 설명하세요. 두 번째 문단: 2026년 커리어 흐름 — 이직·창업·승진 등 변화가 예상되는 시기와 주의할 시기를 쉬운 말로 설명하세요.

===투자 · 재테크===
(500~600자) 다음 4가지를 자연스러운 문장으로 모두 담아주세요.
주식 투자 성향(단기/장기, 어떤 업종이 맞는지), 부동산 투자 방향(아파트/토지/상가 등 어떤 유형이 맞는지), 실거주 환경(어떤 방향이나 환경이 잘 맞는지), 수익 파이프라인 전략(이 사주에 맞게 수익 구조를 어떻게 나누면 좋은지).
${투자거주힌트}
마지막 줄: "이 사주에 가장 잘 맞는 핵심 투자 방식은 O입니다."

===인간관계 · 사람운===
(400~500자) 첫 문단: 주변에 어떤 사람들이 모이는지, 친구·동료 관계의 특징, 이 사람이 인간관계에서 보이는 패턴을 공감 가는 말투로 설명하세요. 두 번째 문단: 조심해야 할 인간관계 유형, 진짜 내 편이 되어줄 사람의 특징, 2026년 인간관계 운의 흐름을 쉬운 말로 설명하세요.

${marital.paidFocus}

===2026년 월별 운세===
1월부터 12월까지 각 달을 한 줄씩 작성하세요.
형식: 1월: (내용) 줄바꿈 2월: (내용) ... 식으로.

===행운 아이템===
이 사주 기운에 맞는 행운 아이템. 아래 형식으로만 작성 (다른 텍스트 없이):
색깔: O / 마스코트: O / 방향: O / 숫자: O / 아이템: O

===이 사주로 잘 사는 법===
(400~500자) 첫 문단: 이 사주의 진짜 강점과 그것을 살리는 삶의 방향을 따뜻하게 이야기하세요. 두 번째 문단: 조심해야 할 것과 지금 당장 실천할 수 있는 구체적 행동 조언을 주세요.`;

  // ─────────────────────────────────────────
  // 자녀 학운
  // ─────────────────────────────────────────
  if (type === '자녀학운') {
    const { childBirthdate, childGender } = req.body;
    if (!childBirthdate) return res.status(400).json({ error: '아이 생년월일을 입력해주세요.' });

    const cDate = new Date(childBirthdate);
    const cYear = cDate.getFullYear();
    const cMonth = cDate.getMonth() + 1;
    const cDay = cDate.getDate();
    const c일주obj = get일주(childBirthdate);
    const c년주obj = get년주(cYear);
    const c일주 = c일주obj.간지;
    const c년주 = c년주obj.간지;
    const c월주 = get월주(cYear, cMonth, cDay, c년주obj.천간index);

    const childPrompt = `당신은 한국의 사주·명리학 전문가입니다.
학부모 입장에서 실질적으로 도움이 되도록 쉽고 따뜻하게 분석해주세요.
어려운 한자어 대신 쉬운 말을 사용하세요.
현재 연도는 2026년입니다.

[부모] 성별: ${gender || '미입력'} / 생년월일: ${year}년 ${month}월 ${day}일 / 년주: ${년주} / 월주: ${월주} / 일주: ${일주}
[자녀] 성별: ${childGender} / 생년월일: ${cYear}년 ${cMonth}월 ${cDay}일 / 년주: ${c년주} / 월주: ${c월주} / 일주: ${c일주}

${공통규칙}

아래 6개 섹션을 ===섹션제목=== 형태로 구분해서 작성하세요. 각 섹션 300~500자.

===타고난 공부 기질===
이 아이가 타고난 학습 특성, 흥미를 느끼는 방향, 집중력 패턴을 구체적으로 설명해주세요.

===재능이 빛나는 분야===
이과/문과 성향, 예체능 적성 등 두각을 나타낼 분야와 그 사주 근거를 설명해주세요.

===학습 에너지가 높아지는 시기===
집중력과 학습 에너지가 높아지는 나이대와 그때 어떻게 공부하면 효과적인지 설명해주세요.

===입시 운 흐름===
입시 운이 좋은 해와 주의할 시기, 2026년 현재 이 아이의 학습 흐름을 설명해주세요.

===부모가 도와주는 법===
부모와 자녀 사주를 연결해서, 어떤 방식의 지원이 효과적이고 어떤 건 역효과가 나는지 설명해주세요.

===공부 잘 되는 환경===
이 아이에게 맞는 공부 환경, 시간대, 방법을 집에서 바로 적용할 수 있는 실용적인 조언으로 써주세요.`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 8000,
        messages: [{ role: 'user', content: childPrompt }],
      });
      return res.json({ result: message.content[0].text, type: '자녀학운', childBirthdate, childGender });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: '분석 중 오류가 발생했습니다.' });
    }
  }

  // ─────────────────────────────────────────
  // 기본/유료 분석
  // ─────────────────────────────────────────
  try {
    let resultText = '';

    if (!isPaid) {
      // 무료: basePrompt 단독 호출
      const message = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: basePrompt }],
      });
      resultText = message.content[0].text;

    } else {
      // 유료: 무료 4섹션 + 유료 전용 6섹션을 별도 호출 후 합산
      // → 각각 충분한 토큰 확보, 내용 중복 완전 차단
      const [baseMsg, paidMsg] = await Promise.all([
        anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 4000,
          messages: [{ role: 'user', content: basePrompt }],
        }),
        anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 6000,
          messages: [{ role: 'user', content: paidOnlyPrompt }],
        }),
      ]);
      resultText = baseMsg.content[0].text + '\n\n' + paidMsg.content[0].text;
    }

    const sajuData = { 년주, 월주, 일주, 시주: 시주 || '-' };

    // 행운아이템 파싱
    let 행운아이템 = null;
    if (isPaid) {
      const luckyMatch = resultText.match(/===행운 아이템===([\s\S]*?)(?====|$)/);
      if (luckyMatch) {
        const t = luckyMatch[1];
        행운아이템 = {
          설명: '사주 기운에 맞는 나만의 행운 아이템이에요',
          색깔: t.match(/색깔[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
          마스코트: t.match(/마스코트[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
          방향: t.match(/방향[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
          숫자: t.match(/숫자[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
          아이템: t.match(/아이템[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
        };
      }
    }

    res.json({
      result: resultText,
      type,
      사주: sajuData,
      생년월일: `${year}년 ${month}월 ${day}일${isLunar ? ' (음력→양력)' : ''}`,
      maritalStatus,
      ...(행운아이템 && { 행운아이템 }),
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '분석 중 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
