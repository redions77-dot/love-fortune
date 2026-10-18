const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { installSecureApi } = require('./secure');

// 실제 결제사·DB 없이: 메모리 주문 저장소(모의 pool) + 모의 포트원으로 7일 지난 미결제 주문 정리를 검증한다.
// 모의 pool 은 이 코드가 쓰는 SQL 의 의미만 흉내 내며, 생성 작업(analysis_jobs)·메일 관련 쿼리가 오면 기록해 "시작하지 않았음"을 확인한다.
function makeEnv({ orders, lookup, lockOk = true, failDeleteFor = null }) {
  const db = new Map(orders.map((o) => [o.id, { status: 'pending', imp_uid: null, expired: true, amount: 1990, ...o }]));
  const calls = { portone: [], unexpected: [], released: 0, unlocked: 0 };
  const query = async (sql, params = []) => {
    if (/SELECT id, amount FROM orders WHERE status = 'pending'/.test(sql)) {
      const [batch, held] = params;
      const rows = [...db.values()].filter((o) => o.status === 'pending' && o.expired && !held.includes(o.id)).slice(0, batch).map((o) => ({ id: o.id, amount: o.amount }));
      return { rows, rowCount: rows.length };
    }
    if (/^UPDATE orders SET status = 'paid'/.test(sql.trim())) {
      const [id, impUid] = params;
      const o = db.get(id);
      if ([...db.values()].some((x) => x.imp_uid === impUid && x.id !== id)) throw Object.assign(new Error('dup'), { code: '23505' });
      if (!o || o.status !== 'pending') return { rows: [], rowCount: 0 };
      o.status = 'paid'; o.imp_uid = impUid;
      return { rows: [], rowCount: 1 };
    }
    if (/SELECT status, imp_uid FROM orders WHERE id/.test(sql)) { const o = db.get(params[0]); return { rows: o ? [{ status: o.status, imp_uid: o.imp_uid }] : [] }; }
    if (/^DELETE FROM orders WHERE id = \$1 AND status = 'pending'/.test(sql.trim())) {
      if (failDeleteFor === params[0]) throw new Error('db error');
      const o = db.get(params[0]);
      if (o && o.status === 'pending') { db.delete(params[0]); return { rowCount: 1 }; }
      return { rowCount: 0 };
    }
    if (/CREATE|ALTER|INSERT INTO (results|free_results|email_sends)|DELETE FROM (free_results|admin_sessions|email_sends)/.test(sql)) return { rows: [], rowCount: 0 };
    calls.unexpected.push(sql.trim().slice(0, 60));
    return { rows: [], rowCount: 0 };
  };
  const pool = {
    query,
    connect: async () => ({
      query: async (sql) => {
        if (/pg_try_advisory_lock/.test(sql)) return { rows: [{ ok: lockOk }] };
        if (/pg_advisory_unlock/.test(sql)) { calls.unlocked++; return { rows: [] }; }
        return { rows: [] };
      },
      release: () => { calls.released++; },
    }),
  };
  const portone = {
    findPaidStrict: async (id) => { calls.portone.push(id); return lookup(id); },
    getPayment: async () => null,
    findPaidByMerchantUid: async () => null,
  };
  const app = express();
  const api = installSecureApi({ app, pool, runAnalysis: async () => {}, computeGilil: async () => ({}), allowedOrigins: [], portone });
  return { api, db, calls };
}
const paid = (id, o = {}) => ({ found: true, payment: { imp_uid: 'imp_' + id.replace(/\W/g, ''), merchant_uid: id, status: 'paid', amount: 1990, currency: 'KRW', ...o } });
const none = { found: false };
const run = (env, opts = { gapMs: 0 }) => env.api.reconcileExpiredPending(opts);

test('결제 완료가 확인된 주문은 기존 검증을 거쳐 paid 로 복구되고 삭제되지 않는다', async () => {
  const env = makeEnv({ orders: [{ id: 'o1' }], lookup: (id) => paid(id) });
  const r = await run(env);
  assert.equal(r.recovered, 1); assert.equal(r.deleted, 0);
  assert.equal(env.db.get('o1').status, 'paid');
  assert.deepEqual(env.calls.unexpected, [], '생성 작업·메일 등 다른 쿼리를 시작하지 않는다');
});
test('결제사가 결제 없음을 분명히 답한 주문만 삭제한다', async () => {
  const env = makeEnv({ orders: [{ id: 'o1' }], lookup: () => none });
  const r = await run(env);
  assert.equal(r.deleted, 1); assert.equal(env.db.has('o1'), false);
});
test('조회 실패·시간 초과·불명확한 응답은 미결제로 취급하지 않고 삭제를 보류한다', async () => {
  for (const code of ['portone_unavailable', 'portone_ambiguous', 'portone_auth_failed', 'portone_not_configured', 'ETIMEDOUT']) {
    const env = makeEnv({ orders: [{ id: 'o1' }], lookup: () => { throw Object.assign(new Error(code), { code }); } });
    const r = await run(env);
    assert.equal(r.deleted, 0, code); assert.equal(env.db.has('o1'), true, code); assert.equal(env.db.get('o1').status, 'pending', code);
  }
});
test('금액·주문번호·통화·상태가 맞지 않으면 복구도 삭제도 하지 않고 보류한다', async () => {
  const cases = { 금액: { amount: 100 }, 주문번호: { merchant_uid: 'other' }, 통화: { currency: 'USD' }, 상태: { status: 'cancelled' } };
  for (const [name, patch] of Object.entries(cases)) {
    const env = makeEnv({ orders: [{ id: 'o1' }], lookup: (id) => paid(id, patch) });
    const r = await run(env);
    assert.equal(r.recovered, 0, name); assert.equal(r.deleted, 0, name); assert.equal(env.db.get('o1').status, 'pending', name);
  }
});
test('이미 다른 주문에 쓰인 결제는 중복 처리하지 않는다', async () => {
  // 두 주문이 같은 imp_uid 를 가리킨다(주문번호는 각자 맞음). 한 결제는 한 주문에만 연결돼야 한다.
  const env = makeEnv({ orders: [{ id: 'a' }, { id: 'b' }], lookup: (id) => paid(id, { imp_uid: 'imp_shared' }) });
  const r = await run(env);
  assert.equal(r.recovered, 1); assert.equal(r.held, 1); assert.equal(r.deleted, 0);
  assert.equal(env.db.get('a').status, 'paid'); assert.equal(env.db.get('a').imp_uid, 'imp_shared');
  assert.equal(env.db.get('b').status, 'pending'); assert.equal(env.db.get('b').imp_uid, null);
});
test('재실행해도 같은 주문을 다시 처리하지 않는다(복구·삭제 완료분은 대상에서 빠지고, 보류분은 재조회하지 않는다)', async () => {
  const env = makeEnv({ orders: [{ id: 'ok' }, { id: 'gone' }, { id: 'held' }], lookup: (id) => (id === 'ok' ? paid(id) : id === 'gone' ? none : paid(id, { amount: 1 })) });
  await run(env);
  const first = env.calls.portone.length;
  assert.equal(first, 3);
  const r2 = await run(env);
  assert.equal(r2.checked, 0); assert.equal(env.calls.portone.length, first, '결제사를 다시 부르지 않는다');
  assert.equal(env.db.get('ok').status, 'paid'); assert.equal(env.db.has('gone'), false); assert.equal(env.db.get('held').status, 'pending');
});
test('동시에 두 번 실행해도 결제사 조회·결제 처리는 한 번만 일어난다(프로세스 내)', async () => {
  const env = makeEnv({ orders: [{ id: 'o1' }, { id: 'o2' }], lookup: (id) => paid(id) });
  const [a, b] = await Promise.all([run(env), run(env)]);
  assert.equal([a, b].filter((r) => r.skipped === 'in_process').length, 1);
  assert.equal(env.calls.portone.length, 2);
  assert.equal([...env.db.values()].filter((o) => o.status === 'paid').length, 2);
});
test('다른 인스턴스가 이미 실행 중이면(advisory lock 실패) 아무것도 하지 않고 연결을 반납한다', async () => {
  const env = makeEnv({ orders: [{ id: 'o1' }], lookup: () => none, lockOk: false });
  const r = await run(env);
  assert.equal(r.skipped, 'locked'); assert.equal(env.calls.portone.length, 0); assert.equal(env.db.has('o1'), true); assert.equal(env.calls.released, 1);
});
test('락과 연결은 정상 종료 시 반납된다', async () => {
  const env = makeEnv({ orders: [{ id: 'o1' }], lookup: () => none });
  await run(env);
  assert.equal(env.calls.unlocked, 1); assert.equal(env.calls.released, 1);
});
test('한 번에 확인하는 주문 수를 제한한다(결제사 요청량 제한)', async () => {
  const env = makeEnv({ orders: Array.from({ length: 50 }, (_, i) => ({ id: 'o' + i })), lookup: () => none });
  const r = await run(env);
  assert.equal(r.checked, 20); assert.equal(env.calls.portone.length, 20); assert.equal(env.db.size, 30);
});
test('조회 실패가 연속되면 그 실행을 멈춘다(결제사 장애 시 계속 두드리지 않음)', async () => {
  const env = makeEnv({ orders: Array.from({ length: 10 }, (_, i) => ({ id: 'o' + i })), lookup: () => { throw Object.assign(new Error('x'), { code: 'portone_unavailable' }); } });
  const r = await run(env);
  assert.equal(r.skipped, 'lookup_failures'); assert.equal(env.calls.portone.length, 3); assert.equal(env.db.size, 10);
});
test('계속 조회에 실패하는 주문이 오래된 순서로 앞을 막지 않는다(다음 실행은 건너뛰고 나머지를 처리)', async () => {
  const bad = new Set(['o0', 'o1', 'o2']);
  const env = makeEnv({
    orders: Array.from({ length: 6 }, (_, i) => ({ id: 'o' + i })),
    lookup: (id) => { if (bad.has(id)) throw Object.assign(new Error('x'), { code: 'portone_unavailable' }); return none; },
  });
  const r1 = await run(env);
  assert.equal(r1.skipped, 'lookup_failures'); assert.deepEqual(env.calls.portone, ['o0', 'o1', 'o2']);
  const r2 = await run(env);
  assert.deepEqual(env.calls.portone.slice(3), ['o3', 'o4', 'o5'], '앞서 실패한 3건은 다시 조회하지 않고 나머지를 확인한다');
  assert.equal(r2.deleted, 3);
  assert.equal([...env.db.keys()].sort().join(), 'o0,o1,o2', '조회에 실패한 주문은 지우지 않는다');
});
test('한 주문의 오류가 나머지 정리를 멈추지 않는다', async () => {
  const env = makeEnv({ orders: [{ id: 'bad' }, { id: 'good' }], lookup: () => none, failDeleteFor: 'bad' });
  const r = await run(env);
  assert.equal(env.db.has('bad'), true); assert.equal(env.db.has('good'), false); assert.equal(r.deleted, 1);
});
test('7일이 지나지 않은 미결제 주문은 대상이 아니다', async () => {
  const env = makeEnv({ orders: [{ id: 'fresh', expired: false }], lookup: () => none });
  const r = await run(env);
  assert.equal(r.checked, 0); assert.equal(env.db.has('fresh'), true);
});
