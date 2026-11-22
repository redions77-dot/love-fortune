// 포트원 V1 테스트 결제 조회·취소 점검(테스트 전용). 키는 환경변수로만 받고 출력하지 않는다. portone-check.ps1 이 호출한다.
//   node dev/portone-check.cjs <주문번호(merchant_uid)>            → 결제 상태·금액만 조회(읽기 전용)
//   node dev/portone-check.cjs <주문번호> --cancel --yes          → 같은 결제를 전액 취소(서버 환불 기능과 같은 createPortoneClient.cancelPayment 사용)
if (process.env.MYSAJU_TEST_ENV !== '1' || process.env.NODE_ENV === 'production') { console.error('테스트 환경(MYSAJU_TEST_ENV=1)에서만 실행합니다.'); process.exit(2); }
const { createPortoneClient } = require('../secure');
(async () => {
  const merchantUid = process.argv[2];
  if (!merchantUid || !/^[A-Za-z0-9_-]{6,64}$/.test(merchantUid)) { console.error('사용법: portone-check.ps1 -MerchantUid <주문번호> [-Cancel -Yes]'); process.exit(2); }
  const doCancel = process.argv.includes('--cancel') && process.argv.includes('--yes');
  const client = createPortoneClient();
  let pay;
  try { pay = await client.findPaidByMerchantUid(merchantUid); } catch (e) { console.error('조회 실패:', e.code || e.message); process.exit(1); }
  if (!pay) { console.log('결제 완료 건을 찾지 못했습니다(이미 취소되었거나 결제 전일 수 있습니다). 취소 여부는 포트원 콘솔에서 확인하세요.'); try { const any = await client.getPayment(process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : ''); if (any) console.log('결제 상태:', any.status); } catch {} process.exit(0); }
  // pg_id(상점 아이디)가 "INIpayTest" 같은 테스트 값인지 확인용. 카드번호·이름 등 개인 결제정보는 출력하지 않는다.
  console.log(JSON.stringify({ imp_uid: pay.imp_uid, merchant_uid: pay.merchant_uid, status: pay.status, amount: pay.amount, currency: pay.currency, pay_method: pay.pay_method, pg_provider: pay.pg_provider, pg_id: pay.pg_id, cancel_amount: pay.cancel_amount, cancelled_at: pay.cancelled_at }, null, 1));
  if (pay.pg_id && !/test/i.test(String(pay.pg_id))) console.log('※ 경고: pg_id 가 테스트 상점(예: INIpayTest)처럼 보이지 않습니다. 실제 결제일 수 있으니 환불 전에 포트원 콘솔에서 확인하세요.');
  // 참고 지표(단정 금지): 테스트 옵션 없이도 조회되는지. 이 값만으로 실제 결제라고 판단하지 말고 위 pg_id(INIpayTest 여부)와 포트원 콘솔을 함께 보세요.
  try {
    process.env.PORTONE_INCLUDE_SANDBOX = 'false';
    const live = await createPortoneClient().findPaidByMerchantUid(merchantUid);
    console.log(live ? '참고: 테스트 옵션 없이도 조회됩니다(KG이니시스 테스트 상점 결제도 이렇게 보일 수 있어 이것만으로 실제 결제라고 단정하지 마세요).' : '참고: 테스트 옵션이 있어야만 조회됩니다.');
  } catch (e) { console.log('(테스트 옵션 없는 조회는 건너뜀:', e.code || e.message + ')'); }
  finally { process.env.PORTONE_INCLUDE_SANDBOX = 'true'; }
  if (!doCancel) { console.log('(읽기 전용 조회입니다. 취소하려면 -Cancel -Yes)'); return; }
  if (pay.status !== 'paid') { console.log('결제 상태가 paid 가 아니라 취소하지 않습니다:', pay.status); return; }
  const r = await client.cancelPayment({ impUid: pay.imp_uid, merchantUid: pay.merchant_uid, amount: Number(pay.amount), reason: '테스트 환불 점검' });
  console.log('취소 응답 상태:', r.status);
  const after = await client.getPayment(pay.imp_uid);
  console.log('취소 후 조회 상태:', after && after.status, '/ 취소 금액:', after && after.cancel_amount);
})().catch((e) => { console.error('실패:', e.code || e.message); process.exit(1); });
