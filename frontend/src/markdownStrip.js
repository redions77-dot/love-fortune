// AI가 프롬프트의 "마크다운 금지" 지시를 어기고 내보내는 강조 기호(**)와 구분선(---)을 화면에 보이기 전에 걷어낸다.
// 문장 내용은 바꾸지 않고 기호만 지운다. 심화 분석 결과 한 곳(deepText)에서 정리하면 본문·표·요약·PDF가 모두 같은 글을 쓴다.
const RULE_LINE = /^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/
export function stripStrayMarkdown(text) {
  if (!text) return text || ''
  return String(text)
    .split('\n')
    .filter((line) => !RULE_LINE.test(line))      // '---', '***', '___' 만 있는 줄
    .join('\n')
    .replace(/\*{2,}/g, '')                        // ** (굵게) 기호
    .replace(/\n{3,}/g, '\n\n')
}
