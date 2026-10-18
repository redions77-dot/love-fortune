const test = require('node:test');
const assert = require('node:assert/strict');
const { pickClientIp, parseHops } = require('./clientIp');

const peer = '10.1.1.1';
test('hops=1: 오른쪽 끝 값을 쓰고, 앞쪽 위조값은 무시한다', () => {
  assert.equal(pickClientIp({ peer, xff: '203.0.113.7', hops: 1 }), '203.0.113.7');
  assert.equal(pickClientIp({ peer, xff: '6.6.6.6, 203.0.113.7', hops: 1 }), '203.0.113.7');
  assert.equal(pickClientIp({ peer, xff: '1.1.1.1, 2.2.2.2, 203.0.113.7', hops: 1 }), '203.0.113.7');
});
test('hops=2: 오른쪽에서 두 번째 값이 클라이언트이고, 그 앞 위조값은 무시한다', () => {
  assert.equal(pickClientIp({ peer, xff: '203.0.113.7, 172.16.0.9', hops: 2 }), '203.0.113.7');
  assert.equal(pickClientIp({ peer, xff: '6.6.6.6, 203.0.113.7, 172.16.0.9', hops: 2 }), '203.0.113.7');
});
test('hops=0: 헤더를 무시하고 소켓 주소를 쓴다', () => {
  assert.equal(pickClientIp({ peer, xff: '6.6.6.6', hops: 0 }), peer);
});
test('헤더가 없거나 IP 형식이 아니면 소켓 주소로 되돌린다', () => {
  assert.equal(pickClientIp({ peer, xff: undefined, hops: 1 }), peer);
  assert.equal(pickClientIp({ peer, xff: 'not-an-ip', hops: 1 }), peer);
  assert.equal(pickClientIp({ peer, xff: '', hops: 1 }), peer);
  assert.equal(pickClientIp({ peer: undefined, xff: '', hops: 1 }), 'unknown');
});
test('헤더가 기대보다 짧으면 가장 왼쪽 값을 쓴다(Express와 같음)', () => {
  assert.equal(pickClientIp({ peer, xff: '203.0.113.7', hops: 3 }), '203.0.113.7');
});
test('IPv4-mapped IPv6 와 IPv6 주소를 처리한다', () => {
  assert.equal(pickClientIp({ peer: '::ffff:10.1.1.1', xff: '', hops: 1 }), '10.1.1.1');
  assert.equal(pickClientIp({ peer, xff: '2001:db8::1', hops: 1 }), '2001:db8::1');
});
test('parseHops: 미설정·잘못된 값은 기본 1, 0~5 정수만 허용', () => {
  assert.equal(parseHops(undefined), 1);
  assert.equal(parseHops(''), 1);
  assert.equal(parseHops('abc'), 1);
  assert.equal(parseHops('-1'), 1);
  assert.equal(parseHops('9'), 1);
  assert.equal(parseHops('0'), 0);
  assert.equal(parseHops('2'), 2);
});
