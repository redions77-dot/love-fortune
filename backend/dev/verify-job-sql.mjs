// 잘린(max_tokens) 결과 처리와 미결제 주문 정리의 SQL 을 "실제 Postgres 엔진(PGlite, WASM)"으로 검증한다.
// 운영·테스트 DB 에 접속하지 않고, AI·결제·이메일 발송도 하지 않는다(메일은 EMAIL_TRANSPORT=test 의 출력 파일로만 기록).
//   준비(저장소 의존성에는 추가하지 않음): 임시 폴더에서 npm i @electric-sql/pglite
//   실행: PGLITE_PATH=file:///<임시폴더>/node_modules/@electric-sql/pglite/dist/index.js node dev/verify-job-sql.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

const require = createRequire(import.meta.url);
const { PGlite } = await import(process.env.PGLITE_PATH || '@electric-sql/pglite');

const outbox = path.join(os.tmpdir(), `mysaju-outbox-${process.pid}.jsonl`);
fs.rmSync(outbox, { force: true });
Object.assign(process.env, {
  EMAIL_TRANSPORT: 'test', EMAIL_TEST_OUTBOX: outbox, NODE_ENV: 'test', ADMIN_COOKIE_INSECURE: '1',
  ADMIN_TOKEN: 'test-admin-token-0123456789-0123456789-abcdef',
});
const { installSecureApi } = require('../secure');

const db = new PGlite();
const wrap = (run) => ({
  query: async (sql, params) => {
    if (params && params.length) { const r = await run.query(sql, params); return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }; }
    const rs = await run.exec(sql); const last = rs[rs.length - 1] || { rows: [] };
    return { rows: last.rows, rowCount: last.affectedRows ?? last.rows.length };
  },
});
const pool = { ...wrap(db), connect: async () => ({ ...wrap(db), release() {} }) };

let mode = 'ok';            // runAnalysis 모의 동작: ok | truncated | fail
let analysisCalls = 0;
const runAnalysis = async (_body, res) => {
  analysisCalls++;
  await new Promise((r) => setTimeout(r, 30));
  if (mode === 'fail') { res.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`); return res.end(); }
  res.write(`data: ${JSON.stringify({ text: mode === 'truncated' ? '[잘린 앞부분]' : '[전체 결과]' })}\n\n`);
  if (mode === 'truncated') res.write(`data: ${JSON.stringify({ type: 'truncated' })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
};
const ORIGIN = 'http://localhost:5173';
const start = async (extra = {}) => {
  const app = express(); app.use(express.json());
  const api = installSecureApi({ app, pool, runAnalysis, computeGilil: async () => ({}), allowedOrigins: [ORIGIN], ...extra });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  return { api, server, url: `http://127.0.0.1:${server.address().port}` };
};

const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.join(' ')); };
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { (cond ? pass++ : fail++); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`); };
const jpost = (url, body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const job = async (id) => (await pool.query('SELECT status, last_error, events, result_text, attempts FROM analysis_jobs WHERE order_id = $1', [id])).rows[0];
const waitSettled = async (id) => { for (let i = 0; i < 100; i++) { const j = await job(id); if (j && j.status !== 'generating') return j; await new Promise((r) => setTimeout(r, 50)); } return job(id); };
const mails = () => (fs.existsSync(outbox) ? fs.readFileSync(outbox, 'utf8').trim().split('\n').filter(Boolean).length : 0);
const resultRows = async (id) => (await pool.query('SELECT 1 FROM results WHERE order_id = $1', [id])).rows.length;

let { server, url } = await start();
await jpost(`${url}/api/admin/login`, { token: 'x' }, { Origin: ORIGIN });   // 스키마 생성 유도
const mkOrder = async (email) => {
  const r = await (await jpost(`${url}/api/orders`, { product: 'deep', email, input: { gender: '남', birthdate: '1990-05-15', birthtime: '12:00' } })).json();
  await pool.query(`UPDATE orders SET status = 'paid', imp_uid = $2, paid_at = NOW() WHERE id = $1`, [r.orderId, 'imp_' + r.orderId.slice(-8)]);
  return r;
};
const view = (o) => jpost(`${url}/api/orders/${o.orderId}/analysis`, { orderToken: o.orderToken });
const loginCookie = async () => {
  const r = await jpost(`${url}/api/admin/login`, { token: process.env.ADMIN_TOKEN }, { Origin: ORIGIN });
  return (r.headers.get('set-cookie') || '').split(';')[0];
};

console.log('== 정상 생성(대조군)');
mode = 'ok';
const okOrder = await mkOrder('normal@example.test');
await (await view(okOrder)).text(); const okJob = await waitSettled(okOrder.orderId);
check('정상: done 이고 last_error 없음', okJob.status === 'done' && okJob.last_error === null, JSON.stringify(okJob.last_error));
await new Promise((r) => setTimeout(r, 200));
check('정상: 결과 보관 + 자동 메일 발송', (await resultRows(okOrder.orderId)) === 1 && mails() === 1, `results=${await resultRows(okOrder.orderId)} mails=${mails()}`);

console.log('== A. 잘린 생성');
mode = 'truncated';
const o = await mkOrder('cust@example.test');
const mailsBefore = mails();
const body = await (await view(o)).text();
const j1 = await waitSettled(o.orderId); await new Promise((r) => setTimeout(r, 200));
check('A1 고객에게 truncated 이벤트가 전달된다', body.includes('"type":"truncated"') && body.includes('"type":"done"'));
check('A2 done + last_error=truncated 로 저장, 부분 결과 보존', j1.status === 'done' && j1.last_error === 'truncated' && String(j1.result_text).includes('[잘린 앞부분]'), JSON.stringify([j1.status, j1.last_error]));
check('A3 정상 완료 취급 안 함: 결과 보관 없음·자동 메일 없음', (await resultRows(o.orderId)) === 0 && mails() === mailsBefore, `results=${await resultRows(o.orderId)} mails=${mails() - mailsBefore}`);

console.log('== B. 재조회·서버 재시작');
await new Promise((r) => server.close(r));
({ server, url } = await start());            // 새 인스턴스 = 재시작(메모리의 진행 중 작업 없음)
const callsBefore = analysisCalls;
const replay = await (await view(o)).text();
check('B1 재시작 후에도 같은 결과와 truncated 표시를 다시 받는다', replay.includes('[잘린 앞부분]') && replay.includes('"type":"truncated"'));
check('B2 AI 를 다시 호출하지 않는다', analysisCalls === callsBefore);

console.log('== C. 고객 메일 차단');
const cm = await jpost(`${url}/api/orders/${o.orderId}/email`, { orderToken: o.orderToken, email: 'cust@example.test' });
const cmBody = await cm.json();
check('C1 잘린 결과는 메일로 보내지 않는다(409 result_truncated)', cm.status === 409 && cmBody.code === 'result_truncated', JSON.stringify([cm.status, cmBody]));
check('C2 메일이 나가지 않았다', mails() === mailsBefore);

console.log('== D. 관리자 식별·발송 차단');
const cookie = await loginCookie();
const adminPost = (p, b = {}) => jpost(`${url}${p}`, b, { Origin: ORIGIN, Cookie: cookie });
const s1 = await (await adminPost('/api/admin/orders/search', { orderId: o.orderId })).json();
check('D1 검색 결과에서 잘린 결과로 식별된다', s1.orders?.[0]?.jobTruncated === true && s1.orders[0].jobStatus === 'done', JSON.stringify(s1.orders?.[0]));
const sd = await adminPost(`/api/admin/orders/${o.orderId}/send`, { email: 'cust@example.test' });
check('D2 관리자 발송도 막힌다(409 result_truncated)', sd.status === 409 && (await sd.json()).code === 'result_truncated');
check('D3 정상 주문은 잘림으로 표시되지 않는다', (await (await adminPost('/api/admin/orders/search', { orderId: okOrder.orderId })).json()).orders[0].jobTruncated === false);

console.log('== E. 재생성이 실패하면 기존 부분 결과를 보존');
mode = 'fail';
const re1 = await adminPost(`/api/admin/orders/${o.orderId}/regenerate`);
check('E1 잘린 결과는 재생성할 수 있다(202)', re1.status === 202, String(re1.status));
const j2 = await waitSettled(o.orderId);
check('E2 실패해도 done/truncated 로 돌아오고 부분 결과가 그대로 남는다', j2.status === 'done' && j2.last_error === 'truncated' && JSON.stringify(j2.events) === JSON.stringify(j1.events) && j2.result_text === j1.result_text, JSON.stringify([j2.status, j2.last_error]));
check('E3 실패 후 고객 재조회는 여전히 부분 결과 + 잘림 표시', (await (await view(o)).text()).includes('"type":"truncated"'));

console.log('== F. 동시 재생성 요청은 한 번만 선점');
mode = 'ok';
const callsF = analysisCalls;
const [r1, r2] = await Promise.all([adminPost(`/api/admin/orders/${o.orderId}/regenerate`), adminPost(`/api/admin/orders/${o.orderId}/regenerate`)]);
check('F1 하나만 202, 나머지는 409', [r1.status, r2.status].sort().join() === '202,409', `${r1.status},${r2.status}`);
const j3 = await waitSettled(o.orderId); await new Promise((r) => setTimeout(r, 200));
check('F2 AI 는 한 번만 호출된다', analysisCalls === callsF + 1, `calls=${analysisCalls - callsF}`);
check('F3 성공하면 새 결과로 교체되고 잘림 표시가 사라진다', j3.status === 'done' && j3.last_error === null && String(j3.result_text).includes('[전체 결과]'), JSON.stringify([j3.status, j3.last_error]));
check('F4 이제 정상 완료로 결과 보관 + 메일 1회 발송', (await resultRows(o.orderId)) === 1 && mails() === mailsBefore + 1, `results=${await resultRows(o.orderId)} mails=${mails() - mailsBefore}`);
check('F5 완료된 주문은 다시 재생성되지 않는다(409)', (await adminPost(`/api/admin/orders/${o.orderId}/regenerate`)).status === 409);
// 방금 자동 메일이 나가 기존 발송 빈도 제한(주문당 30초)이 걸려 있으므로, 시간이 지난 상황으로 맞춘 뒤 확인한다.
await pool.query('DELETE FROM email_sends WHERE order_id = $1', [o.orderId]);
const sd2 = await adminPost(`/api/admin/orders/${o.orderId}/send`, { email: 'cust@example.test' });
check('F6 정상 완료 후에는 관리자가 발송할 수 있다', sd2.status === 200, String(sd2.status));

console.log('== G. 재생성 도중 서버가 멈춘 경우(임대 만료)');
mode = 'truncated';
const g = await mkOrder(null);
await (await view(g)).text(); await waitSettled(g.orderId);
const gBefore = await job(g.orderId);
await pool.query(`UPDATE analysis_jobs SET status = 'generating', last_error = 'regenerating', lease_until = NOW() - INTERVAL '1 minute' WHERE order_id = $1`, [g.orderId]);
mode = 'fail';
await (await view(g)).text();                                  // 고객이 다시 열면 만료된 작업을 이어받아 시도하지만 실패
const gAfter = await waitSettled(g.orderId);
check('G1 이어받아 실패해도 부분 결과가 보존되고 다시 잘린 결과로 돌아온다', gAfter.status === 'done' && gAfter.last_error === 'truncated' && JSON.stringify(gAfter.events) === JSON.stringify(gBefore.events), JSON.stringify([gAfter.status, gAfter.last_error]));

console.log('== H. 일반 실패 작업은 기존과 동일');
mode = 'fail';
const h = await mkOrder(null);
await (await view(h)).text(); const hj = await waitSettled(h.orderId);
check('H1 일반 실패는 failed + events 비움(기존 동작)', hj.status === 'failed' && hj.events === null && hj.last_error !== 'truncated', JSON.stringify([hj.status, hj.last_error]));

console.log('== I. 7일 지난 미결제 주문 정리(실제 SQL)');
const mkPending = async (id, days) => pool.query(`INSERT INTO orders (id, product, amount, token_hash, input, status, created_at) VALUES ($1, 'deep', 9900, 'h', '{}'::jsonb, 'pending', NOW() - make_interval(days => $2))`, [id, days]);
for (const [id, d] of [['old-paid', 8], ['old-none', 8], ['old-held', 8], ['old-mismatch', 8], ['fresh', 1]]) await mkPending(id, d);
const looked = [];
const fakePortone = {
  findPaidStrict: async (id) => {
    looked.push(id);
    if (id === 'old-paid') return { found: true, payment: { imp_uid: 'imp_realpaid', merchant_uid: id, status: 'paid', amount: 9900, currency: 'KRW' } };
    if (id === 'old-mismatch') return { found: true, payment: { imp_uid: 'imp_mismatch', merchant_uid: id, status: 'paid', amount: 1, currency: 'KRW' } };
    if (id === 'old-none') return { found: false };
    throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
  },
  getPayment: async () => null,
  findPaidByMerchantUid: async () => null,
};
const second = await start({ portone: fakePortone });
const callsBeforeI = analysisCalls, mailsBeforeI = mails();
const st = await second.api.reconcileExpiredPending({ gapMs: 0 });
const rows = Object.fromEntries((await pool.query("SELECT id, status, imp_uid FROM orders WHERE id LIKE 'old-%' OR id = 'fresh'")).rows.map((r) => [r.id, r]));
check('I1 결제 확인된 주문은 paid 로 복구되고 남는다', rows['old-paid']?.status === 'paid' && rows['old-paid'].imp_uid === 'imp_realpaid', JSON.stringify(rows['old-paid']));
check('I2 결제 없음이 확인된 주문만 삭제된다', !rows['old-none']);
check('I3 조회 실패·금액 불일치는 지우지 않고 pending 으로 보류', rows['old-held']?.status === 'pending' && rows['old-mismatch']?.status === 'pending');
check('I4 7일이 지나지 않은 주문은 대상이 아니다(조회도 안 함)', rows['fresh']?.status === 'pending' && !looked.includes('fresh'));
check('I5 복구해도 생성·메일을 시작하지 않는다', analysisCalls === callsBeforeI && mails() === mailsBeforeI && (await pool.query("SELECT 1 FROM analysis_jobs WHERE order_id = 'old-paid'")).rows.length === 0);
check('I6 통계가 맞다(확인 4, 복구 1, 삭제 1, 보류 2)', st.checked === 4 && st.recovered === 1 && st.deleted === 1 && st.held === 2, JSON.stringify(st));
const lookedBefore = looked.length;
const st2 = await second.api.reconcileExpiredPending({ gapMs: 0 });
check('I7 재실행하면 복구·삭제된 건과 보류한 건을 다시 조회하지 않는다', st2.checked === 0 && looked.length === lookedBefore, JSON.stringify(st2));
second.server.close();

console.log('== J. 정기 정리 쿼리(실제 SQL)');
await new Promise((r) => setTimeout(r, 5800));   // 서버 기동 5초 뒤 한 번 실행되는 cleanup 이 오류 없이 도는지
check('J1 정기 정리가 SQL 오류 없이 실행된다', !errors.some((e) => e.includes('정리 작업 실패')), errors.filter((e) => e.includes('정리 작업')).join(' | '));

server.close();
console.error = origError;
console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
fs.rmSync(outbox, { force: true });
process.exit(fail ? 1 : 0);
