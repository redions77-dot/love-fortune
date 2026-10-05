// 심화 분석 자동 이메일: 이메일이 있는 주문만 생성 완료 후 한 번 자동 발송하고, 발송이 실패해도 완료된 결과는 남는다.
// 실제 DB·AI·메일 없이 installSecureApi에 가짜 app/pool/runAnalysis를 넣고, 메일은 EMAIL_TRANSPORT=test(파일 outbox)를 쓴다.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.EMAIL_TRANSPORT = 'test';
delete process.env.NODE_ENV;
const S = require('./secure');

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOKEN = 'order-token-for-test';

function setup({ product, email, mailFails = false }) {
  const outbox = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mail-')), 'outbox.jsonl');
  process.env.EMAIL_TEST_OUTBOX = outbox;
  if (mailFails) process.env.EMAIL_TEST_FAIL = '1'; else delete process.env.EMAIL_TEST_FAIL;

  const db = {
    order: { id: 'ord1', product, amount: S.PRODUCTS[product].amount, token_hash: sha256(TOKEN), status: 'paid', is_comp: false, email: email || null,
      input: { gender: '여', birthdate: '1990-01-01', userName: '테스트' } },
    job: null, results: [], emailSends: [], afterJobChecks: 0, aiCalls: 0,
  };
  const query = async (sql, params = []) => {
    if (/CREATE TABLE|CREATE INDEX|ALTER TABLE|DELETE FROM/.test(sql)) return { rows: [], rowCount: 0 };
    if (/SELECT \* FROM orders WHERE id/.test(sql)) return { rows: [db.order] };
    if (/SELECT email FROM orders WHERE id/.test(sql)) { db.afterJobChecks++; return { rows: [{ email: db.order.email }] }; }
    if (/INSERT INTO analysis_jobs/.test(sql)) {
      if (db.job) return { rows: [] };
      db.job = { order_id: params[0], status: 'generating', attempts: 1, events: null, result_text: null };
      return { rows: [{ attempts: 1 }] };
    }
    if (/SELECT \* FROM analysis_jobs/.test(sql)) return { rows: db.job ? [db.job] : [] };
    if (/UPDATE analysis_jobs SET status = 'done'/.test(sql)) { Object.assign(db.job, { status: 'done', events: JSON.parse(params[1]), result_text: params[2] }); return { rows: [], rowCount: 1 }; }
    if (/UPDATE analysis_jobs SET status = 'failed'/.test(sql)) { Object.assign(db.job, { status: 'failed' }); return { rows: [], rowCount: 1 }; }
    if (/UPDATE analysis_jobs SET lease_until/.test(sql)) return { rows: [], rowCount: 0 };
    if (/INSERT INTO results/.test(sql)) {
      const [em, type, text, name, orderId] = params;
      if (!db.results.some((r) => r.order_id === orderId && r.email === em)) db.results.push({ email: em, type, result_text: text, user_name: name, order_id: orderId });
      return { rows: [], rowCount: 1 };
    }
    throw new Error('예상하지 못한 쿼리: ' + sql.slice(0, 80));
  };
  const pool = {
    query,
    async connect() {
      return {
        async query(sql, params = []) {
          if (/INSERT INTO email_sends/.test(sql)) { db.emailSends.push(params); return { rows: [] }; }
          if (/COUNT\(\*\)/.test(sql)) return { rows: [{ order_day: 0, order_recent: 0, result_day: 0, result_recent: 0, recipient_day: 0 }] };
          return { rows: [] }; // BEGIN / COMMIT / ROLLBACK / advisory lock
        },
        release() {},
      };
    },
  };
  const routes = {};
  const app = new Proxy({}, { get: (_, method) => (p, ...handlers) => { routes[`${String(method).toUpperCase()} ${p}`] = handlers[handlers.length - 1]; } });
  const runAnalysis = async (_body, sink) => {
    db.aiCalls++;
    sink.write(`data: ${JSON.stringify({ type: 'saju', 사주: {} })}\n\n`);
    sink.write(`data: ${JSON.stringify({ text: '## 심화 분석\n한 가지 풀이 본문입니다.' })}\n\n`);
    sink.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  };
  S.installSecureApi({ app, pool, runAnalysis, computeGilil: () => ({}), allowedOrigins: [] });

  const outboxMails = () => (fs.existsSync(outbox) ? fs.readFileSync(outbox, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  async function runAnalysisRequest() {
    let ended; const done = new Promise((r) => { ended = r; });
    const closers = [];
    const res = { writableEnded: false, destroyed: false, headersSent: false, setHeader() {}, flushHeaders() { this.headersSent = true; }, write() { return true; }, on(ev, fn) { if (ev === 'close') closers.push(fn); return this; },
      end() { this.writableEnded = true; closers.forEach((f) => f()); ended(); }, status() { return this; }, json() { this.end(); return this; } };
    const req = { params: { id: 'ord1' }, body: { orderToken: TOKEN }, method: 'POST', path: '/api/orders/ord1/analysis', get: () => undefined, socket: { remoteAddress: '127.0.0.1' } };
    await routes['POST /api/orders/:id/analysis'](req, res);
    await done;
  }
  const afterJobSettled = async (checksBefore = 0) => { for (let i = 0; i < 100 && db.afterJobChecks <= checksBefore; i++) await sleep(20); await sleep(50); };
  return { db, runAnalysisRequest, outboxMails, afterJobSettled };
}

test('심화 상품만 자동 발송이 켜지고 다른 상품 설정은 그대로다', () => {
  assert.strictEqual(S.PRODUCTS.deep.autoEmail, true);
  assert.strictEqual(S.PRODUCTS.full_saju.autoEmail, true);
  assert.strictEqual(S.PRODUCTS.full_child.autoEmail, true);
  assert.strictEqual(S.PRODUCTS.full_nohu.autoEmail, true);
  assert.strictEqual(S.PRODUCTS.gunghab.autoEmail, false);
  assert.strictEqual(S.PRODUCTS.baeknyeon.autoEmail, false);
  assert.strictEqual(S.PRODUCTS.gilil.autoEmail, undefined);
});

test('이메일이 있는 심화 주문: 생성 완료 후 그 이메일로 한 번 자동 발송하고 결과도 저장', async () => {
  const t = setup({ product: 'deep', email: 'buyer@example.com' });
  await t.runAnalysisRequest();
  await t.afterJobSettled();
  const mails = t.outboxMails();
  assert.strictEqual(mails.length, 1);
  assert.strictEqual(mails[0].to, 'buyer@example.com');
  assert.ok(mails[0].subject.includes('심화 분석'));
  assert.ok(mails[0].html.includes('한 가지 풀이 본문'));
  assert.strictEqual(t.db.job.status, 'done');
  assert.strictEqual(t.db.results.length, 1);
  assert.strictEqual(t.db.emailSends.length, 1);
});

test('이메일이 없는 심화 주문: 발송하지 않고 결과는 완료 상태로 남는다', async () => {
  const t = setup({ product: 'deep', email: null });
  await t.runAnalysisRequest();
  await t.afterJobSettled();
  assert.strictEqual(t.outboxMails().length, 0);
  assert.strictEqual(t.db.emailSends.length, 0);
  assert.strictEqual(t.db.results.length, 0);
  assert.strictEqual(t.db.job.status, 'done');
  assert.ok(t.db.job.result_text.includes('한 가지 풀이 본문'));
});

test('메일 발송이 실패해도 완료된 결과는 보존되고(주문 결과·results 행), 운영자가 다시 보낼 수 있다', async () => {
  const t = setup({ product: 'deep', email: 'buyer@example.com', mailFails: true });
  await t.runAnalysisRequest();
  await t.afterJobSettled();
  assert.strictEqual(t.outboxMails().length, 0);              // 실제로 나간 메일 없음
  assert.strictEqual(t.db.job.status, 'done');                // 결과 보존
  assert.ok(t.db.job.result_text.includes('한 가지 풀이 본문'));
  assert.ok(Array.isArray(t.db.job.events) && t.db.job.events.length > 0);
  assert.strictEqual(t.db.results.length, 1);                 // 발송 전에 results에 저장됨
  assert.strictEqual(t.db.order.email, 'buyer@example.com');
});

test('같은 주문의 결과를 다시 열어도 AI는 다시 호출되지 않고 자동 메일도 다시 가지 않는다', async () => {
  const t = setup({ product: 'deep', email: 'buyer@example.com' });
  await t.runAnalysisRequest();
  await t.afterJobSettled();
  const checks = t.db.afterJobChecks;
  await t.runAnalysisRequest();                               // 완료된 결과를 다시 전송하는 경로
  await sleep(100);
  assert.strictEqual(t.db.aiCalls, 1);
  assert.strictEqual(t.db.afterJobChecks, checks);
  assert.strictEqual(t.outboxMails().length, 1);
});

test('기존 자동 발송 상품(전체 분석)은 그대로 자동 발송, 궁합은 이메일이 있어도 자동 발송하지 않는다', async () => {
  const full = setup({ product: 'full_saju', email: 'a@example.com' });
  await full.runAnalysisRequest(); await full.afterJobSettled();
  assert.strictEqual(full.outboxMails().length, 1);

  const gh = setup({ product: 'gunghab', email: 'a@example.com' });
  await gh.runAnalysisRequest(); await gh.afterJobSettled();
  assert.strictEqual(gh.outboxMails().length, 0);
  assert.strictEqual(gh.db.job.status, 'done');
});
