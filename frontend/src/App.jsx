import { useState } from 'react'

const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']
const STEPS = ['gender', 'birthdate', 'birthtime', 'mbti', 'blood']

// 결과 텍스트를 섹션으로 파싱
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
    padding: '28px 16px', border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    cursor: 'pointer', fontSize: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s',
  }),
  genderLabel: (active) => ({ fontSize: 14, fontWeight: 600, color: active ? 'var(--color-primary-dark)' : 'var(--color-text)' }),
  calToggle: { display: 'flex', gap: 8, marginBottom: 16 },
  calBtn: (active) => ({
    flex: 1, padding: '10px', fontSize: 13, fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s',
  }),
  dateInput: { width: '100%', padding: '14px 16px', fontSize: 16, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', boxSizing: 'border-box', marginBottom: 8 },
  unknownBtn: (active) => ({
    width: '100%', padding: '13px 16px', border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
    fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', marginBottom: 8,
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
  // 사주 표
  sajuCard: { background: '#F8F5FF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 12 },
  sajuTitle: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 12, letterSpacing: '0.05em' },
  sajuTable: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  sajuCell: { textAlign: 'center', background: 'white', borderRadius: 8, padding: '10px 4px', border: '1px solid var(--color-border)' },
  sajuCellLabel: { fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' },
  sajuCellValue: { fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.6 },
  // 아코디언
  accordion: { marginBottom: 8, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  accordionHeader: (open) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', cursor: 'pointer', background: open ? 'var(--color-primary-light)' : 'var(--color-surface)',
    transition: 'all 0.2s',
  }),
  accordionTitle: (open) => ({ fontSize: 15, fontWeight: 700, color: open ? 'var(--color-primary-dark)' : 'var(--color-text)', flex: 1 }),
  accordionArrow: (open) => ({ fontSize: 12, color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }),
  accordionBody: { padding: '16px 18px', fontSize: 15, lineHeight: 1.9, color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' },
  // 990원 결제 버튼
  paySection: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 'var(--radius-md)', padding: '24px 20px', marginBottom: 12, textAlign: 'center' },
  paySectionTitle: { fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 6 },
  paySectionSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: 16 },
  payList: { textAlign: 'left', marginBottom: 16 },
  payListItem: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  payBtn: { width: '100%', padding: '16px', fontSize: 18, fontWeight: 700, background: 'white', color: '#764ba2', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' },
  // 유료 결과 아코디언
  paidAccordion: { marginBottom: 8, border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  paidAccordionHeader: (open) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', cursor: 'pointer', background: open ? '#F3EEFF' : 'var(--color-surface)', transition: 'all 0.2s',
  }),
  // 행운 아이템
  luckyCard: { background: 'linear-gradient(135deg, #FFF8E7, #FFFBEF)', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 12 },
  luckyGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 },
  luckyItem: { background: 'white', borderRadius: 8, padding: '10px 12px', border: '1px solid #FDE68A' },
  luckyItemLabel: { fontSize: 10, color: '#92400E', fontWeight: 600, marginBottom: 3, display: 'block' },
  luckyItemValue: { fontSize: 13, color: '#1a1a1a', fontWeight: 500 },
  loading: { display: 'flex', gap: 6, alignItems: 'center', padding: '20px' },
  dot: (i) => ({ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }),
  restartBtn: { width: '100%', padding: '13px', fontSize: 14, background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-muted)', marginTop: 10 },
  loadingCard: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px 20px', marginBottom: 12 },
}

// 아코디언 컴포넌트
function Accordion({ title, content, isPaid = false, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const style = isPaid ? s.paidAccordion : s.accordion
  const headerStyle = isPaid ? s.paidAccordionHeader : s.accordionHeader
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
  useState(() => {
    fetch('https://love-fortune.onrender.com/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthdate: '2000-01-01', type: '기본', isPaid: false })
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
  const [loading, setLoading] = useState(false)
  const [paidLoading, setPaidLoading] = useState(false)
  const [baseResult, setBaseResult] = useState(null)
  const [paidResult, setPaidResult] = useState(null)
  const [showPayment, setShowPayment] = useState(false)

  const currentStepId = STEPS[step]
  const progress = (step / STEPS.length) * 100

  function canGoNext() {
    if (currentStepId === 'gender') return gender !== ''
    if (currentStepId === 'birthdate') return birthdate !== ''
    if (currentStepId === 'birthtime') return timeUnknown || birthtime !== ''
    return true
  }

  function goNext() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleBaseAnalyze()
  }

  function goBack() { if (step > 0) setStep(s => s - 1) }

  async function handleBaseAnalyze() {
    setLoading(true); setBaseResult(null); setPaidResult(null)
    try {
      const res = await fetch('https://love-fortune.onrender.com/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, birthdate, birthtime: timeUnknown ? '' : birthtime, mbti, blood, type: '기본', isPaid: false, isLunar }),
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
      const res = await fetch('https://love-fortune.onrender.com/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, birthdate, birthtime: timeUnknown ? '' : birthtime, mbti, blood, type: '전체', isPaid: true, isLunar }),
      })
      const data = await res.json()
      if (data.error) alert(data.error)
      else setPaidResult(data)
    } catch { alert('서버에 연결할 수 없습니다.') }
    setPaidLoading(false)
    setShowPayment(false)
  }

  function handleRestart() {
    setStep(0); setGender(''); setBirthdate(''); setIsLunar(false)
    setBirthtime(''); setTimeUnknown(false); setMbti(''); setBlood('')
    setBaseResult(null); setPaidResult(null); setShowPayment(false)
  }

  // 결과 화면
  if (loading || baseResult) {
    const baseSections = baseResult ? parseSections(baseResult.result) : []
    const paidSections = paidResult ? parseSections(paidResult.result) : []

    return (
      <div style={s.app}>
        <div style={s.header}>
          <span style={s.heroEmoji}>✨</span>
          <h1 style={s.heroTitle}>나의 연애·결혼 운세</h1>
          <p style={s.heroSub}>사주 · MBTI · 혈액형으로 알아보는<br />이상형, 연애운, 결혼운</p>
        </div>
        <div style={s.resultWrap}>

          {loading && (
            <div style={s.loadingCard}>
              <div style={s.loading}>
                {[0,1,2].map(i => <div key={i} style={s.dot(i)} />)}
                <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                  🔮 사주 분석 중... 약 1분 소요됩니다!
                </span>
              </div>
            </div>
          )}

          {baseResult && (
            <>
              {/* 사주팔자 표 */}
              {baseResult.사주 && (
                <div style={s.sajuCard}>
                  <p style={s.sajuTitle}>📋 나의 사주팔자</p>
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
                  {baseResult.용신 && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center' }}>
                      용신(用神): <strong>{baseResult.용신.한글}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* 무료 섹션 아코디언 */}
              {baseSections.length > 0
                ? baseSections.map((sec, i) => (
                    <Accordion key={i} title={sec.title} content={sec.content} defaultOpen={i === 0} />
                  ))
                : <Accordion title="내 사주 분석" content={baseResult.result} defaultOpen={true} />
              }

              {/* 유료 결과 */}
              {paidLoading && (
                <div style={s.loadingCard}>
                  <div style={s.loading}>
                    {[0,1,2].map(i => <div key={i} style={s.dot(i)} />)}
                    <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                      🔮 전체 분석 중... 약 1~2분 소요됩니다!
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
                    ? paidSections.map((sec, i) => (
                        <Accordion key={i} title={sec.title} content={sec.content} isPaid={true} defaultOpen={i === 0} />
                      ))
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

              {/* 990원 결제 유도 */}
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

              <button style={s.restartBtn} onClick={handleRestart}>처음으로 돌아가기</button>
            </>
          )}
        </div>
      </div>
    )
  }

  // 스텝 입력 화면
  return (
    <div style={s.app}>
      <div style={s.header}>
        <span style={s.heroEmoji}>✨</span>
        <h1 style={s.heroTitle}>나의 연애·결혼 운세</h1>
        <p style={s.heroSub}>사주 · MBTI · 혈액형으로 알아보는<br />이상형, 연애운, 결혼운</p>
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
        {currentStepId === 'birthdate' && (
          <>
            <h2 style={s.stepTitle}>생년월일을 알려주세요</h2>
            <p style={s.stepSub}>양력/음력 선택 후 입력해주세요</p>
            <div style={s.calToggle}>
              <button style={s.calBtn(!isLunar)} onClick={() => setIsLunar(false)}>양력 🌞</button>
              <button style={s.calBtn(isLunar)} onClick={() => setIsLunar(true)}>음력 🌙</button>
            </div>
            <input type="date" style={s.dateInput} value={birthdate} onChange={e => setBirthdate(e.target.value)} />
            {isLunar && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>ℹ️ 음력 날짜를 입력하면 자동으로 양력으로 변환해요</p>}
          </>
        )}
        {currentStepId === 'birthtime' && (
          <>
            <h2 style={s.stepTitle}>태어난 시간을 알려주세요</h2>
            <p style={s.stepSub}>모르셔도 괜찮아요</p>
            <button style={s.unknownBtn(timeUnknown)} onClick={() => { setTimeUnknown(true); setBirthtime('') }}>
              ✓ 태어난 시간 모름
            </button>
            {!timeUnknown && (
              <input type="time" style={s.dateInput} value={birthtime} onChange={e => { setBirthtime(e.target.value); setTimeUnknown(false) }} />
            )}
            {timeUnknown && <button style={s.skipBtn} onClick={() => setTimeUnknown(false)}>시간 직접 입력하기</button>}
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
