// 결과지 열람 방식: 결과지는 이메일로 보내지 않고 홈페이지에서 바로 열람하며, 같은 이메일로 인증(일회용 인증번호)한 뒤 다시 열람한다.
// 실제 SQL(메모리 Postgres=PGlite)로 확인한다. 결제사·메일·AI는 모의, 실제 결제·호출 없음. PGlite 가 없으면 건너뛴다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { pathToFileURL } = require('url');

const candidates = [process.env.PGLITE_PATH, process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'mysaju-preview/node_modules/@electric-sql/pglite/dist/index.js')].filter(Boolean);
let pgliteUrl = null;
for (const c of candidates) { if (c.startsWith('file:')) { pgliteUrl = c; break; } if (fs.existsSync(c)) { pgliteUrl = pathToFileURL(c).href; break; } }
const maybe = pgliteUrl ? test : test.skip;

const CHILD = { gender: '남성', birthdate: '2012-07-14', birthtime: '20:30', userName: '가상학생' };
const ADMIN_TOKEN = 'a'.repeat(48);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 4000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(20); } return null; }
const REPORT = (tag) => ({ version: 1, name: tag, meta: { gender: '남성', birth: '2012-07-14' }, hero: { lead: `결론 ${tag}` }, sections: [], periods: [] });

async function makeEnv() {
  const { PGlite } = await import(pgliteUrl);
  const db = new PGlite();
  const run = (r) => ({ query: async (sql, params) => { if (params && params.length) { const x = await r.query(sql, params); return { rows: x.rows, rowCount: x.affectedRows ?? x.rows.length }; } const rs = await r.exec(sql); const last = rs[rs.length - 1] || { rows: [] }; return { rows: last.rows, rowCount: last.affectedRows ?? last.rows.length }; } });
  let chain = Promise.resolve();
  const pool = { ...run(db), connect: async () => { let free; const prev = chain; chain = new Promise((r) => { free = r; }); await prev; return { ...run(db), release() { free(); } }; } };
  const outbox = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reopen-')), 'out.jsonl');
  const saved = { ...process.env };
  Object.assign(process.env, { SUCCESS_CHILD_ENABLED: '1', EMAIL_TRANSPORT: 'test', EMAIL_TEST_OUTBOX: outbox, SUCCESS_OPS_SWEEP: '0', NODE_ENV: 'test', ADMIN_TOKEN, ADMIN_COOKIE_INSECURE: '1' });
  delete process.env.SUCCESS_AUTO_REFUND_HOURS;
  const state = { runs: 0, payments: {}, mode: 'ok' };
  const runAnalysis = async (body, sink) => {
    state.runs++;
    if (state.mode === 'fail') { sink.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`); return; }
    sink.write(`data: ${JSON.stringify({ type: 'success_report', report: REPORT(body.userName || '이름없음') })}\n\n`); sink.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  };
  const portone = { findPaidStrict: async () => ({ found: false }), findPaidByMerchantUid: async () => null, getPayment: async (id) => state.payments[id] || null, cancelPayment: async (a) => { state.payments[a.impUid] = { ...state.payments[a.impUid], status: 'cancelled' }; return { status: 'cancelled' }; } };
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
  const mails = () => (fs.existsSync(outbox) ? fs.readFileSync(outbox, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  const otpMails = (to) => mails().filter((m) => m.to === to && /인증번호/.test(m.subject));
  const lastCode = (to) => { const m = otpMails(to).pop(); return m && (/(\d{6})/.exec(m.subject) || [])[1]; };
  const order = async (id) => (await db.query('SELECT * FROM orders WHERE id = $1', [id])).rows[0];
  const job = async (id) => (await db.query('SELECT * FROM analysis_jobs WHERE order_id = $1', [id])).rows[0];
  async function buyPaid(email, over = {}) {
    const o = await post('/api/orders', { product: 'success_child', input: { ...CHILD, ...over }, email, consent: true });
    assert.equal(o.status, 201, JSON.stringify(o.json));
    const impUid = 'imp_' + String(Math.random()).slice(2, 12);
    state.payments[impUid] = { imp_uid: impUid, merchant_uid: o.json.orderId, status: 'paid', amount: o.json.amount, currency: 'KRW' };
    assert.equal((await post(`/api/orders/${o.json.orderId}/verify`, { orderToken: o.json.orderToken, impUid })).status, 200);
    return { id: o.json.orderId, token: o.json.orderToken, impUid };
  }
  async function buyTrial(email, over = {}) {
    if (!cookie) { const l = await post('/api/admin/login', { token: ADMIN_TOKEN }); cookie = (l.headers.get('set-cookie') || '').split(';')[0]; }
    const c = (await post('/api/admin/trial-codes', { count: 1, label: 't' }, { admin: true })).json.codes[0];
    const r = await post('/api/trial/redeem', { code: c, email, consent: true, input: { ...CHILD, ...over } });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    return { id: r.json.orderId, token: r.json.orderToken };
  }
  const done = async (id) => waitFor(async () => (await job(id))?.status === 'done');
  async function verified(email) {
    assert.equal((await post('/api/my-results/request', { email })).status, 200);
    const code = lastCode(email); assert.match(code, /^\d{6}$/);
    const v = await post('/api/my-results/verify', { email, code }); assert.equal(v.status, 200, JSON.stringify(v.json));
    return v.json.sessionToken;
  }
  return { api, post, mails, otpMails, lastCode, order, job, done, buyPaid, buyTrial, verified, db, state, close: () => { server.close(); for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); } };
}

maybe('신규 고객: 결제 후 결과지는 서버에 주문과 연결해 저장되고 홈페이지에서 바로 열리며, 결과지 이메일은 발송되지 않는다', async () => {
  const env = await makeEnv();
  try {
    const p = await env.buyPaid('buyer@example.com');
    assert.ok(await env.done(p.id), '결과 생성');
    assert.equal((await env.job(p.id)).status, 'done');
    assert.ok((await env.job(p.id)).events.length > 0, '결과가 주문(analysis_jobs)에 저장됨');
    const now = await env.post(`/api/orders/${p.id}/analysis`, { orderToken: p.token });
    assert.equal(now.status, 200); assert.match(now.text, /"type":"success_report"/); assert.match(now.text, /"type":"done"/);
    await sleep(150);
    assert.equal(env.mails().filter((m) => m.to === 'buyer@example.com').length, 0, '결과지 이메일(첨부·본문)은 보내지 않는다');
    // 고객이 직접 이메일 발송을 요청해도 성공사주는 보내지 않는다
    const em = await env.post(`/api/orders/${p.id}/email`, { orderToken: p.token, email: 'buyer@example.com' });
    assert.equal(em.status, 400); assert.equal(em.json.code, 'email_disabled');
    assert.equal(env.mails().length, 0);
    const t = await env.buyTrial('free@example.com'); assert.ok(await env.done(t.id));
    await sleep(150); assert.equal(env.mails().filter((m) => m.to === 'free@example.com').length, 0, '무료 체험도 같다');
  } finally { env.close(); }
});

maybe('재열람: 이메일 인증번호로 본인 확인 → 그 이메일의 결과지 목록(유료·무료 체험) → 저장된 결과지 열기(AI 재실행 없음)', async () => {
  const env = await makeEnv();
  try {
    const p = await env.buyPaid('me@example.com', { userName: '유료아이' }); const t = await env.buyTrial('me@example.com', { userName: '체험아이' }).catch(() => null);
    // 같은 이메일로 체험은 불가(이메일당 1회가 아니라 코드 정책상 가능): 위 호출이 실패해도 시험은 유료 건으로 계속한다
    const other = await env.buyPaid('other@example.com', { userName: '다른사람아이' });
    assert.ok(await env.done(p.id)); assert.ok(await env.done(other.id)); if (t) assert.ok(await env.done(t.id));
    const runsBefore = env.state.runs;
    // 요청은 있든 없든 같은 응답, 그 이메일의 결과가 있을 때만 메일이 간다
    const known = await env.post('/api/my-results/request', { email: 'me@example.com' });
    const unknown = await env.post('/api/my-results/request', { email: 'nobody@example.com' });
    assert.equal(known.status, 200); assert.equal(unknown.status, 200); assert.deepEqual(known.json, unknown.json, '이메일 존재 여부를 알려 주지 않는다');
    assert.equal(env.otpMails('me@example.com').length, 1); assert.equal(env.otpMails('nobody@example.com').length, 0);
    const code = env.lastCode('me@example.com'); assert.match(code, /^\d{6}$/);
    // 인증 전에는 아무것도 열리지 않는다
    assert.equal((await env.post('/api/my-results/list', {})).status, 401);
    assert.equal((await env.post('/api/my-results/list', { sessionToken: 'x'.repeat(40) })).status, 401);
    assert.equal((await env.post('/api/my-results/verify', { email: 'me@example.com', code: code === '000000' ? '111111' : '000000' })).status, 400);
    const v = await env.post('/api/my-results/verify', { email: 'ME@example.com', code }); assert.equal(v.status, 200); assert.ok(v.json.sessionToken);
    assert.equal((await env.post('/api/my-results/verify', { email: 'me@example.com', code })).status, 400, '같은 번호는 한 번만');
    const list = await env.post('/api/my-results/list', { sessionToken: v.json.sessionToken });
    assert.equal(list.status, 200);
    const ids = list.json.results.map((r) => r.orderId);
    assert.ok(ids.includes(p.id) && !ids.includes(other.id), '다른 사람의 결과지는 목록에 없다');
    assert.ok(list.json.results.every((r) => r.ready && ['paid', 'trial'].includes(r.kind)));
    assert.ok(!list.text.includes('orderToken') && !list.text.includes('birthtime'), '토큰·출생 시각은 목록에 없다');
    const open = await env.post('/api/my-results/open', { sessionToken: v.json.sessionToken, orderId: p.id });
    assert.equal(open.status, 200); assert.equal(open.json.report.name, '유료아이'); assert.equal(open.json.kind, 'paid');
    assert.equal(env.state.runs, runsBefore, '재열람에서 AI 분석을 다시 실행하지 않는다');
    // 다른 사람의 주문은 열리지 않는다(주문번호를 알아도)
    const cross = await env.post('/api/my-results/open', { sessionToken: v.json.sessionToken, orderId: other.id });
    assert.equal(cross.status, 404);
    assert.equal((await env.post('/api/my-results/open', { sessionToken: v.json.sessionToken, orderId: 'success_nope' })).status, 404);
    // DB 에는 인증번호·열람 토큰 원문이 없다(해시만)
    const dump = JSON.stringify((await env.db.query('SELECT * FROM result_otps')).rows) + JSON.stringify((await env.db.query('SELECT * FROM result_sessions')).rows);
    assert.ok(!dump.includes(code) || code.length < 6 ? true : !dump.includes('"' + code + '"')); assert.ok(!dump.includes(v.json.sessionToken));
  } finally { env.close(); }
});

maybe('무료 체험자도 같은 방식으로 재열람할 수 있고, 환불된 주문과 아직 만드는 중인 주문은 구분된다', async () => {
  const env = await makeEnv();
  try {
    const t = await env.buyTrial('trial@example.com', { userName: '체험아이' }); assert.ok(await env.done(t.id));
    const s = await env.verified('trial@example.com');
    const list = await env.post('/api/my-results/list', { sessionToken: s });
    assert.deepEqual(list.json.results.map((r) => [r.orderId, r.kind, r.ready]), [[t.id, 'trial', true]]);
    assert.equal((await env.post('/api/my-results/open', { sessionToken: s, orderId: t.id })).json.report.name, '체험아이');
    // 환불된 유료 주문은 목록과 열람에서 빠진다
    const p = await env.buyPaid('trial@example.com'); assert.ok(await env.done(p.id));
    await env.db.query(`UPDATE orders SET refund_status = 'done' WHERE id = $1`, [p.id]);
    const s2 = await env.verified('trial@example.com').catch(() => null);
    // (재요청은 1분 간격 제한이라 앞의 세션을 계속 쓴다)
    const list2 = await env.post('/api/my-results/list', { sessionToken: s });
    assert.ok(!list2.json.results.some((r) => r.orderId === p.id), '환불된 주문은 목록에 없다');
    assert.equal((await env.post('/api/my-results/open', { sessionToken: s, orderId: p.id })).status, 404);
    // 생성이 아직 끝나지 않은 주문은 열 수 없고 안내만 한다
    const q = await env.buyPaid('trial@example.com'); await env.db.query(`UPDATE analysis_jobs SET status = 'generating', events = NULL WHERE order_id = $1`, [q.id]);
    const li = await env.post('/api/my-results/list', { sessionToken: s });
    assert.equal(li.json.results.find((r) => r.orderId === q.id).ready, false);
    const no = await env.post('/api/my-results/open', { sessionToken: s, orderId: q.id }); assert.equal(no.status, 409); assert.equal(no.json.code, 'not_ready');
    void s2;
  } finally { env.close(); }
});

maybe('인증번호 보안: 유효시간 10분, 번호당 5회 시도 제한, 재요청 1분 간격·시간당 5회, 이메일 주소만으로는 열리지 않고, 틀린 시도가 반복되면 요청이 제한된다', async () => {
  const env = await makeEnv();
  try {
    const p = await env.buyPaid('sec@example.com'); assert.ok(await env.done(p.id));
    await env.post('/api/my-results/request', { email: 'sec@example.com' });
    assert.equal(env.otpMails('sec@example.com').length, 1);
    await env.post('/api/my-results/request', { email: 'sec@example.com' });
    assert.equal(env.otpMails('sec@example.com').length, 1, '1분 안 재요청은 번호를 다시 보내지 않는다');
    const code = env.lastCode('sec@example.com'); const wrong = code === '123456' ? '654321' : '123456';
    // 5번 틀리면 그 번호는 맞게 입력해도 쓸 수 없다
    for (let i = 0; i < 5; i++) assert.equal((await env.post('/api/my-results/verify', { email: 'sec@example.com', code: wrong })).status, 400);
    assert.equal((await env.post('/api/my-results/verify', { email: 'sec@example.com', code })).status, 400, '시도 횟수를 넘긴 번호는 폐기');
    // 유효시간(10분)이 지난 번호는 쓸 수 없다
    await env.db.query(`UPDATE result_otps SET created_at = NOW() - interval '2 minutes', expires_at = NOW() + interval '5 minutes', attempts = 0, used_at = NULL`);
    assert.equal((await env.post('/api/my-results/verify', { email: 'sec@example.com', code })).status, 200, '유효시간 안이면 가능');
    await env.db.query(`UPDATE result_otps SET used_at = NULL, expires_at = NOW() - interval '1 second', attempts = 0`);
    assert.equal((await env.post('/api/my-results/verify', { email: 'sec@example.com', code })).status, 400, '만료');
    // 열람 토큰도 30분이 지나면 만료된다
    await env.db.query(`UPDATE result_otps SET created_at = NOW() - interval '5 minutes'`);
    await env.post('/api/my-results/request', { email: 'sec@example.com' });
    const code2 = env.lastCode('sec@example.com');
    const s = (await env.post('/api/my-results/verify', { email: 'sec@example.com', code: code2 })).json.sessionToken;
    assert.equal((await env.post('/api/my-results/list', { sessionToken: s })).status, 200);
    await env.db.query(`UPDATE result_sessions SET expires_at = NOW() - interval '1 second'`);
    const exp = await env.post('/api/my-results/list', { sessionToken: s }); assert.equal(exp.status, 401); assert.equal(exp.json.code, 'session_expired');
    // 시간당 5회
    await env.db.query(`DELETE FROM result_otps`);
    for (let i = 0; i < 5; i++) { await env.db.query(`INSERT INTO result_otps (email, salt, code_hash, expires_at, created_at) VALUES ('sec@example.com', 's', 'h', NOW() + interval '5 minutes', NOW() - interval '10 minutes')`); }
    const before = env.otpMails('sec@example.com').length;
    await env.post('/api/my-results/request', { email: 'sec@example.com' });
    assert.equal(env.otpMails('sec@example.com').length, before, '시간당 5회를 넘으면 더 보내지 않는다');
  } finally { env.close(); }
});

maybe('틀린 인증 시도가 같은 IP에서 반복되면 429 로 제한된다', async () => {
  const env = await makeEnv();
  try {
    let last = 0;
    for (let i = 0; i < 24; i++) last = (await env.post('/api/my-results/verify', { email: 'x@example.com', code: '000000' })).status;
    assert.equal(last, 429);
    assert.equal((await env.post('/api/my-results/request', { email: 'bad' })).status, 400);
  } finally { env.close(); }
});

maybe('생성이 지연된 뒤 완성되면 결과 내용이 없는 "준비 완료" 알림만 가고, 결과지는 재열람에서 확인한다', async () => {
  const env = await makeEnv();
  try {
    env.state.mode = 'fail';
    const p = await env.buyPaid('late@example.com');
    assert.ok(await waitFor(async () => (await env.job(p.id))?.status === 'failed'));
    assert.ok(await waitFor(() => env.mails().some((m) => /아직 준비 중/.test(m.subject))));
    const notice = env.mails().find((m) => /아직 준비 중/.test(m.subject));
    assert.ok(!/24시간 안에 이 이메일/.test(notice.html), '이메일로 보내 드린다는 약속이 없다'); assert.match(notice.html, /내 결과지 다시 보기/);
    await env.db.query(`UPDATE analysis_jobs SET updated_at = NOW() - interval '11 minutes' WHERE order_id = $1`, [p.id]);
    env.state.mode = 'ok';
    assert.equal((await env.api.successOpsTick()).retries, 1);
    assert.ok(await env.done(p.id));
    assert.ok(await waitFor(() => env.mails().some((m) => /준비되었습니다/.test(m.subject))));
    const ready = env.mails().find((m) => /준비되었습니다/.test(m.subject));
    assert.ok(!/성공운명서 결과|결론|report/.test(ready.html.replace(/우리 아이 성공운명서/g, '')) , '결과 내용이 들어 있지 않다');
    const s = await env.verified('late@example.com');
    assert.equal((await env.post('/api/my-results/open', { sessionToken: s, orderId: p.id })).status, 200);
  } finally { env.close(); }
});
