// 심화 결제창에 이메일을 미리 채울지 정한다.
// 같은 사람·같은 입력(sig)으로 이어지는 심화 결제에만, 방금 쓴 이메일을 미리 채운다. 그 외에는 항상 빈 값.
export function prefillSignature(input) {
  return JSON.stringify(input)
}

export function emailPrefillFor(productName, prefill, sig) {
  if (productName !== '심화 분석') return ''
  if (!prefill || typeof prefill.email !== 'string' || prefill.sig !== sig) return ''
  return prefill.email
}
