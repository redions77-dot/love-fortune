// 요청 제한에 쓰는 클라이언트 IP 결정.
// X-Forwarded-For 는 클라이언트가 마음대로 채워 보낼 수 있고, 프록시는 자기가 본 주소를 "오른쪽 끝에 덧붙일" 뿐이다.
// 따라서 맨 앞 값(위조 가능)이 아니라, 신뢰하는 프록시 수(hops)만큼 오른쪽에서 센 값을 쓴다. (Express 'trust proxy: n'과 같은 규칙)
//   TRUST_PROXY_HOPS=0  헤더를 무시하고 연결 상대(소켓) 주소를 쓴다.
//   TRUST_PROXY_HOPS=1  (기본) 앱 바로 앞 프록시 1개가 XFF 끝에 클라이언트 주소를 붙인다.
//   TRUST_PROXY_HOPS=2  앞에 프록시가 2단(예: CDN → 로드밸런서)이면 오른쪽에서 2번째 값이 클라이언트 주소다.
// 실제 배포 환경의 프록시 단수는 backend/dev/diagnose-proxy.mjs 로 테스트 서버에서 관측해 근거 있게 설정한다.
const net = require('net');
const crypto = require('crypto');

// ── 관리자 프록시 증표 ──
// Vercel 을 거치는 /api/admin/* 는 Vercel 이 X-Forwarded-For 를 항상 덮어쓰지 않아(관측: 클라이언트가 보낸 값이 남는 경우가 있음)
// 위치 기반으로도 클라이언트 IP 를 신뢰할 수 없다. 대신 Vercel 라우트 transform 이 요청마다 "설정(덮어쓰기)"하는 비밀 헤더로
// "우리 Vercel 프로젝트를 거친 요청"임만 증명하고, 이 경우 IP 기반 제한은 쓰지 않는다(전역 제한만 적용).
const ADMIN_EDGE_HEADER = 'x-mysaju-edge-key';
const EDGE_KEY_MIN_LENGTH = 32;
function isEdgeVerified(supplied, expected) {
  const key = String(expected || '');
  if (key.length < EDGE_KEY_MIN_LENGTH || typeof supplied !== 'string' || !supplied) return false;
  const a = crypto.createHash('sha256').update(supplied).digest();
  const b = crypto.createHash('sha256').update(key).digest();
  return crypto.timingSafeEqual(a, b);
}

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

// 사설·루프백·링크로컬·CGNAT 주소인가. 선택된 값이 이런 주소면 프록시 내부 주소가 골라진 것일 수 있다(단수가 너무 작음).
const nonPublic = new net.BlockList();
for (const [a, p] of [['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16], ['127.0.0.0', 8], ['169.254.0.0', 16], ['100.64.0.0', 10], ['0.0.0.0', 8]]) nonPublic.addSubnet(a, p, 'ipv4');
for (const [a, p] of [['fc00::', 7], ['fe80::', 10]]) nonPublic.addSubnet(a, p, 'ipv6');
nonPublic.addAddress('::1', 'ipv6');
const isPublicIp = (ip) => { const v = net.isIP(ip); return v !== 0 && !nonPublic.check(ip, v === 6 ? 'ipv6' : 'ipv4'); };

// 진단용: 서버가 실제로 받은 연결 상대·XFF 목록과 선택된 주소. (호출자 자신의 요청 정보만 돌려준다)
function describeClientIp({ peer, xff, hops }) {
  const list = String(xff || '').split(',').map(normalize).filter(Boolean);
  const selected = pickClientIp({ peer, xff, hops });
  return { peer: normalize(peer) || 'unknown', xff: list, hops, selected, selectedIsPublic: isPublicIp(selected) };
}

module.exports = { pickClientIp, parseHops, describeClientIp, isPublicIp, isEdgeVerified, ADMIN_EDGE_HEADER, DEFAULT_HOPS };
