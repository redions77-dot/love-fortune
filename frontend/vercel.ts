import { routes, type VercelConfig } from '@vercel/config/v1'
// @ts-ignore 순수 JS 모듈
import { assertPreviewEnv, parseBackendOrigin } from './envGuard.mjs'

// 운영자 API(/api/admin/*)는 쿠키 인증 때문에 같은 도메인으로 요청하고, 여기서 백엔드로 넘긴다.
// 목적지는 빌드 시점의 환경변수 ADMIN_API_TARGET(VITE_ 접두사 아님)에서만 읽는다. vercel.json과 달리
// 환경변수가 rewrite에 자동 치환되지 않으므로 이 파일이 빌드 때 계산해 vercel.json으로 컴파일된다.
//  - 설정됨: 그 주소(https 원본 주소만 허용)로 연결한다.
//  - 미설정 + 운영 배포(VERCEL_ENV=production): 기존 운영 백엔드로 연결한다 (기존 동작 유지).
//  - 미리보기 빌드(VERCEL_ENV=preview): envGuard.mjs 가 VITE_API_URL·ADMIN_API_TARGET 필수, 운영 주소 금지, 서로 동일 여부를 검사한다.
//  - 미설정 + 그 외(로컬): rewrite를 만들지 않는다. 운영 백엔드로 새어 나가지 않고 /api/admin/*는 연결 실패한다.
const PRODUCTION_BACKEND = 'https://love-fortune.onrender.com'

function resolveTarget(): string | null {
  // 미리보기 빌드: 운영 주소·누락·VITE_API_URL 불일치면 여기서 빌드가 실패한다.
  assertPreviewEnv(process.env)
  const raw = (process.env.ADMIN_API_TARGET || '').trim()
  if (raw) return parseBackendOrigin('ADMIN_API_TARGET', raw)
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_BACKEND
  console.warn('[vercel.ts] ADMIN_API_TARGET 미설정: /api/admin/* rewrite를 만들지 않습니다.')
  return null
}

const target = resolveTarget()

export const config: VercelConfig = {
  // 실행 권한이 빠진 node_modules/.bin 링크(이전 빌드 캐시에 남은 파일 등)에 걸리지 않도록, 설치는 깨끗하게 하고 vite 는 node 로 직접 실행한다.
  // ("./node_modules/.bin/vite: Permission denied" 로 Production 빌드가 실패하던 문제 대응. 기존 루트 vercel.json 의 buildCommand 와 같은 방식)
  installCommand: 'rm -rf node_modules && npm install',
  buildCommand: 'node node_modules/vite/bin/vite.js build',
  rewrites: [
    // 관리자 전용 주소(즐겨찾기용)도 앱이 열리게 한다. 경로 자체는 비밀이 아니며 권한은 서버 세션에서만 나온다.
    routes.rewrite('/admin-bomgyeol-2027', '/index.html'),
    ...(target ? [routes.rewrite('/api/admin/:path*', `${target}/api/admin/:path*`)] : []),
  ],
}
