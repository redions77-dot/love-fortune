// '우리 아이 성공운명서' 공통 샘플(가상 학생 A)의 AI 출력 형식 문장. 테스트 기준과 화면 미리보기에 같이 쓴다. 실제 고객 정보가 아니다.
// 입력: 가상 학생 A (남, 2011-01-11 02:10 양력, 기준일 2026-11-12). 유료 결과지 전체 원문은 successChildCases.js 의 사례 A와 같다.
// SAMPLE_RAW_TEXT 는 AI가 쓰는 형식(연도·나이·대운 십성은 토큰), SAMPLE_REPORT_TEXT 는 서버가 직업·사업 추천 이유를 붙이고 토큰을 계산값으로 바꾼 최종 문장이다.
// 무료로 보여 주는 화면은 이 전체 결과지의 일부이다(successChildReport.js 의 toFreePreview).
const { buildSuccessChildFacts } = require('./successChild');
const { finalizeSuccessChild } = require('./successChildPrompt');
const { CASES } = require('./successChildCases');

const SAMPLE_INPUT = Object.freeze({ ...CASES.A.input, now: '2026-11-12T12:00:00+09:00' });
const SAMPLE_RAW_TEXT = CASES.A.raw;

const SAMPLE_FACTS = buildSuccessChildFacts({ ...SAMPLE_INPUT, now: new Date(SAMPLE_INPUT.now) });
const SAMPLE_REPORT_TEXT = finalizeSuccessChild(SAMPLE_RAW_TEXT, SAMPLE_FACTS);

module.exports = { SAMPLE_INPUT, SAMPLE_RAW_TEXT, SAMPLE_REPORT_TEXT };
