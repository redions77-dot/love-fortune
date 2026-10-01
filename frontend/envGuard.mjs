// 빌드 시점 환경변수 검사. vite.config.js 와 vercel.ts 가 함께 쓴다.
// 미리보기 빌드(VERCEL_ENV=preview)에서 운영 백엔드를 가리키거나 설정이 어긋나면 빌드를 실패시킨다.
export const PRODUCTION_BACKEND = 'https://love-fortune.onrender.com'

// 경로 없는 https 주소만 허용하고 origin 을 돌려준다. 잘못되면 Error.
export function parseBackendOrigin(name, raw) {
  let u
  try { u = new URL(raw) } catch { throw new Error(`${name} 값이 올바른 URL이 아닙니다.`) }
  if (u.protocol !== 'https:' || u.pathname !== '/' || u.search || u.hash) {
    throw new Error(`${name} 은 경로 없는 https 주소(예: https://example.onrender.com)여야 합니다.`)
  }
  return u.origin
}

export function isPreviewBuild(env) {
  return env.VERCEL_ENV === 'preview'
}

// 미리보기 빌드: VITE_API_URL·ADMIN_API_TARGET 둘 다 필수, 운영 주소 금지, 서로 같은 백엔드여야 한다.
// 그 외 빌드는 아무것도 검사하지 않는다(기존 동작 유지).
export function assertPreviewEnv(env) {
  if (!isPreviewBuild(env)) return
  const apiRaw = (env.VITE_API_URL || '').trim()
  const adminRaw = (env.ADMIN_API_TARGET || '').trim()
  if (!apiRaw) throw new Error('미리보기 빌드에는 VITE_API_URL 이 필요합니다.')
  if (!adminRaw) throw new Error('미리보기 빌드에는 ADMIN_API_TARGET 이 필요합니다.')
  const api = parseBackendOrigin('VITE_API_URL', apiRaw)
  const admin = parseBackendOrigin('ADMIN_API_TARGET', adminRaw)
  if (api === PRODUCTION_BACKEND) throw new Error('미리보기 빌드의 VITE_API_URL 이 운영 백엔드를 가리킵니다.')
  if (admin === PRODUCTION_BACKEND) throw new Error('미리보기 빌드의 ADMIN_API_TARGET 이 운영 백엔드를 가리킵니다.')
  if (api !== admin) throw new Error('VITE_API_URL 과 ADMIN_API_TARGET 이 서로 다른 백엔드를 가리킵니다. 같은 테스트 백엔드여야 합니다.')
}
