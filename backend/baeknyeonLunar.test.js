const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { installSecureApi } = require('./secure');

// 모의 DB 로 주문 생성 라우트를 실제로 호출한다. AI·결제·이메일 호출은 없다.
async function withApp(fn) {
  const inserts = [];
  const pool = { query: async (sql, params) => { if (/INSERT INTO orders/.test(sql)) inserts.push(params); return { rows: [], rowCount: 0 }; } };
  const app = express();
  app.use(express.json());
  const api = installSecureApi({ app, pool, runAnalysis: async () => {}, computeGilil: async () => ({}), allowedOrigins: [] });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try { await fn({ url: `http://127.0.0.1:${server.address().port}`, inserts, api }); } finally { server.close(); }
}
const order = (url, input) => fetch(`${url}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: 'baeknyeon', input }) });
const input = { gender: '남', birthdate: '1990-02-30', birthtime: '12:00', userName: '민수' };

test('100년 주문: 음력 선택이 저장되고 분석 본문까지 전달된다', async () => {
  await withApp(async ({ url, inserts, api }) => {
    const res = await order(url, { ...input, isLunar: true });
    assert.equal(res.status, 201);
    const stored = JSON.parse(inserts[0][4]);
    assert.equal(stored.isLunar, true);
    assert.equal(api.analysisBodyFor({ product: 'baeknyeon', input: stored }).isLunar, true);
  });
});
test('100년 주문: 음력을 고르지 않으면 양력(false)이고, isLunar 가 없는 기존 주문도 양력으로 처리한다', async () => {
  await withApp(async ({ url, inserts, api }) => {
    await order(url, { ...input, birthdate: '1990-05-15' });
    assert.equal(JSON.parse(inserts[0][4]).isLunar, false);
    assert.equal(api.analysisBodyFor({ product: 'baeknyeon', input: { birthdate: '1990-05-15' } }).isLunar, false);
  });
});
