import React, { useState } from 'react'
import { requestResultCode, verifyResultCode, listMyResults, openMyResult } from './successSajuApi.js'
import { isValidEmail } from './successSajuLogic.js'

// 내 결과지 다시 보기: 이메일 입력 → 인증번호 → 결과지 목록 → 열기. 회원가입·추가 결제·AI 재생성이 없다.
// onOpen(report, { orderId, sessionToken, kind }) 로 결과지 화면을 연다.
export default function Reopen({ onBack, onOpen }) {
  const [step, setStep] = useState('email')       // email | code | list
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState('')
  const [items, setItems] = useState([])

  async function sendCode() {
    setErr(''); setMsg('')
    if (!isValidEmail(email)) return setErr('이메일 주소를 확인해 주세요.')
    setBusy(true)
    try { const j = await requestResultCode(email.trim()); setMsg(j.message || ''); setStep('code') } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  async function verify() {
    setErr('')
    if (code.replace(/\D/g, '').length !== 6) return setErr('인증번호 6자리를 입력해 주세요.')
    setBusy(true)
    try {
      const j = await verifyResultCode(email.trim(), code)
      setToken(j.sessionToken)
      const l = await listMyResults(j.sessionToken)
      setItems(l.results || []); setStep('list')
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  async function openOne(r) {
    setErr(''); setBusy(true)
    try { const j = await openMyResult(token, r.orderId); onOpen(j.report, { orderId: r.orderId, sessionToken: token, kind: j.kind }) }
    catch (e) { setErr(e.message); if (e.code === 'session_expired') { setStep('email'); setToken('') } }
    setBusy(false)
  }
  const when = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}` }
  return (
    <div className="ss-root ss-moms"><div className="ss-page">
      <div className="ss-head"><button type="button" onClick={onBack}>← 처음</button><h1>내 결과지 다시 보기</h1></div>
      <div className="ss-block">
        <p className="ss-note">결제(또는 무료 체험) 때 입력한 이메일로 인증하면, 이미 만들어진 결과지를 무료로 다시 볼 수 있습니다. 결과지를 새로 만들거나 추가 결제를 받지 않습니다.</p>
        {step === 'email' && (<>
          <div className="ss-field"><label htmlFor="ro-email">이메일</label>
            <input id="ro-email" className="ss-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendCode() }} /></div>
          {err && <p className="ss-err">{err}</p>}
          <button type="button" className="ss-cta" disabled={busy} onClick={sendCode}>{busy ? '보내는 중…' : '인증번호 받기'}</button>
        </>)}
        {step === 'code' && (<>
          {msg && <p className="ss-applied">{msg}</p>}
          <div className="ss-field" style={{ marginTop: 18 }}><label htmlFor="ro-code">인증번호 6자리</label>
            <input id="ro-code" className="ss-input" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') verify() }} /></div>
          {err && <p className="ss-err">{err}</p>}
          <button type="button" className="ss-cta" disabled={busy} onClick={verify}>{busy ? '확인 중…' : '인증하고 결과지 보기'}</button>
          <button type="button" className="ss-ghost" disabled={busy} onClick={() => { setStep('email'); setCode(''); setErr('') }}>이메일 다시 입력 / 인증번호 다시 받기</button>
        </>)}
        {step === 'list' && (<>
          {items.length === 0 && <p className="ss-note">이 이메일로 만들어진 결과지가 없습니다.</p>}
          {err && <p className="ss-err">{err}</p>}
          {items.map((r) => (
            <div key={r.orderId} className="ss-card" style={{ marginTop: 12 }}>
              <div className="ss-sum">
                <div><span>{r.kind === 'trial' ? '무료 체험' : '구매'}</span><span>{when(r.paidAt)}</span></div>
                <div><span>아이</span><span>{[r.userName, r.gender === '남성' ? '남자' : r.gender === '여성' ? '여자' : '', r.birthdate].filter(Boolean).join(' · ')}</span></div>
              </div>
              <button type="button" className="ss-cta" style={{ marginTop: 12 }} disabled={busy || !r.ready} onClick={() => openOne(r)}>{r.ready ? '결과지 보기' : '결과지를 만들고 있습니다'}</button>
            </div>
          ))}
        </>)}
      </div>
    </div></div>
  )
}
