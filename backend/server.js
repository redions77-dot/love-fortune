const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 육십갑자
const 천간 = ['甲갑','乙을','丙병','丁정','戊무','己기','庚경','辛신','壬임','癸계'];
const 지지 = ['子자','丑축','寅인','卯묘','辰진','巳사','午오','未미','申신','酉유','戌술','亥해'];

// 천간 오행
const 천간오행 = {
  '甲갑': '木', '乙을': '木',
  '丙병': '火', '丁정': '火',
  '戊무': '土', '己기': '土',
  '庚경': '金', '辛신': '金',
  '壬임': '水', '癸계': '水',
};

// 지지 오행
const 지지오행 = {
  '子자': '水', '丑축': '土', '寅인': '木', '卯묘': '木',
  '辰진': '土', '巳사': '火', '午오': '火', '未미': '土',
  '申신': '金', '酉유': '金', '戌술': '土', '亥해': '水',
};

const 오행한글 = { '木': '목(木)', '火': '화(火)', '土': '토(土)', '金': '금(金)', '水': '수(水)' };

const 오행행운아이템 = {
  '木': { 색깔: '초록색, 청록색', 마스코트: '용, 토끼, 나무 모양 소품', 방향: '동쪽', 숫자: '3, 8', 아이템: '나무 소재 액세서리, 식물 키우기, 초록색 지갑', 설명: '목(木)의 기운이 필요해요. 성장과 생명력의 에너지예요.' },
  '火': { 색깔: '빨간색, 주황색, 분홍색', 마스코트: '말, 봉황, 불꽃 모양 소품', 방향: '남쪽', 숫자: '2, 7', 아이템: '빨간 지갑, 루비·가넷 액세서리, 캔들', 설명: '화(火)의 기운이 필요해요. 열정과 밝음의 에너지예요.' },
  '土': { 색깔: '노란색, 베이지색, 황토색', 마스코트: '소, 개, 용, 토우 인형', 방향: '중앙', 숫자: '5, 10', 아이템: '황토색 가방, 도자기 소품, 원석(황수정)', 설명: '토(土)의 기운이 필요해요. 안정과 신뢰의 에너지예요.' },
  '金': { 색깔: '흰색, 은색, 금색, 회색', 마스코트: '호랑이, 원숭이, 금속 소품', 방향: '서쪽', 숫자: '4, 9', 아이템: '금·은 액세서리, 흰색 지갑, 메탈 소품', 설명: '금(金)의 기운이 필요해요. 결단력과 귀함의 에너지예요.' },
  '水': { 색깔: '검정색, 진한 파란색, 남색', 마스코트: '쥐, 돼지, 물고기, 거북이', 방향: '북쪽', 숫자: '1, 6', 아이템: '검정 지갑, 사파이어·아쿠아마린 액세서리, 물고기 소품', 설명: '수(水)의 기운이 필요해요. 지혜와 흐름의 에너지예요.' },
};

// 일주 계산
function get일주(birthdate) {
  const 기준일 = new Date('1924-02-15');
  const 날짜 = new Date(birthdate);
  const 차이 = Math.floor((날짜 - 기준일) / (1000 * 60 * 60 * 24));
  const 천간index = (차이 % 10 + 10) % 10;
  const 지지index = (차이 % 12 + 12) % 12;
  return 천간[천간index] + 지지[지지index];
}

// 년주 계산
function get년주(year) {
  const 천간index = ((year - 4) % 10 + 10) % 10;
  const 지지index = ((year - 4) % 12 + 12) % 12;
  return 천간[천간index] + 지지[지지index];
}

// 월주 계산 (절기 기반)
const 절기표 = [
  { month: 1, day: 6, 월지: 1 },   // 소한 -> 丑월
  { month: 2, day: 4, 월지: 2 },   // 입춘 -> 寅월
  { month: 3, day: 6, 월지: 3 },   // 경칩 -> 卯월
  { month: 4, day: 5, 월지: 4 },   // 청명 -> 辰월
  { month: 5, day: 6, 월지: 5 },   // 입하 -> 巳월
  { month: 6, day: 6, 월지: 6 },   // 망종 -> 午월
  { month: 7, day: 7, 월지: 7 },   // 소서 -> 未월
  { month: 8, day: 8, 월지: 8 },   // 입추 -> 申월
  { month: 9, day: 8, 월지: 9 },   // 백로 -> 酉월
  { month: 10, day: 8, 월지: 10 }, // 한로 -> 戌월
  { month: 11, day: 7, 월지: 11 }, // 입동 -> 亥월
  { month: 12, day: 7, 월지: 0 },  // 대설 -> 子월
];

const 월간시작표 = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]; // 甲乙丙丁戊己庚辛壬癸년 인월 월간

function get월주(year, month, day) {
  let 월지index = 1; // 기본 丑월
  for (const 절 of 절기표) {
    if (month > 절.month || (month === 절.month && day >= 절.day)) {
      월지index = 절.월지;
    }
  }
  const 년간index = ((year - 4) % 10 + 10) % 10;
  const 인월부터순서 = (월지index - 2 + 12) % 12;
  const 월간index = (월간시작표[년간index] + 인월부터순서) % 10;
  return 천간[월간index] + 지지[월지index];
}

// 시주 계산
function get시주(birthdate, birthtime) {
  if (!birthtime) return null;
  const [hour] = birthtime.split(':').map(Number);
  const 시지index = Math.floor(((hour + 1) % 24) / 2);
  const 일주str = get일주(birthdate);
  const 일간 = 천간.indexOf(일주str.substring(0, 2));
  const 시간시작 = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
  const 시간index = (시간시작[일간] + 시지index) % 10;
  return 천간[시간index] + 지지[시지index];
}

// 용신 계산
function get용신(년주, 월주, 일주, 시주) {
  const 오행카운트 = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  const 기둥들 = [년주, 월주, 일주, 시주].filter(Boolean);
  기둥들.forEach(기둥 => {
    const 간 = 기둥.substring(0, 2);
    const 지 = 기둥.substring(2, 4);
    if (천간오행[간]) 오행카운트[천간오행[간]]++;
    if (지지오행[지]) 오행카운트[지지오행[지]]++;
  });
  let min = Infinity;
  let 용신오행 = '水';
  for (const [오행, 수] of Object.entries(오행카운트)) {
    if (수 < min) { min = 수; 용신오행 = 오행; }
  }
  return 용신오행;
}

// 음력→양력 변환 (근사치)
function lunarToSolar(year, month, day) {
  const 음력기준 = new Date('1900-01-31');
  let 누적일 = 0;
  for (let y = 1900; y < year; y++) { 누적일 += 354; }
  누적일 += (month - 1) * 29.5 + (day - 1);
  const 양력 = new Date(음력기준.getTime() + 누적일 * 24 * 60 * 60 * 1000);
  return 양력.toISOString().slice(0, 10);
}

const FREE_TYPES = ['이상형'];
const PAID_TYPES = ['연애운', '결혼운', '궁합', '재운', '종합운'];

app.post('/api/analyze', async (req, res) => {
  const { name, gender, birthdate: rawBirthdate, birthtime, mbti, blood, type, isPaid, isLunar } = req.body;

  if (!rawBirthdate) return res.status(400).json({ error: '생년월일을 입력해주세요.' });

  if (PAID_TYPES.includes(type) && !isPaid) {
    return res.status(402).json({ error: '유료 기능입니다.', requiresPayment: true });
  }

  let birthdate = rawBirthdate;
  if (isLunar) {
    const [y, m, d] = rawBirthdate.split('-').map(Number);
    birthdate = lunarToSolar(y, m, d);
  }

  const date = new Date(birthdate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const 년주 = get년주(year);
  const 월주 = get월주(year, month, day);
  const 일주 = get일주(birthdate);
  const 시주 = get시주(birthdate, birthtime);
  const 용신오행 = get용신(년주, 월주, 일주, 시주);
  const 행운아이템 = 오행행운아이템[용신오행];

  const 사주정보 = `
- 년주(Year): ${년주}
- 월주(Month): ${월주}
- 일주(Day): ${일주}
- 시주(Hour): ${시주 || '미입력'}
- 용신: ${오행한글[용신오행]}`;

  const 행운아이템정보 = isPaid ? `
[행운 아이템 - 용신: ${오행한글[용신오행]}]
${행운아이템.설명}
- 행운 색깔: ${행운아이템.색깔}
- 마스코트/소품: ${행운아이템.마스코트}
- 행운 방향: ${행운아이템.방향}
- 행운 숫자: ${행운아이템.숫자}
- 추천 아이템: ${행운아이템.아이템}` : '';

  const prompts = {
    이상형: `이 사람의 사주를 바탕으로 이상형 특징, 잘 맞는 MBTI, 잘 맞는 혈액형, 첫 만남에서 끌리는 타입을 분석해주세요. 각 기둥(년주·월주·일주·시주)이 성격과 이상형에 어떤 영향을 주는지 설명해주세요.`,
    연애운: `올해(2026년) 연애운 전반, 인연이 찾아오는 시기, 연애 스타일과 특징, 주의할 점을 사주 기둥별로 자세히 분석해주세요.`,
    결혼운: `결혼운 전반, 결혼 적령기 및 시기, 결혼 후 가정 분위기, 배우자의 특징을 사주 기둥별로 자세히 분석해주세요.`,
    궁합: `두 사람의 궁합을 사주·MBTI·혈액형을 종합해서 분석해주세요. 잘 맞는 점, 주의할 점, 총점(100점 만점)을 알려주세요.`,
    재운: `이 사주의 재운(돈·재물운)을 분석해주세요. 재물복, 돈 버는 방식, 재물이 들어오는 시기, 주의할 점, 잘 맞는 직업군을 알려주세요.`,
    종합운: `이 사주를 종합적으로 분석해주세요.\n1) 사주 기둥(년·월·일·시주) 각각의 의미와 성격\n2) 2026년 올해의 연애운\n3) 재물운·직업운\n4) 인생 전반의 흐름과 조언\n각 항목을 구분해서 자세히 설명해주세요.`,
  };

  const prompt = `당신은 한국의 사주·운세 전문가입니다. 아래 정보로 ${type}을 분석해주세요.

[기본 정보]
- 이름: ${name || '미입력'}
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일${isLunar ? ' (음력→양력 변환)' : ''}
- 태어난 시간: ${birthtime || '미입력'}
- MBTI: ${mbti || '미입력'}
- 혈액형: ${blood ? blood + '형' : '미입력'}

[사주팔자]
${사주정보}
${행운아이템정보}

[분석 항목]
${prompts[type] || prompts['이상형']}

따뜻하고 재미있게, 3000자 내외로 작성해주세요. 마크다운 없이 일반 텍스트로만 답변하세요.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({
      result: message.content[0].text,
      type,
      사주: { 년주, 월주, 일주, 시주: 시주 || null },
      용신: { 오행: 용신오행, 한글: 오행한글[용신오행] },
      행운아이템: isPaid ? 행운아이템 : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '분석 중 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
