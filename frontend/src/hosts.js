// 운영 도메인 목록의 단일 출처. apiConfig.js·paymentConfig.js 와 (vite.config.js 플러그인을 통해) index.html 이 함께 쓴다.
export const PRODUCTION_HOSTS = ['love-fortune-nu.vercel.app', 'mysaju.shop', 'www.mysaju.shop']
export const LOCAL_HOSTS = ['localhost', '127.0.0.1']
// 공유 문구에 넣는 서비스 주소 (주문번호·토큰·결과 주소는 절대 넣지 않는다)
export const SHARE_URL = 'https://www.mysaju.shop'
