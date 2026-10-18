// 모바일 결제 후 복귀 주소에 실린 출생 시각(24시간제 HH:MM)을 입력 화면 상태(오전/오후·시·분)로 되돌린다.
// 오전 12시는 자정(0시), 오후 12시는 정오(12시)로 App.jsx 의 변환식과 정확히 반대로 계산한다.
export function splitBirthtime(bt) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(bt || '').trim())
  if (!m) return { hour: '', min: '', ampm: '오전', unknown: true }
  const h = Number(m[1]), min = Number(m[2])
  if (h > 23 || min > 59) return { hour: '', min: '', ampm: '오전', unknown: true }
  return { hour: String(h % 12 === 0 ? 12 : h % 12), min: String(min).padStart(2, '0'), ampm: h >= 12 ? '오후' : '오전', unknown: false }
}
