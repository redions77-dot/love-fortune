// 무료 체험(일회용 코드) + 단일 판매가(50,000원). 할인코드·쿠폰은 없다.
// 실제 SQL(메모리 Postgres=PGlite)로 확인한다. 결제사·메일·AI는 모의, 실제 결제·호출 없음. PGlite 가 없으면 건너뛴다(successOps.test.js 와 같은 위치 규칙).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { pathToFileURL } = require('url');
const { SUCCESS_CHILD } = require('./successChild');

const candidates = [process.env.PGLITE_PATH, process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'mysaju-preview/node_modules/@electric-sql/pglite/dist/index.js')].filter(Boolean);
let pgliteUrl = null;
for (const c of candidates) { if (c.startsWith('file:')) { pgliteUrl = c; break; } if (fs.existsSync(c)) { pgliteUrl = pathToFileURL(c).href; break; } }
const maybe = pgliteUrl ? test : test.skip;

const CHILD = { gender: '남성', birthdate: '2012-07-14', birthtime: '20:30', userName: '가상학생' };
const ADMIN_TOKEN = 'a'.repeat(48);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 4000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(20); } return null; }

async function makeEnv({ enabled = true, analysis = 'ok' } = {}) {
  const { PGlite } = await import(pgliteUrl);
  const db = new PGlite();
  const run = (r) => ({ query: async (sql, params) => { if (params && params.length) { const x = await r.query(sql, params); return { rows: x.rows, rowCount: x.affectedRows ?? x.rows.length }; } const rs = await r.exec(sql); const last = rs[rs.length - 1] || { rows: [] }; return { rows: last.rows, rowCount: last.affectedRows ?? last.rows.length }; } });
  let chain = Promise.resolve();
  const pool = { ...run(db), connect: async () => { let free; const prev = chain; chain = new Promise((r) => { free = r; }); await prev; return { ...run(db), release() { free(); } }; } };
  const outbox = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'trial-')), 'out.jsonl');
  const saved = { ...process.env };
  Object.assign(process.env, { EMAIL_TRANSPORT: 'test', EMAIL_TEST_OUTBOX: outbox, SUCCESS_OPS_SWEEP: '0', NODE_ENV: 'test', ADMIN_TOKEN, ADMIN_COOKIE_INSECURE: '1' });
  if (enabled) process.env.SUCCESS_CHILD_ENABLED = '1'; else delete process.env.SUCCESS_CHILD_ENABLED;
  delete process.env.SUCCESS_AUTO_REFUND_HOURS;
  const state = { runs: 0, mode: analysis, bodies: [], cancels: [] };
  const runAnalysis = async (body, sink) => {
    state.runs++; state.bodies.push(body);
    if (state.mode === 'fail') { sink.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`); return; }
    sink.write(`data: ${JSON.stringify({ text: '결과 본문입니다.' })}\n\n`); sink.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  };
  const portone = { findPaidStrict: async () => ({ found: false }), findPaidByMerchantUid: async () => null, getPayment: async () => null, cancelPayment: async (a) => { state.cancels.push(a); return { status: 'cancelled' }; } };
  const app = express(); app.use(express.json());
  delete require.cache[require.resolve('./secure')];
  const { installSecureApi } = require('./secure');
  const api = installSecureApi({ app, pool, runAnalysis, computeGilil: async () => ({}), allowedOrigins: ['https://admin.test'], portone });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const post = async (p, body, { admin = false } = {}) => {
    const headers = { 'Content-Type': 'application/json', Origin: 'https://admin.test', ...(admin && cookie ? { Cookie: cookie } : {}) };
    const r = await fetch(base + p, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await r.text(); let json = {}; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text, headers: r.headers };
  };
  const login = async () => { const r = await post('/api/admin/login', { token: ADMIN_TOKEN }); const sc = r.headers.get('set-cookie') || ''; cookie = sc.split(';')[0]; return r; };
  const mails = () => (fs.existsSync(outbox) ? fs.readFileSync(outbox, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  const order = async (id) => (await db.query('SELECT * FROM orders WHERE id = $1', [id])).rows[0];
  const job = async (id) => (await db.query('SELECT * FROM analysis_jobs WHERE order_id = $1', [id])).rows[0];
  const issue = async (count = 1, extra = {}) => { const r = await post('/api/admin/trial-codes', { count, label: '후기 체험', ...extra }, { admin: true }); assert.equal(r.status, 201, JSON.stringify(r.json)); return r.json.codes; };
  const redeem = (code, over = {}) => post('/api/trial/redeem', { code, email: 'tester@example.com', consent: true, input: CHILD, ...over });
  return { api, post, login, mails, order, job, issue, redeem, db, state, close: () => { server.close(); for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); } };
}

test('단일 판매가: 상품 가격은 50,000원 하나이고, 할인코드·카페 회원가·쿠폰 경로가 없다', async () => {
  const { PRODUCTS } = require('./secure');
  assert.equal(SUCCESS_CHILD.amount, 50000); assert.equal(PRODUCTS.success_child.amount, 50000);
  assert.equal(SUCCESS_CHILD.cafeAmount, undefined); assert.equal(PRODUCTS.success_child.cafeAmount, undefined);
  const src = fs.readFileSync(path.join(__dirname, 'secure.js'), 'utf8') + fs.readFileSync(path.join(__dirname, 'successChild.js'), 'utf8');
  assert.ok(!/DAECHIDONG|COMMON_DISCOUNT|isCommonDiscountCode|api\/discount|discount_codes|discountCode/.test(src), '할인코드 흔적이 없다');
});

maybe('결제 주문: 보낸 할인코드·금액은 무시되고 항상 서버의 50,000원으로 만들어진다', async () => {
  const env = await makeEnv();
  try {
    const o = await env.post('/api/orders', { product: 'success_child', input: CHILD, email: 'buyer@example.com', consent: true, discountCode: 'DAECHIDONG', amount: 1 });
    assert.equal(o.status, 201); assert.equal(o.json.amount, 50000); assert.equal(o.json.discount, undefined);
    assert.equal((await env.order(o.json.orderId)).amount, 50000);
    assert.equal((await env.post('/api/discount/check', { code: 'DAECHIDONG' })).status, 404);
  } finally { env.close(); }
});

maybe('운영자만 코드를 발급·조회할 수 있고, 목록과 현황에는 코드 원문이 없다', async () => {
  const env = await makeEnv();
  try {
    assert.equal((await env.post('/api/admin/trial-codes', { count: 1 })).status, 401, '로그인 없이는 발급 불가');
    assert.equal((await env.post('/api/admin/trial-codes/list', {})).status, 401);
    assert.equal((await env.login()).status, 200);
    const codes = await env.issue(3, { expiresDays: 10 });
    assert.equal(codes.length, 3); assert.ok(codes.every((c) => /^MS-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c)));
    assert.equal(new Set(codes).size, 3);
    const sum = await env.post('/api/admin/trial-codes/summary', {}, { admin: true });
    assert.deepEqual(sum.json.groups, [{ label: '후기 체험', issued: 3, used: 0, expired: 0, unused: 3 }]);
    const list = await env.post('/api/admin/trial-codes/list', {}, { admin: true });
    assert.equal(list.json.codes.length, 3);
    for (const c of codes) assert.ok(!list.text.includes(c.replace(/^MS-/, '').replace(/-/g, '')), '원문이 목록에 없다');
    const raw = (await env.db.query('SELECT code_hash FROM trial_codes')).rows.map((r) => r.code_hash).join(' ');
    for (const c of codes) assert.ok(!raw.includes(c.replace(/^MS-/, '').replace(/-/g, '')), 'DB 에도 원문이 없다(해시만)');
    assert.equal((await env.post('/api/admin/trial-codes', { count: 0 }, { admin: true })).status, 400);
    assert.equal((await env.post('/api/admin/trial-codes', { count: 101 }, { admin: true })).status, 400);
  } finally { env.close(); }
});

maybe('체험 코드: 확인(0원 표시) → 사용(결제 없이 무료 주문·결과 생성·메일) → 같은 코드·같은 이메일은 다시 못 쓴다', async () => {
  const env = await makeEnv();
  try {
    await env.login(); const [c1, c2] = await env.issue(2);
    const chk = await env.post('/api/trial/check', { code: c1 });
    assert.equal(chk.status, 200); assert.equal(chk.json.amount, 0); assert.equal(chk.json.listAmount, 50000);
    assert.equal((await env.post('/api/trial/check', { code: c1.toLowerCase().replace(/-/g, ' ') })).status, 200, '소문자·공백·하이픈 없이도 같은 코드');
    // 사용: 동의·이메일·입력이 잘못되면 코드는 소모되지 않는다
    assert.equal((await env.redeem(c1, { consent: false })).json.code, 'consent_required');
    assert.equal((await env.redeem(c1, { email: 'x' })).json.code, 'email_required');
    assert.equal((await env.redeem(c1, { input: { ...CHILD, gender: '' } })).status, 400);
    assert.equal((await env.post('/api/trial/check', { code: c1 })).status, 200, '실패한 시도는 코드를 소모하지 않는다');
    const r = await env.redeem(c1);
    assert.equal(r.status, 201); assert.equal(r.json.amount, 0); assert.equal(r.json.trial, true); assert.equal(r.json.status, 'paid');
    assert.ok(r.json.orderId && r.json.orderToken);
    const o = await env.order(r.json.orderId);
    assert.equal(o.is_comp, true); assert.equal(o.status, 'paid'); assert.equal(Number(o.amount), 0); assert.equal(o.product, 'success_child');
    assert.equal(o.input.trial, true); assert.equal(o.input.consent.version.startsWith('success-checkout'), true);
    assert.ok(await waitFor(async () => (await env.job(r.json.orderId))?.status === 'done'), '유료와 같은 경로로 결과 생성');
    assert.equal(env.state.runs, 1); assert.equal(env.state.bodies[0].type, '성공사주'); assert.equal(env.state.bodies[0].birthdate, '2012-07-14');
    assert.ok(await waitFor(() => env.mails().length >= 1), '결과 메일 발송'); assert.equal(env.mails()[0].to, 'tester@example.com');
    // 결과는 주문 토큰이 있어야 열린다(다른 주문 토큰으로는 안 열림)
    const mine = await env.post(`/api/orders/${r.json.orderId}/analysis`, { orderToken: r.json.orderToken }); assert.equal(mine.status, 200); assert.match(mine.text, /"type":"done"/);
    assert.equal((await env.post(`/api/orders/${r.json.orderId}/analysis`, { orderToken: 'wrong' })).status, 404);
    // 다시 쓰기 금지
    assert.equal((await env.redeem(c1, { email: 'other@example.com' })).json.code, 'trial_invalid', '같은 코드');
    assert.equal((await env.post('/api/trial/check', { code: c1 })).status, 400);
    const again = await env.redeem(c2); assert.equal(again.status, 409); assert.equal(again.json.code, 'trial_email_used', '같은 이메일');
    assert.equal((await env.redeem(c2, { email: 'second@example.com' })).status, 201, '다른 이메일이면 다른 코드로 가능');
    const sum = await env.post('/api/admin/trial-codes/summary', {}, { admin: true });
    assert.equal(sum.json.groups[0].used, 2);
    const list = await env.post('/api/admin/trial-codes/list', {}, { admin: true });
    assert.ok(list.json.codes.every((c) => c.status === 'used' && c.orderId));
  } finally { env.close(); }
});

maybe('잘못되었거나 기간이 지난 코드는 쓸 수 없고, 틀린 코드를 반복하면 요청이 제한된다', async () => {
  const env = await makeEnv();
  try {
    await env.login(); const [c1] = await env.issue(1);
    await env.db.query(`UPDATE trial_codes SET expires_at = NOW() - interval '1 day'`);
    assert.equal((await env.post('/api/trial/check', { code: c1 })).status, 400, '기간 지난 코드');
    assert.equal((await env.redeem(c1)).json.code, 'trial_invalid');
    let last = 0;
    for (let i = 0; i < 14; i++) last = (await env.post('/api/trial/check', { code: 'MS-AAAA-BBBB-CCCC' })).status;
    assert.equal(last, 429, '틀린 코드 반복은 제한');
  } finally { env.close(); }
});

maybe('판매 스위치가 꺼져 있으면 체험 코드도 쓸 수 없다', async () => {
  const env = await makeEnv({ enabled: false });
  try {
    await env.login(); const [c1] = await env.issue(1);
    assert.equal((await env.post('/api/trial/check', { code: c1 })).status, 400);
    assert.equal((await env.redeem(c1)).status, 400);
    assert.equal(env.state.runs, 0);
  } finally { env.close(); }
});

maybe('무료 체험 주문: 환불 대상이 아니고(결제 없음), 생성이 실패하면 환불 문구 없는 안내 메일이 가고 자동 재생성은 이어진다', async () => {
  const env = await makeEnv({ analysis: 'fail' });
  try {
    await env.login(); const [c1] = await env.issue(1);
    const r = await env.redeem(c1); assert.equal(r.status, 201);
    assert.ok(await waitFor(async () => (await env.job(r.json.orderId))?.status === 'failed'));
    const rf = await env.post(`/api/orders/${r.json.orderId}/refund`, { orderToken: r.json.orderToken });
    assert.equal(rf.status, 409); assert.equal(rf.json.code, 'not_refundable'); assert.equal(env.state.cancels.length, 0);
    assert.ok(await waitFor(() => env.mails().length >= 1));
    const notice = env.mails()[0]; assert.match(notice.subject, /아직 준비 중/); assert.match(notice.html, /무료 체험 신청/); assert.ok(!/전액 환불/.test(notice.html), '체험자에게 환불 문구 없음');
    await env.db.query(`UPDATE analysis_jobs SET updated_at = NOW() - interval '11 minutes' WHERE order_id = $1`, [r.json.orderId]);
    env.state.mode = 'ok';
    const st = await env.api.successOpsTick(); assert.equal(st.retries, 1, '체험 주문도 자동 재생성');
    assert.ok(await waitFor(async () => (await env.job(r.json.orderId))?.status === 'done'));
    process.env.SUCCESS_AUTO_REFUND_HOURS = '1';
    await env.db.query(`UPDATE orders SET paid_at = NOW() - interval '30 hours' WHERE id = $1`, [r.json.orderId]);
    await env.api.successOpsTick(); assert.equal(env.state.cancels.length, 0, '무료 체험은 자동 환불 대상이 아니다');
  } finally { env.close(); }
});
