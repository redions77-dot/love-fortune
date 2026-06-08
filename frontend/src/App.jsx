import { useEffect, useState, useRef } from 'react'

async function generatePDF(elementId, filename) {
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      s.onload = resolve; s.onerror = () => reject(new Error('jsPDF 로드 실패'))
      document.head.appendChild(s)
    })
  }
  if (!window.html2canvas) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
      s.onload = resolve; s.onerror = () => reject(new Error('html2canvas 로드 실패'))
      document.head.appendChild(s)
    })
  }
  const element = document.getElementById(elementId)
  if (!element) return
  const allEls = element.querySelectorAll('*')
  const origStyles = []
  const origElementBg = element.style.background
  const origElementColor = element.style.color
  element.style.background = '#FFFFFF'
  element.style.color = '#1A1A1A'
  allEls.forEach(el => { origStyles.push(el.style.cssText); el.style.background = '#FFFFFF'; el.style.color = '#1A1A1A' })
  try {
    const canvas = await window.html2canvas(element, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true, logging: false, windowWidth: element.scrollWidth, windowHeight: element.scrollHeight })
    const { jsPDF } = window.jspdf
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 10
    const imgW = pageW - margin * 2
    const imgH = (canvas.height * imgW) / canvas.width
    let y = margin, remainH = imgH
    while (remainH > 0) {
      const sliceH = Math.min(remainH, pageH - margin * 2)
      const srcY = ((imgH - remainH) / imgH) * canvas.height
      const srcH = (sliceH / imgH) * canvas.height
      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = canvas.width; sliceCanvas.height = srcH
      const ctx = sliceCanvas.getContext('2d')
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)
      pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, imgW, sliceH)
      remainH -= sliceH
      if (remainH > 0) { pdf.addPage(); y = margin }
    }
    pdf.save(filename + '.pdf')
  } finally {
    element.style.background = origElementBg; element.style.color = origElementColor
    allEls.forEach((el, i) => { el.style.cssText = origStyles[i] })
  }
}

const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']
const STEPS = ['gender', 'marital', 'birthdate', 'birthtime', 'mbti', 'blood']
const API_URL = 'https://love-fortune.onrender.com'
const IS_ADMIN = new URLSearchParams(window.location.search).get('admin') === 'bomgyeol2026'

const LOADING_STAGES = ['사주 데이터를 읽고 있어요', '기운의 흐름을 분석하고 있어요', '당신만의 풀이를 만들고 있어요']

function removeMarkers(text) {
  return text.split('===').filter((_, i) => i % 2 === 0).join('').replace(/\n{3,}/g, '\n\n').trim()
}
function parseSections(text) {
  const sections = []
  const parts = text.split(/===(.+?)===/s)
  if (parts[0]?.trim()) sections.push({ title: '분석 결과', content: parts[0].trim() })
  for (let i = 1; i < parts.length; i += 2) sections.push({ title: parts[i].trim(), content: parts[i + 1]?.trim() || '' })
  return sections
}
function getMidnightCountdown() {
  const now = new Date(), midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  const diff = midnight - now
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// ── 로딩 화면 컴포넌트 ──
function AnalysisLoading({ countdown, stageIndex }) {
  const circumference = 2 * Math.PI * 70
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36, padding: '40px 24px' }}>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg width="180" height="180" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
          <circle cx="90" cy="90" r="70" fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="6" />
          <circle cx="90" cy="90" r="70" fill="none" stroke="#C9A84C" strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (countdown / 30)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 44, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>{countdown}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>초 남았어요</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {LOADING_STAGES.map((text, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={{ fontSize: 14, color: stageIndex > i ? '#4ADE80' : stageIndex === i ? '#C9A84C' : 'rgba(255,255,255,0.2)', fontWeight: stageIndex === i ? 700 : 400, transition: 'all 0.5s' }}>
              {stageIndex > i ? '✓' : stageIndex === i ? '→' : '·'}
            </span>
            <span style={{ fontSize: 14, color: stageIndex > i ? 'rgba(255,255,255,0.5)' : stageIndex === i ? '#C9A84C' : 'rgba(255,255,255,0.2)', fontWeight: stageIndex === i ? 700 : 400, transition: 'all 0.5s' }}>
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Accordion({ title, content, isPaid = false, isChild = false, isGunghab = false, isGilil = false, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const borderColor = isGunghab ? 'rgba(155,29,58,0.4)' : isChild ? 'rgba(45,122,82,0.4)' : isGilil ? 'rgba(201,168,76,0.4)' : isPaid ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'
  const openBg = isGunghab ? 'rgba(155,29,58,0.1)' : isChild ? 'rgba(45,122,82,0.1)' : 'rgba(201,168,76,0.08)'
  return (
    <div style={{ marginBottom: 8, border: `1px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', cursor: 'pointer', background: open ? openBg : '#0D1B3E', transition: 'all 0.2s' }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 15, fontWeight: 700, color: open ? '#C9A84C' : 'rgba(255,255,255,0.85)', flex: 1 }}>{title}</span>
        <span style={{ fontSize: 12, color: 'rgba(201,168,76,0.5)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>
      {open && <div style={{ wordBreak: 'keep-all', padding: '16px 18px', fontSize: 15, lineHeight: 2, color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.1)' }}>{content}</div>}
    </div>
  )
}

export default function App() {
  const _qs = new URLSearchParams(window.location.search)
  const _mobilePayment = _qs.get('payment')
  const _impSuccess = _qs.get('imp_success')

  useEffect(() => {
    const ping = () => fetch(`${API_URL}/ping`).catch(() => {})
    ping(); const id = setInterval(ping, 30000); return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (_mobilePayment === 'gunghab' && _impSuccess === 'true') {
      const t = setTimeout(() => { handleGunghabAnalyze(); window.history.replaceState({}, '', window.location.pathname) }, 300)
      return () => clearTimeout(t)
    }
    if (_mobilePayment === 'gunghab' && _impSuccess === 'false') { alert('결제가 취소되었습니다.'); window.history.replaceState({}, '', window.location.pathname) }
  }, []) // eslint-disable-line

  const [countdown, setCountdown] = useState(getMidnightCountdown())
  useEffect(() => { const id = setInterval(() => setCountdown(getMidnightCountdown()), 1000); return () => clearInterval(id) }, [])

  const [screen, setScreen] = useState(() => _mobilePayment === 'gunghab' && _impSuccess === 'true' ? 'result' : 'landing')
  const [serviceType, setServiceType] = useState(() => _mobilePayment === 'gunghab' && _impSuccess === 'true' ? 'gunghab' : null)
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState(() => _qs.get('g') || '')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [birthYear, setBirthYear] = useState(() => _qs.get('by') || '')
  const [birthMonth, setBirthMonth] = useState(() => _qs.get('bm') || '')
  const [birthDay, setBirthDay] = useState(() => _qs.get('bd') || '')
  const [isLunar, setIsLunar] = useState(false)
  const [timeHour, setTimeHour] = useState('')
  const [timeMin, setTimeMin] = useState('')
  const [timeAmPm, setTimeAmPm] = useState('오전')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [mbti, setMbti] = useState('')
  const [blood, setBlood] = useState('')
  const [phase, setPhase] = useState('input')
  const [sajuData, setSajuData] = useState(null)
  const [baseText, setBaseText] = useState('')
  const [paidText, setPaidText] = useState('')
  const [isPaidStreaming, setIsPaidStreaming] = useState(false)
  const [isBaseStreaming, setIsBaseStreaming] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [isDeepPaid, setIsDeepPaid] = useState(false)
  const [emailModal, setEmailModal] = useState(null)
  const [preEmail, setPreEmail] = useState('')
  const [deepText, setDeepText] = useState('')
  const [isDeepStreaming, setIsDeepStreaming] = useState(false)
  const [openCheongan, setOpenCheongan] = useState(null)

  // ── 새로 추가된 로딩 state 3개 ──
  const [loadingPhase, setLoadingPhase] = useState(null)
  const [loadingCountdown, setLoadingCountdown] = useState(30)
  const [loadingStage, setLoadingStage] = useState(0)

  const [gunghabStep, setGunghabStep] = useState(1)
  const [partnerGender, setPartnerGender] = useState(() => _qs.get('pg') || '')
  const [partnerBirthYear, setPartnerBirthYear] = useState(() => _qs.get('pby') || '')
  const [partnerBirthMonth, setPartnerBirthMonth] = useState(() => _qs.get('pbm') || '')
  const [partnerBirthDay, setPartnerBirthDay] = useState(() => _qs.get('pbd') || '')
  const [partnerIsLunar, setPartnerIsLunar] = useState(() => _qs.get('pil') === '1')
  const [partnerTimeHour, setPartnerTimeHour] = useState(() => _qs.get('pth') || '')
  const [partnerTimeMin, setPartnerTimeMin] = useState(() => _qs.get('ptm') || '')
  const [partnerTimeAmPm, setPartnerTimeAmPm] = useState(() => _qs.get('ptap') || '오전')
  const [partnerTimeUnknown, setPartnerTimeUnknown] = useState(() => _qs.get('ptu') === '1')
  const [myName, setMyName] = useState(() => _qs.get('mn') || '')
  const [partnerName, setPartnerName] = useState(() => _qs.get('pn') || '')
  const [gunghabText, setGunghabText] = useState('')
  const [isGunghabStreaming, setIsGunghabStreaming] = useState(false)
  const [gunghabSajuData, setGunghabSajuData] = useState(null)
  const [gilil목적, setGilil목적] = useState('')
  const [gililText, setGililText] = useState('')
  const [isGililStreaming, setIsGililStreaming] = useState(false)
  const [gililData, setGililData] = useState(null)

  const abortRef = useRef(null)
  const isPaidSectionRef = useRef(false)
  const loadingTimersRef = useRef({ countdown: null, stage: null })

  const currentStepId = STEPS[step]
  const progress = (step / STEPS.length) * 100

  const birthdate = (birthYear.length === 4 && birthMonth && birthDay) ? `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}` : ''
  const birthdateValid = birthYear.length === 4 && Number(birthMonth) >= 1 && Number(birthMonth) <= 12 && Number(birthDay) >= 1 && Number(birthDay) <= 31
  const birthtime = timeUnknown ? '' : (() => {
    if (!timeHour || !timeMin) return ''
    let h = Number(timeHour)
    if (timeAmPm === '오전' && h === 12) h = 0
    if (timeAmPm === '오후' && h !== 12) h += 12
    return `${String(h).padStart(2,'0')}:${String(timeMin).padStart(2,'0')}`
  })()
  const birthtimeValid = timeUnknown || (timeHour !== '' && timeMin !== '')

  // ── 로딩 타이머 헬퍼 ──
  function clearLoadingTimers() {
    if (loadingTimersRef.current.countdown) clearInterval(loadingTimersRef.current.countdown)
    if (loadingTimersRef.current.stage) clearInterval(loadingTimersRef.current.stage)
  }
  function startLoadingTimers() {
    setLoadingCountdown(30); setLoadingStage(0); setLoadingPhase('loading')
    loadingTimersRef.current.countdown = setInterval(() => {
      setLoadingCountdown(prev => { if (prev <= 1) { clearInterval(loadingTimersRef.current.countdown); return 0 } return prev - 1 })
    }, 1000)
    loadingTimersRef.current.stage = setInterval(() => {
      setLoadingStage(prev => Math.min(prev + 1, LOADING_STAGES.length - 1))
    }, 8000)
  }
  function stopLoading() { clearLoadingTimers(); setLoadingPhase(null) }

  function canGoNext() {
    if (currentStepId === 'gender') return gender !== ''
    if (currentStepId === 'birthdate') return birthdateValid
    if (currentStepId === 'birthtime') return birthtimeValid
    return true
  }
  function goNext() {
    if (currentStepId === 'gender' && (serviceType === 'child' || serviceType === '노후')) { setStep(s => s + 2); return }
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else if (serviceType === 'deep') {
      requestPayWithEmail('심화 분석', (email) => {
        if (IS_ADMIN) { handleDeepAnalyze(); setScreen('deep_result'); return }
        const IMP = window.IMP; IMP.init('imp87662575')
        IMP.request_pay({ pg: 'html5_inicis', pay_method: 'card', merchant_uid: `deep_${Date.now()}`, name: '마이사주 심화 분석', amount: 9900, buyer_name: myName || '고객', buyer_email: email || '' }, (rsp) => {
          if (rsp.success) { setScreen('deep_result'); handleDeepAnalyze() } else alert('결제가 취소되었습니다.')
        })
      })
    } else handleFreeAnalyze()
  }
  function goBack() {
    if (currentStepId === 'birthdate' && (serviceType === 'child' || serviceType === '노후')) { setStep(s => s - 2); return }
    if (step > 0) setStep(s => s - 1); else setScreen('landing')
  }

  async function streamAnalyze({ body, onSaju, onBaseText, onPaidText, onDone, onError }) {
    const ctrl = new AbortController(); abortRef.current = ctrl
    const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal })
    const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'saju') onSaju?.(json)
          else if (json.type === 'paid_start') isPaidSectionRef.current = true
          else if (json.type === 'done') onDone?.()
          else if (json.error) onError?.(json.error)
          else if (json.text) { if (isPaidSectionRef.current) onPaidText?.(json.text); else onBaseText?.(json.text) }
        } catch {}
      }
    }
  }

  // ── handleFreeAnalyze — 로딩 화면 추가 ──
  async function handleFreeAnalyze() {
    setPhase('streaming'); setBaseText(''); setPaidText(''); setSajuData(null)
    setIsBaseStreaming(true); isPaidSectionRef.current = false; setScreen('result')
    setLoadingCountdown(0)
    loadingTimersRef.current.countdown = setInterval(() => {
      setLoadingCountdown(prev => prev + 1)
    }, 1000)
    const apiType = serviceType === 'child' ? '자녀천명' : serviceType === '노후' ? '노후' : '기본'
    try {
      await streamAnalyze({
        body: { gender, maritalStatus, birthdate, birthtime, mbti, blood, type: apiType, isPaid: false, isLunar, userName: myName },
        onSaju: (d) => { setSajuData(d) },
        onBaseText: (t) => { setBaseText(prev => prev + t) },
        onPaidText: () => {},
        onDone: () => { clearLoadingTimers(); setIsBaseStreaming(false); setPhase('done') },
        onError: (e) => { alert(e); setPhase('input'); setIsBaseStreaming(false) },
      })
    } catch (e) {
      if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.')
      setPhase('input'); setIsBaseStreaming(false)
    }
  }

  async function handlePaidAnalyze(emailOverride) {
    setPaidText(''); setIsPaidStreaming(true); isPaidSectionRef.current = false
setLoadingCountdown(0)
loadingTimersRef.current.countdown = setInterval(() => {
  setLoadingCountdown(prev => prev + 1)
}, 1000)
    const apiType = serviceType === 'child' ? '자녀천명' : serviceType === '노후' ? '노후' : '전체'
    let _fullBase = '', _fullPaid = ''
    try {
      await streamAnalyze({
        body: { gender, maritalStatus, birthdate, birthtime, mbti, blood, type: apiType, isPaid: true, isLunar, userName: myName },
        onSaju: () => {},
        onBaseText: (t) => { setBaseText(prev => prev + t); _fullBase += t },
        onPaidText: (t) => { setPaidText(prev => prev + t); _fullPaid += t },
        onDone: () => {}, onError: (e) => alert(e),
      })
    } catch (e) { if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.') }
    clearLoadingTimers(); setIsPaidStreaming(false); setIsPaid(true)
    const _email = emailOverride || preEmail
    if (_email) {
      const label = serviceType === 'child' ? '🌱 자녀 학운 분석' : serviceType === '노후' ? '🌅 노후 운세 분석' : '✨ 나의 사주 분석'
      autoSendEmail({ email: _email, subject: `${label} - ${myName || ''}님의 결과`, sections: [...parseSections(_fullBase), ...parseSections(_fullPaid)], name: myName })
    }
  }

  async function handleDeepAnalyze() {
    setDeepText(''); setIsDeepStreaming(true)
    try {
      const ctrl = new AbortController(); abortRef.current = ctrl
      const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, maritalStatus, birthdate, birthtime, mbti, blood, type: '심화', isPaid: true, isLunar, userName: myName }), signal: ctrl.signal })
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try { const json = JSON.parse(line.slice(6)); if (json.text) setDeepText(prev => prev + json.text) } catch {}
        }
      }
    } catch (e) { if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.') }
    setIsDeepStreaming(false); setIsDeepPaid(true)
  }

  async function autoSendEmail({ email, subject, sections, name }) {
    if (!email || !email.includes('@')) return
    const htmlContent = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0D1B3E;color:#FFFFFF;"><h1 style="color:#C9A84C;text-align:center;">${subject}</h1><p style="text-align:center;color:rgba(255,255,255,0.6);">${name || ''}님의 분석 결과</p><hr style="border-color:rgba(201,168,76,0.3);margin:20px 0;">${sections.map(sec => `<h2 style="color:#C9A84C;">${sec.title}</h2><p style="color:rgba(255,255,255,0.8);line-height:1.8;white-space:pre-wrap;">${sec.content}</p>`).join('')}<hr style="border-color:rgba(201,168,76,0.3);margin:20px 0;"><p style="text-align:center;color:rgba(255,255,255,0.4);font-size:12px;">마이사주 · mysaju.shop</p></div>`
    try { await fetch(`${API_URL}/api/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: email, subject, html: htmlContent }) }) } catch {}
  }

  function requestPayWithEmail(productName, onConfirm) {
    setPreEmail('')
    setEmailModal({ productName, onConfirm: (email) => { if (email) setPreEmail(email); onConfirm(email) } })
  }

  function handleRestart() {
    const wasEmailSent = document.getElementById('result-email-input')?.dataset?.sent === 'true' || document.getElementById('gunghab-email-input')?.dataset?.sent === 'true'
    if (isPaid && !wasEmailSent) { const confirmed = window.confirm('📧 이메일로 결과를 받으셨나요?\n\n[취소] 돌아가서 이메일 받기\n[확인] 그냥 나가기'); if (!confirmed) return }
    abortRef.current?.abort(); stopLoading()
    setScreen('landing'); setServiceType(null); setStep(0)
    setGender(''); setMaritalStatus(''); setBirthYear(''); setBirthMonth(''); setBirthDay('')
    setIsLunar(false); setTimeHour(''); setTimeMin(''); setTimeAmPm('오전'); setTimeUnknown(false)
    setMbti(''); setBlood(''); setPhase('input'); setSajuData(null); setBaseText(''); setPaidText('')
    setIsBaseStreaming(false); setIsPaidStreaming(false); setIsPaid(false)
    setGunghabStep(1); setPartnerGender(''); setPartnerBirthYear(''); setPartnerBirthMonth(''); setPartnerBirthDay('')
    setPartnerIsLunar(false); setPartnerTimeHour(''); setPartnerTimeMin(''); setPartnerTimeAmPm('오전'); setPartnerTimeUnknown(false)
    setMyName(''); setPartnerName(''); setGunghabText(''); setIsGunghabStreaming(false); setGunghabSajuData(null)
    setGilil목적(''); setGililText(''); setIsGililStreaming(false); isPaidSectionRef.current = false
  }

  const partnerBirthdate = (partnerBirthYear.length === 4 && partnerBirthMonth && partnerBirthDay) ? `${partnerBirthYear}-${String(partnerBirthMonth).padStart(2,'0')}-${String(partnerBirthDay).padStart(2,'0')}` : ''
  const partnerBirthtime = partnerTimeUnknown ? '' : (() => {
    if (!partnerTimeHour || !partnerTimeMin) return ''
    let h = Number(partnerTimeHour)
    if (partnerTimeAmPm === '오전' && h === 12) h = 0
    if (partnerTimeAmPm === '오후' && h !== 12) h += 12
    return `${String(h).padStart(2,'0')}:${String(partnerTimeMin).padStart(2,'0')}`
  })()
  const partnerBirthdateValid = partnerBirthYear.length === 4 && Number(partnerBirthMonth) >= 1 && Number(partnerBirthMonth) <= 12 && Number(partnerBirthDay) >= 1 && Number(partnerBirthDay) <= 31
  const partnerBirthtimeValid = partnerTimeUnknown || (partnerTimeHour !== '' && partnerTimeMin !== '')

  async function handleGunghabAnalyze(emailOverride) {
    const _isMobileReturn = new URLSearchParams(window.location.search).get('payment') === 'gunghab'
    const _qs2 = new URLSearchParams(window.location.search)
    const _birthtime = _isMobileReturn ? (_qs2.get('bt') || '') : birthtime
    const _partnerBirthtime = _isMobileReturn ? (_qs2.get('pbt') || '') : partnerBirthtime
    setGunghabText(''); setIsGunghabStreaming(true); setScreen('result')
    let _fullGunghabText = ''
    try {
      const ctrl = new AbortController(); abortRef.current = ctrl
      const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, birthdate, birthtime: _birthtime, isLunar, partnerGender, partnerBirthdate, partnerBirthtime: _partnerBirthtime, partnerIsLunar, myName: myName || 'A', partnerName: partnerName || 'B', type: '궁합', isPaid: true }), signal: ctrl.signal })
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try { const json = JSON.parse(line.slice(6)); if (json.type === 'gunghab_saju') setGunghabSajuData(json); else if (json.text) { setGunghabText(prev => prev + json.text); _fullGunghabText += json.text } } catch {}
        }
      }
    } catch (e) { if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.') }
    setIsGunghabStreaming(false)
    const _email = emailOverride || preEmail
    if (_email) autoSendEmail({ email: _email, subject: `💕 ${myName || 'A'}님 & ${partnerName || 'B'}님 궁합 분석 결과`, sections: parseSections(_fullGunghabText), name: myName })
  }

  async function handleGililAnalyze() {
    setGililData(null); setIsGililStreaming(true); setScreen('gilil_result')
    try {
      const res = await fetch(`${API_URL}/api/gilil`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose: gilil목적 }) })
      const data = await res.json(); if (data.success) setGililData(data.data)
    } catch (e) { alert('서버에 연결할 수 없습니다.') }
    setIsGililStreaming(false)
  }

  // ── 길일 입력 ──
  if (screen === 'gilil_input') {
    const 목적목록 = [{ value: '이사', emoji: '🏠' },{ value: '계약', emoji: '📝' },{ value: '개업', emoji: '🎊' },{ value: '결혼', emoji: '💍' },{ value: '수술', emoji: '🏥' },{ value: '시험', emoji: '📚' }]
    const canNext = gilil목적 !== '' && birthdateValid
    return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #0D1B3E 0%, #050D1F 100%)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 10 }}>吉</div>
          <h1 style={{ wordBreak: 'keep-all', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>길일 추천</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>내 사주와 맞는 좋은 날을 찾아드려요</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>어떤 날을 찾고 계세요?</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>목적을 선택해주세요</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {목적목록.map(({ value, emoji }) => (
              <button key={value} style={{ padding: '16px 8px', border: `2px solid ${gilil목적 === value ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: gilil목적 === value ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setGilil목적(value)}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
                <div style={{ fontSize: 13, fontWeight: gilil목적 === value ? 700 : 400, color: gilil목적 === value ? '#C9A84C' : 'rgba(255,255,255,0.6)' }}>{value}</div>
              </button>
            ))}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>생년월일을 알려주세요</h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
            <input style={{ width: 90, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="년도" value={birthYear} onChange={e => setBirthYear(e.target.value.slice(0,4))} />
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>년</span>
            <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="월" value={birthMonth} onChange={e => setBirthMonth(e.target.value.slice(0,2))} />
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>월</span>
            <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="일" value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0,2))} />
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>일</span>
          </div>
          {birthdateValid && <p style={{ fontSize: 13, color: '#C9A84C', textAlign: 'center', fontWeight: 600 }}>✓ {birthYear}년 {birthMonth}월 {birthDay}일</p>}
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.15)', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 15, cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }} onClick={() => setScreen('landing')}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 600, background: !canNext ? 'rgba(201,168,76,0.2)' : '#C9A84C', color: !canNext ? 'rgba(255,255,255,0.3)' : '#0A1628', border: 'none', borderRadius: 10, cursor: !canNext ? 'not-allowed' : 'pointer' }} disabled={!canNext}
            onClick={() => { if (IS_ADMIN) { handleGililAnalyze(); return } const IMP = window.IMP; IMP.init('imp87662575'); IMP.request_pay({ pg: 'html5_inicis', pay_method: 'card', merchant_uid: `gilil_${Date.now()}`, name: '마이사주 길일 추천', amount: 9900, buyer_name: '고객' }, (rsp) => { if (rsp.success) handleGililAnalyze(); else alert('결제가 취소되었습니다.') }) }}>
            📅 길일 찾기 (9,900원)
          </button>
        </div>
      </div>
    )
  }

  // ── 심화 결과 ──
  if (screen === 'deep_result') {
    const deepSections = parseSections(deepText)
    return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #0D1B3E 0%, #050D1F 100%)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ fontSize: 36 }}>🔮</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>사주 심화 분석</h1>
        </div>
        <div id="deep-result-content" style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 40px', width: '100%', boxSizing: 'border-box' }}>
          {isDeepStreaming && !deepText && (
            <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '24px 20px', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>🔮 심화 분석 중이에요...</span>
              </div>
            </div>
          )}
          {isDeepStreaming && deepText && (
            <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '16px 18px', marginBottom: 8, fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{removeMarkers(deepText)}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}
          {!isDeepStreaming && deepSections.map((sec, i) => <Accordion key={i} title={sec.title} content={sec.content} isPaid={true} defaultOpen={i === 0} />)}
          <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
            <p style={{ fontSize: 13, color: '#C9A84C', fontWeight: 600, marginBottom: 6 }}>📄 PDF 저장 전에 확인해주세요!</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>각 항목을 모두 펼친 후 저장하면 전체 내용이 PDF에 담겨요.</p>
          </div>
          <button style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 600, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10, cursor: 'pointer', color: '#C9A84C', marginBottom: 10 }} onClick={async () => { try { await generatePDF('deep-result-content', '마이사주_심화분석_' + (myName || '결과')) } catch(e) { alert('PDF 오류: ' + e.message) } }}>📄 심화 분석 저장하기 (PDF)</button>
          <button style={{ width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', marginTop: 10 }} onClick={handleRestart}>처음으로 돌아가기</button>
        </div>
      </div>
    )
  }

  // ── 길일 결과 ──
  if (screen === 'gilil_result') {
    const months = gililData ? Object.values(gililData) : []
    const [selMonth, setSelMonth] = useState(0)
    const [selDay, setSelDay] = useState(null)
    const cur = months[selMonth]
    return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #0D1B3E 0%, #050D1F 100%)' }}>
          <div style={{ fontSize: 36 }}>吉</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginTop: 8 }}>{gilil목적} 길일 추천</h1>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 100px', width: '100%', boxSizing: 'border-box' }}>
          {isGililStreaming && <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>🔍 길일을 찾고 있어요...</div>}
          {!isGililStreaming && gililData && (
            <>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '16px 0 12px', scrollbarWidth: 'none' }}>
                {months.map((m, i) => <button key={i} onClick={() => { setSelMonth(i); setSelDay(null) }} style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 20, fontSize: 12, border: '0.5px solid', cursor: 'pointer', borderColor: selMonth === i ? '#C9A94E' : 'rgba(255,255,255,0.2)', background: selMonth === i ? '#C9A94E' : 'transparent', color: selMonth === i ? '#0D1B3E' : 'rgba(255,255,255,0.5)', fontWeight: selMonth === i ? 700 : 400 }}>{m.month}월</button>)}
              </div>
              {cur && (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 8 }}>
                    {['일','월','화','수','목','금','토'].map((d, i) => <div key={d} style={{ fontSize: 11, padding: '2px 0', color: i === 0 ? 'rgba(220,80,80,0.6)' : 'rgba(255,255,255,0.35)' }}>{d}</div>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {(() => {
                      const startDay = new Date(cur.year, cur.month - 1, 1).getDay()
                      const daysInMonth = new Date(cur.year, cur.month, 0).getDate()
                      const gililMap = {}; cur.days.forEach(d => { gililMap[d.date] = d.comment })
                      const cells = []
                      for (let i = 0; i < startDay; i++) cells.push(<div key={`e${i}`} />)
                      for (let d = 1; d <= daysInMonth; d++) {
                        const isGilil = !!gililMap[d], isSun = (startDay + d - 1) % 7 === 0, isSelected = selDay === d
                        cells.push(<div key={d} onClick={() => isGilil && setSelDay(isSelected ? null : d)} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 12, borderRadius: 8, cursor: isGilil ? 'pointer' : 'default', background: isGilil ? 'rgba(201,169,78,0.18)' : 'transparent', border: isSelected ? '1.5px solid #C9A94E' : isGilil ? '0.5px solid rgba(201,169,78,0.5)' : 'none', color: isGilil ? (isSun ? '#f4a0a0' : '#f0d080') : (isSun ? 'rgba(220,80,80,0.5)' : 'rgba(255,255,255,0.55)'), fontWeight: isGilil ? 600 : 400 }}>
                          {d}{isGilil && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A94E', marginTop: 2 }} />}
                        </div>)
                      }
                      return cells
                    })()}
                  </div>
                  {selDay && cur.days.find(d => d.date === selDay) && (
                    <div style={{ background: 'rgba(201,169,78,0.12)', border: '0.5px solid rgba(201,169,78,0.4)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f0d080', lineHeight: 1.6, marginTop: 10 }}>
                      {cur.month}월 {selDay}일 — {cur.days.find(d => d.date === selDay).comment}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ position: 'fixed', bottom: 0, width: '100%', background: '#050D1F', borderTop: '1px solid rgba(201,169,78,0.15)', padding: '12px 20px' }}>
          <button onClick={handleRestart} style={{ width: '100%', padding: '14px', borderRadius: 10, border: '1px solid rgba(201,169,78,0.3)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer' }}>처음으로 돌아가기</button>
        </div>
      </div>
    )
  }

  // ── 궁합 입력 ──
  if (screen === 'gunghab_input') {
    const isStep1 = gunghabStep === 1
    const myBirthdateValid = birthYear.length === 4 && Number(birthMonth) >= 1 && Number(birthMonth) <= 12 && Number(birthDay) >= 1
    const myBirthtimeValid = timeUnknown || (timeHour !== '' && timeMin !== '')
    const canStep1Next = gender !== '' && myBirthdateValid && myBirthtimeValid
    const canStep2Next = partnerGender !== '' && partnerBirthdateValid && partnerBirthtimeValid

    const TimeSelector = ({ ampm, setAmpm, hour, setHour, min, setMin, unknown, setUnknown }) => (
      <>
        <button style={{ width: '100%', padding: '13px 16px', border: `1px solid ${unknown ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: unknown ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: unknown ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: unknown ? 600 : 400, cursor: 'pointer', textAlign: 'center', marginBottom: 16 }} onClick={() => { setUnknown(true); setHour(''); setMin('') }}>✓ 태어난 시간 모름</button>
        {!unknown && (
          <>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8 }}>오전 / 오후</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {['오전','오후'].map(ap => <button key={ap} style={{ padding: '14px', fontSize: 15, fontWeight: ampm === ap ? 700 : 400, border: `2px solid ${ampm === ap ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: ampm === ap ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: ampm === ap ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setAmpm(ap)}>{ap === '오전' ? '🌅' : '🌇'} {ap}</button>)}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8 }}>시 선택</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => <button key={h} style={{ padding: '12px 4px', fontSize: 14, fontWeight: hour === String(h) ? 700 : 400, border: `1px solid ${hour === String(h) ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, background: hour === String(h) ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: hour === String(h) ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setHour(String(h))}>{h}시</button>)}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8 }}>분 선택</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {['00','10','20','30','40','50'].map(m => <button key={m} style={{ padding: '12px 4px', fontSize: 14, fontWeight: min === m ? 700 : 400, border: `1px solid ${min === m ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, background: min === m ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: min === m ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setMin(m)}>{m}분</button>)}
            </div>
            {hour && min && <p style={{ fontSize: 13, color: '#C9A84C', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>✓ {ampm} {hour}시 {min}분</p>}
          </>
        )}
        {unknown && <button style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' }} onClick={() => setUnknown(false)}>시간 직접 선택하기</button>}
      </>
    )

    const DateRow = ({ year, setYear, month, setMonth, day, setDay, lunar, setLunar }) => (
      <>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: !lunar ? 600 : 400, border: `1px solid ${!lunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: !lunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: !lunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setLunar(false)}>양력 🌞</button>
          <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: lunar ? 600 : 400, border: `1px solid ${lunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: lunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: lunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setLunar(true)}>음력 🌙</button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
          <input style={{ width: 90, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="년도" value={year} onChange={e => setYear(e.target.value.slice(0,4))} />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>년</span>
          <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="월" value={month} onChange={e => setMonth(e.target.value.slice(0,2))} />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>월</span>
          <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="일" value={day} onChange={e => setDay(e.target.value.slice(0,2))} />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>일</span>
        </div>
      </>
    )

    return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #0D1B3E 0%, #050D1F 100%)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 10 }}>合</div>
          <h1 style={{ wordBreak: 'keep-all', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>궁합 분석</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{isStep1 ? '먼저 내 정보를 입력해주세요' : '이제 상대방 정보를 입력해주세요'}</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 99, margin: '14px 0 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: isStep1 ? '50%' : '100%', background: '#C9A84C', borderRadius: 99, transition: 'width 0.35s ease' }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: 4, marginBottom: 8 }}>{isStep1 ? '1' : '2'} / 2</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
          {isStep1 ? (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>나의 정보</h2>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8 }}>이름 (선택)</p>
                <input style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', boxSizing: 'border-box', outline: 'none' }} type="text" placeholder="내 이름을 입력해주세요" value={myName} onChange={e => setMyName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {['여성','남성'].map(g => <button key={g} style={{ padding: '28px 16px', border: `2px solid ${gender === g ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: gender === g ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontSize: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }} onClick={() => setGender(g)}><span>{g === '여성' ? '♀️' : '♂️'}</span><span style={{ fontSize: 14, fontWeight: 600, color: gender === g ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>{g}</span></button>)}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 12 }}>내 생년월일 · 시간</h2>
              <DateRow year={birthYear} setYear={setBirthYear} month={birthMonth} setMonth={setBirthMonth} day={birthDay} setDay={setBirthDay} lunar={isLunar} setLunar={setIsLunar} />
              <TimeSelector ampm={timeAmPm} setAmpm={setTimeAmPm} hour={timeHour} setHour={setTimeHour} min={timeMin} setMin={setTimeMin} unknown={timeUnknown} setUnknown={setTimeUnknown} />
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>상대방 정보</h2>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8 }}>상대방 이름 (선택)</p>
                <input style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', boxSizing: 'border-box', outline: 'none' }} type="text" placeholder="상대방 이름을 입력해주세요" value={partnerName} onChange={e => setPartnerName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {['여성','남성'].map(g => <button key={g} style={{ padding: '28px 16px', border: `2px solid ${partnerGender === g ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: partnerGender === g ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontSize: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }} onClick={() => setPartnerGender(g)}><span>{g === '여성' ? '♀️' : '♂️'}</span><span style={{ fontSize: 14, fontWeight: 600, color: partnerGender === g ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>{g}</span></button>)}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 12 }}>상대방 생년월일 · 시간</h2>
              <DateRow year={partnerBirthYear} setYear={setPartnerBirthYear} month={partnerBirthMonth} setMonth={setPartnerBirthMonth} day={partnerBirthDay} setDay={setPartnerBirthDay} lunar={partnerIsLunar} setLunar={setPartnerIsLunar} />
              <TimeSelector ampm={partnerTimeAmPm} setAmpm={setPartnerTimeAmPm} hour={partnerTimeHour} setHour={setPartnerTimeHour} min={partnerTimeMin} setMin={setPartnerTimeMin} unknown={partnerTimeUnknown} setUnknown={setPartnerTimeUnknown} />
            </>
          )}
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.15)', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 15, cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }} onClick={() => { if (isStep1) setScreen('landing'); else setGunghabStep(1) }}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 600, background: (isStep1 ? !canStep1Next : !canStep2Next) ? 'rgba(201,168,76,0.2)' : '#C9A84C', color: (isStep1 ? !canStep1Next : !canStep2Next) ? 'rgba(255,255,255,0.3)' : '#0A1628', border: 'none', borderRadius: 10, cursor: (isStep1 ? !canStep1Next : !canStep2Next) ? 'not-allowed' : 'pointer' }}
            disabled={isStep1 ? !canStep1Next : !canStep2Next}
            onClick={() => {
              if (isStep1) { setGunghabStep(2); return }
              if (IS_ADMIN) { handleGunghabAnalyze(null); return }
              const IMP = window.IMP; IMP.init('imp87662575')
              const _pbt = (() => { if (partnerTimeUnknown) return ''; if (!partnerTimeHour || !partnerTimeMin) return ''; let h = Number(partnerTimeHour); if (partnerTimeAmPm === '오전' && h === 12) h = 0; if (partnerTimeAmPm === '오후' && h !== 12) h += 12; return `${String(h).padStart(2,'0')}:${String(partnerTimeMin).padStart(2,'0')}` })()
              const _params = new URLSearchParams({ payment: 'gunghab', imp_success: 'true', g: gender, by: birthYear, bm: birthMonth, bd: birthDay, il: isLunar ? '1' : '0', bt: birthtime || '', mn: myName || '', pn: partnerName || '', pg: partnerGender, pby: partnerBirthYear, pbm: partnerBirthMonth, pbd: partnerBirthDay, ptu: partnerTimeUnknown ? '1' : '0', pil: partnerIsLunar ? '1' : '0', pbt: _pbt, ptap: partnerTimeAmPm }).toString()
              IMP.request_pay({ pg: 'html5_inicis', pay_method: 'card', merchant_uid: `gunghab_${Date.now()}`, name: '마이사주 궁합 분석', amount: 1900, buyer_name: myName || '고객', m_redirect_url: `${window.location.origin}${window.location.pathname}?${_params}` }, (rsp) => { if (rsp.success) handleGunghabAnalyze(null); else alert('결제가 취소되었습니다.') })
            }}>
            {isStep1 ? '다음 — 상대방 정보 입력' : '💕 궁합 분석받기 (1,900원)'}
          </button>
        </div>
      </div>
    )
  }

  // ── 궁합 결과 ──
  if (screen === 'result' && serviceType === 'gunghab') {
    const gunghabSections = parseSections(gunghabText)
    return (
      <div style={{ minHeight: '100vh', background: '#050D1F' }}>
        <div id="gunghab-result-content" style={{ maxWidth: 480, margin: '0 auto', padding: '12px 16px 40px', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
            <span style={{ fontSize: 36 }}>💕</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginTop: 8 }}>두 사람의 궁합 분석</h2>
          </div>
          {gunghabSajuData && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 10 }}>💕 두 사람의 사주팔자</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ label: gunghabSajuData.my.name + '님', data: gunghabSajuData.my }, { label: gunghabSajuData.partner.name + '님', data: gunghabSajuData.partner }].map(({ label, data }) => (
                  <div key={label} style={{ background: '#1B2A4A', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, padding: '12px 10px' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#C9A84C', textAlign: 'center', marginBottom: 8 }}>{label}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[{ k: '시주(時)', v: data.시주 }, { k: '일주(日)', v: data.일주 }, { k: '월주(月)', v: data.월주 }, { k: '년주(年)', v: data.년주 }].map(({ k, v }) => (
                        <div key={k} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 7, padding: '8px 4px', border: '1px solid rgba(201,168,76,0.15)' }}>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 3 }}>{k}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isGunghabStreaming && gunghabText && <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '16px 18px', marginBottom: 8, fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{removeMarkers(gunghabText)}<span style={{ opacity: 0.4 }}>▌</span></div>}
          {isGunghabStreaming && !gunghabText && <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '24px 20px', marginBottom: 12 }}><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>💕 두 사람의 궁합을 분석하고 있어요...</span></div></div>}
          {!isGunghabStreaming && gunghabSections.map((sec, i) => <Accordion key={i} title={sec.title} content={sec.content} isGunghab={true} defaultOpen={i === 0} />)}
          <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 10, marginTop: 16 }}>
            <p style={{ fontSize: 13, color: '#C9A84C', fontWeight: 600, marginBottom: 6 }}>📄 PDF 저장 전에 확인해주세요!</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>각 항목을 모두 펼친 후 저장하면 전체 내용이 PDF에 담겨요.</p>
          </div>
          <button style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 600, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10, cursor: 'pointer', color: '#C9A84C', marginBottom: 10 }} onClick={async () => { try { await generatePDF('gunghab-result-content', '마이사주_궁합분석_' + (myName || '결과')) } catch(e) { alert('PDF 오류: ' + e.message) } }}>📄 궁합 분석 저장하기 (PDF)</button>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 6, lineHeight: 1.6 }}>📱 모바일에서는 PDF 저장이 되지 않을 수 있어요. PC에서 이용해주세요.</p>
          <button style={{ width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', marginTop: 10 }} onClick={handleRestart}>처음으로 돌아가기</button>
          {preEmail ? (
            <div style={{ marginTop: 20, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: 20, marginBottom: 6 }}>✅</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#C9A84C', marginBottom: 4 }}>이메일 발송 완료!</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{preEmail}<br/>로 결과를 보내드렸어요.</p>
            </div>
          ) : (
            <div style={{ marginTop: 20, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 12, padding: '20px' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#C9A84C', marginBottom: 6 }}>📧 이메일로 결과 받기</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input id="gunghab-email-input" type="email" placeholder="이메일 주소 입력" style={{ flex: 1, padding: '10px 14px', fontSize: 13, border: '1px solid rgba(180,160,110,0.4)', borderRadius: 8, background: '#FFFFFF', color: '#1B1B1B', outline: 'none' }} />
                <button style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, background: '#C9A84C', color: '#0A1628', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={async () => {
                    const email = document.getElementById('gunghab-email-input').value
                    if (!email || !email.includes('@')) { alert('이메일 주소를 확인해주세요.'); return }
                    const btn = document.querySelector('#gunghab-email-input + button'); btn.textContent = '발송 중...'; btn.disabled = true
                    try { const res = await fetch(`${API_URL}/api/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: email, subject: `💕 ${myName || 'A'}님 & ${partnerName || 'B'}님 궁합 분석 결과`, html: `<div style="font-family:sans-serif;">${parseSections(gunghabText).map(s => `<h2>${s.title}</h2><p>${s.content}</p>`).join('')}</div>` }) }); if (!res.ok) throw new Error('실패'); document.getElementById('gunghab-email-input').dataset.sent = 'true'; alert('이메일을 발송했어요! 😊') } catch { alert('발송 오류가 발생했습니다.') }
                    finally { btn.textContent = '발송'; btn.disabled = false }
                  }}>발송</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── 이메일 모달 ──
  if (emailModal) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}>
        <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 16, padding: '32px 24px', maxWidth: 380, width: '100%' }}>
          <p style={{ fontSize: 22, textAlign: 'center', marginBottom: 8 }}>📧</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#C9A84C', textAlign: 'center', marginBottom: 16 }}>결과 받을 이메일을 입력해주세요</p>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.9, margin: 0 }}>📱 모바일에서는 결과 저장이 안 될 수 있어요.<br/>💻 PC에서는 PDF로 저장 가능해요.<br/>📩 이메일로 결과를 보내드릴게요.<br/>🔒 이메일은 결과 발송에만 사용됩니다.</p>
          </div>
          <input type="email" placeholder="이메일 주소 입력" value={preEmail} onChange={e => setPreEmail(e.target.value)} style={{ width: '100%', padding: '12px 16px', fontSize: 15, border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10, background: '#FFFFFF', color: '#1B1B1B', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
          <button style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, background: '#C9A84C', color: '#0A1628', border: 'none', borderRadius: 10, cursor: 'pointer', marginBottom: 10 }} onClick={() => { if (!preEmail || !preEmail.includes('@')) { alert('이메일 주소를 확인해주세요.'); return } const cb = emailModal.onConfirm; setEmailModal(null); cb(preEmail) }}>결제하기 →</button>
          <button style={{ width: '100%', padding: '12px', fontSize: 13, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }} onClick={() => { const cb = emailModal.onConfirm; setEmailModal(null); cb(null) }}>이메일 없이 결제하기</button>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 4 }}>이메일 없이 결제하면 결과를 저장할 수 없어요.</p>
        </div>
      </div>
    )
  }

  // ── 랜딩 ──
  if (screen === 'landing') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#050D1F' }}>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 50%, #0D1B3E 0%, #050D1F 40%, #000510 100%)' }}/>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 30%, rgba(100,140,255,0.12) 0%, transparent 60%)' }}/>
          {[...Array(30)].map((_, i) => <div key={i} style={{ position: 'absolute', width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1, borderRadius: '50%', background: i % 7 === 0 ? '#C9A84C' : 'white', opacity: 0.3 + (i % 3) * 0.15, top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%` }}/>)}
          <div style={{ position: 'relative', textAlign: 'center', padding: '52px 24px 36px', margin: '20px 16px 0', borderRadius: 16, border: '1px solid rgba(201,168,76,0.5)', background: 'rgba(5,13,31,0.6)', backdropFilter: 'blur(8px)' }}>
            <div style={{ marginBottom: 20 }}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <defs>
                  <linearGradient id="starV" x1="40" y1="0" x2="40" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#F5E090"/><stop offset="50%" stopColor="#C9A84C"/><stop offset="100%" stopColor="#F5E090"/></linearGradient>
                  <linearGradient id="starH" x1="0" y1="40" x2="80" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#F5E090"/><stop offset="50%" stopColor="#C9A84C"/><stop offset="100%" stopColor="#F5E090"/></linearGradient>
                </defs>
                <path d="M40 4L41.2 37L40 76L38.8 37L40 4Z" fill="url(#starV)"/>
                <path d="M4 40L37 38.8L76 40L37 41.2L4 40Z" fill="url(#starH)"/>
                <circle cx="40" cy="40" r="2.5" fill="#FFF8DC"/>
              </svg>
            </div>
            <h1 style={{ wordBreak: 'keep-all', fontSize: 34, fontWeight: 800, color: '#FFFFFF', marginBottom: 12, lineHeight: 1.25, letterSpacing: '-0.02em' }}>나는 죽어도 안되는 게,<br/>쟤는 왜 쉽게 될까</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: 24 }}>방향이 달랐던 거예요.<br/><span style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15 }}>사주가 알려줄게요.</span></p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.5)', padding: '9px 22px', borderRadius: 20, fontSize: 13, color: '#C9A84C', fontWeight: 600 }}>
              <span>⏰</span><span>오늘만 <span style={{ fontWeight: 800 }}>1,900원</span></span>
            </div>
          </div>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 24px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', wordBreak: 'keep-all', fontWeight: 700 }}>노력이 부족한 게 아니에요.<br/>방향이 틀린 거예요.</p>
            <div style={{ width: 30, height: 1, background: 'rgba(201,168,76,0.3)', margin: '20px auto' }}/>
            <p style={{ fontSize: 17, lineHeight: 1.75, color: '#C9A84C', wordBreak: 'keep-all', fontWeight: 700 }}>사주팔자는 내 북극성이<br/>어느 쪽에 있는지 알려주는 지도예요.</p>
          </div>
        </div>

        {/* 천간 섹션 */}
        <div style={{ background: '#0D1B3E', borderTop: '1px solid rgba(201,168,76,0.3)', borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px 28px', width: '100%', boxSizing: 'border-box' }}>
            <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.7)', textAlign: 'center', marginBottom: 4, fontWeight: 600, letterSpacing: '0.12em' }}>YOUR ENERGY</p>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20, fontWeight: 700 }}>나는 어떤 기운일까? — 일간(日干)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { key: '갑목', ohaeng: '木', color: '#4ADE80', title: '甲 갑목', sub: '하늘을 향해 곧게 자라는 나무', good: '목표가 뚜렷한 곳, 내가 왜 하는지 보이는 일', bad: '이유 없이 "그냥 해"가 반복되는 환경' },
                { key: '을목', ohaeng: '木', color: '#4ADE80', title: '乙 을목', sub: '어디서든 뿌리내리는 생명력', good: '세심하게 인정받는 분위기, 디테일이 빛나는 자리', bad: '감정 무시하는 곳, 거칠고 무뚝뚝한 환경' },
                { key: '병화', ohaeng: '火', color: '#F87171', title: '丙 병화', sub: '주변을 환하게 밝히는 태양', good: '사람들 앞에 서는 자리, 반응이 오는 무대', bad: '혼자 조용히 처리해야 하는 단절된 환경' },
                { key: '정화', ohaeng: '火', color: '#F87171', title: '丁 정화', sub: '어둠 속에서 깊이 타오르는 불꽃', good: '한 가지에 깊이 파고드는 환경, 조용한 집중', bad: '5분마다 끊기는 업무, 산만하고 소란스러운 곳' },
                { key: '무토', ohaeng: '土', color: '#C9A84C', title: '戊 무토', sub: '모든 것을 품어내는 큰 산', good: '내가 중심이 되어 운영하는 구조, 믿고 맡기는 조직', bad: '책임만 지고 권한은 없는 자리, 끝없는 희생 요구' },
                { key: '기토', ohaeng: '土', color: '#C9A84C', title: '己 기토', sub: '씨앗을 키워내는 비옥한 땅', good: '규칙이 있고 예측 가능한 환경, 내 역할이 명확한 곳', bad: '매일 바뀌는 방침, 즉흥적이고 뒤죽박죽인 조직' },
                { key: '경금', ohaeng: '金', color: '#E8C96A', title: '庚 경금', sub: '단단하고 날카로운 원석의 힘', good: '기준이 명확한 곳, 성과가 숫자로 보이는 환경', bad: '애매하고 흐릿한 기준, 불공정한 평가가 반복되는 곳' },
                { key: '신금', ohaeng: '金', color: '#E8C96A', title: '辛 신금', sub: '정교하게 다듬어진 보석의 감각', good: '품격 있는 환경, 섬세함이 경쟁력이 되는 자리', bad: '저급하고 거친 분위기, 노력이 무시당하는 곳' },
                { key: '임수', ohaeng: '水', color: '#60A5FA', title: '壬 임수', sub: '넓고 유연하게 흐르는 큰 강', good: '새로운 정보가 들어오는 곳, 판을 키울 수 있는 환경', bad: '변화 없이 고여있는 조직, 외부와 단절된 폐쇄적인 곳' },
                { key: '계수', ohaeng: '水', color: '#60A5FA', title: '癸 계수', sub: '깊은 곳에서 솟아오르는 지하수', good: '혼자 생각할 시간이 있는 환경, 깊이가 인정받는 자리', bad: '시끄럽고 감정 소모 심한 곳, 내면을 무시하는 환경' },
              ].map((c) => (
                <div key={c.key} onClick={() => setOpenCheongan(openCheongan === c.key ? null : c.key)} style={{ background: openCheongan === c.key ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${openCheongan === c.key ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.12)'}`, borderRadius: 10, padding: '14px 12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${c.color}18`, border: `1px solid ${c.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: c.color, fontFamily: 'Georgia, serif' }}>{c.ohaeng}</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: openCheongan === c.key ? '#C9A84C' : 'rgba(255,255,255,0.85)' }}>{c.title}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5, margin: 0 }}>{c.sub}</p>
                  {openCheongan === c.key && (
                    <div style={{ marginTop: 10, borderTop: '1px solid rgba(201,168,76,0.2)', paddingTop: 10 }}>
                      <p style={{ fontSize: 11, color: '#4ADE80', fontWeight: 600, marginBottom: 4 }}>✅ {c.good}</p>
                      <p style={{ fontSize: 11, color: '#F87171', fontWeight: 600, marginBottom: 4 }}>❌ {c.bad}</p>
                      <p style={{ fontSize: 11, color: '#C9A84C', fontWeight: 500 }}>🔒 내 일간이 뭔지 모른다면? 사주 분석에서 확인하세요</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 서비스 카드 */}
        <div style={{ background: '#0A1628' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px 48px', width: '100%', boxSizing: 'border-box' }}>
            <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.7)', textAlign: 'center', marginBottom: 4, fontWeight: 600, letterSpacing: '0.12em' }}>SERVICES</p>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20, fontWeight: 700 }}>무엇이 궁금하세요?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { type: 'saju', char: '命', label: '나의 사주', sub: '돈·직업·연애\n내 팔자가 정해놨다', badge: 'FREE PREVIEW', border: 'rgba(201,168,76,0.3)', bg: 'rgba(201,168,76,0.06)' },
                { type: 'gunghab', char: '合', label: '궁합', sub: '우리 잘 맞는지\n사주로 확인', border: 'rgba(155,29,58,0.3)', bg: 'rgba(155,29,58,0.06)', onClick: () => { setServiceType('gunghab'); setGunghabStep(1); setScreen('gunghab_input') } },
                { type: 'child', char: '子', label: '혼냈던 게 재능이었어요', sub: '타고난 재능·진로\n미리 확인', border: 'rgba(45,122,82,0.3)', bg: 'rgba(45,122,82,0.06)' },
                { type: '노후', char: '老', label: '내 후반전', sub: '말년 재물·건강\n황혼 인연 미리 확인', border: 'rgba(45,106,155,0.3)', bg: 'rgba(45,106,155,0.06)' },
              ].map(({ type, char, label, sub, badge, border, bg, onClick }) => (
                <button key={type} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '20px 12px', cursor: 'pointer', textAlign: 'center' }}
                  onClick={onClick || (() => { setServiceType(type); setScreen('input') })}>
                  {badge && <span style={{ display: 'inline-block', background: 'rgba(201,168,76,0.15)', color: '#C9A84C', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 2, marginBottom: 12, border: '1px solid rgba(201,168,76,0.3)', letterSpacing: '0.1em' }}>{badge}</span>}
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 12, marginTop: badge ? 0 : 22 }}>{char}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{sub}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginTop: 12 }}>1,900원</div>
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <button style={{ width: '100%', background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.06))', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 10, padding: '20px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center' }} onClick={() => { setServiceType('deep'); setScreen('input') }}>
                <div style={{ fontSize: 40 }}>🔮</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C', letterSpacing: '0.1em', marginBottom: 6, background: 'rgba(201,168,76,0.15)', display: 'inline-block', padding: '2px 8px', borderRadius: 2, border: '1px solid rgba(201,168,76,0.3)' }}>DEEP ANALYSIS</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#C9A84C', marginBottom: 4 }}>사주 심화 분석</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>10년 대운 · 월별 운세 · 귀인 분석<br/>지금 해야 할 것 vs 하지 말아야 할 것</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginTop: 6 }}>9,900원</div>
                </div>
              </button>
            </div>
            <div style={{ marginBottom: 12, opacity: 0.5 }}>
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center' }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, serif' }}>吉</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#C9A84C', marginBottom: 4 }}>길일 추천</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>이사·계약·개업·결혼·수술</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>🔜 준비중</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid rgba(201,168,76,0.15)', marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                {[['⭐','만족도 94%'],['🔒','안전한 결제'],['⚡','즉시 확인']].map(([e,t]) => (
                  <div key={t} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20 }}>{e}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div style={{ borderTop: '1px solid rgba(201,168,76,0.2)', padding: '28px 20px 44px', background: '#050D1F' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginBottom: 10 }}>봄결</p>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 2.2 }}>
              <p>대표자 · 손영주</p><p>사업자등록번호 · 291-17-02825</p>
              <p>사업장 · 경기도 남양주시 별내3로 322, 701호 -V133호</p>
              <p>전화 · 010-9772-1987</p><p>이메일 · redions77@naver.com</p>
              <p>통신판매업신고 · 제2026-별내-1183호</p><p>과세유형 · 간이과세자</p>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              <button onClick={() => setScreen('terms')} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>이용약관</button>
              <button onClick={() => setScreen('privacy')} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>개인정보처리방침</button>
              <button onClick={() => setScreen('refund')} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>환불정책</button>
              <button onClick={() => window.open('https://open.kakao.com/me/mysajushop', '_blank')} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>고객문의</button>
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 12 }}>© 2026 봄결. All rights reserved.</p>
          </div>
        </div>
      </div>
    )
  }

  // ── 입력 화면 ──
  if (screen === 'input') {
    const serviceNames = { saju: '나의 사주', child: '혼냈던 게 재능이었어요', 노후: '내 후반전, 어떻게 흘러갈까?', deep: '사주 심화 분석' }
    const serviceChar = { saju: '命', child: '子', 노후: '老', deep: '🔮' }
    return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #0D1B3E 0%, #050D1F 100%)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 10 }}>{serviceChar[serviceType] || '命'}</div>
          <h1 style={{ wordBreak: 'keep-all', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>{serviceNames[serviceType] || '사주 분석'}</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>생년월일을 입력하면 무료로 먼저 확인해드려요</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 99, margin: '14px 0 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#C9A84C', borderRadius: 99, transition: 'width 0.35s ease' }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: 4, marginBottom: 8 }}>{step + 1} / {STEPS.length}</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
          {currentStepId === 'gender' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>성별을 알려주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>사주 풀이에 사용돼요</p>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8 }}>이름 (선택)</p>
                <input style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', boxSizing: 'border-box', outline: 'none' }} type="text" placeholder="이름을 입력해주세요" value={myName} onChange={e => setMyName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {['여성','남성'].map(g => <button key={g} style={{ padding: '28px 16px', border: `2px solid ${gender === g ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: gender === g ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontSize: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }} onClick={() => setGender(g)}><span>{g === '여성' ? '♀️' : '♂️'}</span><span style={{ fontSize: 14, fontWeight: 600, color: gender === g ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>{g}</span></button>)}
              </div>
            </>
          )}
          {currentStepId === 'marital' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>결혼 상태를 알려주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>사주 풀이에 사용돼요</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[{ value: '미혼', emoji: '💫', sub: '결혼 전이거나 현재 혼자예요' }, { value: '기혼', emoji: '💍', sub: '결혼해서 살고 있어요' }].map(({ value, emoji, sub }) => (
                  <button key={value} style={{ padding: '18px 20px', border: `2px solid ${maritalStatus === value ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: maritalStatus === value ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => setMaritalStatus(value)}>
                    <span style={{ fontSize: 28 }}>{emoji}</span>
                    <div style={{ textAlign: 'left' }}><div style={{ fontSize: 15, fontWeight: 600, color: maritalStatus === value ? '#C9A84C' : '#FFFFFF' }}>{value}</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{sub}</div></div>
                  </button>
                ))}
              </div>
            </>
          )}
          {currentStepId === 'birthdate' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>생년월일을 알려주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>숫자로 직접 입력해주세요</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: !isLunar ? 600 : 400, border: `1px solid ${!isLunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: !isLunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: !isLunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setIsLunar(false)}>양력 🌞</button>
                <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: isLunar ? 600 : 400, border: `1px solid ${isLunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: isLunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: isLunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setIsLunar(true)}>음력 🌙</button>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                <input style={{ width: 90, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="년도" value={birthYear} onChange={e => setBirthYear(e.target.value.slice(0,4))} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>년</span>
                <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="월" value={birthMonth} onChange={e => setBirthMonth(e.target.value.slice(0,2))} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>월</span>
                <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="일" value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0,2))} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>일</span>
              </div>
              {birthdateValid && <p style={{ fontSize: 13, color: '#C9A84C', textAlign: 'center', fontWeight: 600 }}>✓ {birthYear}년 {birthMonth}월 {birthDay}일 {isLunar ? '(음력)' : '(양력)'}</p>}
            </>
          )}
          {currentStepId === 'birthtime' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>태어난 시간을 알려주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>모르셔도 괜찮아요</p>
              <button style={{ width: '100%', padding: '13px 16px', border: `1px solid ${timeUnknown ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: timeUnknown ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeUnknown ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: timeUnknown ? 600 : 400, cursor: 'pointer', textAlign: 'center', marginBottom: 16 }} onClick={() => { setTimeUnknown(true); setTimeHour(''); setTimeMin('') }}>✓ 태어난 시간 모름</button>
              {!timeUnknown && (
                <>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8 }}>오전 / 오후</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {['오전','오후'].map(ap => <button key={ap} style={{ padding: '14px', fontSize: 15, fontWeight: timeAmPm === ap ? 700 : 400, border: `2px solid ${timeAmPm === ap ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: timeAmPm === ap ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeAmPm === ap ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setTimeAmPm(ap)}>{ap === '오전' ? '🌅' : '🌇'} {ap}</button>)}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8 }}>시 선택</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => <button key={h} style={{ padding: '12px 4px', fontSize: 14, fontWeight: timeHour === String(h) ? 700 : 400, border: `1px solid ${timeHour === String(h) ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, background: timeHour === String(h) ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeHour === String(h) ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setTimeHour(String(h))}>{h}시</button>)}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8 }}>분 선택</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {['00','10','20','30','40','50'].map(m => <button key={m} style={{ padding: '12px 4px', fontSize: 14, fontWeight: timeMin === m ? 700 : 400, border: `1px solid ${timeMin === m ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, background: timeMin === m ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeMin === m ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setTimeMin(m)}>{m}분</button>)}
                  </div>
                  {timeHour && timeMin && <p style={{ fontSize: 13, color: '#C9A84C', textAlign: 'center', fontWeight: 600 }}>✓ {timeAmPm} {timeHour}시 {timeMin}분</p>}
                </>
              )}
              {timeUnknown && <button style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' }} onClick={() => setTimeUnknown(false)}>시간 직접 선택하기</button>}
            </>
          )}
          {currentStepId === 'mbti' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>MBTI를 선택해주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>모르시면 건너뛰어도 돼요</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MBTI_LIST.map(m => <button key={m} style={{ border: `1px solid ${mbti === m ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer', background: mbti === m ? 'rgba(201,168,76,0.1)' : 'transparent', color: mbti === m ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontWeight: mbti === m ? 600 : 400 }} onClick={() => setMbti(mbti === m ? '' : m)}>{m}</button>)}
              </div>
            </>
          )}
          {currentStepId === 'blood' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>혈액형을 선택해주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>선택하지 않아도 분석은 가능해요</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {BLOOD_LIST.map(b => <button key={b} style={{ border: `1px solid ${blood === b ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer', background: blood === b ? 'rgba(201,168,76,0.1)' : 'transparent', color: blood === b ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontWeight: blood === b ? 600 : 400 }} onClick={() => setBlood(blood === b ? '' : b)}>{b}형</button>)}
              </div>
            </>
          )}
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.15)', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 15, cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }} onClick={goBack}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 600, background: !canGoNext() ? 'rgba(201,168,76,0.2)' : '#C9A84C', color: !canGoNext() ? 'rgba(255,255,255,0.3)' : '#0A1628', border: 'none', borderRadius: 10, cursor: !canGoNext() ? 'not-allowed' : 'pointer', letterSpacing: '0.03em' }} onClick={goNext} disabled={!canGoNext()}>
            {currentStepId === 'blood' ? (serviceType === 'deep' ? '심화 분석받기 (9,900원) 🔮' : '무료 사주 분석하기 ✨') : currentStepId === 'mbti' ? '다음 (건너뛰기 가능)' : '다음'}
          </button>
        </div>
      </div>
    )
  }

  // ── 결과 화면 (핵심! 로딩 화면 추가됨) ──
  if (screen === 'result') {
    const baseSections = parseSections(baseText)
    const paidSections = parseSections(paidText)
    return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
        <div id="result-content" style={{ maxWidth: 480, margin: '0 auto', padding: '12px 16px 40px', boxSizing: 'border-box', width: '100%' }}>

          {/* ★ 로딩 화면 — 분석 버튼 누른 직후 표시 */}
          {isBaseStreaming && (
            <div style={{ textAlign: 'center', padding: '10px', marginBottom: 12, fontSize: 13, color: 'rgba(201,168,76,0.7)', fontWeight: 600 }}>
              ✦ 분석 중 · {loadingCountdown}초 경과 ✦
            </div>
          )}

          {/* 사주팔자 카드 */}
          {!loadingPhase && sajuData?.사주 && (
            <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#C9A84C', marginBottom: 12, letterSpacing: '0.1em' }}>나의 사주팔자</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10, textAlign: 'center' }}>{sajuData.생년월일}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[{ label: '시주(時)', value: sajuData.사주.시주 }, { label: '일주(日)', value: sajuData.사주.일주 }, { label: '월주(月)', value: sajuData.사주.월주 }, { label: '년주(年)', value: sajuData.사주.년주 }].map(({ label, value }) => {
                  const 오행색 = { '甲갑': '#4ADE80', '乙을': '#4ADE80', '丙병': '#F87171', '丁정': '#F87171', '戊무': '#C9A84C', '己기': '#C9A84C', '庚경': '#E8C96A', '辛신': '#E8C96A', '壬임': '#60A5FA', '癸계': '#60A5FA' }
                  const 색 = 오행색[value?.slice(0, 2)] || '#FFFFFF'
                  return <div key={label} style={{ textAlign: 'center', background: `${색}12`, borderRadius: 8, padding: '10px 4px', border: `1px solid ${색}40` }}><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, display: 'block' }}>{label}</span><span style={{ fontSize: 13, fontWeight: 700, color: 색, lineHeight: 1.6 }}>{value || '-'}</span></div>
                })}
              </div>
            </div>
          )}

          {!loadingPhase && isBaseStreaming && baseText && <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '16px 18px', marginBottom: 8, fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{removeMarkers(baseText)}<span style={{ opacity: 0.4 }}>▌</span></div>}

          {!loadingPhase && !isBaseStreaming && baseSections.filter(s => !s.title.includes('행운미리보기')).map((sec, i) => <Accordion key={i} title={sec.title} content={sec.content} defaultOpen={i === 0} />)}

          {!loadingPhase && !isBaseStreaming && !paidSections.length && (() => {
            const luckySec = baseSections.find(s => s.title.includes('행운미리보기'))
            const color = luckySec?.content?.match(/색깔[:\s]+([^\n]+)/)?.[1]?.trim()
            if (!color) return null
            return (
              <div style={{ background: 'linear-gradient(135deg, #0D1B3E, #1B2A4A)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 12, padding: '20px', marginBottom: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#C9A84C', marginBottom: 12 }}>나의 행운 아이템</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(201,168,76,0.15)' }}><span style={{ fontSize: 10, color: '#C9A84C', fontWeight: 600, marginBottom: 3, display: 'block' }}>행운 색깔</span><span style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 500 }}>{color}</span></div>
                  {['마스코트','행운 방향','행운 숫자'].map(label => <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(201,168,76,0.15)', position: 'relative' }}><span style={{ fontSize: 10, color: '#C9A84C', fontWeight: 600, marginBottom: 3, display: 'block' }}>{label}</span><div style={{ height: 16, background: 'rgba(201,168,76,0.1)', borderRadius: 4 }} /><span style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 12 }}>🔒</span></div>)}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)', textAlign: 'center', marginTop: 12, fontWeight: 600 }}>🔒 마스코트·방향·숫자는 전체 분석에서 확인하세요</p>
              </div>
            )
          })()}

          {!loadingPhase && isPaidStreaming && paidText && <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '16px 18px', marginBottom: 8, fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{removeMarkers(paidText)}<span style={{ opacity: 0.4 }}>▌</span></div>}

          {!loadingPhase && !isPaidStreaming && paidSections.length > 0 && (
            <><p style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C', textAlign: 'center', margin: '16px 0 8px', letterSpacing: '0.08em' }}>✦ 전체 분석 결과 ✦</p>{paidSections.map((sec, i) => <Accordion key={i} title={sec.title} content={sec.content} isPaid={true} defaultOpen={i === 0} />)}</>
          )}

          {!loadingPhase && phase === 'done' && !isPaid && !isPaidStreaming && (
            <div style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #050D1F 100%)', borderRadius: 12, padding: '28px 20px', marginBottom: 12, textAlign: 'center', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 16 }}>FULL ANALYSIS</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 16, wordBreak: 'keep-all' }}>{serviceType === 'child' ? '아이의 타고난 운명을 전부 확인하세요' : serviceType === '노후' ? '당신의 노후를 미리 준비하세요' : '내 사주의 모든 것을 확인하세요'}</p>
              <div style={{ textAlign: 'left', marginBottom: 20 }}>
                {(serviceType === 'child' ? ['타고난 기질 · 성격 심층 분석','학습 스타일 · 공부가 잘 되는 환경','재능의 씨앗 · 빛나는 분야','진로 방향 · 어울리는 직업군','부모와의 관계 · 키우는 법','이 사주로 잘 크는 법']
                  : serviceType === '노후' ? ['노후 재물 심화 분석','건강 심화 분석','황혼 인연 심화','인간관계 · 사람운','월별 운세 12개월','노후를 빛나게 하는 법']
                  : ['인생 재운 흐름 (20대~말년)','직업운 · 커리어 방향','투자 · 부동산 전략','인간관계 · 사람운','월별 운세 12개월','행운 아이템 전체','이 사주로 잘 사는 법']
                ).map(item => <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><span style={{ color: '#C9A84C', fontWeight: 700, fontSize: 12 }}>✦</span><span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{item}</span></div>)}
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, color: '#C9A84C', marginBottom: 4 }}>1,900원</div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>결제 후 즉시 사용 가능</p>
              <button style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700, background: '#C9A84C', color: '#0A1628', border: 'none', borderRadius: 10, cursor: 'pointer' }}
                onClick={() => { requestPayWithEmail('전체 분석', (email) => { if (IS_ADMIN) { handlePaidAnalyze(email); return } const IMP = window.IMP; IMP.init('imp87662575'); IMP.request_pay({ pg: 'html5_inicis', pay_method: 'card', merchant_uid: `saju_${Date.now()}`, name: '마이사주 전체 분석', amount: 1900, buyer_name: myName || '고객', buyer_email: email || '' }, (rsp) => { if (rsp.success) handlePaidAnalyze(email); else alert('결제가 취소되었습니다.') }) }) }}>
                지금 전체 분석 받기 →
              </button>
            </div>
          )}

          {!loadingPhase && isPaidStreaming && !paidText && <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '24px 20px', marginBottom: 12 }}><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>전체 사주를 분석하고 있어요...</span></div></div>}

          {!loadingPhase && (
            <>
              <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '14px 16px', marginTop: 10 }}>
                <p style={{ fontSize: 13, color: '#C9A84C', fontWeight: 600, marginBottom: 6 }}>📄 PDF 저장 전에 확인해주세요!</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>각 항목을 모두 펼친 후 저장하면 전체 내용이 PDF에 담겨요.</p>
              </div>
              <button style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 600, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10, cursor: 'pointer', color: '#C9A84C', marginTop: 10 }} onClick={async () => { try { await generatePDF('result-content', '마이사주_분석결과_' + (myName || '결과')) } catch(e) { alert('PDF 오류: ' + e.message) } }}>📄 결과 저장하기 (PDF)</button>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 6 }}>📱 모바일에서는 PDF 저장이 되지 않을 수 있어요.</p>
              {((isPaid && serviceType === 'saju') || serviceType === 'deep') && (
                <div style={{ marginTop: 24, marginBottom: 8 }}>
                  <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.7)', textAlign: 'center', fontWeight: 600, letterSpacing: '0.12em', marginBottom: 16 }}>더 깊이 알고 싶다면?</p>
                  <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '20px', marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>🔮 사주 심화 분석</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 12 }}>기본 분석엔 없어요. 2026 하반기, 내가 올라타야 할 달 vs 조심해야 할 달. 귀인이 오는 시기까지.</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C' }}>9,900원</span>
                      <button style={{ padding: '10px 20px', fontSize: 14, fontWeight: 700, background: '#C9A84C', color: '#0A1628', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                        onClick={() => { requestPayWithEmail('심화 분석', (email) => { if (IS_ADMIN) { setScreen('deep_result'); handleDeepAnalyze(); return } const IMP = window.IMP; IMP.init('imp87662575'); IMP.request_pay({ pg: 'html5_inicis', pay_method: 'card', merchant_uid: `deep_${Date.now()}`, name: '마이사주 심화 분석', amount: 9900, buyer_name: myName || '고객', buyer_email: email || '' }, (rsp) => { if (rsp.success) { setScreen('deep_result'); handleDeepAnalyze() } else alert('결제가 취소되었습니다.') }) }) }}>확인하기 →</button>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: '20px', marginBottom: 10, opacity: 0.7 }}>
                    <p style={{ fontSize: 11, color: '#C9A84C', fontWeight: 600, marginBottom: 6 }}>🌟 인생 전략 풀패키지 — 29,900원</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>심화 분석 + 6개월 길일 + 직업/투자 타이밍 + 고급 PDF</p>
                    <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.5)', marginTop: 8 }}>🔜 준비 중</p>
                  </div>
                  <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '20px', marginBottom: 10, opacity: 0.5 }}>
                    <p style={{ fontSize: 11, color: '#C9A84C', fontWeight: 600, marginBottom: 6 }}>💎 AI 사주 상담 — 49,900원</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>풀패키지 + 내 고민 3가지 사주 맞춤 답변</p>
                    <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.5)', marginTop: 8 }}>🔜 준비 중</p>
                  </div>
                </div>
              )}
              <button style={{ width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', marginTop: 8 }} onClick={handleRestart}>처음으로 돌아가기</button>
              {isPaid && preEmail ? (
                <div style={{ marginTop: 20, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 20, marginBottom: 6 }}>✅</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#C9A84C', marginBottom: 4 }}>이메일 발송 완료!</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{preEmail}<br/>로 결과를 보내드렸어요.</p>
                </div>
              ) : (
                <div style={{ marginTop: 20, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 12, padding: '20px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#C9A84C', marginBottom: 6 }}>📧 이메일로 결과 받기</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 14, lineHeight: 1.7 }}>결과를 이메일로 받아두면 언제든 다시 볼 수 있어요.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input id="result-email-input" type="email" placeholder="이메일 주소 입력" style={{ flex: 1, padding: '10px 14px', fontSize: 13, border: '1px solid rgba(180,160,110,0.4)', borderRadius: 8, background: '#FFFFFF', color: '#1B1B1B', outline: 'none' }} />
                    <button style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, background: '#C9A84C', color: '#0A1628', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={async () => {
                        const email = document.getElementById('result-email-input').value
                        if (!email || !email.includes('@')) { alert('이메일 주소를 확인해주세요.'); return }
                        const btn = document.querySelector('#result-email-input + button'); btn.textContent = '발송 중...'; btn.disabled = true
                        const allSections = [...parseSections(baseText), ...parseSections(paidText)]
                        const htmlContent = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0D1B3E;color:#FFFFFF;"><h1 style="color:#C9A84C;text-align:center;">${serviceType === 'child' ? '🌱 자녀 학운 분석' : serviceType === '노후' ? '🌅 노후 운세 분석' : '✨ 나의 사주 분석'}</h1><p style="text-align:center;color:rgba(255,255,255,0.6);">${myName || ''}님의 분석 결과</p><hr style="border-color:rgba(201,168,76,0.3);margin:20px 0;">${allSections.map(s => `<h2 style="color:#C9A84C;">${s.title}</h2><p style="color:rgba(255,255,255,0.8);line-height:1.8;white-space:pre-wrap;">${s.content}</p>`).join('')}<hr style="border-color:rgba(201,168,76,0.3);margin:20px 0;"><p style="text-align:center;color:rgba(255,255,255,0.4);font-size:12px;">마이사주 · mysaju.shop</p></div>`
                        try { const res = await fetch(`${API_URL}/api/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: email, subject: `✨ ${myName || ''}님의 사주 분석 결과`, html: htmlContent }) }); if (!res.ok) throw new Error('실패'); document.getElementById('result-email-input').dataset.sent = 'true'; alert('이메일을 발송했어요! 😊') } catch { alert('발송 오류가 발생했습니다.') }
                        finally { btn.textContent = '발송'; btn.disabled = false }
                      }}>발송</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ── 약관/정책 화면들 ──
  if (screen === 'terms') return (
    <div style={{ minHeight: '100vh', background: '#050D1F', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 24 }}>이용약관</h1>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 2.2 }}>
          <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>제1조 (목적)</p><p style={{ marginBottom: 20 }}>본 약관은 봄결(이하 "회사")이 운영하는 mysaju.shop의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>제2조 (서비스 내용)</p><p style={{ marginBottom: 20 }}>회사는 사주 분석, 궁합, 길일 추천 등 사주명리학 기반의 디지털 콘텐츠 서비스를 제공합니다. 본 서비스는 참고용 정보 제공을 목적으로 하며, 전문적인 상담을 대체하지 않습니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>제3조 (면책)</p><p style={{ marginBottom: 20 }}>본 서비스는 사주명리학을 기반으로 한 참고용 콘텐츠이며, 회사는 분석 결과의 정확성에 대해 법적 책임을 지지 않습니다.</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 32 }}>시행일: 2026년 5월 26일 | 상호: 봄결 | 대표: 손영주</p>
        </div>
      </div>
    </div>
  )
  if (screen === 'privacy') return (
    <div style={{ minHeight: '100vh', background: '#050D1F', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 24 }}>개인정보처리방침</h1>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 2.2 }}>
          <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>1. 수집 항목</p><p style={{ marginBottom: 20 }}>이름(선택), 생년월일, 성별, 결제 정보(PG사를 통해 처리, 카드번호 저장 안 함)</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>2. 이용 목적</p><p style={{ marginBottom: 20 }}>사주 분석 서비스 제공, 결제 처리, 서비스 품질 향상</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>3. 보유 기간</p><p style={{ marginBottom: 20 }}>서비스 이용 종료 또는 이용자 요청 시 지체 없이 파기</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>4. 개인정보 보호책임자</p><p style={{ marginBottom: 20 }}>성명: 손영주 | 이메일: redions77@naver.com | 전화: 010-9772-1987</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 32 }}>시행일: 2026년 5월 26일 | 상호: 봄결</p>
        </div>
      </div>
    </div>
  )
  if (screen === 'refund') return (
    <div style={{ minHeight: '100vh', background: '#050D1F', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 24 }}>환불정책</h1>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 2.2 }}>
          <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>디지털 콘텐츠 환불 정책</p><p style={{ marginBottom: 20 }}>본 서비스는 결제 즉시 제공되는 디지털 콘텐츠로, 콘텐츠 제공 후 원칙적으로 환불이 제한됩니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>환불 가능한 경우</p>
          <p style={{ marginBottom: 4 }}>• 결제 후 콘텐츠가 정상적으로 제공되지 않은 경우</p>
          <p style={{ marginBottom: 20 }}>• 결제 당일 확인 전 취소 요청한 경우</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>환불 신청</p><p style={{ marginBottom: 20 }}>이메일(redions77@naver.com) 또는 전화(010-9772-1987)로 문의해 주세요.</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 32 }}>시행일: 2026년 5월 26일 | 상호: 봄결 | 대표: 손영주</p>
        </div>
      </div>
    </div>
  )

  return null
}
