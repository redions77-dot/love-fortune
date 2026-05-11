const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 음력→양력 변환 (직접 구현 - 외부 라이브러리 없이)
function lunarToSolar(lunarYear, lunarMonth, lunarDay) {
  // 1900~2100년 음력 데이터 기반 변환
  // lunar-calendar npm 패키지 사용
  try {
    const lunarCalendar = require('lunar-calendar');
    const solar = lunarCalendar.lunarToSolar(lunarYear, lunarMonth, lunarDay);
    return { year: solar.solarYear, month: solar.solarMonth, day: solar.solarDay };
  } catch(e) {
    // 패키지 없으면 근사값 (음력은 양력보다 평균 21~50일 느림)
    const approxDate = new Date(lunarYear, lunarMonth - 1, lunarDay + 30);
    return { year: approxDate.getFullYear(), month: approxDate.getMonth() + 1, day: approxDate.getDate() };
  }
}

// 육십갑자 계산
const 천간 = ['甲갑','乙을','丙병','丁정','戊무','己기','庚경','辛신','壬임','癸계'];
const 지지 = ['子자','丑축','寅인','卯묘','辰진','巳사','午오','未미','申신','酉유','戌술','亥해'];

function get일주(solarDateStr) {
  const 기준일 = new Date('1970-01-01');
  const 날짜 = new Date(solarDateStr);
  const 차이 = Math.floor((날짜 - 기준일) / (1000 * 60 * 60 * 24));
  const 천간index = ((4 + 차이) % 10 + 10) % 10;
  const 지지index = ((10 + 차이) % 12 + 12) % 12;
  return 천간[천간index] + 지지[지지index];
}

function get년주(year) {
  // 1984년 = 甲子년 (천간0, 지지0)
  const 천간index = ((year - 1984) % 10 + 10) % 10;
  const 지지index = ((year - 1984) % 12 + 12) % 12;
  return 천간[천간index] + 지지[지지index];
}

function get월주(year, month) {
  // 월주는 년간에 따라 달라짐 (오행 기준)
  const 년천간index = ((year - 1984) % 10 + 10) % 10;
  const 월천간base = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]; // 년간별 1월 천간 시작
  const 천간index = (월천간base[년천간index] + month - 1) % 10;
  const 지지index = (month + 1) % 12; // 인월=1월
  return 천간[천간index] + 지지[지지index];
}

app.post('/api/analyze', async (req, res) => {
  const { name, gender, birthdate, birthtime, mbti, blood, type, isPaid, isLunar } = req.body;

  if (!birthdate) return res.status(400).json({ error: '생년월일을 입력해주세요.' });

  // 날짜 파싱
  const rawDate = new Date(birthdate);
  let solarYear = rawDate.getFullYear();
  let solarMonth = rawDate.getMonth() + 1;
  let solarDay = rawDate.getDate();
  let lunarDisplayStr = '';

  // 음력이면 양력으로 변환
  if (isLunar) {
    lunarDisplayStr = `${solarYear}년 ${solarMonth}월 ${solarDay}일 (음력)`;
    const solar = lunarToSolar(solarYear, solarMonth, solarDay);
    solarYear = solar.year;
    solarMonth = solar.month;
    solarDay = solar.day;
  }

  const solarDateStr = `${solarYear}-${String(solarMonth).padStart(2,'0')}-${String(solarDay).padStart(2,'0')}`;
  const displayDate = isLunar
    ? `양력 ${solarYear}년 ${solarMonth}월 ${solarDay}일 (${lunarDisplayStr} 변환)`
    : `${solarYear}년 ${solarMonth}월 ${solarDay}일`;

  const 일주 = get일주(solarDateStr);
  const 년주 = get년주(solarYear);
  const 월주 = get월주(solarYear, solarMonth);

  const prompts = {
    이상형: `이 사람의 이상형 특징, 잘 맞는 MBTI, 잘 맞는 혈액형, 첫 만남에서 끌리는 타입을 분석해주세요.`,
    연애운: `올해 연애운 전반, 인연이 찾아오는 시기, 연애 스타일과 특징, 주의할 점을 분석해주세요.`,
    결혼운: `결혼운 전반, 결혼 적령기 및 시기, 결혼 후 가정 분위기, 배우자의 특징을 분석해주세요.`,
    궁합: `두 사람의 궁합을 사주·MBTI·혈액형을 종합해서 분석해주세요.`,
  };

  const prompt = `당신은 한국의 사주·운세 전문가입니다. 아래 정보로 ${type}을 분석해주세요.

[정보]
- 이름: ${name || '미입력'}
- 성별: ${gender || '미입력'}
- 생년월일: ${displayDate}
- 태어난 시간: ${birthtime || '미입력'}
- MBTI: ${mbti || '미입력'}
- 혈액형: ${blood ? blood + '형' : '미입력'}
- 년주: ${년주}
- 월주: ${월주}
- 일주: ${일주}

[분석 항목]
${prompts[type] || prompts['이상형']}

따뜻하고 재미있게, 3000자 내외로 작성해주세요. 마크다운 없이 일반 텍스트로만 답변하세요.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ result: message.content[0].text, type });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '분석 중 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
