import React, { useEffect, useRef, useState } from 'react'
import './successSaju.css'
import SuccessReport from './SuccessReport.jsx'
import Reopen from './Reopen.jsx'
import { ReviewsSection, ReviewForm } from './Reviews.jsx'
import { BUSINESS_LINES, POLICY_LINKS, CUSTOMER_CONTACT_URL } from './businessInfo.js'
import sampleReport from './sampleReport.js'
import { PAYMENT_CONFIG } from '../paymentConfig.js'
import { rememberOrder, recallOrder, markOrderPaid } from '../orderRecovery.js'
import { checkTrialCode, redeemTrial, createOrder, confirmPayment, fetchReport, requestRefund } from './successSajuApi.js'
import {
  SUCCESS_PATH, PRODUCT_NAME, formatWon, isSameAmount, todayStr, MIN_BIRTH_YEAR, validateForm, buildOrderInput, birthSummary, priceView,
  parseReturnParams, CONSENT_LINES, BUYER_NAME, SAMPLE_NOTICE, CONSENT_CHECK_LABEL, LANDING_ITEMS, LANDING_PARENT, LANDING_NOTICES, LIST_AMOUNT,
} from './successSajuLogic.js'

// 이 브라우저에만 보관하는 '마지막 결제 주문' 표시(결과를 다시 볼 때만 쓴다). 주문 토큰은 orderRecovery 가 따로 보관한다.
const LAST_KEY = 'success_saju_last'
const store = () => { try { return window.localStorage } catch { return { getItem: () => null, setItem: () => {} } } }
const readLast = () => { try { return JSON.parse(store().getItem(LAST_KEY) || 'null') } catch { return null } }
const writeLast = (orderId, trial = false) => { try { store().setItem(LAST_KEY, JSON.stringify({ orderId, at: Date.now(), ...(trial ? { trial: true } : {}) })) } catch { /* 보관 실패는 결제·결과에 영향이 없다 */ } }

// 판매 화면 하단: 기존 사이트의 사업자 정보와 정책 링크를 그대로 보여 준다(전자상거래 사업자 정보 표시). 정책 화면은 기존 앱의 화면을 새 탭으로 연다.
function SaleFooter() {
  return (
    <footer className="ss-sale-footer">
      <p className="biz">{BUSINESS_LINES.map((l, i) => <React.Fragment key={l}>{i > 0 && <br />}{l}</React.Fragment>)}</p>
      <p className="links">
        {POLICY_LINKS.map((p) => <a key={p.key} href={p.href} target="_blank" rel="noopener noreferrer">{p.label}</a>)}
        <a href={CUSTOMER_CONTACT_URL} target="_blank" rel="noopener noreferrer">고객문의</a>
      </p>
    </footer>
  )
}

export default function SuccessSaju() {
  const [screen, setScreen] = useState('landing')   // landing | form | confirm | working | result | sample | reopen
  const [form, setForm] = useState({ gender: '', birthdate: '', birthtime: '', timeUnknown: false, userName: '', email: '' })
  const [errors, setErrors] = useState({})
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState(null)       // { amount, listAmount } (서버가 확인한 금액)
  const [codeMsg, setCodeMsg] = useState('')
  const [consent, setConsent] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [stage, setStage] = useState('confirming')   // confirming | generating
  const [workError, setWorkError] = useState('')
  const [report, setReport] = useState(null)
  const [orderId, setOrderId] = useState('')
  const [reviewAuth, setReviewAuth] = useState(null)   // 후기 작성 본인 확인: { orderId, orderToken } 또는 { orderId, sessionToken }
  const [hasLast, setHasLast] = useState(false)
  const retryRef = useRef(null)
  const confirmedRef = useRef(false)
  const orderRef = useRef(null)
  const [paidFailed, setPaidFailed] = useState(false)   // 결제는 확인됐는데 결과지를 받지 못한 경우(안내 + 전액 환불 요청)
  const [refunding, setRefunding] = useState(false)
  const [refundMsg, setRefundMsg] = useState('')
  const [trialOrder, setTrialOrder] = useState(false)   // 무료 체험 주문(결제·환불 안내를 보여 주지 않는다)

  useEffect(() => { document.title = PRODUCT_NAME }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [screen])
  useEffect(() => { const l = readLast(); setHasLast(!!(l && recallOrder(store(), l.orderId))) }, [])

  // 모바일 결제창에서 돌아온 경우(?imp_uid=…&merchant_uid=…&imp_success=true): 주문을 찾아 결제 확인 → 결과 받기
  useEffect(() => {
    const ret = parseReturnParams(window.location.search)
    if (!ret) return
    window.history.replaceState({}, '', SUCCESS_PATH)
    const order = recallOrder(store(), ret.merchantUid)
    setScreen('working'); setStage('confirming')
    if (!order) { setOrderId(ret.merchantUid); setWorkError('주문 정보를 찾을 수 없습니다. 결제가 완료되었다면 아래 주문번호로 문의해 주세요.'); return }
    setOrderId(order.orderId)
    if (!ret.success) { setWorkError('결제가 취소되었거나 완료되지 않았습니다. 처음부터 다시 진행해 주세요.'); retryRef.current = null; return }
    finishOrder(order, ret.impUid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }

  async function finishOrder(order, impUid) {
    setScreen('working'); setWorkError(''); setOrderId(order.orderId); setPaidFailed(false); setRefundMsg(''); orderRef.current = order
    try {
      if (impUid && !confirmedRef.current) {
        setStage('confirming')
        await confirmPayment(order, impUid)
        confirmedRef.current = true
        markOrderPaid(store(), order.orderId); writeLast(order.orderId)
      }
      setStage('generating')
      const r = await fetchReport(order)
      if (!r.ok) throw new Error(r.error)
      setReport(r.report); setReviewAuth({ orderId: order.orderId, orderToken: order.orderToken }); setScreen('result'); setHasLast(true)
    } catch (e) {
      setPaidFailed(confirmedRef.current || !impUid)
      setWorkError(e.message || '처리 중 오류가 발생했습니다.')
      retryRef.current = () => finishOrder(order, impUid)
    }
  }

  async function doRefund() {
    if (!orderRef.current || refunding) return
    setRefunding(true)
    const r = await requestRefund(orderRef.current)
    setRefunding(false)
    if (r.ok) { retryRef.current = null; setRefundMsg('전액 환불이 접수되었습니다. 결제가 취소되며, 카드사에 따라 취소 내역이 확인되기까지 며칠 걸릴 수 있습니다.') }
    else setRefundMsg(r.error)
  }

  function toConfirm() {
    const e = validateForm(form)
    setErrors(e)
    if (Object.keys(e).length) return
    setPayError(''); setScreen('confirm')
  }

  async function applyCode() {
    setCodeMsg('')
    if (!code.trim()) { setApplied(null); return }
    try { setApplied(await checkTrialCode(code.trim())) } catch (e) { setApplied(null); setCodeMsg(e.message) }
  }

  // 무료 체험: 유효한 체험 코드면 결제창 없이 서버가 무료 주문을 만들고, 이후는 유료 주문과 같은 경로(결과 생성·이메일 발송·결과 받기)다.
  async function startTrial() {
    if (!consent || paying) return
    setPayError(''); setPaying(true)
    let order
    try { order = await redeemTrial({ code: code.trim(), input: buildOrderInput(form), email: form.email.trim(), consent: true }) }
    catch (e) { setPayError(e.message); setPaying(false); return }
    setPaying(false)
    rememberOrder(store(), order); markOrderPaid(store(), order.orderId); writeLast(order.orderId, true)
    confirmedRef.current = true; setTrialOrder(true)
    finishOrder(order, null)
  }

  async function pay() {
    if (applied && applied.amount === 0) return startTrial()
    if (!consent || paying) return
    setPayError(''); setPaying(true)
    const price = priceView(applied)
    if (!PAYMENT_CONFIG.code) { setPayError(PAYMENT_CONFIG.error); setPaying(false); return }
    let order
    try { order = await createOrder({ input: buildOrderInput(form), email: form.email.trim(), consent: true }) }
    catch (e) { setPayError(e.message); setPaying(false); return }
    rememberOrder(store(), order)
    // 화면에 보여 준 금액과 서버가 만든 주문 금액이 같을 때만 결제창을 연다.
    if (!isSameAmount(price.amount, order.amount)) { setPayError(`결제 금액이 화면과 다릅니다(${formatWon(order.amount)}). 화면을 새로고침한 뒤 다시 진행해 주세요.`); setPaying(false); return }
    if (!window.IMP) { setPayError('결제 모듈을 불러오지 못했습니다. 새로고침한 뒤 다시 시도해 주세요.'); setPaying(false); return }
    confirmedRef.current = false
    const IMP = window.IMP; IMP.init(PAYMENT_CONFIG.code)
    IMP.request_pay({
      ...(PAYMENT_CONFIG.channelKey ? { channelKey: PAYMENT_CONFIG.channelKey } : { pg: 'html5_inicis' }), pay_method: 'card', merchant_uid: order.orderId, name: order.name, amount: order.amount,
      buyer_name: BUYER_NAME, buyer_email: form.email.trim(),
      m_redirect_url: `${window.location.origin}${SUCCESS_PATH}`,
    }, (rsp) => {
      setPaying(false)
      if (!rsp.success) { setPayError('결제가 취소되었습니다. 다시 시도해 주세요.'); return }
      finishOrder(order, rsp.imp_uid)
    })
  }

  function reopenLast() {
    const l = readLast(); const order = l && recallOrder(store(), l.orderId)
    if (!order) { setHasLast(false); return }
    confirmedRef.current = true; setTrialOrder(!!l.trial)
    finishOrder(order, null)
  }

  const price = priceView(applied)
  const goLanding = () => { setScreen('landing'); setWorkError('') }

  // ── 결과지 ──
  if (screen === 'result' && report) return (
    <div className="ss-root">
      <SuccessReport report={report} />
      {reviewAuth && <ReviewForm auth={reviewAuth} />}
      <div className="ss-page ss-bottom-cta"><button type="button" className="ss-ghost" onClick={() => { setReport(null); setScreen('landing') }}>처음으로</button></div>
    </div>
  )
  if (screen === 'reopen') return (
    <Reopen onBack={goLanding} onOpen={(rep, info) => { setReport(rep); setReviewAuth({ orderId: info.orderId, sessionToken: info.sessionToken }); setScreen('result') }} />
  )
  if (screen === 'sample') return (
    <div className="ss-root">
      <div className="ss-page"><div className="ss-bar">결과지 샘플 · 가상 인물이며 실제 고객 정보가 아닙니다 · <button type="button" onClick={goLanding}>돌아가기</button></div></div>
      <div className="ss-banner">{SAMPLE_NOTICE}</div>
      <SuccessReport report={sampleReport} />
      <div className="ss-page ss-bottom-cta"><button type="button" className="ss-cta" onClick={() => setScreen('form')}>내 아이 결과지 받기</button></div>
    </div>
  )

  // ── 작성 중 / 오류 ──
  if (screen === 'working') return (
    <div className="ss-root ss-moms"><div className="ss-page">
      <div className="ss-work">
        {!workError ? (<>
          <div className="ss-spin" aria-hidden="true" />
          <h2>{stage === 'confirming' ? '결제를 확인하고 있습니다' : '결과지를 작성하고 있습니다'}</h2>
          <p>{stage === 'confirming' ? '잠시만 기다려 주세요.' : '보통 1~2분 걸립니다.'}</p>
          <p>결과지는 이 화면에 바로 표시됩니다. 닫으셨다면 홈페이지의 ‘내 결과지 다시 보기’에서 이메일 인증 후 확인하실 수 있습니다.</p>
        </>) : paidFailed && !/환불이 완료/.test(workError) ? (<>
          <h2>결과지를 아직 완성하지 못했습니다</h2>
          <p>{trialOrder ? '무료 체험 신청은 정상 접수되었고' : '결제는 정상 접수되었고'}, 결과지를 다시 작성하고 있습니다. 완성되면 홈페이지의 ‘내 결과지 다시 보기’에서 입력하신 이메일로 인증하고 확인하실 수 있습니다. 입력하신 정보를 다시 쓰실 필요는 없습니다.</p>
          {!trialOrder && <p>기다리지 않고 환불을 원하시면 아래 버튼으로 전액 환불받으실 수 있습니다.</p>}
          {refundMsg && <p>{refundMsg}</p>}
          {!trialOrder && !/접수되었습니다/.test(refundMsg) && <button type="button" className="ss-ghost" disabled={refunding} onClick={doRefund}>{refunding ? '환불 요청 중…' : '전액 환불 요청'}</button>}
          {retryRef.current && !/접수되었습니다/.test(refundMsg) && <button type="button" className="ss-cta" style={{ marginTop: 22 }} onClick={() => retryRef.current()}>다시 시도</button>}
          <button type="button" className="ss-ghost" onClick={goLanding}>처음으로</button>
        </>) : (<>
          <h2>결과지를 불러오지 못했습니다</h2>
          <p>{workError}</p>
          {retryRef.current && <button type="button" className="ss-cta" style={{ marginTop: 22 }} onClick={() => retryRef.current()}>다시 시도</button>}
          <button type="button" className="ss-ghost" onClick={goLanding}>처음으로</button>
        </>)}
        {orderId && <p className="ss-order">주문번호 {orderId}</p>}
      </div>
    </div></div>
  )

  // ── 입력 ──
  if (screen === 'form') return (
    <div className="ss-root ss-moms"><div className="ss-page">
      <div className="ss-head"><button type="button" onClick={goLanding}>← 처음</button><h1>우리 아이 정보 입력</h1></div>
      <div className="ss-block">
        <div className="ss-field">
          <span className="lab">성별</span>
          <div className="ss-seg">
            {['남성', '여성'].map((g) => <button key={g} type="button" aria-pressed={form.gender === g} onClick={() => set('gender', g)}>{g === '남성' ? '남자' : '여자'}</button>)}
          </div>
          {errors.gender && <p className="ss-err">{errors.gender}</p>}
        </div>
        <div className="ss-field">
          <label htmlFor="ss-birth">생년월일 <span className="opt">양력 기준</span></label>
          <input id="ss-birth" className="ss-input" type="date" min={`${MIN_BIRTH_YEAR}-01-01`} max={todayStr()} value={form.birthdate} onChange={(e) => set('birthdate', e.target.value)} />
          {errors.birthdate && <p className="ss-err">{errors.birthdate}</p>}
        </div>
        <div className="ss-field">
          <label htmlFor="ss-time">태어난 시간 <span className="opt">모르면 체크</span></label>
          <input id="ss-time" className="ss-input" type="time" disabled={form.timeUnknown} value={form.timeUnknown ? '' : form.birthtime} onChange={(e) => set('birthtime', e.target.value)} />
          <label className="ss-check"><input type="checkbox" checked={form.timeUnknown} onChange={(e) => set('timeUnknown', e.target.checked)} /><span>태어난 시간을 모릅니다.</span></label>
          {errors.birthtime && <p className="ss-err">{errors.birthtime}</p>}
        </div>
        <div className="ss-field">
          <label htmlFor="ss-name">아이 이름 <span className="opt">선택 · 결과지에 표시됩니다</span></label>
          <input id="ss-name" className="ss-input" type="text" maxLength={30} value={form.userName} onChange={(e) => set('userName', e.target.value)} />
        </div>
        <div className="ss-field">
          <label htmlFor="ss-email">이메일 <span className="opt">결과지 다시 보기 인증에 사용</span></label>
          <input id="ss-email" className="ss-input" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          {errors.email && <p className="ss-err">{errors.email}</p>}
          <p className="ss-note">결과지는 이메일로 발송되지 않고 화면에서 바로 보여 드립니다. 나중에 다시 볼 때 이 이메일로 인증하니 주소를 정확히 입력해 주세요.</p>
        </div>
        <button type="button" className="ss-cta" onClick={toConfirm}>다음</button>
      </div>
      <SaleFooter />
    </div></div>
  )

  // ── 결제 전 확인 ──
  if (screen === 'confirm') return (
    <div className="ss-root ss-moms"><div className="ss-page">
      <div className="ss-head"><button type="button" onClick={() => setScreen('form')}>← 수정</button><h1>결제 전 확인</h1></div>
      <div className="ss-block">
        <div className="ss-card">
          <h2>{PRODUCT_NAME}</h2>
          <div className="ss-sum">
            <div><span>성별</span><span>{form.gender === '남성' ? '남자' : '여자'}</span></div>
            <div><span>생년월일시</span><span>{birthSummary(form)}</span></div>
            {form.userName.trim() && <div><span>아이 이름</span><span>{form.userName.trim()}</span></div>}
            <div><span>인증 이메일</span><span>{form.email.trim()}</span></div>
          </div>
        </div>

        <div className="ss-field" style={{ marginTop: 22 }}>
          <label htmlFor="ss-code">체험 코드 <span className="opt">무료 체험 대상자</span></label>
          <div className="ss-row">
            <input id="ss-code" className="ss-input" type="text" autoCapitalize="characters" autoComplete="off" value={code} onChange={(e) => { setCode(e.target.value); setApplied(null); setCodeMsg('') }} onKeyDown={(e) => { if (e.key === 'Enter') applyCode() }} />
            <button type="button" onClick={applyCode}>적용</button>
          </div>
          {codeMsg && <p className="ss-err">{codeMsg}</p>}
          {applied && <div className="ss-applied">체험 코드가 확인되었습니다. 결제 금액은 {formatWon(applied.amount)}입니다. 결제 없이 결과지를 받습니다.</div>}
        </div>

        <div className="ss-pay" aria-live="polite">
          <div><div className="lab">{price.label}</div>{price.note && <div className="sub" style={{ textAlign: 'left' }}>{price.note}</div>}</div>
          <div className="amt">{formatWon(price.amount)}</div>
        </div>

        <div className="ss-consent">
          <ol>{CONSENT_LINES.map((t) => <li key={t}>{t}</li>)}</ol>
          <label className="ss-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span><b>{CONSENT_CHECK_LABEL}</b></span></label>
        </div>

        {payError && <p className="ss-err" style={{ marginTop: 14 }}>{payError}</p>}
        <button type="button" className="ss-cta gold" style={{ marginTop: 18 }} disabled={!consent || paying} onClick={pay}>{paying ? (applied ? '처리 중입니다' : '결제창을 여는 중입니다') : (applied ? '결제 없이 결과지 받기' : `${formatWon(price.amount)} 결제하기`)}</button>
      </div>
      <SaleFooter />
    </div></div>
  )

  // ── 판매 첫 화면 ──
  return (
    <div className="ss-root ss-moms"><div className="ss-page">
      <header className="ss-land">
        <p className="ss-kicker">대치동 엄마의 고민노트</p>
        <p className="ss-prodname">{PRODUCT_NAME}</p>
        <h1>우리 애, 공부로 성공할까?<br />사업으로 성공할까?</h1>
        <p className="sub">공부운 · 직업운 · 사업운 · 재물운 · 시기별 운</p>
        <p className="desc">생년월일시로 읽는 우리 아이의 개인 사주 해석</p>
      </header>
      <div className="ss-block">
        <div className="ss-card">
          <h2>결과지에서 받아 보시는 내용</h2>
          <ul className="ss-list">{LANDING_ITEMS.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
          <p className="ss-parent">{LANDING_PARENT}</p>
        </div>
      </div>
      <div className="ss-block">
        <div className="ss-card ss-price">
          <p className="cap" style={{ margin: 0 }}>출시 기념가</p>
          <div className="amt">{formatWon(LIST_AMOUNT)}</div>
          <p className="cap">공부·직업·사업·재물·시기별 운까지 자세히 살펴봅니다. 결제가 확인되면 결과지 작성을 시작하며, 완성된 결과지는 이 화면에서 바로 확인하며, 나중에 ‘내 결과지 다시 보기’에서 무료로 다시 볼 수 있습니다.</p>
          <p className="cafe">출시 기념가입니다. 무료 체험 코드를 받으신 분은 결제 단계에서 코드를 입력해 주세요.</p>
        </div>
        <div style={{ height: 14 }} />
        <button type="button" className="ss-cta" onClick={() => setScreen('form')}>내 아이 결과지 받기</button>
        <button type="button" className="ss-ghost" onClick={() => setScreen('sample')}>결과지 샘플 보기 (가상 인물)</button>
        <button type="button" className="ss-ghost" onClick={() => setScreen('reopen')}>내 결과지 다시 보기</button>
        {hasLast && <button type="button" className="ss-ghost" onClick={reopenLast}>이 기기에서 만든 결과지 바로 열기</button>}
      </div>
      <ReviewsSection />
      <div className="ss-notice"><ul>{LANDING_NOTICES.map((t) => <li key={t}>{t}</li>)}</ul></div>
      <SaleFooter />
    </div></div>
  )
}
