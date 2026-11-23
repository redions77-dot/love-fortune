import React, { useEffect, useState } from 'react'
import { fetchReviews, checkReviewEligibility, submitReview } from './successSajuApi.js'
import { CONCERNS, CONTENT_MIN, CONTENT_MAX, NICKNAME_MAX, usageLabel, starText, reviewLengthState } from './reviewsLogic.js'

const fmtDate = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}` }

// 홈 화면: 운영자가 승인한 실제 후기만 보여 준다. 구매 인증 / 무료 체험 표시로 구분한다. 후기가 없으면 빈 상태 안내만 보이고 예시 후기는 만들지 않는다.
export function ReviewsSection() {
  const [s, setS] = useState({ loading: true, error: false, reviews: [], total: 0, avg: null, ratingCount: 0, hasMore: false })
  const [more, setMore] = useState(false)
  async function load(offset = 0) {
    try {
      const j = await fetchReviews(offset)
      setS((p) => ({ loading: false, error: false, reviews: offset ? [...p.reviews, ...j.reviews] : j.reviews, total: j.total, avg: j.ratingAverage, ratingCount: j.ratingCount, hasMore: j.hasMore }))
    } catch { setS((p) => ({ ...p, loading: false, error: offset === 0 })) }
  }
  useEffect(() => { load(0) }, [])
  return (
    <section className="ss-reviews" aria-labelledby="ss-stories">
      <h2 id="ss-stories">엄마들의 이야기</h2>
      {s.ratingCount > 0 && <p className="ss-rv-avg">별점 {s.avg}점 · 별점을 남긴 후기 {s.ratingCount}개</p>}
      {s.loading && <p className="ss-rv-note">이야기를 불러오고 있어요…</p>}
      {s.error && <p className="ss-rv-note">이야기를 불러오지 못했어요. <button type="button" onClick={() => { setS((p) => ({ ...p, loading: true, error: false })); load(0) }}>다시 불러오기</button></p>}
      {!s.loading && !s.error && s.reviews.length === 0 && <p className="ss-rv-note">아직 공개된 후기가 없어요.<br />결과지를 받아 보신 분이 남긴 후기가 확인을 거쳐 이곳에 표시됩니다.</p>}
      {s.reviews.map((r) => (
        <article key={r.id} className="ss-rv">
          <p className="meta"><b>{r.nickname}</b> · {r.concernLabel}{r.rating ? <span aria-label={`별점 ${r.rating}점`}> · <span className="star">{starText(r.rating)}</span></span> : null}</p>
          <p className="body">{r.content}</p>
          <p className="foot"><span className={`tag ${r.usageKind}`}>{usageLabel(r.usageKind)}</span> {fmtDate(r.createdAt)}</p>
        </article>
      ))}
      {s.hasMore && <button type="button" className="ss-ghost" disabled={more} onClick={async () => { setMore(true); await load(s.reviews.length); setMore(false) }}>{more ? '불러오는 중…' : '이야기 더 보기'}</button>}
    </section>
  )
}

// 결과지 화면 아래: 후기 남기기. auth = { orderId, orderToken } 또는 { orderId, sessionToken }(이메일 인증 후 다시 본 경우). 주문당 1건, 승인 후 공개.
export function ReviewForm({ auth }) {
  const [elig, setElig] = useState({ loading: true })
  const [open, setOpen] = useState(false)
  const [nickname, setNickname] = useState('')
  const [concern, setConcern] = useState('')
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    let alive = true
    checkReviewEligibility(auth).then((j) => alive && setElig({ ok: true, kind: j.kind, already: j.alreadyReviewed })).catch(() => alive && setElig({ ok: false }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.orderId])
  if (elig.loading || !elig.ok) return null
  const len = reviewLengthState(content)
  async function send() {
    setErr('')
    if (!nickname.trim() || Array.from(nickname.trim()).length > NICKNAME_MAX) return setErr(`닉네임은 1~${NICKNAME_MAX}자로 적어 주세요.`)
    if (!concern) return setErr('관심 분야를 선택해 주세요.')
    if (!len.ok) return setErr(`후기는 ${CONTENT_MIN}자 이상 ${CONTENT_MAX}자 이내로 적어 주세요.`)
    setBusy(true)
    try { await submitReview(auth, { nickname: nickname.trim(), concern, rating: rating || null, content: content.trim() }); setDone(true) }
    catch (e) { setErr(e.message) }
    setBusy(false)
  }
  return (
    <div className="ss-page ss-review-write">
      {elig.already || done ? (
        <p className="ss-rv-note">{done ? '후기를 받았어요. 확인 후 공개됩니다. 고맙습니다.' : '이미 후기를 남겨 주셨어요. 고맙습니다.'}</p>
      ) : !open ? (
        <>
          <p className="ss-rv-note">이용해 보신 경험을 2~3문장으로 남겨 주세요. 좋았던 점도, 아쉬웠던 점도 편하게 적어 주세요.<br />{usageLabel(elig.kind)}으로 표시되며, 확인 후 공개됩니다.</p>
          <button type="button" className="ss-cta" onClick={() => setOpen(true)}>후기 남기기</button>
        </>
      ) : (
        <div className="ss-block" style={{ padding: 0 }}>
          <div className="ss-field"><label htmlFor="ss-rv-nick">닉네임</label><input id="ss-rv-nick" className="ss-input" maxLength={30} value={nickname} onChange={(e) => setNickname(e.target.value)} /></div>
          <div className="ss-field"><span className="lab">관심 분야</span>
            <div className="ss-seg2">{Object.entries(CONCERNS).map(([k, v]) => <button key={k} type="button" aria-pressed={concern === k} onClick={() => setConcern(k)}>{v}</button>)}</div></div>
          <div className="ss-field"><span className="lab">별점 <span className="opt">선택</span></span>
            <div className="ss-seg2">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={rating === n} onClick={() => setRating(rating === n ? 0 : n)}>{n}점</button>)}</div></div>
          <div className="ss-field"><label htmlFor="ss-rv-body">후기 <span className="opt">{len.count}/{CONTENT_MAX}자 · 이메일·전화번호·링크는 적을 수 없어요</span></label>
            <textarea id="ss-rv-body" className="ss-input" rows={5} value={content} onChange={(e) => setContent(e.target.value)} /></div>
          {err && <p className="ss-err">{err}</p>}
          <button type="button" className="ss-cta" disabled={busy} onClick={send}>{busy ? '보내는 중…' : '후기 보내기'}</button>
        </div>
      )}
    </div>
  )
}
