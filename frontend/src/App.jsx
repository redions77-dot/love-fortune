import { useEffect, useState, useRef } from 'react'

// ── 상수 ──────────────────────────────────────────────
const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']
const STEPS = ['gender', 'maritalStatus', 'birthdate', 'birthtime', 'mbti', 'blood']
const API_URL = 'https://love-fortune.onrender.com'

const MARITAL_OPTIONS = [
  { value: '미혼', emoji: '💫', label: '미혼', sub: '아직 결혼 전이에요' },
  { value: '기혼', emoji: '💍', label: '기혼', sub: '결혼해서 살고 있어요' },
  { value: '돌싱', emoji: '🌱', label: '돌싱', sub: '이혼 후 혼자예요' },
  { value: '돌싱2+', emoji: '🔥', label: '돌싱2+', sub: '이혼을 두 번 이상 했어요' },
]

// 가격 설정
const PRICE = {
  original: 9900,
  sale: 3900,
  extra: 1900, // 가족 추가 1인당
  gunghab: 1900,
}

function parseSections(text) {
  const sections = []
  const parts = text.split(/===(.+?)===/)
  for (let i = 1; i < parts.length; i += 2) {
    sections.push({ title: parts[i].trim(), content: parts[i + 1]?.trim() || '' })
  }
  return sections
}

// 자정까지 남은 시간 계산
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

// ── 스타일 ────────────────────────────────────────────
const s = {
  app: { minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' },

  // 랜딩
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

  // 타이머 배너
  timerBanner: {
    background: 'linear-gradient(90deg, #7C3AED, #DB2777)',
    color: 'white', textAlign: 'center', padding: '10px 16px',
    fontSize: 13, fontWeight: 600,
  },
  timerNum: { fontSize: 16, fontWeight: 800, letterSpacing: 2, marginLeft: 8 },

  // 카드 그리드
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

  // 무료 배지
  freeBadge: {
    display: 'inline-block', background: '#10B981', color: 'white',
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginBottom: 6,
  },

  // 입력 스텝
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

  // 결과
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

  // 가족 멤버 입력
  memberCard: { background: '#F8F5FF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: 10 },
  memberRole: { fontSize: 13, fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: 10 },

  // 결제 배너
  payBanner: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 'var(--radius-md)', padding: '24px 20px', marginBottom: 12, textAlign: 'center',
  },
  payOriginal: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'line-through', marginBottom: 2 },
  payPrice: { fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 4 },
  payDiscount: { fontSize: 12, color: '#FDE68A', marginBottom: 16 },
  payBtn: {
    width: '100%', padding: '16px', fontSize: 17, fontWeight: 700,
    background: 'white', color: '#764ba2', border: 'none',
    borderRadius: 'var(--radius-md)', cursor: 'pointer',
  },

  // 가족 결제 선택
  familyOption: (selected) => ({
    width: '100%', padding: '14px 16px', marginBottom: 8, textAlign: 'left',
    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    background: selected ? 'var(--color-primary-light)' : 'var(--color-surface)',
    cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }),

  // 궁합
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

// 서비스 카드 색상
const CARD_COLORS = {
  saju:    { bg: '#F8F5FF', border: '#DDD6FE', text: '#4C1D95', accent: '#7C3AED' },
  gunghab: { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239', accent: '#E11D48' },
  family:  { bg: '#F0FDF4', border: '#BBF7D0', text: '#14532D', accent: '#059669' },
  child:   { bg: '#FFF7ED', border: '#FED7AA', text: '#7C2D12', accent: '#EA580C' },
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

// 가족 멤버 입력 컴포넌트
function MemberInput({ role, value, onChange }) {
  return (
    <div style={s.memberCard}>
      <p style={s.memberRole}>{role}</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[{ label: '양력 🌞', val: false }, { label: '음력 🌙', val: true }].map(({ label, val }) => (
          <button key={label} style={{
            flex: 1, padding: '7px', fontSize: 12,
            border: `1px solid ${value.isLunar === val ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            background: value.isLunar === val ? 'var(--color-primary-light)' : 'var(--color-surface)',
            color: value.isLunar === val ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
            cursor: 'pointer',
          }} onClick={() => onChange({ ...value, isLunar: val })}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
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
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button style={{
          padding: '7px 10px', fontSize: 11,
          border: `1px solid ${value.timeUnknown ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          background: value.timeUnknown ? 'var(--color-primary-light)' : 'var(--color-surface)',
          color: value.timeUnknown ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }} onClick={() => onChange({ ...value, timeUnknown: true, timeHour: '', timeMin: '' })}>시간 모름</button>
        {['오전','오후'].map(ap => (
          <button key={ap} style={{
            padding: '7px 8px', fontSize: 11,
            border: `1px solid ${!value.timeUnknown && value.timeAmPm === ap ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            background: !value.timeUnknown && value.timeAmPm === ap ? 'var(--color-primary-light)' : 'var(--color-surface)',
            color: !value.timeUnknown && value.timeAmPm === ap ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
            cursor: 'pointer',
          }} onClick={() => onChange({ ...value, timeAmPm: ap, timeUnknown: false })}>{ap}</button>
        ))}
        <select style={{ flex: 1, padding: '7px', fontSize: 11, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer' }}
          value={value.timeHour} onChange={e => onChange({ ...value, timeHour: e.target.value, timeUnknown: false })} disabled={value.timeUnknown}>
          <option value="">시</option>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => <option key={h} value={String(h)}>{h}시</option>)}
        </select>
        <select style={{ flex: 1, padding: '7px', fontSize: 11, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer' }}
          value={value.timeMin} onChange={e => onChange({ ...value, timeMin: e.target.value, timeUnknown: false })} disabled={value.timeUnknown}>
          <option value="">분</option>
          {['00','10','20','30','40','50'].map(m => <option key={m} value={m}>{m}분</option>)}
        </select>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['미혼','기혼','돌싱'].map(ms => (
          <button key={ms} style={{
            padding: '5px 12px', fontSize: 11,
            border: `1px solid ${value.maritalStatus === ms ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 20,
            background: value.maritalStatus === ms ? 'var(--color-primary-light)' : 'var(--color-surface)',
            color: value.maritalStatus === ms ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
            cursor: 'pointer',
          }} onClick={() => onChange({ ...value, maritalStatus: ms })}>{ms}</button>
        ))}
      </div>
    </div>
  )
}

const emptyMember = () => ({ year: '', month: '', day: '', gender: '', timeHour: '', timeMin: '', timeAmPm: '오전', timeUnknown: false, isLunar: false, maritalStatus: '미혼' })
const memberValid = (m) => m.year.length === 4 && Number(m.month) >= 1 && Number(m.month) <= 12 && Number(m.day) >= 1 && m.gender !== '' && (m.timeUnknown || (m.timeHour !== '' && m.timeMin !== ''))
const memberBirthtime = (m) => {
  if (m.timeUnknown || !m.timeHour || !m.timeMin) return ''
  let h = Number(m.timeHour)
  if (m.timeAmPm === '오전' && h === 12) h = 0
  if (m.timeAmPm === '오후' && h !== 12) h += 12
  return `${String(h).padStart(2,'0')}:${String(m.timeMin).padStart(2,'0')}`
}

export default function App() {
  // ping
  useEffect(() => {
    const ping = () => fetch(`${API_URL}/ping`).catch(() => {})
    ping()
    const id = setInterval(ping, 30000)
    return () => clearInterval(id)
  }, [])

  // 타이머
  const [countdown, setCountdown] = useState(getMidnightCountdown())
  useEffect(() => {
    const id = setInterval(() => setCountdown(getMidnightCountdown()), 1000)
    return () => clearInterval(id)
  }, [])

  // ── 앱 상태 ──
  // screen: 'landing' | 'input' | 'result' | 'family_input' | 'gunghab_input' | 'child_input'
  const [screen, setScreen] = useState('landing')
  const [serviceType, setServiceType] = useState(null) // 'saju' | 'family' | 'gunghab' | 'child'

  // 입력 상태
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
  const [phase, setPhase] = useState('input')
  const [sajuData, setSajuData] = useState(null)
  const [baseText, setBaseText] = useState('')
  const [paidText, setPaidText] = useState('')
  const [isPaidStreaming, setIsPaidStreaming] = useState(false)
  const [isBaseStreaming, setIsBaseStreaming] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [extraMembers, setExtraMembers] = useState([])
  const [memberResults, setMemberResults] = useState([])
  const [gunghabResults, setGunghabResults] = useState([])
  const [showFamilyInput, setShowFamilyInput] = useState(false)
  const [showPlanSelect, setShowPlanSelect] = useState(false)

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
    if (currentStepId === 'maritalStatus') return maritalStatus !== ''
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

  // SSE 스트리밍
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
    try {
      await streamAnalyze({
        body: { gender, maritalStatus, birthdate, birthtime, mbti, blood, type: '기본', isPaid: false, isLunar },
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

  async function handlePaidAnalyze(members = []) {
    setPaidText(''); setIsPaidStreaming(true); setShowFamilyInput(false); setShowPlanSelect(false)
    isPaidSectionRef.current = false
    try {
      // 본인 유료 분석
      await streamAnalyze({
        body: { gender, maritalStatus, birthdate, birthtime, mbti, blood, type: '전체', isPaid: true, isLunar },
        onSaju: () => {},
        onBaseText: (t) => setBaseText(prev => prev + t),
        onPaidText: (t) => setPaidText(prev => prev + t),
        onDone: () => {}, onError: (e) => alert(e),
      })
      // 가족 분석
      const results = []
      for (const member of members) {
        let memberText = ''; isPaidSectionRef.current = false
        const bd = `${member.year}-${String(member.month).padStart(2,'0')}-${String(member.day).padStart(2,'0')}`
        await streamAnalyze({
          body: { gender: member.gender, birthdate: bd, birthtime: memberBirthtime(member), maritalStatus: member.maritalStatus || '미혼', type: '전체', isPaid: true, isLunar: member.isLunar || false },
          onSaju: () => {},
          onBaseText: (t) => { memberText += t },
          onPaidText: (t) => { memberText += t },
          onDone: () => results.push({ role: `가족 ${results.length + 1}`, text: memberText, birthdate: bd, gender: member.gender, birthtime: memberBirthtime(member), isLunar: member.isLunar }),
          onError: (e) => alert(e),
        })
      }
      setMemberResults(results)
    } catch (e) {
      if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.')
    }
    setIsPaidStreaming(false)
  }

  async function handleGunghab(memberIdx) {
    const member = memberResults[memberIdx]
    if (!member) return
    setGunghabResults(prev => [...prev, { memberIdx, text: '', streaming: true }])
    let gunghabText = ''
    try {
      const ctrl = new AbortController()
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, birthdate, birthtime, isLunar, partnerGender: member.gender, partnerBirthdate: member.birthdate, partnerBirthtime: member.birthtime || '', partnerIsLunar: member.isLunar || false, type: '궁합', isPaid: true }),
        signal: ctrl.signal,
      })
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            if (json.text) { gunghabText += json.text; setGunghabResults(prev => prev.map(g => g.memberIdx === memberIdx ? { ...g, text: gunghabText } : g)) }
            else if (json.type === 'done') setGunghabResults(prev => prev.map(g => g.memberIdx === memberIdx ? { ...g, streaming: false } : g))
          } catch {}
        }
      }
    } catch (e) {
      setGunghabResults(prev => prev.map(g => g.memberIdx === memberIdx ? { ...g, streaming: false } : g))
    }
  }

  function handleRestart() {
    abortRef.current?.abort()
    setScreen('landing'); setServiceType(null); setStep(0)
    setGender(''); setMaritalStatus(''); setBirthYear(''); setBirthMonth(''); setBirthDay('')
    setIsLunar(false); setTimeHour(''); setTimeMin(''); setTimeAmPm('오전'); setTimeUnknown(false)
    setMbti(''); setBlood('')
    setPhase('input'); setSajuData(null); setBaseText(''); setPaidText('')
    setSelectedPlan(null); setExtraMembers([]); setMemberResults([]); setGunghabResults([])
    setIsBaseStreaming(false); setIsPaidStreaming(false); setShowFamilyInput(false); setShowPlanSelect(false)
    isPaidSectionRef.current = false
  }

  // ── 총 결제 금액 계산 ──
  function getTotalPrice(memberCount) {
    return PRICE.sale + (memberCount > 0 ? memberCount * PRICE.extra : 0)
  }

  // ──────────────────────────────────────────────────
  // 화면 1: 랜딩 페이지
  // ──────────────────────────────────────────────────
  if (screen === 'landing') {
    return (
      <div style={s.landing}>
        {/* 타이머 배너 */}
        <div style={s.timerBanner}>
          🔥 오늘 자정까지 할인
          <span style={s.timerNum}>{countdown}</span>
        </div>

        {/* 히어로 */}
        <div style={s.landingHero}>
          <span style={s.landingEmoji}>✨</span>
          <h1 style={s.landingTitle}>내가 왜 이렇게 사나 했더니<br/>사주 때문이었다</h1>
          <p style={s.landingSub}>
            무료로 먼저 확인하세요<br/>
            <span style={{ color: '#7C3AED', fontWeight: 700 }}>오프라인 7만원짜리</span>를 단돈 <span style={{ color: '#7C3AED', fontWeight: 700 }}>3,900원</span>에
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FEF3C7', padding: '8px 16px', borderRadius: 20, fontSize: 13, color: '#92400E', fontWeight: 600 }}>
            <span>⏰</span>
            <span>정가 <span style={{ textDecoration: 'line-through' }}>9,900원</span> → 오늘만 3,900원</span>
          </div>
        </div>

        {/* 서비스 카드 */}
        <div style={s.cardGrid}>
          <p style={s.cardGridTitle}>무엇이 궁금하세요?</p>
          <div style={s.grid2}>
            {/* 나의 사주 */}
            <button style={s.serviceCard(CARD_COLORS.saju)} onClick={() => { setServiceType('saju'); setScreen('input') }}>
              <span style={s.freeBadge}>무료 맛보기</span>
              <span style={s.serviceEmoji}>🔮</span>
              <span style={s.serviceLabel(CARD_COLORS.saju)}>나의 사주</span>
              <span style={s.serviceSub}>돈·직업·연애<br/>내 팔자가 정해놨다</span>
              <span style={s.servicePrice(CARD_COLORS.saju)}>3,900원</span>
            </button>

            {/* 궁합 */}
            <button style={s.serviceCard(CARD_COLORS.gunghab)} onClick={() => { setServiceType('gunghab'); setScreen('input') }}>
              <span style={s.serviceEmoji}>💕</span>
              <span style={s.serviceLabel(CARD_COLORS.gunghab)}>궁합</span>
              <span style={s.serviceSub}>우리 잘 맞는지<br/>사주로 확인</span>
              <span style={s.servicePrice(CARD_COLORS.gunghab)}>3,900원</span>
            </button>
          </div>

          <div style={s.grid2}>
            {/* 가족 세트 */}
            <button style={s.serviceCard(CARD_COLORS.family)} onClick={() => { setServiceType('family'); setScreen('input') }}>
              <span style={s.freeBadge}>무료 맛보기</span>
              <span style={s.serviceEmoji}>👨‍👩‍👧</span>
              <span style={s.serviceLabel(CARD_COLORS.family)}>가족 세트</span>
              <span style={s.serviceSub}>가족 모두의 사주<br/>한 번에 저렴하게</span>
              <span style={s.servicePrice(CARD_COLORS.family)}>3,900원~</span>
            </button>

            {/* 자녀 진로 */}
            <button style={s.serviceCard(CARD_COLORS.child)} onClick={() => { setServiceType('child'); setScreen('input') }}>
              <span style={s.serviceEmoji}>🌱</span>
              <span style={s.serviceLabel(CARD_COLORS.child)}>자녀 천명</span>
              <span style={s.serviceSub}>아이의 타고난 재능<br/>진로를 미리 확인</span>
              <span style={s.servicePrice(CARD_COLORS.child)}>3,900원</span>
            </button>
          </div>

          {/* 신뢰 지표 */}
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
    )
  }

  // ──────────────────────────────────────────────────
  // 화면 2: 입력 스텝
  // ──────────────────────────────────────────────────
  if (screen === 'input') {
    const serviceNames = { saju: '나의 사주', family: '가족 세트', gunghab: '궁합', child: '자녀 천명' }
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

  // ──────────────────────────────────────────────────
  // 화면 3: 결과
  // ──────────────────────────────────────────────────
  if (screen === 'result') {
    const baseSections = parseSections(baseText)
    const paidSections = parseSections(paidText)

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
        {/* 타이머 배너 (결과 화면에도) */}
        {phase === 'done' && !selectedPlan && (
          <div style={s.timerBanner}>
            🔥 오늘 자정까지 할인 &nbsp;
            <span style={s.timerNum}>{countdown}</span>
          </div>
        )}
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

          {/* 무료 결과 */}
          {isBaseStreaming && baseText && (
            <div style={s.streamCard}>{baseText}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}
          {!isBaseStreaming && baseSections.map((sec, i) => (
            <Accordion key={i} title={sec.title} content={sec.content} defaultOpen={i === 0} />
          ))}

          {/* 유료 스트리밍 */}
          {isPaidStreaming && paidText && (
            <div style={s.streamCard}>{paidText}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}

          {/* 유료 완료 */}
          {!isPaidStreaming && paidSections.length > 0 && (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textAlign: 'center', margin: '16px 0 8px' }}>⭐ 전체 분석 결과</p>
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

          {/* 가족 분석 결과 + 궁합 버튼 */}
          {memberResults.map((mr, i) => {
            const gunghabResult = gunghabResults.find(g => g.memberIdx === i)
            const gunghabSections = gunghabResult ? parseSections(gunghabResult.text) : []
            return (
              <div key={i}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#059669', textAlign: 'center', margin: '20px 0 8px' }}>
                  👨‍👩‍👧 {mr.role} 분석 결과
                </p>
                {parseSections(mr.text).map((sec, j) => (
                  <Accordion key={j} title={sec.title} content={sec.content} isChild={true} defaultOpen={j === 0} />
                ))}
                {!isPaidStreaming && !gunghabResult && (
                  <div style={{ background: 'linear-gradient(135deg, #FFF1F2, #FFF5F6)', border: '2px solid #E11D48', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12, textAlign: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#E11D48', marginBottom: 4 }}>💕 두 사람 궁합 보기</p>
                    <p style={{ fontSize: 13, color: '#9F1239', marginBottom: 12, lineHeight: 1.6 }}>
                      성격 궁합 · 돈 궁합 · 결혼 궁합 · 궁합 점수<br/>
                      <span style={{ fontSize: 12 }}>단 <span style={{ fontWeight: 700 }}>1,900원</span> 추가</span>
                    </p>
                    <button style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, background: '#E11D48', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                      onClick={() => { if (window.confirm('1,900원 추가 결제 후 궁합 분석을 받으시겠어요?\n(현재 테스트 중 - 결제 없이 바로 확인)')) handleGunghab(i) }}>
                      💕 궁합 분석받기 (1,900원) →
                    </button>
                  </div>
                )}
                {gunghabResult?.streaming && gunghabResult.text && (
                  <div style={s.streamCard}>{gunghabResult.text}<span style={{ opacity: 0.4 }}>▌</span></div>
                )}
                {gunghabResult && !gunghabResult.streaming && gunghabSections.length > 0 && (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#E11D48', textAlign: 'center', margin: '16px 0 8px' }}>💕 궁합 분석 결과</p>
                    {gunghabSections.map((sec, j) => (
                      <Accordion key={j} title={sec.title} content={sec.content} isGunghab={true} defaultOpen={j === 0} />
                    ))}
                  </>
                )}
              </div>
            )
          })}

          {/* 결제 섹션 — 무료 완료 후 */}
          {phase === 'done' && !selectedPlan && !isPaidStreaming && (
            <>
              {/* 플랜 선택 안 했을 때 */}
              {!showPlanSelect && !showFamilyInput && (
                <div style={s.payBanner}>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>🔮 전체 분석 받기</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>인생 재운 · 직업운 · 투자 · 인간관계 · 월별운세</p>
                  <div style={s.payOriginal}>정가 9,900원</div>
                  <div style={s.payPrice}>3,900원</div>
                  <div style={s.payDiscount}>⏰ 오늘 자정까지 할인 {countdown}</div>
                  <button style={s.payBtn} onClick={() => setShowPlanSelect(true)}>
                    지금 전체 분석 받기 →
                  </button>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>가족 추가 시 1인당 1,900원만 더</p>
                </div>
              )}

              {/* 플랜 선택 */}
              {showPlanSelect && !showFamilyInput && (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>👨‍👩‍👧‍👦 몇 명 분석할까요?</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>가족 추가 시 1인당 1,900원 · 궁합은 나중에 따로 추가 가능</p>
                  {[
                    { n: 0, label: '나 혼자', emoji: '👤', price: 3900 },
                    { n: 1, label: '나 + 가족 1명', emoji: '👫', price: 5800, badge: '인기' },
                    { n: 2, label: '나 + 가족 2명', emoji: '👨‍👩‍👦', price: 7700 },
                    { n: 3, label: '나 + 가족 3명', emoji: '👨‍👩‍👧‍👦', price: 9600 },
                  ].map(({ n, label, emoji, price, badge }) => (
                    <button key={n} style={s.familyOption(false)} onClick={() => {
                      if (n === 0) {
                        if (window.confirm(`3,900원 결제 후 전체 분석을 받으시겠어요?\n(현재 테스트 중 - 결제 없이 바로 확인)`)) {
                          setSelectedPlan(0); handlePaidAnalyze([])
                        }
                      } else {
                        setExtraMembers(Array.from({ length: n }, () => emptyMember()))
                        setShowFamilyInput(true); setShowPlanSelect(false)
                        setSelectedPlan(n)
                      }
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{emoji}</span>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{label}</p>
                          {badge && <span style={{ fontSize: 10, background: 'var(--color-primary)', color: 'white', padding: '1px 6px', borderRadius: 10 }}>{badge}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {n > 0 && <p style={{ fontSize: 11, color: '#059669', margin: 0 }}>({(n * 1990).toLocaleString()}원 절약)</p>}
                        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary-dark)', margin: 0 }}>{price.toLocaleString()}원</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 가족 정보 입력 */}
              {showFamilyInput && (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>가족 정보를 입력해주세요</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>각 가족의 사주를 따로 분석해드려요</p>
                  {extraMembers.map((m, i) => (
                    <MemberInput key={i} role={`가족 ${i+1}`} value={m}
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
                      const total = getTotalPrice(extraMembers.length)
                      if (window.confirm(`${total.toLocaleString()}원 결제 후 분석을 받으시겠어요?\n(현재 테스트 중 - 결제 없이 바로 확인)`)) {
                        handlePaidAnalyze(extraMembers)
                      }
                    }}>
                    {getTotalPrice(extraMembers.length).toLocaleString()}원으로 전체 분석받기 →
                  </button>
                </div>
              )}
            </>
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
