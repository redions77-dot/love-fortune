import { useState } from 'react'

const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']

const FORTUNE_TYPES = [
  { id: '이상형', label: '이상형', emoji: '💘', free: true, desc: '나와 잘 맞는 사람' },
  { id: '연애운', label: '연애운', emoji: '🌹', free: false, desc: '올해 연애 흐름' },
  { id: '결혼운', label: '결혼운', emoji: '💍', free: false, desc: '결혼 시기·배우자' },
  { id: '재운', label: '재운', emoji: '💰', free: false, desc: '재물·직업운' },
  { id: '종합운', label: '종합운', emoji: '⭐', free: false, desc: '사주+연애+재운 ALL' },
  { id: '궁합', label: '궁합', emoji: '🔮', free: false, desc: '상대방과의 궁합' },
]

const STEPS = ['gender', 'birthdate', 'birthtime', 'mbti', 'blood', 'type']

const s = {
  app: { minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' },
  header: {
    textAlign: 'center', padding: '40px 24px 24px',
    background: 'linear-gradient(180deg, #F3EEFF 0%, var(--color-bg) 100%)',
  },
  heroEmoji: { fontSize: 44, display: 'block', marginBottom: 10 },
  heroTitle: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 },
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
    padding: '28px 16px',
    border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    cursor: 'pointer', fontSize: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s',
  }),
  genderLabel: (active) => ({ fontSize: 14, fontWeight: 600, color: active ? 'var(--color-primary-dark)' : 'var(--color-text)' }),
  calToggle: { display: 'flex', gap: 8, marginBottom: 16 },
  calBtn: (active) => ({
    flex: 1, padding: '10px', fontSize: 13, fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
    cursor: 'pointer', transition: 'all 0.15s',
  }),
  dateInput: {
    width: '100%', padding: '14px 16px', fontSize: 16,
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)', color: 'var(--color-text)',
    boxSizing: 'border-box', marginBottom: 8,
  },
  unknownBtn: (active) => ({
    width: '100%', padding: '13px 16px',
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
    fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', marginBottom: 8,
  }),
  chipWrap: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: (active) => ({
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer',
    background: active ? 'var(--color-primary-light)' : 'transparent',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
    fontWeight: active ? 600 : 400, transition: 'all 0.15s',
  }),
  skipBtn: { fontSize: 13, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' },
  typeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  typeBtn: (active) => ({
    border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', padding: '18px 10px', cursor: 'pointer',
    background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    textAlign: 'center', transition: 'all 0.15s', position: 'relative',
  }),
  typeBtnEmoji: { fontSize: 28, display: 'block', marginBottom: 6 },
  typeBtnLabel: (active) => ({ fontSize: 14, fontWeight: 600, color: active ? 'var(--color-primary-dark)' : 'var(--color-text)', display: 'block' }),
  typeBtnDesc: { fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 },
  freeBadge: { position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 600, background: '#D1FAE5', color: '#065F46', padding: '2px 6px', borderRadius: 10 },
  paidBadge: { position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 600, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 10 },
  bottomBar: {
    position: 'fixed', bottom: 0, background: 'var(--color-bg)',
    borderTop: '1px solid var(--color-border)', padding: '12px 16px 24px',
    display: 'flex', gap: 10, maxWidth: 480, width: '100%',
    left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box',
  },
  backBtn: { flex: '0 0 auto', padding: '14px 20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontSize: 15, cursor: 'pointer', color: 'var(--color-text)' },
  nextBtn: (disabled) => ({
    flex: 1, padding: '14px', fontSize: 15, fontWeight: 600,
    background: disabled ? '#D4C8F5' : 'var(--color-primary)',
    color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
  }),
  resultWrap: { maxWidth: 480, margin: '0 auto', padding: '12px 16px 40px', boxSizing: 'border-box' },
  resultCard: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px 20px', marginBottom: 12, animation: 'fadeIn 0.4s ease' },
  resultHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' },
  resultTitle: { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--color-text)' },
  resultBadge: { marginLeft: 'auto', fontSize: 11, background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', padding: '4px 10px', borderRadius: 20, fontWeight: 500 },
  resultText: { fontSize: 15, lineHeight: 1.9, color: 'var(--color-text)', whiteSpace: 'pre-wrap' },
  sajuCard: { background: '#F8F5FF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 12 },
  sajuTitle: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 12, letterSpacing: '0.05em' },
  sajuTable: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  sajuCell: { textAlign: 'center', background: 'white', borderRadius: 8, padding: '10px 4px', border: '1px solid var(--color-border)' },
  sajuCellLabel: { fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' },
  sajuCellValue: { fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-line' },
  luckyCard: { background: 'linear-gradient(135deg, #FFF8E7, #FFFBEF)', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12 },
  luckyTitle: { fontSize: 15, fontWeight: 700, color: '#92400E', marginBottom: 4 },
  luckySub: { fontSize: 12, color: '#B45309', marginBottom: 14 },
  luckyGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  luckyItem: { background: 'white', borderRadius: 8, padding: '10px 12px', border: '1px solid #FDE68A' },
  luckyItemLabel: { fontSize: 10, color: '#92400E', fontWeight: 600, marginBottom: 3, display: 'block' },
  luckyItemValue: { fontSize: 13, color: '#1a1a1a', fontWeight: 500 },
  paymentNudge: { textAlign: 'center', padding: '24px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)', animation: 'fadeIn 0.3s ease', marginBottom: 12 },
  payBtn: { width: '100%', padding: '15px', fontSize: 16, fontWeight: 600, background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginTop: 8 },
  restartBtn: { width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-muted)', marginTop: 10 },
  loading: { display: 'flex', gap: 6, alignItems: 'center', padding: '8px 0' },
  dot: (i) => ({ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }),
  freePreview: { background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 12, fontSize: 13, color: '#166534', lineHeight: 1.6 },
}

export default function App() {
  useState(() => {
    fetch('https://love-fortune.onrender.com/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthdate: '2000-01-01', type: '이상형', isPaid: false })
    }).catch(() => {})
  })

  const [step, setStep] = useState(0)
  const [gender, setGender] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [isLunar, setIsLunar] = useState(false)
  const [birthtime, setBirthtime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [mbti, setMbti] = useState('')
  const [blood, setBlood] = useState('')
  const [type, setType] = useState('이상형')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showPayment, setShowPayment] = useState(false)

  const totalSteps = STEPS.length
  const currentStepId = STEPS[step]
  const progress = (step / totalSteps) * 100
  const selectedType = FORTUNE_TYPES.find(t => t.id === type)

  function canGoNext() {
    if (currentStepId === 'gender') return gender !== ''
    if (currentStepId === 'birthdate') return birthdate !== ''
    if (currentStepId === 'birthtime') return timeUnknown || birthtime !== ''
    return true
  }

  function goNext() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleAnalyze()
  }

  function goBack() {
    if (step > 0) setStep(s => s - 1)
  }

  async function handleAnalyze() {
    setLoading(true)
    setResult(null)
    setShowPayment(false)
    try {
      const res = await fetch('https://love-fortune.onrender.com/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender, birthdate,
          birthtime: timeUnknown ? '' : birthtime,
          mbti, blood, type, isPaid: false, isLunar,
        }),
      })
      const data = await res.json()
      if (res.status === 402) setShowPayment(true)
      else if (data.error) alert(data.error)
      else setResult(data)
    } catch {
      alert('서버에 연결할 수 없습니다.')
    }
    setLoading(false)
  }

  function handleRestart() {
    setStep(0); setGender(''); setBirthdate(''); setIsLunar(false)
    setBirthtime(''); setTimeUnknown(false); setMbti(''); setBlood('')
    setType('이상형'); setResult(null); setShowPayment(false)
  }

  if (loading || result || showPayment) {
    return (
      <div style={s.app}>
        <div style={s.header}>
          <span style={s.heroEmoji}>✨</span>
          <h1 style={s.heroTitle}>나의 연애·결혼 운세</h1>
          <p style={s.heroSub}>사주 · MBTI · 혈액형으로 알아보는<br />이상형, 연애운, 결혼운</p>
        </div>
        <div style={s.resultWrap}>

          {loading && (
            <div style={s.resultCard}>
              <div style={s.loading}>
                {[0,1,2].map(i => <div key={i} style={s.dot(i)} />)}
                <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                  🔮 운명의 데이터 분석 중... 약 1분 소요됩니다!
                </span>
              </div>
            </div>
          )}

          {showPayment && (
            <>
              <div style={s.freePreview}>
                ✅ <strong>이상형 분석은 무료</strong>로 먼저 확인해보세요!<br />
                연애운·결혼운·재운·종합운은 단 1,900원이에요.
              </div>
              <div style={s.paymentNudge}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>🔒 프리미엄 콘텐츠예요</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 4 }}>
                  <strong>{selectedType?.label}</strong> 분석은 유료 서비스예요.<br />
                  단 1,900원으로 상세한 운세를 확인하세요.
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  💡 종합운(1,900원)을 선택하면<br />사주 해설 + 연애운 + 재운을 한번에 볼 수 있어요!
                </p>
                <button style={s.payBtn} onClick={() => alert('결제 기능 준비 중입니다!')}>
                  💳 1,900원 결제하고 보기
                </button>
                <button style={s.restartBtn} onClick={handleRestart}>처음으로 돌아가기</button>
              </div>
            </>
          )}

          {result && (
            <>
              {result.사주 && (
                <div style={s.sajuCard}>
                  <p style={s.sajuTitle}>📋 나의 사주팔자</p>
                  <div style={s.sajuTable}>
                    {[
                      { label: '시주(時)', value: result.사주.시주 },
                      { label: '일주(日)', value: result.사주.일주 },
                      { label: '월주(月)', value: result.사주.월주 },
                      { label: '년주(年)', value: result.사주.년주 },
                    ].map(({ label, value }) => (
                      <div key={label} style={s.sajuCell}>
                        <span style={s.sajuCellLabel}>{label}</span>
                        <span style={s.sajuCellValue}>{value ? value.replace(/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/g, '') || value : '-'}</span>
                      </div>
                    ))}
                  </div>
                  {result.용신 && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center' }}>
                      용신(用神): <strong>{result.용신.한글}</strong>
                    </p>
                  )}
                </div>
              )}

              <div style={s.resultCard}>
                <div style={s.resultHeader}>
                  <span style={{ fontSize: 24 }}>{selectedType?.emoji}</span>
                  <span style={s.resultTitle}>{result.type}</span>
                  <span style={s.resultBadge}>{result.type}</span>
                </div>
                <p style={s.resultText}>{result.result}</p>
              </div>

              {result.행운아이템 && (
                <div style={s.luckyCard}>
                  <p style={s.luckyTitle}>🍀 나의 행운 아이템</p>
                  <p style={s.luckySub}>용신 {result.용신?.한글} · {result.행운아이템.설명}</p>
                  <div style={s.luckyGrid}>
                    <div style={s.luckyItem}>
                      <span style={s.luckyItemLabel}>🎨 행운 색깔</span>
                      <span style={s.luckyItemValue}>{result.행운아이템.색깔}</span>
                    </div>
                    <div style={s.luckyItem}>
                      <span style={s.luckyItemLabel}>🐾 마스코트</span>
                      <span style={s.luckyItemValue}>{result.행운아이템.마스코트}</span>
                    </div>
                    <div style={s.luckyItem}>
                      <span style={s.luckyItemLabel}>🧭 행운 방향</span>
                      <span style={s.luckyItemValue}>{result.행운아이템.방향}</span>
                    </div>
                    <div style={s.luckyItem}>
                      <span style={s.luckyItemLabel}>🔢 행운 숫자</span>
                      <span style={s.luckyItemValue}>{result.행운아이템.숫자}</span>
                    </div>
                    <div style={{ ...s.luckyItem, gridColumn: '1 / -1' }}>
                      <span style={s.luckyItemLabel}>🛍️ 추천 아이템</span>
                      <span style={s.luckyItemValue}>{result.행운아이템.아이템}</span>
                    </div>
                  </div>
                </div>
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
        <h1 style={s.heroTitle}>나의 연애·결혼 운세</h1>
        <p style={s.heroSub}>사주 · MBTI · 혈액형으로 알아보는<br />이상형, 연애운, 결혼운</p>
      </div>

      <div style={s.progressWrap}>
        <div style={s.progressBar}><div style={s.progressFill(progress)} /></div>
        <p style={s.stepLabel}>{step + 1} / {totalSteps}</p>
      </div>

      <div style={s.stepWrap}>

        {currentStepId === 'gender' && (
          <>
            <h2 style={s.stepTit
