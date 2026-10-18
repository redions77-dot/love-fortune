// 배포된 "테스트" 백엔드가 받은 프록시 헤더를 관측해 TRUST_PROXY_HOPS 를 근거로 정한다. 운영 주소에는 실행하지 않는다.
//   준비: 테스트 서버에 PROXY_DIAG_TOKEN(16자 이상)을 설정해 배포한다. 운영에는 설정하지 않는다.
//   사용: PROXY_DIAG_TOKEN=<토큰> node dev/diagnose-proxy.mjs https://<테스트 백엔드> [--admin] [--my-ip <내 공인 IP>]
//         --admin  Vercel rewrite 를 거치는 관리자 경로를 점검한다. 이때 URL 은 테스트 프런트(Vercel 미리보기) 주소를 쓴다.
// 서버는 "내 요청이 어떻게 도착했는지"만 돌려주고 아무것도 저장하지 않는다. 이 스크립트도 IP 를 파일·로그에 남기지 않는다.
const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) || '').replace(/\/+$/, '');
const admin = args.includes('--admin');
const myIpArg = args.includes('--my-ip') ? args[args.indexOf('--my-ip') + 1] : '';
const token = process.env.PROXY_DIAG_TOKEN || '';
if (!base) { console.error('사용: PROXY_DIAG_TOKEN=<토큰> node dev/diagnose-proxy.mjs https://<테스트 주소> [--admin] [--my-ip <IP>]'); process.exit(2); }
if (/\/\/(love-fortune\.onrender\.com|(www\.)?mysaju\.shop|love-fortune-nu\.vercel\.app)(\/|$)/i.test(base)) { console.error('운영 주소에는 실행하지 않습니다.'); process.exit(2); }
if (token.length < 16) { console.error('PROXY_DIAG_TOKEN 환경변수(16자 이상)가 필요합니다.'); process.exit(2); }
const path = admin ? '/api/admin/diag-proxy' : '/api/diag/proxy';

const probe = async (forged) => {
  const r = await fetch(base + path, { headers: { 'x-diag-token': token, ...(forged.length ? { 'X-Forwarded-For': forged.join(', ') } : {}) } });
  if (r.status === 404) throw new Error('404: 경로가 없거나 토큰이 다르거나 서버에 PROXY_DIAG_TOKEN 이 설정되지 않았습니다.');
  if (!r.ok) throw new Error(`예상 밖 응답 ${r.status}`);
  return r.json();
};

async function main() {
  const marks = ['203.0.113.1', '203.0.113.2'];
  const first = await probe(marks);
  // 맨 앞에서부터 우리가 보낸 위조값이 그대로 남아 있는 개수. 프록시가 덮어쓰면(예: Vercel) 0 이 된다.
  let kept = 0; while (kept < marks.length && first.xff[kept] === marks[kept]) kept++;
  const appended = first.xff.slice(kept);
  console.log(`경로: ${admin ? '관리자(Vercel rewrite 경유)' : '공개 API(직접)'}`);
  console.log(`서버가 받은 X-Forwarded-For 개수: ${first.xff.length} (보낸 위조값 중 유지된 것 ${kept}개, 프록시가 덧붙인 것 ${appended.length}개)`);
  if (kept === 0) console.log('→ 프록시가 들어온 값을 덮어씁니다(위조 앞부분이 남지 않음).');
  console.log(`서버의 현재 TRUST_PROXY_HOPS=${first.hops}, 현재 설정으로 선택된 주소는 ${first.selectedIsPublic ? '공인 주소' : '사설/내부 주소(프록시 내부 주소일 가능성)'}`);

  let myIp = myIpArg;
  if (!myIp) { try { myIp = (await (await fetch('https://api.ipify.org', { signal: AbortSignal.timeout(8000) })).text()).trim(); } catch { /* 아래에서 안내 */ } }
  if (!myIp) { console.log('내 공인 IP 를 알 수 없습니다. --my-ip <IP> 로 지정하세요.'); process.exitCode = 1; return; }
  const idx = appended.indexOf(myIp);
  if (idx === -1) {
    console.log('내 공인 IP 가 덧붙은 목록에 없습니다. IPv6/IPv4 가 다르거나 중간 프록시가 다른 주소를 쓰는 경우입니다.');
    // IP·헤더 값은 출력하지 않는다(채팅·로그 노출 방지). 개수와 주소 종류만 알려 준다.
    console.log(`덧붙은 주소 ${appended.length}개 (IPv4 ${appended.filter((a) => !a.includes(':')).length}개, IPv6 ${appended.filter((a) => a.includes(':')).length}개). 내가 쓴 주소가 IPv6 인지 IPv4 인지 확인하세요.`);
    console.log('--my-ip 로 실제 연결에 쓰인 주소(IPv4/IPv6)를 지정해 다시 실행하세요. 확정하지 않습니다.');
    process.exitCode = 1; return;
  }
  const needed = appended.length - idx;
  console.log(`내 주소는 덧붙은 목록의 ${idx + 1}번째 → 이 경로에서 필요한 TRUST_PROXY_HOPS = ${needed}`);

  // 현재 서버 설정으로 위조 우회 방지와 내 주소 식별이 되는지 직접 확인
  const results = [];
  for (const forged of [[], ['6.6.6.6'], ['6.6.6.6', '7.7.7.7', '8.8.8.8']]) results.push((await probe(forged)).selected);
  const identifies = results.every((s) => s === myIp);
  const spoofFree = !results.some((s) => ['6.6.6.6', '7.7.7.7', '8.8.8.8'].includes(s));
  console.log(`현재 설정(${first.hops}) 결과: 위조 앞부분을 바꿔도 선택값 불변·위조값 미선택 ${spoofFree && new Set(results).size === 1 ? '✓' : '✗'}, 내 주소 식별 ${identifies ? '✓' : '✗'}`);
  if (first.hops !== needed) console.log(`→ 이 경로 기준으로는 TRUST_PROXY_HOPS=${needed} 이어야 합니다(현재 ${first.hops}).`);
  console.log('');
  console.log('남은 확인(사람이 직접):');
  console.log('  1) 다른 네트워크(예: 휴대폰 데이터)에서 같은 명령을 실행해 선택된 주소가 그 네트워크의 공인 IP 로 바뀌는지 확인');
  console.log('  2) 공개 API 경로와 --admin 경로를 각각 실행. 두 경로의 필요 단수가 다르면 한 값으로 둘 다 맞출 수 없음 → 결과를 보고하고 결정');
  console.log('  3) 시간대를 달리해(또는 다른 날) 한 번 더 실행해 덧붙는 개수가 일정한지 확인');
  process.exitCode = identifies && spoofFree && first.hops === needed ? 0 : 1;
}
main().catch((e) => { console.error('실패:', e.message); process.exitCode = 1; });
