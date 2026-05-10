const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 무료: 이상형만 / 유료: 연애운·결혼운·궁합
const FREE_TYPES = ['이상형'];

app.post('/api/analyze', async (req, res) => {
  const { name, gender, birthdate, birthtime, mbti, blood, type, isPaid } = req.body;

  if (!birthdate) return res.status(400).json({ error: '생년월일을 입력해주세요.' });

  // 유료 기능 체크 (실제 서비스에서는 결제 검증 추가)
  if (!FREE_TYPES.includes(type) && !isPaid) {
    return res.status(402).json({ error: '유료 기능입니다.', requiresPayment: true });
  }

  const date = new Date(birthdate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const prompts = {
    이상형: `이 사람의 이상형 특징, 잘 맞는 MBTI, 잘 맞는 혈액형, 첫 만남에서 끌리는 타입을 분석해주세요.`,
    연애운: `올해 연애운 전반, 인연이 찾아오는 시기, 연애 스타일과 특징, 주의할 점을 분석해주세요.`,
    결혼운: `결혼운 전반, 결혼 적령기 및 시기, 결혼 후 가정 분위기, 배우자의 특징을 분석해주세요.`,
    궁합: `두 사람의 궁합을 사주·MBTI·혈액형을 종합해서 분석해주세요. 잘 맞는 점, 주의할 점, 총점(100점 만점)을 알려주세요.`,
  };

  const prompt = `당신은 한국의 사주·운세 전문가입니다. 아래 정보로 ${type}을 분석해주세요. 반드시 만세력 기준으로 년주·월주·일주·시주 사주 간지를 정확하게 계산하세요. 예를 들어 2009년 9월 24일 오전 6시 30분은 기축년(己丑) 계유월(癸酉) 임신일(壬申) 계묘시(癸卯)입니다. 이처럼 정확한 만세력 간지를 사용하세요.

[정보]
- 이름: ${name || '미입력'}
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일
- 태어난 시간: ${birthtime || '미입력'}
- MBTI: ${mbti || '미입력'}
- 혈액형: ${blood ? blood + '형' : '미입력'}

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
