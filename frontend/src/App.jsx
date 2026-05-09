import { useState } from 'react'

const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']

const FORTUNE_TYPES = [
  { id: '이상형', label: '이상형', emoji: '💘', free: true, desc: '나와 잘 맞는 사람' },
  { id: '연애운', label: '연애운', emoji: '🌹', free: false, desc: '올해 연애 흐름' },
  { id: '결혼운', label: '결혼운', emoji: '💍', free: false, desc: '결혼 시기·배우자' },
  { id: '궁합', label: '궁합', emoji: '🔮', free: false, desc: '상대방과의 궁합' },
]

const styles = {
  app: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    padding: '0 0 80px',
  },
  hero: {
    textAlign: 'center',
    padding: '48px 24px 32px',
    background: 'linear-gradient(180deg, #F3EEFF 0%, var(--color-bg) 100%)',
  },
  heroEmoji: { fontSize: 48, marginBottom: 12, display: 'block' },
  heroTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--color-text)',
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 14,
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '0 16px',
  },
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    marginBottom: 12,
    animation: 'fadeIn 0.3s ease',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 12, color: 'var(--color-text-muted)' },
  chipWrap: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: (active) => ({
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 20,
    padding: '5px 14px',
    fontSize: 13,
    cursor: 'pointer',
    background: active ? 'var(--color-primary-light)' : 'transparent',
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
    fontWeight: active ? 500 : 400,
    transition: 'all 0.15s',
  }),
  typeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  typeBtn: (active, free) => ({
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-sm)',
    padding: '14px 10px',
    cursor: 'pointer',
    background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
    textAlign: 'center',
    transition: 'all 0.15s',
    position: 'relative',
  }),
  typeBtnEmoji: { fontSize: 24, display: 'block', marginBottom: 4 },
  typeBtnLabel: (active) => ({
    fontSize: 14,
    fontWeight: 500,
    color: active ? 'var(--color-primary-dark)' : 'var(--color-text)',
    display: 'block',
  }),
  typeBtnDesc: { fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 },
  freeBadge: {
    position: 'absolute',
    top: 8, right: 8,
    fontSize: 9,
    fontWeight: 600,
    background: '#D1FAE5',
    color: '#065F46',
    padding: '2px 6px',
    borderRadius: 10,
  },
  paidBadge: {
    position: 'absolute',
    top: 8, right: 8,
    fontSize: 9,
    fontWeight: 600,
    background: '#FEF3C7',
    color: '#92400E',
    padding: '2px 6px',
    borderRadius: 10,
  },
  submitBtn: (disabled) => ({
    width: '100%',
    padding: '15px',
    fontSize: 16,
    fontWeight: 600,
    background: disabled ? '#D4C8F5' : 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginBottom: 12,
    transition: 'all 0.2s',
    letterSpacing: '0.02em',
  }),
  payBtn: {
    width: '100%',
    padding: '15px',
    fontSize: 16,
    fontWeight: 600,
    background: 'var(--color-accent)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    marginBottom: 12,
    transition: 'all 0.2s',
    letterSpacing: '0.02em',
  },
  resultCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px 20px',
    animation: 'fadeIn 0.4s ease',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: '1px solid var(--color-border)',
  },
  resultEmoji: { fontSize: 24 },
  resultTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  resultBadge: {
    marginLeft: 'auto',
    fontSize: 11,
    background: 'var(--color-primary-light)',
    color: 'var(--color-primary-dark)',
    padding: '4px 10px',
    borderRadius: 20,
    fontWeight: 500,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 1.9,
    color: 'var(--color-text)',
    whiteSpace: 'pre-wrap',
  },
  loading: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    padding: '8px 0',
  },
  dot: (i) => ({
    width: 8, height: 8,
    borderRadius: '50%',
    background: 'var(--color-primary)',
    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
  }),
  paymentNudge: {
    textAlign: 'center',
    padding: '24px 16px',
    background: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: 'var(--radius-md)',
    animation: 'fadeIn 0.3s ease',
  },
  payNudgeTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    marginBottom: 8,
  },
  payNudgeSub: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    marginBottom: 16,
    lineHeight: 1.6,
  },
}

export default function App() {
  const [form, setForm] = useState({ name: '', gender: '', birthdate: '', birthtime: '' })
  const [mbti, setMbti] = useState('')
  const [blood, setBlood] = useState('')
  const [type, setType] = useState('이상형')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showPayment, setShowPayment] = useState(false)

  const selectedType = FORTUNE_TYPES.find(t => t.id === type)
  const isFree = selectedType?.free

  async function handleAnalyze() {
    if (!form.birthdate) return alert('생년월일을 입력해주세요.')
    setLoading(true)
    setResult(null)
    setShowPayment(false)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, mbti, blood, type, isPaid: false }),
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
      alert('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.')
    }
    setLoading(false)
  }

  function handlePay() {
    // 토스페이먼츠 연동 시 여기에 결제창 호출 코드 추가
    alert('결제 기능 준비 중입니다! (토스페이먼츠 연동 예정)')
  }

  return (
    <div style={styles.app}>
      <div style={styles.hero}>
        <span style={styles.heroEmoji}>✨</span>
        <h1 style={styles.heroTitle}>나의 연애·결혼 운세</h1>
        <p style={styles.heroSub}>사주 · MBTI · 혈액형으로 알아보는<br />이상형, 연애운, 결혼운</p>
      </div>

      <div style={styles.container}>

        {/* 기본 정보 */}
        <div style={styles.card}>
          <p style={styles.cardLabel}>기본 정보</p>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>이름 (선택)</label>
              <input type="text" placeholder="홍길동" value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>성별</label>
              <select value={form.gender} onChange={e => setForm(f => ({...f, gender: e.target.value}))}>
                <option value="">선택</option>
                <option value="여성">여성</option>
                <option value="남성">남성</option>
              </select>
            </div>
          </div>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>생년월일 *</label>
              <input type="date" value={form.birthdate}
                onChange={e => setForm(f => ({...f, birthdate: e.target.value}))} />
            </div>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>태어난 시간 (선택)</label>
              <input type="time" value={form.birthtime}
                onChange={e => setForm(f => ({...f, birthtime: e.target.value}))} />
            </div>
          </div>
        </div>

        {/* MBTI */}
        <div style={styles.card}>
          <p style={styles.cardLabel}>MBTI</p>
          <div style={styles.chipWrap}>
            {MBTI_LIST.map(m => (
              <button key={m} style={styles.chip(mbti === m)}
                onClick={() => setMbti(mbti === m ? '' : m)}>{m}</button>
            ))}
          </div>
        </div>

        {/* 혈액형 */}
        <div style={styles.card}>
          <p style={styles.cardLabel}>혈액형</p>
          <div style={styles.chipWrap}>
            {BLOOD_LIST.map(b => (
              <button key={b} style={styles.chip(blood === b)}
                onClick={() => setBlood(blood === b ? '' : b)}>{b}형</button>
            ))}
          </div>
        </div>

        {/* 운세 종류 */}
        <div style={styles.card}>
          <p style={styles.cardLabel}>무엇이 궁금하세요?</p>
          <div style={styles.typeGrid}>
            {FORTUNE_TYPES.map(t => (
              <button key={t.id} style={styles.typeBtn(type === t.id, t.free)}
                onClick={() => { setType(t.id); setResult(null); setShowPayment(false) }}>
                <span style={styles.typeBtnEmoji}>{t.emoji}</span>
                <span style={styles.typeBtnLabel(type === t.id)}>{t.label}</span>
                <span style={styles.typeBtnDesc}>{t.desc}</span>
                <span style={t.free ? styles.freeBadge : styles.paidBadge}>
                  {t.free ? '무료' : '1,900원'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <button style={styles.submitBtn(loading || !form.birthdate)}
          onClick={handleAnalyze}
          disabled={loading || !form.birthdate}>
          {loading ? '분석 중...' : isFree ? '무료 분석하기' : '분석하기 (1,900원)'}
        </button>

        {/* 로딩 */}
        {loading && (
          <div style={styles.resultCard}>
            <div style={styles.loading}>
              {[0,1,2].map(i => <div key={i} style={styles.dot(i)} />)}
              <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                🔮 운명의 데이터 분석 중... 약 30초 소요됩니다!              </span>
            </div>
          </div>
        )}

        {/* 결제 유도 */}
        {showPayment && (
          <div style={styles.paymentNudge}>
            <p style={styles.payNudgeTitle}>🔒 프리미엄 콘텐츠예요</p>
            <p style={styles.payNudgeSub}>
              {selectedType?.label} 분석은 유료 서비스예요.<br />
              단 1,900원으로 상세한 운세를 확인하세요.
            </p>
            <button style={styles.payBtn} onClick={handlePay}>
              💳 1,900원 결제하고 보기
            </button>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div style={styles.resultCard}>
            <div style={styles.resultHeader}>
              <span style={styles.resultEmoji}>{selectedType?.emoji}</span>
              <span style={styles.resultTitle}>{form.name || '당신'}의 {result.type}</span>
              <span style={styles.resultBadge}>{result.type}</span>
            </div>
            <p style={styles.resultText}>{result.result}</p>
          </div>
        )}

      </div>
    </div>
  )
}
