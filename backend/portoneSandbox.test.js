const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createPortoneClient, sandboxLookupEnabled } = require('./secure');

// 가짜 포트원 서버: 요청 주소를 기록한다. 실제 결제사 호출은 없다.
async function withPortone(env, fn) {
  const urls = [];
  const server = await new Promise((r) => {
    const s = http.createServer((q, res) => {
      q.resume();
      q.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        if (q.url.startsWith('/users/getToken')) return res.end(JSON.stringify({ code: 0, response: { access_token: 't', expired_at: Math.floor(Date.now() / 1000) + 3600 } }));
        urls.push(q.url);
        if (q.url.includes('/paid')) return res.end(JSON.stringify({ code: 0, response: { imp_uid: 'imp_x', merchant_uid: 'o1', status: 'paid', amount: 1 } }));
        res.end(JSON.stringify({ code: 0, response: { imp_uid: 'imp_x', merchant_uid: 'o1', status: 'paid', amount: 1 } }));
      });
    }).listen(0, () => r(s));
  });
  const keys = ['PORTONE_API_BASE', 'PORTONE_API_KEY', 'PORTONE_API_SECRET', 'PORTONE_INCLUDE_SANDBOX', 'MYSAJU_TEST_ENV', 'NODE_ENV'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of ['PORTONE_INCLUDE_SANDBOX', 'MYSAJU_TEST_ENV']) delete process.env[k];
  process.env.PORTONE_API_BASE = `http://127.0.0.1:${server.address().port}`;
  process.env.PORTONE_API_KEY = 'k'; process.env.PORTONE_API_SECRET = 's';
  Object.assign(process.env, env);
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
  const warn = console.warn; console.warn = () => {};
  try { await fn(createPortoneClient(), urls); } finally {
    console.warn = warn; server.close();
    for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
}
const lookupAll = async (c) => { await c.getPayment('imp_x'); await c.findPaidByMerchantUid('o1'); await c.findPaidStrict('o1'); };

test('기본(운영과 같은 설정): 세 가지 결제 조회 주소에 include_sandbox 가 붙지 않는다', async () => {
  await withPortone({}, async (c, urls) => {
    await lookupAll(c);
    assert.deepEqual(urls, ['/payments/imp_x', '/payments/find/o1/paid', '/payments/find/o1/paid']);
  });
});

test('PORTONE_INCLUDE_SANDBOX 만 켜서는(테스트 환경 표시 없음) 적용되지 않는다', async () => {
  await withPortone({ PORTONE_INCLUDE_SANDBOX: 'true' }, async (c, urls) => {
    await lookupAll(c);
    assert.ok(urls.every((u) => !u.includes('include_sandbox')), urls.join());
    assert.equal(sandboxLookupEnabled(), false);
  });
});

test('테스트 환경(MYSAJU_TEST_ENV=1)에서 켜면 세 조회 모두 include_sandbox=true', async () => {
  await withPortone({ PORTONE_INCLUDE_SANDBOX: 'true', MYSAJU_TEST_ENV: '1', NODE_ENV: 'test' }, async (c, urls) => {
    await lookupAll(c);
    assert.deepEqual(urls, ['/payments/imp_x?include_sandbox=true', '/payments/find/o1/paid?include_sandbox=true', '/payments/find/o1/paid?include_sandbox=true']);
    assert.equal(sandboxLookupEnabled(), true);
  });
});

test('NODE_ENV=production 이면 다른 변수가 켜져 있어도 절대 적용되지 않는다', async () => {
  await withPortone({ PORTONE_INCLUDE_SANDBOX: 'true', MYSAJU_TEST_ENV: '1', NODE_ENV: 'production' }, async (c, urls) => {
    await lookupAll(c);
    assert.ok(urls.every((u) => !u.includes('include_sandbox')), urls.join());
    assert.equal(sandboxLookupEnabled(), false);
  });
});

test('값이 "true"가 아니면(1, yes 등) 켜지지 않는다', async () => {
  for (const v of ['1', 'yes', 'TRUE', 'false', '']) {
    await withPortone({ PORTONE_INCLUDE_SANDBOX: v, MYSAJU_TEST_ENV: '1', NODE_ENV: 'test' }, async (c, urls) => {
      await c.getPayment('imp_x');
      assert.ok(!urls[0].includes('include_sandbox'), v);
    });
  }
});

test('결제 확인 로직은 sandbox 응답 필드로 결제를 차단하지 않는다(공식 확인 전이라 가정하지 않음 — 확인 필요 항목)', () => {
  const fs = require('node:fs');
  const src = fs.readFileSync(require('node:path').join(__dirname, 'secure.js'), 'utf8');
  const apply = src.slice(src.indexOf('async function applyVerifiedPayment'), src.indexOf('async function kickoffSuccessJob'));
  assert.ok(!/sandbox/i.test(apply), 'applyVerifiedPayment 는 sandbox 필드를 보지 않는다');
});
