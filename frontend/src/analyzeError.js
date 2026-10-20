// /api/analyze 가 실패 응답(HTTP 오류)을 줄 때 화면에 보일 안내 문구.
// 429(요청 제한)는 서버 고장이 아니므로 서버가 준 안내를 그대로 쓰고, 없으면 기본 문구를 쓴다.
export function analyzeHttpErrorMessage(status, serverMessage) {
  if (status === 429) return String(serverMessage || '').trim() || '요청이 너무 많아요. 잠시 후 다시 시도해주세요.'
  return `서버 오류가 발생했습니다 (${status})`
}
