import { PRODUCTION_HOSTS } from './hosts.js'

// 결제 가맹점 코드(IMP) 결정. 미리보기가 운영 가맹점 코드로 결제창을 열지 않게 한다.
//  - VITE_IMP_CODE 설정됨: 그 값 사용. 단 운영 도메인이 아니면 운영 코드와 같을 수 없다.
//  - 미설정 + 운영 도메인: 기존 운영 코드 (기존 동작 유지)
//  - 미설정 + 그 외(미리보기·로컬): 오류 → 결제창을 열지 않는다. 운영 코드로 대체하지 않는다.
const PRODUCTION_IMP_CODE = 'imp87662575'

export function resolveImpCode({ hostname, envCode }) {
  const raw = (envCode || '').trim()
  const isProdHost = PRODUCTION_HOSTS.includes(hostname)
  if (raw) {
    if (!isProdHost && raw === PRODUCTION_IMP_CODE) {
      return { code: null, error: '미리보기·테스트 환경의 VITE_IMP_CODE 가 운영 가맹점 코드입니다. 테스트 결제 코드로 바꿔주세요.' }
    }
    return { code: raw, error: null }
  }
  if (isProdHost) return { code: PRODUCTION_IMP_CODE, error: null }
  return { code: null, error: '테스트 결제 설정(VITE_IMP_CODE)이 없어 결제를 진행할 수 없습니다.' }
}

export const PAYMENT_CONFIG = resolveImpCode({
  hostname: typeof window === 'undefined' ? '' : window.location.hostname,
  envCode: import.meta.env?.VITE_IMP_CODE,
})

// 분석 도구(GA·Meta Pixel)는 운영 도메인에서만 동작한다. index.html 의 도메인 목록과 같아야 한다.
export function isAnalyticsHost(hostname) {
  return PRODUCTION_HOSTS.includes(hostname)
}
