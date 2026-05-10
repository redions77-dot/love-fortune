import { useState } from 'react'

const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']

const FORTUNE_TYPES = [
  { id: '이상형', label: '이상형', emoji: '💘', free: true, desc: '나와 잘 맞는 사람' },
  { id: '연애운', label: '연애운', emoji: '🌹', free: false, desc: '올해 연애 흐름' },
  { id: '결혼운', label: '결혼운', emoji: '💍', free: false, desc: '결혼 시기·배우자' },
  { id: '궁합', label: '궁합', emoji: '🔮', free: false, desc: '상대방과의 궁합' },
]

const STEPS = ['gender', 'birthdate', 'birthtime', 'mbti', 'blood', 'type']

const s = {
  app: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    textAlign: 'center',
    padding: '40px 24px 24px',
    background: 'linear-gradient(180deg, #F3EEFF 0%, var(--color-bg) 100%)',
  },
  heroEmoji: { fontSize: 44, display: 'block', marginBottom: 10 },
  heroTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--color-text)',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  // progress bar
  progressWrap: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '0 16px 0',
    width: '100%',
    boxSizing: 'border-box',
  },
  progressBar: {
    height: 3,
    background: 'var(--color-border)',
    borderRadius: 99,
    margin: '16px 0 0',
    overflow: 'hidden',
  },
  progressFill: (pct) => ({
    height: '100%',
    width: `${pct}%`,
    background: 'var(--color-primary)',
    borderRadius: 99,
    transition: 'width 0.35s ease',
  }),
  stepLabel: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 8,
  },
  // step container
  stepWrap: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '12px 16px 100px',
    width: '100%',
    boxSizing: 'border-box',
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--color-text)',
    marginBottom: 6,
    fontFamily: 'var(--font-display)',
  },
  stepSub: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    marginBottom: 20,
  },
  // gender buttons
  genderGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 8,
  },
  genderBtn: (active) => ({
    padding: '28px 16px',
    border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    cursor: 'pointer',
    fontSize: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.15s',
  }),
  genderLabel: (active) => ({
    fontSize: 14,
    fontWeight: 600,
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text)',
  }),
  // date input
  dateInput: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 16,
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    boxSizing: 'border-box',
    marginBottom: 8,
  },
  // time
  timeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 12,
  },
  timeInput: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 16,
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    boxSizing: 'border-box',
  },
  unknownBtn: (active) => ({
    width: '100%',
    padding: '13px 16px',
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s',
    marginBottom: 8,
  }),
  // chips
  chipWrap: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: (active) => ({
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 20,
    padding: '7px 16px',
    fontSize: 13,
    cursor: 'pointer',
    background: active ? 'var(--color-primary-light)' : 'transparent',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  }),
  skipBtn: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 0',
    textDecoration: 'underline',
    display: 'block',
    marginBottom: 4,
  },
  // type grid
  typeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  typeBtn: (active) => ({
    border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '18px 10px',
    cursor: 'pointer',
    background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    textAlign: 'center',
    transition: 'all 0.15s',
    position: 'relative',
  }),
  typeBtnEmoji: { fontSize: 28, display: 'block', marginBottom: 6 },
  typeBtnLabel: (active) => ({
    fontSize: 14, fontWeight: 600,
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text)',
    display: 'block',
  }),
  typeBtnDesc: { fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 },
  freeBadge: {
    position: 'absolute', top: 8, right: 8,
    fontSize: 9, fontWeight: 600,
    background: '#D1FAE5', color: '#065F46',
    padding: '2px 6px', borderRadius: 10,
  },
  paidBadge: {
    position: 'absolute', top: 8, right: 8,
    fontSize: 9, fontWeight: 600,
    background: '#FEF3C7', color: '#92400E',
    padding: '2px 6px', borderRadius: 10,
  },
  // bottom nav
  bottomBar: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    background: 'var(--color-bg)',
    borderTop: '1px solid var(--color-border)',
    padding: '12px 16px 24px',
    display: 'flex',
    gap: 10,
    maxWidth: 480,
    margin: '0 auto',
    boxSizing: 'border-box',
    width: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  backBtn: {
    flex: '0 0 auto',
    padding: '14px 20px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)',
    fontSize: 15,
    cursor: 'pointer',
    color: 'var(--color-text)',
  },
  nextBtn: (disabled) => ({
    flex: 1,
    padding: '14px',
    fontSize: 15,
    fontWeight: 600,
    background: disabled ? '#D4C8F5' : 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
  }),
  // result
  resultWrap: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '12px 16px 40px',
    boxSizing: 'border-box',
  },
  resultCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px 20px',
    animation: 'fadeIn 0.4s ease',
  },
  resultHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 16, paddingBottom: 16,
    borderBottom: '1px solid var(--color-border)',
  },
  resultTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 17, fontWeight: 700,
    color: 'var(--color-text)',
  },
  resultBadge: {
    marginLeft: 'auto', fontSize: 11,
    background: 'var(--color-primary-light)',
    color: 'var(--color-primary-dark)',
    padding: '4px 10px', borderRadius: 20, fontWeight: 500,
  },
  resultText: {
    fontSize: 15, lineHeight: 1.9,
    color: 'var(--color-text)', whiteSpace: 'pre-wrap',
  },
  loading: {
    display: 'flex', gap: 6, alignItems: 'center', padding: '8px 0',
  },
  dot: (i) => ({
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--color-primary)',
    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
  }),
  paymentNudge: {
    textAlign: 'center', padding: '24px 16px',
    background: '#FFFBEB', border: '1px solid #FDE68A',
    borderRadius: 'var(--radius-md)', animation: 'fadeIn 0.3s ease',
  },
  payBtn: {
    width: '100%', padding: '15px', fontSize: 16, fontWeight: 600,
    background: 'var(--color-accent)', color: 'white',
    border: 'none', borderRadius: 'var(--radius-md)',
    cursor: 'pointer', marginTop: 8,
  },
  restartBtn: {
    width: '100%', padding: '13px', fontSize: 14,
    background: 'none', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', cursor: 'pointer',
    color: 'var(--color-text-muted)', marginTop: 10,
  },
}

export default function App() {
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState('')
  const [birthdate, setBirthdate] = useState('')
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
  const progress = ((step) / totalSteps) * 100
  const selectedType = FORTUNE_TYPES.find(t => t.id === type)

  function canGoNext() {
    if (currentStepId === 'gender') return gender !== ''
    if (currentStepId === 'birthdate') return birthdate !== ''
    if (currentStepId === 'birthtime') return timeUnknown || birthtime !== ''
    if (currentStepId === 'mbti') return true // 선택사항
    if (currentStepId === 'blood') return true // 선택사항
    if (currentStepId === 'type') return type !== ''
    return true
  }

  function goNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      handleAnalyze()
    }
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
          mbti, blood, type, isPaid: false,
        }),
      })
      const data = await res.json()
      if (res.status === 402) {
        setShowPayment(true)
      } else if (data.error) {
        alert(data.error)
      } else {
        setResult(data)
      }
    } catch {
      alert('서버에 연결할 수 없습니다.')
    }
    setLoading(false)
  }

  function handleRestart() {
    setStep(0)
    setGender('')
    setBirthdate('')
    setBirthtime('')
    setTimeUnknown(false)
    setMbti('')
    setBlood('')
    setType('이상형')
    setResult(null)
    setShowPayment(false)
  }

  // 결과 화면
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
            <div style={s.paymentNudge}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>🔒 프리미엄 콘텐츠예요</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                {selectedType?.label} 분석은 유료 서비스예요.<br />단 1,900원으로 상세한 운세를 확인하세요.
              </p>
              <button style={s.payBtn} onClick={() => alert('결제 기능 준비 중입니다!')}>
                💳 1,900원 결제하고 보기
              </button>
              <button style={s.restartBtn} onClick={handleRestart}>처음으로 돌아가기</button>
            </div>
          )}
          {result && (
            <div style={s.resultCard}>
              <div style={s.resultHeader}>
                <span style={{ fontSize: 24 }}>{selectedType?.emoji}</span>
                <span style={s.resultTitle}>{result.type}</span>
                <span style={s.resultBadge}>{result.type}</span>
              </div>
              <p style={s.resultText}>{result.result}</p>
              <button style={s.restartBtn} onClick={handleRestart}>처음으로 돌아가기</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 스텝 화면
  return (
    <div style={s.app}>
      <div style={s.header}>
        <span style={s.heroEmoji}>✨</span>
        <h1 style={s.heroTitle}>나의 연애·결혼 운세</h1>
        <p style={s.heroSub}>사주 · MBTI · 혈액형으로 알아보는<br />이상형, 연애운, 결혼운</p>
      </div>

      {/* 진행 바 */}
      <div style={s.progressWrap}>
        <div style={s.progressBar}>
          <div style={s.progressFill(progress)} />
        </div>
        <p style={s.stepLabel}>{step + 1} / {totalSteps}</p>
      </div>

      <div style={s.stepWrap}>

        {/* STEP 1: 성별 */}
        {currentStepId === 'gender' && (
          <>
            <h2 style={s.stepTitle}>성별을 알려주세요</h2>
            <p style={s.stepSub}>사주 풀이에 사용돼요</p>
            <div style={s.genderGrid}>
              <button style={s.genderBtn(gender === '여성')} onClick={() => setGender('여성')}>
                <span>♀️</span>
                <span style={s.genderLabel(gender === '여성')}>여성</span>
              </button>
              <button style={s.genderBtn(gender === '남성')} onClick={() => setGender('남성')}>
                <span>♂️</span>
                <span style={s.genderLabel(gender === '남성')}>남성</span>
              </button>
            </div>
          </>
        )}

        {/* STEP 2: 생년월일 */}
        {currentStepId === 'birthdate' && (
          <>
            <h2 style={s.stepTitle}>생년월일을 알려주세요</h2>
            <p style={s.stepSub}>양력 기준으로 입력해주세요</p>
            <input
              type="date"
              style={s.dateInput}
              value={birthdate}
              onChange={e => setBirthdate(e.target.value)}
            />
          </>
        )}

        {/* STEP 3: 태어난 시간 */}
        {currentStepId === 'birthtime' && (
          <>
            <h2 style={s.stepTitle}>태어난 시간을 알려주세요</h2>
            <p style={s.stepSub}>모르셔도 괜찮아요</p>
            <button
              style={s.unknownBtn(timeUnknown)}
              onClick={() => { setTimeUnknown(true); setBirthtime('') }}
            >
              ✓ 태어난 시간 모름
            </button>
            {!timeUnknown && (
              <input
                type="time"
                style={s.dateInput}
                value={birthtime}
                onChange={e => { setBirthtime(e.target.value); setTimeUnknown(false) }}
              />
            )}
            {timeUnknown && (
              <button style={s.skipBtn} onClick={() => setTimeUnknown(false)}>
                시간 직접 입력하기
              </button>
            )}
          </>
        )}

        {/* STEP 4: MBTI */}
        {currentStepId === 'mbti' && (
          <>
            <h2 style={s.stepTitle}>MBTI를 선택해주세요</h2>
            <p style={s.stepSub}>모르시면 건너뛰어도 돼요</p>
            <div style={s.chipWrap}>
              {MBTI_LIST.map(m => (
                <button key={m} style={s.chip(mbti === m)}
                  onClick={() => setMbti(mbti === m ? '' : m)}>{m}</button>
              ))}
            </div>
          </>
        )}

        {/* STEP 5: 혈액형 */}
        {currentStepId === 'blood' && (
          <>
            <h2 style={s.stepTitle}>혈액형을 선택해주세요</h2>
            <p style={s.stepSub}>모르시면 건너뛰어도 돼요</p>
            <div style={s.chipWrap}>
              {BLOOD_LIST.map(b => (
                <button key={b} style={s.chip(blood === b)}
                  onClick={() => setBlood(blood === b ? '' : b)}>{b}형</button>
              ))}
            </div>
          </>
        )}

        {/* STEP 6: 운세 종류 */}
        {currentStepId === 'type' && (
          <>
            <h2 style={s.stepTitle}>무엇이 궁금하세요?</h2>
            <p style={s.stepSub}>알고 싶은 운세를 선택해주세요</p>
            <div style={s.typeGrid}>
              {FORTUNE_TYPES.map(t => (
                <button key={t.id} style={s.typeBtn(type === t.id)}
                  onClick={() => setType(t.id)}>
                  <span style={s.typeBtnEmoji}>{t.emoji}</span>
                  <span style={s.typeBtnLabel(type === t.id)}>{t.label}</span>
                  <span style={s.typeBtnDesc}>{t.desc}</span>
                  <span style={t.free ? s.freeBadge : s.paidBadge}>
                    {t.free ? '무료' : '1,900원'}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

      </div>

      {/* 하단 버튼 */}
      <div style={s.bottomBar}>
        {step > 0 && (
          <button style={s.backBtn} onClick={goBack}>←</button>
        )}
        <button style={s.nextBtn(!canGoNext())} onClick={goNext} disabled={!canGoNext()}>
          {currentStepId === 'type'
            ? (selectedType?.free ? '무료 분석하기 ✨' : '분석하기 (1,900원)')
            : (currentStepId === 'mbti' || currentStepId === 'blood') ? '다음 (건너뛰기 가능)' : '다음'}
        </button>
      </div>
    </div>
  )
}
