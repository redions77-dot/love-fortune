// '우리 아이 성공운명서' AI 프롬프트, 출력 검사, 생성 오케스트레이션.
// 원칙: 가능한 사실은 서버 계산값으로 확정하고, AI가 연도·나이·대운 십성을 직접 쓰지 못하게 한다.
//  - AI는 연도·나이·학령·대운 십성을 토큰({대운3}, {대운3.천간십성}, {재성대운} …)으로만 쓴다. 서버가 계산값으로 바꿔 넣는다(successChildTokens.js).
//  - 검사는 토큰 밖의 연도·나이·연령대·학년, 대운 십성의 연결 오류, 계산하지 않은 항목, 성공 보장, 능력 단정, 사전에 없는 해석, 범위 밖 단언을 걸러낸다.
// 이 파일은 AI를 직접 호출하지 않는다. 호출은 server.js 가 callModel 로 넘긴다(테스트는 모의 함수로 대신한다).

const { PERIOD_ROWS, TOKEN_RE, rowOf, godsOfRow, expandTokens } = require('./successChildTokens');
const { tenGod } = require('./jijanggan');
const { OPENING, ALL_JOBS, ALL_BIZ, PLAIN_GOD, reasonFor } = require('./successChildPlain');
const WEALTH_GODS = ['편재', '정재'];

const SECTION_TITLES = ['핵심 결론', '공부운', '직업운', '사업운', '재물운', '10대·20대·30대 운의 변화'];
const { repairSentences } = require('./successChildRepair');
const PERIOD_TITLE = SECTION_TITLES[5];
const PERIOD_COUNT = 4;                    // 운의 변화에 쓰는 대운 수(처음 4개)
const SUCCESS_CHILD_MAX_TOKENS = 12000;     // 약 5,500~7,500자 분량(한글 1글자 ≈ 1~1.5토큰)
const PLAIN_STYLE_TYPES = new Set(['A', 'B', 'C']);   // B안(쉬운 말·전문 용어는 근거 줄에만) 문체를 강제하는 설명 유형. A·B·C 모두 적용(2026-11-12 확정).
const JARGON = /(식상생재|식상|재성|관성|인성|비겁|지장간|천간|원국|일간|십성|편재|정재|편관|정관|편인|정인|식신|상관|비견|겁재|본기|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]?)/g;
const PLAIN_BAN = /(초등학생|중학생|고등학생|고학년|저학년|직장인|대학생|취업 준비생|짜임|숨은 글자|눈에 보이는 글자|일곱 글자|여덟 글자|\d+\s*글자|학년|학령|입학|취학|유예|졸업|빠른 생일)/g;
const BEHAVIOR = /(즐깁니다|즐기는(?!지|가)|지루해하지|흥미를 보입니다|흥미를 느낍니다|선호합니다|선호하는(?!지|가)|이미 있을 수|습관이 이미|성향도|성향이 뚜렷|모습을 보입니다|모습이 나타납니다|데 강합니다|에서 강합니다|이해가 빠릅니다|이해가 빨라|잘 해냅니다|뛰어납니다|능숙합니다|일일이 챙기지 않아도|스스로 [^.]{0,16}풀려는|스스로 [^.]{0,24}(?:처리|판단|풀어 나|찾아 처리|해냅|운영)(?!하는지|하는가)|혼자서도 [^.]{0,18}(?:풀어|풀 수|운영|해냅|밀고)|누가 [^.]{0,14}않아도|시키지 않아도|가르쳐 주지 않아도|집중이 잘|혼자 [^.]{0,10}운영할 수|스스로 판단|성향(?:과|이|에|도) (?:맞|뚜렷|강)|[가-힣]+ 성향입니다)/;
// "~하는 힘도 있어", "~하는 능력이 있습니다"처럼 아이에게 그런 힘·능력·감각이 실제로 있다고 말하는 문장(서버 용어집 표현이 들어 있으면 사주 계산값을 말하는 것이라 제외)
const HAS_TRAIT = /(?:[가-힣]+[^.]{0,14})?(?:힘|능력|감각|독립심|끈기|집중력)(?:이|도|은|을)?\s*(?:함께\s*)?있(?:어|으며|습니다|고|는)/;
// 같은 종류의 단정: "생활 곳곳에서 드러납니다", "~하는 구조를 가지고 있습니다"(아이의 지금 모습·소유를 말하는 문장)
const HAS_TRAIT2 = /(?:생활|일상) 곳곳에서 (?:자연스럽게 )?(?:드러|나타)|(?:가지고|갖고) 있(?:습니다|어|으며|는)/;
// 오탐 보정: 부모가 살펴보는 문장("~하는지 확인합니다")과 필요 조건 문장("~할 수 있어야 합니다")은 아이의 행동을 단정하는 표현이 아니다
const OBSERVE_SENT = (t) => (/(는지|은지|인지|는가)/.test(t) && /(살펴|확인|관찰|봅니다)/.test(t)) || (/(있어야 합니다|해야 합니다|필요합니다)/.test(t) && !/(이 아이|아이가|아이는)/.test(t));
const CHILD_CAN = (t) => /(이 아이|아이가|아이는|아이도)/.test(t) && /수 있습니다/.test(t) && !/(볼|살펴볼|해 볼|써 볼|가르쳐 볼|시도해 볼|확인할|나눠 볼|정해 볼|권할|활용할|만들어 볼|풀어 볼|쓸) 수 있습니다/.test(t);
const MAX_ATTEMPTS = 3;                    // 처음 + 다시 쓰기 2회. 그래도 검사를 통과하지 못하면 고객에게 결과를 보내지 않는다(문장을 지워서 통과시키지 않는다).
const MIN_LEN = { summary: 60, body: 150, period: 20, bullet: 15 };
const MAX_LEN = { section: 1500, totalHard: 8600, totalSoft: 7700, totalMin: 5000 };   // 유료 결과지 목표 5,500~7,500자(실제 AI 시험 호출로 확인 전의 초기 기준)
const GOD_NAMES = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
const GROUP_NAMES = ['식상', '재성', '관성', '인성', '비겁'];

// ── 프롬프트 ──
function buildSuccessChildPrompt(factsText, feedback = []) {
  const retry = feedback.length
    ? `\n[앞선 결과에서 고쳐야 할 점 — 이번에는 반드시 지키세요]\n${feedback.map((f) => '- ' + f).join('\n')}\n`
    : '';
  return `당신은 한국 명리학 해석가입니다. 아래 [서버 계산값]만을 근거로 '우리 아이 성공운명서'를 씁니다. 읽는 사람은 이 아이의 엄마이고, 중학생도 한 번 읽고 이해할 쉬운 말로 써야 합니다.
부모가 돈을 내고 읽는 개인 사주 해석입니다. 이 아이의 계산값에서 나온 구체적인 이야기만 씁니다. 어느 아이에게나 해당하는 말은 쓰지 않습니다.

${factsText}

[해석의 바탕 — 서버 용어집의 쉬운 말로 풀이합니다]
- "꾸준히 자라는 재능"은 반복할수록 커지는 재능, "날카롭게 드러나는 재능"은 개성이 분명하지만 규칙·평가와 부딪히기 쉬운 재능입니다.
- "움직이는 돈의 흐름"은 사업·영업·투자·거래처럼 오르내림이 있는 돈과 그것을 다루는 감각입니다. "쌓이는 돈의 흐름"은 월급이나 정해진 대가처럼 정해진 방식으로 쌓이는 돈입니다. 두 가지 모두 실제 금액이 얼마인지는 정하지 않습니다.
- "경쟁이 강한 평가 환경"은 시험·선발·자격처럼 비교되는 환경이고, "안정된 제도 안의 인정"은 직함·자격·제도 속의 인정입니다. "깊이 파고드는 배움", "꾸준히 쌓는 배움"은 학문과 반복 축적입니다. "혼자 해내는 힘", "경쟁하며 밀고 나가는 힘"은 독립심과 경쟁심입니다.
- 유형 B·C에서는 "사업가형"이라는 말을 어디에도 쓰지 않습니다. 사업가형은 만드는 재능 다음에 돈 감각이 이어질 때입니다. 서버 판정에서 만든 것이 돈과 거래로 이어지는 연결이 "갖춰져 있습니다"라고 한 경우에만 사업가형이라는 말과 이 연결을 씁니다.
- 이 해석은 "전통 명리학에서 ~는 ~를 뜻합니다"로 쓰고, 이 아이의 성격·행동·미래 결과로 바꿔 단정하지 마세요. 사전에 없는 규칙은 만들지 마세요.

[문장 호흡 — 엄마가 휴대전화로 읽습니다]
- 한 문장에는 한 가지 내용만 담습니다. 보통 40자 안팎으로 쓰고, 길어도 60자를 넘기지 않습니다. "~이고, ~하며, ~해서"로 여러 설명을 이어 붙인 문장은 두 문장으로 나눕니다.
- 공부운·직업운·사업운·재물운의 본문은 한 문단을 2~3문장으로 쓰고, 문단이 바뀌면 줄을 바꿉니다. 핵심 결론의 한 줄짜리 항목도 문장이 길어지지 않게 짧은 문장 3~4개로 씁니다.
- 앞 문장에서 말한 뜻을 다음 문장에서 말만 바꿔 되풀이하지 않습니다. 한 번 설명한 근거는 다시 풀이하지 않고 다음 정보로 넘어갑니다.
- 상담사가 엄마 앞에서 차분히 설명하듯 씁니다. "~입니다."만 줄줄이 잇지 말고, 이유를 알려 주는 문장, 이 아이에게 맞는 모습을 말하는 문장, 해 볼 일을 권하는 문장을 자연스럽게 섞습니다.
- 문장을 짧게 나눌 때도 해석의 뜻, 토큰({대운N}), 주의 문구, 직업·사업 예시를 바꾸지 않고, 쉽게 쓰려고 새로운 단정을 만들지 않습니다.

[직업·사업 예시 사전 — 이 안에서만 고릅니다. 예시는 방향이며, 그 일을 갖게 된다는 뜻이 아닙니다]
- 직업: 웹툰 작가, 제과제빵사, 영상 편집자, 학원 강사, 요리사, 디자이너 / 공인중개사, 영업사원, 유통 MD, 무역 담당자 / 초등학교 교사, 연구원, 번역가, 변리사 / 회계사, 간호사, 공무원, 판사
- 사업: 동네 베이커리나 카페, 직접 만든 상품을 파는 온라인 쇼핑몰, 온라인 강의 판매 / 부동산 중개사무소, 도소매 매장, 무역 / 학원 운영, 교재·문제집 출판 / 세무사·회계 사무소, 약국
- 서버의 [직업·사업 추천 후보] 3개씩을 그 순서로 씁니다. 다른 직업·사업은 사전 안에서 이 아이에게 더 맞을 때만 바꿉니다.

[숫자·연도·시기 — 가장 중요합니다]
- 십성 개수, 글자 수 같은 계산 숫자는 본문 어디에도 쓰지 않습니다. 서버가 "사주 풀이 근거"를 따로 붙입니다. 그래서 "근거:" 줄은 쓰지 않습니다.
- 연도와 나이는 직접 쓰지 말고 토큰으로만 씁니다. 서버가 계산값으로 바꿔 넣습니다.
  {대운1}~{대운${PERIOD_ROWS}} → 그 시기의 "시작~끝년(나이)" / {대운N.연도} / {대운N.나이}
- 재물의 시기는 서버가 확정한 두 문장 {재성대운}, {재성속운}만 씁니다. 재물운 본문에서 각각 한 번씩, 수정하지 말고 그대로 넣습니다. 다른 곳에는 쓰지 않습니다. 두 문장에 없는 시기를 돈의 시기라고 쓰지 마세요. 재물운의 "결론:"과 "한 줄:"에 {대운N.나이}({대운N.연도})를 쓸 수 있는 시기는 서버의 [재물 시기]에 적힌 대운뿐이며, 없으면 시기를 쓰지 않습니다.
- 시기별 운의 성격은 서버의 [시기별 쉬운 말 요약]에 있는 말로만 풀이합니다. 요약에 없는 성격을 시기에 붙이지 마세요.
- 서버가 계산한 시기 밖의 시기는 쓰지 않습니다. 나이대 표현(10대·20대·30대·40대), 학년·학교급(초등학생·중학생·고등학생), 직장인·대학생 같은 말은 쓰지 않고, 시기는 {대운N} 토큰과 "그 시기"로만 말합니다. 학년, 학령, 입학, 빠른 생일은 언급하지 않습니다.
- 예시용 숫자(문제 수, 횟수, 분, 장, 개)는 반드시 "예를 들어"와 함께 씁니다. 숫자가 든 문장마다 그 문장 안에 "예를 들어"를 넣어 씁니다("매일 10장씩"만 쓰지 않고 "예를 들어 매일 10장씩"으로). 계산에 없는 숫자를 계산값처럼 쓰지 않습니다.

[쉬운 말로 쓰는 방법]
- 십성 이름, 천간, 지지, 지장간, 원국, 식상, 재성, 관성, 인성, 한자는 본문에 쓰지 않습니다.
- "짜임", "숨은 글자", "눈에 보이는 글자" 같은 말은 쓰지 않습니다. 같은 표현을 한 항목에서 세 번 넘게 쓰지 말고, 서버 용어집의 여러 표현을 돌려 씁니다. "규칙과 평가"라는 말은 전체에서 여섯 번을 넘기지 않습니다.
- 이 글은 명리학 교재가 아닙니다. 엄마가 "그래서 우리 아이에게 무엇을 해 보면 좋은지" 알 수 있게 쓰고, 풀이 설명은 꼭 필요한 곳에서 한 번만 합니다.
- "전통 명리학에서 ~는 ~를 뜻합니다" 같은 풀이 문장은 전체에서 두 번 이하로 쓰고, 같은 용어집 표현을 두 번 풀이하지 않습니다. 시기별 운과 예시 항목에서는 쓰지 않습니다.
- 서버 용어집 표현(예: 꾸준히 쌓는 배움)은 한 항목에서 두 번, 시기별 운을 뺀 전체에서 다섯 번을 넘기지 않습니다. 예시 항목에는 용어집 표현을 쓰지 않습니다. 같은 뜻은 이 아이의 생활 속 모습(숙제, 시험, 용돈 같은 장면)으로 풀어 씁니다. "A와 B가 맞아떨어지며 …가 필요합니다" 같은 같은 문장 틀을 항목마다 되풀이하지 않습니다.
- 예시 항목 하나는 세 문장 이내로 씁니다.
- "겉으로 드러난", "속에서 받치는", "깊은 곳", "윗글자" 같은 위치 설명은 시기별 운과 핵심 결론의 "차이:"에서만 쓰고, 공부운·직업운·사업운·재물운과 핵심 결론의 다른 줄에서는 쓰지 않습니다. 어느 글자에 있는지는 서버가 근거 줄에 붙입니다.
- 같은 시기 설명("{대운1}, {대운2}는 모두 …운입니다")은 핵심 결론의 "차이:"에서만 한 번 씁니다. 공부운·직업운·사업운에서는 시기를 다시 풀이하지 말고, 그 항목에서만 알려 줄 수 있는 새 정보(과목별 방법, 일의 모습, 준비)를 씁니다.
- 재물운의 "결론:"은 돈을 다루는 특징만 한 문장으로 쓰고 시기·나이 토큰은 넣지 않습니다. 시기는 {재성대운}·{재성속운} 문장이 말합니다.
- 이 아이의 모습은 "이 사주에서는 ~ 쪽이 두드러집니다", "~ 방식이 잘 맞습니다", "~에서 힘이 납니다", "~ 환경이 어울립니다"처럼 사주가 가리키는 방향으로 씁니다. 아이가 실제로 그렇게 한다는 말은 쓰지 않고, 부모가 만들어 줄 환경으로 바꿔 씁니다(예: "누가 시키지 않아도 한다" 대신 "할 일을 미리 정해 두는 방식이 잘 맞습니다").
- 돈의 흐름이 언제 어디에 있는지는 서버 문장 {재성대운}·{재성속운}만 말합니다. 재물운 본문과 다른 항목에서 "움직이는 돈의 흐름"·"쌓이는 돈의 흐름"을 시기({대운N})와 함께 쓰지 않습니다. 시기별 운의 각 시기에는 그 시기의 서버 요약에 있는 힘만 씁니다.
- 아이의 실제 능력·습관·행동·성향을 사실처럼 쓰지 않습니다. 금지 예: "~하는 모습을 보입니다", "~에 강합니다", "이해가 빠릅니다", "잘 해냅니다", "스스로 ~합니다", "~를 즐깁니다", "지루해하지 않습니다", "흥미를 보입니다", "~를 선호합니다", "이미 ~하는 습관이 있습니다".
- 사주 해석과 부모가 확인할 일을 구분합니다. 사주 해석은 "사주에서는 ~ 방향이 두드러집니다", "~하는 방식이 잘 맞는 방향입니다"로 쓰고, 아이가 실제로 그렇게 하는지·할 수 있는지는 "해볼 일"에서 "~하는지 살펴봅니다"로만 씁니다. "스스로 ~할 수 있습니다", "혼자서도 ~합니다", "집중이 잘됩니다", "누가 시키지 않아도", "~밀고 나갈 수 있는 방향입니다", "체계적인 성향"처럼 아이가 실제로 그렇게 한다는 뜻으로 읽히는 표현을 쓰지 않습니다. 이런 뜻은 "~와 잘 맞습니다", "~에서 힘이 납니다"로 씁니다.
- 대신 사주가 가리키는 방향은 "~와 잘 맞습니다", "~에서 힘이 납니다"로 쓰고, 정말 그런지는 부모가 직접 살펴보도록 제안합니다. 예: "이 방식이 맞는지는 두 주 동안 해 보고 아이가 스스로 이어 가는지 살펴봅니다."
- 따옴표 안의 말에도 물음표를 쓰지 않습니다. 부모가 아이에게 건넬 말을 가르치지 않고, 해볼 일은 시간표 만들기, 기록장 쓰기처럼 눈에 보이는 행동만 씁니다.
- 어려운 개념은 생활 속 모습으로 풀어 줍니다. 엄마가 읽고 "그래서 우리 아이는 이런 모습이구나"라고 알 수 있어야 합니다.
- 현실 예시는 학교 수업, 숙제, 시험, 학원, 용돈, 동네 가게, 중고거래 앱처럼 아이가 일상에서 겪는 장면만 씁니다. 학교 축제 장사, 스티커 판매, 학생 창업처럼 만든 상황은 쓰지 않습니다.
- 각 항목의 "결론:"은 이 아이에게 무엇이 맞는지 알려 주는 긍정적인 문장으로 씁니다. "~가 드러나지 않습니다", "~가 없습니다", "어렵습니다"로 끝내지 않습니다. 없는 것은 본문에서 "이 아이는 ~를 먼저 쌓는 쪽입니다"처럼 방향으로 바꿔 씁니다.
- 어떤 힘이 약하거나 없어도 그 분야의 능력이 없다고 쓰지 않습니다("맞지 않습니다", "못합니다", "가장 먼 일입니다" 금지). 이 아이가 강한 쪽의 방식을 구체적으로 씁니다.

[문체]
- 단호한 다·나·까 문체입니다. 결론부터 씁니다. 문장은 짧고 한 문장에 메시지 하나입니다.
- 물음표 문장, "~십시오", 해요체(~해요, ~예요, ~죠), "당신"은 쓰지 않습니다. 부모에게 권할 때는 "~하면 좋습니다", "~해 봅니다"로 씁니다.
- 보험 표현은 쓰지 않습니다: "~로 해석됩니다", "~볼 수 있습니다", "~보입니다", "~일 수 있습니다", "~경향이 있습니다", "가능성이 있습니다".
- 성적, 합격, 직업, 소득, 재산, 사업 성공을 확정하거나 약속하지 않습니다. 면책·한계 문장("보장하지 않습니다" 등)은 쓰지 않습니다. 서버가 끝에 한 번 붙입니다.
- 위로, 칭찬·격려·대화법 같은 육아 조언은 쓰지 않습니다. "해볼 일"은 아래 [해볼 일 쓰는 방법]을 따릅니다.
- 같은 문장 구조를 반복하지 말고, 같은 설명을 다른 항목에 다시 쓰지 않습니다.

[핵심 결론 쓰는 방법]
- "결론:"과 "요약:"의 첫 문장은 서버가 정한 문장을 정확히 그대로 씁니다. 이어서 이 아이에게 어떤 특징이 나타나는지, 공부는 왜 필요한지, 부모는 무엇을 해 주면 좋은지를 씁니다.
- "차이:"에는 서버의 [판정 근거 쉬운 말] 네 문장의 뜻을 숫자 없이 쓰고, 마지막 "정리" 문장을 그대로 따릅니다. "세 가지가 모두 같은 쪽"이라는 말은 정리 문장이 그렇게 말할 때만 씁니다. 판정 근거를 지어내지 마세요.

[항목마다 맡은 역할 — 다른 항목에서 이미 한 설명을 다시 쓰지 않습니다]
- 핵심 결론: 첫 화면입니다. 공부형·사업가형·복합형 결론, 이 아이를 설명하는 쉬운 한 문장("한 줄:"), 이번 달에 부모가 해 볼 일 한 가지("해볼 일:")가 가장 중요합니다.
- 공부운: 시도해 볼 공부 방법(과목별 3가지). 직업운: 직업 3가지의 비교와 추천 이유. 사업운: 사업 분야 3가지의 비교와 추천 이유.
- 재물운: 돈의 흐름이 나타나는 시기(서버 확정)와, 지금 부모가 아이에게 가르쳐 볼 수 있는 돈 관리 방법 2~3가지.
- 시기별 운: 언제 무엇이 달라지는지(시기마다 중심이 되는 일과 부모가 할 일 한 가지).

[해볼 일 쓰는 방법]
- 모든 "해볼 일:"은 부모가 아이와 두 주 동안(핵심 결론은 이번 달에) 해 보는 작은 활동 하나와, 그동안 아이가 어떤 부분에 관심을 보이고 어떻게 반응하는지 살펴보는 방법을 1~2문장으로 씁니다. "살펴봅니다", "확인합니다"처럼 관찰하는 말을 꼭 넣습니다.
- 이 활동은 아이의 관심과 반응을 살펴보는 방법입니다. 그 결과만으로 적성이나 미래가 정해진다고 쓰지 않습니다. 아이가 하지 않은 행동은 사실처럼 쓰지 않습니다.
- 핵심 결론의 "해볼 일:"에는 반드시 "이번 달"이라는 말이 들어갑니다. 다른 항목은 "두 주 동안"을 씁니다.

[항목 구성 — 모든 항목은 결론 → 이유와 이 아이의 모습 → 현실 예시 → 해볼 일 → 한 줄 요약 순서]
- 공부운 예시 3개: "- 과목: ..."으로 씁니다. 국어·수학·영어·과학·사회 중 이 아이에게 맞는 과목을 골라 구체적인 공부 방법을 씁니다.
- 직업운 예시 3개: "- 직업명: ..."으로 씁니다. 각 직업마다 (1) 그 직업이 실제로 하는 일 한 문장, (2) 실제로 필요한 능력("필요합니다"로 씁니다), (3) "관심을 보이면"으로 시작하는 해 볼 경험을 씁니다. "이 아이에게 왜 맞는지"는 서버가 사주 계산값으로 항목마다 따로 붙이므로 쓰지 않습니다. 직업 항목에는 "이 아이", "사주", 용어집 표현을 쓰지 않습니다.
- 사업운 예시 정확히 3개: "- 사업 분야: ..."으로 씁니다. 각각 무엇을 어떻게 파는 사업인지, 필요한 능력, 시작 전에 해 볼 경험을 쓰고 분야마다 서로 다른 내용을 씁니다. 추천 이유는 서버가 붙이므로 쓰지 않으며 "이 아이", "사주", 용어집 표현도 쓰지 않습니다.
- 재물운 예시 2~3개: "- 돈 관리 방법: ..."으로 씁니다. 지금 부모가 아이에게 가르쳐 볼 수 있는 돈 관리(용돈 나누기, 쓴 곳 기록하기, 사기 전에 가격 비교하기 등)를 이 아이에게 맞는 이유와 함께 씁니다.
- 시기별 운은 [대운1]~[대운${PERIOD_COUNT}] 블록마다 주제, 해석(2~3문장), 장면(그 시기의 생활 모습 1문장과 그 시기에 해 두면 좋은 일 1문장), 차이를 씁니다. 해석은 "이 시기는 ~가 중심입니다"로 시작해 이 시기의 중심을 한 문장으로 말하고, 받치는 힘은 필요할 때만 한 문장으로 덧붙입니다. "겉으로 드러난"과 "속에서 받치는"이라는 말은 시기별 운 전체에서 두 번 이하로 씁니다. 그 시기의 서버 요약에 없는 성격은 붙이지 않고, "겉으로 드러난"은 서버 요약의 "겉으로 드러난 운"에만 씁니다.
- 분량은 정해 두지 않습니다. 같은 말을 되풀이해 채우지 말고, 항목마다 새로운 정보를 주면서 부모가 값어치를 느낄 만큼 충분히 구체적으로 씁니다.

[출력 형식 — 아래 6개 섹션을 이 순서와 제목 그대로 씁니다. 마크다운(#, **)은 쓰지 않습니다. 예시 줄은 "- "로 시작합니다. "근거:" 줄은 쓰지 않습니다.]
===핵심 결론===
결론: (서버가 정한 문장 그대로)
요약: (서버가 정한 첫 문장 그대로로 시작하고, 이 아이의 특징과 힘이 나는 방식 3~4문장. 숫자 없이)
공부 쪽: (공부는 왜 필요한지, 어떤 방식이 이 아이에게 맞는지 3~4문장)
사업 쪽: (사업·거래 쪽 특징이 생활에서 어떻게 나타나는지 2~3문장)
차이: (판정 근거의 쉬운 말 + 어느 쪽이 더 두드러지는지 3~4문장)
해볼 일: (이번 달에 부모가 해 볼 일 한 가지와 살펴볼 점 1~2문장)
한 줄: (이 아이를 설명하는 쉬운 한 문장. "이 아이는 ~"로 시작, 숫자 없이)

===공부운===
결론: (이 아이에게 맞는 공부 방식을 알려 주는 한 문장)
(본문 첫 문단: 이 아이의 특징과 그렇게 풀이한 이유 3~4문장)
(본문 둘째 문단: 현실에서 나타나는 모습, 따로 챙길 점, 학생 시기 운의 성격 3~4문장)
예시:
- 과목: 구체적인 공부 방법과 이 아이에게 맞는 이유
- 과목: …
- 과목: …
해볼 일: (두 주 동안 해 볼 활동 하나와 살펴볼 점 1~2문장)
한 줄: (한 줄 요약)

===직업운===
결론: (어떤 방향의 직업이 어울리는지 한 문장)
(본문 첫 문단: 이 아이가 힘이 나는 일의 방식과 이유 3~4문장)
(본문 둘째 문단: 직업을 고를 때 볼 점. 사주가 직업을 정하지는 않으며 관심과 경험이 중요하다는 점 포함 2~3문장)
예시:
- 직업명: 그 직업이 하는 일 한 문장. 필요한 능력이 필요합니다. 관심을 보이면 해 볼 경험.
- 직업명: …
- 직업명: …
해볼 일: (두 주 동안 해 볼 활동 하나와 살펴볼 점 1~2문장)
한 줄: (한 줄 요약)

===사업운===
결론: (이 아이에게 어울리는 사업 방식을 알려 주는 한 문장)
(본문 첫 문단: 이 아이의 사업 쪽 특징과 이유 3~4문장)
(본문 둘째 문단: 사업을 한다면 필요한 준비 2~3문장. 돈의 시기는 쓰지 않습니다. 재물운에서 다룹니다)
예시:
- 사업 분야: 어떤 방식의 사업인지, 필요한 능력, 시작 전에 해 볼 경험
- 사업 분야: …
- 사업 분야: …
해볼 일: (두 주 동안 해 볼 활동 하나와 살펴볼 점 1~2문장)
한 줄: (한 줄 요약)

===재물운===
결론: (돈을 다루는 특징을 알려 주는 한 문장. 서버 확정 시기가 있으면 {대운N.나이}({대운N.연도}) 토큰을 씁니다)
(본문 첫 문단: {재성대운} 문장을 그대로 한 번 넣고, 움직이는 돈과 쌓이는 돈의 뜻, 실제 금액을 정하지 않는다는 점)
(본문 둘째 문단: {재성속운} 문장을 그대로 한 번 넣고, 이 아이가 돈을 다루는 특징을 생활 속 모습으로 2~3문장. 이 문단에는 {대운N} 토큰을 쓰지 않습니다)
예시:
- 돈 관리 방법: 지금 가르쳐 볼 방법과 이 아이에게 맞는 이유
- 돈 관리 방법: …
해볼 일: (두 주 동안 해 볼 활동 하나와 살펴볼 점 1~2문장)
한 줄: (한 줄 요약)

===10대·20대·30대 운의 변화===
결론: (한 문장. 시기별로 무엇이 두드러지는지)
[대운1]
주제: (이 시기의 주제)
해석: (이 시기의 성격 2~3문장)
장면: (그 시기의 생활 모습 1문장과 해 두면 좋은 일 1문장)
차이: (앞뒤 시기와 무엇이 다른지 1문장)
[대운2]
(같은 형식으로 [대운${PERIOD_COUNT}]까지 ${PERIOD_COUNT}개를 모두 씁니다. 연도·나이는 서버가 붙이니 쓰지 마세요)
${retry}`;
}

// ── 출력 검사 ──
const sentencesOf = (s) => String(s).split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
const LABEL_RE = /^(결론|요약|근거|주제|해석|차이|한 줄|공부 쪽|사업 쪽|장면|예시|해볼 일):\s*/;
const BULLET_RE = /^[-•]\s+/;
const bulletsOf = (body) => String(body || '').split('\n').map((l) => l.trim()).filter((l) => BULLET_RE.test(l)).map((l) => l.replace(BULLET_RE, ''));
const stripTokens = (s) => String(s).replace(TOKEN_RE, '');

function parseSections(text) {
  const out = {};
  const re = /===([^=\n]+)===\n?([\s\S]*?)(?=\n===[^=\n]+===|$)/g;
  let m;
  while ((m = re.exec(String(text || '')))) { if (!(m[1].trim() in out)) out[m[1].trim()] = m[2].trim(); }
  return out;
}
const fieldOf = (body, label) => { const m = new RegExp('^' + label + ':\\s*(.+)$', 'm').exec(body); return m ? m[1].trim() : ''; };

function allowedFrom(facts) {
  const years = new Set((facts.text.match(/(?:19|20)\d{2}/g) || []).map(Number));
  const by = Number(facts.calc.input.birthdate.slice(0, 4));
  for (let y = by; y <= by + 22; y++) years.add(y);
  const ganji = new Set([...Object.values(facts.calc.pillars).filter(Boolean), ...facts.calc.daeun.list.map((d) => d.ganji)]);
  const counts = {};
  for (const c of [facts.calc.tenGods.surface, facts.calc.tenGods.withHidden]) {
    for (const g of GOD_NAMES) (counts[g] = counts[g] || new Set()).add(c.gods[g]);
    for (const g of GROUP_NAMES) (counts[g] = counts[g] || new Set()).add(c.groups[g]);
  }
  return { years, ganji, counts, dayStem: facts.calc.dayStem };
}

const FORBIDDEN_TERMS = /(신강|신약|용신|희신|격국|신살|세운|공망|귀인|도화살|역마살|원진|삼합|육합|천을)/;
const PROMISE = /(의대|서울대|SKY|스카이|명문대|연봉|\d+\s*(?:억|천만|만)\s*원|\d+\s*억|부자가 (?:됩니다|된다)|반드시 (?:성공|합격|부자)|틀림없이|확실히 (?:성공|부자)|성공을 보장|성공합니다|성공한다|돈을 (?:법니다|번다))/;
const CLAIM = /((?:성적|점수|등급|순위)(?:이|을|가)?\s*(?:오릅니다|오른다|올라갑니다|올립니다|오르게|올려 줍니다|좋아집니다|높아집니다)|(?:사업|창업|가게|장사)[^.]{0,14}(?:성공합니다|성공할 것|잘됩니다|대박|돈을 법니다)|(?:큰돈|목돈)[^.]{0,10}(?:법니다|번다|벌게|들어옵니다|쌓입니다|생깁니다)|(?:수입|재물|소득)이 (?:늘어납니다|커집니다|안정됩니다|보장됩니다|많아집니다)|돈이 (?:들어옵니다|모입니다|모인다)|(?:합격|입학)(?:합니다|한다)|반드시 (?:오릅|늘|커))/;
const PARENTING = /(기다려 주|믿어 주|격려해|칭찬해|다그치|대화법|응원해 주|지켜봐 주|아이에게 [^.]{0,12}말해)/;
const DISCLAIMER = /(보장하지|예측하지|단정할 수 없|판단하지 않|참고용|전통 명리학의 해석입니다)/;
const HEDGE = /(수도 있습니다|로 읽힙니다|로 읽습니다|가능성이 있습니다|듯합니다|것 같습니다|해석됩니다|해석되며|해석되고|해석되는|해석할 수|볼 수 있습니다|(?<!모습을 )보입니다|경향이 )/g;
const HAE_STYLE = /(요|죠)[.!?]?$/;
const ABILITY_DENY = /(가장 먼 (?:일|공부|길)|맞지 않습니다|못합니다|어렵습니다|소질이 없|재능이 없|불가능|부족합니다|떨어집니다)/;
const DICT_BREAK = /((?:지장간|속 글자|여기|중기|정기)[^.]{0,25}(?:순서대로|차례로)[^.]{0,25}(?:공부|직장|재물|자격)|(?:많으면|적으면)[^.]{0,20}(?:경향|구조|특징)|(?:여기|중기|정기)[^.]{0,10}순서)/;
const BEYOND = /(다시|더 이상)\s*(?:등장하|나타나)지 않|평생|말년|노년|죽을/;
const AGE_RE = /\d{1,3}\s*(?:~\s*\d{1,3}\s*)?세/;
const DECADE_RE = /(?:^|[^0-9])[1-9]0대/;
const GRADE_RE = /(?:초등|중학교|중등|고등학교|고등)\s*\d?\s*학년/;
const YEAR_RE = /(?:19|20)\d{2}/;

// 대운 십성이 같은 절(쉼표 단위)의 {대운N} 토큰이 가리키는 대운의 십성과 맞는지 본다. 틀린 연결 메시지를 돌려준다.
//  - 십성은 보통 자기 대운 토큰 뒤에 온다("{대운3}에는 천간 편재, {대운4}에는 천간 정재"): 같은 절에서 앞에 나온 토큰과 짝짓는다. 앞에 없으면 뒤에 나온 토큰과 짝짓는다.
//  - 짝이 되는 토큰이 하나면 엄격하게(천간이면 천간 십성, 지지·지장간이면 지지 쪽 십성) 확인하고, 둘 이상이면 그 대운들 중 하나에 있는지만 확인한다.
function godLinkProblems(raw, facts) {
  const problems = [];
  const tokens = [...raw.matchAll(TOKEN_RE)].map((m) => ({ pos: m.index, end: m.index + m[0].length, k: (/^대운(\d)/.exec(m[1].trim()) || [])[1] })).filter((t) => t.k);
  const godRe = new RegExp(`(${GOD_NAMES.join('|')})`, 'g');
  const noTok = raw.replace(TOKEN_RE, (all) => ' '.repeat(all.length));   // 위치를 유지한 채 토큰 안 글자는 가린다
  let m;
  while ((m = godRe.exec(noTok))) {
    const before = noTok.slice(Math.max(0, m.index - 14), m.index);
    const cs = noTok.lastIndexOf(',', m.index) + 1;
    const ce = noTok.indexOf(',', m.index); const clauseEnd = ce < 0 ? noTok.length : ce;
    const inClause = tokens.filter((t) => t.pos >= cs && t.end <= clauseEnd);
    const preceding = inClause.filter((t) => t.end <= m.index);
    const following = inClause.filter((t) => t.pos >= m.index + m[1].length);
    const cands = preceding.length ? preceding : following;
    if (!cands.length) { if (/대운/.test(before)) problems.push(`대운 십성 "${m[1]}"은 {대운N} 토큰과 함께 쓰거나 {대운N.천간십성}으로 쓰세요`); continue; }
    const rows = [...new Set(cands.map((t) => Number(t.k)))].map((k) => rowOf(facts, k)).filter(Boolean);
    if (!rows.length) continue;
    const isBranch = /지지|지장간/.test(before), isStem = /천간/.test(before);
    const fits = (r) => { const g = godsOfRow(r); return isBranch ? g.branch.has(m[1]) : isStem ? m[1] === g.stem : g.all.has(m[1]); };
    const strictRow = cands.length === 1 || new Set(cands.map((t) => t.k)).size === 1 ? rows[0] : null;
    if (strictRow ? !fits(strictRow) : !rows.some(fits)) {
      const r = strictRow || rows[0];
      problems.push(`{대운${cands[cands.length - 1].k}}(${r.ganji})의 ${isBranch ? '지지' : isStem ? '천간' : ''} 십성은 ${m[1]}이 아닙니다(천간 ${r.stemGod}, 지지 본기 ${r.branchMainGod})`);
    }
  }
  return problems;
}

// 쉬운 말 성격 표현이 가까운 {대운N}의 성격과 맞는지 본다(예: {대운2}의 겉으로 드러난 운이 아닌 것을 "겉으로 드러난다"고 쓰는 오류).
function plainLinkProblems(raw, facts) {
  const problems = [];
  const tokens = [...raw.matchAll(TOKEN_RE)].map((m) => ({ pos: m.index, end: m.index + m[0].length, k: (/^대운(\d)/.exec(m[1].trim()) || [])[1] })).filter((t) => t.k);
  if (!tokens.length) return problems;
  const noTok = raw.replace(TOKEN_RE, (all) => ' '.repeat(all.length));
  for (const [god, label] of Object.entries(PLAIN_GOD)) {
    for (let from = 0; ;) {
      const i = noTok.indexOf(label, from); if (i < 0) break; from = i + label.length;
      const cs = noTok.lastIndexOf(',', i) + 1; const ce = noTok.indexOf(',', i); const clauseEnd = ce < 0 ? noTok.length : ce;
      const inClause = tokens.filter((t) => t.pos >= cs && t.end <= clauseEnd);
      const preceding = inClause.filter((t) => t.end <= i), following = inClause.filter((t) => t.pos >= i + label.length);
      const near = preceding.length ? preceding[preceding.length - 1] : following[0];
      if (!near) continue;
      const row = rowOf(facts, Number(near.k)); if (!row) continue;
      if (!godsOfRow(row).all.has(god)) { problems.push(`{대운${near.k}}에는 "${label}"이 없습니다`); continue; }
      const win = noTok.slice(Math.max(0, i - 14), i + label.length + 14);
      if (/겉으로 드러/.test(win) && god !== row.stemGod) problems.push(`{대운${near.k}}의 겉으로 드러난 운은 "${PLAIN_GOD[row.stemGod]}"입니다("${label}"이 아닙니다)`);
      else if (/속에서 받치/.test(win) && god !== row.branchMainGod) problems.push(`{대운${near.k}}의 속에서 받치는 운은 "${PLAIN_GOD[row.branchMainGod]}"입니다("${label}"이 아닙니다)`);
    }
  }
  return problems;
}

// 한자 천간과 십성 이름의 짝(例: 庚(편재))이 일간 기준 계산과 맞는지 본다.
function stemGodProblems(text, dayStem) {
  const problems = [];
  const re = new RegExp(`([甲乙丙丁戊己庚辛壬癸])(?:\\(([가-힣]{2})\\)|(?:은|는|이|가)\\s*([가-힣]{2})(?=입니다|이며|이고|으로|로)|\\s+([가-힣]{2})(?=입니다|이며|이고|으로|로|[,.\\s]))`, 'g');
  let m;
  while ((m = re.exec(text))) {
    const god = m[2] || m[3] || m[4];
    if (GOD_NAMES.includes(god) && tenGod(dayStem, m[1]) !== god) problems.push(`${m[1]}은 일간 기준 ${tenGod(dayStem, m[1])}인데 ${god}이라고 썼습니다`);
  }
  return problems;
}

// 문장 하나의 '근거 위반'(문장을 지우면 고쳐지는 종류). raw: 토큰이 들어 있는 원문 문장.
function sentenceViolations(raw, allowed, facts, title = '') {
  const v = [];
  const noTok = stripTokens(raw);
  if (YEAR_RE.test(noTok)) v.push('연도를 직접 썼습니다(토큰 사용)');
  if (AGE_RE.test(noTok)) v.push('나이를 직접 썼습니다(토큰 사용)');
  if (DECADE_RE.test(noTok)) v.push('"10대·20대·30대" 같은 연령대 표현을 썼습니다');
  if (GRADE_RE.test(noTok)) v.push('학년 표현을 직접 썼습니다({현재학령} 사용)');
  const ex = expandTokens(raw, facts);
  for (const u of ex.unknown) v.push(`알 수 없는 토큰 {${u}}`);
  for (const p of godLinkProblems(raw, facts)) v.push(p);
  for (const p of plainLinkProblems(raw, facts)) v.push(p);
  const text = ex.text;
  for (const g of text.match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g) || []) if (!allowed.ganji.has(g)) { v.push(`계산값에 없는 간지 ${g}`); break; }
  const termRe = new RegExp(`(${[...GOD_NAMES, ...GROUP_NAMES].join('|')})(?:이|가|은|는)?\\s*(\\d{1,2})(?!\\d)(?!\\s*년)`, 'g');
  let m;
  while ((m = termRe.exec(text))) if (!allowed.counts[m[1]].has(Number(m[2]))) { v.push(`${m[1]} 개수 ${m[2]}가 계산값과 다름`); break; }
  for (const p of stemGodProblems(text, allowed.dayStem)) v.push(p);
  if (FORBIDDEN_TERMS.test(text)) v.push(`계산하지 않은 항목 언급(${text.match(FORBIDDEN_TERMS)[1]})`);
  const NEGATED = /(아닙니다|않습니다|않으며|뜻하지)/.test(text);
  if ((HAS_TRAIT.test(noTok) || HAS_TRAIT2.test(noTok)) && !OBSERVE_SENT(noTok) && !Object.values(PLAIN_GOD).some((lb) => noTok.includes(lb)) && !(title === PERIOD_TITLE) && !/사주/.test(noTok)) v.push(`아이에게 그런 힘·능력이 실제로 있다고 단정하는 표현(${(noTok.match(HAS_TRAIT) || noTok.match(HAS_TRAIT2))[0].slice(-12)})`);
  if (BEHAVIOR.test(text) && !OBSERVE_SENT(text) && !(title === PERIOD_TITLE && /시기(?:입니다|예요)\.?$/.test(text.trim()))) v.push(`아이의 실제 습관·행동을 사실처럼 단정하는 표현(${text.match(BEHAVIOR)[1]})`);
  if (CHILD_CAN(text)) v.push('아이가 실제로 할 수 있다고 단정하는 표현("이 아이는 ~할 수 있습니다"). 사주 방향으로 쓰고 실제 여부는 "해볼 일"에서 살펴보게 하세요');
  if (CLAIM.test(text) && !NEGATED) v.push(`공부 방법·사업·소득 결과를 단정하는 표현(${text.match(CLAIM)[1]})`);
  if (/식상생재|식상 다음에 재성이 이어/.test(text) && facts.compare && facts.compare.link.status !== '완성' && !/아직|않|없|지장간|대운|조건/.test(text)) v.push('식상생재는 서버 판정이 "완성"일 때만 쓸 수 있습니다');
  { // 숫자: 계산값의 개수(십성 이름 뒤, N글자·N개)는 통과, 그 밖의 설명용 숫자는 "예를 들어"와 함께 써야 한다
    const names = [...GOD_NAMES, ...GROUP_NAMES].join('|');
    const rest = noTok.replace(new RegExp(`(?:${names})(?:이|가|은|는)?\\s*\\d{1,2}(?!\\d)(?!\\s*년)`, 'g'), '').replace(/\d{1,2}\s*(?:글자|개)/g, '').replace(/10년 단위/g, '');
    if (/\d/.test(rest) && !/예를 들어/.test(noTok)) v.push('설명용 숫자는 "예를 들어"와 함께 쓰세요(계산값처럼 보이는 숫자 금지)');
  }
  if (PROMISE.test(text) && !NEGATED) v.push(`합격·소득·성공을 단정하거나 약속하는 표현(${text.match(PROMISE)[1]})`);
  if (PARENTING.test(text)) v.push(`육아 조언·대화법(${text.match(PARENTING)[1]})`);
  if (ABILITY_DENY.test(text)) v.push(`능력이 없다고 단정하는 표현(${text.match(ABILITY_DENY)[1]})`);
  if (DICT_BREAK.test(text)) v.push('명리 사전에 없는 규칙·지장간 순서 해석');
  if (BEYOND.test(text)) v.push('계산한 대운 범위 밖을 단정하는 표현');
  if (/[{}]/.test(text)) v.push('바뀌지 않은 토큰이 남아 있습니다');
  return v;
}

const valueChars = (b) => String(b || '').split('\n').filter((l) => !/^\[대운\d\]$/.test(l.trim())).map((l) => l.replace(LABEL_RE, '')).join('').length;

function lintSuccessChild(text, facts, { truncated = false } = {}) {
  const hard = [], soft = [];
  const allowed = allowedFrom(facts);
  const rawSections = parseSections(text);
  const ex = expandTokens(text, facts);
  const expanded = ex.text;
  const sections = parseSections(expanded);
  const rows = facts.rows.slice(0, PERIOD_COUNT);
  if (truncated) hard.push({ code: 'truncated', message: '글이 중간에 잘렸습니다. 분량을 줄여 끝까지 쓰세요.' });

  // 구조
  for (const t of SECTION_TITLES) if (!sections[t]) hard.push({ code: 'structure', message: `섹션 ===${t}=== 이(가) 없습니다.` });
  const body = (t) => String(sections[t] || '');
  const nonLabel = (b) => b.split('\n').filter((l) => !LABEL_RE.test(l)).join(' ').trim();
  if (sections['핵심 결론']) {
    const hb = body('핵심 결론');
    if (!fieldOf(hb, '결론')) hard.push({ code: 'structure', message: '핵심 결론에 "결론:" 줄이 없습니다.' });
    if (fieldOf(hb, '요약').length < MIN_LEN.summary) hard.push({ code: 'structure', message: '핵심 결론의 "요약:"이 없거나 너무 짧습니다.' });
    for (const f of ['공부 쪽', '사업 쪽', '차이', '한 줄']) if (!fieldOf(hb, f)) hard.push({ code: 'structure', message: `핵심 결론에 "${f}:" 줄이 없습니다.` });
  }
  const BULLETS = { 공부운: [3, 3], 직업운: [3, 3], 사업운: [3, 3], 재물운: [2, 3] };
  for (const t of ['공부운', '직업운', '사업운', '재물운']) {
    if (!sections[t]) continue;
    const b = body(t);
    if (!fieldOf(b, '결론')) hard.push({ code: 'structure', message: `${t}에 "결론:" 줄이 없습니다.` });
    if (!fieldOf(b, '한 줄')) hard.push({ code: 'structure', message: `${t}에 "한 줄:" 줄이 없습니다.` });
    if (!fieldOf(b, '해볼 일')) hard.push({ code: 'structure', message: `${t}에 "해볼 일:" 줄이 없습니다.` });
    const paras = b.split('\n').map((l) => l.trim()).filter((l) => l && !LABEL_RE.test(l) && !BULLET_RE.test(l));
    if (paras.join(' ').length < MIN_LEN.body) hard.push({ code: 'structure', message: `${t} 본문이 너무 짧습니다.` });
    const bl = bulletsOf(b), [lo, hi] = BULLETS[t];
    if (bl.length < lo || bl.length > hi) hard.push({ code: 'structure', message: `${t}의 "예시:" 항목("- ...")은 ${lo === hi ? lo : lo + '~' + hi}개여야 합니다(지금 ${bl.length}개).` });
    if (bl.some((x) => x.length < MIN_LEN.bullet)) hard.push({ code: 'structure', message: `${t}의 예시 항목이 너무 짧습니다.` });
    if (t === '직업운' && bl.some((x) => !/필요/.test(x) || !/관심을 보이면/.test(x))) hard.push({ code: 'structure', message: '직업 예시마다 그 직업이 하는 일, 실제로 필요한 능력("필요"), "관심을 보이면"으로 시작하는 해 볼 경험을 쓰세요(이 아이에게 맞는 이유는 서버가 붙입니다).' });
    if (t === '재물운' && !/\{재성대운\}/.test(String(rawSections['재물운'] || ''))) hard.push({ code: 'structure', message: '재물운에 {재성대운}을 그대로 넣으세요.' });
  }
  const periodTitle = SECTION_TITLES[5];
  if (sections[periodTitle]) {
    const b = body(periodTitle);
    if (!fieldOf(b, '결론')) hard.push({ code: 'structure', message: '운의 변화에 "결론:" 줄이 없습니다.' });
    rows.forEach((r, idx) => {
      const head = `[대운${idx + 1}]`;
      const i = b.indexOf(head);
      if (i < 0) { hard.push({ code: 'structure', message: `${head} 블록이 없습니다([대운1]~[대운${PERIOD_COUNT}] 형식).` }); return; }
      const next = b.indexOf('\n[대운', i + head.length);
      const blk = b.slice(i, next < 0 ? undefined : next);
      for (const f of ['주제', '해석', '장면', '차이']) if (!fieldOf(blk, f)) hard.push({ code: 'structure', message: `${head}에 "${f}:" 줄이 없습니다.` });
      if (fieldOf(blk, '해석').length < MIN_LEN.period) hard.push({ code: 'structure', message: `${head}의 해석이 너무 짧습니다.` });
    });
  }

  // ── 실제 AI 결과(2026-11-13) 분석 후 추가한 검사 ──
  {
    const cmpType = facts.compare && facts.compare.type;
    const op = OPENING[cmpType];
    if (op && sections['핵심 결론']) {
      const hb = body('핵심 결론');
      if (fieldOf(hb, '결론') !== op.lead) hard.push({ code: 'structure', message: `핵심 결론의 "결론:"은 정확히 "${op.lead}"여야 합니다.` });
      if (op.first && !fieldOf(hb, '요약').startsWith(op.first)) hard.push({ code: 'structure', message: `핵심 결론 "요약:"은 "${op.first}"로 시작해야 합니다.` });
    }
    for (const t of SECTION_TITLES) if (t !== '재물운' && /\{재성(?:대운|속운)\}/.test(String(rawSections[t] || ''))) hard.push({ code: 'structure', message: `${t}에는 {재성대운}·{재성속운}을 쓰지 마세요(재물운에서만 씁니다).` });
    if (rawSections['재물운']) {
      const wealthRows = new Set(facts.rows.slice(0, PERIOD_ROWS).map((r, i) => ([r.stemGod, r.branchMainGod].some((g) => WEALTH_GODS.includes(g)) ? i + 1 : 0)).filter(Boolean));
      const rb = String(rawSections['재물운']);
      for (const f of ['결론', '한 줄']) for (const m of fieldOf(rb, f).matchAll(/\{대운(\d)(?:\.[가-힣]+)?\}/g)) if (!wealthRows.has(Number(m[1]))) hard.push({ code: 'grounding', message: `재물운 "${f}:"의 {대운${m[1]}}은 돈의 흐름이 나타나는 시기가 아닙니다. 서버가 확정한 {재성대운}·{재성속운} 시기만 쓰세요.` });
    }
    for (const t of ['공부운', '직업운', '사업운', '재물운']) {
      if (!sections[t]) continue;
      if (/(드러나지 않|없습니다|어렵습니다|못합니다|아닙니다)\.?$/.test(fieldOf(body(t), '결론'))) hard.push({ code: 'tone', message: `${t}의 "결론:"은 이 아이에게 맞는 방향을 알려 주는 긍정적인 문장으로 쓰세요("~가 드러나지 않습니다", "없습니다"로 끝내지 않습니다).` });
      for (const x of bulletsOf(body(t))) if (sentencesOf(x).length > 4) hard.push({ code: 'length', message: `${t}의 예시 항목 하나가 너무 깁니다(세 문장 이내로 쓰세요): ${x.slice(0, 16)}` });
      for (const x of bulletsOf(body(t))) if (!/^[^:]{1,40}:\s*\S/.test(x)) hard.push({ code: 'structure', message: `${t}의 예시 항목은 "- 이름: 설명" 형식이어야 합니다: ${x.slice(0, 20)}` });
    }
    for (const [t, dict] of [['직업운', ALL_JOBS], ['사업운', ALL_BIZ]]) {
      if (!sections[t]) continue;
      for (const x of bulletsOf(body(t))) { const name = x.split(':')[0]; if (/^[^:]{1,40}:\s*\S/.test(x) && !dict.some((d) => name.includes(d))) hard.push({ code: 'grounding', message: `${t} 예시 "${name}"은 예시 사전에 없습니다. 서버의 추천 후보나 사전 안에서 고르세요.` }); }
    }
    if (cmpType !== 'A' && /사업가형/.test(expanded)) hard.push({ code: 'grounding', message: '"사업가형"이라는 말은 서버 판정이 유형 A일 때만 쓸 수 있습니다.' });
    const bodyAll = SECTION_TITLES.flatMap((t) => body(t).split('\n')).filter((l) => !/^근거:/.test(l.trim())).join('\n');
    if (/\?/.test(bodyAll)) hard.push({ code: 'tone', message: '물음표 문장을 쓰지 마세요. 모든 문장을 평서문 다·나·까로 쓰세요.' });
    if (/십시오/.test(bodyAll)) hard.push({ code: 'tone', message: '"~십시오"를 쓰지 마세요. 권할 때는 "~하면 좋습니다", "~해 봅니다"로 쓰세요.' });
    for (const t of ['공부운', '직업운', '사업운', '재물운']) {
      if (!sections[t]) continue;
      const td = fieldOf(body(t), '해볼 일');
      if (td && !/(살펴|관찰|반응|확인)/.test(td)) hard.push({ code: 'structure', message: `${t}의 "해볼 일:"에는 아이의 관심과 반응을 살펴보는 방법("살펴봅니다" 등)을 넣으세요.` });
    }
    if (sections['핵심 결론']) {
      const hb2 = body('핵심 결론'); const td = fieldOf(hb2, '해볼 일'); const one = fieldOf(hb2, '한 줄');
      if (td && !/이번 달/.test(td)) hard.push({ code: 'structure', message: '핵심 결론의 "해볼 일:"에는 "이번 달"이라는 말을 넣으세요(이번 달에 부모가 해 볼 일 한 가지).' });
      if (td && !/(살펴|관찰|반응|확인)/.test(td)) hard.push({ code: 'structure', message: '핵심 결론의 "해볼 일:"에는 아이의 관심과 반응을 살펴보는 방법을 넣으세요.' });
      if (one && (!/^이 아이는 /.test(one) || one.length > 80)) hard.push({ code: 'structure', message: '핵심 결론의 "한 줄:"은 "이 아이는 ~"로 시작하는 쉬운 한 문장(80자 이내)이어야 합니다.' });
    }
    {
      const seen = new Map();
      for (const sn of sentencesOf(bodyAll)) { const k = sn.replace(LABEL_RE, '').replace(/^- /, '').replace(/\s+/g, ''); if (k.length >= 20) seen.set(k, (seen.get(k) || 0) + 1); }
      const dup = [...seen].filter(([, n]) => n > 1).map(([k]) => k.slice(0, 18));
      if (dup.length) hard.push({ code: 'repeat', message: `같은 문장이 항목 사이에서 되풀이됩니다(${dup.slice(0, 2).join(' / ')}…). 항목마다 새로운 정보를 쓰세요.` });
    }
    const REPEAT_LIMIT = [['전통 명리학에서', 3], ['속에서 받치', 3], ['규칙과 평가', 8], ['돈과 거래', 10], ['쌓는 힘', 8], ['만드는 재능', 8]];
    if (sections['핵심 결론'] && facts.compare) {
      const sides = facts.compare.signals.map((x) => x.side);
      const allSame = sides.every((x) => x === sides[0] && x !== 'neutral');
      if (!allSame && /세 가지(?: 사실)?(?:이|가)?\s*(?:모두|같은 쪽)/.test(fieldOf(body('핵심 결론'), '차이'))) hard.push({ code: 'grounding', message: '판정 근거 세 가지가 모두 같은 쪽이 아닌데 「세 가지가 모두 같은 쪽」이라고 썼습니다. 서버의 [판정 근거 쉬운 말] 정리 문장을 따르세요.' });
    }
    for (const [ph, lim] of REPEAT_LIMIT) { const n = bodyAll.split(ph).length - 1; if (n > lim) hard.push({ code: 'repeat', message: `"${ph}"이 ${n}번 나옵니다(${lim}번 이하). 서버 용어집의 다른 표현을 돌려 쓰세요.` }); }
    // ── 4차 평가(2026-11-13) 반영: 같은 풀이 반복, 위치 서술, 예시 이유, 시기·돈의 흐름 연결 ──
    {
      const MAIN = ['핵심 결론', '공부운', '직업운', '사업운', '재물운'];
      const skipLine = (t, l) => /^근거:/.test(l.trim()) || (t === '핵심 결론' && /^차이:/.test(l.trim()));
      const rawLines = (t) => String(rawSections[t] || '').split('\n');
      const plainOnly = (t) => stripTokens(rawLines(t).filter((l) => !skipLine(t, l)).join('\n'));
      const labels = Object.values(PLAIN_GOD);
      for (const lb of labels) {
        let total = 0;
        for (const t of MAIN) {
          if (!sections[t]) continue;
          const n = plainOnly(t).split(lb).length - 1; total += n;
          if (n > 2) hard.push({ code: 'repeat', message: `${t}에서 "${lb}"이(가) ${n}번 나옵니다(2번 이하). 같은 뜻은 이 아이의 생활 속 모습으로 풀어 쓰세요.` });
        }
        if (total > 5) hard.push({ code: 'repeat', message: `시기별 운을 뺀 전체에서 "${lb}"이(가) ${total}번 나옵니다(5번 이하). 항목마다 새로운 정보를 쓰세요.` });
        if (sections[periodTitle]) { const n = stripTokens(String(rawSections[periodTitle])).split(lb).length - 1; if (n > 5) hard.push({ code: 'repeat', message: `시기별 운에서 "${lb}"이(가) ${n}번 나옵니다(5번 이하).` }); }
      }
      { // 같은 풀이 문장("전통 명리학에서 ~")은 용어마다 한 번만, 시기별 운·예시 항목에서는 쓰지 않는다
        const defs = MAIN.flatMap((t) => sentencesOf(plainOnly(t))).map((x) => x.replace(LABEL_RE, '')).filter((x) => /^전통 명리학에서/.test(x));
        for (const lb of labels) if (defs.filter((x) => x.includes(lb)).length > 1) hard.push({ code: 'repeat', message: `"${lb}"의 뜻을 풀이하는 문장이 두 번 이상 나옵니다. 용어마다 한 번만 풀이하세요.` });
        if (sections[periodTitle] && /전통 명리학에서/.test(String(rawSections[periodTitle]))) hard.push({ code: 'repeat', message: '시기별 운에서는 "전통 명리학에서" 풀이 문장을 쓰지 마세요.' });
        for (const t of ['공부운', '직업운', '사업운', '재물운']) for (const x of bulletsOf(String(rawSections[t] || ''))) if (/전통 명리학에서/.test(x)) hard.push({ code: 'repeat', message: `${t}의 예시 항목에는 풀이 문장("전통 명리학에서")을 쓰지 마세요.` });
      }
      { // 위치 설명(겉·속·깊은 곳)은 서버가 근거 줄에 붙인다. 시기별 운과 핵심 결론 "차이:"에서만 쓴다
        const LOC = /(겉으로 드러난|겉에|겉으로|속에서 받치|깊은 곳|안쪽|윗글자)/;
        for (const t of MAIN) for (const line of rawLines(t)) { if (skipLine(t, line)) continue; const mm = LOC.exec(stripTokens(line)); if (mm) { hard.push({ code: 'grounding', message: `${t}: "${mm[1]}" 같은 위치 설명은 쓰지 마세요. 어느 글자에 있는지는 서버가 근거 줄에 붙입니다(핵심 결론 "차이:"와 시기별 운에서만 씁니다).` }); break; } }
      }
      { // 돈의 흐름과 시기는 서버 문장만. 같은 결과지 안에서 서로 어긋나지 않게 AI가 시기와 연결하지 못하게 한다
        const FLOW = /(움직이는 돈의 흐름|쌓이는 돈의 흐름|돈과 거래의 운)/;
        for (const t of MAIN) for (const line of rawLines(t)) {
          if (skipLine(t, line)) continue;
          const isHead = t === '재물운' && /^(결론|한 줄):/.test(line.trim());
          for (const sn of sentencesOf(line)) {
            if (FLOW.test(sn) && /\{대운\d/.test(sn) && !isHead) hard.push({ code: 'grounding', message: `${t}: 돈의 흐름을 시기({대운N})와 함께 쓰지 마세요. 돈의 흐름이 나타나는 시기는 서버 문장 {재성대운}·{재성속운}만 말합니다.` });
          }
          if (t === '재물운' && !isHead && /\{대운\d/.test(line)) hard.push({ code: 'grounding', message: '재물운 본문에는 {대운N} 토큰을 쓰지 마세요. 시기는 {재성대운}·{재성속운} 문장이 말합니다.' });
        }
        if (sections[periodTitle]) { // 각 시기에는 그 시기의 서버 요약에 있는 힘만 쓴다
          const parts = String(rawSections[periodTitle]).split(/^\[대운(\d)\]\s*$/m);
          for (let i = 1; i < parts.length; i += 2) {
            const k = Number(parts[i]); const r = rowOf(facts, k); if (!r) continue;
            const have = godsOfRow(r).all; const blk = fieldOf(parts[i + 1], '주제') + ' ' + fieldOf(parts[i + 1], '해석');
            for (const [god, lb] of Object.entries(PLAIN_GOD)) if (blk.includes(lb) && !have.has(god)) hard.push({ code: 'grounding', message: `[대운${k}]에 "${lb}"이(가) 없는데 썼습니다. 그 시기의 서버 요약에 있는 힘만 쓰세요.` });
          }
        }
      }
      { // 예시 항목: 추천 이유·사주 풀이·용어는 쓰지 않는다(직업·사업 이유는 서버가 붙인다)
        for (const t of ['공부운', '직업운', '사업운', '재물운']) for (const x of bulletsOf(String(rawSections[t] || ''))) {
          const hitLabel = labels.find((lb) => x.includes(lb));
          if (hitLabel) hard.push({ code: 'repeat', message: `${t}의 예시 항목에 용어집 표현("${hitLabel}")을 쓰지 마세요. 예시는 일의 모습·방법·필요한 능력만 씁니다.` });
          if ((t === '직업운' || t === '사업운') && /이 아이|사주/.test(x)) hard.push({ code: 'repeat', message: `${t}의 예시 항목에 "이 아이"·"사주"를 쓰지 마세요. 추천 이유는 서버가 사주 계산값으로 항목마다 붙입니다.` });
        }
      }
    }
  }

  // 쉬운 말: 전문 용어는 '근거:' 줄에만(B안 문체를 적용한 유형만 강제)
  if (PLAIN_STYLE_TYPES.has(facts.compare && facts.compare.type)) {
    for (const t of SECTION_TITLES) {
      const lines = String(rawSections[t] || '').split('\n').filter((l) => !/^근거:/.test(l.trim()));
      const bodyText = stripTokens(lines.join('\n'));
      const found = new Set([...(bodyText.match(JARGON) || []), ...(bodyText.match(PLAIN_BAN) || [])]);
      for (const sn of sentencesOf(bodyText)) if (/\d+\s*개/.test(sn) && !/예를 들어/.test(sn)) found.add('계산 숫자(개)');
      if (/\{현재학령\}/.test(String(rawSections[t] || ''))) found.add('{현재학령}');
      if (found.size) hard.push({ code: 'jargon', message: `${t}: 본문에 전문 용어·계산 숫자·반복 표현·학년 표현(${[...found].slice(0, 4).join(', ')})이 있습니다. 쉬운 말로 풀어 쓰세요. 용어와 계산 숫자는 서버가 사주 풀이 근거에 붙입니다.` });
    }
  }

  // 근거 위반(문장 단위, 토큰이 있는 원문 기준)
  const bad = [];
  for (const t of SECTION_TITLES) for (const s of sentencesOf(String(rawSections[t] || '').replace(/^\[대운\d\]\s*$/gm, ''))) {
    const sv = sentenceViolations(s.replace(LABEL_RE, ''), allowed, facts, t);
    if (sv.length) bad.push({ title: t, sentence: s, reasons: sv });
  }
  for (const b of bad) for (const r of b.reasons) hard.push({ code: 'grounding', message: `${b.title}: ${r}`, sentence: b.sentence });

  // 문체·면책·보험 표현(기준을 넉넉하게)
  const allSentences = SECTION_TITLES.flatMap((t) => sentencesOf(body(t))).map((s) => s.replace(LABEL_RE, ''));
  const hae = allSentences.filter((s) => HAE_STYLE.test(s) || /당신/.test(s)).length;
  if (hae >= 3) hard.push({ code: 'tone', message: `해요체·"당신" 문장이 ${hae}개입니다. 모든 문장을 다·나·까로 쓰세요.` });
  else if (hae) soft.push(`해요체·"당신" 문장 ${hae}개`);
  const disclaimers = allSentences.filter((s) => DISCLAIMER.test(s)).length;
  if (disclaimers >= 2) hard.push({ code: 'disclaimer', message: `면책·한계 문장이 ${disclaimers}번 나옵니다. 본문에는 쓰지 마세요.` });
  else if (disclaimers) soft.push('면책·한계 문장 1개');
  const hedges = (expanded.match(HEDGE) || []).length + allSentences.filter((x) => /아이/.test(x) && /수 있습니다/.test(x) && !/볼 수 있습니다/.test(x)).length;
  if (hedges >= 3) hard.push({ code: 'hedge', message: `보험성 표현("~해석됩니다", "~볼 수 있습니다", "~일 수 있습니다" 등)이 ${hedges}번 나옵니다. 근거가 있는 해석은 단호하게 쓰세요.` });
  else if (hedges) soft.push(`보험성 표현 ${hedges}개`);

  // 분량·반복
  let total = 0;
  for (const t of SECTION_TITLES) {
    const n = valueChars(body(t)); total += n;
    if (['공부운', '직업운', '사업운', '재물운'].includes(t) && n > MAX_LEN.section) hard.push({ code: 'length', message: `${t}가 ${n}자입니다. ${MAX_LEN.section}자 안으로 줄이세요.` });
  }
  if (total > MAX_LEN.totalHard) hard.push({ code: 'length', message: `전체가 ${total}자입니다. 약 7,500자 안으로 줄이세요. 같은 말을 반복하지 마세요.` });
  else if (total > MAX_LEN.totalSoft) soft.push(`분량 ${total}자`);
  const basisPhrases = SECTION_TITLES.flatMap((t) => body(t).split('\n').filter((l) => !/^근거:/.test(l))).join('\n').match(/천간·지지 본기 기준|지장간 포함 기준/g) || [];
  if (basisPhrases.length > 4) hard.push({ code: 'length', message: `"천간·지지 본기 기준/지장간 포함 기준"이 본문에 ${basisPhrases.length}번 나옵니다. 본문에서는 "겉으로 드러난 글자", "지장간까지 보면"으로 쓰고 기준 표기는 근거 줄에만 쓰세요.` });
  else if (basisPhrases.length > 2) soft.push(`기준 표기 반복 ${basisPhrases.length}회`);
  { // 문장 호흡: 휴대전화로 읽기 좋게 한 문장은 짧게. 긴 문장(토큰 제외 70자 초과)이 여러 개면 참고로만 알린다(통과를 막지 않는다)
    const longN = SECTION_TITLES.flatMap((t) => sentencesOf(String(rawSections[t] || '').replace(/^\[대운\d\]\s*$/gm, ''))).map((x) => stripTokens(x.replace(LABEL_RE, '').replace(/^- /, '')).replace(/\s/g, '').length).filter((n) => n > 70).length;
    if (longN >= 4) soft.push(`긴 문장 ${longN}개(70자 초과)`);
  }
  return { hard, soft, bad, sections, expanded, total };
}

// 직업·사업 예시 항목에 "이 아이에게 맞는 이유"를 서버가 붙인다(항목마다 다른 일의 모습 + 이 사주에 실제 있는 힘). AI 문장은 바꾸지 않고 첫 문장 뒤에 한 문장만 끼운다.
function injectReasons(text, facts) {
  let sec = ''; let idx = 0;
  return String(text).split('\n').map((line) => {
    const h = /^===(.+)===\s*$/.exec(line.trim()); if (h) { sec = h[1].trim(); idx = 0; return line; }
    if (sec !== '직업운' && sec !== '사업운') return line;
    const m = /^(\s*[-•]\s+)([^:]{1,40}):\s*(.+)$/.exec(line); if (!m) return line;
    const reason = reasonFor(facts, m[2].trim(), sec === '사업운' ? 'biz' : 'job', idx++);
    if (!reason) return line;
    const ss = sentencesOf(m[3]);
    return `${m[1]}${m[2]}: ${[ss[0], reason, ...ss.slice(1)].join(' ')}`;
  }).join('\n');
}
// 검사를 통과한 AI 원문 → 고객에게 가는 최종 문장(추천 이유 삽입 + 토큰을 계산값으로)
const finalizeSuccessChild = (text, facts) => expandTokens(injectReasons(text, facts), facts).text;

// callModel(prompt) → { text, truncated }. 최대 MAX_ATTEMPTS 번 호출한다.
// 검사를 통과한 글만 보낸다. 통과하지 못하면 문장을 지워 고치지 않고 실패(ok:false)로 돌려준다 — 호출한 쪽은 고객에게 결과를 보내지 않는다.
// callRepair(prompt) → { text } 를 주면, 검사에 걸린 문장만 같은 뜻으로 고쳐 쓰는 작은 호출(최대 2회)을 먼저 한 뒤 전체를 다시 검사한다. 주지 않으면 예전처럼 전체 재생성만 한다.
async function generateSuccessChild({ facts, callModel, callRepair = null, maxAttempts = MAX_ATTEMPTS, log = () => {} }) {
  let feedback = [];
  let lastReasons = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { text, truncated } = await callModel(buildSuccessChildPrompt(facts.text, feedback));
    const lint = lintSuccessChild(text, facts, { truncated: !!truncated });
    log(`[성공사주] 시도 ${attempt} 검사 hard=${lint.hard.length} soft=${lint.soft.length} 분량=${lint.total}`);
    if (lint.hard.length === 0 && !/[{}]/.test(lint.expanded)) {
      const finalText = finalizeSuccessChild(text, facts);
      if (!/[{}]/.test(finalText)) return { ok: true, text: finalText, attempts: attempt, soft: lint.soft };
    }
    if (callRepair && !truncated && lint.hard.length > 0 && !lint.hard.some((h) => h.code === 'structure')) {
      const rp = await repairSentences({ text, facts, lint: lintSuccessChild, callRepair });
      const lint2 = lintSuccessChild(rp.text, facts);
      log(`[성공사주] 시도 ${attempt} 문장 고쳐쓰기 ${rp.repairs.length}곳(거절 ${rp.rejected.length}) → 검사 hard=${lint2.hard.length}`);
      if (rp.repairs.length && lint2.hard.length === 0 && !/[{}]/.test(lint2.expanded)) {
        const finalText = finalizeSuccessChild(rp.text, facts);
        if (!/[{}]/.test(finalText)) return { ok: true, text: finalText, attempts: attempt, soft: lint2.soft, repairs: rp.repairs };
      }
    }
    lastReasons = [...new Set(lint.hard.map((h) => h.message))];
    feedback = lastReasons.slice(0, 10);
  }
  return { ok: false, attempts: maxAttempts, reasons: lastReasons.slice(0, 10) };
}

module.exports = { PLAIN_STYLE_TYPES, SECTION_TITLES, PERIOD_COUNT, SUCCESS_CHILD_MAX_TOKENS, MAX_ATTEMPTS, MAX_LEN, buildSuccessChildPrompt, lintSuccessChild, injectReasons, finalizeSuccessChild, generateSuccessChild, parseSections, fieldOf, bulletsOf, BULLET_RE, LABEL_RE };
