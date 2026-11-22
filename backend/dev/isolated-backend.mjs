// 로컬 테스트 전용 백엔드 — 운영 DB 와 완전히 분리된 임시(메모리) DB(PGlite) 위에서 실제 server.js 를 실행한다.
//  - 운영·테스트 Postgres 에 연결하지 않는다(DATABASE_URL 이 있으면 시작을 거부). 프로세스를 끄면 데이터는 모두 사라진다.
//  - 결제는 포트원 V1 테스트 채널(include_sandbox 조회), AI 는 테스트 키(설정된 경우), 이메일은 임시 파일 outbox 에만 기록한다(EMAIL_TRANSPORT=test).
//  - 보통 start-test-env.ps1 이 필요한 환경변수를 채워서 실행한다. 직접 실행 시에도 아래 보호 조건을 모두 만족해야 한다.
import { createRequire } from 'node:module';
import Module from 'node:module';
import os from 'node:os';
import path from 'node:path';

const refuse = (why) => { console.error('테스트 백엔드를 시작하지 않았어요: ' + why); process.exit(2); };
if (process.env.DATABASE_URL) refuse('DATABASE_URL 이 설정돼 있어요. 이 도구는 운영·테스트 DB 에 연결하지 않아요. (환경변수를 지우고 다시 실행하세요)');
if (process.env.NODE_ENV === 'production') refuse('NODE_ENV=production 에서는 실행할 수 없어요.');
if (process.env.MYSAJU_TEST_ENV !== '1') refuse('MYSAJU_TEST_ENV=1 이 필요해요(테스트 환경 표시). start-test-env.ps1 로 실행하세요.');
if (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.length < 32) refuse('ADMIN_TOKEN(32자 이상)이 필요해요.');
if (/mysaju\.shop|onrender\.com/i.test(process.env.PORTONE_API_BASE || '') && !/iamport\.kr/i.test(process.env.PORTONE_API_BASE || '')) refuse('PORTONE_API_BASE 가 예상 밖 주소예요.');

Object.assign(process.env, { PORT: process.env.PORT || '4000' });
process.env.EMAIL_TRANSPORT = process.env.EMAIL_TRANSPORT || 'test';
process.env.EMAIL_TEST_OUTBOX = process.env.EMAIL_TEST_OUTBOX || path.join(os.tmpdir(), 'mysaju-testenv-outbox.jsonl');
process.env.ADMIN_COOKIE_INSECURE = '1';   // 로컬 http 에서 관리자 쿠키를 쓰기 위한 테스트 전용 설정

let PGlite;
try { ({ PGlite } = await import(process.env.PGLITE_PATH || '@electric-sql/pglite')); }
catch { refuse('PGlite 를 찾을 수 없어요. PGLITE_PATH 에 pglite/dist/index.js 의 file:/// 주소를 넣거나 임시 폴더에 설치하세요(저장소 의존성에는 추가하지 않음).'); }

const db = new PGlite();   // 메모리 DB
const wrap = (run) => ({
  query: async (sql, params) => {
    if (params && params.length) { const r = await run.query(sql, params); return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }; }
    const rs = await run.exec(sql); const last = rs[rs.length - 1] || { rows: [] };
    return { rows: last.rows, rowCount: last.affectedRows ?? last.rows.length };
  },
});
let chain = Promise.resolve();   // 연결이 하나라 트랜잭션끼리 섞이지 않게 줄 세운다
class FakePool {
  constructor() { Object.assign(this, wrap(db)); }
  async connect() { let free; const prev = chain; chain = new Promise((r) => { free = r; }); await prev; return { ...wrap(db), release() { free(); } }; }
  on() {}
  end() { return Promise.resolve(); }
}
const origLoad = Module._load;
Module._load = function (request) {
  if (request === 'pg') return { Pool: FakePool };
  return origLoad.apply(this, arguments);
};

console.log('[TEST-ENV] 임시 메모리 DB · 포트원 테스트 거래 조회:', process.env.PORTONE_INCLUDE_SANDBOX === 'true' ? '켜짐' : '꺼짐', '· 이메일: 임시 파일', process.env.EMAIL_TEST_OUTBOX);
createRequire(import.meta.url)('../server.js');
