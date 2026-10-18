// 테스트 서버 전용 프록시 진단. PROXY_DIAG_TOKEN(16자 이상)이 설정된 서버에서, 토큰을 아는 호출자에게
// "그 호출자 자신의 요청"이 서버에 어떻게 도착했는지(연결 상대·X-Forwarded-For 목록·선택된 주소)만 돌려준다.
// 토큰이 없거나 틀리면 존재하지 않는 경로처럼 404 를 돌려주며, 운영에는 이 환경변수를 설정하지 않는다. IP는 로그에 남기지 않는다.
const crypto = require('crypto');
const { describeClientIp } = require('./clientIp');

const sha = (v) => crypto.createHash('sha256').update(String(v)).digest();

function installProxyDiag({ app, env = process.env, hops }) {
  const token = String(env.PROXY_DIAG_TOKEN || '');
  const enabled = token.length >= 16;
  // 공개 API 경로(/api/diag/proxy)와, Vercel rewrite 를 거치는 관리자 경로(/api/admin/diag-proxy)를 둘 다 연다.
  app.get(['/api/diag/proxy', '/api/admin/diag-proxy'], (req, res) => {
    const supplied = req.get('x-diag-token') || '';
    if (!enabled || !crypto.timingSafeEqual(sha(supplied), sha(token))) return res.status(404).json({ error: 'not found' });
    res.setHeader('Cache-Control', 'no-store');
    res.json(describeClientIp({ peer: req.socket?.remoteAddress, xff: req.get('x-forwarded-for'), hops }));
  });
  return { enabled };
}

module.exports = { installProxyDiag };
