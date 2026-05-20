import { useEffect, useState, useRef } from 'react'

// ── 상수 ──────────────────────────────────────────────
const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']
const STEPS = ['gender', 'birthdate', 'birthtime', 'mbti', 'blood']
const API_URL = 'https://love-fortune.onrender.com'

const MARITAL_OPTIONS = [
  { value: '미혼', emoji: '💫', label: '미혼', sub: '아직 결혼 전이에요' },
  { value: '기혼', emoji: '💍', label: '기혼', sub: '결혼해서 살고 있어요' },
  { value: '돌싱', emoji: '🌱', label: '돌싱', sub: '이혼 후 혼자예요' },
  { value: '돌싱2+', emoji: '🔥', label: '돌싱2+', sub: '이혼을 두 번 이상 했어요' },
]

// 가격 설정 — 전체 1,900원으로 단순화
const PRICE = 1900

function parseSections(text) {
  const sections = []
  const parts = text.split(/===(.+?)===/)
  for (let i = 1; i < parts.length; i += 2) {
    sections.push({ title: parts[i].trim(), content: parts[i + 1]?.trim() || '' })
  }
  return sections
}

function getMidnightCountdown() {
  const now = new Date()
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  const diff = midnight - now
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const s = {
  app: { minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' },
  landing: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  landingHero: {
    textAlign: 'center', padding: '48px 24px 32px',
    background: 'linear-gradient(160deg, #F3EEFF 0%, #FFF5FB 50%, #EEF4FF 100%)',
  },
  landingEmoji: { fontSize: 52, display: 'block', marginBottom: 12 },
  landingTitle: {
    wordBreak: 'keep-all', fontSize: 26, fontWeight: 800,
    color: '#1a1a2e', marginBottom: 8, lineHeight: 1.3,
    fontFamily: 'var(--font-display)',
  },
  landingSub: { fontSize: 14, color: '#666', lineHeight: 1.7, marginBottom: 24 },
  timerBanner: {
    background: 'linear-gradient(90deg, #7C3AED, #DB2777)',
    color: 'white', textAlign: 'center', padding: '10px 16px',
    fontSize: 13, fontWeight: 600,
  },
  timerNum: { fontSize: 16, fontWeight: 800, letterSpacing: 2, marginLeft: 8 },
  cardGrid: { maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px', width: '100%', boxSizing: 'border-box' },
  cardGridTitle: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16, fontWeight: 600, letterSpacing: '0.05em' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  serviceCard: (color) => ({
    background: color.bg, border: `1.5px solid ${color.border}`,
    borderRadius: 16, padding: '20px 16px', cursor: 'pointer',
    transition: 'all 0.2s', textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  }),
  serviceEmoji: { fontSize: 32, display: 'block', marginBottom: 8 },
  serviceLabel: (color) => ({ fontSize: 15, fontWeight: 700, color: color.text, marginBottom: 4, display: 'block' }),
  serviceSub: { fontSize: 11, color: '#888', lineHeight: 1.5, display: 'block' },
  servicePrice: (color) => ({ fontSize: 12, fontWeight: 700, color: color.accent, marginTop: 8, display: 'block' }),
  freeBadge: {
    display: 'inline-block', background: '#10B981', color: 'white',
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginBottom: 6,
  },
  header: { textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #F3EEFF 0%, var(--color-bg) 100%)' },
  heroEmoji: { fontSize: 36, display: 'block', marginBottom: 8 },
  heroTitle: { wordBreak: 'keep-all', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 },
  heroSub: { fontSize: 12, color: 'var(--color-text-muted)' },
  progressWrap: { maxWidth: 480, margin: '0 auto', padding: '0 16px', width: '100%', boxSizing: 'border-box' },
  progressBar: { height: 3, background: 'var(--color-border)', borderRadius: 99, margin: '12px 0 0', overflow: 'hidden' },
  progressFill: (pct) => ({ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 99, transition: 'width 0.35s ease' }),
  stepLabel: { fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 4, marginBottom: 8 },
  stepWrap: { maxWidth: 480, margin: '0 auto', padding: '12px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 },
  stepTitle: { fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, fontFamily: 'var(--font-display)' },
  stepSub: { fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 },
  genderGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 },
  genderBtn: (active) => ({
    padding: '28px 16px', border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    cursor: 'pointer', fontSize: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s',
  }),
  genderLabel: (active) => ({ fontSize: 14, fontWeight: 600, color: active ? 'var(--color-primary-dark)' : 'var(--color-text)' }),
  maritalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 },
  maritalBtn: (active) => ({
    padding: '20px 12px', border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.15s', textAlign: 'center',
  }),
  maritalEmoji: { fontSize: 28 },
  maritalLabel: (active) => ({ fontSize: 15, fontWeight: 700, color: active ? 'var(--color-primary-dark)' : 'var(--color-text)' }),
  maritalSub: (active) => ({ fontSize: 11, color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)', lineHeight: 1.4 }),
  calToggle: { display: 'flex', gap: 8, marginBottom: 16 },
  calBtn: (active) => ({
    flex: 1, padding: '10px', fontSize: 13, fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s',
  }),
  dateRow: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 },
  dateNumInput: {
    width: 90, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700,
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)', color: 'var(--color-text)', textAlign: 'center', boxSizing: 'border-box',
  },
  dateNumInputSmall: {
    width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700,
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)', color: 'var(--color-text)', textAlign: 'center', boxSizing: 'border-box',
  },
  dateUnitLabel: { fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', flexShrink: 0 },
  datePreview: { fontSize: 13, color: 'var(--color-primary-dark)', textAlign: 'center', marginBottom: 8, fontWeight: 500 },
  ampmGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  ampmBtn: (active) => ({
    padding: '14px', fontSize: 16, fontWeight: active ? 700 : 400,
    border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s',
  }),
  timeLabel: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8, letterSpacing: '0.05em' },
  timeGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 },
  timeBtn: (active) => ({
    padding: '12px 4px', fontSize: 15, fontWeight: active ? 700 : 400,
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
  }),
  minGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 },
  unknownBtn: (active) => ({
    width: '100%', padding: '13px 16px', border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
    fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', marginBottom: 16,
  }),
  chipWrap: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: (active) => ({
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer',
    background: active ? 'var(--color-primary-light)' : 'transparent', color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
    fontWeight: active ? 600 : 400, transition: 'all 0.15s',
  }),
  skipBtn: { fontSize: 13, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' },
  bottomBar: {
    position: 'fixed', bottom: 0, background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)',
    padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%',
    left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box',
  },
  backBtn: { flex: '0 0 auto', padding: '14px 20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontSize: 15, cursor: 'pointer', color: 'var(--color-text)' },
  nextBtn: (disabled) => ({
    flex: 1, padding: '14px', fontSize: 15, fontWeight: 600,
    background: disabled ? '#D4C8F5' : 'var(--color-primary)', color: 'white', border: 'none',
    borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
  }),
  resultWrap: { maxWidth: 480, margin: '0 auto', padding: '12px 16px 40px', boxSizing: 'border-box' },
  sajuCard: { background: '#F8F5FF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 12 },
  sajuTitle: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 12, letterSpacing: '0.05em' },
  sajuTable: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  sajuCell: { textAlign: 'center', background: 'white', borderRadius: 8, padding: '10px 4px', border: '1px solid var(--color-border)' },
  sajuCellLabel: { fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' },
  sajuCellValue: { fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.6 },
  streamCard: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 18px', marginBottom: 8, fontSize: 15, lineHeight: 1.9, color: 'var(--color-text)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' },
  accordion: { marginBottom: 8, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  accordionHeader: (open) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', cursor: 'pointer', background: open ? 'var(--color-primary-light)' : 'var(--color-surface)', transition: 'all 0.2s',
  }),
  accordionTitle: (open) => ({ fontSize: 15, fontWeight: 700, color: open ? 'var(--color-primary-dark)' : 'var(--color-text)', flex: 1 }),
  accordionArrow: (open) => ({ fontSize: 12, color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }),
  accordionBody: { wordBreak: 'keep-all', padding: '16px 18px', fontSize: 15, lineHeight: 1.9, color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' },
  paidAccordion: { marginBottom: 8, border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  paidAccordionHeader: (open) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', cursor: 'pointer', background: open ? '#F3EEFF' : 'var(--color-surface)', transition: 'all 0.2s',
  }),
  luckyCard: { background: 'linear-gradient(135deg, #FFF8E7, #FFFBEF)', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12 },
  luckyGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 },
  luckyItem: { background: 'white', borderRadius: 8, padding: '10px 12px', border: '1px solid #FDE68A' },
  luckyItemLabel: { fontSize: 10, color: '#92400E', fontWeight: 600, marginBottom: 3, display: 'block' },
  luckyItemValue: { fontSize: 13, color: '#1a1a1a', fontWeight: 500 },
  loading: { display: 'flex', gap: 6, alignItems: 'center', padding: '20px' },
  dot: (i) => ({ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }),
  restartBtn: { width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-muted)', marginTop: 10 },
  loadingCard: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px 20px', marginBottom: 12 },
  payBanner: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 'var(--radius-md)', padding: '24px 20px', marginBottom: 12, textAlign: 'center',
  },
  payOriginal: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'line-through', marginBottom: 2 },
  payPrice: { fontSize: 40, fontWeight: 800, color: 'white', marginBottom: 4 },
  payDiscount: { fontSize: 12, color: '#FDE68A', marginBottom: 16 },
  payBtn: {
    width: '100%', padding: '16px', fontSize: 17, fontWeight: 700,
    background: 'white', color: '#764ba2', border: 'none',
    borderRadius: 'var(--radius-md)', cursor: 'pointer',
  },
  gunghabAccordion: { marginBottom: 8, border: '2px solid #E11D48', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  gunghabAccordionHeader: (open) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', cursor: 'pointer', background: open ? '#FFF1F2' : 'var(--color-surface)', transition: 'all 0.2s',
  }),
  childAccordion: { marginBottom: 8, border: '2px solid #059669', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  childAccordionHeader: (open) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', cursor: 'pointer', background: open ? '#ECFDF5' : 'var(--color-surface)', transition: 'all 0.2s',
  }),
}

const CARD_COLORS = {
  saju:    { bg: '#F8F5FF', border: '#DDD6FE', text: '#4C1D95', accent: '#7C3AED' },
  gunghab: { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239', accent: '#E11D48' },
  child:   { bg: '#FFF7ED', border: '#FED7AA', text: '#7C2D12', accent: '#EA580C' },
}

function DateInputs({ year, setYear, month, setMonth, day, setDay, lunar, setLunar, hour, setHour, min, setMin, ampm, setAmpm, unknown, setUnknown }) {
  return (
    <>
      <div style={s.calToggle}>
        <button style={s.calBtn(!lunar)} onClick={() => setLunar(false)}>양력 🌞</button>
        <button style={s.calBtn(lunar)} onClick={() => setLunar(true)}>음력 🌙</button>
      </div>
      <div style={s.dateRow}>
        <input style={s.dateNumInput} type="number" inputMode="numeric" placeholder="년도" value={year} onChange={e => setYear(e.target.value.slice(0,4))} />
        <span style={s.dateUnitLabel}>년</span>
        <input style={s.dateNumInputSmall} type="number" inputMode="numeric" placeholder="월" value={month} onChange={e => setMonth(e.target.value.slice(0,2))} />
        <span style={s.dateUnitLabel}>월</span>
        <input style={s.dateNumInputSmall} type="number" inputMode="numeric" placeholder="일" value={day} onChange={e => setDay(e.target.value.slice(0,2))} />
        <span style={s.dateUnitLabel}>일</span>
      </div>
      <button style={s.unknownBtn(unknown)} onClick={() => { setUnknown(true); setHour(''); setMin('') }}>✓ 태어난 시간 모름</button>
      {!unknown && (
        <>
          <p style={s.timeLabel}>오전 / 오후</p>
          <div style={s.ampmGrid}>
            <button style={s.ampmBtn(ampm === '오전')} onClick={() => setAmpm('오전')}>🌅 오전</button>
            <button style={s.ampmBtn(ampm === '오후')} onClick={() => setAmpm('오후')}>🌇 오후</button>
          </div>
          <p style={s.timeLabel}>시 선택</p>
          <div style={s.timeGrid}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
              <button key={h} style={s.timeBtn(hour === String(h))} onClick={() => setHour(String(h))}>{h}시</button>
            ))}
          </div>
          <p style={s.timeLabel}>분 선택</p>
          <div style={s.minGrid}>
            {['00','10','20','30','40','50'].map(m => (
              <button key={m} style={s.timeBtn(min === m)} onClick={() => setMin(m)}>{m}분</button>
            ))}
          </div>
        </>
      )}
      {unknown && <button style={s.skipBtn} onClick={() => setUnknown(false)}>시간 직접 선택하기</button>}
    </>
  )
}

function Accordion({ title, content, isPaid = false, isChild = false, isGunghab = false, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const style = isGunghab ? s.gunghabAccordion : isChild ? s.childAccordion : isPaid ? s.paidAccordion : s.accordion
  const headerStyle = isGunghab ? s.gunghabAccordionHeader : isChild ? s.childAccordionHeader : isPaid ? s.paidAccordionHeader : s.accordionHeader
  return (
    <div style={style}>
      <div style={headerStyle(open)} onClick={() => setOpen(o => !o)}>
        <span style={s.accordionTitle(open)}>{title}</span>
        <span style={s.accordionArrow(open)}>▼</span>
      </div>
      {open && <div style={s.accordionBody}>{content}</div>}
    </div>
  )
}

export default function App() {
  useEffect(() => {
    const ping = () => fetch(`${API_URL}/ping`).catch(() => {})
    ping()
    const id = setInterval(ping, 30000)
    return () => clearInterval(id)
  }, [])

  const [countdown, setCountdown] = useState(getMidnightCountdown())
  useEffect(() => {
    const id = setInterval(() => setCountdown(getMidnightCountdown()), 1000)
    return () => clearInterval(id)
  }, [])

  const [screen, setScreen] = useState('landing')
  const [serviceType, setServiceType] = useState(null)
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
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

  // 궁합 전용 상태
  const [gunghabStep, setGunghabStep] = useState(1) // 1=나, 2=상대방
  const [partnerGender, setPartnerGender] = useState('')
  const [partnerBirthYear, setPartnerBirthYear] = useState('')
  const [partnerBirthMonth, setPartnerBirthMonth] = useState('')
  const [partnerBirthDay, setPartnerBirthDay] = useState('')
  const [partnerIsLunar, setPartnerIsLunar] = useState(false)
  const [partnerTimeHour, setPartnerTimeHour] = useState('')
  const [partnerTimeMin, setPartnerTimeMin] = useState('')
  const [partnerTimeAmPm, setPartnerTimeAmPm] = useState('오전')
  const [partnerTimeUnknown, setPartnerTimeUnknown] = useState(false)
  const [myName, setMyName] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [gunghabText, setGunghabText] = useState('')
  const [isGunghabStreaming, setIsGunghabStreaming] = useState(false)

  const abortRef = useRef(null)
  const isPaidSectionRef = useRef(false)

  const currentStepId = STEPS[step]
  const progress = (step / STEPS.length) * 100

  const birthdate = (birthYear.length === 4 && birthMonth && birthDay)
    ? `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}` : ''
  const birthdateValid = birthYear.length === 4 && Number(birthMonth) >= 1 && Number(birthMonth) <= 12 && Number(birthDay) >= 1 && Number(birthDay) <= 31
  const birthtime = timeUnknown ? '' : (() => {
    if (!timeHour || !timeMin) return ''
    let h = Number(timeHour)
    if (timeAmPm === '오전' && h === 12) h = 0
    if (timeAmPm === '오후' && h !== 12) h += 12
    return `${String(h).padStart(2,'0')}:${String(timeMin).padStart(2,'0')}`
  })()
  const birthtimeValid = timeUnknown || (timeHour !== '' && timeMin !== '')

  function canGoNext() {
    if (currentStepId === 'gender') return gender !== ''
    if (currentStepId === 'birthdate') return birthdateValid
    if (currentStepId === 'birthtime') return birthtimeValid
    return true
  }

  function goNext() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleFreeAnalyze()
  }
  function goBack() {
    if (step > 0) setStep(s => s - 1)
    else setScreen('landing')
  }

  async function streamAnalyze({ body, onSaju, onBaseText, onPaidText, onDone, onError }) {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const res = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: ctrl.signal,
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
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
          else if (json.text) {
            if (isPaidSectionRef.current) onPaidText?.(json.text)
            else onBaseText?.(json.text)
          }
        } catch {}
      }
    }
  }

  async function handleFreeAnalyze() {
    setPhase('streaming'); setBaseText(''); setPaidText(''); setSajuData(null)
    setIsBaseStreaming(true); isPaidSectionRef.current = false; setScreen('result')
    const apiType = serviceType === 'child' ? '자녀천명' : '기본'
    try {
      await streamAnalyze({
        body: { gender, maritalStatus, birthdate, birthtime, mbti, blood, type: apiType, isPaid: false, isLunar, userName: myName },
        onSaju: (d) => setSajuData(d),
        onBaseText: (t) => setBaseText(prev => prev + t),
        onPaidText: () => {},
        onDone: () => { setIsBaseStreaming(false); setPhase('done') },
        onError: (e) => { alert(e); setPhase('input'); setIsBaseStreaming(false) },
      })
    } catch (e) {
      if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.')
      setPhase('input'); setIsBaseStreaming(false)
    }
  }

  async function handlePaidAnalyze() {
    setPaidText(''); setIsPaidStreaming(true)
    isPaidSectionRef.current = false
    const apiType = serviceType === 'child' ? '자녀천명' : '전체'
    try {
      await streamAnalyze({
        body: { gender, maritalStatus, birthdate, birthtime, mbti, blood, type: apiType, isPaid: true, isLunar, userName: myName },
        onSaju: () => {},
        onBaseText: (t) => setBaseText(prev => prev + t),
        onPaidText: (t) => setPaidText(prev => prev + t),
        onDone: () => {},
        onError: (e) => alert(e),
      })
    } catch (e) {
      if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.')
    }
    setIsPaidStreaming(false); setIsPaid(true)
  }

  function handleRestart() {
    abortRef.current?.abort()
    setScreen('landing'); setServiceType(null); setStep(0)
    setGender(''); setMaritalStatus(''); setBirthYear(''); setBirthMonth(''); setBirthDay('')
    setIsLunar(false); setTimeHour(''); setTimeMin(''); setTimeAmPm('오전'); setTimeUnknown(false)
    setMbti(''); setBlood('')
    setPhase('input'); setSajuData(null); setBaseText(''); setPaidText('')
    setIsBaseStreaming(false); setIsPaidStreaming(false); setIsPaid(false)
    // 궁합 초기화
    setGunghabStep(1); setPartnerGender(''); setPartnerBirthYear(''); setPartnerBirthMonth(''); setPartnerBirthDay('')
    setPartnerIsLunar(false); setPartnerTimeHour(''); setPartnerTimeMin(''); setPartnerTimeAmPm('오전'); setPartnerTimeUnknown(false)
    setMyName(''); setPartnerName('')
    setGunghabText(''); setIsGunghabStreaming(false)
    isPaidSectionRef.current = false
  }

  // 궁합 분석 함수
  const partnerBirthdate = (partnerBirthYear.length === 4 && partnerBirthMonth && partnerBirthDay)
    ? `${partnerBirthYear}-${String(partnerBirthMonth).padStart(2,'0')}-${String(partnerBirthDay).padStart(2,'0')}` : ''
  const partnerBirthtime = partnerTimeUnknown ? '' : (() => {
    if (!partnerTimeHour || !partnerTimeMin) return ''
    let h = Number(partnerTimeHour)
    if (partnerTimeAmPm === '오전' && h === 12) h = 0
    if (partnerTimeAmPm === '오후' && h !== 12) h += 12
    return `${String(h).padStart(2,'0')}:${String(partnerTimeMin).padStart(2,'0')}`
  })()
  const partnerBirthdateValid = partnerBirthYear.length === 4 && Number(partnerBirthMonth) >= 1 && Number(partnerBirthMonth) <= 12 && Number(partnerBirthDay) >= 1 && Number(partnerBirthDay) <= 31
  const partnerBirthtimeValid = partnerTimeUnknown || (partnerTimeHour !== '' && partnerTimeMin !== '')

  async function handleGunghabAnalyze() {
    setGunghabText(''); setIsGunghabStreaming(true); setScreen('result')
    try {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender, birthdate, birthtime, isLunar,
          partnerGender, partnerBirthdate, partnerBirthtime, partnerIsLunar,
          myName: myName || 'A', partnerName: partnerName || 'B',
          type: '궁합', isPaid: true,
        }),
        signal: ctrl.signal,
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            if (json.text) setGunghabText(prev => prev + json.text)
            else if (json.type === 'done') { }
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.')
    }
    setIsGunghabStreaming(false)
  }

  // ── 궁합 입력 화면 ──
  if (screen === 'gunghab_input') {
    const isStep1 = gunghabStep === 1
    const myBirthdateValid = birthYear.length === 4 && Number(birthMonth) >= 1 && Number(birthMonth) <= 12 && Number(birthDay) >= 1
    const myBirthtimeValid = timeUnknown || (timeHour !== '' && timeMin !== '')
    const canStep1Next = gender !== '' && myBirthdateValid && myBirthtimeValid
    const canStep2Next = partnerGender !== '' && partnerBirthdateValid && partnerBirthtimeValid



    return (
      <div style={s.app}>
        <div style={s.header}>
          <span style={s.heroEmoji}>💕</span>
          <h1 style={s.heroTitle}>궁합 분석</h1>
          <p style={s.heroSub}>{isStep1 ? '먼저 내 정보를 입력해주세요' : '이제 상대방 정보를 입력해주세요'}</p>
        </div>
        <div style={s.progressWrap}>
          <div style={s.progressBar}><div style={s.progressFill(isStep1 ? 50 : 100)} /></div>
          <p style={s.stepLabel}>{isStep1 ? '1' : '2'} / 2</p>
        </div>
        <div style={s.stepWrap}>
          {isStep1 ? (
            <>
              <h2 style={s.stepTitle}>나의 정보</h2>
              <p style={s.stepSub}>내 성별부터 알려주세요</p>
              <div style={{ marginBottom: 16 }}>
                <p style={s.timeLabel}>이름 (선택)</p>
                <input
                  style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', boxSizing: 'border-box', outline: 'none' }}
                  type="text" placeholder="내 이름을 입력해주세요"
                  value={myName} onChange={e => setMyName(e.target.value)}
                />
              </div>
              <div style={s.genderGrid}>
                <button style={s.genderBtn(gender === '여성')} onClick={() => setGender('여성')}>
                  <span>♀️</span><span style={s.genderLabel(gender === '여성')}>여성</span>
                </button>
                <button style={s.genderBtn(gender === '남성')} onClick={() => setGender('남성')}>
                  <span>♂️</span><span style={s.genderLabel(gender === '남성')}>남성</span>
                </button>
              </div>
              <h2 style={{ ...s.stepTitle, marginTop: 20 }}>내 생년월일 · 시간</h2>
              <DateInputs
                year={birthYear} setYear={setBirthYear}
                month={birthMonth} setMonth={setBirthMonth}
                day={birthDay} setDay={setBirthDay}
                lunar={isLunar} setLunar={setIsLunar}
                hour={timeHour} setHour={setTimeHour}
                min={timeMin} setMin={setTimeMin}
                ampm={timeAmPm} setAmpm={setTimeAmPm}
                unknown={timeUnknown} setUnknown={setTimeUnknown}
              />
            </>
          ) : (
            <>
              <h2 style={s.stepTitle}>상대방 정보</h2>
              <p style={s.stepSub}>상대방 성별을 알려주세요</p>
              <div style={{ marginBottom: 16 }}>
                <p style={s.timeLabel}>상대방 이름 (선택)</p>
                <input
                  style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', boxSizing: 'border-box', outline: 'none' }}
                  type="text" placeholder="상대방 이름을 입력해주세요"
                  value={partnerName} onChange={e => setPartnerName(e.target.value)}
                />
              </div>
              <div style={s.genderGrid}>
                <button style={s.genderBtn(partnerGender === '여성')} onClick={() => setPartnerGender('여성')}>
                  <span>♀️</span><span style={s.genderLabel(partnerGender === '여성')}>여성</span>
                </button>
                <button style={s.genderBtn(partnerGender === '남성')} onClick={() => setPartnerGender('남성')}>
                  <span>♂️</span><span style={s.genderLabel(partnerGender === '남성')}>남성</span>
                </button>
              </div>
              <h2 style={{ ...s.stepTitle, marginTop: 20 }}>상대방 생년월일 · 시간</h2>
              <DateInputs
                year={partnerBirthYear} setYear={setPartnerBirthYear}
                month={partnerBirthMonth} setMonth={setPartnerBirthMonth}
                day={partnerBirthDay} setDay={setPartnerBirthDay}
                lunar={partnerIsLunar} setLunar={setPartnerIsLunar}
                hour={partnerTimeHour} setHour={setPartnerTimeHour}
                min={partnerTimeMin} setMin={setPartnerTimeMin}
                ampm={partnerTimeAmPm} setAmpm={setPartnerTimeAmPm}
                unknown={partnerTimeUnknown} setUnknown={setPartnerTimeUnknown}
              />
            </>
          )}
        </div>
        <div style={s.bottomBar}>
          <button style={s.backBtn} onClick={() => {
            if (isStep1) setScreen('landing')
            else setGunghabStep(1)
          }}>←</button>
          <button style={s.nextBtn(isStep1 ? !canStep1Next : !canStep2Next)}
            disabled={isStep1 ? !canStep1Next : !canStep2Next}
            onClick={() => {
              if (isStep1) setGunghabStep(2)
              else {
                if (window.confirm('1,900원 결제 후 궁합 분석을 받으시겠어요?\n(현재 테스트 중 - 결제 없이 바로 확인)')) {
                  handleGunghabAnalyze()
                }
              }
            }}>
            {isStep1 ? '다음 — 상대방 정보 입력' : '💕 궁합 분석받기 (1,900원)'}
          </button>
        </div>
      </div>
    )
  }

  // ── 궁합 결과 화면 ──
  if (screen === 'result' && serviceType === 'gunghab') {
    const gunghabSections = parseSections(gunghabText)
    return (
      <div style={s.app}>
        <div style={s.resultWrap}>
          <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
            <span style={{ fontSize: 36 }}>💕</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginTop: 8 }}>두 사람의 궁합 분석</h2>
          </div>
          {isGunghabStreaming && gunghabText && (
            <div style={s.streamCard}>{gunghabText}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}
          {isGunghabStreaming && !gunghabText && (
            <div style={s.loadingCard}>
              <div style={s.loading}>
                {[0,1,2].map(i => <div key={i} style={s.dot(i)} />)}
                <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>💕 두 사람의 궁합을 분석하고 있어요...</span>
              </div>
            </div>
          )}
          {!isGunghabStreaming && gunghabSections.map((sec, i) => (
            <Accordion key={i} title={sec.title} content={sec.content} isGunghab={true} defaultOpen={i === 0} />
          ))}
          <button style={s.restartBtn} onClick={handleRestart}>처음으로 돌아가기</button>
        </div>
      </div>
    )
  }

// ── 랜딩 ──
  if (screen === 'landing') {
    const CHEONGAN = [
      { key: '갑목', emoji: '🌳', title: '甲 갑목', sub: '하늘을 향해 곧게 자라는 나무', good: '목표가 뚜렷한 곳, 내가 왜 하는지 보이는 일', bad: '이유 없이 "그냥 해"가 반복되는 환경' },
      { key: '을목', emoji: '🌿', title: '乙 을목', sub: '어디서든 뿌리내리는 생명력', good: '세심하게 인정받는 분위기, 디테일이 빛나는 자리', bad: '감정 무시하는 곳, 거칠고 무뚝뚝한 환경' },
      { key: '병화', emoji: '☀️', title: '丙 병화', sub: '주변을 환하게 밝히는 태양', good: '사람들 앞에 서는 자리, 반응이 오는 무대', bad: '혼자 조용히 처리해야 하는 단절된 환경' },
      { key: '정화', emoji: '🕯️', title: '丁 정화', sub: '어둠 속에서 깊이 타오르는 불꽃', good: '한 가지에 깊이 파고드는 환경, 조용한 집중', bad: '5분마다 끊기는 업무, 산만하고 소란스러운 곳' },
      { key: '무토', emoji: '⛰️', title: '戊 무토', sub: '모든 것을 품어내는 큰 산', good: '내가 중심이 되어 운영하는 구조, 믿고 맡기는 조직', bad: '책임만 지고 권한은 없는 자리, 끝없는 희생 요구' },
      { key: '기토', emoji: '🌾', title: '己 기토', sub: '씨앗을 키워내는 비옥한 땅', good: '규칙이 있고 예측 가능한 환경, 내 역할이 명확한 곳', bad: '매일 바뀌는 방침, 즉흥적이고 뒤죽박죽인 조직' },
      { key: '경금', emoji: '🪨', title: '庚 경금', sub: '단단하고 날카로운 원석의 힘', good: '기준이 명확한 곳, 성과가 숫자로 보이는 환경', bad: '애매하고 흐릿한 기준, 불공정한 평가가 반복되는 곳' },
      { key: '신금', emoji: '💎', title: '辛 신금', sub: '정교하게 다듬어진 보석의 감각', good: '품격 있는 환경, 섬세함이 경쟁력이 되는 자리', bad: '저급하고 거친 분위기, 노력이 무시당하는 곳' },
      { key: '임수', emoji: '🌊', title: '壬 임수', sub: '넓고 유연하게 흐르는 큰 강', good: '새로운 정보가 들어오는 곳, 판을 키울 수 있는 환경', bad: '변화 없이 고여있는 조직, 외부와 단절된 폐쇄적인 곳' },
      { key: '계수', emoji: '🌧️', title: '癸 계수', sub: '깊은 곳에서 솟아오르는 지하수', good: '혼자 생각할 시간이 있는 환경, 깊이가 인정받는 자리', bad: '시끄럽고 감정 소모 심한 곳, 내면을 무시하는 환경' },
    ]
    const [openCheongan, setOpenCheongan] = useState(null)

    return (
      <div style={s.landing}>
        {/* 타이머 */}
        <div style={s.timerBanner}>
          🔥 오늘 자정까지 할인
          <span style={s.timerNum}>{countdown}</span>
        </div>

        {/* 훅 */}
        <div style={s.landingHero}>
          <span style={s.landingEmoji}>✨</span>
          <h1 style={s.landingTitle}>왜 나만 열심히 해도<br/>안 풀릴까?</h1>
          <p style={s.landingSub}>
            의지가 약한 게 아니에요.<br/>
            <span style={{ fontWeight: 700, color: '#7C3AED' }}>방향이 안 맞은 거예요.</span>
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FEF3C7', padding: '8px 16px', borderRadius: 20, fontSize: 13, color: '#92400E', fontWeight: 600 }}>
            <span>⏰</span>
            <span>오늘만 <span style={{ fontWeight: 800 }}>1,900원</span></span>
          </div>
        </div>

        {/* 공감 섹션 */}
        <div style={{ background: '#F8F5FF', padding: '28px 20px', margin: '0', borderBottom: '1px solid #E9D5FF' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <p style={{ fontSize: 15, lineHeight: 2.1, color: '#3B1F6E', wordBreak: 'keep-all', textAlign: 'center' }}>
              북극성을 보러 가고 싶은데<br/>
              남쪽으로 달리고 있다면 어떻게 될까요?<br/><br/>
              아무리 열심히 달려도 안 보여요.<br/>
              <span style={{ fontWeight: 700 }}>노력이 부족한 게 아니에요.<br/>방향이 틀린 거예요.</span><br/><br/>
              <span style={{ color: '#7C3AED', fontWeight: 700 }}>사주팔자는 내 북극성이<br/>어느 쪽에 있는지 알려주는 지도예요.</span>
            </p>
          </div>
        </div>

        {/* 천간 카드 */}
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 8px', width: '100%', boxSizing: 'border-box' }}>
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16, fontWeight: 600, letterSpacing: '0.05em' }}>
            나는 어떤 기운일까? — 일간(日干)으로 확인하세요
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {CHEONGAN.map((c) => (
              <div key={c.key}
                onClick={() => setOpenCheongan(openCheongan === c.key ? null : c.key)}
                style={{
                  background: openCheongan === c.key ? '#F3EEFF' : 'white',
                  border: `1.5px solid ${openCheongan === c.key ? '#7C3AED' : '#E5E7EB'}`,
                  borderRadius: 14, padding: '14px 12px', cursor: 'pointer',
                  transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>{c.emoji}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: openCheongan === c.key ? '#5B21B6' : '#1a1a2e' }}>{c.title}</span>
                </div>
                <p style={{ fontSize: 11, color: '#666', lineHeight: 1.5, margin: 0 }}>{c.sub}</p>
                {openCheongan === c.key && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #DDD6FE', paddingTop: 10 }}>
                    <p style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginBottom: 4 }}>✅ {c.good}</p>
                    <p style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>❌ {c.bad}</p>
                    <p style={{ fontSize: 11, color: '#7C3AED', marginTop: 8, fontWeight: 500 }}>
                      🔒 내 일간이 뭔지 모른다면? 사주 분석에서 확인하세요
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 서비스 카드 */}
        <div style={s.cardGrid}>
          <p style={s.cardGridTitle}>무엇이 궁금하세요?</p>
          <div style={s.grid2}>
            <button style={s.serviceCard(CARD_COLORS.saju)} onClick={() => { setServiceType('saju'); setScreen('input') }}>
              <span style={s.freeBadge}>무료 맛보기</span>
              <span style={s.serviceEmoji}>🔮</span>
              <span style={s.serviceLabel(CARD_COLORS.saju)}>나의 사주</span>
              <span style={s.serviceSub}>돈·직업·연애<br/>내 팔자가 정해놨다</span>
              <span style={s.servicePrice(CARD_COLORS.saju)}>1,900원</span>
            </button>
            <button style={s.serviceCard(CARD_COLORS.gunghab)} onClick={() => { setServiceType('gunghab'); setGunghabStep(1); setScreen('gunghab_input') }}>
              <span style={s.serviceEmoji}>💕</span>
              <span style={s.serviceLabel(CARD_COLORS.gunghab)}>궁합</span>
              <span style={s.serviceSub}>우리 잘 맞는지<br/>사주로 확인</span>
              <span style={s.servicePrice(CARD_COLORS.gunghab)}>1,900원</span>
            </button>
          </div>
          <div style={{ ...s.grid2, gridTemplateColumns: '1fr' }}>
            <button style={s.serviceCard(CARD_COLORS.child)} onClick={() => { setServiceType('child'); setScreen('input') }}>
              <span style={s.serviceEmoji}>🌱</span>
              <span style={s.serviceLabel(CARD_COLORS.child)}>내 아이 괜찮을까</span>
              <span style={s.serviceSub}>아이의 타고난 재능·진로를 미리 확인</span>
              <span style={s.servicePrice(CARD_COLORS.child)}>1,900원</span>
            </button>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>이미 많은 분들이 확인했어요</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
              {[['⭐','만족도 94%'],['🔒','안전한 결제'],['⚡','즉시 확인']].map(([e,t]) => (
                <div key={t} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20 }}>{e}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    )
  }
 
     
  // ── 입력 ──
  if (screen === 'input') {
    const serviceNames = { saju: '나의 사주', gunghab: '궁합', child: '내 아이 괜찮을까' }
    return (
      <div style={s.app}>
        <div style={s.header}>
          <span style={s.heroEmoji}>✨</span>
          <h1 style={s.heroTitle}>{serviceNames[serviceType] || '사주 분석'}</h1>
          <p style={s.heroSub}>생년월일을 입력하면 무료로 먼저 확인해드려요</p>
        </div>
        <div style={s.progressWrap}>
          <div style={s.progressBar}><div style={s.progressFill(progress)} /></div>
          <p style={s.stepLabel}>{step + 1} / {STEPS.length}</p>
        </div>
        <div style={s.stepWrap}>
          {currentStepId === 'gender' && (
            <>
              <h2 style={s.stepTitle}>성별을 알려주세요</h2>
              <p style={s.stepSub}>사주 풀이에 사용돼요</p>
              <div style={{ marginBottom: 16 }}>
                <p style={s.timeLabel}>이름 (선택)</p>
                <input
                  style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', boxSizing: 'border-box', outline: 'none' }}
                  type="text" placeholder="이름을 입력해주세요"
                  value={myName} onChange={e => setMyName(e.target.value)}
                />
              </div>
              <div style={s.genderGrid}>
                <button style={s.genderBtn(gender === '여성')} onClick={() => setGender('여성')}>
                  <span>♀️</span><span style={s.genderLabel(gender === '여성')}>여성</span>
                </button>
                <button style={s.genderBtn(gender === '남성')} onClick={() => setGender('남성')}>
                  <span>♂️</span><span style={s.genderLabel(gender === '남성')}>남성</span>
                </button>
              </div>
            </>
          )}
          {currentStepId === 'birthdate' && (
            <>
              <h2 style={s.stepTitle}>생년월일을 알려주세요</h2>
              <p style={s.stepSub}>숫자로 직접 입력해주세요</p>
              <div style={s.calToggle}>
                <button style={s.calBtn(!isLunar)} onClick={() => setIsLunar(false)}>양력 🌞</button>
                <button style={s.calBtn(isLunar)} onClick={() => setIsLunar(true)}>음력 🌙</button>
              </div>
              <div style={s.dateRow}>
                <input style={s.dateNumInput} type="number" inputMode="numeric" placeholder="년도" value={birthYear} onChange={e => setBirthYear(e.target.value.slice(0, 4))} />
                <span style={s.dateUnitLabel}>년</span>
                <input style={s.dateNumInputSmall} type="number" inputMode="numeric" placeholder="월" value={birthMonth} onChange={e => setBirthMonth(e.target.value.slice(0, 2))} />
                <span style={s.dateUnitLabel}>월</span>
                <input style={s.dateNumInputSmall} type="number" inputMode="numeric" placeholder="일" value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0, 2))} />
                <span style={s.dateUnitLabel}>일</span>
              </div>
              {birthdateValid && <p style={s.datePreview}>✓ {birthYear}년 {birthMonth}월 {birthDay}일 {isLunar ? '(음력)' : '(양력)'}</p>}
            </>
          )}
          {currentStepId === 'birthtime' && (
            <>
              <h2 style={s.stepTitle}>태어난 시간을 알려주세요</h2>
              <p style={s.stepSub}>모르셔도 괜찮아요</p>
              <button style={s.unknownBtn(timeUnknown)} onClick={() => { setTimeUnknown(true); setTimeHour(''); setTimeMin('') }}>✓ 태어난 시간 모름</button>
              {!timeUnknown && (
                <>
                  <p style={s.timeLabel}>오전 / 오후</p>
                  <div style={s.ampmGrid}>
                    <button style={s.ampmBtn(timeAmPm === '오전')} onClick={() => setTimeAmPm('오전')}>🌅 오전</button>
                    <button style={s.ampmBtn(timeAmPm === '오후')} onClick={() => setTimeAmPm('오후')}>🌇 오후</button>
                  </div>
                  <p style={s.timeLabel}>시 선택</p>
                  <div style={s.timeGrid}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                      <button key={h} style={s.timeBtn(timeHour === String(h))} onClick={() => setTimeHour(String(h))}>{h}시</button>
                    ))}
                  </div>
                  <p style={s.timeLabel}>분 선택</p>
                  <div style={s.minGrid}>
                    {['00','10','20','30','40','50'].map(m => (
                      <button key={m} style={s.timeBtn(timeMin === m)} onClick={() => setTimeMin(m)}>{m}분</button>
                    ))}
                  </div>
                  {timeHour && timeMin && <p style={s.datePreview}>✓ {timeAmPm} {timeHour}시 {timeMin}분</p>}
                </>
              )}
              {timeUnknown && <button style={s.skipBtn} onClick={() => setTimeUnknown(false)}>시간 직접 선택하기</button>}
            </>
          )}
          {currentStepId === 'mbti' && (
            <>
              <h2 style={s.stepTitle}>MBTI를 선택해주세요</h2>
              <p style={s.stepSub}>모르시면 건너뛰어도 돼요</p>
              <div style={s.chipWrap}>
                {MBTI_LIST.map(m => <button key={m} style={s.chip(mbti === m)} onClick={() => setMbti(mbti === m ? '' : m)}>{m}</button>)}
              </div>
            </>
          )}
          {currentStepId === 'blood' && (
            <>
              <h2 style={s.stepTitle}>혈액형을 선택해주세요</h2>
              <p style={s.stepSub}>선택하지 않아도 분석은 가능해요</p>
              <div style={s.chipWrap}>
                {BLOOD_LIST.map(b => <button key={b} style={s.chip(blood === b)} onClick={() => setBlood(blood === b ? '' : b)}>{b}형</button>)}
              </div>
            </>
          )}
        </div>
        <div style={s.bottomBar}>
          <button style={s.backBtn} onClick={goBack}>←</button>
          <button style={s.nextBtn(!canGoNext())} onClick={goNext} disabled={!canGoNext()}>
            {currentStepId === 'blood' ? '무료 사주 분석하기 ✨' : currentStepId === 'mbti' ? '다음 (건너뛰기 가능)' : '다음'}
          </button>
        </div>
      </div>
    )
  }

  // ── 결과 ──
  if (screen === 'result') {
    const baseSections = parseSections(baseText)
    const paidSections = parseSections(paidText)

    let 행운아이템 = null
    const luckyMatch = paidText.match(/===행운 아이템===([\s\S]*?)(?====|$)/)
    if (luckyMatch) {
      const t = luckyMatch[1]
      행운아이템 = {
        색깔: t.match(/색깔[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
      }
    }

    return (
      <div style={s.app}>
        {phase === 'done' && !isPaid && (
          <div style={s.timerBanner}>
            🔥 오늘 자정까지 할인 &nbsp;
            <span style={s.timerNum}>{countdown}</span>
          </div>
        )}
        <div style={s.resultWrap}>
          {sajuData?.사주 && (
            <div style={s.sajuCard}>
              <p style={s.sajuTitle}>📋 나의 사주팔자</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, textAlign: 'center' }}>{sajuData.생년월일}</p>
              <div style={s.sajuTable}>
                {[
                  { label: '시주(時)', value: sajuData.사주.시주 },
                  { label: '일주(日)', value: sajuData.사주.일주 },
                  { label: '월주(月)', value: sajuData.사주.월주 },
                  { label: '년주(年)', value: sajuData.사주.년주 },
                ].map(({ label, value }) => (
                  <div key={label} style={s.sajuCell}>
                    <span style={s.sajuCellLabel}>{label}</span>
                    <span style={s.sajuCellValue}>{value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isBaseStreaming && baseText && (
            <div style={s.streamCard}>{baseText}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}

          {!isBaseStreaming && baseSections.filter(sec => !sec.title.includes('행운미리보기')).map((sec, i) => (
            <Accordion key={i} title={sec.title} content={sec.content} defaultOpen={i === 0} />
          ))}

          {!isBaseStreaming && !paidSections.length && (() => {
            const luckySec = baseSections.find(sec => sec.title.includes('행운미리보기'))
            const colorMatch = luckySec?.content?.match(/색깔[:\s]+([^\n]+)/)
            const color = colorMatch?.[1]?.trim()
            if (!color) return null
            return (
              <div style={s.luckyCard}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>🍀 나의 행운 아이템</p>
                <div style={s.luckyGrid}>
                  <div style={s.luckyItem}>
                    <span style={s.luckyItemLabel}>🎨 행운 색깔</span>
                    <span style={s.luckyItemValue}>{color}</span>
                  </div>
                  {[['🐾','마스코트'],['🧭','행운 방향'],['🔢','행운 숫자']].map(([emoji, label]) => (
                    <div key={label} style={{ ...s.luckyItem, position: 'relative' }}>
                      <span style={s.luckyItemLabel}>{emoji} {label}</span>
                      <div style={{ height: 20, background: 'repeating-linear-gradient(90deg, #DDD6FE 0px, #DDD6FE 8px, transparent 8px, transparent 12px)', borderRadius: 4, marginTop: 2 }} />
                      <span style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 14 }}>🔒</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#92400E', textAlign: 'center', marginTop: 10, fontWeight: 600 }}>🔒 마스코트·방향·숫자는 전체 분석에서 확인하세요</p>
              </div>
            )
          })()}

          {isPaidStreaming && paidText && (
            <div style={s.streamCard}>{paidText}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}

          {!isPaidStreaming && paidSections.length > 0 && (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textAlign: 'center', margin: '16px 0 8px' }}>⭐ 전체 분석 결과</p>
              {paidSections.map((sec, i) => (
                <Accordion key={i} title={sec.title} content={sec.content} isPaid={true} defaultOpen={i === 0} />
              ))}
            </>
          )}

          {/* 결제 배너 — 단순화 */}
          {phase === 'done' && !isPaid && !isPaidStreaming && (
            <div style={s.payBanner}>
<p style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 16 }}>
  {serviceType === 'child' ? '🌱 1,900원으로 이걸 다 볼 수 있어요' : '🔮 1,900원으로 이걸 다 볼 수 있어요'}
</p>
              <div style={{ textAlign: 'left', marginBottom: 20, display: 'inline-block' }}>
                {(serviceType === 'child' ? [
                  '타고난 기질 · 성격 심층 분석',
                  '학습 스타일 · 공부가 잘 되는 환경',
                  '재능의 씨앗 · 빛나는 분야',
                  '진로 방향 · 어울리는 직업군',
                  '부모와의 관계 · 키우는 법',
                  '아이가 힘든 순간 · 극복법',
                  '이 아이가 빛나는 조건',
                  '이 사주로 잘 크는 법',
                ] : [
                  '인생 재운 흐름 (20대~말년)',
                  '직업운 · 커리어 방향',
                  '투자 · 부동산 전략',
                  '인간관계 · 사람운',
                  '월별 운세 12개월',
                  '행운 아이템',
                  '이 사주로 잘 사는 법',
                ]).map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: '#FDE68A', fontWeight: 700, fontSize: 14 }}>✓</span>
                    <span style={{ color: 'white', fontSize: 14 }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={s.payPrice}>1,900원</div>
              <div style={s.payDiscount}>⏰ 오늘 자정까지 {countdown}</div>
              <button style={s.payBtn} onClick={() => {
                if (window.confirm('1,900원 결제 후 전체 분석을 받으시겠어요?\n(현재 테스트 중 - 결제 없이 바로 확인)')) {
                  handlePaidAnalyze()
                }
              }}>
                지금 전체 분석 받기 →
              </button>
            </div>
          )}

          {isPaidStreaming && (
            <div style={s.loadingCard}>
              <div style={s.loading}>
                {[0,1,2].map(i => <div key={i} style={s.dot(i)} />)}
                <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>🔮 전체 사주를 분석하고 있어요...</span>
              </div>
            </div>
          )}

          <button style={s.restartBtn} onClick={handleRestart}>처음으로 돌아가기</button>
        </div>
      </div>
    )
  }

  return null
}
