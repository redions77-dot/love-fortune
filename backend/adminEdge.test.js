const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { isEdgeVerified, ADMIN_EDGE_HEADER } = require('./clientIp');

const EDGE_KEY = 'edge-key-for-tests-0123456789-abcdefghij';
const ADMIN_TOKEN = 'admin-token-for-tests-0123456789-abcdefghij';
const ORIGIN = 'http://localhost:5173';

test('isEdgeVerified: 올바른 값만 통과하고 짧은 키·빈 값·다른 값·비문자열은 거부한다', () => {
  assert.equal(isEdgeVerified(EDGE_KEY, EDGE_KEY), true);
  assert.equal(isEdgeVerified('wrong-key-wrong-key-wrong-key-wrong-key', EDGE_KEY), false);
  assert.equal(isEdgeVerified('', EDGE_KEY), false);
  assert.equal(isEdgeVerified(undefined, EDGE_KEY), false);
  assert.equal(isEdgeVerified(123, EDGE_KEY), false);
  assert.equal(isEdgeVerified(['a'], EDGE_KEY), false);
  // 서버 쪽 키가 없거나 너무 짧으면 어떤 값도 증표로 인정하지 않는다(미설정 = 기존 동작으로 안전하게 되돌아감)
  assert.equal(isEdgeVerified('short', 'short'), false);
  assert.equal(isEdgeVerified(EDGE_KEY, ''), false);
  assert.equal(isEdgeVerified(EDGE_KEY, undefined), false);
});

// 실제 라우트를 호출한다. 요청 제한기는 installSecureApi 호출마다 새로 만들어지므로 테스트마다 앱을 새로 띄운다.
async function withApp(env, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(env)) { saved[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  const pool = { query: async () => ({ rows: [], rowCount: 0 }), connect: async () => ({ query: async () => ({ rows: [] }), release() {} }) };
  delete require.cache[require.resolve('./secure')];
  delete require.cache[require.resolve('./clientIp')];
  const { installSecureApi } = require('./secure');
  const app = express();
  app.use(express.json());
  installSecureApi({ app, pool, runAnalysis: async () => {}, computeGilil: async () => ({}), allowedOrigins: [ORIGIN] });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const login = async (headers = {}, token = 'wrong-token') => (await fetch(`${url}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers }, body: JSON.stringify({ token }) })).status;
  try { await fn({ login }); } finally {
    server.close();
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}
const base = { ADMIN_TOKEN, ADMIN_EDGE_KEY: EDGE_KEY, TRUST_PROXY_HOPS: '1' };

test('직접 접속(증표 없음): 위조 앞부분을 바꿔도 실제 주소(오른쪽 끝) 기준으로 6번째부터 429', async () => {
  await withApp(base, async ({ login }) => {
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push(await login({ 'X-Forwarded-For': `10.0.0.${i}, 198.51.100.9` }));
    assert.deepEqual(codes, [401, 401, 401, 401, 401, 429, 429]);
  });
});

test('증표가 맞는 Vercel 경유 요청: 위조 XFF로 IP별 제한을 피하거나 다른 사용자를 잠글 수 없고, 전역 제한(30회)만 적용된다', async () => {
  await withApp(base, async ({ login }) => {
    const h = (i) => ({ [ADMIN_EDGE_HEADER]: EDGE_KEY, 'X-Forwarded-For': `6.6.6.${i}, 7.7.7.7` });
    const first = [];
    for (let i = 0; i < 8; i++) first.push(await login(h(i)));
    assert.deepEqual(first, Array(8).fill(401), 'IP별 제한(5회)이 적용되지 않는다 → 공격자가 5번 실패로 운영자를 잠글 수 없다');
    for (let i = 8; i < 30; i++) await login(h(i));
    assert.equal(await login(h(99)), 429, '전역 제한 30회 초과는 증표가 있어도 막힌다');
  });
});

test('증표 값이 틀리면 Vercel 경유로 인정하지 않고 직접 접속처럼 IP별로 제한한다', async () => {
  await withApp(base, async ({ login }) => {
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push(await login({ [ADMIN_EDGE_HEADER]: 'forged-' + EDGE_KEY, 'X-Forwarded-For': `10.0.0.${i}, 198.51.100.9` }));
    assert.deepEqual(codes, [401, 401, 401, 401, 401, 429, 429]);
  });
});

test('서버에 ADMIN_EDGE_KEY 가 없으면 어떤 증표 헤더도 효력이 없다(기존 동작 유지)', async () => {
  await withApp({ ...base, ADMIN_EDGE_KEY: undefined }, async ({ login }) => {
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push(await login({ [ADMIN_EDGE_HEADER]: EDGE_KEY, 'X-Forwarded-For': `10.0.0.${i}, 198.51.100.9` }));
    assert.deepEqual(codes, [401, 401, 401, 401, 401, 429, 429]);
  });
});

test('올바른 토큰으로 증표 요청이 로그인하면 정상 처리된다(제한 변경이 인증 흐름을 막지 않음)', async () => {
  await withApp(base, async ({ login }) => {
    assert.equal(await login({ [ADMIN_EDGE_HEADER]: EDGE_KEY }, ADMIN_TOKEN), 200);
  });
});
