const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createPortoneClient } = require('./secure');

// 가짜 포트원 서버: 토큰 발급은 항상 성공하고, 결제 조회 응답만 시나리오별로 바꾼다. 실제 결제사 호출은 없다.
async function withPortone(respond, fn) {
  const server = await new Promise((r) => {
    const s = http.createServer((q, res) => {
      q.resume();
      q.on('end', () => {
        if (q.url.startsWith('/users/getToken')) { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ code: 0, response: { access_token: 't', expired_at: Math.floor(Date.now() / 1000) + 600 } })); }
        respond(q, res);
      });
    }).listen(0, () => r(s));
  });
  const saved = { b: process.env.PORTONE_API_BASE, k: process.env.PORTONE_API_KEY, s: process.env.PORTONE_API_SECRET };
  process.env.PORTONE_API_BASE = `http://127.0.0.1:${server.address().port}`;
  process.env.PORTONE_API_KEY = 'k'; process.env.PORTONE_API_SECRET = 's';
  try { await fn(createPortoneClient()); } finally {
    server.close();
    for (const [key, v] of [['PORTONE_API_BASE', saved.b], ['PORTONE_API_KEY', saved.k], ['PORTONE_API_SECRET', saved.s]]) { if (v === undefined) delete process.env[key]; else process.env[key] = v; }
  }
}
const json = (status, body) => (q, res) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
const code = async (p) => { try { await p; return null; } catch (e) { return e.code; } };

test('엄격한 조회: 404 + code -1 만 "결제 없음"으로 인정한다', async () => {
  await withPortone(json(404, { code: -1, message: '존재하지 않는 결제정보입니다.', response: null }), async (c) => {
    assert.deepEqual(await c.findPaidStrict('order1'), { found: false });
  });
});
test('엄격한 조회: 결제 완료 건은 그대로 돌려준다', async () => {
  await withPortone(json(200, { code: 0, response: { imp_uid: 'imp_1', merchant_uid: 'order1', status: 'paid', amount: 1990 } }), async (c) => {
    const r = await c.findPaidStrict('order1');
    assert.equal(r.found, true); assert.equal(r.payment.imp_uid, 'imp_1');
  });
});
test('엄격한 조회: 불명확한 응답은 "없음"이 아니라 예외다(삭제 보류)', async () => {
  const cases = {
    'HTTP 200 + code≠0': json(200, { code: -1, message: 'x', response: null }),
    'HTTP 200 + 빈 response': json(200, { code: 0, response: null }),
    'HTTP 404 + JSON 아님': (q, res) => { res.statusCode = 404; res.end('<html>Not Found</html>'); },
    'HTTP 404 + code 가 -1 이 아님': json(404, { code: 5, response: null }),
    'HTTP 500': json(500, { code: -1 }),
    'HTTP 502 + 빈 본문': (q, res) => { res.statusCode = 502; res.end(); },
    'HTTP 200 + JSON 아님': (q, res) => { res.statusCode = 200; res.end('ok'); },
  };
  for (const [name, handler] of Object.entries(cases)) {
    await withPortone(handler, async (c) => {
      const got = await code(c.findPaidStrict('order1'));
      assert.ok(['portone_ambiguous', 'portone_unavailable'].includes(got), `${name} → ${got}`);
    });
  }
});
test('엄격한 조회: 인증 실패(401)와 키 미설정은 예외다', async () => {
  await withPortone(json(401, { code: -1 }), async (c) => assert.equal(await code(c.findPaidStrict('order1')), 'portone_auth_failed'));
  await withPortone(json(404, { code: -1, response: null }), async (c) => {
    delete process.env.PORTONE_API_KEY;
    const fresh = createPortoneClient();
    assert.equal(await code(fresh.findPaidStrict('order1')), 'portone_not_configured');
  });
});
test('기존 조회(findPaidByMerchantUid)의 동작은 바뀌지 않았다: 모호한 응답을 null 로 돌려준다', async () => {
  await withPortone(json(200, { code: -1, response: null }), async (c) => assert.equal(await c.findPaidByMerchantUid('order1'), null));
});
