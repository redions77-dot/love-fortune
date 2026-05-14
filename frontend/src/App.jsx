import { useEffect, useState } from 'react'

const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']
const STEPS = ['gender', 'maritalStatus', 'birthdate', 'birthtime', 'mbti', 'blood']

const MARITAL_OPTIONS = [
  { value: '미혼', emoji: '💫', label: '미혼', sub: '아직 결혼 전이에요' },
  { value: '기혼', emoji: '💍', label: '기혼', sub: '결혼해서 살고 있어요' },
  { value: '돌싱', emoji: '🌱', label: '돌싱', sub: '이혼 후 혼자예요' },
  { value: '돌싱2+', emoji: '🔥', label: '돌싱2+', sub: '이혼을 두 번 이상 했어요' },
]

function parseSections(text) {
  const sections = []
  const parts = text.split(/===(.+?)===/)
  for (let i = 1; i < parts.length; i += 2) {
    sections.push({ title: parts[i].trim(), content: parts[i + 1]?.trim() || '' })
  }
  return sections
}

const s = {
  app: { minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' },
  header: { textAlign: 'center', padding: '40px 24px 24px', background: 'linear-gradient(180deg, #F3EEFF 0%, var(--color-bg) 100%)' },
  heroEmoji: { fontSize: 44, display: 'block', marginBottom: 10 },
  heroTitle: { wordBreak: 'keep-all', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 },
  heroSub: { fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 },
  progressWrap: { maxWidth: 480, margin: '0 auto', padding: '0 16px', width: '100%', boxSizing: 'border-box' },
  progressBar: { height: 3, background: 'var(--color-border)', borderRadius: 99, margin: '16px 0 0', overflow: 'hidden' },
  progressFill: (pct) => ({ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 99, transition: 'width 0.35s ease' }),
  stepLabel: { fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 6, marginBottom: 8 },
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
  calToggle: { display: 'flex', gap: 8, marginBottom: 20 },
  calBtn: (active) => ({
    flex: 1, padding: '10px', fontSize: 13, fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s',
  }),
  dateRow: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16 },
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
  datePreview: { fontSize: 14, color: 'var(--color-primary-dark)', textAlign: 'center', marginBottom: 8, fontWeight: 500 },
  ampmGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 },
  ampmBtn: (active) => ({
    padding: '14px', fontSize: 16, fontWeight: active ? 700 : 400,
    border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s',
  }),
  timeLabel: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8, letterSpacing: '0.05em' },
  timeGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 },
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
  maritalBadge: (color) => ({
    display: 'inline-block', padding: '4px 12px', borderRadius: 20,
    fontSize: 12, fontWeight: 700, marginBottom: 12,
    background: color.bg, color: color.text, border: `1px solid ${color.border}`,
  }),
  sajuCard: { background: '#F8F5FF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 12 },
  sajuTitle: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 12, letterSpacing: '0.05em' },
  sajuTable: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  sajuCell: { textAlign: 'center', background: 'white', borderRadius: 8, padding: '10px 4px', border: '1px solid var(--color-border)' },
  sajuCellLabel: { fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' },
  sajuCellValue: { fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.6 },
  accordion: { marginBottom: 8, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  accordionHeader: (open) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', cursor: 'pointer', background: open ? 'var(--color-primary-light)' : 'var(--color-surface)', transition: 'all 0.2s',
  }),
  accordionTitle: (open) => ({ fontSize: 15, fontWeight: 700, color: open ? 'var(--color-primary-dark)' : 'var(--color-text)', flex: 1 }),
  accordionArrow: (open) => ({ fontSize: 12, color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }),
  accordionBody: { wordBreak: 'keep-all', padding: '16px 18px', fontSize: 15, lineHeight: 1.9, color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' },
  paySection: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 'var(--radius-md)', padding: '24px 20px', marginBottom: 12, textAlign: 'center' },
  paySectionTitle: { fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 6 },
  paySectionSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: 16 },
  payList: { textAlign: 'left', marginBottom: 16 },
  payListItem: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  payBtn: { width: '100%', padding: '16px', fontSize: 18, fontWeight: 700, background: 'white', color: '#764ba2', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' },
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
  // 자녀 학운
  childSection: { background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)', border: '2px solid #6EE7B7', borderRadius: 'var(--radius-md)', padding: '24px 20px', marginBottom: 12 },
  childSectionTitle: { fontSize: 18, fontWeight: 700, color: '#065F46', marginBottom: 6 },
  childSectionSub: { fontSize: 13, color: '#047857', lineHeight: 1.6, marginBottom: 16 },
  childInputRow: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 },
  childInput: {
    flex: 1, padding: '12px 8px', fontSize: 16, fontWeight: 700,
    border: '1px solid #6EE7B7', borderRadius: 'var(--radius-md)',
    background: 'white', color: 'var(--color-text)', textAlign: 'center', boxSizing: 'border-box',
  },
  childInputSmall: {
    width: 52, flexShrink: 0, padding: '12px 4px', fontSize: 16, fontWeight: 700,
    border: '1px solid #6EE7B7', borderRadius: 'var(--radius-md)',
    background: 'white', color: 'var(--color-text)', textAlign: 'center', boxSizing: 'border-box',
  },
  childGenderGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  childGenderBtn: (active) => ({
    padding: '12px', border: `2px solid ${active ? '#059669' : '#6EE7B7'}`,
    borderRadius: 'var(--radius-md)', background: active ? '#059669' : 'white',
    color: active ? 'white' : '#047857', fontSize: 14, fontWeight: active ? 700 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  }),
  childBtn: (disabled) => ({ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700, background: disabled ? '#A7F3D0' : '#059669', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer' }),
  childAccordion: { marginBottom: 8, border: '2px solid #059669', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  childAccordionHeader: (open) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', cursor: 'pointer', background: open ? '#ECFDF5' : 'var(--color-surface)', transition: 'all 0.2s',
  }),
  childResultLabel: { fontSize: 13, fontWeight: 600, color: '#059669', textAlign: 'center', margin: '16px 0 8px' },
}

function getMaritalBadgeColor(status) {
  if (status === '미혼') return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' }
  if (status === '기혼') return { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' }
  if (status === '돌싱') return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' }
  if (status === '돌싱2+') return { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' }
  return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' }
}

function getMaritalLabel(status) {
  if (status === '미혼') return '💫 인연운 · 앞으로의 사랑'
  if (status === '기혼') return '💍 부부운 · 지금의 관계'
  if (status === '돌싱') return '🌱 재혼운 · 다음 인연'
  if (status === '돌싱2+') return '🔥 재혼운 · 내 사주의 결혼 패턴'
  return ''
}

function Accordion({ title, content, isPaid = false, isChild = false, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const style = isChild ? s.childAccordion : isPaid ? s.paidAccordion : s.accordion
  const headerStyle = isChild ? s.childAccordionHeader : isPaid ? s.paidAccordionHeader : s.accordionHeader
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
    fetch('https://${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthdate: '2000-01-01', type: '기본', isPaid: false })
    }).catch(() => {})
  }, [])

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
  const [loading, setLoading] = useState(false)
  const [paidLoading, setPaidLoading] = useState(false)
  const [baseResult, setBaseResult] = useState(null)
  const [paidResult, setPaidResult] = useState(null)
  // 자녀 학운
  const [childYear, setChildYear] = useState('')
  const [childMonth, setChildMonth] = useState('')
  const [childDay, setChildDay] = useState('')
  const [childGender, setChildGender] = useState('')
  const [childLoading, setChildLoading] = useState(false)
  const [childResult, setChildResult] = useState(null)

  const currentStepId = STEPS[step]
  const progress = (step / STEPS.length) * 100

  const birthdate = (birthYear.length === 4 && birthMonth && birthDay)
    ? `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
    : ''

  const birthdateValid = birthYear.length === 4
    && Number(birthMonth) >= 1 && Number(birthMonth) <= 12
    && Number(birthDay) >= 1 && Number(birthDay) <= 31

  const birthtime = timeUnknown ? '' : (() => {
    if (!timeHour || !timeMin) return ''
    let h = Number(timeHour)
    if (timeAmPm === '오전' && h === 12) h = 0
    if (timeAmPm === '오후' && h !== 12) h += 12
    return `${String(h).padStart(2, '0')}:${String(timeMin).padStart(2, '0')}`
  })()

  const birthtimeValid = timeUnknown || (timeHour !== '' && timeMin !== '')

  const childBirthdate = (childYear.length === 4 && childMonth && childDay)
    ? `${childYear}-${String(childMonth).padStart(2, '0')}-${String(childDay).padStart(2, '0')}`
    : ''

  const childBirthdateValid = childYear.length === 4
    && Number(childMonth) >= 1 && Number(childMonth) <= 12
    && Number(childDay) >= 1 && Number(childDay) <= 31
    && childGender !== ''

  function canGoNext() {
    if (currentStepId === 'gender') return gender !== ''
    if (currentStepId === 'maritalStatus') return maritalStatus !== ''
    if (currentStepId === 'birthdate') return birthdateValid
    if (currentStepId === 'birthtime') return birthtimeValid
    return true
  }

  function goNext() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleBaseAnalyze()
  }

  function goBack() { if (step > 0) setStep(s => s - 1) }

  async function handleBaseAnalyze() {
    setLoading(true); setBaseResult(null); setPaidResult(null); setChildResult(null)
    try {
      const res = await fetch('https://${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, maritalStatus, birthdate, birthtime, mbti, blood, type: '기본', isPaid: false, isLunar }),
      })
      const data = await res.json()
      if (data.error) alert(data.error)
      else setBaseResult(data)
    } catch { alert('서버에 연결할 수 없습니다.') }
    setLoading(false)
  }

  async function handlePaidAnalyze() {
    setPaidLoading(true); setPaidResult(null)
    try {
      const res = await fetch('https://${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, maritalStatus, birthdate, birthtime, mbti, blood, type: '전체', isPaid: true, isLunar }),
      })
      const data = await res.json()
      if (data.error) alert(data.error)
      else setPaidResult(data)
    } catch { alert('서버에 연결할 수 없습니다.') }
    setPaidLoading(false)
  }

  async function handleChildAnalyze() {
    setChildLoading(true); setChildResult(null)
    try {
      const res = await fetch('https://${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, birthdate, birthtime, childBirthdate, childGender, type: '자녀학운', isPaid: true, isLunar: false }),
      })
      const data = await res.json()
      if (data.error) alert(data.error)
      else setChildResult(data)
    } catch { alert('서버에 연결할 수 없습니다.') }
    setChildLoading(false)
  }

  function handleRestart() {
    setStep(0); setGender(''); setMaritalStatus('')
    setBirthYear(''); setBirthMonth(''); setBirthDay(''); setIsLunar(false)
    setTimeHour(''); setTimeMin(''); setTimeAmPm('오전'); setTimeUnknown(false)
    setMbti(''); setBlood('')
    setBaseResult(null); setPaidResult(null)
    setChildYear(''); setChildMonth(''); setChildDay(''); setChildGender(''); setChildResult(null)
  }

  if (loading || baseResult) {
    const baseSections = baseResult ? parseSections(baseResult.result) : []
    const paidSections = paidResult ? parseSections(paidResult.result) : []
    const childSections = childResult ? parseSections(childResult.result) : []

    return (
      <div style={s.app}>
        <div style={s.header}>
          <span style={s.heroEmoji}>✨</span>
          <h1 style={s.heroTitle}>내가 왜 이렇게 사나 했더니 사주 때문이었다</h1>
          <p style={s.heroSub}>사주로 보는 돈복·연애운·결혼운 · 990원</p>
        </div>
        <div style={s.resultWrap}>
          {maritalStatus && (
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <span style={s.maritalBadge(getMaritalBadgeColor(maritalStatus))}>
                {getMaritalLabel(maritalStatus)}
              </span>
            </div>
          )}

          {loading && (
            <div style={s.loadingCard}>
              <div style={s.loading}>
                {[0,1,2].map(i => <div key={i} style={s.dot(i)} />)}
                <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                  🔮 당신의 사주를 열심히 읽고 있어요! 곧 놀라운 이야기를 들려드릴게요 ✨ (약 1분 소요)
                </span>
              </div>
            </div>
          )}

          {baseResult && (
            <>
              {baseResult.사주 && (
                <div style={s.sajuCard}>
                  <p style={s.sajuTitle}>📋 나의 사주팔자</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, textAlign: 'center' }}>{baseResult.생년월일 || ''}</p>
                  <div style={s.sajuTable}>
                    {[
                      { label: '시주(時)', value: baseResult.사주.시주 },
                      { label: '일주(日)', value: baseResult.사주.일주 },
                      { label: '월주(月)', value: baseResult.사주.월주 },
                      { label: '년주(年)', value: baseResult.사주.년주 },
                    ].map(({ label, value }) => (
                      <div key={label} style={s.sajuCell}>
                        <span style={s.sajuCellLabel}>{label}</span>
                        <span style={s.sajuCellValue}>{value || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {baseSections.length > 0
                ? baseSections.map((sec, i) => <Accordion key={i} title={sec.title} content={sec.content} defaultOpen={i === 0} />)
                : <Accordion title="내 사주 분석" content={baseResult.result} defaultOpen={true} />
              }

              {paidLoading && (
                <div style={s.loadingCard}>
                  <div style={s.loading}>
                    {[0,1,2].map(i => <div key={i} style={s.dot(i)} />)}
                    <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                      🔮 전체 사주를 꼼꼼히 분석하고 있어요! 💫 (약 1~2분 소요)
                    </span>
                  </div>
                </div>
              )}

              {paidResult && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textAlign: 'center', margin: '16px 0 8px' }}>
                    ⭐ 990원 전체 분석 결과
                  </p>
                  {paidSections.length > 0
                    ? paidSections.map((sec, i) => <Accordion key={i} title={sec.title} content={sec.content} isPaid={true} defaultOpen={i === 0} />)
                    : <Accordion title="전체 분석" content={paidResult.result} isPaid={true} defaultOpen={true} />
                  }
                  {paidResult.행운아이템 && (
                    <div style={s.luckyCard}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>🍀 나의 행운 아이템</p>
                      <p style={{ fontSize: 12, color: '#B45309' }}>{paidResult.행운아이템.설명}</p>
                      <div style={s.luckyGrid}>
                        <div style={s.luckyItem}><span style={s.luckyItemLabel}>🎨 행운 색깔</span><span style={s.luckyItemValue}>{paidResult.행운아이템.색깔}</span></div>
                        <div style={s.luckyItem}><span style={s.luckyItemLabel}>🐾 마스코트</span><span style={s.luckyItemValue}>{paidResult.행운아이템.마스코트}</span></div>
                        <div style={s.luckyItem}><span style={s.luckyItemLabel}>🧭 행운 방향</span><span style={s.luckyItemValue}>{paidResult.행운아이템.방향}</span></div>
                        <div style={s.luckyItem}><span style={s.luckyItemLabel}>🔢 행운 숫자</span><span style={s.luckyItemValue}>{paidResult.행운아이템.숫자}</span></div>
                        <div style={{ ...s.luckyItem, gridColumn: '1 / -1' }}><span style={s.luckyItemLabel}>🛍️ 추천 아이템</span><span style={s.luckyItemValue}>{paidResult.행운아이템.아이템}</span></div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!paidResult && !paidLoading && (
                <div style={s.paySection}>
                  <p style={s.paySectionTitle}>🔮 전체 사주 분석 받기</p>
                  <p style={s.paySectionSub}>단 990원으로 내 사주의 모든 것을 확인하세요</p>
                  <div style={s.payList}>
                    {['💰 재물운 · 직업운 상세 분석', '💍 연애운 · 결혼운 · 배우자 특징', '📅 2026년 월별 운세 흐름', '🍀 용신 기반 행운 아이템', '✨ 이 사주로 잘 사는 법'].map((item, i) => (
                      <p key={i} style={s.payListItem}>✓ {item}</p>
                    ))}
                  </div>
                  <button style={s.payBtn} onClick={() => {
                    if (window.confirm('990원 결제 후 전체 분석을 받으시겠어요?\n(현재 테스트 중 - 결제 없이 바로 확인)')) {
                      handlePaidAnalyze()
                    }
                  }}>
                    990원으로 전체 보기 →
                  </button>
                </div>
              )}

              {/* 자녀 학운 - 본인 분석 끝나면 항상 노출 */}
              {!childResult && !childLoading && (
                <div style={s.childSection}>
                  <p style={s.childSectionTitle}>📚 우리 아이 학운 분석</p>
                  <p style={s.childSectionSub}>부모 사주와 함께 보는 자녀 학운 · 1,990원</p>
                  <div style={{ textAlign: 'left', marginBottom: 16 }}>
                    {['🧠 타고난 공부 머리와 재능 분야', '📖 어떤 과목에서 두각을 나타내는지', '⏰ 집중력이 높아지는 시기', '🎯 입시 운이 좋은 해', '💡 공부 잘 되는 환경 만드는 법'].map((item, i) => (
                      <p key={i} style={{ fontSize: 13, color: '#065F46', marginBottom: 4 }}>✓ {item}</p>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#047857', marginBottom: 8, fontWeight: 600 }}>아이 생년월일</p>
                  <div style={s.childInputRow}>
                    <input style={s.childInput} type="number" inputMode="numeric" placeholder="년도"
                      value={childYear} onChange={e => setChildYear(e.target.value.slice(0, 4))} />
                    <span style={{ fontSize: 13, color: '#047857', flexShrink: 0 }}>년</span>
                    <input style={s.childInputSmall} type="number" inputMode="numeric" placeholder="월"
                      value={childMonth} onChange={e => setChildMonth(e.target.value.slice(0, 2))} />
                    <span style={{ fontSize: 13, color: '#047857', flexShrink: 0 }}>월</span>
                    <input style={s.childInputSmall} type="number" inputMode="numeric" placeholder="일"
                      value={childDay} onChange={e => setChildDay(e.target.value.slice(0, 2))} />
                    <span style={{ fontSize: 13, color: '#047857', flexShrink: 0 }}>일</span>
                  </div>
                  <div style={s.childGenderGrid}>
                    <button style={s.childGenderBtn(childGender === '딸')} onClick={() => setChildGender('딸')}>👧 딸</button>
                    <button style={s.childGenderBtn(childGender === '아들')} onClick={() => setChildGender('아들')}>👦 아들</button>
                  </div>
                  {childBirthdateValid && (
                    <p style={{ fontSize: 13, color: '#059669', textAlign: 'center', marginBottom: 12, fontWeight: 500 }}>
                      ✓ {childGender} · {childYear}년 {childMonth}월 {childDay}일
                    </p>
                  )}
                  <button
                    style={s.childBtn(!childBirthdateValid)}
                    disabled={!childBirthdateValid}
                    onClick={() => {
                      if (window.confirm('1,990원 결제 후 자녀 학운 분석을 받으시겠어요?\n(현재 테스트 중 - 결제 없이 바로 확인)')) {
                        handleChildAnalyze()
                      }
                    }}
                  >
                    1,990원으로 학운 분석받기 →
                  </button>
                </div>
              )}

              {childLoading && (
                <div style={s.loadingCard}>
                  <div style={s.loading}>
                    {[0,1,2].map(i => <div key={i} style={s.dot(i)} />)}
                    <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                      📚 아이의 사주와 학운을 꼼꼼히 분석하고 있어요! (약 1~2분 소요)
                    </span>
                  </div>
                </div>
              )}

              {childResult && (
                <>
                  <p style={s.childResultLabel}>📚 우리 아이 학운 분석 결과</p>
                  {childSections.length > 0
                    ? childSections.map((sec, i) => <Accordion key={i} title={sec.title} content={sec.content} isChild={true} defaultOpen={i === 0} />)
                    : <Accordion title="자녀 학운 분석" content={childResult.result} isChild={true} defaultOpen={true} />
                  }
                </>
              )}

              <button style={s.restartBtn} onClick={handleRestart}>처음으로 돌아가기</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={s.app}>
      <div style={s.header}>
        <span style={s.heroEmoji}>✨</span>
        <h1 style={s.heroTitle}>내가 왜 이렇게 사나 했더니 사주 때문이었다</h1>
        <p style={s.heroSub}>사주로 보는 돈복·연애운·결혼운 · 990원</p>
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

        {currentStepId === 'maritalStatus' && (
          <>
            <h2 style={s.stepTitle}>결혼 상태를 알려주세요</h2>
            <p style={s.stepSub}>상태에 맞는 맞춤 분석을 해드려요</p>
            <div style={s.maritalGrid}>
              {MARITAL_OPTIONS.map(opt => (
                <button key={opt.value} style={s.maritalBtn(maritalStatus === opt.value)} onClick={() => setMaritalStatus(opt.value)}>
                  <span style={s.maritalEmoji}>{opt.emoji}</span>
                  <span style={s.maritalLabel(maritalStatus === opt.value)}>{opt.label}</span>
                  <span style={s.maritalSub(maritalStatus === opt.value)}>{opt.sub}</span>
                </button>
              ))}
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
              <input style={s.dateNumInput} type="number" inputMode="numeric" placeholder="년도"
                value={birthYear} onChange={e => setBirthYear(e.target.value.slice(0, 4))} />
              <span style={s.dateUnitLabel}>년</span>
              <input style={s.dateNumInputSmall} type="number" inputMode="numeric" placeholder="월"
                value={birthMonth} onChange={e => setBirthMonth(e.target.value.slice(0, 2))} />
              <span style={s.dateUnitLabel}>월</span>
              <input style={s.dateNumInputSmall} type="number" inputMode="numeric" placeholder="일"
                value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0, 2))} />
              <span style={s.dateUnitLabel}>일</span>
            </div>
            {birthdateValid && (
              <p style={s.datePreview}>✓ {birthYear}년 {birthMonth}월 {birthDay}일 {isLunar ? '(음력)' : '(양력)'}</p>
            )}
            {isLunar && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>ℹ️ 음력 날짜를 입력하면 자동으로 양력으로 변환해요</p>}
          </>
        )}

        {currentStepId === 'birthtime' && (
          <>
            <h2 style={s.stepTitle}>태어난 시간을 알려주세요</h2>
            <p style={s.stepSub}>모르셔도 괜찮아요</p>
            <button style={s.unknownBtn(timeUnknown)} onClick={() => { setTimeUnknown(true); setTimeHour(''); setTimeMin('') }}>
              ✓ 태어난 시간 모름
            </button>
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
                {timeHour && timeMin && (
                  <p style={s.datePreview}>✓ {timeAmPm} {timeHour}시 {timeMin}분</p>
                )}
              </>
            )}
            {timeUnknown && (
              <button style={s.skipBtn} onClick={() => setTimeUnknown(false)}>시간 직접 선택하기</button>
            )}
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
        {step > 0 && <button style={s.backBtn} onClick={goBack}>←</button>}
        <button style={s.nextBtn(!canGoNext())} onClick={goNext} disabled={!canGoNext()}>
          {currentStepId === 'blood' ? '무료 사주 분석하기 ✨' : currentStepId === 'mbti' ? '다음 (건너뛰기 가능)' : '다음'}
        </button>
      </div>
    </div>
  )
}
