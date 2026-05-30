  import { useEffect, useState, useRef } from 'react'

const PORTONE_IMP_KEY = 'imp87662575'
const PORTONE_CHANNEL_KEY = 'channel-key-ee1dda53-8dfa-471e-9b76-4483df87605f'
// ── 상수 ──────────────────────────────────────────────
const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']
const STEPS = ['gender', 'marital', 'birthdate', 'birthtime', 'mbti', 'blood']
const API_URL = 'https://love-fortune.onrender.com'

const MARITAL_OPTIONS = [
  { value: '미혼', emoji: '💫', label: '미혼', sub: '아직 결혼 전이에요' },
  { value: '기혼', emoji: '💍', label: '기혼', sub: '결혼해서 살고 있어요' },
]

const PRICE = 1900
const IS_ADMIN = new URLSearchParams(window.location.search).get('admin') === 'bomgyeol2026'
function removeMarkers(text) {
  return text.split('===').filter((_, i) => i % 2 === 0).join('').replace(/\n{3,}/g, '\n\n').trim()
}
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
    textAlign: 'center', padding: '52px 24px 36px',
    background: 'linear-gradient(160deg, #1B2A4A 0%, #243557 60%, #1B2A4A 100%)',
  },
  landingEmoji: { fontSize: 48, display: 'block', marginBottom: 14 },
 landingTitle: {
    wordBreak: 'keep-all', fontSize: 30, fontWeight: 800,
    color: '#FFFFFF', marginBottom: 10, lineHeight: 1.4,
    fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
  },
  landingSub: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, marginBottom: 24 },
  timerBanner: {
    background: '#0F1E36',
    color: '#C9A84C', textAlign: 'center', padding: '10px 16px',
    fontSize: 13, fontWeight: 600, letterSpacing: '0.03em',
  },
  timerNum: { fontSize: 16, fontWeight: 800, letterSpacing: 2, marginLeft: 8, color: '#E8C96A' },
  cardGrid: { maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px', width: '100%', boxSizing: 'border-box' },
  cardGridTitle: { fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 16, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  serviceCard: (color) => ({
    background: color.bg, border: `1px solid ${color.border}`,
    borderRadius: 12, padding: '20px 16px', cursor: 'pointer',
    transition: 'all 0.2s', textAlign: 'center',
    boxShadow: '0 2px 12px rgba(27,42,74,0.08)',
  }),
  serviceEmoji: { fontSize: 30, display: 'block', marginBottom: 8 },
  serviceLabel: (color) => ({ fontSize: 14, fontWeight: 700, color: color.text, marginBottom: 4, display: 'block' }),
  serviceSub: { fontSize: 11, color: '#8A7E6E', lineHeight: 1.6, display: 'block' },
  servicePrice: (color) => ({ fontSize: 12, fontWeight: 700, color: color.accent, marginTop: 8, display: 'block' }),
  freeBadge: {
    display: 'inline-block', background: '#1B2A4A', color: '#C9A84C',
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginBottom: 6,
    border: '1px solid #C9A84C',
  },
  header: { textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #1B2A4A 0%, #243557 100%)' },
  heroEmoji: { fontSize: 34, display: 'block', marginBottom: 8 },
  heroTitle: { wordBreak: 'keep-all', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  progressWrap: { maxWidth: 480, margin: '0 auto', padding: '0 16px', width: '100%', boxSizing: 'border-box' },
  progressBar: { height: 2, background: 'rgba(27,42,74,0.12)', borderRadius: 99, margin: '14px 0 0', overflow: 'hidden' },
  progressFill: (pct) => ({ height: '100%', width: `${pct}%`, background: 'var(--color-accent)', borderRadius: 99, transition: 'width 0.35s ease' }),
  stepLabel: { fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 4, marginBottom: 8 },
  stepWrap: { maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 },
  stepTitle: { fontSize: 19, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, fontFamily: 'var(--font-display)' },
  stepSub: { fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 },
  genderGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 },
  genderBtn: (active) => ({
    padding: '28px 16px', border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? '#F5EDD6' : 'var(--color-surface)',
    cursor: 'pointer', fontSize: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s',
  }),
  genderLabel: (active) => ({ fontSize: 14, fontWeight: 600, color: active ? '#1B2A4A' : 'var(--color-text)' }),
  calToggle: { display: 'flex', gap: 8, marginBottom: 16 },
  calBtn: (active) => ({
    flex: 1, padding: '10px', fontSize: 13, fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? '#F5EDD6' : 'var(--color-surface)',
    color: active ? '#1B2A4A' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s',
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
  datePreview: { fontSize: 13, color: 'var(--color-accent)', textAlign: 'center', marginBottom: 8, fontWeight: 600 },
  ampmGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  ampmBtn: (active) => ({
    padding: '14px', fontSize: 15, fontWeight: active ? 700 : 400,
    border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? '#F5EDD6' : 'var(--color-surface)',
    color: active ? '#1B2A4A' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s',
  }),
  timeLabel: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8, letterSpacing: '0.05em' },
  timeGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 },
  timeBtn: (active) => ({
    padding: '12px 4px', fontSize: 14, fontWeight: active ? 700 : 400,
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? '#F5EDD6' : 'var(--color-surface)',
    color: active ? '#1B2A4A' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
  }),
  minGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 },
  unknownBtn: (active) => ({
    width: '100%', padding: '13px 16px', border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? '#F5EDD6' : 'var(--color-surface)',
    color: active ? '#1B2A4A' : 'var(--color-text-muted)',
    fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', marginBottom: 16,
  }),
  chipWrap: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: (active) => ({
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer',
    background: active ? '#F5EDD6' : 'transparent', color: active ? '#1B2A4A' : 'var(--color-text-muted)',
    fontWeight: active ? 600 : 400, transition: 'all 0.15s',
  }),
  skipBtn: { fontSize: 13, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' },
  bottomBar: {
    position: 'fixed', bottom: 0, background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)',
    padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%',
    left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box',
  },
  backBtn: { flex: '0 0 auto', padding: '14px 20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontSize: 15, cursor: 'pointer', color: 'var(--color-text)' },
  nextBtn: (disabled) => ({
    flex: 1, padding: '14px', fontSize: 15, fontWeight: 600,
    background: disabled ? '#C8C0A8' : '#1B2A4A', color: disabled ? '#FFF' : '#C9A84C', border: 'none',
    borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
    letterSpacing: '0.03em',
  }),
  resultWrap: { maxWidth: 480, margin: '0 auto', padding: '12px 16px 40px', boxSizing: 'border-box' },
  sajuCard: { background: '#1B2A4A', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 12 },
  sajuTitle: { fontSize: 12, fontWeight: 600, color: '#C9A84C', marginBottom: 12, letterSpacing: '0.08em' },
  sajuTable: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  sajuCell: { textAlign: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 4px', border: '1px solid rgba(201,168,76,0.15)' },
  sajuCellLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 4, display: 'block' },
  sajuCellValue: { fontSize: 13, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.6 },
 streamCard: { background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 'var(--radius-md)', padding: '16px 18px', marginBottom: 8, fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' },
    accordion: { marginBottom: 8, border: '1px solid rgba(201,168,76,0.15)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
    accordionHeader: (open) => ({
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 18px', cursor: 'pointer', background: open ? 'rgba(201,168,76,0.08)' : '#0D1B3E', transition: 'all 0.2s',
    }),
    accordionTitle: (open) => ({ fontSize: 15, fontWeight: 700, color: open ? '#C9A84C' : 'rgba(255,255,255,0.85)', flex: 1, fontFamily: 'var(--font-display)' }),
    accordionArrow: (open) => ({ fontSize: 12, color: 'rgba(201,168,76,0.5)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }),
    accordionBody: { wordBreak: 'keep-all', padding: '16px 18px', fontSize: 17, lineHeight: 2, color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.1)' },
    paidAccordion: { marginBottom: 8, border: '1px solid rgba(201,168,76,0.4)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
    paidAccordionHeader: (open) => ({
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 18px', cursor: 'pointer', background: open ? 'rgba(201,168,76,0.12)' : '#0D1B3E', transition: 'all 0.2s',
    }),
    luckyCard: { background: 'linear-gradient(135deg, #0D1B3E, #1B2A4A)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12 },
    luckyGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 },
    luckyItem: { background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(201,168,76,0.15)' },
    luckyItemLabel: { fontSize: 10, color: '#C9A84C', fontWeight: 600, marginBottom: 3, display: 'block' },
    luckyItemValue: { fontSize: 13, color: '#FFFFFF', fontWeight: 500 },
    loading: { display: 'flex', gap: 6, alignItems: 'center', padding: '20px' },
    dot: (i) => ({ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }),
    restartBtn: { width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', marginTop: 10 },
    loadingCard: { background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 'var(--radius-md)', padding: '24px 20px', marginBottom: 12 },
    payBanner: {
      background: 'linear-gradient(135deg, #0D1B3E 0%, #050D1F 100%)',
      borderRadius: 'var(--radius-md)', padding: '28px 20px', marginBottom: 12, textAlign: 'center',
      border: '1px solid rgba(201,168,76,0.3)',
    },
    payOriginal: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through', marginBottom: 2 },
    payPrice: { fontSize: 40, fontWeight: 800, color: '#C9A84C', marginBottom: 4, fontFamily: 'var(--font-display)' },
    payDiscount: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16 },
    payBtn: {
      width: '100%', padding: '16px', fontSize: 16, fontWeight: 700,
      background: '#C9A84C', color: '#0A1628', border: 'none',
      borderRadius: 'var(--radius-md)', cursor: 'pointer', letterSpacing: '0.03em',
    },
    gunghabAccordion: { marginBottom: 8, border: '1px solid rgba(155,29,58,0.4)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
    gunghabAccordionHeader: (open) => ({
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 18px', cursor: 'pointer', background: open ? 'rgba(155,29,58,0.1)' : '#0D1B3E', transition: 'all 0.2s',
    }),
    childAccordion: { marginBottom: 8, border: '1px solid rgba(45,122,82,0.4)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
    childAccordionHeader: (open) => ({
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 18px', cursor: 'pointer', background: open ? 'rgba(45,122,82,0.1)' : '#0D1B3E', transition: 'all 0.2s',
    }),
    gililAccordion: { marginBottom: 8, border: '1px solid rgba(201,168,76,0.4)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
    gililAccordionHeader: (open) => ({
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 18px', cursor: 'pointer', background: open ? 'rgba(201,168,76,0.1)' : '#0D1B3E', transition: 'all 0.2s',
    }),
}

const CARD_COLORS = {
  saju:    { bg: '#EEF0F6', border: '#C5CEDF', text: '#1B2A4A', accent: '#C9A84C' },
  gunghab: { bg: '#F7EDEF', border: '#E8C4CC', text: '#6B1229', accent: '#9B1D3A' },
  child:   { bg: '#EDF4F0', border: '#B8D9C8', text: '#1B4A33', accent: '#2D7A52' },
  노후:   { bg: '#EEF3F7', border: '#BDD0DF', text: '#1B3A5A', accent: '#2D6A9B' },
  길일:   { bg: '#F5EDD6', border: '#DFC88A', text: '#5A3D0A', accent: '#C9A84C' },
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

function Accordion({ title, content, isPaid = false, isChild = false, isGunghab = false, isGilil = false, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const style = isGunghab ? s.gunghabAccordion : isChild ? s.childAccordion : isGilil ? s.gililAccordion : isPaid ? s.paidAccordion : s.accordion
  const headerStyle = isGunghab ? s.gunghabAccordionHeader : isChild ? s.childAccordionHeader : isGilil ? s.gililAccordionHeader : isPaid ? s.paidAccordionHeader : s.accordionHeader
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
  const [openCheongan, setOpenCheongan] = useState(null)
  // 궁합 전용 상태
  const [gunghabStep, setGunghabStep] = useState(1)
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
  // 길일 전용 상태
  const [gilil목적, setGilil목적] = useState('')
  const [gililText, setGililText] = useState('')
  const [isGililStreaming, setIsGililStreaming] = useState(false)

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
    if (currentStepId === 'gender' && (serviceType === 'child' || serviceType === '노후')) {
      setStep(s => s + 2)
      return
    }
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleFreeAnalyze()
  }
function goBack() {
    if (currentStepId === 'birthdate' && (serviceType === 'child' || serviceType === '노후')) {
      setStep(s => s - 2)
      return
    }
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
    const apiType = serviceType === 'child' ? '자녀천명' : serviceType === '노후' ? '노후' : '기본'
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
    const apiType = serviceType === 'child' ? '자녀천명' : serviceType === '노후' ? '노후' : '전체'
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
    setGunghabStep(1); setPartnerGender(''); setPartnerBirthYear(''); setPartnerBirthMonth(''); setPartnerBirthDay('')
    setPartnerIsLunar(false); setPartnerTimeHour(''); setPartnerTimeMin(''); setPartnerTimeAmPm('오전'); setPartnerTimeUnknown(false)
    setMyName(''); setPartnerName('')
    setGunghabText(''); setIsGunghabStreaming(false)
    setGilil목적(''); setGililText(''); setIsGililStreaming(false)
    isPaidSectionRef.current = false
  }

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
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.')
    }
    setIsGunghabStreaming(false)
  }

  async function handleGililAnalyze() {
    setGililText(''); setIsGililStreaming(true); setScreen('gilil_result')
    try {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender, birthdate, birthtime, isLunar,
          목적: gilil목적, type: '길일', isPaid: true,
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
            if (json.text) setGililText(prev => prev + json.text)
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.')
    }
    setIsGililStreaming(false)
  }

 // ── 길일 입력 화면 ──
  if (screen === 'gilil_input') {
    const 목적목록 = [
      { value: '이사', emoji: '🏠' },
      { value: '계약', emoji: '📝' },
      { value: '개업', emoji: '🎊' },
      { value: '결혼', emoji: '💍' },
      { value: '수술', emoji: '🏥' },
      { value: '시험', emoji: '📚' },
    ]
    const canNext = gilil목적 !== '' && birthdateValid
    return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #0D1B3E 0%, #050D1F 100%)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 10 }}>吉</div>
          <h1 style={{ wordBreak: 'keep-all', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>길일 추천</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>내 사주와 맞는 좋은 날을 찾아드려요</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6, fontFamily: 'var(--font-display)' }}>어떤 날을 찾고 계세요?</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>목적을 선택해주세요</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {목적목록.map(({ value, emoji }) => (
              <button key={value}
                style={{
                  padding: '16px 8px',
                  border: `2px solid ${gilil목적 === value ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`,
                  borderRadius: 10,
                  background: gilil목적 === value ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                }}
                onClick={() => setGilil목적(value)}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
                <div style={{ fontSize: 13, fontWeight: gilil목적 === value ? 700 : 400, color: gilil목적 === value ? '#C9A84C' : 'rgba(255,255,255,0.6)' }}>{value}</div>
              </button>
            ))}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6, fontFamily: 'var(--font-display)' }}>생년월일을 알려주세요</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>내 사주를 기준으로 길일을 찾아드려요</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: !isLunar ? 600 : 400, border: `1px solid ${!isLunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: !isLunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: !isLunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setIsLunar(false)}>양력 🌞</button>
            <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: isLunar ? 600 : 400, border: `1px solid ${isLunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: isLunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: isLunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setIsLunar(true)}>음력 🌙</button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
            <input style={{ width: 90, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="년도" value={birthYear} onChange={e => setBirthYear(e.target.value.slice(0,4))} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>년</span>
            <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="월" value={birthMonth} onChange={e => setBirthMonth(e.target.value.slice(0,2))} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>월</span>
            <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="일" value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0,2))} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>일</span>
          </div>
          {birthdateValid && <p style={{ fontSize: 13, color: '#C9A84C', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>✓ {birthYear}년 {birthMonth}월 {birthDay}일</p>}
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.15)', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box' }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 15, cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }} onClick={() => setScreen('landing')}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 600, background: !canNext ? 'rgba(201,168,76,0.2)' : '#C9A84C', color: !canNext ? 'rgba(255,255,255,0.3)' : '#0A1628', border: 'none', borderRadius: 10, cursor: !canNext ? 'not-allowed' : 'pointer', letterSpacing: '0.03em' }}
            disabled={!canNext}
            onClick={() => {
              if (IS_ADMIN) { handleGililAnalyze(); return; }
              const IMP = window.IMP
              IMP.init('imp87662575')
              IMP.request_pay({
                pg: 'html5_inicis', pay_method: 'card',
                merchant_uid: `gilil_${Date.now()}`,
                name: '마이사주 길일 추천', amount: 9900,
                buyer_name: '고객',
              }, (rsp) => {
                if (rsp.success) handleGililAnalyze()
                else alert('결제가 취소되었습니다.')
              })
            }}>
            📅 길일 찾기 (9,900원)
          </button>
        </div>
      </div>
    )
  }
  // ── 길일 결과 화면 ──
  if (screen === 'gilil_result') {
    const gililSections = parseSections(gililText)
    return (
      <div style={s.app}>
        <div style={s.resultWrap}>
          <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
            <span style={{ fontSize: 36 }}>📅</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginTop: 8 }}>{gilil목적} 길일 추천</h2>
          </div>
          {isGililStreaming && gililText && (
            <div style={s.streamCard}>{gililText}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}
          {isGililStreaming && !gililText && (
            <div style={s.loadingCard}>
              <div style={s.loading}>
                {[0,1,2].map(i => <div key={i} style={s.dot(i)} />)}
                <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>📅 길일을 찾고 있어요...</span>
              </div>
            </div>
          )}
          {!isGililStreaming && gililSections.map((sec, i) => (
            <Accordion key={i} title={sec.title} content={sec.content} isGilil={true} defaultOpen={i === 0} />
          ))}
          <button style={s.restartBtn} onClick={handleRestart}>처음으로 돌아가기</button>
        </div>
      </div>
    )
  }

 // ── 궁합 입력 화면 ──
  if (screen === 'gunghab_input') {
    const isStep1 = gunghabStep === 1
    const myBirthdateValid = birthYear.length === 4 && Number(birthMonth) >= 1 && Number(birthMonth) <= 12 && Number(birthDay) >= 1
    const myBirthtimeValid = timeUnknown || (timeHour !== '' && timeMin !== '')
    const canStep1Next = gender !== '' && myBirthdateValid && myBirthtimeValid
    const canStep2Next = partnerGender !== '' && partnerBirthdateValid && partnerBirthtimeValid

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
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6, fontFamily: 'var(--font-display)' }}>나의 정보</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>내 성별부터 알려주세요</p>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>이름 (선택)</p>
                <input
                  style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', boxSizing: 'border-box', outline: 'none' }}
                  type="text" placeholder="내 이름을 입력해주세요"
                  value={myName} onChange={e => setMyName(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                <button style={{ padding: '28px 16px', border: `2px solid ${gender === '여성' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: gender === '여성' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontSize: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }} onClick={() => setGender('여성')}>
                  <span>♀️</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: gender === '여성' ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>여성</span>
                </button>
                <button style={{ padding: '28px 16px', border: `2px solid ${gender === '남성' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: gender === '남성' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontSize: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }} onClick={() => setGender('남성')}>
                  <span>♂️</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: gender === '남성' ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>남성</span>
                </button>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginTop: 20, marginBottom: 6, fontFamily: 'var(--font-display)' }}>내 생년월일 · 시간</h2>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: !isLunar ? 600 : 400, border: `1px solid ${!isLunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: !isLunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: !isLunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setIsLunar(false)}>양력 🌞</button>
                <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: isLunar ? 600 : 400, border: `1px solid ${isLunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: isLunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: isLunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setIsLunar(true)}>음력 🌙</button>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                <input style={{ width: 90, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="년도" value={birthYear} onChange={e => setBirthYear(e.target.value.slice(0,4))} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>년</span>
                <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="월" value={birthMonth} onChange={e => setBirthMonth(e.target.value.slice(0,2))} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>월</span>
                <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="일" value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0,2))} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>일</span>
              </div>
              <button style={{ width: '100%', padding: '13px 16px', border: `1px solid ${timeUnknown ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: timeUnknown ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeUnknown ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: timeUnknown ? 600 : 400, cursor: 'pointer', textAlign: 'center', marginBottom: 16 }} onClick={() => { setTimeUnknown(true); setTimeHour(''); setTimeMin('') }}>✓ 태어난 시간 모름</button>
              {!timeUnknown && (
                <>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>오전 / 오후</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    <button style={{ padding: '14px', fontSize: 15, fontWeight: timeAmPm === '오전' ? 700 : 400, border: `2px solid ${timeAmPm === '오전' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: timeAmPm === '오전' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeAmPm === '오전' ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setTimeAmPm('오전')}>🌅 오전</button>
                    <button style={{ padding: '14px', fontSize: 15, fontWeight: timeAmPm === '오후' ? 700 : 400, border: `2px solid ${timeAmPm === '오후' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: timeAmPm === '오후' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeAmPm === '오후' ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setTimeAmPm('오후')}>🌇 오후</button>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>시 선택</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                      <button key={h} style={{ padding: '12px 4px', fontSize: 14, fontWeight: timeHour === String(h) ? 700 : 400, border: `1px solid ${timeHour === String(h) ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, background: timeHour === String(h) ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeHour === String(h) ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setTimeHour(String(h))}>{h}시</button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>분 선택</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {['00','10','20','30','40','50'].map(m => (
                      <button key={m} style={{ padding: '12px 4px', fontSize: 14, fontWeight: timeMin === m ? 700 : 400, border: `1px solid ${timeMin === m ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, background: timeMin === m ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeMin === m ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setTimeMin(m)}>{m}분</button>
                    ))}
                  </div>
                  {timeHour && timeMin && <p style={{ fontSize: 13, color: '#C9A84C', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>✓ {timeAmPm} {timeHour}시 {timeMin}분</p>}
                </>
              )}
              {timeUnknown && <button style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' }} onClick={() => setTimeUnknown(false)}>시간 직접 선택하기</button>}
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6, fontFamily: 'var(--font-display)' }}>상대방 정보</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>상대방 성별을 알려주세요</p>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>상대방 이름 (선택)</p>
                <input
                  style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', boxSizing: 'border-box', outline: 'none' }}
                  type="text" placeholder="상대방 이름을 입력해주세요"
                  value={partnerName} onChange={e => setPartnerName(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                <button style={{ padding: '28px 16px', border: `2px solid ${partnerGender === '여성' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: partnerGender === '여성' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontSize: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }} onClick={() => setPartnerGender('여성')}>
                  <span>♀️</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: partnerGender === '여성' ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>여성</span>
                </button>
                <button style={{ padding: '28px 16px', border: `2px solid ${partnerGender === '남성' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: partnerGender === '남성' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontSize: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }} onClick={() => setPartnerGender('남성')}>
                  <span>♂️</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: partnerGender === '남성' ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>남성</span>
                </button>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginTop: 20, marginBottom: 6, fontFamily: 'var(--font-display)' }}>상대방 생년월일 · 시간</h2>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: !partnerIsLunar ? 600 : 400, border: `1px solid ${!partnerIsLunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: !partnerIsLunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: !partnerIsLunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setPartnerIsLunar(false)}>양력 🌞</button>
                <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: partnerIsLunar ? 600 : 400, border: `1px solid ${partnerIsLunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: partnerIsLunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: partnerIsLunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setPartnerIsLunar(true)}>음력 🌙</button>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                <input style={{ width: 90, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="년도" value={partnerBirthYear} onChange={e => setPartnerBirthYear(e.target.value.slice(0,4))} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>년</span>
                <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="월" value={partnerBirthMonth} onChange={e => setPartnerBirthMonth(e.target.value.slice(0,2))} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>월</span>
                <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="일" value={partnerBirthDay} onChange={e => setPartnerBirthDay(e.target.value.slice(0,2))} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>일</span>
              </div>
              <button style={{ width: '100%', padding: '13px 16px', border: `1px solid ${partnerTimeUnknown ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: partnerTimeUnknown ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: partnerTimeUnknown ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: partnerTimeUnknown ? 600 : 400, cursor: 'pointer', textAlign: 'center', marginBottom: 16 }} onClick={() => { setPartnerTimeUnknown(true); setPartnerTimeHour(''); setPartnerTimeMin('') }}>✓ 태어난 시간 모름</button>
              {!partnerTimeUnknown && (
                <>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>오전 / 오후</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    <button style={{ padding: '14px', fontSize: 15, fontWeight: partnerTimeAmPm === '오전' ? 700 : 400, border: `2px solid ${partnerTimeAmPm === '오전' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: partnerTimeAmPm === '오전' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: partnerTimeAmPm === '오전' ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setPartnerTimeAmPm('오전')}>🌅 오전</button>
                    <button style={{ padding: '14px', fontSize: 15, fontWeight: partnerTimeAmPm === '오후' ? 700 : 400, border: `2px solid ${partnerTimeAmPm === '오후' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: partnerTimeAmPm === '오후' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: partnerTimeAmPm === '오후' ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setPartnerTimeAmPm('오후')}>🌇 오후</button>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>시 선택</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                      <button key={h} style={{ padding: '12px 4px', fontSize: 14, fontWeight: partnerTimeHour === String(h) ? 700 : 400, border: `1px solid ${partnerTimeHour === String(h) ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, background: partnerTimeHour === String(h) ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: partnerTimeHour === String(h) ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setPartnerTimeHour(String(h))}>{h}시</button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>분 선택</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {['00','10','20','30','40','50'].map(m => (
                      <button key={m} style={{ padding: '12px 4px', fontSize: 14, fontWeight: partnerTimeMin === m ? 700 : 400, border: `1px solid ${partnerTimeMin === m ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, background: partnerTimeMin === m ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: partnerTimeMin === m ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setPartnerTimeMin(m)}>{m}분</button>
                    ))}
                  </div>
                  {partnerTimeHour && partnerTimeMin && <p style={{ fontSize: 13, color: '#C9A84C', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>✓ {partnerTimeAmPm} {partnerTimeHour}시 {partnerTimeMin}분</p>}
                </>
              )}
              {partnerTimeUnknown && <button style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' }} onClick={() => setPartnerTimeUnknown(false)}>시간 직접 선택하기</button>}
            </>
          )}
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.15)', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box' }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 15, cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }} onClick={() => {
            if (isStep1) setScreen('landing')
            else setGunghabStep(1)
          }}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 600, background: (isStep1 ? !canStep1Next : !canStep2Next) ? 'rgba(201,168,76,0.2)' : '#C9A84C', color: (isStep1 ? !canStep1Next : !canStep2Next) ? 'rgba(255,255,255,0.3)' : '#0A1628', border: 'none', borderRadius: 10, cursor: (isStep1 ? !canStep1Next : !canStep2Next) ? 'not-allowed' : 'pointer', letterSpacing: '0.03em' }}
            disabled={isStep1 ? !canStep1Next : !canStep2Next}
            onClick={() => {
              if (isStep1) setGunghabStep(2)
              else {
                if (IS_ADMIN) { handleGunghabAnalyze(); return; }
                const IMP = window.IMP
                IMP.init('imp87662575')
                IMP.request_pay({
                  pg: 'html5_inicis', pay_method: 'card',
                  merchant_uid: `gunghab_${Date.now()}`,
                  name: '마이사주 궁합 분석', amount: 1900,
                  buyer_name: myName || '고객',
                }, (rsp) => {
                  if (rsp.success) handleGunghabAnalyze()
                  else alert('결제가 취소되었습니다.')
                })
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

    return (
      <div style={s.landing}>
        {/* 타이머 배너 */}

        {/* 히어로 + 북극성 — 네이비로 통합 */}
<div style={{ position: 'relative', overflow: 'hidden', paddingBottom: 0 }}>
          {/* 우주 배경 */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 20% 50%, #0D1B3E 0%, #050D1F 40%, #000510 100%)',
          }}/>
          {/* 은하수 레이어 */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 70% 30%, rgba(100,140,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(180,100,255,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)',
          }}/>
          {/* 별빛 파티클 */}
          {[...Array(30)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: i % 5 === 0 ? 2 : 1,
              height: i % 5 === 0 ? 2 : 1,
              borderRadius: '50%',
              background: i % 7 === 0 ? '#C9A84C' : 'white',
              opacity: Math.random() * 0.6 + 0.2,
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
            }}/>
          ))}

          <div style={{
            position: 'relative',
            ...s.landingHero,
            margin: '20px 16px 0',
            borderRadius: 16,
            border: '1px solid rgba(201,168,76,0.5)',
            outline: '3px solid rgba(201,168,76,0.15)',
            outlineOffset: '5px',
            background: 'rgba(5,13,31,0.6)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 60px rgba(100,140,255,0.1), inset 0 0 40px rgba(0,5,16,0.5)',
          }}>
            {/* 몽환적 별 */}
            <div style={{ marginBottom: 20, position: 'relative' }}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="glowBig" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#C9A84C" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#6B8FFF" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#6B8FFF" stopOpacity="0"/>
                  </radialGradient>
                  <linearGradient id="starV" x1="40" y1="0" x2="40" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F5E090"/>
                    <stop offset="45%" stopColor="#C9A84C"/>
                    <stop offset="55%" stopColor="#C9A84C"/>
                    <stop offset="100%" stopColor="#F5E090"/>
                  </linearGradient>
                  <linearGradient id="starH" x1="0" y1="40" x2="80" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F5E090"/>
                    <stop offset="45%" stopColor="#C9A84C"/>
                    <stop offset="55%" stopColor="#C9A84C"/>
                    <stop offset="100%" stopColor="#F5E090"/>
                  </linearGradient>
                  <filter id="blur1">
                    <feGaussianBlur stdDeviation="3"/>
                  </filter>
                  <filter id="blur2">
                    <feGaussianBlur stdDeviation="6"/>
                  </filter>
                </defs>
                {/* 글로우 레이어 */}
                <ellipse cx="40" cy="40" rx="30" ry="30" fill="url(#glowBig)"/>
                <ellipse cx="40" cy="40" rx="20" ry="20" fill="url(#glowBlue)"/>
                {/* 별 광채 - 블러 */}
                <path d="M40 2L41 37L40 78L39 37L40 2Z" fill="#E8C96A" filter="url(#blur1)" opacity="0.5"/>
                <path d="M2 40L37 39L78 40L37 41L2 40Z" fill="#E8C96A" filter="url(#blur1)" opacity="0.5"/>
                {/* 별 본체 - 세로 */}
                <path d="M40 4L41.2 37L40 76L38.8 37L40 4Z" fill="url(#starV)"/>
                {/* 별 본체 - 가로 */}
                <path d="M4 40L37 38.8L76 40L37 41.2L4 40Z" fill="url(#starH)"/>
                {/* 대각선 */}
                <path d="M14 14L37.5 37.5L14 14Z" stroke="rgba(201,168,76,0.4)" strokeWidth="0.8"/>
                <path d="M66 14L42.5 37.5" stroke="rgba(201,168,76,0.4)" strokeWidth="0.8"/>
                <path d="M14 66L37.5 42.5" stroke="rgba(201,168,76,0.4)" strokeWidth="0.8"/>
                <path d="M66 66L42.5 42.5" stroke="rgba(201,168,76,0.4)" strokeWidth="0.8"/>
                {/* 중심 */}
                <circle cx="40" cy="40" r="2.5" fill="#FFF8DC"/>
                <circle cx="40" cy="40" r="5" fill="#E8C96A" opacity="0.4"/>
                {/* 작은 보조 별 */}
                <path d="M62 18L62.5 21.5L66 22L62.5 22.5L62 26L61.5 22.5L58 22L61.5 21.5L62 18Z" fill="rgba(201,168,76,0.7)"/>
                <path d="M18 56L18.4 58.6L21 59L18.4 59.4L18 62L17.6 59.4L15 59L17.6 58.6L18 56Z" fill="rgba(201,168,76,0.5)"/>
              </svg>
            </div>

            <h1 style={{
              wordBreak: 'keep-all',
              fontSize: 34,
              fontWeight: 800,
              color: '#FFFFFF',
              marginBottom: 12,
              lineHeight: 1.25,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              textShadow: '0 0 40px rgba(100,140,255,0.4), 0 2px 20px rgba(0,0,0,0.8)',
            }}>나는 죽어도 안되는 게,<br/>쟤는 왜 쉽게 될까</h1>

            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: 24 }}>
              방향이 달랐던 거예요.<br/>
              <span style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15 }}>사주가 알려줄게요.</span>
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.5)', padding: '9px 22px', borderRadius: 20, fontSize: 13, color: '#C9A84C', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
              <span>⏰</span>
              <span>오늘만 <span style={{ fontWeight: 800 }}>1,900원</span></span>
            </div>
          </div>

{/* 골드 구분선 */}
          <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)', margin: '32px auto' }} />

          <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto', padding: '0 24px 48px' }}>
            {/* 인용 따옴표 */}
            <p style={{ fontSize: 36, color: 'rgba(201,168,76,0.3)', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 8, textAlign: 'center' }}>"</p>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: 'rgba(255,255,255,0.7)', wordBreak: 'keep-all', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
              북극성을 보러 가고 싶은데<br/>
              남쪽으로 달리고 있다면?
            </p>
            <div style={{ width: 30, height: 1, background: 'rgba(201,168,76,0.3)', margin: '20px auto' }}/>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', wordBreak: 'keep-all', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              노력이 부족한 게 아니에요.<br/>방향이 틀린 거예요.
            </p>
            <div style={{ width: 30, height: 1, background: 'rgba(201,168,76,0.3)', margin: '20px auto' }}/>
            <p style={{ fontSize: 17, lineHeight: 1.75, color: '#C9A84C', wordBreak: 'keep-all', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              사주팔자는 내 북극성이<br/>어느 쪽에 있는지 알려주는 지도예요.
            </p>
            <p style={{ fontSize: 36, color: 'rgba(201,168,76,0.3)', fontFamily: 'Georgia, serif', lineHeight: 1, marginTop: 8, textAlign: 'center' }}>"</p>
          </div>
        </div>

 {/* 천간 섹션 */}
        <div style={{ background: '#0D1B3E', borderTop: '1px solid rgba(201,168,76,0.3)', borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px 28px', width: '100%', boxSizing: 'border-box' }}>
            <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.7)', textAlign: 'center', marginBottom: 4, fontWeight: 600, letterSpacing: '0.12em' }}>YOUR ENERGY</p>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>나는 어떤 기운일까? — 일간(日干)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { key: '갑목', ohaeng: '木', ohaengColor: '#4ADE80', title: '甲 갑목', sub: '하늘을 향해 곧게 자라는 나무', good: '목표가 뚜렷한 곳, 내가 왜 하는지 보이는 일', bad: '이유 없이 "그냥 해"가 반복되는 환경' },
                { key: '을목', ohaeng: '木', ohaengColor: '#4ADE80', title: '乙 을목', sub: '어디서든 뿌리내리는 생명력', good: '세심하게 인정받는 분위기, 디테일이 빛나는 자리', bad: '감정 무시하는 곳, 거칠고 무뚝뚝한 환경' },
                { key: '병화', ohaeng: '火', ohaengColor: '#F87171', title: '丙 병화', sub: '주변을 환하게 밝히는 태양', good: '사람들 앞에 서는 자리, 반응이 오는 무대', bad: '혼자 조용히 처리해야 하는 단절된 환경' },
                { key: '정화', ohaeng: '火', ohaengColor: '#F87171', title: '丁 정화', sub: '어둠 속에서 깊이 타오르는 불꽃', good: '한 가지에 깊이 파고드는 환경, 조용한 집중', bad: '5분마다 끊기는 업무, 산만하고 소란스러운 곳' },
                { key: '무토', ohaeng: '土', ohaengColor: '#C9A84C', title: '戊 무토', sub: '모든 것을 품어내는 큰 산', good: '내가 중심이 되어 운영하는 구조, 믿고 맡기는 조직', bad: '책임만 지고 권한은 없는 자리, 끝없는 희생 요구' },
                { key: '기토', ohaeng: '土', ohaengColor: '#C9A84C', title: '己 기토', sub: '씨앗을 키워내는 비옥한 땅', good: '규칙이 있고 예측 가능한 환경, 내 역할이 명확한 곳', bad: '매일 바뀌는 방침, 즉흥적이고 뒤죽박죽인 조직' },
                { key: '경금', ohaeng: '金', ohaengColor: '#E8C96A', title: '庚 경금', sub: '단단하고 날카로운 원석의 힘', good: '기준이 명확한 곳, 성과가 숫자로 보이는 환경', bad: '애매하고 흐릿한 기준, 불공정한 평가가 반복되는 곳' },
                { key: '신금', ohaeng: '金', ohaengColor: '#E8C96A', title: '辛 신금', sub: '정교하게 다듬어진 보석의 감각', good: '품격 있는 환경, 섬세함이 경쟁력이 되는 자리', bad: '저급하고 거친 분위기, 노력이 무시당하는 곳' },
                { key: '임수', ohaeng: '水', ohaengColor: '#60A5FA', title: '壬 임수', sub: '넓고 유연하게 흐르는 큰 강', good: '새로운 정보가 들어오는 곳, 판을 키울 수 있는 환경', bad: '변화 없이 고여있는 조직, 외부와 단절된 폐쇄적인 곳' },
                { key: '계수', ohaeng: '水', ohaengColor: '#60A5FA', title: '癸 계수', sub: '깊은 곳에서 솟아오르는 지하수', good: '혼자 생각할 시간이 있는 환경, 깊이가 인정받는 자리', bad: '시끄럽고 감정 소모 심한 곳, 내면을 무시하는 환경' },
              ].map((c) => (
                <div key={c.key}
                  onClick={() => setOpenCheongan(openCheongan === c.key ? null : c.key)}
                  style={{
                    background: openCheongan === c.key ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${openCheongan === c.key ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.12)'}`,
                    borderRadius: 10, padding: '14px 12px', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {/* 오행 한자 */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: `${c.ohaengColor}18`,
                      border: `1px solid ${c.ohaengColor}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 900, color: c.ohaengColor,
                      fontFamily: 'Georgia, serif',
                    }}>{c.ohaeng}</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: openCheongan === c.key ? '#C9A84C' : 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>{c.title}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5, margin: 0 }}>{c.sub}</p>
                  {openCheongan === c.key && (
                    <div style={{ marginTop: 10, borderTop: '1px solid rgba(201,168,76,0.2)', paddingTop: 10 }}>
                      <p style={{ fontSize: 11, color: '#4ADE80', fontWeight: 600, marginBottom: 4 }}>✅ {c.good}</p>
                      <p style={{ fontSize: 11, color: '#F87171', fontWeight: 600 }}>❌ {c.bad}</p>
                      <p style={{ fontSize: 11, color: '#C9A84C', marginTop: 8, fontWeight: 500 }}>🔒 내 일간이 뭔지 모른다면? 사주 분석에서 확인하세요</p>
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
            <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.7)', textAlign: 'center', marginBottom: 4, fontWeight: 600, letterSpacing: '0.12em' }}>
              SERVICES
            </p>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              무엇이 궁금하세요?
            </p>
<div style={s.grid2}>
              <button style={{
                background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: 10, padding: '20px 12px', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }} onClick={() => { setServiceType('saju'); setScreen('input') }}>
                <span style={{ display: 'inline-block', background: 'rgba(201,168,76,0.15)', color: '#C9A84C', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 2, marginBottom: 12, border: '1px solid rgba(201,168,76,0.3)', letterSpacing: '0.1em' }}>FREE PREVIEW</span>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1, marginBottom: 12, letterSpacing: '-0.02em' }}>命</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginBottom: 6, fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>나의 사주</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>돈·직업·연애<br/>내 팔자가 정해놨다</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginTop: 12, letterSpacing: '0.05em' }}>1,900원</div>
              </button>
              <button style={{
                background: 'rgba(155,29,58,0.06)', border: '1px solid rgba(155,29,58,0.3)',
                borderRadius: 10, padding: '20px 12px', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }} onClick={() => { setServiceType('gunghab'); setGunghabStep(1); setScreen('gunghab_input') }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1, marginBottom: 12, marginTop: 22, letterSpacing: '-0.02em' }}>合</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginBottom: 6, fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>궁합</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>우리 잘 맞는지<br/>사주로 확인</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginTop: 12, letterSpacing: '0.05em' }}>1,900원</div>
              </button>
            </div>
            <div style={s.grid2}>
              <button style={{
                background: 'rgba(45,122,82,0.06)', border: '1px solid rgba(45,122,82,0.3)',
                borderRadius: 10, padding: '20px 12px', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }} onClick={() => { setServiceType('child'); setScreen('input') }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1, marginBottom: 12, letterSpacing: '-0.02em' }}>子</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginBottom: 6, fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>혼냈던 게 재능이었어요</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>타고난 재능·진로<br/>미리 확인</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginTop: 12, letterSpacing: '0.05em' }}>1,900원</div>
              </button>
              <button style={{
                background: 'rgba(45,106,155,0.06)', border: '1px solid rgba(45,106,155,0.3)',
                borderRadius: 10, padding: '20px 12px', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }} onClick={() => { setServiceType('노후'); setScreen('input') }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1, marginBottom: 12, letterSpacing: '-0.02em' }}>老</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginBottom: 6, fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>내 후반전, 어떻게 흘러갈까?</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>말년 재물·건강<br/>황혼 인연 미리 확인</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginTop: 12, letterSpacing: '0.05em' }}>1,900원</div>
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <button style={{
                width: '100%', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.35)',
                borderRadius: 10, padding: '20px 16px', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center',
              }} onClick={() => { setServiceType('길일'); setScreen('gilil_input') }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.02em' }}>吉</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#C9A84C', marginBottom: 4, fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>오늘, 이 날짜 괜찮을까?</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>이사·계약·개업·결혼·수술<br/>내 사주와 맞는 길일 추천</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginTop: 6, letterSpacing: '0.05em' }}>9,900원</div>
                </div>
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid rgba(201,168,76,0.15)', marginTop: 8 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>이미 많은 분들이 확인했어요</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                {[['⭐','만족도 94%'],['🔒','안전한 결제'],['⚡','즉시 확인']].map(([e,t]) => (
                  <div key={t} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20 }}>{e}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontWeight: 500 }}>{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

     {/* 사업자 정보 푸터 */}
        <div style={{
          borderTop: '1px solid rgba(201,168,76,0.2)',
          padding: '28px 20px 44px',
          background: '#050D1F',
        }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <p style={{ fontSize: 10, color: 'rgba(201,168,76,0.5)', fontWeight: 600, letterSpacing: '0.12em', marginBottom: 12 }}>BUSINESS INFO</p>
            <div style={{ width: 24, height: 1, background: 'rgba(201,168,76,0.3)', marginBottom: 16 }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginBottom: 10, fontFamily: 'var(--font-display)' }}>봄결</p>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 2.2 }}>
              <p>대표자 · 손영주</p>
              <p>사업자등록번호 · 291-17-02825</p>
              <p>사업장 · 경기도 남양주시 별내3로 332, 701호 -V133호</p>
              <p>전화 · 010-9772-1987</p>
              <p>이메일 · redions77@naver.com</p>
              <p>통신판매업신고 · 제2026-별내-1183호</p>
              <p>과세유형 · 간이과세자</p>
            </div>
            <div style={{ width: 24, height: 1, background: 'rgba(201,168,76,0.2)', margin: '16px 0' }} />
       <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
  <button onClick={() => setScreen('terms')} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>이용약관</button>
  <button onClick={() => setScreen('privacy')} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>개인정보처리방침</button>
  <button onClick={() => setScreen('refund')} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>환불정책</button>
</div>
<p style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>© 2026 봄결. All rights reserved.</p>
          </div>
        </div>

      </div>
    )
  }

// ── 입력 ──
  if (screen === 'input') {
    const serviceNames = { saju: '나의 사주', gunghab: '궁합', child: '혼냈던 게 재능이었어요', 노후: '내 후반전, 어떻게 흘러갈까?' }
    const serviceChar = { saju: '命', gunghab: '合', child: '子', 노후: '老' }
    return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #0D1B3E 0%, #050D1F 100%)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 10 }}>
            {serviceChar[serviceType] || '命'}
          </div>
          <h1 style={{ wordBreak: 'keep-all', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
            {serviceNames[serviceType] || '사주 분석'}
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>생년월일을 입력하면 무료로 먼저 확인해드려요</p>
        </div>

        {/* 프로그레스 */}
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 99, margin: '14px 0 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#C9A84C', borderRadius: 99, transition: 'width 0.35s ease' }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: 4, marginBottom: 8 }}>{step + 1} / {STEPS.length}</p>
        </div>

        {/* 스텝 내용 */}
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
       {currentStepId === 'gender' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6, fontFamily: 'var(--font-display)' }}>성별을 알려주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>사주 풀이에 사용돼요</p>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>이름 (선택)</p>
                <input
                  style={{ width: '100%', fontSize: 15, padding: '14px 16px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', boxSizing: 'border-box', outline: 'none' }}
                  type="text" placeholder="이름을 입력해주세요"
                  value={myName} onChange={e => setMyName(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                <button style={{
                  padding: '28px 16px', border: `2px solid ${gender === '여성' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`,
                  borderRadius: 10, background: gender === '여성' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer', fontSize: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                }} onClick={() => setGender('여성')}>
                  <span>♀️</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: gender === '여성' ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>여성</span>
                </button>
                <button style={{
                  padding: '28px 16px', border: `2px solid ${gender === '남성' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`,
                  borderRadius: 10, background: gender === '남성' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer', fontSize: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                }} onClick={() => setGender('남성')}>
                  <span>♂️</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: gender === '남성' ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>남성</span>
                </button>
              </div>
            </>
          )}
          {currentStepId === 'marital' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6, fontFamily: 'var(--font-display)' }}>결혼 상태를 알려주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>사주 풀이에 사용돼요</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { value: '미혼', emoji: '💫', label: '미혼', sub: '아직 결혼 전이에요' },
                  { value: '기혼', emoji: '💍', label: '기혼', sub: '결혼해서 살고 있어요' },
                ].map(({ value, emoji, label, sub }) => (
                  <button key={value}
                    style={{
                      padding: '18px 20px', border: `2px solid ${maritalStatus === value ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`,
                      borderRadius: 10, background: maritalStatus === value ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.15s',
                    }}
                    onClick={() => setMaritalStatus(value)}>
                    <span style={{ fontSize: 28 }}>{emoji}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: maritalStatus === value ? '#C9A84C' : '#FFFFFF' }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {currentStepId === 'birthdate' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6, fontFamily: 'var(--font-display)' }}>생년월일을 알려주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>숫자로 직접 입력해주세요</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: !isLunar ? 600 : 400, border: `1px solid ${!isLunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: !isLunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: !isLunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setIsLunar(false)}>양력 🌞</button>
                <button style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: isLunar ? 600 : 400, border: `1px solid ${isLunar ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: isLunar ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: isLunar ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setIsLunar(true)}>음력 🌙</button>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                <input style={{ width: 90, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="년도" value={birthYear} onChange={e => setBirthYear(e.target.value.slice(0, 4))} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>년</span>
                <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="월" value={birthMonth} onChange={e => setBirthMonth(e.target.value.slice(0, 2))} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>월</span>
                <input style={{ width: 52, flexShrink: 0, padding: '16px 4px', fontSize: 18, fontWeight: 700, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }} type="number" inputMode="numeric" placeholder="일" value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0, 2))} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>일</span>
              </div>
              {birthdateValid && <p style={{ fontSize: 13, color: '#C9A84C', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>✓ {birthYear}년 {birthMonth}월 {birthDay}일 {isLunar ? '(음력)' : '(양력)'}</p>}
            </>
          )}
          {currentStepId === 'birthtime' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6, fontFamily: 'var(--font-display)' }}>태어난 시간을 알려주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>모르셔도 괜찮아요</p>
              <button style={{ width: '100%', padding: '13px 16px', border: `1px solid ${timeUnknown ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: timeUnknown ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeUnknown ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: timeUnknown ? 600 : 400, cursor: 'pointer', textAlign: 'center', marginBottom: 16 }} onClick={() => { setTimeUnknown(true); setTimeHour(''); setTimeMin('') }}>✓ 태어난 시간 모름</button>
              {!timeUnknown && (
                <>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>오전 / 오후</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    <button style={{ padding: '14px', fontSize: 15, fontWeight: timeAmPm === '오전' ? 700 : 400, border: `2px solid ${timeAmPm === '오전' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: timeAmPm === '오전' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeAmPm === '오전' ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setTimeAmPm('오전')}>🌅 오전</button>
                    <button style={{ padding: '14px', fontSize: 15, fontWeight: timeAmPm === '오후' ? 700 : 400, border: `2px solid ${timeAmPm === '오후' ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: timeAmPm === '오후' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeAmPm === '오후' ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setTimeAmPm('오후')}>🌇 오후</button>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>시 선택</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                      <button key={h} style={{ padding: '12px 4px', fontSize: 14, fontWeight: timeHour === String(h) ? 700 : 400, border: `1px solid ${timeHour === String(h) ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, background: timeHour === String(h) ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeHour === String(h) ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setTimeHour(String(h))}>{h}시</button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 8, letterSpacing: '0.05em' }}>분 선택</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {['00','10','20','30','40','50'].map(m => (
                      <button key={m} style={{ padding: '12px 4px', fontSize: 14, fontWeight: timeMin === m ? 700 : 400, border: `1px solid ${timeMin === m ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, background: timeMin === m ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeMin === m ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setTimeMin(m)}>{m}분</button>
                    ))}
                  </div>
                  {timeHour && timeMin && <p style={{ fontSize: 13, color: '#C9A84C', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>✓ {timeAmPm} {timeHour}시 {timeMin}분</p>}
                </>
              )}
              {timeUnknown && <button style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' }} onClick={() => setTimeUnknown(false)}>시간 직접 선택하기</button>}
            </>
          )}
          {currentStepId === 'mbti' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6, fontFamily: 'var(--font-display)' }}>MBTI를 선택해주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>모르시면 건너뛰어도 돼요</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {MBTI_LIST.map(m => (
                  <button key={m} style={{ border: `1px solid ${mbti === m ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer', background: mbti === m ? 'rgba(201,168,76,0.1)' : 'transparent', color: mbti === m ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontWeight: mbti === m ? 600 : 400 }} onClick={() => setMbti(mbti === m ? '' : m)}>{m}</button>
                ))}
              </div>
            </>
          )}
          {currentStepId === 'blood' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6, fontFamily: 'var(--font-display)' }}>혈액형을 선택해주세요</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>선택하지 않아도 분석은 가능해요</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {BLOOD_LIST.map(b => (
                  <button key={b} style={{ border: `1px solid ${blood === b ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer', background: blood === b ? 'rgba(201,168,76,0.1)' : 'transparent', color: blood === b ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontWeight: blood === b ? 600 : 400 }} onClick={() => setBlood(blood === b ? '' : b)}>{b}형</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 하단 버튼 */}
        <div style={{ position: 'fixed', bottom: 0, background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.15)', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box' }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 15, cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }} onClick={goBack}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 600, background: !canGoNext() ? 'rgba(201,168,76,0.2)' : '#C9A84C', color: !canGoNext() ? 'rgba(255,255,255,0.3)' : '#0A1628', border: 'none', borderRadius: 10, cursor: !canGoNext() ? 'not-allowed' : 'pointer', letterSpacing: '0.03em' }} onClick={goNext} disabled={!canGoNext()}>
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

    return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
       <div id="result-content" style={{ maxWidth: 480, margin: '0 auto', padding: '12px 16px 40px', boxSizing: 'border-box', width: '100%' }}>

    {/* 사주팔자 카드 */}
{sajuData?.사주 && (
  <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
    <p style={{ fontSize: 11, fontWeight: 600, color: '#C9A84C', marginBottom: 12, letterSpacing: '0.1em' }}>나의 사주팔자</p>
    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10, textAlign: 'center' }}>{sajuData.생년월일}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {[
        { label: '시주(時)', value: sajuData.사주.시주 },
        { label: '일주(日)', value: sajuData.사주.일주 },
        { label: '월주(月)', value: sajuData.사주.월주 },
        { label: '년주(年)', value: sajuData.사주.년주 },
      ].map(({ label, value }) => {
        const 오행색 = {
          '甲갑': '#4ADE80', '乙을': '#4ADE80',
          '丙병': '#F87171', '丁정': '#F87171',
          '戊무': '#C9A84C', '己기': '#C9A84C',
          '庚경': '#E8C96A', '辛신': '#E8C96A',
          '壬임': '#60A5FA', '癸계': '#60A5FA',
        }
        const 천간 = value?.slice(0, 2)
        const 색 = 오행색[천간] || '#FFFFFF'
        return (
          <div key={label} style={{ textAlign: 'center', background: `${색}12`, borderRadius: 8, padding: '10px 4px', border: `1px solid ${색}40` }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, display: 'block' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 색, lineHeight: 1.6 }}>{value || '-'}</span>
          </div>
        )
      })}
    </div>
  </div>
)}

          {/* 스트리밍 */}
          {isBaseStreaming && baseText && (
            <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '16px 18px', marginBottom: 8, fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{removeMarkers(baseText)}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}

          {/* 무료 결과 아코디언 */}
          {!isBaseStreaming && baseSections.filter(sec => !sec.title.includes('행운미리보기')).map((sec, i) => (
            <Accordion key={i} title={sec.title} content={sec.content} defaultOpen={i === 0} />
          ))}

          {/* 행운 미리보기 */}
          {!isBaseStreaming && !paidSections.length && (() => {
            const luckySec = baseSections.find(sec => sec.title.includes('행운미리보기'))
            const colorMatch = luckySec?.content?.match(/색깔[:\s]+([^\n]+)/)
            const color = colorMatch?.[1]?.trim()
            if (!color) return null
            return (
              <div style={{ background: 'linear-gradient(135deg, #0D1B3E, #1B2A4A)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 12, padding: '20px', marginBottom: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#C9A84C', marginBottom: 12, fontFamily: 'var(--font-display)' }}>나의 행운 아이템</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(201,168,76,0.15)' }}>
                    <span style={{ fontSize: 10, color: '#C9A84C', fontWeight: 600, marginBottom: 3, display: 'block' }}>행운 색깔</span>
                    <span style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 500 }}>{color}</span>
                  </div>
                  {[['마스코트'],['행운 방향'],['행운 숫자']].map(([label]) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(201,168,76,0.15)', position: 'relative' }}>
                      <span style={{ fontSize: 10, color: '#C9A84C', fontWeight: 600, marginBottom: 3, display: 'block' }}>{label}</span>
                      <div style={{ height: 16, background: 'rgba(201,168,76,0.1)', borderRadius: 4, marginTop: 2 }} />
                      <span style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 12 }}>🔒</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)', textAlign: 'center', marginTop: 12, fontWeight: 600 }}>🔒 마스코트·방향·숫자는 전체 분석에서 확인하세요</p>
              </div>
            )
          })()}

          {/* 유료 스트리밍 */}
          {isPaidStreaming && paidText && (
            <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '16px 18px', marginBottom: 8, fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{removeMarkers(paidText)}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}

          {/* 유료 결과 */}
          {!isPaidStreaming && paidSections.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C', textAlign: 'center', margin: '16px 0 8px', letterSpacing: '0.08em' }}>✦ 전체 분석 결과 ✦</p>
              {paidSections.map((sec, i) => (
                <Accordion key={i} title={sec.title} content={sec.content} isPaid={true} defaultOpen={i === 0} />
              ))}
            </>
          )}

          {/* 결제 배너 */}
          {phase === 'done' && !isPaid && !isPaidStreaming && (
            <div style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #050D1F 100%)', borderRadius: 12, padding: '28px 20px', marginBottom: 12, textAlign: 'center', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 16 }}>FULL ANALYSIS</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 16, fontFamily: 'var(--font-display)', wordBreak: 'keep-all' }}>
                {serviceType === 'child' ? '아이의 타고난 운명을 전부 확인하세요' : serviceType === '노후' ? '당신의 노후를 미리 준비하세요' : '내 사주의 모든 것을 확인하세요'}
              </p>
              <div style={{ textAlign: 'left', marginBottom: 20 }}>
                {(serviceType === 'child' ? [
                  '타고난 기질 · 성격 심층 분석',
                  '학습 스타일 · 공부가 잘 되는 환경',
                  '재능의 씨앗 · 빛나는 분야',
                  '진로 방향 · 어울리는 직업군',
                  '부모와의 관계 · 키우는 법',
                  '아이가 힘든 순간 · 극복법',
                  '이 사주로 잘 크는 법',
                ] : serviceType === '노후' ? [
                  '노후 재물 심화 분석',
                  '건강 심화 분석',
                  '황혼 인연 심화',
                  '노후 투자 · 부동산',
                  '인간관계 · 사람운',
                  '월별 운세 12개월',
                  '노후를 빛나게 하는 법',
                ] : [
                  '인생 재운 흐름 (20대~말년)',
                  '직업운 · 커리어 방향',
                  '투자 · 부동산 전략',
                  '인간관계 · 사람운',
                  '월별 운세 12개월',
                  '행운 아이템 전체',
                  '이 사주로 잘 사는 법',
                ]).map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ color: '#C9A84C', fontWeight: 700, fontSize: 12 }}>✦</span>
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, color: '#C9A84C', marginBottom: 4, fontFamily: 'var(--font-display)' }}>1,900원</div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>결제 후 즉시 사용 가능</p>
           
              <button style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700, background: '#C9A84C', color: '#0A1628', border: 'none', borderRadius: 10, cursor: 'pointer', letterSpacing: '0.03em' }} onClick={() => {
     if (IS_ADMIN) { handlePaidAnalyze(); return; }
              const IMP = window.IMP
IMP.init('imp87662575')
IMP.request_pay({
  pg: 'html5_inicis',
  pay_method: 'card',
  merchant_uid: `saju_${Date.now()}`,
  name: '마이사주 전체 분석',
  amount: 1900,
  buyer_name: myName || '고객',
}, (rsp) => {
  if (rsp.success) handlePaidAnalyze()
  else alert('결제가 취소되었습니다.')
})
              }}>
                지금 전체 분석 받기 →
              </button>
              <button style={{ width: '100%', padding: '12px', fontSize: 13, background: 'none', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.3)', marginTop: 8 }} onClick={handlePaidAnalyze}>
  결과 미리보기 (테스트용)
</button>
            </div>
          )}

          {/* 로딩 */}
          {isPaidStreaming && (
            <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '24px 20px', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 0' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>전체 사주를 분석하고 있어요...</span>
              </div>
            </div>
          )}
         <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '14px 16px', marginTop: 10 }}>
  <p style={{ fontSize: 13, color: '#C9A84C', fontWeight: 600, marginBottom: 6 }}>📄 PDF 저장 전에 확인해주세요!</p>
  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>각 항목을 모두 펼친 후 저장하면 전체 내용이 PDF에 담겨요. 지금 접혀있는 항목은 저장되지 않아요.</p>
</div>
         <button style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 600, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10, cursor: 'pointer', color: '#C9A84C', marginTop: 10 }} onClick={() => {
  window.scrollTo(0, 0)
const element = document.getElementById('result-content')
  const opt = {
    margin: 10,
    filename: '마이사주_분석결과.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, backgroundColor: '#050D1F', useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }
  window.html2pdf().set(opt).from(element).save()
}}>📄 결과 저장하기 (PDF)</button>
<p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 6 }}>결과는 저장되지 않아요. PDF로 저장해두세요!</p>
<button style={{ width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.3)', marginTop: 8 }} onClick={handleRestart}>처음으로 돌아가기</button>
        </div>
      </div>
    )
  }
// ── 이용약관 ──
if (screen === 'terms') return (
  <div style={{ minHeight: '100vh', background: '#050D1F', padding: '40px 20px 80px' }}>
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 24, fontFamily: 'var(--font-display)' }}>이용약관</h1>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 2.2 }}>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>제1조 (목적)</p>
        <p style={{ marginBottom: 20 }}>본 약관은 봄결(이하 "회사")이 운영하는 mysaju.shop(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>제2조 (서비스 내용)</p>
        <p style={{ marginBottom: 20 }}>회사는 사주 분석, 궁합, 길일 추천 등 사주명리학 기반의 디지털 콘텐츠 서비스를 제공합니다. 본 서비스는 참고용 정보 제공을 목적으로 하며, 전문적인 상담을 대체하지 않습니다.</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>제3조 (이용 요금)</p>
        <p style={{ marginBottom: 20 }}>서비스 이용 요금은 각 서비스 화면에 표시된 금액을 따릅니다. 결제는 카카오페이, 신용카드 등 제공되는 결제 수단을 통해 이루어집니다.</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>제4조 (지적재산권)</p>
        <p style={{ marginBottom: 20 }}>서비스에서 제공되는 모든 콘텐츠의 저작권은 회사에 있으며, 이용자는 서비스를 통해 얻은 정보를 회사의 사전 허락 없이 복제, 배포, 상업적으로 이용할 수 없습니다.</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>제5조 (면책)</p>
        <p style={{ marginBottom: 20 }}>본 서비스는 사주명리학을 기반으로 한 참고용 콘텐츠이며, 회사는 분석 결과의 정확성에 대해 법적 책임을 지지 않습니다.</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>제6조 (준거법)</p>
        <p style={{ marginBottom: 20 }}>본 약관은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 관할 법원은 회사 소재지 관할 법원으로 합니다.</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 32 }}>시행일: 2026년 5월 26일 | 상호: 봄결 | 대표: 손영주</p>
      </div>
    </div>
  </div>
)

// ── 개인정보처리방침 ──
if (screen === 'privacy') return (
  <div style={{ minHeight: '100vh', background: '#050D1F', padding: '40px 20px 80px' }}>
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 24, fontFamily: 'var(--font-display)' }}>개인정보처리방침</h1>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 2.2 }}>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>1. 수집하는 개인정보 항목</p>
        <p style={{ marginBottom: 20 }}>서비스 이용 시 수집되는 정보: 이름(선택), 생년월일, 성별, 결제 정보(결제대행사를 통해 처리되며 회사는 카드번호 등을 저장하지 않습니다), 서비스 이용 기록</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>2. 개인정보 수집 및 이용 목적</p>
        <p style={{ marginBottom: 20 }}>사주 분석 서비스 제공, 결제 처리, 서비스 품질 향상</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>3. 개인정보 보유 및 이용기간</p>
        <p style={{ marginBottom: 20 }}>서비스 이용 종료 시 또는 이용자 요청 시 지체 없이 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>4. 개인정보 제3자 제공</p>
        <p style={{ marginBottom: 20 }}>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 결제 처리를 위해 포트원(PortOne)을 통한 결제대행사에 최소한의 정보가 제공됩니다.</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>5. 이용자의 권리</p>
        <p style={{ marginBottom: 20 }}>이용자는 언제든지 개인정보 열람, 수정, 삭제를 요청할 수 있습니다. 문의: redions77@naver.com</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>6. 개인정보 보호책임자</p>
        <p style={{ marginBottom: 20 }}>성명: 손영주 | 이메일: redions77@naver.com | 전화: 010-9772-1987</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 32 }}>시행일: 2026년 5월 26일 | 상호: 봄결</p>
      </div>
    </div>
  </div>
)

// ── 환불정책 ──
if (screen === 'refund') return (
  <div style={{ minHeight: '100vh', background: '#050D1F', padding: '40px 20px 80px' }}>
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 24, fontFamily: 'var(--font-display)' }}>환불정책</h1>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 2.2 }}>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>디지털 콘텐츠 특성상 환불 정책</p>
        <p style={{ marginBottom: 20 }}>본 서비스는 결제 즉시 제공되는 디지털 콘텐츠입니다. 콘텐츠가 제공된 이후에는 「콘텐츠산업 진흥법」 및 「전자상거래법」에 따라 원칙적으로 환불이 제한됩니다.</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>환불 가능한 경우</p>
        <p style={{ marginBottom: 8 }}>• 결제 후 콘텐츠가 정상적으로 제공되지 않은 경우</p>
        <p style={{ marginBottom: 8 }}>• 서비스 오류로 인해 분석 결과를 확인하지 못한 경우</p>
        <p style={{ marginBottom: 20 }}>• 결제 후 콘텐츠 확인 전 취소 요청한 경우 (결제 당일에 한함)</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>환불 불가한 경우</p>
        <p style={{ marginBottom: 8 }}>• 분석 결과를 이미 확인한 경우</p>
        <p style={{ marginBottom: 20 }}>• 단순 변심에 의한 취소</p>
        <p style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>환불 신청 방법</p>
        <p style={{ marginBottom: 20 }}>이메일(redions77@naver.com) 또는 전화(010-9772-1987)로 문의해 주세요. 영업일 기준 1~3일 내 처리됩니다.</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 32 }}>시행일: 2026년 5월 26일 | 상호: 봄결 | 대표: 손영주</p>
      </div>
    </div>
  </div>
)
  return null
}
