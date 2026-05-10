const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 육십갑자 계산 함수
const 천간 = ['甲갑','乙을','丙병','丁정','戊무','己기','庚경','辛신','壬임','癸계'];
const 지지 = ['子자','丑축','寅인','卯묘','辰진','巳사','午오','未미','申신','酉유','戌술','亥해'];

function get일주(birthdate) {
  // 갑자일 기준: 1924년 2월 5일
  const 기준일 = new Date('1924-02-05');
  const 날짜 = new Date(birthdate);
  const 차이 = Math.floor((날짜 - 기준일) / (1000 * 60 * 60 * 24));
  const 천간index = (차이 % 10 + 10) % 10;
  const 지지index = (차이 % 12 + 12) % 12;
  return 천간[천간index] + 지지[지지index];
}
function get년주(year) {
  const 천간index = ((year - 4) % 10 + 10) % 10;
  const 지지index = (year % 12 + 12) % 12;
  return 천간[천간index] + 지지[지지index];
}

// 무료: 이상형만 / 유료: 연애운·결혼운·궁합
const FREE_TYPES = ['이상형'];

app.post('/api/analyze', async (req, res) => {
  const { name, gender, birthdate, birthtime, mbti, blood, type, isPaid } = req.body;

  if (!birthdate) return res.status(400).json({ error: '생년월일을 입력해주세요.' });

  if (!FREE_TYPES.includes(type) && !isPaid) {
    return res.status(402).json({ error: '유료 기능입니다.', requiresPayment: true });
  }

  const date = new Date(birthdate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const 일주 = get일주(birthdate);
  const 년주 = get년주(year);

  const prompts = {
    이상형: `이 사람의 이상형 특징, 잘 맞는 MBTI, 잘 맞는 혈액형, 첫 만남에서 끌리는 타입을 분석해주세요.`,
    연애운: `올해 연애운 전반, 인연이 찾아오는 시기, 연애 스타일과 특징, 주의할 점을 분석해주세요.`,
    결혼운: `결혼운 전반, 결혼 적령기 및 시기, 결혼 후 가정 분위기, 배우자의 특징을 분석해주세요.`,
    궁합: `두 사람의 궁합을 사주·MBTI·혈액형을 종합해서 분석해주세요. 잘 맞는 점, 주의할 점, 총점(100점 만점)을 알려주세요.`,
  };

  const prompt = `당신은 한국의 사주·운세 전문가입니다. 아래 정보로 ${type}을 분석해주세요.

[정보]
- 이름: ${name || '미입력'}
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일
- 태어난 시간: ${birthtime || '미입력'}
- MBTI: ${mbti || '미입력'}
- 혈액형: ${blood ? blood + '형' : '미입력'}
- 년주: ${년주}
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
