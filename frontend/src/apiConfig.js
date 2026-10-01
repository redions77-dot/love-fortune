// 백엔드 API 주소 결정. 미리보기·테스트 배포가 설정 누락 상태로 운영 서버에 붙지 않게 한다.
//  - 로컬(localhost): VITE_API_URL 이 없으면 '' → 같은 출처 요청, Vite 프록시가 localhost:4000 으로 전달
//  - VITE_API_URL 설정됨: 그 주소 사용 (https 원본 주소만 허용)
//  - 미설정 + 운영 도메인: 기존 운영 백엔드 (기존 동작 유지)
//  - 미설정 + 그 외 도메인(미리보기 등): 오류 → 앱을 띄우지 않고 설정 누락 안내 화면 표시
const PRODUCTION_API = 'https://love-fortune.onrender.com'
import { PRODUCTION_HOSTS, LOCAL_HOSTS } from './hosts.js'

export function resolveApiUrl({ hostname, envUrl }) {
  const raw = (envUrl || '').trim()
  if (raw) {
    let u
    try { u = new URL(raw) } catch { return { url: null, error: 'VITE_API_URL 값이 올바른 URL이 아닙니다.' } }
    const isLocal = LOCAL_HOSTS.includes(hostname)
    if (u.protocol !== 'https:' && !(isLocal && u.protocol === 'http:')) {
      return { url: null, error: 'VITE_API_URL 은 https 주소여야 합니다.' }
    }
    if (u.pathname !== '/' || u.search || u.hash) {
      return { url: null, error: 'VITE_API_URL 에는 경로 없이 주소(예: https://example.onrender.com)만 넣어야 합니다.' }
    }
    if (u.origin === PRODUCTION_API && !PRODUCTION_HOSTS.includes(hostname) && !isLocal) {
      return { url: null, error: '미리보기 배포의 VITE_API_URL 이 운영 백엔드를 가리킵니다. 테스트 백엔드 주소로 바꿔주세요.' }
    }
    return { url: u.origin, error: null }
  }
  if (LOCAL_HOSTS.includes(hostname)) return { url: '', error: null }
  if (PRODUCTION_HOSTS.includes(hostname)) return { url: PRODUCTION_API, error: null }
  return { url: null, error: 'VITE_API_URL 환경변수가 설정되지 않았습니다. 이 배포 환경의 백엔드 주소를 설정한 뒤 다시 배포해주세요.' }
}

export const API_CONFIG = resolveApiUrl({
  hostname: typeof window === 'undefined' ? '' : window.location.hostname,
  envUrl: import.meta.env?.VITE_API_URL,
})
// 오류일 때는 앱이 마운트되지 않으므로 이 값으로 요청이 나가지 않는다.
export const API_URL = API_CONFIG.url ?? ''
