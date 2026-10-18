// 요청 제한에 쓰는 클라이언트 IP 결정.
// X-Forwarded-For 는 클라이언트가 마음대로 채워 보낼 수 있고, 프록시는 자기가 본 주소를 "오른쪽 끝에 덧붙일" 뿐이다.
// 따라서 맨 앞 값(위조 가능)이 아니라, 신뢰하는 프록시 수(hops)만큼 오른쪽에서 센 값을 쓴다. (Express 'trust proxy: n'과 같은 규칙)
//   TRUST_PROXY_HOPS=0  헤더를 무시하고 연결 상대(소켓) 주소를 쓴다.
//   TRUST_PROXY_HOPS=1  (기본) 앱 바로 앞 프록시 1개가 XFF 끝에 클라이언트 주소를 붙인다.
//   TRUST_PROXY_HOPS=2  앞에 프록시가 2단(예: CDN → 로드밸런서)이면 오른쪽에서 2번째 값이 클라이언트 주소다.
// 실제 배포 환경의 프록시 단수는 backend/dev/check-proxy-hops.mjs 로 테스트 서버에서 확인한 값으로 설정한다.
const net = require('net');

const DEFAULT_HOPS = 1;
const MAX_HOPS = 5;

function parseHops(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return DEFAULT_HOPS;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= MAX_HOPS ? n : DEFAULT_HOPS;
}

const normalize = (s) => String(s || '').trim().replace(/^::ffff:/i, '');

// peer: 소켓의 상대 주소, xff: X-Forwarded-For 원문. 형식이 IP가 아니면 소켓 주소로 되돌린다(임의 문자열이 키가 되지 않게).
function pickClientIp({ peer, xff, hops }) {
  const fallback = normalize(peer) || 'unknown';
  if (hops < 1 || !xff) return fallback;
  const list = String(xff).split(',').map(normalize).filter(Boolean);
  if (!list.length) return fallback;
  // 헤더가 기대보다 짧으면 Express처럼 가장 왼쪽 값을 쓴다.
  const picked = list[Math.max(0, list.length - hops)];
  return net.isIP(picked) ? picked : fallback;
}

module.exports = { pickClientIp, parseHops, DEFAULT_HOPS };
