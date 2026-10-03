const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const S = require('./secure');

test('운영자 세션 길이: 기본 8시간, "이 기기 기억"을 명시적으로 true 로 보낸 경우에만 1년', () => {
  assert.strictEqual(S.ADMIN_SESSION_HOURS, 8);
  assert.strictEqual(S.ADMIN_REMEMBER_HOURS, 24 * 365);
  assert.ok(S.ADMIN_REMEMBER_HOURS * 3600 <= 400 * 24 * 3600);        // 브라우저 쿠키 최대 수명(400일) 이내
  assert.strictEqual(S.adminSessionHours({ remember: true }), 24 * 365);
  for (const v of [undefined, null, {}, { remember: false }, { remember: 'true' }, { remember: 1 }, { remember: 'yes' }, [], 'remember', 5]) assert.strictEqual(S.adminSessionHours(v), 8, JSON.stringify(v));
});

test('로그인 처리: 길이 선택은 토큰 비교에 성공한 뒤에만, 세션 저장과 쿠키 수명이 같은 값을 쓴다 (다른 검증은 그대로)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'secure.js'), 'utf8');
  const login = src.slice(src.indexOf("app.post('/api/admin/login'"), src.indexOf("app.post('/api/admin/logout'"));
  // 순서: Origin 확인 → 환경변수 확인 → 시도 제한 → 토큰 비교 → (성공 후에만) 세션 길이 결정
  const order = ['originAllowed(req)', 'adminTokenFingerprint()', 'adminLoginIpLimiter.limited', 'safeEqualHex(sha256Hex(supplied)', 'adminSessionHours(req.body)'].map((k) => login.indexOf(k));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), JSON.stringify(order));
  assert.ok(login.includes('[sha256Hex(sid), fingerprint, hours]') && login.includes('setAdminCookie(res, sid, hours * 3600)'));
  // 쿠키 속성은 그대로: HttpOnly · Secure(운영) · SameSite=Strict · Path=/api/admin
  assert.ok(src.includes('Path=/api/admin; HttpOnly${secure}; SameSite=Strict; Max-Age=${maxAgeSec}'));
  // 결제 검증 경로는 이 변경과 무관: 관리자 세션 길이 상수는 주문·결제 코드에서 쓰이지 않는다
  const outside = src.replace(login, '');
  assert.ok(!/adminSessionHours\(|ADMIN_REMEMBER_HOURS/.test(outside.replace(/^const (ADMIN_REMEMBER_HOURS|adminSessionHours).*$/gm, '').replace(/module\.exports.*$/m, '')));
});
