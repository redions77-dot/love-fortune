// 결과지 메일을 본인 휴대전화의 Gmail·네이버 메일 앱으로 보내 글씨 크기를 확인하는 테스트 발송(가상 아이 결과지, 테스트 전용).
// 발송 계정·앱 비밀번호는 환경변수로만 받는다(send-preview-mail.ps1 이 입력 창으로 받아 이 프로세스에만 전달). 출력·저장하지 않는다.
const fs = require('fs');
const nodemailer = require('nodemailer');
(async () => {
  const { PREVIEW_MAIL_USER: user, PREVIEW_MAIL_PASS: pass, PREVIEW_MAIL_TO: to, PREVIEW_MAIL_HTML: file } = process.env;
  if (!user || !pass || !to || !file) { console.error('필요한 값이 없습니다.'); process.exit(2); }
  const html = fs.readFileSync(file, 'utf8');
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  const recipients = to.split(',').map((x) => x.trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
  if (!recipients.length) { console.error('받는 주소 형식을 확인해 주세요.'); process.exit(2); }
  for (const r of recipients) {
    await transporter.sendMail({ from: `마이사주 테스트 <${user}>`, to: r, subject: '[테스트] 우리 아이 성공운명서 — 모바일 글씨 크기 확인(가상 아이)', html });
    console.log('발송 완료:', r.replace(/^(.).*(@.*)$/, '$1***$2'));
  }
})().catch((e) => { console.error('발송 실패:', e.code || e.message); process.exit(1); });
