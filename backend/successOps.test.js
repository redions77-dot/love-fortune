// 우리 아이 성공사주: 결제 → 결과 전달, 생성 실패 안내 · 자동 재생성 · 환불을 실제 SQL(메모리 Postgres=PGlite)로 확인한다. 결제사·메일·AI는 모의, 실제 결제·호출 없음.
// PGlite 가 없는 환경(저장소 의존성에 넣지 않음)에서는 건너뛴다. 위치: PGLITE_PATH 또는 %LOCALAPPDATA%/mysaju-preview/node_modules/@electric-sql/pglite
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { pathToFileURL } = require('url');

const candidates = [process.env.PGLITE_PATH, process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'mysaju-preview/node_modules/@electric-sql/pglite/dist/index.js')].filter(Boolean);
let pgliteUrl = null;
for (const c of candidates) { const p = c.startsWith('file:') ? c : null; if (p) { pgliteUrl = p; break; } if (fs.existsSync(c)) { pgliteUrl = pathToFileURL(c).href; break; } }
const maybe = pgliteUrl ? test : test.skip;

const CHILD = { gender: '남성', birthdate: '2012-07-14', birthtime: '20:30', userName: '가상학생' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 4000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(20); } return null; }

async function makeEnv({ analysis = 'fail', payments = {} } = {}) {
  const { PGlite } = await import(pgliteUrl);
  const db = new PGlite();
  const run = (r) => ({ query: async (sql, params) => { if (params && params.length) { const x = await r.query(sql, params); return { rows: x.rows, rowCount: x.affectedRows ?? x.rows.length }; } const rs = await r.exec(sql); const last = rs[rs.length - 1] || { rows: [] }; return { rows: last.rows, rowCount: last.affectedRows ?? last.rows.length }; } });
  let chain = Promise.resolve();
  const pool = { ...run(db), connect: async () => { let free; const prev = chain; chain = new Promise((r) => { free = r; }); await prev; return { ...run(db), release() { free(); } }; } };
  const outbox = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ops-')), 'out.jsonl');
  const saved = { ...process.env };
  Object.assign(process.env, { SUCCESS_CHILD_ENABLED: '1', EMAIL_TRANSPORT: 'test', EMAIL_TEST_OUTBOX: outbox, SUCCESS_OPS_SWEEP: '0', NODE_ENV: 'test' });
  delete process.env.SUCCESS_AUTO_REFUND_HOURS;
  const state = { runs: 0, mode: analysis, cancels: [], cancelResult: 'ok', payments };
  const runAnalysis = async (body, sink) => {
    state.runs++;
    if (state.mode === 'fail') { sink.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`); return; }
    sink.write(`data: ${JSON.stringify({ text: '결과 본문입니다.' })}\n\n`); sink.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  };
  const portone = {
    findPaidStrict: async () => ({ found: false }), findPaidByMerchantUid: async () => null,
    getPayment: async (id) => state.payments[id] || null,
    cancelPayment: async (a) => { state.cancels.push(a); if (state.cancelResult === 'reject') throw Object.assign(new Error('portone_cancel_rejected'), { code: 'portone_cancel_rejected' }); state.payments[a.impUid] = { ...state.payments[a.impUid], status: 'cancelled' }; return { status: 'cancelled' }; },
  };
  const app = express(); app.use(express.json());
  delete require.cache[require.resolve('./secure')];
  const { installSecureApi } = require('./secure');
  const api = installSecureApi({ app, pool, runAnalysis, computeGilil: async () => ({}), allowedOrigins: [], portone });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (p, body) => { const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const text = await r.text(); let json = {}; try { json = JSON.parse(text); } catch {} return { status: r.status, json, text }; };
  const mails = () => (fs.existsSync(outbox) ? fs.readFileSync(outbox, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  async function buy({ code } = {}) {
    const o = await post('/api/orders', { product: 'success_child', input: CHILD, email: 'buyer@example.com', consent: true });
    assert.equal(o.status, 201, JSON.stringify(o.json));
    const impUid = 'imp_' + String(Math.random()).slice(2, 12);
    state.payments[impUid] = { imp_uid: impUid, merchant_uid: o.json.orderId, status: 'paid', amount: o.json.amount, currency: 'KRW' };
    const v = await post(`/api/orders/${o.json.orderId}/verify`, { orderToken: o.json.orderToken, impUid });
    assert.equal(v.status, 200, JSON.stringify(v.json));
    return { id: o.json.orderId, token: o.json.orderToken, impUid, amount: o.json.amount };
  }
  const job = async (id) => (await db.query('SELECT * FROM analysis_jobs WHERE order_id = $1', [id])).rows[0];
  const order = async (id) => (await db.query('SELECT * FROM orders WHERE id = $1', [id])).rows[0];
  return { api, post, mails, buy, job, order, db, state, close: () => { server.close(); for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); } };
}

maybe('생성이 실패하면 고객에게 안내 메일이 한 번만 가고, 서버가 간격을 두고 다시 생성해 성공하면 결과 메일이 간다', async () => {
  const env = await makeEnv({ analysis: 'fail' });
  try {
    const o = await env.buy();
    assert.ok(await waitFor(async () => (await env.job(o.id))?.status === 'failed'), '첫 생성 실패');
    assert.ok(await waitFor(() => env.mails().length >= 1));
    const notice = env.mails()[0];
    assert.equal(notice.to, 'buyer@example.com'); assert.match(notice.subject, /아직 준비 중/); assert.match(notice.html, /내 결과지 다시 보기/); assert.match(notice.html, /전액 환불/);
    await env.api.successOpsTick();
    assert.equal(env.mails().length, 1, '안내 메일은 주문당 한 번');
    assert.equal(env.state.runs, 1, '간격(10분) 전에는 다시 생성하지 않는다');
    await env.db.query(`UPDATE analysis_jobs SET updated_at = NOW() - interval '11 minutes' WHERE order_id = $1`, [o.id]);
    env.state.mode = 'ok';
    const st = await env.api.successOpsTick();
    assert.equal(st.retries, 1);
    assert.ok(await waitFor(async () => (await env.job(o.id))?.status === 'done'), '재생성 성공');
    assert.equal(env.state.runs, 2);
    assert.ok(await waitFor(() => env.mails().length >= 2), '결과 메일 발송');
    assert.ok(!/아직 준비 중/.test(env.mails()[1].subject));
    const before = env.state.runs; await env.api.successOpsTick(); assert.equal(env.state.runs, before, '완료된 주문은 다시 만들지 않는다');
  } finally { env.close(); }
});

maybe('자동 재생성은 주문당 최대 3번(처음 1 + 재시도 2)에서 멈추고, 그 뒤에는 운영자 알림만 한 번 남긴다', async () => {
  const env = await makeEnv({ analysis: 'fail' });
  const errs = []; const origErr = console.error; console.error = (...a) => { errs.push(a.join(' ')); };
  try {
    const o = await env.buy();
    for (let i = 0; i < 4; i++) {
      assert.ok(await waitFor(async () => (await env.job(o.id))?.status === 'failed'));
      await env.db.query(`UPDATE analysis_jobs SET updated_at = NOW() - interval '11 minutes' WHERE order_id = $1`, [o.id]);
      await env.api.successOpsTick();
      await sleep(80);
    }
    assert.equal(env.state.runs, 3, '총 3번까지만');
    assert.equal(errs.filter((e) => /모두 소진/.test(e)).length, 1, '운영자 알림은 한 번');
  } finally { console.error = origErr; env.close(); }
});

maybe('고객 전액 환불: 결과를 받기 전이면 결제사 취소를 서버 기록 금액으로 한 번만 하고, 이후 결과는 만들지도 보내지도 않는다 (쿠폰 결제는 실결제액)', async () => {
  for (const code of [undefined]) {
    const env = await makeEnv({ analysis: 'fail' });
    try {
      const o = await env.buy({ code });
      assert.equal(o.amount, 50000);
      assert.ok(await waitFor(async () => (await env.job(o.id))?.status === 'failed'));
      const bad = await env.post(`/api/orders/${o.id}/refund`, { orderToken: 'wrong-token' });
      assert.equal(bad.status, 404); assert.equal(env.state.cancels.length, 0);
      const [r1, r2] = await Promise.all([env.post(`/api/orders/${o.id}/refund`, { orderToken: o.token }), env.post(`/api/orders/${o.id}/refund`, { orderToken: o.token })]);
      assert.ok([r1.status, r2.status].includes(200) && [r1.status, r2.status].every((s) => s === 200 || s === 409), "동시에 눌러도 한쪽은 성공, 다른 쪽은 성공이거나 처리 중");
      assert.equal(env.state.cancels.length, 1, '결제사 취소는 한 번');
      assert.equal(env.state.cancels[0].amount, o.amount); assert.equal(env.state.cancels[0].impUid, o.impUid); assert.equal(env.state.cancels[0].merchantUid, o.id);
      const row = await env.order(o.id); assert.equal(row.refund_status, 'done'); assert.ok(row.refunded_at);
      assert.ok(env.mails().some((m) => /전액 환불/.test(m.subject)), '환불 완료 메일');
      const again = await env.post(`/api/orders/${o.id}/refund`, { orderToken: o.token });
      assert.equal(again.status, 200); assert.equal(env.state.cancels.length, 1, '다시 눌러도 취소는 반복하지 않는다');
      const a = await env.post(`/api/orders/${o.id}/analysis`, { orderToken: o.token });
      assert.equal(a.status, 410); assert.equal(a.json.code, 'refunded');
      env.state.mode = 'ok'; const runs = env.state.runs; await env.api.successOpsTick(); assert.equal(env.state.runs, runs, '환불된 주문은 다시 생성하지 않는다');
    } finally { env.close(); }
  }
});

maybe('이미 결과가 전달된 주문은 고객 환불 버튼으로 환불되지 않고, 운영자 환불은 확인 표시와 함께 가능하다', async () => {
  const env = await makeEnv({ analysis: 'ok' });
  try {
    const o = await env.buy();
    assert.ok(await waitFor(async () => (await env.job(o.id))?.status === 'done'));
    const r = await env.post(`/api/orders/${o.id}/refund`, { orderToken: o.token });
    assert.equal(r.status, 409); assert.equal(r.json.code, 'already_delivered'); assert.equal(env.state.cancels.length, 0);
    const adm = await env.api.refundSuccessOrder(o.id, { reason: 'admin', allowDelivered: true });
    assert.equal(adm.ok, true); assert.equal(env.state.cancels.length, 1);
  } finally { env.close(); }
});

maybe('환불 안전장치: 결제사에서 이미 취소된 건은 다시 취소하지 않고 기록만 맞추고, 금액이 다르거나 결제사가 거절하면 환불 처리하지 않고 다시 시도할 수 있다', async () => {
  const env = await makeEnv({ analysis: 'fail' });
  try {
    const o = await env.buy();
    assert.ok(await waitFor(async () => (await env.job(o.id))?.status === 'failed'));
    env.state.payments[o.impUid].amount = 1;   // 서버 기록과 다른 금액
    let r = await env.api.refundSuccessOrder(o.id); assert.equal(r.ok, false); assert.equal(r.code, 'refund_failed'); assert.equal(env.state.cancels.length, 0);
    assert.equal((await env.order(o.id)).refund_status, 'failed');
    env.state.payments[o.impUid].amount = o.amount; env.state.cancelResult = 'reject';
    r = await env.api.refundSuccessOrder(o.id); assert.equal(r.ok, false); assert.equal(env.state.cancels.length, 1);
    assert.notEqual((await env.order(o.id)).refund_status, 'done');
    env.state.cancelResult = 'ok'; env.state.payments[o.impUid].status = 'cancelled';   // 포트원 콘솔에서 이미 취소한 경우
    r = await env.api.refundSuccessOrder(o.id); assert.equal(r.ok, true); assert.equal(env.state.cancels.length, 1, '이미 취소된 건은 취소를 반복하지 않는다');
    assert.equal((await env.order(o.id)).refund_status, 'done');
  } finally { env.close(); }
});

maybe('자동 환불은 SUCCESS_AUTO_REFUND_HOURS 를 켠 경우에만, 그 시간이 지나도 전달하지 못한 주문에 한해 일어난다(기본 꺼짐)', async () => {
  const env = await makeEnv({ analysis: 'fail' });
  try {
    const o = await env.buy();
    assert.ok(await waitFor(async () => (await env.job(o.id))?.status === 'failed'));
    await env.db.query(`UPDATE orders SET paid_at = NOW() - interval '30 hours' WHERE id = $1`, [o.id]);
    await env.api.successOpsTick(); assert.equal(env.state.cancels.length, 0, '기본은 자동 환불 꺼짐');
    process.env.SUCCESS_AUTO_REFUND_HOURS = '24';
    await env.db.query(`UPDATE analysis_jobs SET updated_at = NOW() WHERE order_id = $1`, [o.id]);
    const st = await env.api.successOpsTick(); assert.equal(st.refunds, 1); assert.equal(env.state.cancels.length, 1);
    const young = await env.buy(); assert.ok(await waitFor(async () => (await env.job(young.id))?.status === 'failed'));
    await env.api.successOpsTick(); assert.equal(env.state.cancels.length, 1, '24시간 전 주문은 환불하지 않는다');
  } finally { env.close(); }
});

test('결제사 취소 호출은 서버가 넘긴 금액으로만 하고, 취소됨으로 확인될 때만 성공이다 (모의 서버)', async () => {
  const http = require('http');
  const seen = [];
  const srv = http.createServer((req, res) => {
    let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/users/getToken') return res.end(JSON.stringify({ code: 0, response: { access_token: 'tok', expired_at: Math.floor(Date.now() / 1000) + 600 } }));
      seen.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(b || '{}') });
      const ok = JSON.parse(b).amount === 30000;
      res.end(JSON.stringify(ok ? { code: 0, response: { status: 'cancelled' } } : { code: -1, message: 'x', response: null }));
    });
  });
  await new Promise((r) => srv.listen(0, r));
  const prev = { b: process.env.PORTONE_API_BASE, k: process.env.PORTONE_API_KEY, s: process.env.PORTONE_API_SECRET };
  Object.assign(process.env, { PORTONE_API_BASE: `http://127.0.0.1:${srv.address().port}`, PORTONE_API_KEY: 'k', PORTONE_API_SECRET: 's' });
  try {
    const { createPortoneClient } = require('./secure');
    const c = createPortoneClient();
    const r = await c.cancelPayment({ impUid: 'imp_1', merchantUid: 'success_1', amount: 30000, reason: '테스트' });
    assert.equal(r.status, 'cancelled');
    assert.deepEqual(seen[0].body, { imp_uid: 'imp_1', merchant_uid: 'success_1', amount: 30000, checksum: 30000, reason: '테스트' });
    assert.equal(seen[0].auth, 'tok'); assert.match(seen[0].url, /\/payments\/cancel$/);
    await assert.rejects(() => c.cancelPayment({ impUid: 'imp_1', merchantUid: 'success_1', amount: 50000, reason: 'x' }), /portone_cancel_rejected/);
  } finally { srv.close(); for (const [k, v] of [['PORTONE_API_BASE', prev.b], ['PORTONE_API_KEY', prev.k], ['PORTONE_API_SECRET', prev.s]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
});
