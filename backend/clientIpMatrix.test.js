const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { pickClientIp, isPublicIp } = require('./clientIp');
const { installProxyDiag } = require('./proxyDiag');

// 프록시가 X-Forwarded-For 오른쪽 끝에 덧붙이는 주소들(앱 쪽에서 본 순서: 클라이언트, 그다음 프록시들).
// k = 덧붙은 개수. 실제 Render/Vercel 경로의 k 는 코드로 알 수 없어, 가능한 모양별로 모든 단수 설정을 검증한다.
const CLIENT_A = '198.51.100.10', CLIENT_B = '198.51.100.20';
const EDGE = '104.16.0.1', LB = '10.8.0.5';
const shapes = {
  'k=1 (프록시 1단)': (c) => [c],
  'k=2 (CDN + 로드밸런서)': (c) => [c, EDGE],
  'k=3 (CDN + 로드밸런서 + 내부 프록시)': (c) => [c, EDGE, LB],
};
const forgedPrefixes = [[], ['6.6.6.6'], ['6.6.6.6', '7.7.7.7', '8.8.8.8']];
const select = (appended, forged, hops) => pickClientIp({ peer: '10.0.0.1', xff: [...forged, ...appended].join(', '), hops });

for (const [name, make] of Object.entries(shapes)) {
  const k = make(CLIENT_A).length;
  test(`${name}: 단수가 정확할 때만 "위조 우회 방지"와 "사용자 구분"이 함께 성립한다`, () => {
    for (let hops = 1; hops <= 4; hops++) {
      // 위조 우회 방지: 앞에 무엇을 붙여도 선택 결과가 같아야 하고, 위조값이 선택되면 안 된다
      const sel = forgedPrefixes.map((f) => select(make(CLIENT_A), f, hops));
      const spoofResistant = sel.every((s) => s === sel[0]) && !sel.some((s) => ['6.6.6.6', '7.7.7.7', '8.8.8.8'].includes(s));
      // 사용자 구분: 서로 다른 클라이언트가 서로 다른 값으로 구분돼야 한다
      const distinguishes = select(make(CLIENT_A), [], hops) !== select(make(CLIENT_B), [], hops);
      if (hops === k) { assert.ok(spoofResistant && distinguishes, `hops=${hops} 에서 둘 다 성립해야 함`); }
      else if (hops < k) { assert.ok(spoofResistant, `hops=${hops}<k: 위조는 막지만`); assert.equal(distinguishes, false, `hops=${hops}<k: 모든 사용자가 같은 프록시 주소로 묶인다`); }
      else { assert.equal(spoofResistant, false, `hops=${hops}>k: 위조 값이 선택된다(우회 가능)`); }
    }
  });
}

test('단수가 작으면 선택된 주소가 사설 주소(프록시 내부)로 보인다 — 진단 신호', () => {
  assert.equal(isPublicIp(select(shapes['k=3 (CDN + 로드밸런서 + 내부 프록시)'](CLIENT_A), [], 1)), false);
  assert.equal(isPublicIp(select(shapes['k=1 (프록시 1단)'](CLIENT_A), [], 1)), true);
  for (const ip of ['10.1.2.3', '172.20.0.1', '192.168.1.1', '127.0.0.1', '::1', 'fd00::1', '100.64.0.1']) assert.equal(isPublicIp(ip), false, ip);
  for (const ip of ['8.8.8.8', '198.51.100.10', '2001:4860:4860::8888']) assert.equal(isPublicIp(ip), true, ip);
});

test('경로가 다르면 덧붙는 개수가 다를 수 있다: 같은 단수 설정이 한쪽 경로에서만 맞는다', () => {
  // 공개 API: 브라우저 → Render (k=1 가정) / 관리자 API: 브라우저 → Vercel(헤더를 덮어씀) → Render (Render 가 Vercel 주소를 덧붙임, k=2 가정)
  const direct = select([CLIENT_A], ['6.6.6.6'], 1);
  const viaVercel = select([CLIENT_A, EDGE], [], 1);   // Vercel 은 들어온 XFF 를 덮어써 위조 앞부분이 남지 않는다
  assert.equal(direct, CLIENT_A);
  assert.equal(viaVercel, EDGE);   // 관리자 경로는 모든 사용자가 Vercel 주소 하나로 묶인다
});

async function withDiag(env, fn) {
  const app = express();
  installProxyDiag({ app, env, hops: 1 });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try { await fn(`http://127.0.0.1:${server.address().port}`); } finally { server.close(); }
}

test('진단 엔드포인트: 토큰이 없거나 틀리거나 설정이 없으면 404, 맞으면 자기 요청의 헤더 목록과 선택값을 돌려준다', async () => {
  await withDiag({ PROXY_DIAG_TOKEN: 'a-long-test-token-1234' }, async (url) => {
    for (const path of ['/api/diag/proxy', '/api/admin/diag-proxy']) {
      assert.equal((await fetch(url + path)).status, 404);
      assert.equal((await fetch(url + path, { headers: { 'x-diag-token': 'wrong' } })).status, 404);
      const ok = await fetch(url + path, { headers: { 'x-diag-token': 'a-long-test-token-1234', 'x-forwarded-for': '6.6.6.6, 198.51.100.10' } });
      assert.equal(ok.status, 200);
      const body = await ok.json();
      assert.deepEqual(body.xff, ['6.6.6.6', '198.51.100.10']);
      assert.equal(body.selected, '198.51.100.10');
      assert.equal(body.hops, 1);
      assert.equal(ok.headers.get('cache-control'), 'no-store');
    }
  });
  await withDiag({}, async (url) => assert.equal((await fetch(url + '/api/diag/proxy', { headers: { 'x-diag-token': '' } })).status, 404));
  await withDiag({ PROXY_DIAG_TOKEN: 'short' }, async (url) => assert.equal((await fetch(url + '/api/diag/proxy', { headers: { 'x-diag-token': 'short' } })).status, 404));
});
