// 배포된 "테스트" 백엔드에서 TRUST_PROXY_HOPS 값이 맞는지 확인한다. 운영 주소에는 실행하지 않는다.
//   사용: node dev/check-proxy-hops.mjs https://<테스트 백엔드>
// POST /api/orders 에 빈 본문을 보낸다(상품 없음 → 400, 주문·DB 쓰기·AI·결제 호출 없음). IP당 10분 20회 한도를 이용한다.
// 한도는 서버 메모리에 10분간 남으므로, 같은 IP로 반복 실행하면 결과가 섞인다. 다시 하려면 10분 뒤에 실행한다.
const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(base)) { console.error('사용: node dev/check-proxy-hops.mjs https://<테스트 백엔드>'); process.exit(2); }
if (/\/\/(love-fortune\.onrender\.com|(www\.)?mysaju\.shop)(\/|$)/i.test(base)) { console.error('운영 주소에는 실행하지 않습니다.'); process.exit(2); }

const post = async (xff) => {
  const r = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(xff ? { 'X-Forwarded-For': xff } : {}) }, body: '{}' });
  await r.text();
  return r.status;
};

async function main() {
const first = await post();
if (first === 429) { console.log('이 IP는 이미 한도에 걸려 있습니다(10분 이내에 실행했거나, 프록시 주소를 다른 사용자와 함께 쓰고 있을 수 있음). 10분 뒤 다시 실행하세요.'); process.exitCode = 1; return; }
if (first !== 400) { console.log(`예상 밖 응답 ${first}: 서버/DB 상태를 확인하세요.`); { process.exitCode = 1; return }; }

// 요청마다 앞쪽 위조 주소만 바꾼다. 올바른 단수라면 실제 클라이언트 주소로 묶여 20회 안에 429가 나온다.
let blockedAt = 0;
for (let i = 1; i <= 30 && !blockedAt; i++) if ((await post(`10.200.0.${i}`)) === 429) blockedAt = i + 1;

if (!blockedAt) {
  console.log('결과: 위조한 X-Forwarded-For 값으로 제한을 피할 수 있습니다. TRUST_PROXY_HOPS 가 실제 프록시 수보다 큽니다. 1 낮춰서 다시 확인하세요.');
  { process.exitCode = 1; return };
}
console.log(`결과 1/2 통과: 위조 주소를 바꿔도 ${blockedAt}번째 요청에서 제한됩니다.`);
console.log('이제 2/2를 확인하세요. 제한이 걸린 지금 곧바로(10분 이내) 다른 네트워크(예: 휴대폰 데이터)에서 같은 명령을 실행합니다.');
console.log('  - 첫 요청이 정상 통과하면 단수가 맞습니다.');
console.log('  - 다른 네트워크인데도 "이미 한도에 걸려 있습니다"가 나오면 TRUST_PROXY_HOPS 가 너무 작아 프록시 주소로 묶이고 있습니다. 1 높여서 다시 확인하세요.');
}
await main();
