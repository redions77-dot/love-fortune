// 기본 허용 출처 + 환경변수 EXTRA_ALLOWED_ORIGINS(쉼표 구분)로 지정한 테스트 프런트 주소만 추가 허용한다.
// 와일드카드·경로·http(로컬 제외)는 허용하지 않고, 잘못된 값이 있으면 서버 시작 시 바로 오류를 낸다.
function parseExtraOrigins(raw) {
  const out = [];
  for (const item of String(raw || '').split(',').map(s => s.trim()).filter(Boolean)) {
    if (item.includes('*')) throw new Error(`EXTRA_ALLOWED_ORIGINS: 와일드카드는 허용하지 않습니다 (${item})`);
    let u;
    try { u = new URL(item); } catch { throw new Error(`EXTRA_ALLOWED_ORIGINS: URL 형식이 아닙니다 (${item})`); }
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) {
      throw new Error(`EXTRA_ALLOWED_ORIGINS: https 주소만 허용합니다 (${item})`);
    }
    if (u.pathname !== '/' || u.search || u.hash || u.username || u.password || item.endsWith('/')) {
      throw new Error(`EXTRA_ALLOWED_ORIGINS: 경로 없는 출처(예: https://name.vercel.app)만 허용합니다 (${item})`);
    }
    // 공용 도메인 전체(vercel.app 등)를 여는 값 방지
    if (/^(vercel\.app|onrender\.com|netlify\.app|github\.io)$/.test(u.hostname)) {
      throw new Error(`EXTRA_ALLOWED_ORIGINS: 공용 도메인 전체는 허용하지 않습니다 (${item})`);
    }
    out.push(u.origin);
  }
  return out;
}

function buildAllowedOrigins(baseOrigins, extraRaw) {
  return [...new Set([...baseOrigins, ...parseExtraOrigins(extraRaw)])];
}

module.exports = { parseExtraOrigins, buildAllowedOrigins };
