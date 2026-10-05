import { useEffect, useRef, useState } from 'react'

// 내 사주 무료 결과 마지막의 유료 안내. 문구와 "자세한 풀이 살펴보기" 버튼만 먼저 보이고,
// 버튼을 누르면 같은 화면 아래에 상품 안내(제공 항목·가격)가 펼쳐진다. 버튼 자체는 결제나 풀이 생성을 시작하지 않는다.
// 결제는 펼쳐진 안내 안의 기존 구매 버튼(children 의 onBuy)을 따로 눌러야 시작된다.
export default function PaidIntro({ children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const areaRef = useRef(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    if (open && areaRef.current && typeof areaRef.current.scrollIntoView === 'function') areaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [open])
  return (
    <section className="rpt-paid-intro" aria-label="자세한 풀이 안내">
      <h2 className="rpt-paid-intro-title">내 사주, 조금 더 궁금해졌나요?</h2>
      <p className="rpt-paid-intro-text">기본 풀이에서 살펴본 내용을 바탕으로,<br />궁금한 주제를 더 자세히 알아보세요.</p>
      <p className="rpt-paid-intro-note">상품별 풀이 내용과 가격을 확인한 뒤 선택할 수 있어요.</p>
      <button type="button" className="rpt-paid-intro-btn" aria-expanded={open} aria-controls="paid-product-area" onClick={() => setOpen(o => !o)}>
        {open ? '안내 접기 ↑' : '자세한 풀이 살펴보기 →'}
      </button>
      <div id="paid-product-area" ref={areaRef} hidden={!open} style={{ marginTop: open ? 18 : 0 }}>
        {open ? children : null}
      </div>
    </section>
  )
}
