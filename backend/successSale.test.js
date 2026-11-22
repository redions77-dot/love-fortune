const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { installSecureApi } = require('./secure');
const { SUCCESS_CONSENT_VERSION } = require('./successChild');

// 결제 전 확인(이메일·동의)과 결제 직후 서버 자동 시작: 모의 pool + 모의 포트원 + 실제 Express 요청
function makeServer() {
  const orders = new Map();
  const analysisCalls = [];
  const payments = new Map();
  const query = async (sql, params = []) => {
    const s = sql.trim();
    if (/^INSERT INTO orders/.test(s)) { orders.set(params[0], { id: params[0], product: params[1], amount: params[2], token_hash: params[3], input: JSON.parse(params[4]), email: params[5], status: params[6] || 'pending', imp_uid: null }); return { rows: [], rowCount: 1 }; }
    if (/^SELECT \* FROM orders WHERE id/.test(s)) { const o = orders.get(params[0]); return { rows: o ? [o] : [], rowCount: o ? 1 : 0 }; }
    if (/^UPDATE orders SET status = 'paid'/.test(s)) { const o = orders.get(params[0]); if (!o || o.status !== 'pending') return { rows: [], rowCount: 0 }; o.status = 'paid'; o.imp_uid = params[1]; return { rows: [], rowCount: 1 }; }
    if (/^INSERT INTO analysis_jobs/.test(s)) return { rows: [{ attempts: 1 }], rowCount: 1 };
    if (/^SELECT email FROM orders/.test(s)) return { rows: [{ email: null }], rowCount: 1 };   // 완료 후 메일 단계는 건너뛴다
    return { rows: [], rowCount: 0 };
  };
  const pool = { query, connect: async () => ({ query, release() {} }) };
  const runAnalysis = async (body, sink) => { analysisCalls.push(body); sink.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`); };
  const app = express(); app.use(express.json());
  installSecureApi({ app, pool, runAnalysis, computeGilil: async () => ({}), allowedOrigins: [], portone: { findPaidStrict: async () => ({ found: false }), getPayment: async (id) => payments.get(id) || null, findPaidByMerchantUid: async () => null } });
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const base = `http://127.0.0.1:${server.address().port}`;
      const post = async (p, body) => { const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => ({})) }; };
      resolve({ orders, analysisCalls, payments, post, close: () => server.close() });
    });
  });
}
const CHILD = { gender: '남성', birthdate: '2012-07-14', birthtime: '20:30', userName: '가상학생' };
async function withServer(fn) {
  const prev = process.env.SUCCESS_CHILD_ENABLED; process.env.SUCCESS_CHILD_ENABLED = '1';
  const srv = await makeServer();
  try { await fn(srv); } finally { srv.close(); if (prev === undefined) delete process.env.SUCCESS_CHILD_ENABLED; else process.env.SUCCESS_CHILD_ENABLED = prev; }
}
const tick = () => new Promise((r) => setTimeout(r, 30));

test('성공사주 구매는 이메일과 결제 전 안내 확인(true)이 있어야 하고, 확인한 안내 버전이 주문에 남는다', async () => {
  await withServer(async (srv) => {
    const noEmail = await srv.post('/api/orders', { product: 'success_child', input: CHILD, consent: true });
    assert.equal(noEmail.status, 400); assert.equal(noEmail.json.code, 'email_required');
    assert.equal((await srv.post('/api/orders', { product: 'success_child', input: CHILD, email: 'not-an-email', consent: true })).status, 400);
    for (const consent of [undefined, false, 'true', 1]) {
      const r = await srv.post('/api/orders', { product: 'success_child', input: CHILD, email: 'buyer@example.com', consent });
      assert.equal(r.status, 400, String(consent)); assert.equal(r.json.code, 'consent_required');
    }
    assert.equal(srv.orders.size, 0, '이메일·동의가 없으면 주문이 만들어지지 않는다');
    const ok = await srv.post('/api/orders', { product: 'success_child', input: CHILD, email: 'buyer@example.com', consent: true });
    assert.equal(ok.status, 201);
    const saved = [...srv.orders.values()][0];
    assert.equal(saved.email, 'buyer@example.com');
    assert.equal(saved.input.consent.version, SUCCESS_CONSENT_VERSION);
    assert.match(saved.input.consent.at, /^\d{4}-\d{2}-\d{2}T/);
  });
});

test('기존 상품 주문은 이메일·동의 없이도 그대로 만들어진다 (성공사주 규칙이 번지지 않는다)', async () => {
  await withServer(async (srv) => {
    for (const product of ['full_child', 'full_saju', 'deep']) {
      const r = await srv.post('/api/orders', { product, input: CHILD });
      assert.equal(r.status, 201, product);
      assert.equal(srv.orders.get(r.json.orderId).input.consent, undefined);
    }
  });
});

test('결제가 확인되면 서버가 성공사주 결과 생성을 바로 시작한다 (창을 닫아도 진행). 다른 상품은 시작하지 않는다', async () => {
  await withServer(async (srv) => {
    const o = (await srv.post('/api/orders', { product: 'success_child', input: CHILD, email: 'buyer@example.com', consent: true })).json;
    srv.payments.set('imp_success001', { imp_uid: 'imp_success001', merchant_uid: o.orderId, status: 'paid', amount: 50000, currency: 'KRW' });
    const v = await srv.post(`/api/orders/${o.orderId}/verify`, { orderToken: o.orderToken, impUid: 'imp_success001' });
    assert.equal(v.status, 200);
    await tick();
    assert.equal(srv.analysisCalls.length, 1);
    assert.equal(srv.analysisCalls[0].type, '성공사주');
    assert.equal(srv.analysisCalls[0].gender, '남성');
    assert.equal(srv.analysisCalls[0].birthdate, '2012-07-14');
    // 결제 금액이 안 맞으면 시작하지 않는다
    const o2 = (await srv.post('/api/orders', { product: 'success_child', input: CHILD, email: 'b2@example.com', consent: true })).json;
    srv.payments.set('imp_success002', { imp_uid: 'imp_success002', merchant_uid: o2.orderId, status: 'paid', amount: 30000, currency: 'KRW' });
    assert.equal((await srv.post(`/api/orders/${o2.orderId}/verify`, { orderToken: o2.orderToken, impUid: 'imp_success002' })).status, 400);
    await tick();
    assert.equal(srv.analysisCalls.length, 1);
    // 기존 상품은 결제가 확인돼도 서버가 생성을 시작하지 않는다(기존 방식: 화면이 결과를 요청할 때 시작)
    const old = (await srv.post('/api/orders', { product: 'full_child', input: CHILD, email: 'c@example.com' })).json;
    srv.payments.set('imp_old000001', { imp_uid: 'imp_old000001', merchant_uid: old.orderId, status: 'paid', amount: 9900, currency: 'KRW' });
    assert.equal((await srv.post(`/api/orders/${old.orderId}/verify`, { orderToken: old.orderToken, impUid: 'imp_old000001' })).status, 200);
    await tick();
    assert.equal(srv.analysisCalls.length, 1);
  });
});
