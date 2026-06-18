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

const 일주타입명 = {
  '甲子': { name: '고요한 선구자형', desc: '물 위에 뿌리내린 나무, 조용하지만 멈추지 않는다' },
  '甲寅': { name: '천하제일형', desc: '나무 위의 나무, 타고난 리더십으로 판을 만든다' },
  '甲辰': { name: '용의 날개형', desc: '땅속 용처럼 때를 기다렸다 한 번에 도약한다' },
  '甲午': { name: '태양의 나무형', desc: '빛을 향해 끝없이 자라는, 열정이 무기인 사람' },
  '甲申': { name: '벼락출세형', desc: '금이 나무를 다듬듯, 시련이 나를 완성시킨다' },
  '甲戌': { name: '황야의 개척자형', desc: '척박한 땅에서도 뿌리내리는 불굴의 생명력' },
  '乙丑': { name: '뚝심 승부사형', desc: '느리지만 반드시 이긴다, 포기를 모르는 덩굴' },
  '乙卯': { name: '봄의 주인공형', desc: '제철을 만난 꽃처럼, 빛날 때 확실히 빛난다' },
  '乙巳': { name: '화려한 생존형', desc: '불 속에서도 피어나는 꽃, 위기가 오히려 기회다' },
  '乙未': { name: '부드러운 강자형', desc: '겉은 온화하지만 속은 단단한 대나무 같은 사람' },
  '乙酉': { name: '정밀한 장인형', desc: '금속 위의 꽃, 디테일로 승부하는 완벽주의자' },
  '乙亥': { name: '깊은 물의 꽃형', desc: '수면 아래 조용히 피어나는 연꽃, 내면이 무기다' },
  '丙子': { name: '냉철한 태양형', desc: '뜨거운 열정 속 차가운 이성, 감성과 논리를 동시에' },
  '丙寅': { name: '천하를 밝히는형', desc: '숲 위로 떠오르는 태양, 타고난 카리스마로 무대를 장악한다' },
  '丙辰': { name: '폭발적 에너지형', desc: '용과 태양의 만남, 한번 불붙으면 아무도 못 막는다' },
  '丙午': { name: '순수 불꽃형', desc: '가장 뜨겁고 가장 순수한 불, 진심이 모든 걸 이긴다' },
  '丙申': { name: '빛나는 검형', desc: '태양이 금속을 달구듯, 열정이 재능을 날카롭게 한다' },
  '丙戌': { name: '황혼의 빛형', desc: '지는 해가 가장 아름답듯, 후반으로 갈수록 빛난다' },
  '丁丑': { name: '동토의 불꽃형', desc: '차가운 땅 속 꺼지지 않는 불씨, 역경이 연료다' },
  '丁卯': { name: '봄밤의 촛불형', desc: '부드럽고 따뜻하게 주변을 밝히는, 사람을 끄는 매력' },
  '丁巳': { name: '불의 정수형', desc: '불 속의 불, 한 분야에서 최고가 되기 위해 태어났다' },
  '丁未': { name: '여름 밤하늘형', desc: '뜨거운 감성과 깊은 내면, 예술적 영혼의 소유자' },
  '丁酉': { name: '보석 세공사형', desc: '정밀한 불꽃이 원석을 보석으로, 집중력이 압도적이다' },
  '丁亥': { name: '깊은 바다의 등대형', desc: '어둠 속에서도 방향을 잃지 않는, 타인의 나침반' },
  '戊子': { name: '지혜로운 산형', desc: '물을 품은 산처럼, 유연함과 단단함을 동시에 가졌다' },
  '戊寅': { name: '대산의 호랑이형', desc: '산 위의 호랑이, 한번 마음먹으면 반드시 정상에 선다' },
  '戊辰': { name: '대지의 용형', desc: '대륙을 움직이는 힘, 스케일이 남다른 대기만성형' },
  '戊午': { name: '타오르는 대지형', desc: '태양이 내리쬐는 산, 에너지 넘치고 추진력이 폭발한다' },
  '戊申': { name: '철옹산형', desc: '금을 품은 산, 한번 결심하면 누구도 흔들 수 없다' },
  '戊戌': { name: '불굴의 영토형', desc: '불을 품은 땅, 강한 의지로 자기만의 세계를 구축한다' },
  '己丑': { name: '묵묵한 수확자형', desc: '차가운 논밭을 일구는 농부, 성실함이 결국 이긴다' },
  '己卯': { name: '봄밭의 씨앗형', desc: '때를 알고 싹을 틔운다, 준비된 자에게 기회가 온다' },
  '己巳': { name: '뜨거운 대지형', desc: '불 위의 땅, 뜨거운 열정으로 무엇이든 키워낸다' },
  '己未': { name: '풍요로운 들판형', desc: '여름 들판처럼 풍성한 감수성, 사람을 살리는 따뜻함' },
  '己酉': { name: '정돈된 수확형', desc: '논밭 위의 금, 체계적이고 완성도 높은 결과물을 낸다' },
  '己亥': { name: '물을 품은 땅형', desc: '깊은 땅속 지하수처럼, 보이지 않는 곳에서 세상을 지탱한다' },
  '庚子': { name: '냉철한 원석형', desc: '물속의 쇠, 감성을 품은 원칙주의자' },
  '庚寅': { name: '호랑이 발톱형', desc: '날카롭고 강렬하게, 한번 목표를 잡으면 놓지 않는다' },
  '庚辰': { name: '용광로형', desc: '거대한 용이 금속을 녹이듯, 압도적인 존재감으로 판을 바꾼다' },
  '庚午': { name: '불꽃 단련형', desc: '불로 단련된 검, 시련을 거칠수록 더 빛난다' },
  '庚申': { name: '최강 원칙형', desc: '금 위의 금, 기준이 가장 높고 가장 단단한 사람' },
  '庚戌': { name: '불 속의 강철형', desc: '제련이 끝난 강철, 완성된 자신만의 세계가 있다' },
  '辛丑': { name: '땅속 보석형', desc: '아직 발견되지 않은 보석, 늦게 빛나지만 가장 오래 빛난다' },
  '辛卯': { name: '봄의 보석형', desc: '봄 숲속 빛나는 이슬, 섬세함과 감각으로 사람을 매료시킨다' },
  '辛巳': { name: '불꽃 보석형', desc: '불에 정제된 보석, 극한의 압력이 나를 완성시킨다' },
  '辛未': { name: '여름 보석형', desc: '따뜻한 감성의 보석, 공감 능력으로 사람의 마음을 얻는다' },
  '辛酉': { name: '순수 보석형', desc: '가장 정교하고 가장 아름다운, 완벽을 추구하는 장인' },
  '辛亥': { name: '깊은 물속 보석형', desc: '수면 아래 빛나는 보석, 알수록 더 매력적인 사람' },
  '壬子': { name: '깊은 바다형', desc: '가장 깊고 넓은 물, 끝을 알 수 없는 무한한 가능성' },
  '壬寅': { name: '폭포형', desc: '산에서 내리꽂히는 폭포, 거침없는 추진력으로 판을 뒤집는다' },
  '壬辰': { name: '용이 된 강형', desc: '용이 사는 강, 한번 흐르기 시작하면 아무도 막을 수 없다' },
  '壬午': { name: '뜨거운 강형', desc: '태양 아래 달리는 강, 열정과 유연함이 공존하는 희귀한 사람' },
  '壬申': { name: '금산에서 솟는 샘형', desc: '바위를 뚫고 나오는 물, 어떤 장벽도 돌아서 흐른다' },
  '壬戌': { name: '대지를 적시는형', desc: '사막을 적시는 비, 척박한 환경을 기회로 바꾸는 능력' },
  '癸丑': { name: '동토의 지하수형', desc: '얼어붙은 땅 아래 흐르는 물, 겉과 속이 전혀 다른 사람' },
  '癸卯': { name: '봄비형', desc: '봄을 깨우는 첫 비, 조용하지만 세상을 바꾸는 힘이 있다' },
  '癸巳': { name: '신비한 증기형', desc: '불 위의 물이 만드는 안개, 아무도 예측할 수 없는 매력' },
  '癸未': { name: '여름 소나기형', desc: '뜨거운 여름을 식히는 소나기, 나타나면 분위기가 바뀐다' },
  '癸酉': { name: '이슬형', desc: '새벽 이슬처럼 섬세하고 순수한, 디테일에서 차이가 난다' },
  '癸亥': { name: '대해의 근원형', desc: '모든 물의 시작점, 깊이를 알 수 없는 내면의 소유자' },
}
const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const BLOOD_LIST = ['A', 'B', 'O', 'AB']
const STEPS = ['gender', 'marital', 'birthdate', 'birthtime', 'mbti', 'blood']
const API_URL = 'https://love-fortune.onrender.com'
const IS_ADMIN = new URLSearchParams(window.location.search).get('admin') === 'bomgyeol2026'

const LOADING_STAGES = ['사주 데이터를 읽고 있어요', '기운의 흐름을 분석하고 있어요', '당신만의 풀이를 만들고 있어요']

function removeMarkers(text) {
  return text.split('===').filter((_, i) => i % 2 === 0).join('').replace(/\n{3,}/g, '\n\n').replace(/^#{1,6}\s*/gm, '').trim()
}
function parseSections(text) {
  const sections = []
  const seen = new Set()
  const parts = text.split(/===(.+?)===/s)
  if (parts[0]?.trim()) sections.push({ title: '분석 결과', content: parts[0].trim() })
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim()
    if (!seen.has(title)) { seen.add(title); sections.push({ title, content: parts[i + 1]?.trim() || '' }) }
  }
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

function DateRow({ year, setYear, month, setMonth, day, setDay, lunar, setLunar }) {
  return (
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
}


function Accordion({ title, content, isPaid = false, isChild = false, isGunghab = false, isGilil = false, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const borderColor = isGunghab ? 'rgba(155,29,58,0.4)' : isChild ? 'rgba(45,122,82,0.4)' : isGilil ? 'rgba(201,168,76,0.4)' : isPaid ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'
  const openBg = isGunghab ? 'rgba(155,29,58,0.1)' : isChild ? 'rgba(45,122,82,0.1)' : 'rgba(201,168,76,0.08)'
  return (
    <div style={{ marginBottom: 10, border: `1px solid ${borderColor}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px', cursor: 'pointer', background: open ? openBg : '#0D1B3E', transition: 'all 0.2s' }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 17, fontWeight: 700, color: open ? '#C9A84C' : 'rgba(255,255,255,0.85)', flex: 1, wordBreak: 'keep-all' }}>{title}</span>
        <span style={{ fontSize: 14, color: 'rgba(201,168,76,0.5)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 12 }}>▼</span>
      </div>
      {open && <div style={{ wordBreak: 'keep-all', padding: '20px 20px', fontSize: 18, lineHeight: 2.2, color: 'rgba(255,255,255,0.88)', whiteSpace: 'pre-wrap', background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.1)' }}>{content}</div>}    </div>
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
    if (_mobilePayment === 'paid' && _impSuccess === 'true') {
      const t = setTimeout(() => { handlePaidAnalyze(null); window.history.replaceState({}, '', window.location.pathname) }, 300)
      return () => clearTimeout(t)
    }
    if (_mobilePayment === 'paid' && _impSuccess === 'false') { alert('결제가 취소되었습니다.'); window.history.replaceState({}, '', window.location.pathname) }
    if (_mobilePayment === 'deep' && _impSuccess === 'true') {
      const t = setTimeout(() => { handleDeepAnalyze(); window.history.replaceState({}, '', window.location.pathname) }, 300)
      return () => clearTimeout(t)
    }
    if (_mobilePayment === 'deep' && _impSuccess === 'false') { alert('결제가 취소되었습니다.'); window.history.replaceState({}, '', window.location.pathname) }
    if (_mobilePayment === 'gilil' && _impSuccess === 'true') {
      const t = setTimeout(() => { handleGililAnalyze(); window.history.replaceState({}, '', window.location.pathname) }, 300)
      return () => clearTimeout(t)
    }
    if (_mobilePayment === 'gilil' && _impSuccess === 'false') { alert('결제가 취소되었습니다.'); window.history.replaceState({}, '', window.location.pathname) }
  }, []) // eslint-disable-line

  const [countdown, setCountdown] = useState(getMidnightCountdown())
  useEffect(() => { const id = setInterval(() => setCountdown(getMidnightCountdown()), 1000); return () => clearInterval(id) }, [])

  const [screen, setScreen] = useState(() => {
    if (_mobilePayment === 'gunghab' && _impSuccess === 'true') return 'result'
    if (_mobilePayment === 'paid' && _impSuccess === 'true') return 'result'
    if (_mobilePayment === 'deep' && _impSuccess === 'true') return 'deep_result'
    if (_mobilePayment === 'gilil' && _impSuccess === 'true') return 'gilil_result'
    return 'landing'
  })
  const [serviceType, setServiceType] = useState(() => {
    if (_mobilePayment === 'gunghab' && _impSuccess === 'true') return 'gunghab'
    if (_mobilePayment === 'paid' && _impSuccess === 'true') return _qs.get('st') || 'saju'
    return null
  })
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState(() => _qs.get('g') || '')
  const [maritalStatus, setMaritalStatus] = useState(() => _qs.get('ms') || '')
  const [birthYear, setBirthYear] = useState(() => _qs.get('by') || '')
  const [birthMonth, setBirthMonth] = useState(() => _qs.get('bm') || '')
  const [birthDay, setBirthDay] = useState(() => _qs.get('bd') || '')
  const [isLunar, setIsLunar] = useState(() => _qs.get('il') === '1')
  const [timeHour, setTimeHour] = useState('')
  const [timeMin, setTimeMin] = useState('')
  const [timeAmPm, setTimeAmPm] = useState('오전')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [mbti, setMbti] = useState(() => _qs.get('mbti') || '')
  const [blood, setBlood] = useState(() => _qs.get('blood') || '')
  const [phase, setPhase] = useState('input')
  const [sajuData, setSajuData] = useState(null)
  const [baseText, setBaseText] = useState('')
  const [paidText, setPaidText] = useState('')
  const [isPaidStreaming, setIsPaidStreaming] = useState(false)
  const [isBaseStreaming, setIsBaseStreaming] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [isDeepPaid, setIsDeepPaid] = useState(false)
  const [scoreData, setScoreData] = useState(null)
  const [emailModal, setEmailModal] = useState(null)
  const [preEmail, setPreEmail] = useState('')
  const [deepText, setDeepText] = useState('')
  const [isDeepStreaming, setIsDeepStreaming] = useState(false)
  const [openCheongan, setOpenCheongan] = useState(null)
  const [seasonData, setSeasonData] = useState(null)

  // ── 새로 추가된 로딩 state 3개 ──
  const [loadingPhase, setLoadingPhase] = useState(null)
  const [loadingCountdown, setLoadingCountdown] = useState(30)
  const [loadingStage, setLoadingStage] = useState(0)

  const [관계유형, set관계유형] = useState('연인')
  const [gunghabStep, setGunghabStep] = useState(0)
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
  const [gilil목적, setGilil목적] = useState(() => _qs.get('gp') || '')
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
          if (rsp.success) { if (window.fbq) fbq('track', 'Purchase', { value: 9900, currency: 'KRW' }); setScreen('deep_result'); handleDeepAnalyze() } else alert('결제가 취소되었습니다.')
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
    if (!res.ok) { onError?.(`서버 오류가 발생했습니다 (${res.status})`); return }
    const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''; let gotDone = false
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'saju') onSaju?.(json)
          else if (json.type === 'score') onBaseText?.(json.text)
          else if (json.type === 'paid_start') isPaidSectionRef.current = true
          else if (json.type === 'done') { gotDone = true; onDone?.() }
          else if (json.error) onError?.(json.error)
          else if (json.text) { if (isPaidSectionRef.current) onPaidText?.(json.text); else onBaseText?.(json.text) }
        } catch {}
      }
    }
    if (!gotDone) onError?.('서버 연결이 중단되었습니다. 다시 시도해주세요.')
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
        onBaseText: (t) => {
  setBaseText(prev => {
    const next = prev + t
    
    // 점수 JSON 파싱 시도
    const scoreMatch = next.match(/===__운세점수__===([\s\S]*?)(?:===|$)/);
if (scoreMatch) {
  try {
    const jsonStr = scoreMatch[1].match(/\{[\s\S]*?\}/)?.[0];
    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      if (parsed.종합) setScoreData(parsed);
    }
  } catch {}
}
    return next
  })
},
        onPaidText: () => {},
        onDone: () => {
          clearLoadingTimers(); setIsBaseStreaming(false); setPhase('done')
        },
        onError: (e) => { clearLoadingTimers(); alert(e); setPhase('input'); setIsBaseStreaming(false) },
      })
    } catch (e) {
      clearLoadingTimers()
      if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.')
      setPhase('input'); setIsBaseStreaming(false)
    }
  }

  async function handlePaidAnalyze(emailOverride) {
    const _paidQs = new URLSearchParams(window.location.search)
    const _isMobilePaid = _paidQs.get('payment') === 'paid'
    const _bt = _isMobilePaid ? (_paidQs.get('bt') || '') : birthtime
    const _st = _isMobilePaid ? (_paidQs.get('st') || serviceType) : serviceType
    setPaidText(''); setIsPaidStreaming(true); isPaidSectionRef.current = false
setLoadingCountdown(0)
loadingTimersRef.current.countdown = setInterval(() => {
  setLoadingCountdown(prev => prev + 1)
}, 1000)
    const apiType = _st === 'child' ? '자녀천명' : _st === '노후' ? '노후' : '전체'
    let _fullBase = '', _fullPaid = ''
    try {
      await streamAnalyze({
        body: { gender, maritalStatus, birthdate, birthtime: _bt, mbti, blood, type: apiType, isPaid: true, isLunar, userName: myName },
        onSaju: (d) => { setSajuData(d) },
        onBaseText: (t) => { setBaseText(prev => prev + t); _fullBase += t },
        onPaidText: (t) => { setPaidText(prev => prev + t); _fullPaid += t },
        onDone: () => {}, onError: (e) => alert(e),
      })
    } catch (e) { if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.') }
    clearLoadingTimers(); setIsPaidStreaming(false); setIsPaid(true)
    const _email = emailOverride || preEmail
    if (_email) {
      const label = _st === 'child' ? '🌱 자녀 학운 분석' : _st === '노후' ? '🌅 노후 운세 분석' : '✨ 나의 사주 분석'
      autoSendEmail({ email: _email, subject: `${label} - ${myName || ''}님의 결과`, sections: [...parseSections(_fullBase), ...parseSections(_fullPaid)], name: myName })
    }
  }

  async function handleDeepAnalyze() {
    const _deepQs = new URLSearchParams(window.location.search)
    const _isMobileDeep = _deepQs.get('payment') === 'deep'
    const _bt = _isMobileDeep ? (_deepQs.get('bt') || '') : birthtime
    setDeepText(''); setIsDeepStreaming(true); setSeasonData(null)
    setLoadingCountdown(0)
    loadingTimersRef.current.countdown = setInterval(() => {
      setLoadingCountdown(prev => prev + 1)
    }, 1000)
    let fullDeepText = ''
    try {
      const ctrl = new AbortController(); abortRef.current = ctrl
      const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, maritalStatus, birthdate, birthtime: _bt, mbti, blood, type: '심화', isPaid: true, isLunar, userName: myName }), signal: ctrl.signal })
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            if (json.text) {
              fullDeepText += json.text
              setDeepText(prev => prev + json.text)
              if (!seasonData) {
                const seasonMatch = fullDeepText.match(/===__운의계절__===([\s\S]*?)(?:===|$)/)
                if (seasonMatch) {
                  try {
                    const raw = seasonMatch[1]
                    let depth = 0, start = -1, end = -1
                    for (let ci = 0; ci < raw.length; ci++) {
                      if (raw[ci] === '{') { if (depth === 0) start = ci; depth++ }
                      else if (raw[ci] === '}') { depth--; if (depth === 0 && start !== -1) { end = ci; break } }
                    }
                    if (start !== -1 && end !== -1) {
                      const parsed = JSON.parse(raw.slice(start, end + 1))
                      if (parsed.current) setSeasonData(parsed)
                    }
                  } catch {}
                }
              }
            }
          } catch {}
        }
      }
    } catch (e) { if (e.name !== 'AbortError') alert('서버에 연결할 수 없습니다.') }
    clearLoadingTimers(); setIsDeepStreaming(false); setIsDeepPaid(true)
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
    setGunghabStep(1); set관계유형('연인'); setPartnerGender(''); setPartnerBirthYear(''); setPartnerBirthMonth(''); setPartnerBirthDay('')
    setPartnerIsLunar(false); setPartnerTimeHour(''); setPartnerTimeMin(''); setPartnerTimeAmPm('오전'); setPartnerTimeUnknown(false)
    setMyName(''); setPartnerName(''); setGunghabText(''); setIsGunghabStreaming(false); setGunghabSajuData(null)
    setGilil목적(''); setGililText(''); setIsGililStreaming(false); isPaidSectionRef.current = false
    setSeasonData(null); setDeepText(''); setIsDeepStreaming(false); setIsDeepPaid(false)
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
      const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, birthdate, birthtime: _birthtime, isLunar, partnerGender, partnerBirthdate, partnerBirthtime: _partnerBirthtime, partnerIsLunar, myName: myName || 'A', partnerName: partnerName || 'B', type: '궁합', isPaid: true, 관계유형 }), signal: ctrl.signal })
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
            onClick={() => { if (IS_ADMIN) { handleGililAnalyze(); return } const IMP = window.IMP; IMP.init('imp87662575'); const _gililParams = new URLSearchParams({ payment: 'gilil', gp: gilil목적, by: birthYear, bm: birthMonth, bd: birthDay }).toString(); IMP.request_pay({ pg: 'html5_inicis', pay_method: 'card', merchant_uid: `gilil_${Date.now()}`, name: '마이사주 길일 추천', amount: 9900, buyer_name: '고객', m_redirect_url: `${window.location.origin}${window.location.pathname}?${_gililParams}` }, (rsp) => { if (rsp.success) handleGililAnalyze(); else alert('결제가 취소되었습니다.') }) }}>
            📅 길일 찾기 (9,900원)
          </button>
        </div>
      </div>
    )
  }

  // ── 심화 결과 ──
  if (screen === 'deep_result') {
    const deepSections = parseSections(deepText)
    const seasonPhases = seasonData ? [
      { key: 'wood', icon: '木', color: '#4ADE80', bgColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.3)' },
      { key: 'fire', icon: '火', color: '#F87171', bgColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.3)' },
      { key: 'earth', icon: '土', color: '#C9A84C', bgColor: 'rgba(201,168,76,0.08)', borderColor: 'rgba(201,168,76,0.3)' },
      { key: 'metal', icon: '金', color: '#E8C96A', bgColor: 'rgba(232,201,106,0.08)', borderColor: 'rgba(232,201,106,0.3)' },
      { key: 'water', icon: '水', color: '#60A5FA', bgColor: 'rgba(96,165,250,0.08)', borderColor: 'rgba(96,165,250,0.3)' },
    ] : []
    return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #0D1B3E 0%, #050D1F 100%)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ fontSize: 36 }}>🔮</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>사주 심화 분석</h1>
        </div>
        <div id="deep-result-content" style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 40px', width: '100%', boxSizing: 'border-box' }}>
  {/* 사주팔자 카드 */}
  {sajuData?.사주 && (
    <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: '24px 20px', marginBottom: 20 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#C9A84C', marginBottom: 8, letterSpacing: '0.1em' }}>나의 사주팔자</p>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 18, textAlign: 'center', fontWeight: 500 }}>{sajuData.생년월일}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[{ label: '시주(時)', value: sajuData.사주.시주 }, { label: '일주(日)', value: sajuData.사주.일주 }, { label: '월주(月)', value: sajuData.사주.월주 }, { label: '년주(年)', value: sajuData.사주.년주 }].map(({ label, value }) => {
          const 오행색 = { '甲갑': '#4ADE80', '乙을': '#4ADE80', '丙병': '#F87171', '丁정': '#F87171', '戊무': '#C9A84C', '己기': '#C9A84C', '庚경': '#E8C96A', '辛신': '#E8C96A', '壬임': '#60A5FA', '癸계': '#60A5FA' }
          const 색 = 오행색[value?.slice(0, 2)] || '#FFFFFF'
          return (
            <div key={label} style={{ textAlign: 'center', background: `${색}15`, borderRadius: 12, padding: '18px 4px', border: `2px solid ${색}50` }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 10, display: 'block' }}>{label}</span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: 색, lineHeight: 1.2 }}>{value?.slice(0,1) || '-'}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{value?.slice(1,2) || ''}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 색, opacity: 0.7, marginTop: 2 }}>{value?.slice(2,3) || ''}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{value?.slice(3,4) || ''}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )}

  {/* 운세 점수 카드 */}
  {scoreData && (
    <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: '24px 20px', marginBottom: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'rgba(201,168,76,0.6)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6 }}>사주 기운 스탯</p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: 56, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>{scoreData.종합}</span>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)' }}>점</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>상위 {scoreData.종합 >= 90 ? '5' : scoreData.종합 >= 80 ? '15' : scoreData.종합 >= 70 ? '25' : scoreData.종합 >= 60 ? '40' : '50'}% 수준이에요</p>
      </div>
      <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: 16 }}>
        {[{ label: '재물운', score: scoreData.재물, color: '#7F77DD' }, { label: '애정운', score: scoreData.애정, color: '#D4537E' }, { label: '직업운', score: scoreData.직업, color: '#1D9E75' }, { label: '건강운', score: scoreData.건강, color: '#BA7517' }].map(({ label, score, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', width: 44, flexShrink: 0 }}>{label}</span>
            <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', width: 32, textAlign: 'right', flexShrink: 0 }}>{score}</span>
          </div>
        ))}
      </div>
    </div>
  )}

          {isDeepStreaming && (
            <div style={{ textAlign: 'center', padding: '16px', marginBottom: 16, fontSize: 15, color: 'rgba(201,168,76,0.7)', fontWeight: 700 }}>
              ✦ 심화 분석 중 · {loadingCountdown}초 경과 ✦
            </div>
          )}

          {isDeepStreaming && !deepText && (
            <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '24px 20px', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>🔮 심화 분석 중이에요...</span>
              </div>
            </div>
          )}
          {isDeepStreaming && deepText && (
            <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '16px 18px', marginBottom: 8, fontSize: 18, lineHeight: 2.2, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{removeMarkers(deepText)}<span style={{ opacity: 0.4 }}>▌</span></div>
          )}
          {!isDeepStreaming && deepSections.filter(sec => sec.title !== '분석 결과' && !sec.title.includes('운의계절') && sec.content?.trim()).map((sec, i) => <Accordion key={i} title={sec.title} content={sec.content} isPaid={true} defaultOpen={i === 0} />)}

          {/* 나의 운의 계절 타임라인 */}
          {!isDeepStreaming && seasonData && (
            <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: '28px 20px', marginTop: 20, marginBottom: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)', fontWeight: 600, letterSpacing: '0.15em', marginBottom: 8 }}>CAREER SEASON</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>나의 운의 계절</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>사주와 수비학 기반 오행 커리어 흐름</p>
              </div>

              {seasonData.yearsToEarth > 0 && (
                <div style={{ textAlign: 'center', marginBottom: 24, padding: '14px 16px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 12 }}>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>커리어/재물 정점까지</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 40, fontWeight: 900, color: '#C9A84C', lineHeight: 1 }}>{seasonData.yearsToEarth}</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(201,168,76,0.7)' }}>년 남았어요</span>
                  </div>
                </div>
              )}
              {seasonData.yearsToEarth === 0 && seasonData.current === 'earth' && (
                <div style={{ textAlign: 'center', marginBottom: 24, padding: '14px 16px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 12 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#C9A84C' }}>지금이 전성기입니다</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>커리어와 재물의 정점을 지나고 있어요</p>
                </div>
              )}

              <div style={{ position: 'relative', paddingLeft: 28 }}>
                {/* 타임라인 세로 선 */}
                <div style={{ position: 'absolute', left: 11, top: 24, bottom: 24, width: 2, background: 'rgba(201,168,76,0.15)' }} />

                {seasonPhases.map((phase, idx) => {
                  const data = seasonData[phase.key]
                  if (!data) return null
                  const isCurrent = seasonData.current === phase.key
                  const isPast = seasonPhases.findIndex(p => p.key === seasonData.current) > idx
                  return (
                    <div key={phase.key} style={{ position: 'relative', marginBottom: idx < seasonPhases.length - 1 ? 16 : 0 }}>
                      {/* 타임라인 점 */}
                      <div style={{
                        position: 'absolute', left: -22, top: 20,
                        width: isCurrent ? 18 : 12, height: isCurrent ? 18 : 12,
                        borderRadius: '50%',
                        background: isCurrent ? phase.color : isPast ? 'rgba(255,255,255,0.15)' : '#0D1B3E',
                        border: `2px solid ${isCurrent ? phase.color : isPast ? 'rgba(255,255,255,0.2)' : phase.borderColor}`,
                        marginLeft: isCurrent ? -3 : 0, marginTop: isCurrent ? -3 : 0,
                        boxShadow: isCurrent ? `0 0 12px ${phase.color}60` : 'none',
                        zIndex: 1,
                      }} />

                      <div style={{
                        background: isCurrent ? phase.bgColor : 'rgba(255,255,255,0.02)',
                        border: `${isCurrent ? 2 : 1}px solid ${isCurrent ? phase.color + '80' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 14,
                        padding: '18px 16px',
                        opacity: isPast ? 0.5 : 1,
                        transition: 'all 0.3s ease',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 28, fontWeight: 900, color: isCurrent ? phase.color : 'rgba(255,255,255,0.3)', fontFamily: 'Georgia, serif' }}>{phase.icon}</span>
                            <div>
                              <p style={{ fontSize: 15, fontWeight: 700, color: isCurrent ? '#FFFFFF' : 'rgba(255,255,255,0.6)' }}>{data.label?.split(' · ')[1] || data.label}</p>
                              <p style={{ fontSize: 12, color: isCurrent ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)', marginTop: 2 }}>{data.desc}</p>
                            </div>
                          </div>
                          {isCurrent && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: phase.color, background: phase.color + '20', padding: '3px 8px', borderRadius: 10, border: `1px solid ${phase.color}40` }}>NOW</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                          <span style={{ fontSize: 12, color: isCurrent ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)' }}>{data.start}년 ~ {data.end}년</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${data.score}%`, background: isCurrent ? phase.color : 'rgba(255,255,255,0.2)', borderRadius: 99, transition: 'width 1s ease' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? phase.color : 'rgba(255,255,255,0.3)' }}>{data.score}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
    const isStep0 = gunghabStep === 0
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

        return (
      <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 20px', background: 'linear-gradient(180deg, #0D1B3E 0%, #050D1F 100%)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 10 }}>合</div>
          <h1 style={{ wordBreak: 'keep-all', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>궁합 분석</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{isStep0 ? '어떤 관계를 분석할까요?' : isStep1 ? '먼저 내 정보를 입력해주세요' : '이제 상대방 정보를 입력해주세요'}</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 99, margin: '14px 0 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: isStep0 ? '33%' : isStep1 ? '66%' : '100%', background: '#C9A84C', borderRadius: 99, transition: 'width 0.35s ease' }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: 4, marginBottom: 8 }}>{isStep0 ? '1' : isStep1 ? '2' : '3'} / 3</p>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
          {isStep0 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>어떤 관계인가요?</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>관계에 맞는 분석을 해드려요</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { value: '직장상사', emoji: '👔', label: '직장 상사', sub: '왜 이 상사가 나를 힘들게 하는지' },
                  { value: '직장동료', emoji: '🤝', label: '직장 동료', sub: '같이 일하면 어떤 팀이 되는지' },
                  { value: '가족', emoji: '👨‍👩‍👧', label: '가족', sub: '왜 가족인데 이렇게 힘든지' },
                  { value: '친구', emoji: '👫', label: '오랜 친구', sub: '이 친구가 진짜 내 편인지' },
                  { value: '연인', emoji: '💕', label: '연인 / 부부', sub: '우리 잘 맞는지 사주로 확인' },
                ].map(({ value, emoji, label, sub }) => (
                  <button key={value}
                    style={{ padding: '18px 20px', border: `2px solid ${관계유형 === value ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, background: 관계유형 === value ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.15s' }}
                    onClick={() => set관계유형(value)}>
                    <span style={{ fontSize: 28 }}>{emoji}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 관계유형 === value ? '#C9A84C' : '#FFFFFF' }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {isStep1 && (
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
          )}
          {!isStep0 && !isStep1 && (
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
       {!isStep0 && !isStep1 && (
            <div style={{ marginTop: 32, background: 'linear-gradient(135deg, #0D1B3E 0%, #050D1F 100%)', border: '1px solid rgba(155,29,58,0.4)', borderRadius: 16, padding: '24px 20px', marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)', fontWeight: 600, letterSpacing: '0.12em', marginBottom: 14, textAlign: 'center' }}>✦ 결제하면 이런 내용을 확인할 수 있어요</p>
              {(() => {
                const isLover = 관계유형 === '연인'
                const thirdItem = isLover
                  ? { title: '결혼 궁합', blurred: '이 관계가 인연으로 묶이는 사주인지, 결혼 후 운의 흐름이 어떻게 달라지는지 분석해드려요.' }
                  : 관계유형 === '가족'
                  ? { title: '가족 인연', blurred: '이 가족이 사주적으로 어떤 인연으로 묶여있는지, 서로에게 어떤 의미를 주는 존재인지 분석해드려요.' }
                  : 관계유형 === '친구'
                  ? { title: '우정의 깊이', blurred: '이 친구와의 인연이 사주적으로 얼마나 깊은지, 앞으로도 계속 함께할 인연인지 짚어드려요.' }
                  : { title: '직장 내 영향력', blurred: '이 사람과의 관계가 회사 내에서 내 입지나 평판에 어떤 영향을 주는지, 함께 일할 때 주의해야 할 포인트를 짚어드려요.' }
                return [
                  { title: isLover ? '성격 궁합' : '성격 케미', preview: '두 사람은 겉으로 보기엔 달라 보이지만, 사주 구조상 서로의 빈자리를 채워주는 관계예요.', blurred: '한 사람이 불을 지피면 다른 한 사람이 방향을 잡아주는 구조라 함께할수록 시너지가 나요. 단, 속도 차이에서 오는 충돌이 생길 수 있고 이걸 어떻게 다루느냐가 관건이에요.' },
                  { title: 관계유형 === '연인' ? '돈 궁합' : '재물 운', preview: null, blurred: '두 사람이 같이 있을 때 돈이 모이는 구조인지, 아니면 쓰게 되는 구조인지 사주에 다 나와요. 공동 투자나 재정 운용 방향도 확인할 수 있어요.' },
                  { title: thirdItem.title, preview: null, blurred: thirdItem.blurred },
                  { title: '두 사람의 앞으로 3년', preview: null, blurred: '2025~2027년, 두 사람에게 가장 중요한 시기가 언제인지, 함께 올라타야 할 타이밍과 조심해야 할 구간이 나와요.' },
                  { title: isLover ? '궁합 총평' : '관계 총평', preview: null, blurred: '이 사주 조합이 전체적으로 어떤 관계인지, 잘 맞는 이유와 주의할 점을 한 번에 정리해드려요.' },
                ]
              })().map((item, idx) => (
                <div key={idx} style={{ marginBottom: 10, padding: '14px 16px', background: 'rgba(155,29,58,0.06)', borderRadius: 10, border: '1px solid rgba(155,29,58,0.2)' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#C9A84C', marginBottom: item.preview ? 8 : 0 }}>✦ {item.title}</p>
                  {item.preview && (
                    <div style={{ fontSize: 16, lineHeight: 2.0, color: 'rgba(255,255,255,0.75)', wordBreak: 'keep-all' }}>
                      <span>{item.preview}</span>
                      <span style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>{item.blurred}</span>
                    </div>
                  )}
                  {!item.preview && (
                    <div style={{ fontSize: 16, lineHeight: 2.0, color: 'rgba(255,255,255,0.3)', filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none', wordBreak: 'keep-all' }}>
                      {item.blurred}
                    </div>
                  )}
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 12 }}>↓ 아래 버튼으로 1,900원에 전체 확인</p>
            </div>
          )}
        </div>
        <div style={{ position: 'fixed', bottom: 0, background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.15)', padding: '12px 16px 24px', display: 'flex', gap: 10, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
          <button style={{ flex: '0 0 auto', padding: '14px 20px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 15, cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }} onClick={() => {
  if (isStep0) setScreen('landing')
  else if (isStep1) setGunghabStep(0)
  else setGunghabStep(1)
}}>←</button>
          <button style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 600, background: (isStep0 ? false : isStep1 ? !canStep1Next : !canStep2Next) ? 'rgba(201,168,76,0.2)' : '#C9A84C', color: (isStep0 ? false : isStep1 ? !canStep1Next : !canStep2Next) ? 'rgba(255,255,255,0.3)' : '#0A1628', border: 'none', borderRadius: 10, cursor: (isStep0 ? false : isStep1 ? !canStep1Next : !canStep2Next) ? 'not-allowed' : 'pointer' }}
            disabled={isStep0 ? !관계유형 : isStep1 ? !canStep1Next : !canStep2Next}
           onClick={() => {
  if (isStep0) { setGunghabStep(1); return }
  if (isStep1) { setGunghabStep(2); return }
              if (IS_ADMIN) { handleGunghabAnalyze(null); return }
              const IMP = window.IMP; IMP.init('imp87662575')
              const _pbt = (() => { if (partnerTimeUnknown) return ''; if (!partnerTimeHour || !partnerTimeMin) return ''; let h = Number(partnerTimeHour); if (partnerTimeAmPm === '오전' && h === 12) h = 0; if (partnerTimeAmPm === '오후' && h !== 12) h += 12; return `${String(h).padStart(2,'0')}:${String(partnerTimeMin).padStart(2,'0')}` })()
              const _params = new URLSearchParams({ payment: 'gunghab', imp_success: 'true', g: gender, by: birthYear, bm: birthMonth, bd: birthDay, il: isLunar ? '1' : '0', bt: birthtime || '', mn: myName || '', pn: partnerName || '', pg: partnerGender, pby: partnerBirthYear, pbm: partnerBirthMonth, pbd: partnerBirthDay, ptu: partnerTimeUnknown ? '1' : '0', pil: partnerIsLunar ? '1' : '0', pbt: _pbt, ptap: partnerTimeAmPm }).toString()
              IMP.request_pay({ pg: 'html5_inicis', pay_method: 'card', merchant_uid: `gunghab_${Date.now()}`, name: '마이사주 궁합 분석', amount: 1900, buyer_name: myName || '고객', m_redirect_url: `${window.location.origin}${window.location.pathname}?${_params}` }, (rsp) => { if (rsp.success) handleGunghabAnalyze(null); else alert('결제가 취소되었습니다.') })
            }}>
            {isStep0 ? '다음 — 내 정보 입력' : isStep1 ? '다음 — 상대방 정보 입력' : '💕 관계 분석받기 (1,900원)'}
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
            {관계유형 === '연인' && <span style={{ fontSize: 36 }}>💕</span>}
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginTop: 8 }}>{관계유형 === '연인' ? '두 사람의 궁합 분석' : '두 사람의 사주 분석'}</h2>
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
          {isGunghabStreaming && gunghabText && <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '16px 18px', marginBottom: 8, fontSize: 18, lineHeight: 2.2, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{removeMarkers(gunghabText)}<span style={{ opacity: 0.4 }}>▌</span></div>}
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
      <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 20, padding: '36px 28px', maxWidth: 380, width: '100%' }}>
        <p style={{ fontSize: 32, textAlign: 'center', marginBottom: 10 }}>📧</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#C9A84C', textAlign: 'center', marginBottom: 20, wordBreak: 'keep-all', lineHeight: 1.4 }}>결과 받을 이메일을<br/>입력해주세요</p>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 2.2, margin: 0 }}>
            📱 모바일에서는 결과 저장이 안 될 수 있어요.<br/>
            💻 PC에서는 PDF로 저장 가능해요.<br/>
            📩 이메일로 결과를 보내드릴게요.<br/>
            🔒 이메일은 결과 발송에만 사용됩니다.
          </p>
        </div>
        <input
          type="email"
          placeholder="이메일 주소 입력"
          value={preEmail}
          onChange={e => setPreEmail(e.target.value)}
          style={{ width: '100%', padding: '16px 18px', fontSize: 17, border: '1px solid rgba(201,168,76,0.4)', borderRadius: 12, background: '#FFFFFF', color: '#1B1B1B', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
        <button
          style={{ width: '100%', padding: '18px', fontSize: 17, fontWeight: 800, background: 'linear-gradient(135deg, #C9A84C, #F5E090)', color: '#0A1628', border: 'none', borderRadius: 12, cursor: 'pointer', marginBottom: 12, letterSpacing: '0.02em' }}
          onClick={() => { if (!preEmail || !preEmail.includes('@')) { alert('이메일 주소를 확인해주세요.'); return } const cb = emailModal.onConfirm; setEmailModal(null); cb(preEmail) }}>
          결제하기 →
        </button>
        <button
          style={{ width: '100%', padding: '14px', fontSize: 15, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}
          onClick={() => { const cb = emailModal.onConfirm; setEmailModal(null); cb(null) }}>
          이메일 없이 결제하기
        </button>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 6 }}>이메일 없이 결제하면 결과를 저장할 수 없어요.</p>
      </div>
    </div>
  )
}

  // ── 랜딩 ──
  if (screen === 'landing') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#050D1F' }}>
        <div style={{ position: 'relative' }}>          <div style={{ position: 'relative', textAlign: 'center', padding: '52px 24px 36px', margin: '20px 16px 0', borderRadius: 16, border: '1px solid rgba(201,168,76,0.5)', background: 'rgba(5,13,31,0.6)', backdropFilter: 'blur(8px)', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
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
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: 24 }}>타이밍이 달랐던 거예요.<br/><span style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15 }}>사주가 찍어드릴게요.</span></p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.5)', padding: '9px 22px', borderRadius: 20, fontSize: 13, color: '#C9A84C', fontWeight: 600 }}>
              <span>⏰</span><span>오늘만 <span style={{ fontWeight: 800 }}>1,900원</span></span>
            </div>
          </div>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 24px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', wordBreak: 'keep-all', fontWeight: 700 }}>내가 크게 벌 수 있는 시기가 따로 있어요.<br/>모르면, 남이 가져가요.</p>
            <div style={{ width: 30, height: 1, background: 'rgba(201,168,76,0.3)', margin: '20px auto' }}/>
            <p style={{ fontSize: 17, lineHeight: 1.75, color: '#C9A84C', wordBreak: 'keep-all', fontWeight: 700 }}>지금 내 사주, 1,900원이면 충분해요.<br/>철학관 가기 전에 먼저 보세요.</p>
<button
  style={{ marginTop: 20, width: '100%', padding: '16px', fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, #C9A84C, #F5E090)', color: '#0A1628', border: 'none', borderRadius: 12, cursor: 'pointer' }}
  onClick={() => { setServiceType('saju'); setScreen('input') }}>
  내 돈 버는 시기 지금 확인하기 →
</button>
          </div>
        </div>


        {/* 서비스 카드 */}
        <div style={{ background: '#0A1628' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px 48px', width: '100%', boxSizing: 'border-box' }}>
            <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.7)', textAlign: 'center', marginBottom: 4, fontWeight: 600, letterSpacing: '0.12em' }}>SERVICES</p>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20, fontWeight: 700 }}>내 돈 버는 시기, 골라서 확인하세요</p>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
  {[
    {
      type: 'saju', char: '命', label: '나의 사주',
      badge: 'FREE PREVIEW',
      hook: '지금 돈이 들어오는 구조인지\n아직도 모르고 열심히만 하고 있어요?',
      border: 'rgba(201,168,76,0.3)', bg: 'rgba(201,168,76,0.06)'
    },
    {
      type: 'gunghab', char: '合', label: '궁합',
      hook: '그 사람이 나한테\n이득인 사람인지 사주에 나와요.',
      border: 'rgba(155,29,58,0.3)', bg: 'rgba(155,29,58,0.06)',
      onClick: () => { setServiceType('gunghab'); setGunghabStep(0); set관계유형('연인'); setScreen('gunghab_input') }
    },
    {
      type: 'child', char: '子', label: '혼냈던 게 재능이었어요',
      hook: '화냈던 게 성격 문제가 아니에요.\n타고난 기질이 달랐던 거예요.',
      border: 'rgba(45,122,82,0.3)', bg: 'rgba(45,122,82,0.06)'
    },
    {
      type: '노후', char: '老', label: '내 후반전',
      hook: '버티는 게 맞는지, 정리할 타이밍인지\n사주에 다 나와요.',
      border: 'rgba(45,106,155,0.3)', bg: 'rgba(45,106,155,0.06)'
    },
  ].map(({ type, char, label, hook, badge, border, bg, onClick }) => (
    <div key={type} onClick={onClick || (() => { setServiceType(type); setScreen('input') })} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: 220, cursor: 'pointer' }}>
      {badge && (
        <span style={{ display: 'inline-block', background: 'rgba(201,168,76,0.15)', color: '#C9A84C', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 2, marginBottom: 12, border: '1px solid rgba(201,168,76,0.3)', letterSpacing: '0.1em' }}>{badge}</span>
      )}
      <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 10, marginTop: badge ? 0 : 22 }}>{char}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginBottom: 8, textAlign: 'center' }}>{label}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, whiteSpace: 'pre-line', textAlign: 'center', marginBottom: 14, wordBreak: 'keep-all' }}>{hook}</div>
      <button
        style={{ width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 800, background: 'transparent',
color: '#C9A84C',
border: '1px solid rgba(201,168,76,0.5)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        onClick={e => { e.stopPropagation(); (onClick || (() => { setServiceType(type); setScreen('input') }))() }}>
        지금 확인하기 1,900원
      </button>
    </div>
  ))}
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
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              <button onClick={() => setScreen('terms')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>이용약관</button>
<button onClick={() => setScreen('privacy')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>개인정보처리방침</button>
<button onClick={() => setScreen('refund')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>환불정책</button>
<button onClick={() => window.open('https://open.kakao.com/me/mysajushop', '_blank')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>고객문의</button>            </div>
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
      {/* 헤더 */}
      <div style={{ textAlign: 'center', padding: '36px 24px 20px', background: 'linear-gradient(180deg, #0D1B3E 0%, #050D1F 100%)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: '#C9A84C', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 12 }}>{serviceChar[serviceType] || '命'}</div>
        <h1 style={{ wordBreak: 'keep-all', fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginBottom: 8 }}>{serviceNames[serviceType] || '사주 분석'}</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>생년월일을 입력하면 무료로 먼저 확인해드려요</p>
      </div>

      {/* 진행바 */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, margin: '16px 0 0', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #C9A84C, #F5E090)', borderRadius: 99, transition: 'width 0.35s ease' }} />
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: 6 }}>{step + 1} / {STEPS.length}</p>
      </div>

      {/* 본문 */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 20px 120px', width: '100%', boxSizing: 'border-box', flex: 1 }}>

        {/* 섹션 제목 */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, wordBreak: 'keep-all', margin: 0, marginBottom: 8 }}>
            {currentStepId === 'gender' && '성별을 알려주세요'}
            {currentStepId === 'marital' && '결혼 상태를 알려주세요'}
            {currentStepId === 'birthdate' && '생년월일을 알려주세요'}
            {currentStepId === 'birthtime' && '태어난 시간을 알려주세요'}
            {currentStepId === 'mbti' && 'MBTI를 선택해주세요'}
            {currentStepId === 'blood' && '혈액형을 선택해주세요'}
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {currentStepId === 'gender' && '사주 풀이에 사용돼요'}
            {currentStepId === 'marital' && '사주 풀이에 사용돼요'}
            {currentStepId === 'birthdate' && '숫자로 직접 입력해주세요'}
            {currentStepId === 'birthtime' && '모르셔도 괜찮아요'}
            {currentStepId === 'mbti' && '모르시면 건너뛰어도 돼요'}
            {currentStepId === 'blood' && '선택하지 않아도 분석은 가능해요'}
          </p>
        </div>

        {/* ── 성별 ── */}
        {currentStepId === 'gender' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(201,168,76,0.7)', marginBottom: 10 }}>이름 (선택)</p>
              <input
                style={{ width: '100%', fontSize: 18, padding: '18px 20px', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 14, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', boxSizing: 'border-box', outline: 'none' }}
                type="text" placeholder="이름을 입력해주세요" value={myName} onChange={e => setMyName(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {['여성','남성'].map(g => (
                <button key={g}
                  style={{ padding: '40px 16px', border: `2px solid ${gender === g ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 16, background: gender === g ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, transition: 'all 0.15s' }}
                  onClick={() => setGender(g)}>
                  <span style={{ fontSize: 44 }}>{g === '여성' ? '♀️' : '♂️'}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: gender === g ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>{g}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── 결혼 상태 ── */}
        {currentStepId === 'marital' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[{ value: '미혼', emoji: '💫', sub: '결혼 전이거나 현재 혼자예요' }, { value: '기혼', emoji: '💍', sub: '결혼해서 살고 있어요' }].map(({ value, emoji, sub }) => (
              <button key={value}
                style={{ padding: '28px 24px', border: `2px solid ${maritalStatus === value ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 16, background: maritalStatus === value ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20, transition: 'all 0.15s' }}
                onClick={() => setMaritalStatus(value)}>
                <span style={{ fontSize: 40 }}>{emoji}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: maritalStatus === value ? '#C9A84C' : '#FFFFFF' }}>{value}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── 생년월일 ── */}
        {currentStepId === 'birthdate' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {[['양력 🌞', false], ['음력 🌙', true]].map(([label, val]) => (
                <button key={label}
                  style={{ flex: 1, padding: '16px', fontSize: 16, fontWeight: isLunar === val ? 700 : 400, border: `2px solid ${isLunar === val ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 12, background: isLunar === val ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: isLunar === val ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                  onClick={() => setIsLunar(val)}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <input
                style={{ width: 108, flexShrink: 0, padding: '22px 4px', fontSize: 24, fontWeight: 800, border: '1px solid rgba(201,168,76,0.25)', borderRadius: 14, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }}
                type="number" inputMode="numeric" placeholder="년도" value={birthYear} onChange={e => setBirthYear(e.target.value.slice(0,4))} />
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>년</span>
              <input
                style={{ width: 66, flexShrink: 0, padding: '22px 4px', fontSize: 24, fontWeight: 800, border: '1px solid rgba(201,168,76,0.25)', borderRadius: 14, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }}
                type="number" inputMode="numeric" placeholder="월" value={birthMonth} onChange={e => setBirthMonth(e.target.value.slice(0,2))} />
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>월</span>
              <input
                style={{ width: 66, flexShrink: 0, padding: '22px 4px', fontSize: 24, fontWeight: 800, border: '1px solid rgba(201,168,76,0.25)', borderRadius: 14, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }}
                type="number" inputMode="numeric" placeholder="일" value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0,2))} />
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>일</span>
            </div>
            {birthdateValid && (
              <p style={{ fontSize: 16, color: '#C9A84C', textAlign: 'center', fontWeight: 700, marginTop: 8 }}>
                ✓ {birthYear}년 {birthMonth}월 {birthDay}일 {isLunar ? '(음력)' : '(양력)'}
              </p>
            )}
          </>
        )}

        {/* ── 시간 ── */}
        {currentStepId === 'birthtime' && (
          <>
            <button
              style={{ width: '100%', padding: '20px 16px', border: `2px solid ${timeUnknown ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 14, background: timeUnknown ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeUnknown ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: timeUnknown ? 700 : 400, cursor: 'pointer', textAlign: 'center', marginBottom: 24 }}
              onClick={() => { setTimeUnknown(true); setTimeHour(''); setTimeMin('') }}>
              ✓ 태어난 시간 모름
            </button>
            {!timeUnknown && (
              <>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(201,168,76,0.7)', marginBottom: 12 }}>오전 / 오후</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  {['오전','오후'].map(ap => (
                    <button key={ap}
                      style={{ padding: '20px', fontSize: 18, fontWeight: timeAmPm === ap ? 700 : 400, border: `2px solid ${timeAmPm === ap ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 14, background: timeAmPm === ap ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeAmPm === ap ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                      onClick={() => setTimeAmPm(ap)}>{ap === '오전' ? '🌅' : '🌇'} {ap}</button>
                  ))}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(201,168,76,0.7)', marginBottom: 12 }}>시 선택</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                    <button key={h}
                      style={{ padding: '18px 4px', fontSize: 17, fontWeight: timeHour === String(h) ? 700 : 400, border: `2px solid ${timeHour === String(h) ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 12, background: timeHour === String(h) ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeHour === String(h) ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                      onClick={() => setTimeHour(String(h))}>{h}시</button>
                  ))}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(201,168,76,0.7)', marginBottom: 12 }}>분 선택</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {['00','10','20','30','40','50'].map(m => (
                    <button key={m}
                      style={{ padding: '18px 4px', fontSize: 17, fontWeight: timeMin === m ? 700 : 400, border: `2px solid ${timeMin === m ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`, borderRadius: 12, background: timeMin === m ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', color: timeMin === m ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                      onClick={() => setTimeMin(m)}>{m}분</button>
                  ))}
                </div>
                {timeHour && timeMin && (
                  <p style={{ fontSize: 16, color: '#C9A84C', textAlign: 'center', fontWeight: 700 }}>✓ {timeAmPm} {timeHour}시 {timeMin}분</p>
                )}
              </>
            )}
            {timeUnknown && (
              <button style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', display: 'block' }} onClick={() => setTimeUnknown(false)}>시간 직접 선택하기</button>
            )}
          </>
        )}

        {/* ── MBTI ── */}
        {currentStepId === 'mbti' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
              {MBTI_LIST.map(m => (
                <button key={m}
                  style={{ padding: '20px 4px', fontSize: 16, fontWeight: mbti === m ? 800 : 500, border: `2px solid ${mbti === m ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 12, background: mbti === m ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)', color: mbti === m ? '#C9A84C' : 'rgba(255,255,255,0.55)', cursor: 'pointer' }}
                  onClick={() => setMbti(mbti === m ? '' : m)}>{m}</button>
              ))}
            </div>
            <button
              style={{ width: '100%', padding: '20px', fontSize: 16, fontWeight: 500, border: `2px solid rgba(201,168,76,0.15)`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', marginTop: 4 }}
              onClick={() => { setMbti(''); goNext(); }}>MBTI를 모릅니다</button>
          </>
        )}

        {/* ── 혈액형 ── */}
        {currentStepId === 'blood' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {BLOOD_LIST.map(b => (
              <button key={b}
                style={{ padding: '40px 16px', fontSize: 28, fontWeight: blood === b ? 800 : 600, border: `2px solid ${blood === b ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: 16, background: blood === b ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)', color: blood === b ? '#C9A84C' : 'rgba(255,255,255,0.6)', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => setBlood(blood === b ? '' : b)}>{b}형</button>
            ))}
          </div>
        )}

      </div>

      {/* 하단 버튼 */}
      <div style={{ position: 'fixed', bottom: 0, background: '#050D1F', borderTop: '1px solid rgba(201,168,76,0.15)', padding: '14px 20px 30px', display: 'flex', gap: 12, maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 100 }}>
        <button
          style={{ flex: '0 0 auto', padding: '18px 24px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 14, background: 'rgba(255,255,255,0.03)', fontSize: 20, cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}
          onClick={goBack}>←</button>
        <button
          style={{ flex: 1, padding: '18px', fontSize: 18, fontWeight: 700, background: !canGoNext() ? 'rgba(201,168,76,0.2)' : 'linear-gradient(135deg, #C9A84C, #F5E090)', color: !canGoNext() ? 'rgba(255,255,255,0.3)' : '#0A1628', border: 'none', borderRadius: 14, cursor: !canGoNext() ? 'not-allowed' : 'pointer', letterSpacing: '0.02em' }}
          onClick={goNext} disabled={!canGoNext()}>
          {currentStepId === 'blood'
            ? (serviceType === 'deep' ? '심화 분석받기 (9,900원) 🔮' : serviceType === 'child' ? '우리 아이 재능 확인하기 👶' : serviceType === '노후' ? '내 후반전, 지금 확인하기 →' : '내 돈 버는 시기, 지금 확인하기 →')
            : currentStepId === 'mbti' ? '다음 (건너뛰기 가능)' : '다음 →'}
        </button>
      </div>
    </div>
  )
}
// ── 결과 화면 ──
if (screen === 'result') {
  const baseSections = parseSections(baseText)
  const paidSections = parseSections(paidText)
  return (
    <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column' }}>
      <div id="result-content" style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 120px', boxSizing: 'border-box', width: '100%' }}>

        {/* 로딩 카운터 */}
        {isBaseStreaming && (
          <div style={{ textAlign: 'center', padding: '16px', marginBottom: 16, fontSize: 15, color: 'rgba(201,168,76,0.7)', fontWeight: 700 }}>
            ✦ 분석 중 · {loadingCountdown}초 경과 ✦
          </div>
        )}

        {/* 사주팔자 카드 */}
        {!loadingPhase && sajuData?.사주 && (
  <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: '24px 20px', marginBottom: 20 }}>
    <p style={{ fontSize: 15, fontWeight: 700, color: '#C9A84C', marginBottom: 8, letterSpacing: '0.1em' }}>나의 사주팔자</p>
    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 18, textAlign: 'center', fontWeight: 500 }}>{sajuData.생년월일}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {[{ label: '시주(時)', value: sajuData.사주.시주 }, { label: '일주(日)', value: sajuData.사주.일주 }, { label: '월주(月)', value: sajuData.사주.월주 }, { label: '년주(年)', value: sajuData.사주.년주 }].map(({ label, value }) => {
        const 오행색 = { '甲갑': '#4ADE80', '乙을': '#4ADE80', '丙병': '#F87171', '丁정': '#F87171', '戊무': '#C9A84C', '己기': '#C9A84C', '庚경': '#E8C96A', '辛신': '#E8C96A', '壬임': '#60A5FA', '癸계': '#60A5FA' }
        const 색 = 오행색[value?.slice(0, 2)] || '#FFFFFF'
        return (
          <div key={label} style={{ textAlign: 'center', background: `${색}15`, borderRadius: 12, padding: '18px 4px', border: `2px solid ${색}50` }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 10, display: 'block' }}>{label}</span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
 <span style={{ fontSize: 22, fontWeight: 900, color: 색, lineHeight: 1.2 }}>{value?.slice(0,1) || '-'}</span>
<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{value?.slice(1,2) || ''}</span>
<span style={{ fontSize: 16, fontWeight: 700, color: 색, opacity: 0.7, marginTop: 2 }}>{value?.slice(2,3) || ''}</span>
<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{value?.slice(3,4) || ''}</span>
</span>
          </div>
        )
      })}
    </div>
  </div>
)}

{/* 일주 타입 카드 */}
{!loadingPhase && sajuData?.사주?.일주 && (() => {
  const 일주원문 = sajuData.사주.일주  // 예: "辛신亥해"
const 일주키 = 일주원문[0] + 일주원문[2]  // "辛" + "亥" = "辛亥"
  const 타입 = 일주타입명[일주키]
  if (!타입) return null
  const 오행색 = { '甲': '#4ADE80', '乙': '#4ADE80', '丙': '#F87171', '丁': '#F87171', '戊': '#C9A84C', '己': '#C9A84C', '庚': '#E8C96A', '辛': '#E8C96A', '壬': '#60A5FA', '癸': '#60A5FA' }
  const 색 = 오행색[일주키[0]] || '#C9A84C'
  return (
    <div id="share-card" style={{ background: '#0D1B3E', border: `1px solid ${색}40`, borderRadius: 16, padding: '24px 20px', marginBottom: 20 }}>
      <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)', fontWeight: 600, letterSpacing: '0.12em', marginBottom: 12 }}>MY TYPE</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: `${색}18`, border: `1px solid ${색}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 색, fontFamily: 'Georgia, serif', flexShrink: 0 }}>{일주키}</div>
        <div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', marginBottom: 4 }}>{타입.name}</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{타입.desc}</p>
        </div>
      </div>
     
    </div>
  )
})()}

{/* 운세 점수 카드 — 레이더 차트 */}
{!loadingPhase && scoreData && (() => {
  const categories = [
    { label: '재물운', score: scoreData.재물, color: '#7F77DD' },
    { label: '애정운', score: scoreData.애정, color: '#D4537E' },
    { label: '직업운', score: scoreData.직업, color: '#1D9E75' },
    { label: '건강운', score: scoreData.건강, color: '#BA7517' },
    { label: '종합운', score: scoreData.종합, color: '#C9A84C' },
  ]
  const size = 260
  const cx = size / 2, cy = size / 2, r = 95
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0]
  const n = categories.length
  const angleOffset = -Math.PI / 2

  const getPoint = (i, ratio) => {
    const angle = angleOffset + (2 * Math.PI * i) / n
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    }
  }
  const getLabelPoint = (i) => {
    const angle = angleOffset + (2 * Math.PI * i) / n
    const labelR = r + 22
    return {
      x: cx + labelR * Math.cos(angle),
      y: cy + labelR * Math.sin(angle),
    }
  }

  const dataPoints = categories.map((c, i) => getPoint(i, c.score / 100))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  return (
    <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: '24px 20px', marginBottom: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
       <p style={{ fontSize: 12, color: 'rgba(201,168,76,0.6)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6 }}>사주 기운 스탯</p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: 52, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>{scoreData.종합}</span>
          <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)' }}>점</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
          상위 {scoreData.종합 >= 90 ? '5' : scoreData.종합 >= 80 ? '15' : scoreData.종합 >= 70 ? '25' : scoreData.종합 >= 60 ? '40' : '50'}% 수준이에요
        </p>
      </div>

      {/* 레이더 차트 */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* 배경 그물망 */}
          {levels.map((level, li) => {
            const pts = categories.map((_, i) => getPoint(i, level))
            const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
            return <path key={li} d={path} fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="1" />
          })}

          {/* 축선 */}
          {categories.map((_, i) => {
            const outer = getPoint(i, 1.0)
            return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="rgba(201,168,76,0.15)" strokeWidth="1" />
          })}

          {/* 데이터 영역 */}
          <path d={dataPath} fill="rgba(201,168,76,0.15)" stroke="#C9A84C" strokeWidth="2" />

          {/* 데이터 점 */}
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill={categories[i].color} stroke="#0D1B3E" strokeWidth="2" />
          ))}

          {/* 라벨 */}
          {categories.map((c, i) => {
            const lp = getLabelPoint(i)
            return (
              <g key={i}>
                <text
                  x={lp.x} y={lp.y - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="rgba(255,255,255,0.6)"
                  fontWeight="600"
                >{c.label}</text>
                <text
                  x={lp.x} y={lp.y + 8}
                  textAnchor="middle"
                  fontSize="12"
                  fill={c.color}
                  fontWeight="800"
                >{c.score}</text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* 범례 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: 14 }}>
        {categories.filter(c => c.label !== '종합운').map(({ label, score, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginLeft: 'auto' }}>{score}</span>
          </div>
        ))}
      </div>
    </div>
  )
})()}

        {/* 스트리밍 텍스트 */}
        {!loadingPhase && isBaseStreaming && baseText && (
          <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 14, padding: '20px', marginBottom: 10, fontSize: 18, lineHeight: 2.2, color: 'rgba(255,255,255,0.88)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
            {removeMarkers(baseText)}<span style={{ opacity: 0.4 }}>▌</span>
          </div>
        )}

        {/* 기본 분석 결과 아코디언 */}
{!loadingPhase && !isBaseStreaming && baseSections.filter(s => !s.title.includes('행운미리보기') && !s.title.includes('운세점수')).map((sec, i) => {
  const isBlurred = i >= 1
  const lines = sec.content.split('\n')
  const previewLines = lines.slice(0, 5).join('\n')
  const restLines = lines.slice(5).join('\n')

  if (isBlurred && !isPaid) {
    return (
      <div key={i} style={{ marginBottom: 10, border: '1px solid rgba(201,168,76,0.15)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: '#0D1B3E' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{sec.title}</span>
          <span style={{ fontSize: 12, color: 'rgba(201,168,76,0.6)', background: 'rgba(201,168,76,0.1)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(201,168,76,0.3)' }}>전체 분석 공개</span>
        </div>
        <div style={{ padding: '16px 20px 0', fontSize: 18, lineHeight: 2.2, color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', background: '#050D1F' }}>
          {previewLines}
        </div>
        <div style={{ position: 'relative', background: '#050D1F', padding: '0 20px 20px' }}>
          <div style={{ fontSize: 18, lineHeight: 2.2, color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', filter: 'blur(6px)', userSelect: 'none', pointerEvents: 'none', minHeight: 80 }}>
            {restLines || '이 내용은 전체 분석에서 확인할 수 있어요. 이 사주에서 돈이 가장 크게 움직이는 나이대가 있고, 그 시기를 어떻게 준비하느냐에 따라 말년이 완전히 달라져요.'}
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, #050D1F 75%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C' }}>이 내용이 궁금하다면? ↓ 아래에서 전체 분석을 확인하세요</p>
          </div>
        </div>
      </div>
    )
  }

  return <Accordion key={i} title={sec.title} content={sec.content} defaultOpen={i === 0} />
})}


        {/* 유료 스트리밍 텍스트 */}
        {!loadingPhase && isPaidStreaming && paidText && (
          <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 14, padding: '20px', marginBottom: 10, fontSize: 18, lineHeight: 2.2, color: 'rgba(255,255,255,0.88)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
            {removeMarkers(paidText)}<span style={{ opacity: 0.4 }}>▌</span>
          </div>
        )}

        {/* 유료 분석 아코디언 */}
        {!loadingPhase && !isPaidStreaming && paidSections.length > 0 && (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#C9A84C', textAlign: 'center', margin: '20px 0 12px', letterSpacing: '0.08em' }}>✦ 전체 분석 결과 ✦</p>
            {paidSections.map((sec, i) => <Accordion key={i} title={sec.title} content={sec.content} isPaid={true} defaultOpen={i === 0} />)}
          </>
        )}

        {/* 결제 유도 카드 */}
        {!loadingPhase && phase === 'done' && !isPaid && !isPaidStreaming && (
  <div style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #050D1F 100%)', borderRadius: 16, padding: '28px 20px', marginBottom: 16, border: '1px solid rgba(201,168,76,0.3)' }}>
    <p style={{ fontSize: 12, color: 'rgba(201,168,76,0.6)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 16, textAlign: 'center' }}>FULL ANALYSIS</p>
    {(serviceType === 'child'
      ? [
          { title: '타고난 기질 · 성격 심층 분석', first: '이 아이는 겉으로 보이는 것과 속마음이 완전히 달라요. ', blurred: '잘 웃고 사교적으로 보이지만, 실은 혼자만의 세계가 넓고 감정이 깊은 아이예요. 이 기질을 모르면 엉뚱한 방향으로 키울 수 있어요.' },
          { title: '학습 스타일 · 공부가 잘 되는 환경', first: '이 아이는 시각적으로 배울 때 흡수가 가장 빨라요. ', blurred: '학원 수업보다 영상이나 그림으로 이해하는 타입이에요. 오전 시간대에 집중력이 최고조인 사주 구조를 갖고 있어요.' },
          { title: '재능의 씨앗 · 빛나는 분야', first: '이 아이가 반복해도 안 지치는 것이 진짜 재능이에요. ', blurred: '부모가 보기엔 놀이 같지만, 이 사주에서는 그게 나중에 돈이 되는 분야와 직접 연결돼요. 방향만 잡아주면 빛나요.' },
          { title: '진로 방향 · 어울리는 직업군', first: '이 사주에 딱 맞는 직업이 6가지 보여요. ', blurred: '창의력과 분석력이 동시에 필요한 분야에서 두각을 나타내는 사주예요. 이과/문과/예체능 중 어디로 가야 하는지도 나와요.' },
          { title: '또래 관계 · 친구 패턴', first: '이 아이가 친구 사이에서 어떤 역할인지 보여요. ', blurred: '리더형인지 참모형인지, 갈등이 생기는 패턴과 부모가 도와줄 수 있는 방법이 나와요.' },
          { title: '부모와의 관계 · 키우는 법', first: '이 아이에게 절대 하면 안 되는 말이 있어요. ', blurred: '사주 구조상 이 아이가 스트레스받는 상황이 정해져 있어요. 반항기가 오는 시기와 대응법도 미리 알 수 있어요.' },
          { title: '이 아이의 인생 흐름', first: '지금부터 20대까지, 30대까지의 흐름이 보여요. ', blurred: '이 사주가 꽃피는 시기가 언제인지, 지금 무엇에 집중해야 하는지 단계별로 나와요.' },
          { title: '입시 · 취업 유리한 시기', first: '시험 운이 가장 강한 나이대가 따로 있어요. ', blurred: '이 사주에서 합격 확률이 높은 시기와 반대로 조심해야 할 시기가 구체적으로 나와요.' },
          { title: '이 아이가 빛나는 조건', first: '어떤 환경에서 집중력과 자신감이 올라가는지 보여요. ', blurred: '선생님 스타일, 공부 공간, 루틴까지 부모가 오늘 당장 바꿔볼 수 있는 구체적인 조건이 나와요.' },
          { title: '키우는 핵심 비법', first: '이 아이의 잠재력을 최대로 끌어내는 조건이 있어요. ', blurred: '해야 할 것과 절대 하면 안 되는 것, 오늘 바로 써먹을 수 있는 구체적 조언이 나와요.' },
        ]
      : serviceType === '노후'
      ? [
          { title: '노후 재물 심화 분석', first: '노후에 자산이 안정적으로 유지되는 구조인지 보여요. ', blurred: '수익형 자산 방향, 절대 하면 안 되는 투자 실수, 재물이 안정되는 구체적 나이대가 나와요.' },
          { title: '건강 심화 분석', first: '건강 위기가 올 수 있는 나이대가 따로 있어요. ', blurred: '특히 챙겨야 할 신체 부위와 관리법, 오래 건강하게 사는 이 사주만의 생활 습관이 나와요.' },
          { title: '황혼 인연 심화', first: '노후에 진짜 의지가 되는 사람의 특징이 보여요. ', blurred: '자녀와의 관계 흐름, 새로운 인연이 생기는 시기와 조건이 구체적으로 나와요.' },
          { title: '노후 투자 · 부동산', first: '이 사주에 맞는 노후 자산 운용 방향이 나와요. ', blurred: '부동산/금융/현금 비중, 절대 하면 안 되는 투자 실수, 노후 수익 파이프라인 전략이 보여요.' },
          { title: '緣 · 사람과 인연', first: '노후에 진짜 내 편이 되는 사람의 특징이 나와요. ', blurred: '독이 되는 사람 유형, 황혼기 귀인이 나타나는 상황, 인간관계에서 조심해야 할 패턴이 보여요.' },
          { title: '月運 · 월별 운세', first: '앞으로 12개월의 운세 흐름이 한눈에 보여요. ', blurred: '매달 좋은 시기와 조심할 시기가 다르기 때문에 타이밍을 아는 것이 가장 중요해요.' },
          { title: '幸 · 나를 돕는 것들', first: '행운 색깔·마스코트·방향·숫자·아이템이 나와요. ', blurred: '노후 시기에 특히 도움이 되는 아이템 기준으로 선별된 행운 요소예요.' },
          { title: '노후를 빛나게 하는 법', first: '이 사주가 노후에 진짜 행복해지는 조건이 있어요. ', blurred: '지금부터 준비하면 달라지는 것들, 오늘 바로 실천할 수 있는 구체적 행동 조언이 나와요.' },
          { title: '道 · 이 사주로 잘 사는 법', first: '이 사주가 잘 풀리는 조건이 딱 2가지예요. ', blurred: '반대로 망하는 패턴도 있는데, 아는 것과 모르는 것의 차이가 생각보다 크게 나요.' },
          { title: '총운 정리', first: '전체 분석을 한 문장으로 정리해드려요. ', blurred: '이 사주의 핵심 키워드와 앞으로 가장 중요한 시기, 지금 당장 해야 할 한 가지가 나와요.' },
        ]
     : [
         { title: '財運 · 인생 재물 전체',
            first: '돈이 들어오는 방식이 남들과 달라요. 이 사주는 돈을 벌 때와 잃을 때의 패턴이 뚜렷해요.',
            blurred: '20~30대는 흘러가는 구조였다면 지금부터는 쌓이는 구조로 바뀌는 시기예요. 이 사주에서 돈이 가장 크게 움직이는 나이대가 있고, 그 시기를 어떻게 준비하느냐에 따라 말년이 완전히 달라져요. 절대 하면 안 되는 돈 실수가 딱 하나 있는데, 이걸 모르고 그냥 지나치면 나중에 반드시 후회하게 돼요.' },
          { title: '職 · 직업과 커리어',
            first: '이 사주에 딱 맞는 직업이 따로 있어요. 지금 하는 일이 맞는지 안 맞는지도 사주에서 보여요.',
            blurred: '어떤 환경에서 능력이 폭발하는지, 직장인으로 갈지 자영업으로 갈지도 이 사주가 답을 갖고 있어요. 지금 이 시기에 커리어에서 절대 하면 안 되는 결정이 있고, 반대로 지금 당장 움직여야 할 타이밍도 보여요. 크게 도약할 수 있는 구체적인 시기가 생각보다 가까이 와 있어요.' },
          { title: '富 · 투자와 부동산',
            first: '이 사주에서 절대 손대면 안 되는 투자가 있어요. 부동산이냐 금융이냐, 지금이 타이밍인지도 나와요.',
            blurred: '반대로 지금 이 사주에 가장 잘 맞는 자산 방향은 따로 있어요. 지금 급하게 움직이면 반드시 후회하는 시기인지, 아니면 지금이 딱 타이밍인지도 보여요. 실거주에 좋은 방향과 수익 파이프라인 전략도 구체적으로 알 수 있어요.' },
          { title: '緣 · 사람과 인연',
            first: '진짜 내 편이 되어줄 사람의 특징이 보여요. 직업군, 성격, 나이대까지 구체적으로 나와요.',
            blurred: '반대로 곁에 두면 반드시 손해보는 사람 유형도 딱 보여요. 이 사주에서 인간관계가 꼬이는 패턴이 있는데, 그걸 알면 같은 실수를 반복하지 않을 수 있어요. 귀인이 나타나는 구체적인 시기와 상황도 알 수 있어요.' },
          { title: '月運 · 월별 운세',
            first: '앞으로 12개월, 매달 운세 흐름이 다 달라요. 좋은 달과 조심할 달이 따로 있어요.',
            blurred: '7월부터 내년 6월까지, 재물이 들어오는 달, 인간관계 조심해야 할 달, 결정을 내려야 할 달이 구체적으로 나와요. 타이밍을 아는 것과 모르는 것의 차이가 크게 나요.' },
          { title: '幸 · 나를 돕는 것들',
            first: '이 사주의 행운 색깔 · 마스코트 · 방향 · 숫자 · 아이템이 있어요.',
            blurred: '단순한 미신이 아니라 이 사주 기운과 맞는 환경을 만드는 거예요. 행운 색깔만 무료에서 공개됐는데, 나머지 4가지가 사실 더 중요해요. 실제로 운의 흐름이 달라지는 걸 느낄 수 있어요.' },
          { title: '道 · 이 사주로 잘 사는 법',
            first: '이 사주가 잘 풀리는 조건이 딱 2가지예요. 이것만 지키면 인생이 달라져요.',
            blurred: '반대로 이 사주가 망하는 패턴도 하나 있는데, 듣고 나면 "아, 내가 그걸 하고 있었구나" 싶을 거예요. 지금 당장 오늘부터 바꿀 수 있는 행동 2가지가 있어요.' },
          { title: '직업 · 진로 심화 / 인연운 심화',
            first: '나이대별로 가장 중요한 운이 따로 있어요. 지금 이 시기에 집중해야 할 영역이 보여요.',
            blurred: '20대는 진로, 30대 미혼은 인연, 기혼은 부부운 — 사주 구조에서 실제로 보이는 흐름 기준으로 가장 중요한 분석이 나와요.' },
          { title: '大運 · 앞으로의 큰 흐름',
            first: '지금 어떤 대운을 타고 있는지, 다음 대운은 언제 바뀌는지 나와요.',
            blurred: '현재 대운이 득인지 실인지, 다음 전환점이 언제인지 정확한 연도로 찍어드려요. 이 흐름을 아느냐 모르느냐가 앞으로 10년을 바꿔요.' },
          { title: '총운 · 이 사주의 핵심 한마디',
            first: '전체 분석을 관통하는 핵심 키워드가 있어요.',
            blurred: '이 사주를 한 문장으로 정리하면 뭔지, 앞으로 가장 중요한 해가 언제인지, 지금 당장 해야 할 한 가지가 나와요.' },
        ]
   ).map((item, idx) => (
      <div key={idx} style={{ marginBottom: 10, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(201,168,76,0.1)' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>✦ {item.title}</p>
        <div style={{ fontSize: 17, lineHeight: 2.0, color: 'rgba(255,255,255,0.75)', wordBreak: 'keep-all' }}>
          <span>{item.first}</span>
          <span style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>{item.blurred}</span>
        </div>
      </div>
    ))}
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 10 }}>총 {serviceType === 'child' ? 10 : serviceType === '노후' ? 10 : 10}개 섹션 · 이 모든 내용이 1,900원</p>
    <div style={{ textAlign: 'center', marginTop: 12 }}>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>↓ 아래 버튼으로 결제하세요</p>
    </div>
  </div>
)}

        {/* 유료 분석 타이머 */}
        {isPaidStreaming && (
          <div style={{ textAlign: 'center', padding: '16px', marginBottom: 16, fontSize: 15, color: 'rgba(201,168,76,0.7)', fontWeight: 700 }}>
            ✦ 전체 분석 중 · {loadingCountdown}초 경과 ✦
          </div>
        )}

        {/* 유료 분석 로딩 */}
        {!loadingPhase && isPaidStreaming && !paidText && (
          <div style={{ background: '#0D1B3E', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 14, padding: '28px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#C9A84C', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginLeft: 10 }}>전체 사주를 분석하고 있어요...</span>
            </div>
          </div>
        )}

{!loadingPhase && (
  <>
    {/* 심화분석 업셀 */}
    {((isPaid && serviceType === 'saju') || serviceType === 'deep') && (
      <div style={{ marginTop: 28, marginBottom: 10 }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(10,22,40,0.95) 50%, rgba(201,168,76,0.08) 100%)', border: '2px solid rgba(201,168,76,0.5)', borderRadius: 20, padding: '32px 22px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
          {/* 배경 장식 */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(201,168,76,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(201,168,76,0.04)', pointerEvents: 'none' }} />

          {/* 타이머 뱃지 */}
          <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(204,34,34,0.15)', padding: '8px 16px', borderRadius: '0 18px 0 16px', border: '1px solid rgba(204,34,34,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#FF4444' }}>⏱</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#FF4444', letterSpacing: '0.05em' }}>{countdown}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,68,68,0.6)' }}>까지</span>
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.7)', fontWeight: 600, letterSpacing: '0.18em', marginBottom: 14 }}>DEEP ANALYSIS</p>

          {/* 훅 문구 */}
          <p style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', marginBottom: 8, lineHeight: 1.4 }}>기본 분석에서<br/>말 못한 게 있어요</p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 22, wordBreak: 'keep-all' }}>이 사주에서 <span style={{ color: '#C9A84C', fontWeight: 700 }}>절대 하면 안 되는 결정 1가지</span>,{'\n'}<span style={{ color: '#C9A84C', fontWeight: 700 }}>귀인이 나타나는 시기</span>, 지금이 <span style={{ color: '#C9A84C', fontWeight: 700 }}>기회인지 위기인지</span></p>

          {/* 체크리스트 */}
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 14, padding: '18px 16px', marginBottom: 24 }}>
            {[
              '재물 · 커리어 심층 분석',
              '대운 흐름 + 전환점 정확한 연도',
              '수비학 운명수 분석',
              '오행으로 본 나의 커리어 계절 (木火土金水)',
              '귀인 만나는 시기 + 구체적 행동 전략',
              '절대 하면 안 되는 결정 1가지',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 5 ? 12 : 0 }}>
                <span style={{ fontSize: 14, color: '#C9A84C', marginTop: 1, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* 가격 */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', marginRight: 10 }}>19,900원</span>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C' }}>9,900원</span>
          </div>

          <button style={{ width: '100%', padding: '18px', fontSize: 18, fontWeight: 800, background: 'linear-gradient(135deg, #C9A84C, #F5E090)', color: '#0A1628', border: 'none', borderRadius: 14, cursor: 'pointer', letterSpacing: '0.02em', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}
            onClick={() => { requestPayWithEmail('심화 분석', (email) => { if (IS_ADMIN) { setScreen('deep_result'); handleDeepAnalyze(); return } const IMP = window.IMP; IMP.init('imp87662575'); const _deepParams = new URLSearchParams({ payment: 'deep', g: gender, ms: maritalStatus, by: birthYear, bm: birthMonth, bd: birthDay, il: isLunar ? '1' : '0', bt: birthtime || '', mbti: mbti || '', blood: blood || '', mn: myName || '' }).toString(); IMP.request_pay({ pg: 'html5_inicis', pay_method: 'card', merchant_uid: `deep_${Date.now()}`, name: '마이사주 심화 분석', amount: 9900, buyer_name: myName || '고객', buyer_email: email || '', m_redirect_url: `${window.location.origin}${window.location.pathname}?${_deepParams}` }, (rsp) => { if (rsp.success) { if (window.fbq) fbq('track', 'Purchase', { value: 9900, currency: 'KRW' }); setScreen('deep_result'); handleDeepAnalyze() } else alert('결제가 취소되었습니다.') }) }) }}>지금 심화분석 확인하기 →</button>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 10 }}>결제 즉시 분석이 시작돼요</p>
        </div>
      </div>
    )}

    {/* 하단 액션 영역 */}
    <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', marginTop: 32, paddingTop: 24 }}>

      {/* 이메일 — 접이식 */}
      {isPaid && (
        preEmail ? (
          <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '18px', textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#C9A84C', marginBottom: 4 }}>✅ 이메일 발송 완료</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{preEmail}로 결과를 보내드렸어요.</p>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 10 }}>📧 결과를 이메일로 받아두면 언제든 다시 볼 수 있어요</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="result-email-input" type="email" placeholder="이메일 주소 입력"
                style={{ flex: 1, padding: '12px 14px', fontSize: 14, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, background: '#FFFFFF', color: '#1B1B1B', outline: 'none' }} />
              <button style={{ padding: '12px 18px', fontSize: 14, fontWeight: 600, background: '#C9A84C', color: '#0A1628', border: 'none', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={async () => {
                  const email = document.getElementById('result-email-input').value
                  if (!email || !email.includes('@')) { alert('이메일 주소를 확인해주세요.'); return }
                  const btn = document.querySelector('#result-email-input + button'); btn.textContent = '발송 중...'; btn.disabled = true
                  const allSections = [...parseSections(baseText), ...parseSections(paidText)]
                  const htmlContent = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0D1B3E;color:#FFFFFF;"><h1 style="color:#C9A84C;text-align:center;">${serviceType === 'child' ? '🌱 자녀 학운 분석' : serviceType === '노후' ? '🌅 노후 운세 분석' : '✨ 나의 사주 분석'}</h1><p style="text-align:center;color:rgba(255,255,255,0.6);">${myName || ''}님의 분석 결과</p><hr style="border-color:rgba(201,168,76,0.3);margin:20px 0;">${allSections.map(s => `<h2 style="color:#C9A84C;">${s.title}</h2><p style="color:rgba(255,255,255,0.8);line-height:1.8;white-space:pre-wrap;">${s.content}</p>`).join('')}<hr style="border-color:rgba(201,168,76,0.3);margin:20px 0;"><p style="text-align:center;color:rgba(255,255,255,0.4);font-size:12px;">마이사주 · mysaju.shop</p></div>`
                  try {
                    const res = await fetch(`${API_URL}/api/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: email, subject: `✨ ${myName || ''}님의 사주 분석 결과`, html: htmlContent }) })
                    if (!res.ok) throw new Error('실패')
                    document.getElementById('result-email-input').dataset.sent = 'true'
                    alert('이메일을 발송했어요! 😊')
                  } catch { alert('발송 오류가 발생했습니다.') }
                  finally { btn.textContent = '발송'; btn.disabled = false }
                }}>발송</button>
            </div>
          </div>
        )
      )}

      {/* PDF + 처음으로 — 나란히 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          style={{ flex: 1, padding: '14px', fontSize: 14, fontWeight: 600, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, cursor: 'pointer', color: '#C9A84C' }}
          onClick={async () => { try { await generatePDF('result-content', '마이사주_분석결과_' + (myName || '결과')) } catch(e) { alert('PDF 오류: ' + e.message) } }}>
          📄 PDF 저장
        </button>
        <button
          style={{ flex: 1, padding: '14px', fontSize: 14, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
          onClick={handleRestart}>
          ← 처음으로
        </button>
      </div>

      {/* 친구 공유 — 텍스트 링크 */}
      <p style={{ textAlign: 'center', marginBottom: 8 }}>
        <button
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => {
            navigator.clipboard?.writeText('https://mysaju.shop').then(() => alert('링크가 복사됐어요! 카카오톡에 붙여넣기 해서 공유해보세요 😊')).catch(() => {
              const el = document.createElement('textarea'); el.value = 'https://mysaju.shop'
              document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
              alert('링크가 복사됐어요! 카카오톡에 붙여넣기 해서 공유해보세요 😊')
            })
          }}>
          친구에게 마이사주 알려주기
        </button>
      </p>

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>📱 모바일에서는 PDF 저장이 되지 않을 수 있어요.</p>
    </div>
  </>
)}
      </div>
      {phase === 'done' && !isPaid && !isPaidStreaming && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, zIndex: 999,
          background: '#111', borderTop: '1px solid rgba(201,168,76,0.3)',
          padding: '10px 16px 20px', boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#CC2222', borderRadius: 6, padding: '5px 12px' }}>
              <span style={{ fontSize: 14 }}>⏱</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.05em' }}>{countdown}</span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>오늘 자정까지만</span>
          </div>
          <button
            style={{ width: '100%', padding: '16px', fontSize: 17, fontWeight: 800, background: 'linear-gradient(135deg, #C9A84C, #F5E090)', color: '#0A1628', border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onClick={() => { requestPayWithEmail('전체 분석', (email) => { if (IS_ADMIN) { setIsPaid(true); handlePaidAnalyze(email); return } const IMP = window.IMP; IMP.init('imp87662575'); const _paidParams = new URLSearchParams({ payment: 'paid', st: serviceType || 'saju', g: gender, ms: maritalStatus, by: birthYear, bm: birthMonth, bd: birthDay, il: isLunar ? '1' : '0', bt: birthtime || '', mbti: mbti || '', blood: blood || '', mn: myName || '' }).toString(); IMP.request_pay({ pg: 'html5_inicis', pay_method: 'card', merchant_uid: `saju_${Date.now()}`, name: '마이사주 전체 분석', amount: 1900, buyer_name: myName || '고객', buyer_email: email || '', m_redirect_url: `${window.location.origin}${window.location.pathname}?${_paidParams}` }, (rsp) => { if (rsp.success) { if (window.fbq) fbq('track', 'Purchase', { value: 1900, currency: 'KRW' }); handlePaidAnalyze(email) } else alert('결제가 취소되었습니다.') }) }) }}>
            <span>지금 안 보면 남이 가져가요</span>
<span style={{ fontSize: 16, fontWeight: 900 }}>1,900원</span>
          </button>
        </div>
      )}
    </div>
  )
}

  // ── 약관/정책 화면들 ──
  if (screen === 'refund') return (
  <div style={{ minHeight: '100vh', background: '#050D1F', padding: '40px 20px 80px' }}>
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginBottom: 4 }}>환불정책</h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>시행일: 2026년 6월 1일</p>

      <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '16px 18px', marginBottom: 28 }}>
        <p style={{ fontSize: 14, color: '#C9A84C', fontWeight: 700, marginBottom: 6 }}>⚠️ 구매 전 꼭 확인해주세요</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>본 서비스는 결제 즉시 생성되는 1회성 디지털 콘텐츠로, 결제 완료 후에는 원칙적으로 환불이 불가합니다. 결제 전 서비스 내용을 충분히 확인해 주세요.</p>
      </div>

      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 2.2 }}>
        <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제1조 (디지털 콘텐츠의 특성)</p>
        <p style={{ marginBottom: 24 }}>마이사주(mysaju.shop) 서비스는 이용자가 입력한 정보를 바탕으로 AI가 즉시 생성하는 1회성 맞춤형 디지털 콘텐츠입니다. 결제가 완료되는 즉시 콘텐츠 생성이 시작되며, 이용자 요청에 따라 개인화된 풀이가 제공됩니다.</p>

        <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제2조 (환불 불가 원칙)</p>
        <p style={{ marginBottom: 8 }}>① 결제 완료 후 콘텐츠 생성이 시작된 경우, 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제5호에 따라 디지털 콘텐츠의 특성상 청약 철회 및 환불이 불가합니다.</p>
        <p style={{ marginBottom: 24 }}>② 이용자는 결제 전 서비스 소개 페이지에서 제공 내용을 충분히 확인하시기 바랍니다.</p>

        <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제3조 (예외적 환불 사유)</p>
        <p style={{ marginBottom: 8 }}>다음의 경우에 한해 환불 신청을 검토합니다.</p>
        <p style={{ marginBottom: 8 }}>① 결제는 완료되었으나 서비스 시스템 오류로 인해 콘텐츠가 전혀 생성·제공되지 않은 경우</p>
        <p style={{ marginBottom: 8 }}>② 동일한 정보로 중복 결제가 발생한 경우 (중복분에 한해 환불)</p>
        <p style={{ marginBottom: 24 }}>③ 기타 회사의 귀책사유로 서비스 이용이 불가한 경우</p>

        <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제4조 (환불 신청 방법)</p>
        <p style={{ marginBottom: 8 }}>환불 신청은 결제일로부터 7일 이내에 아래 방법으로 요청하시기 바랍니다.</p>
        <p style={{ marginBottom: 8 }}>· 카카오톡 오픈채팅: <span style={{ color: '#C9A84C' }}>open.kakao.com/me/mysajushop</span></p>
        <p style={{ marginBottom: 8 }}>· 이메일: <span style={{ color: '#C9A84C' }}>redions77@naver.com</span></p>
        <p style={{ marginBottom: 24 }}>· 요청 시 포함 사항: 결제일시, 결제금액, 환불 사유 및 증빙자료</p>

        <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제5조 (환불 처리 기간)</p>
        <p style={{ marginBottom: 8 }}>· 신용카드: 카드사 정책에 따라 영업일 기준 3~7일</p>
        <p style={{ marginBottom: 24 }}>· 간편결제(카카오페이 등): 영업일 기준 1~3일</p>

        <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: 24, marginTop: 8 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 2 }}>
            상호: 봄결 · 대표자: 손영주<br/>
            사업자등록번호: 291-17-02825<br/>
            통신판매업신고: 제2026-별내-1183호<br/>
            사업장: 경기도 남양주시 별내3로 322, 701호 -V133호<br/>
            전화: 010-9772-1987 · 이메일: redions77@naver.com
          </p>
        </div>
      </div>
    </div>
  </div>
)
  if (screen === 'terms') return (
    <div style={{ minHeight: '100vh', background: '#050D1F', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginBottom: 4 }}>이용약관</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>시행일: 2026년 6월 1일</p>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 2.2 }}>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제1조 (목적)</p>
          <p style={{ marginBottom: 24 }}>이 약관은 봄결(이하 "회사")이 운영하는 마이사주(mysaju.shop) 서비스의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제2조 (서비스 내용)</p>
          <p style={{ marginBottom: 24 }}>회사는 이용자가 입력한 생년월일, 성별 등 정보를 바탕으로 AI가 생성하는 사주 분석 콘텐츠를 제공합니다. 본 서비스는 오락·참고 목적의 콘텐츠이며, 의학·법률·재무 등 전문적 조언을 대체하지 않습니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제3조 (이용 계약)</p>
          <p style={{ marginBottom: 24 }}>이용자가 서비스를 이용하거나 결제를 진행하면 본 약관에 동의한 것으로 간주합니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제4조 (결제 및 요금)</p>
          <p style={{ marginBottom: 8 }}>① 서비스 요금은 결제 화면에 표시된 금액을 따릅니다.</p>
          <p style={{ marginBottom: 24 }}>② 결제는 KG이니시스를 통한 신용카드 및 간편결제로 이루어집니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제5조 (콘텐츠의 한계)</p>
          <p style={{ marginBottom: 24 }}>AI가 생성하는 사주 분석 결과는 참고용이며, 결과의 정확성·완전성을 보장하지 않습니다. 이용자는 본 서비스 결과를 전적으로 신뢰하여 중요한 결정을 내리지 않도록 합니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제6조 (환불)</p>
          <p style={{ marginBottom: 24 }}>환불에 관한 사항은 별도의 환불정책을 따릅니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제7조 (면책)</p>
          <p style={{ marginBottom: 24 }}>회사는 이용자가 서비스 결과를 근거로 내린 판단이나 행동에 대해 책임을 지지 않습니다.</p>
          <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: 24, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 2 }}>
              상호: 봄결 · 대표자: 손영주<br/>
              사업자등록번호: 291-17-02825<br/>
              통신판매업신고: 제2026-별내-1183호<br/>
              이메일: redions77@naver.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  if (screen === 'privacy') return (
    <div style={{ minHeight: '100vh', background: '#050D1F', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => setScreen('landing')} style={{ fontSize: 14, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>← 돌아가기</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginBottom: 4 }}>개인정보처리방침</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>시행일: 2026년 6월 1일</p>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 2.2 }}>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제1조 (수집하는 개인정보)</p>
          <p style={{ marginBottom: 8 }}>회사는 서비스 제공을 위해 다음 정보를 수집합니다.</p>
          <p style={{ marginBottom: 8 }}>· 필수: 생년월일, 태어난 시간(선택), 성별</p>
          <p style={{ marginBottom: 24 }}>· 선택: 이름, 이메일 주소, MBTI, 혈액형</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제2조 (수집 목적)</p>
          <p style={{ marginBottom: 8 }}>· 사주 분석 콘텐츠 생성 및 제공</p>
          <p style={{ marginBottom: 8 }}>· 이메일 입력 시: 분석 결과 발송</p>
          <p style={{ marginBottom: 24 }}>· 결제 처리 (KG이니시스를 통해 처리되며, 카드 정보는 회사가 저장하지 않습니다)</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제3조 (보유 및 이용 기간)</p>
          <p style={{ marginBottom: 24 }}>입력 정보는 분석 결과 생성 후 별도로 저장하지 않습니다. 이메일 주소는 결과 발송 후 즉시 파기합니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제4조 (제3자 제공)</p>
          <p style={{ marginBottom: 24 }}>회사는 이용자의 개인정보를 결제 처리(KG이니시스) 외 제3자에게 제공하지 않습니다.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제5조 (이용자 권리)</p>
          <p style={{ marginBottom: 24 }}>이용자는 개인정보 열람·삭제를 요청할 수 있습니다. 문의는 redions77@naver.com으로 연락해 주세요.</p>
          <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: 15, marginBottom: 8 }}>제6조 (개인정보보호책임자)</p>
          <p style={{ marginBottom: 24 }}>· 성명: 손영주 · 이메일: redions77@naver.com</p>
          <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: 24, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 2 }}>
              상호: 봄결 · 대표자: 손영주<br/>
              사업자등록번호: 291-17-02825<br/>
              통신판매업신고: 제2026-별내-1183호<br/>
              이메일: redions77@naver.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return null
  return null
}
