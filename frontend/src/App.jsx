import { useEffect, useState, useRef } from 'react'

const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']
const STEPS = ['gender', 'maritalStatus', 'birthdate', 'birthtime', 'mbti', 'blood']

const MARITAL_OPTIONS = [
  { value: '미혼', emoji: '💫', label: '미혼', sub: '아직 결혼 전이에요' },
  { value: '기혼', emoji: '💍', label: '기혼', sub: '결혼해서 살고 있어요' },
  { value: '돌싱', emoji: '🌱', label: '돌싱', sub: '이혼 후 혼자예요' },
  { value: '돌싱2+', emoji: '🔥', label: '돌싱2+', sub: '이혼을 두 번 이상 했어요' },
]

// 가족 세트 가격
const PRICES = {
  individual: 1990,
  member: 1500,   // 2번째 가족부터 1인당 추가
  getTotal: (count) => count === 1 ? 1990 : 1990 + (count - 1) * 1500,
  getOriginal: (count) => count * 1990,
  getSaving: (count) => count * 1990 - (count === 1 ? 1990 : 1990 + (count - 1) * 1500),
}

function parseSections(text) {
  const sections = []
  const parts = text.split(/===(.+?)===/)
  for (let i = 1; i < parts.length; i += 2) {
    sections.push({ title: parts[i].trim(), content: parts[i + 1]?.trim() || '' })
  }
  return sections
}

const API_URL = 'https://love-fortune.onrender.com'

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
  sajuCard: { background: '#F8F5FF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 12 },
  sajuTitle: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 12, letterSpacing: '0.05em' },
  sajuTable: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  sajuCell: { textAlign: 'center', background: 'white', borderRadius: 8, padding: '10px 4px', border: '1px solid var(--color-border)' },
  sajuCellLabel: { fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' },
  sajuCellValue: { fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.6 },
  // 스트리밍 결과 카드
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
  // 가격 선택 카드
  priceCard: { background: 'var(--color-surface)', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12, cursor: 'pointer', transition: 'all 0.2s' },
  priceCardSelected: { background: 'var(--color-primary-light)', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12, cursor: 'pointer' },
  // 가족 멤버 입력
  memberCard: { background: '#F8F5FF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: 10 },
  memberRole: { fontSize: 13, fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: 10 },
  // 자녀 학운
  childAccordion: { marginBottom: 8, border: '2px solid #059669', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  childAccordionHeader: (open) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', cursor: 'pointer', background: open ? '#ECFDF5' : 'var(--color-surface)', transition: 'all 0.2s',
  }),
  childTimeBtn: (active) => ({
    padding: '10px 4px', fontSize: 14,
    border: `1px solid ${active ? '#059669' : '#6EE7B7'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? '#059669' : 'white',
    color: active ? 'white' : '#047857',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
  }),
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

// 가족 멤버 입력 컴포넌트
function MemberInput({ role, value, onChange }) {
  return (
    <div style={s.memberCard}>
      <p style={s.memberRole}>{role}</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input style={{ ...s.dateNumInput, width: 80 }} type="number" inputMode="numeric" placeholder="년도"
          value={value.year} onChange={e => onChange({ ...value, year: e.target.value.slice(0, 4) })} />
        <span style={s.dateUnitLabel}>년</span>
        <input style={s.dateNumInputSmall} type="number" inputMode="numeric" placeholder="월"
          value={value.month} onChange={e => onChange({ ...value, month: e.target.value.slice(0, 2) })} />
        <span style={s.dateUnitLabel}>월</span>
        <input style={s.dateNumInputSmall} type="number" inputMode="numeric" placeholder="일"
          value={value.day} onChange={e => onChange({ ...value, day: e.target.value.slice(0, 2) })} />
        <span style={s.dateUnitLabel}>일</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {['여성','남성'].map(g => (
          <button key={g} style={{
            flex: 1, padding: '8px', fontSize: 13,
            border: `1px solid ${value.gender === g ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            background: value.gender === g ? 'var(--color-primary-light)' : 'var(--color-surface)',
            color: value.gender === g ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
            cursor: 'pointer', fontWeight: value.gender === g ? 600 : 400,
          }} onClick={() => onChange({ ...value, gender: g })}>{g}</button>
        ))}
      </div>
      {/* 시간 입력 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button style={{
          padding: '7px 12px', fontSize: 12,
          border: `1px solid ${value.timeUnknown ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          background: value.timeUnknown ? 'var(--color-primary-light)' : 'var(--color-surface)',
          color: value.timeUnknown ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }} onClick={() => onChange({ ...value, timeUnknown: true, timeHour: '', timeMin: '' })}>
          시간 모름
        </button>
        {['오전','오후'].map(ap => (
          <button key={ap} style={{
            padding: '7px 10px', fontSize: 12,
            border: `1px solid ${!value.timeUnknown && value.timeAmPm === ap ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            background: !value.timeUnknown && value.timeAmPm === ap ? 'var(--color-primary-light)' : 'var(--color-surface)',
            color: !value.timeUnknown && value.timeAmPm === ap ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
            cursor: 'pointer',
          }} onClick={() => onChange({ ...value, timeAmPm: ap, timeUnknown: false })}>{ap}</button>
        ))}
        <select style={{
          flex: 1, padding: '7px', fontSize: 12, border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', background: 'var(--color-surface)',
          color: 'var(--color-text)', cursor: 'pointer',
        }} value={value.timeHour} onChange={e => onChange({ ...value, timeHour: e.target.value, timeUnknown: false })}
          disabled={value.timeUnknown}>
          <option value="">시</option>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => <option key={h} value={String(h)}>{h}시</option>)}
        </select>
        <select style={{
          flex: 1, padding: '7px', fontSize: 12, border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', background: 'var(--color-surface)',
          color: 'var(--color-text)', cursor: 'pointer',
        }} value={value.timeMin} onChange={e => onChange({ ...value, timeMin: e.target.value, timeUnknown: false })}
          disabled={value.timeUnknown}>
          <option value="">분</option>
          {['00','10','20','30','40','50'].map(m => <option key={m} value={m}>{m}분</option>)}
        </select>
      </div>
    </div>
  )
}

const emptyMember = () => ({ year: '', month: '', day: '', gender: '', timeHour: '', timeMin: '', timeAmPm: '오전', timeUnknown: false })
const memberValid = (m) => m.year.length === 4 && Number(m.month) >= 1 && Number(m.month) <= 12 && Number(m.day) >= 1 && m.gender !== '' && (m.timeUnknown || (m.timeHour !== '' && m.timeMin !== ''))
const memberBirthtime = (m) => {
  if (m.timeUnknown || !m.timeHour || !m.timeMin) return ''
  let h = Number(m.timeHour)
  if (m.timeAmPm === '오전' && h === 12) h = 0
  if (m.timeAmPm === '오후' && h !== 12) h += 12
  return `${String(h).padStart(2,'0')}:${String(m.timeMin).padStart(2,'0')}`
}

export default function App() {
  // Render 콜드스타트 방지 — 30초마다 ping
  useEffect(() => {
    const ping = () => fetch(`${API_URL}/ping`).catch(() => {})
    ping()
    const id = setInterval(ping, 30000)
    return () => clearInterval(id)
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

  // 결과 상태
  const [phase, setPhase] = useState('input') // input | streaming | done
  const [sajuData, setSajuData] = useState(null)
  const [baseText, setBaseText] = useState('')       // 무료 스트리밍 텍스트
  const [paidText, setPaidText] = useState('')       // 유료 스트리밍 텍스트
  const [isPaidStreaming, setIsPaidStreaming] = useState(false)
  const [isBaseStreaming, setIsBaseStreaming] = useState(false)

  // 가족 세트
  const [showPriceSelect, setShowPriceSelect] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null) // null | 1 | 2 | 3 | 4
  const [extraMembers, setExtraMembers] = useState([]) // 추가 가족 멤버
  const [memberResults, setMemberResults] = useState([]) // 각 멤버 결과

  const abortRef = useRef(null)

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
    return `${String(h).padStart(2,'0')}:${String(timeMin).padStart(2,'0')}`
  })()
  const birthtimeValid = timeUnknown || (timeHour !== '' && timeMin !== '')

  function canGoNext() {
    if (currentStepId === 'gender') return gender !== ''
    if (currentStepId === 'maritalStatus') return maritalStatus !== ''
    if (currentStepId === 'birthdate') return birthdateValid
    if (currentStepId === 'birthtime') return birthtimeValid
    return true
  }

  function goNext() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleFreeAnalyze()
  }
  function goBack() { if (step > 0) setStep(s => s - 1) }

  // SSE 스트리밍 수신
  async function streamAnalyze({ body, onBase, onPaidStart, onPaid, onSaju, onDone, onError }) {
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const res = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'saju') onSaju?.(json)
          else if (json.type === 'paid_start') onPaidStart?.()
          else if (json.type === 'done') onDone?.()
          else if (json.error) onError?.(json.error)
          else if (json.text) {
            // paid_start 이후면 유료 텍스트, 아니면 무료
            onBase?.(json.text)
          }
        } catch {}
      }
    }
  }

  async function handleFreeAnalyze() {
    setPhase('streaming')
    setBaseText(''); setPaidText(''); setSajuData(null)
    setIsBaseStreaming(true)

    let isPaid = false
    try {
      await streamAnalyze({
        body: { gender, maritalStatus, birthdate, birthtime, mbti, blood, type: '기본', isPaid: false, isLunar },
        onSaju: (d) => setSajuData(d),
        onBase: (t) => setBaseText(prev => prev + t),
        onDone: () => { setIsBaseStreaming(false); setPhase('done') },
        onError: (e) => { alert(e); setPhase('input') },
      })
    } catch (e) {
      if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.')
      setPhase('input')
    }
    setIsBaseStreaming(false)
  }

  async function handlePaidAnalyze(plan) {
    setSelectedPlan(plan)
    setShowPriceSelect(false)
    setPaidText(''); setIsPaidStreaming(true)

    // 추가 멤버 수 = plan - 1
    const addCount = plan - 1
    const membersToAnalyze = extraMembers.slice(0, addCount)

    try {
      // 본인 유료 분석
      let localBase = baseText
      let localPaid = ''
      let isPaidSection = false

      await streamAnalyze({
        body: { gender, maritalStatus, birthdate, birthtime, mbti, blood, type: '전체', isPaid: true, isLunar },
        onSaju: () => {},
        onBase: (t) => {
          if (!isPaidSection) setBaseText(prev => prev + t)
          else { localPaid += t; setPaidText(prev => prev + t) }
        },
        onPaidStart: () => { isPaidSection = true },
        onDone: () => {},
        onError: (e) => alert(e),
      })

      // 추가 가족 분석
      const results = []
      for (const member of membersToAnalyze) {
        let memberText = ''
        const isChild = member.role?.includes('자녀')
        await streamAnalyze({
          body: {
            gender, birthdate, birthtime,
            childBirthdate: `${member.year}-${String(member.month).padStart(2,'0')}-${String(member.day).padStart(2,'0')}`,
            childGender: member.gender,
            childBirthtime: memberBirthtime(member),
            type: isChild ? '자녀학운' : '전체',
            isPaid: true,
            gender: member.gender,
            birthdate: `${member.year}-${String(member.month).padStart(2,'0')}-${String(member.day).padStart(2,'0')}`,
            birthtime: memberBirthtime(member),
            maritalStatus: isChild ? undefined : member.maritalStatus,
          },
          onSaju: () => {},
          onBase: (t) => { memberText += t },
          onDone: () => results.push({ role: member.role, text: memberText }),
          onError: (e) => alert(e),
        })
      }
      setMemberResults(results)

    } catch (e) {
      if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.')
    }
    setIsPaidStreaming(false)
  }

  function handleRestart() {
    abortRef.current?.abort()
    setStep(0); setGender(''); setMaritalStatus('')
    setBirthYear(''); setBirthMonth(''); setBirthDay(''); setIsLunar(false)
    setTimeHour(''); setTimeMin(''); setTimeAmPm('오전'); setTimeUnknown(false)
    setMbti(''); setBlood('')
    setPhase('input'); setSajuData(null)
    setBaseText(''); setPaidText('')
    setShowPriceSelect(false); setSelectedPlan(null)
    setExtraMembers([]); setMemberResults([])
    setIsBaseStreaming(false); setIsPaidStreaming(false)
  }

  // 결과 화면
  if (phase === 'streaming' || phase === 'done') {
    const baseSections = parseSections(baseText)
    const paidSections = parseSections(paidText)

    // 행운아이템 파싱
    let 행운아이템 = null
    const luckyMatch = paidText.match(/===행운 아이템===([\s\S]*?)(?====|$)/)
    if (luckyMatch) {
      const t = luckyMatch[1]
      행운아이템 = {
        색깔: t.match(/색깔[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
        마스코트: t.match(/마스코트[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
        방향: t.match(/방향[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
        숫자: t.match(/숫자[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
        아이템: t.match(/아이템[:\s]+([^\n/]+)/)?.[1]?.trim() || '',
      }
    }

    return (
      <div style={s.app}>
        <div style={s.header}>
          <span style={s.heroEmoji}>✨</span>
          <h1 style={s.heroTitle}>내가 왜 이렇게 사나 했더니 사주 때문이었다</h1>
          <p style={s.heroSub}>사주로 보는 돈복·연애운·결혼운</p>
        </div>
        <div style={s.resultWrap}>

          {/* 사주팔자 카드 */}
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

          {/* 무료 결과 — 스트리밍 중이면 실시간 텍스트, 완료 후 아코디언 */}
          {isBaseStreaming && baseText && (
            <div style={s.streamCard}>{baseText}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}
          {!isBaseStreaming && baseSections.map((sec, i) => (
            <Accordion key={i} title={sec.title} content={sec.content} defaultOpen={i === 0} />
          ))}

          {/* 유료 스트리밍 중 */}
          {isPaidStreaming && paidText && (
            <div style={s.streamCard}>{paidText}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}

          {/* 유료 완료 결과 */}
          {!isPaidStreaming && paidSections.length > 0 && (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textAlign: 'center', margin: '16px 0 8px' }}>
                ⭐ 전체 분석 결과
              </p>
              {paidSections.map((sec, i) => (
                <Accordion key={i} title={sec.title} content={sec.content} isPaid={true} defaultOpen={i === 0} />
              ))}
              {행운아이템 && (
                <div style={s.luckyCard}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>🍀 나의 행운 아이템</p>
                  <div style={s.luckyGrid}>
                    <div style={s.luckyItem}><span style={s.luckyItemLabel}>🎨 행운 색깔</span><span style={s.luckyItemValue}>{행운아이템.색깔}</span></div>
                    <div style={s.luckyItem}><span style={s.luckyItemLabel}>🐾 마스코트</span><span style={s.luckyItemValue}>{행운아이템.마스코트}</span></div>
                    <div style={s.luckyItem}><span style={s.luckyItemLabel}>🧭 행운 방향</span><span style={s.luckyItemValue}>{행운아이템.방향}</span></div>
                    <div style={s.luckyItem}><span style={s.luckyItemLabel}>🔢 행운 숫자</span><span style={s.luckyItemValue}>{행운아이템.숫자}</span></div>
                    <div style={{ ...s.luckyItem, gridColumn: '1 / -1' }}><span style={s.luckyItemLabel}>🛍️ 추천 아이템</span><span style={s.luckyItemValue}>{행운아이템.아이템}</span></div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 가족 추가 결과 */}
          {memberResults.map((mr, i) => (
            <div key={i}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#059669', textAlign: 'center', margin: '20px 0 8px' }}>
                👨‍👩‍👧 {mr.role} 분석 결과
              </p>
              {parseSections(mr.text).map((sec, j) => (
                <Accordion key={j} title={sec.title} content={sec.content} isChild={true} defaultOpen={j === 0} />
              ))}
            </div>
          ))}

          {/* 가격 선택 — 무료 완료 & 유료 미구매 */}
          {phase === 'done' && !selectedPlan && !isPaidStreaming && (
            <>
              {!showPriceSelect ? (
                <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 'var(--radius-md)', padding: '24px 20px', marginBottom: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 6 }}>🔮 전체 분석 받기</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 16, lineHeight: 1.6 }}>
                    직업운 · 투자 · 부동산 · 인간관계 · 월별운세<br/>오프라인 7만원짜리를 단돈 1,990원에
                  </p>
                  <button style={{ width: '100%', padding: '16px', fontSize: 18, fontWeight: 700, background: 'white', color: '#764ba2', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                    onClick={() => setShowPriceSelect(true)}>
                    나 + 가족 분석받기 →
                  </button>
                </div>
              ) : (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>👨‍👩‍👧‍👦 몇 명 분석할까요?</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>2번째 가족부터 1인당 1,500원 추가</p>

                  {[1, 2, 3, 4].map(n => {
                    const total = PRICES.getTotal(n)
                    const original = PRICES.getOriginal(n)
                    const saving = PRICES.getSaving(n)
                    const labels = ['나 혼자', '나 + 1명 (배우자·자녀)', '나 + 2명 (가족 3인)', '나 + 3명 (가족 4인)']
                    const emojis = ['👤', '👫', '👨‍👩‍👦', '👨‍👩‍👧‍👦']
                    return (
                      <button key={n} style={{
                        width: '100%', padding: '14px 16px', marginBottom: 8, textAlign: 'left',
                        border: `2px solid ${n === 2 ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: n === 2 ? 'var(--color-primary-light)' : 'var(--color-surface)',
                        cursor: 'pointer', position: 'relative',
                      }} onClick={() => {
                        if (n > 1) {
                          const roles = ['배우자·자녀1', '배우자·자녀2', '자녀3']
                          setExtraMembers(Array.from({ length: n - 1 }, (_, i) => ({ ...emptyMember(), role: roles[i] })))
                        }
                        if (n === 1) handlePaidAnalyze(1)
                        else setSelectedPlan(-n) // 음수 = 멤버 입력 대기
                      }}>
                        <span style={{ fontSize: 20, marginRight: 8 }}>{emojis[n-1]}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{labels[n-1]}</span>
                        <span style={{ float: 'right' }}>
                          {saving > 0 && <span style={{ fontSize: 11, color: '#059669', marginRight: 6 }}>({original.toLocaleString()}원 → )</span>}
                          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary-dark)' }}>{total.toLocaleString()}원</span>
                        </span>
                        {n === 2 && <span style={{ position: 'absolute', top: -8, right: 12, background: 'var(--color-primary)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>인기</span>}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 가족 멤버 정보 입력 */}
              {selectedPlan < 0 && (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>가족 정보를 입력해주세요</p>
                  {extraMembers.map((m, i) => (
                    <MemberInput key={i} role={m.role || `가족 ${i+1}`} value={m}
                      onChange={v => setExtraMembers(prev => prev.map((p, pi) => pi === i ? v : p))} />
                  ))}
                  <button style={{
                    width: '100%', padding: '14px', fontSize: 16, fontWeight: 700,
                    background: extraMembers.every(memberValid) ? 'var(--color-primary)' : '#D4C8F5',
                    color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
                    cursor: extraMembers.every(memberValid) ? 'pointer' : 'not-allowed',
                  }}
                    disabled={!extraMembers.every(memberValid)}
                    onClick={() => {
                      const n = -selectedPlan
                      if (window.confirm(`${PRICES.getTotal(n).toLocaleString()}원 결제 후 분석을 받으시겠어요?\n(현재 테스트 중 - 결제 없이 바로 확인)`)) {
                        handlePaidAnalyze(n)
                      }
                    }}>
                    {PRICES.getTotal(-selectedPlan).toLocaleString()}원으로 전체 분석받기 →
                  </button>
                </div>
              )}
            </>
          )}

          {isPaidStreaming && (
            <div style={s.loadingCard}>
              <div style={s.loading}>
                {[0,1,2].map(i => <div key={i} style={s.dot(i)} />)}
                <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                  🔮 전체 사주를 분석하고 있어요...
                </span>
              </div>
            </div>
          )}

          <button style={s.restartBtn} onClick={handleRestart}>처음으로 돌아가기</button>
        </div>
      </div>
    )
  }

  // 입력 스텝 화면
  return (
    <div style={s.app}>
      <div style={s.header}>
        <span style={s.heroEmoji}>✨</span>
        <h1 style={s.heroTitle}>내가 왜 이렇게 사나 했더니 사주 때문이었다</h1>
        <p style={s.heroSub}>오프라인 7만원짜리 사주를 단돈 1,990원에</p>
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
