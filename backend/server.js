const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 육십갑자 계산
const 천간 = ['甲갑','乙을','丙병','丁정','戊무','己기','庚경','辛신','壬임','癸계'];
const 지지 = ['子자','丑축','寅인','卯묘','辰진','巳사','午오','未미','申신','酉유','戌술','亥해'];

function get일주(birthdate) {
  const 기준일 = new Date('1970-01-01');
  const 날짜 = new Date(birthdate);
  const 차이 = Math.floor((날짜 - 기준일) / (1000 * 60 * 60 * 24));
  const 천간index = ((4 + 차이) % 10 + 10) % 10;
  const 지지index = ((10 + 차이) % 12 + 12) % 12;
  return 천간[천간index] + 지지[지지index];
}

function get년주(year) {
  const 차이 = year - 1984;
  const 천간index = ((0 + 차이) % 10 + 10) % 10;
  const 지지index = ((0 + 차이) % 12 + 12) % 12;
  return 천간[천간index] + 지지[지지index];
}

function get월주(year, month) {
  // 월주 근사 계산
  const 월천간base = (year * 12 + month + 3) % 10;
  const 월지지base = (month + 1) % 12;
  return 천간[월천간base] + 지지[월지지base];
}

function get시주(birthtime, 일주천간index) {
  if (!birthtime) return null;
  const [h] = birthtime.split(':').map(Number);
  const 시지index = Math.floor((h + 1) / 2) % 12;
  const 시천간base = (일주천간index % 5) * 2;
  const 시천간index = (시천간base + 시지index) % 10;
  return 천간[시천간index] + 지지[시지index];
}

// 결혼상태별 분석 포커스 정의
function getMaritalFocus(maritalStatus) {
  switch (maritalStatus) {
    case '미혼':
      return {
        label: '미혼',
        focus: `
이 사람은 아직 결혼하지 않은 미혼입니다.
[분석 포커스]
- 언제 인연이 찾아오는지 (시기와 계절)
- 어떤 유형의 사람과 잘 맞는지 (외모·성격·직업)
- 첫 만남의 장소나 상황
- 연애할 때 이 사람의 특징과 스타일
- 올해 혹은 가까운 미래의 인연운
- 놓치지 말아야 할 기회의 시기
따뜻하고 설레는 톤으로, 희망을 주는 방향으로 분석해주세요.`,
        paidFocus: `
[심화 분석 - 미혼]
- 사주에서 보이는 배우자 자리(관성/재성)의 특징 상세 분석
- 결혼 적령기 및 결혼 가능성이 높은 구체적 시기
- 이상형과 실제 잘 맞는 사람의 차이
- 연애에서 결혼으로 이어지기 위한 조건
- 2026년 월별 인연운 흐름
- 이 사주가 연애에서 조심해야 할 패턴`
      };
    case '기혼':
      return {
        label: '기혼',
        focus: `
이 사람은 현재 결혼한 상태입니다.
[분석 포커스]
- 지금 부부 관계의 전반적인 흐름과 에너지
- 배우자와 잘 맞는 점과 갈등이 생기기 쉬운 부분
- 올해 부부 관계에 영향을 미치는 운의 흐름
- 부부 관계를 더 좋게 만들 수 있는 조언
- 가정 내 안정감과 행복 에너지
현실적이고 따뜻하게, 관계 개선에 도움이 되는 방향으로 분석해주세요.`,
        paidFocus: `
[심화 분석 - 기혼]
- 사주로 보는 부부 궁합의 핵심 포인트
- 배우자 덕이 있는지 (재성/관성 분석)
- 올해 부부 사이에 주의해야 할 시기와 좋은 시기
- 가정운·자녀운 흐름
- 2026년 월별 부부운 흐름
- 이 사주가 결혼생활에서 행복해지는 법`
      };
    case '돌싱':
      return {
        label: '돌싱(이혼 1회)',
        focus: `
이 사람은 이혼 경험이 있는 돌싱입니다.
[분석 포커스]
- 재혼 인연이 찾아오는 시기
- 다음 인연은 어떤 유형의 사람인지
- 전 결혼과는 어떻게 다를지
- 지금 이 시기에 집중해야 할 것
- 새로운 시작을 위한 사주의 메시지
판단하지 않고, 새 출발에 힘을 주는 따뜻한 톤으로 분석해주세요.`,
        paidFocus: `
[심화 분석 - 돌싱]
- 사주에서 보이는 재혼 가능성과 시기
- 전 결혼에서 반복되지 않으려면 알아야 할 것
- 재혼 상대의 특징 (이번엔 어떤 사람?)
- 혼자인 지금 시기의 의미와 활용법
- 2026년 월별 인연·재혼운 흐름
- 이 사주가 행복한 재혼을 위해 필요한 것`
      };
    case '돌싱2+':
      return {
        label: '돌싱2+(이혼 2회 이상)',
        focus: `
이 사람은 이혼을 두 번 이상 경험했습니다.
[분석 포커스]
- 사주에 결혼과 관련된 특별한 기운이 있는지
- 왜 이런 패턴이 반복됐는지 사주 관점에서 설명
- 앞으로의 인연운과 재혼 가능성
- 지금 이 시기에 가장 중요한 것
- 이 사주의 진짜 강점과 행복의 방향
절대 비판하지 않고, 깊이 공감하며 새로운 시각을 주는 톤으로 분석해주세요.`,
        paidFocus: `
[심화 분석 - 돌싱2+]
- 사주팔자로 보는 결혼 패턴의 근본 원인 분석
- 관성(결혼성) 위치와 상태 상세 분석
- 반복을 끊기 위해 이 사주에서 바꿔야 할 것
- 재혼 가능성과 적합한 상대 유형
- 혼자 살아도 행복한 사주인지 vs 재혼이 더 맞는 사주인지
- 2026년 월별 운세와 중요한 시기
- 이 사주가 진정한 행복을 찾는 법`
      };
    default:
      return {
        label: '미입력',
        focus: `연애운과 결혼운을 전반적으로 분석해주세요.`,
        paidFocus: `연애운, 결혼운, 인연의 특징을 심화 분석해주세요.`
      };
  }
}

app.post('/api/analyze', async (req, res) => {
  const { gender, birthdate, birthtime, mbti, blood, type, isPaid, isLunar, maritalStatus } = req.body;

  if (!birthdate) return res.status(400).json({ error: '생년월일을 입력해주세요.' });

  const date = new Date(birthdate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const 일주raw = get일주(birthdate);
  const 년주 = get년주(year);
  const 월주 = get월주(year, month);
  const 일주천간index = 천간.findIndex(t => 일주raw.startsWith(t));
  const 시주 = get시주(birthtime, 일주천간index);
  const 일주 = 일주raw;

  const marital = getMaritalFocus(maritalStatus);

  const basePrompt = `당신은 한국의 사주·운세 전문가입니다. 따뜻하고 공감 가는 말투로 분석해주세요.

[기본 정보]
- 성별: ${gender || '미입력'}
- 생년월일: ${year}년 ${month}월 ${day}일 ${isLunar ? '(음력→양력 변환됨)' : '(양력)'}
- 태어난 시간: ${birthtime || '미입력'}
- MBTI: ${mbti || '미입력'}
- 혈액형: ${blood ? blood + '형' : '미입력'}
- 결혼 상태: ${marital.label}

[사주팔자]
- 년주(年柱): ${년주}
- 월주(月柱): ${월주}
- 일주(日柱): ${일주}
- 시주(時柱): ${시주 || '미입력(시간 모름)'}

${marital.focus}

[출력 형식]
각 섹션은 반드시 ===섹션제목=== 형태로 구분해주세요.
예시:
===나의 사주 기운===
내용...

===인연운 분석===
내용...

===올해 운세 흐름===
내용...

마크다운(#, *, - 등) 없이 일반 텍스트로만 작성하세요.
각 섹션은 400~600자로 구체적이고 따뜻하게 작성해주세요.`;

  const paidPromptExtra = `

추가로 아래 심화 분석도 같은 형식(===섹션제목===)으로 이어서 작성해주세요:

${marital.paidFocus}

===재물운 · 직업운===
이 사주의 재물운과 직업운, 돈을 버는 방식과 재물이 들어오는 시기를 분석해주세요.

===2026년 월별 운세===
1월부터 12월까지 월별로 한 줄씩 운세 흐름을 알려주세요.

===행운 아이템===
이 사주의 용신 기반으로 행운 색깔, 마스코트 동물, 행운 방향, 행운 숫자, 추천 아이템을 알려주세요.
형식: 색깔: O / 마스코트: O / 방향: O / 숫자: O / 아이템: O

===이 사주로 잘 사는 법===
이 사람이 타고난 사주를 살려서 행복하게 사는 구체적인 조언을 해주세요.`;

  const fullPrompt = isPaid ? basePrompt + paidPromptExtra : basePrompt;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: isPaid ? 4096 : 2048,
      messages: [{ role: 'user', content: fullPrompt }],
    });

    const resultText = message.content[0].text;

    // 사주 데이터 파싱
    const sajuData = {
      년주,
      월주,
      일주,
      시주: 시주 || '-',
    };

    // 행운아이템 파싱 (유료)
    let 행운아이템 = null;
    if (isPaid) {
      const luckyMatch = resultText.match(/===행운 아이템===([\s\S]*?)(?====|$)/);
      if (luckyMatch) {
        const luckyText = luckyMatch[1];
        const 색깔 = luckyText.match(/색깔[:\s]+([^\n/]+)/)?.[1]?.trim() || '';
        const 마스코트 = luckyText.match(/마스코트[:\s]+([^\n/]+)/)?.[1]?.trim() || '';
        const 방향 = luckyText.match(/방향[:\s]+([^\n/]+)/)?.[1]?.trim() || '';
        const 숫자 = luckyText.match(/숫자[:\s]+([^\n/]+)/)?.[1]?.trim() || '';
        const 아이템 = luckyText.match(/아이템[:\s]+([^\n/]+)/)?.[1]?.trim() || '';
        행운아이템 = {
          설명: '사주 용신을 기반으로 한 나만의 행운 아이템이에요',
          색깔, 마스코트, 방향, 숫자, 아이템
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
