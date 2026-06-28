import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

async function ss(name) {
  const path = `C:/Users/redio/AppData/Local/Temp/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`📸 ${name}`);
}

async function clickNext() {
  // Force-click the bottom-right button (always the "다음" action)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const next = btns.find(b => b.textContent.includes('다음') && !b.disabled);
    if (next) next.click();
    else { const any = btns.find(b => (b.textContent.includes('확인') || b.textContent.includes('특가')) && !b.disabled); if (any) any.click(); }
  });
}

try {
  // 1. Landing
  await page.goto('https://mysaju.shop/?admin=bomgyeol2026', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await ss('01-landing');

  // 2. Click child card
  await page.locator('text=방학 전 특가로 확인하기 →').first().click();
  await page.waitForTimeout(800);
  await ss('02-input');

  // 3. Gender: 여성 → 다음 (child skips 결혼상태, jumps to birthdate)
  await page.locator('text=여성').first().click();
  await page.waitForTimeout(200);
  await clickNext();
  await page.waitForTimeout(600);
  await ss('03-after-gender');

  // 4. Birthdate: type character by character to trigger React onChange
  const yearInput = page.locator('input[placeholder="년도"]').first();
  await yearInput.click();
  await yearInput.pressSequentially('2015');
  const monthInput = page.locator('input[placeholder="월"]').first();
  await monthInput.click();
  await monthInput.pressSequentially('3');
  const dayInput = page.locator('input[placeholder="일"]').first();
  await dayInput.click();
  await dayInput.pressSequentially('15');
  await page.waitForTimeout(500);
  await ss('04-birthdate');
  await clickNext();
  await page.waitForTimeout(600);
  await ss('05-after-birthdate');

  // 5. Birthtime: click "태어난 시간 모름" then next
  await page.locator('text=태어난 시간 모름').click();
  await page.waitForTimeout(300);
  await ss('05a-time-unknown-clicked');
  await clickNext();
  await page.waitForTimeout(600);
  await ss('05b-after-birthtime');

  // 6. MBTI: skip (다음 건너뛰기 가능)
  await clickNext();
  await page.waitForTimeout(600);
  await ss('06-after-mbti');

  // 7. Blood type / final: submit
  await clickNext();
  await page.waitForTimeout(600);
  await ss('07-submitted');

  // 8. Wait for free analysis
  console.log('⏳ Waiting for analysis...');
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(5000);
    // Check if bottom bar appeared (analysis done)
    const bottomBar = await page.locator('text=방학 전 특가로 확인하기').last().isVisible().catch(() => false);
    if (bottomBar) { console.log(`✅ Analysis done after ${(i+1)*5}s`); break; }
    console.log(`  ...${(i+1)*5}s`);
  }
  await ss('08-analysis-result');

  // 9. Scroll down + screenshot
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  await ss('09-scrolled-bottom');

  // 10. Click payment button
  const payBtn = page.locator('button:has-text("방학 전 특가로 확인하기")').last();
  if (await payBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('✅ Found payment button');
    await payBtn.click();
    await page.waitForTimeout(1500);
    await ss('10-email-modal');

    // Verify modal content
    for (const [label, text] of [
      ['모달 제목', '이 아이, 어떤 학과가'],
      ['여름방학 특가 배지', '여름방학 특가'],
      ['취소선 가격', '19,900원'],
      ['결제 버튼', '9,900원 결제하기'],
    ]) {
      const found = await page.locator(`text=${text}`).first().isVisible().catch(() => false);
      console.log(`${found ? '✅' : '❌'} ${label}`);
    }
  } else {
    console.log('⚠️ Payment button not found');
    await ss('10-no-button');
  }

} catch (e) {
  console.error('❌ Error:', e.message);
  await ss('error');
} finally {
  await browser.close();
}
