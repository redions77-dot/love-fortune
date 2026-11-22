const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const dev = (f) => fs.readFileSync(path.join(__dirname, 'dev', f), 'utf8');
const cleanEnv = (extra = {}) => { const e = { ...process.env, ...extra }; for (const k of ['DATABASE_URL', 'NODE_ENV', 'MYSAJU_TEST_ENV', 'ADMIN_TOKEN']) if (!(k in extra)) delete e[k]; return e; };
const run = (extra) => spawnSync(process.execPath, [path.join(__dirname, 'dev', 'isolated-backend.mjs')], { env: cleanEnv(extra), encoding: 'utf8', timeout: 20000 });
const TOKEN = 'a'.repeat(40);

test('테스트 백엔드: 운영·테스트 DB 주소가 있거나, 운영 모드이거나, 테스트 환경 표시가 없으면 시작을 거부한다(종료 코드 2)', () => {
  assert.equal(run({ DATABASE_URL: 'postgres://example', MYSAJU_TEST_ENV: '1', ADMIN_TOKEN: TOKEN }).status, 2);
  assert.equal(run({ NODE_ENV: 'production', MYSAJU_TEST_ENV: '1', ADMIN_TOKEN: TOKEN }).status, 2);
  assert.equal(run({ ADMIN_TOKEN: TOKEN }).status, 2);
  assert.equal(run({ MYSAJU_TEST_ENV: '1', ADMIN_TOKEN: 'short' }).status, 2);
});

test('테스트 백엔드: DB 는 메모리(PGlite)뿐이고 pg 연결·운영 주소 문자열이 없다', () => {
  const src = dev('isolated-backend.mjs');
  assert.ok(src.includes('new PGlite()') && src.includes("request === 'pg'"));
  assert.ok(!/new Pool\(|connectionString|onrender\.com\/|mysaju\.shop\//.test(src.replace(/\/mysaju\\.shop\|onrender\\.com\/i/g, '')));
  assert.ok(src.includes("process.exit(2)") && src.includes('DATABASE_URL') && src.includes("process.env.NODE_ENV === 'production'"));
});

test('테스트 설정 저장·실행 스크립트: 운영과 분리된 저장 위치, 키 비출력, 운영 채널 키 차단', () => {
  const set = dev('set-portone-test.ps1'), start = dev('start-test-env.ps1');
  // 저장 위치는 전용 폴더(운영 서버·DB·Anthropic 테스트 키 저장소와 별개), DPAPI 암호화
  assert.ok(set.includes("'mysaju-portone-test'") && set.includes('ConvertFrom-SecureString') && start.includes('mysaju-portone-test') && start.includes('config.dat'));
  assert.ok(!set.includes("'mysaju-test'"));
  // 운영 채널 키와 같은 값이면 저장·실행 모두 차단
  assert.ok(set.includes('$blocked -contains $ch') && start.includes('$blocked -contains $cfg.channelKey') && start.includes('exit 3'));
  // 키·시크릿을 출력하지 않는다
  for (const src of [set, start]) {
    assert.ok(!/Write-(Output|Host)[^\n]*\$(cfg\.(apiKey|apiSecret|channelKey)|key|sec|ch)\b/.test(src), '비밀값 출력 금지');
    assert.ok(!/Write-(Output|Host)[^\n]*\$env:(PORTONE|ANTHROPIC|ADMIN)/.test(src));
  }
  // 실행 시 운영 DB·운영 서버 설정을 지우고 테스트 환경 표시를 켠다
  for (const n of ['DATABASE_URL', 'ANTHROPIC_BASE_URL', 'NODE_ENV']) assert.ok(start.includes(n));
  assert.ok(start.includes("$env:MYSAJU_TEST_ENV = '1'") && start.includes("$env:PORTONE_INCLUDE_SANDBOX = 'true'") && start.includes("$env:EMAIL_TRANSPORT = 'test'"));
  assert.ok(start.includes('Remove-Item Env:VITE_API_URL'));
});
