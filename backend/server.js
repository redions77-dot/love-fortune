const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const KoreanLunarCalendar = require('korean-lunar-calendar');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL_FREE = 'claude-haiku-4-5-20251001';
const MODEL_PAID = 'claude-sonnet-4-5-20250929';

app.get('/ping', (req, res) => res.json({ ok: true }));

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

// 나이대 계산 (2026년 기준)
function getAgeGroup(birthYear) {
  const age = 2026 - birthYear;
  if (age <= 22) return 'young';      // 10대~22세: 학운·진로 중심
  if (age <= 35) return 'young_adult'; // 23~35세: 연애·커리어 중심
  return 'adult';                      // 36세 이상: 재물·가정 중심
}

// 나이대별 무료 핵심운 섹션
function getAgeBasedFreeSection(birthYear, maritalStatus) {
  const group = getAgeGroup(birthYear);
  const age = 2026 - birthYear;

  if (group === 'young') {
    return `===학운 · 진로===
이 사람은 현재 ${age}세입니다. 아래 내용을 정확하게 분석해주세요. (250~300자)
- 타고난 공부 스타일과 잘 맞는 학습 방식
- 재능이 빛나는 분야 (이과/문과/예체능 방향)
- 지금 시기 학업 에너지의 흐름

중요: 구체적으로 찌르되, "어떻게 살려야 하는지"는 알려주지 마세요.
마지막 줄: "📚 입시 타이밍·구체적 진로·직업 방향은 전체 분석에서 확인하세요"`;
  }

  if (group === 'young_adult') {
    const loveSection = maritalStatus === '미혼'
      ? `===인연운===
이 사람은 현재 ${age}세 미혼입니다. 아래 내용을 정확하게 분석해주세요. (250~300자)
- 어떤 유형의 사람에게 끌리고, 실제로 잘 맞는 유형의 차이
- 지금 이 시기 인연운의 흐름 (좋은지 조심할 시기인지)
- 이 사람이 연애에서 반복하는 패턴 힌트

중요: "언제 만나는지" "어떻게 해야 하는지"는 알려주지 마세요.
마지막 줄: "💕 인연을 만나는 구체적 시기·장소·결혼 타이밍은 전체 분석에서 확인하세요"`
      : `===부부운===
이 사람은 현재 ${age}세 기혼입니다. 아래 내용을 정확하게 분석해주세요. (250~300자)
- 지금 부부 사이의 에너지 흐름
- 이 사주가 배우자 관계에서 강한 부분과 약한 부분

중요: 해결책은 알려주지 마세요.
마지막 줄: "💍 2026년 부부운 상세·갈등 시기·가정운은 전체 분석에서 확인하세요"`;
    return loveSection;
  }

  // adult (36세 이상)
  return `===지금 이 시기 핵심운===
이 사람은 현재 ${age}세입니다. 아래 내용을 정확하게 분석해주세요. (250~300자)
- 지금 이 나이에 이 사주에서 가장 중요한 흐름이 무엇인지
- 2026년이 이 사람에게 어떤 해인지 (좋은 해인지, 조심할 해인지)
- 지금 시기를 어떻게 읽어야 하는지 핵심만

중요: 구체적 조언은 하지 마세요.
마지막 줄: "🔮 2026년 월별 흐름·직업·투자 타이밍은 전체 분석에서 확인하세요"`;
}

// 나이대별 유료 섹션
function getAgeBasedPaidSection(birthYear, maritalStatus) {
  const group = getAgeGroup(birthYear);
  const age = 2026 - birthYear;

  if (group === 'young') {
    return `===진로 · 직업 상세===
이 사람은 ${age}세입니다. 무료 분석의 학운 방향을 바탕으로, 더 깊이 분석해주세요. (500~600자)
첫 문단: 이 사주에서 가장 잘 맞는 직업군 3~4가지를 구체적으로 예시하고, 왜 그 직업이 맞는지 설명하세요. 직장인이 맞는지 프리랜서·창업이 맞는지도 알려주세요.
두 번째 문단: 입시나 취업에서 유리한 구체적 시기, 2026년 학업·진로 흐름을 설명하세요.`;
  }

  if (group === 'young_adult') {
    const loveDetail = maritalStatus === '미혼'
      ? `===인연운 심화===
무료에서 쓴 유형·패턴 설명은 반복하지 마세요. 새로운 각도로 분석해주세요. (500~600자)
- 인연을 만날 가능성이 높은 구체적 시기와 상황
- 이 사주가 결혼으로 이어지기 위해 필요한 조건
- 2026년 인연운의 구체적 흐름 (좋은 달, 주의할 달)`
      : `===부부운 심화===
무료에서 쓴 내용은 반복하지 마세요. 새로운 각도로 분석해주세요. (500~600자)
- 2026년 부부 사이에 좋은 시기와 갈등이 생기기 쉬운 시기
- 배우자 복이 있는 사주인지 상세 분석
- 가정운·자녀운의 흐름`;
    return loveDetail;
  }

  return `===2026년 핵심 타이밍===
무료에서 쓴 흐름 설명은 반복하지 마세요. 더 구체적으로 분석해주세요. (500~600자)
- 2026년 월별로 중요한 시기 (기회의 달, 조심할 달)
- 지금 이 나이에 이 사주가 가장 잘 살 수 있는 방향
- 앞으로 5년 안에 주목해야 할 변화의 시기`;
}

const 공통규칙 = `작성 규칙 (반드시 지킬 것):
1. 쉬운 말 사용 — 어려운 한자 용어 금지. 예: "인성" → "나를 도와주는 기운", "식신" → "타고난 재능"
2. 숫자 목록(1. 2. 3.)이나 하이픈(-) 나열 금지 — 자연스러운 문장으로
3. 마크다운 기호(**, ##) 금지
4. 각 섹션: 첫 문단은 공감 가는 설명, 둘째 문단은 사주 근거
5. 유행어·밈 전체에서 최대 1개`;

async function streamToClient(res, prompt, model, maxTokens = 4000) {
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
}

app.post('/api/analyze', async (req, res) => {
  const { gender, birthdate, birthtime, mbti, blood, type, isPaid, isLunar, maritalStatus } = req.body;

  if (!birthdate) return res.status(400).json({ error: '생년월일을 입력해주세요.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

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
  const 시지힌트 = get시지라벨(시주);
  const ageGroup = getAgeGroup(year);

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
    ageGroup,
  })}\n\n`);

  const infoBlock = `[기본 정보]
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일 (현재 ${2026 - year}세)
- 태어난 시간: ${birthtime || '미입력'}
- MBTI: ${mbti || '미입력'}
- 혈액형: ${blood ? blood + '형' : '미입력'}
- 결혼 상태: ${maritalStatus || '미입력'}

[사주팔자]
- 년주: ${년주} / 월주: ${월주} / 일주: ${일주} / 시주: ${시주 || '미입력'}`;

  // ── 자녀 학운 심화 ──────────────────────────────
  if (type === '자녀학운심화') {
    const { childBirthdate, childGender, childBirthtime } = req.body;
    if (!childBirthdate) {
      res.write(`data: ${JSON.stringify({ error: '아이 생년월일을 입력해주세요.' })}\n\n`);
      return res.end();
    }
    const cDate = new Date(childBirthdate);
    const cYear = cDate.getFullYear();
    const cMonth = cDate.getMonth() + 1;
    const cDay = cDate.getDate();
    const c일주obj = get일주(childBirthdate);
    const c년주obj = get년주(cYear);
    const c일주 = c일주obj.간지;
    const c년주 = c년주obj.간지;
    const c월주 = get월주(cYear, cMonth, cDay, c년주obj.천간index);
    const c시주 = get시주(childBirthtime, c일주obj.천간index);

    const prompt = `당신은 한국의 사주·명리학 전문가입니다.
학부모 입장에서 실용적으로 도움이 되도록 분석해주세요.
${공통규칙}

[자녀 정보]
- 성별: ${childGender} / 생년월일: ${cYear}년 ${cMonth}월 ${cDay}일 (${2026 - cYear}세)
- 년주: ${c년주} / 월주: ${c월주} / 일주: ${c일주} / 시주: ${c시주 || '미입력'}

아래 3개 섹션을 ===섹션제목=== 형태로 작성하세요. 각 섹션 300~400자.

===구체적 직업 방향===
이 아이에게 가장 잘 맞는 직업을 5~6가지 구체적으로 예시하고, 왜 그런지 사주 근거와 함께 설명해주세요. 직장인/프리랜서/창업 중 어떤 방향이 맞는지도 알려주세요.

===입시 · 취업 타이밍===
이 아이에게 시험 운이 좋은 해와 주의할 해를 구체적으로 알려주세요. 2026년 현재 학업 에너지 흐름도 설명해주세요.

===이 아이를 키우는 핵심 조언===
이 사주의 아이가 잠재력을 최대한 발휘하려면 부모가 어떻게 도와줘야 하는지, 하지 말아야 할 것도 포함해서 구체적으로 알려주세요.`;

    try {
      await streamToClient(res, prompt, MODEL_PAID, 3000);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`);
    }
    return res.end();
  }

  // ── 무료 프롬프트 ──────────────────────────────
  // 구조: 사주기운(신뢰 확보) + 재물운맛보기(궁금하게) + 나이대별 핵심운(정확하게 찌르기)
  const basePrompt = `당신은 한국의 사주·명리학 전문가입니다.
읽는 사람이 "이거 나 얘기잖아?"라고 느낄 만큼 정확하게 분석해주세요.
현재 연도는 2026년(丙午년)입니다.

${infoBlock}

${공통규칙}

아래 3개 섹션을 ===섹션제목=== 형태로 작성하세요.

===나의 사주 기운===
(300~350자) 이 사람의 본질적인 특성을 정확하게 찌르세요.
첫 문단: 이 사람을 딱 한 마디로 표현하는 이미지로 시작해서, 겉으로 보이는 모습과 속마음의 차이, 주변 사람들이 이 사람을 어떻게 느끼는지를 정확하게 써주세요. 읽는 사람이 "맞아, 이게 나야"라고 느껴야 해요.
두 번째 문단: 사주 구조로 왜 이런 특성이 나오는지 쉬운 말로 설명하세요.

===재물운 맛보기===
(250~300자) 이 사람의 돈과의 관계를 정확하게 찌르세요.
첫 문단: 이 사람이 돈을 버는 방식의 특징, 돈이 모이는 패턴 (한방형인지 꾸준형인지 말년형인지), 돈을 잃는 패턴이 있다면 그것도 정확하게 써주세요. "맞아"가 나와야 해요.
두 번째 문단: 이 사주에서 인생에 돈이 크게 들어오는 시기가 있는지, 지금이 그 시기에 해당하는지만 힌트로 주세요. 구체적인 내용은 알려주지 마세요.
마지막 줄: "💰 돈이 들어오는 구체적 시기·투자 방향·말년 재물운은 전체 분석에서 확인하세요"

${getAgeBasedFreeSection(year, maritalStatus)}`;

  // ── 유료 전용 프롬프트 ──────────────────────────
  // 구조: 평생재물운(핵심) + 직업운 + 투자 + 나이대별 운 + 인간관계 + 월별 + 행운 + 잘사는법
  const paidOnlyPrompt = `당신은 한국의 사주·명리학 전문가입니다.
쉽고 따뜻한 말투로 분석해주세요. 현재 연도는 2026년입니다.

${infoBlock}

${공통규칙}

무료 분석에서 이미 다룬 내용 (사주 기운 특성, 재물 패턴 힌트, 나이대별 핵심운 방향)은 반복하지 말고, 완전히 새로운 각도로 분석하세요.

아래 섹션을 ===섹션제목=== 형태로 작성하세요.

===평생 재물운===
이 사람의 인생 전체 재물 흐름을 분석해주세요. (500~600자)
첫 문단: 이 사주의 재물 패턴을 구체적으로 설명하세요. 인생에서 돈이 크게 들어오는 나이대가 있다면 구체적으로 알려주세요 (예: 40대 초반, 50대 중반 등). 한방에 오는 스타일인지 꾸준히 쌓는 스타일인지. 말년(60대 이후)에 먹고 살기 괜찮은 사주인지도 솔직하게 말해주세요.
두 번째 문단: 이 사람이 절대 하면 안 되는 돈 실수 (예: 보증 서기, 동업, 투기 등)와 반대로 돈이 가장 잘 모이는 조건을 구체적으로 알려주세요. 2026년이 재물 면에서 어떤 해인지도 포함하세요.

===직업운 · 커리어===
(500~600자) 첫 문단: 이 사주에 가장 잘 맞는 직업군 3~4가지를 구체적으로 예시하고, 직장인이 맞는지 프리랜서·사업이 맞는지, 어떤 환경에서 능력이 폭발하는지 설명하세요. 두 번째 문단: 2026년 커리어 흐름 — 이직·창업·승진 등 변화가 예상되는 시기와 주의할 시기를 설명하세요.

===투자 · 부동산===
(500~600자) 다음 4가지를 자연스러운 문장으로 모두 담아주세요.
주식 투자 성향 (단기/장기, 어떤 업종이 맞는지), 부동산 투자 방향 (아파트/토지/상가 등), 실거주 환경 (어떤 방향이나 환경이 잘 맞는지), 수익 파이프라인 전략 (이 사주에 맞게 수익 구조를 어떻게 나누면 좋은지).
${투자거주힌트}
마지막 줄: "이 사주에 가장 잘 맞는 핵심 투자 방식은 O입니다."

${getAgeBasedPaidSection(year, maritalStatus)}

===인간관계 · 사람운===
(400~500자) 첫 문단: 주변에 어떤 사람들이 모이는지, 진짜 내 편과 독이 되는 사람의 특징을 공감 가는 말투로 설명하세요. 두 번째 문단: 2026년 인간관계에서 조심해야 할 유형과 귀인이 나타나는 시기를 설명하세요.

===2026년 월별 운세===
1월부터 12월까지 각 달을 한 줄씩 작성하세요.
형식: 1월: (내용) 줄바꿈 2월: (내용) ...
좋은 달은 왜 좋은지, 조심할 달은 구체적으로 무엇을 조심할지 써주세요.

===행운 아이템===
이 사주 기운에 맞는 행운 아이템. 아래 형식으로만 작성:
색깔: O / 마스코트: O / 방향: O / 숫자: O / 아이템: O

===이 사주로 잘 사는 법===
(400~500자) 첫 문단: 이 사주의 진짜 강점과 그것을 살리는 방향. 두 번째 문단: 지금 당장 실천할 수 있는 구체적 행동 조언.`;

  try {
    if (!isPaid) {
      await streamToClient(res, basePrompt, MODEL_FREE, 3000);
    } else {
      await streamToClient(res, basePrompt, MODEL_PAID, 4000);
      res.write(`data: ${JSON.stringify({ type: 'paid_start' })}\n\n`);
      await streamToClient(res, paidOnlyPrompt, MODEL_PAID, 7000);
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (e) {
    console.error(e);
    res.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`);
  }

  res.end();
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
