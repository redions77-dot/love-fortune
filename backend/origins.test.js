const test = require('node:test');
const assert = require('node:assert');
const { parseExtraOrigins, buildAllowedOrigins } = require('./origins');

test('미설정이면 기본 목록 그대로', () => {
  assert.deepStrictEqual(buildAllowedOrigins(['https://a.shop'], undefined), ['https://a.shop']);
  assert.deepStrictEqual(buildAllowedOrigins(['https://a.shop'], ' , '), ['https://a.shop']);
});
test('지정한 정확한 출처만 추가, 중복 제거', () => {
  assert.deepStrictEqual(
    buildAllowedOrigins(['https://a.shop'], 'https://love-fortune-git-x-me.vercel.app, https://a.shop'),
    ['https://a.shop', 'https://love-fortune-git-x-me.vercel.app']);
});
test('와일드카드·경로·http·공용 도메인·잘못된 값 거부', () => {
  for (const bad of ['*', 'https://*.vercel.app', 'https://x.vercel.app/', 'https://x.vercel.app/a', 'http://x.vercel.app',
    'https://vercel.app', 'https://onrender.com', 'notaurl', 'https://u:p@x.vercel.app', 'https://x.vercel.app?q=1']) {
    assert.throws(() => parseExtraOrigins(bad), /EXTRA_ALLOWED_ORIGINS/, bad);
  }
});
test('로컬 http 는 허용', () => {
  assert.deepStrictEqual(parseExtraOrigins('http://localhost:5174'), ['http://localhost:5174']);
});
