// 운영자용: 무료 체험 코드 발급·현황·목록. 관리자 토큰은 환경변수로만 받고 출력·저장하지 않는다(trial-codes.ps1 이 입력 창으로 받아 이 프로세스에만 전달).
//   node dev/trial-codes.cjs issue <개수> <라벨> [유효일수]    → 새 코드 발급(코드 원문은 이 출력에서 한 번만 보인다)
//   node dev/trial-codes.cjs summary                          → 라벨별 발급/사용/미사용/만료 수
//   node dev/trial-codes.cjs list [라벨]                       → 코드 목록(원문 없음: 앞 8글자 식별자·상태·주문번호)
const { TRIAL_API_BASE: base, TRIAL_ORIGIN: origin, TRIAL_ADMIN_TOKEN: token } = process.env;
(async () => {
  if (!base || !origin || !token) { console.error('필요한 값이 없습니다.'); process.exit(2); }
  const [action, a1, a2, a3] = process.argv.slice(2);
  const call = async (p, body, cookie) => {
    const r = await fetch(base.replace(/\/$/, '') + p, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body || {}) });
    const text = await r.text(); let json = {}; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, headers: r.headers };
  };
  const login = await call('/api/admin/login', { token });
  if (login.status !== 200) { console.error('관리자 로그인 실패:', login.status, login.json.error || ''); process.exit(1); }
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  if (!cookie) { console.error('로그인 쿠키를 받지 못했습니다.'); process.exit(1); }
  if (action === 'issue') {
    const count = Number(a1), label = a2 || '', days = a3 ? Number(a3) : 30;
    if (!(count >= 1 && count <= 100) || !label) { console.error('사용법: issue <개수 1~100> <라벨> [유효일수 1~180]'); process.exit(2); }
    const r = await call('/api/admin/trial-codes', { count, label, expiresDays: days }, cookie);
    if (r.status !== 201) { console.error('발급 실패:', r.status, r.json.error || ''); process.exit(1); }
    console.log(`발급 ${r.json.codes.length}개 · 라벨 "${r.json.label}" · 유효 ${r.json.expiresDays}일 (아래 코드는 지금만 보입니다. 안전한 곳에 복사하세요)`);
    for (const c of r.json.codes) console.log('  ' + c);
  } else if (action === 'summary') {
    const r = await call('/api/admin/trial-codes/summary', {}, cookie);
    if (r.status !== 200) { console.error('조회 실패:', r.status); process.exit(1); }
    for (const g of r.json.groups) console.log(`${g.label || '(라벨 없음)'}: 발급 ${g.issued} · 사용 ${g.used} · 미사용 ${g.unused} · 만료 ${g.expired}`);
    if (!r.json.groups.length) console.log('발급한 코드가 없습니다.');
  } else if (action === 'list') {
    const r = await call('/api/admin/trial-codes/list', a1 ? { label: a1 } : {}, cookie);
    if (r.status !== 200) { console.error('조회 실패:', r.status); process.exit(1); }
    for (const c of r.json.codes) console.log(`${c.id}  ${c.label || '-'}  ${c.status}  ${c.usedAt ? '사용 ' + c.usedAt.slice(0, 16).replace('T', ' ') : ''}  ${c.orderId || ''}`);
  } else { console.error('사용법: issue | summary | list'); process.exit(2); }
  await call('/api/admin/logout', {}, cookie);
})().catch((e) => { console.error('실패:', e.message); process.exit(1); });
