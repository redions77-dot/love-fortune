import { routes, type VercelConfig } from '@vercel/config/v1'

// 운영자 API(/api/admin/*)는 쿠키 인증 때문에 같은 도메인으로 요청하고, 여기서 백엔드로 넘긴다.
// 목적지는 빌드 시점의 환경변수 ADMIN_API_TARGET(VITE_ 접두사 아님)에서만 읽는다. vercel.json과 달리
// 환경변수가 rewrite에 자동 치환되지 않으므로 이 파일이 빌드 때 계산해 vercel.json으로 컴파일된다.
//  - 설정됨: 그 주소(https 원본 주소만 허용)로 연결한다.
//  - 미설정 + 운영 배포(VERCEL_ENV=production): 기존 운영 백엔드로 연결한다 (기존 동작 유지).
//  - 미설정 + 그 외(미리보기·로컬): rewrite를 만들지 않는다. 운영 백엔드로 새어 나가지 않고 /api/admin/*는 연결 실패한다.
const PRODUCTION_BACKEND = 'https://love-fortune.onrender.com'

function resolveTarget(): string | null {
  const raw = (process.env.ADMIN_API_TARGET || '').trim()
  if (raw) {
    let url: URL
    try { url = new URL(raw) } catch { throw new Error('ADMIN_API_TARGET 값이 올바른 URL이 아닙니다.') }
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('ADMIN_API_TARGET 은 경로 없는 https 주소(예: https://example.onrender.com)여야 합니다.')
    }
    return url.origin
  }
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_BACKEND
  console.warn('[vercel.ts] ADMIN_API_TARGET 미설정: /api/admin/* rewrite를 만들지 않습니다.')
  return null
}

const target = resolveTarget()

export const config: VercelConfig = {
  rewrites: target ? [routes.rewrite('/api/admin/:path*', `${target}/api/admin/:path*`)] : [],
}
