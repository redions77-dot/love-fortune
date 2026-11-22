import { PRODUCTION_HOSTS } from './hosts.js'

// 결제 가맹점 코드(IMP) 결정. 미리보기가 운영 가맹점 코드로 결제창을 열지 않게 한다.
//  - VITE_IMP_CODE 설정됨: 그 값 사용. 단 운영 도메인이 아니면서 운영 코드를 쓰려면, 유효한 '테스트 채널 키'(VITE_IMP_CHANNEL_KEY)가 함께 있어야 한다.
//    (포트원 V1 은 한 계정에 식별코드가 하나라, 같은 계정의 KG이니시스 테스트 채널로 결제하려면 같은 식별코드 + 테스트 채널 키로 호출한다.)
//  - 미설정 + 운영 도메인: 기존 운영 코드 (기존 동작 유지)
//  - 미설정 + 그 외(미리보기·로컬): 오류 → 결제창을 열지 않는다. 운영 코드로 대체하지 않는다.
const PRODUCTION_IMP_CODE = 'imp87662575'

// 운영(실연동) 채널 키로 알려진 값. 테스트 채널 키 자리에 이 값이 들어오면 테스트 실행을 차단한다.
// (현재 운영 결제는 channelKey 없이 pg 값으로 호출하므로 알려진 값이 없다. 콘솔 [채널 관리]의 실연동 채널 키를 확인하면 여기에 추가한다.)
export const PRODUCTION_CHANNEL_KEYS = []

const clean = (s) => (typeof s === 'string' ? s.trim() : '')
export const parseKeyList = (raw) => clean(raw).split(',').map(clean).filter(Boolean)

export function resolveImpCode({ hostname, envCode, channelKey }) {
  const raw = clean(envCode)
  const isProdHost = PRODUCTION_HOSTS.includes(hostname)
  if (raw) {
    if (!isProdHost && raw === PRODUCTION_IMP_CODE && !channelKey) {
      return { code: null, error: '미리보기·테스트 환경에서 운영 가맹점 코드를 쓰려면 테스트 채널 키(VITE_IMP_CHANNEL_KEY)가 함께 필요합니다. 테스트 채널 없이는 결제창을 열지 않습니다.' }
    }
    return { code: raw, error: null }
  }
  if (isProdHost) return { code: PRODUCTION_IMP_CODE, error: null }
  return { code: null, error: '테스트 결제 설정(VITE_IMP_CODE)이 없어 결제를 진행할 수 없습니다.' }
}

// 테스트 채널 키(VITE_IMP_CHANNEL_KEY) 결정.
//  - 운영 도메인: 값이 있어도 무시한다(운영 결제는 종전 pg 방식 그대로).
//  - 그 밖: 형식 검사, 운영(실연동) 채널 키 목록에 있으면 차단.
export function resolveChannelKey({ hostname, envChannelKey, blockedKeys = [] }) {
  if (PRODUCTION_HOSTS.includes(hostname)) return { channelKey: null, error: null }
  const key = clean(envChannelKey)
  if (!key) return { channelKey: null, error: null }
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) return { channelKey: null, error: '테스트 채널 키 형식이 올바르지 않습니다.' }
  if (blockedKeys.map(clean).filter(Boolean).includes(key)) return { channelKey: null, error: '운영(실연동) 채널 키로 확인되어 테스트 결제를 차단했습니다. 콘솔에서 테스트 채널의 키를 사용해주세요.' }
  return { channelKey: key, error: null }
}

export function resolvePaymentConfig({ hostname, envCode, envChannelKey, envBlockedKeys }) {
  const chan = resolveChannelKey({ hostname, envChannelKey, blockedKeys: [...PRODUCTION_CHANNEL_KEYS, ...parseKeyList(envBlockedKeys)] })
  if (chan.error) return { code: null, error: chan.error, channelKey: null }
  const imp = resolveImpCode({ hostname, envCode, channelKey: chan.channelKey })
  return { ...imp, channelKey: imp.code ? chan.channelKey : null }
}

export const PAYMENT_CONFIG = resolvePaymentConfig({
  hostname: typeof window === 'undefined' ? '' : window.location.hostname,
  envCode: import.meta.env?.VITE_IMP_CODE,
  envChannelKey: import.meta.env?.VITE_IMP_CHANNEL_KEY,
  envBlockedKeys: import.meta.env?.VITE_IMP_BLOCKED_CHANNEL_KEYS,
})

// 분석 도구(GA·Meta Pixel)는 운영 도메인에서만 동작한다. index.html 의 도메인 목록과 같아야 한다.
export function isAnalyticsHost(hostname) {
  return PRODUCTION_HOSTS.includes(hostname)
}
