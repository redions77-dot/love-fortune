import React from 'react'
import './successSaju.css'

// '우리 아이 성공운명서' 결과 화면. 서버가 보낸 결과 모델(success_report 이벤트)을 확정한 프리미엄 디자인으로 그린다.
// 연도·나이·학령·재물 카드·근거표는 서버가 계산값으로 만든 것이고, 이 컴포넌트는 값을 바꾸지 않고 배치만 한다.
export default function SuccessReport({ report }) {
  const r = report
  const lead = r.hero.leadParts && r.hero.leadParts.em
    ? <>{r.hero.leadParts.pre}<em>{r.hero.leadParts.em}</em>{r.hero.leadParts.post}</>
    : r.hero.lead
  return (
    <div className="ss-page">
      <header className="ss-hero">
        <p className="ss-kicker">우리 아이 성공운명서</p>
        <h1>우리 애, 공부로 성공할까?<br />사업으로 성공할까?</h1>
        <p className="ss-who">{r.name ? `${r.name} · ` : ''}{r.meta.gender} · {r.meta.birth}<br />{r.meta.age}</p>
        <div className="ss-key">
          <p className="ss-key-lead">{lead}</p>
          {r.hero.oneLine && <p className="ss-key-one">{r.hero.oneLine}</p>}
          {r.hero.todo && (
            <div className="ss-key-todo">
              <b>이번 달 해볼 일</b>
              <p>{r.hero.todo}</p>
              {r.hero.todoNote && <small>{r.hero.todoNote}</small>}
            </div>
          )}
          <p className="ss-key-sub">{r.hero.summary}</p>
          {r.hero.compare && (
            <div className="ss-compare">
              <p className="ss-compare-title">공부 vs 사업 · {r.hero.compare.typeName}</p>
              <dl>
                <dt>공부 쪽</dt><dd>{r.hero.compare.study}</dd>
                <dt>사업 쪽</dt><dd>{r.hero.compare.biz}</dd>
                <dt>차이</dt><dd>{r.hero.compare.diff}</dd>
              </dl>
              {!r.hero.compare.basisLine && <ul className="ss-signals">{r.hero.compare.signals.map((x) => <li key={x.title}><b>{x.title}</b> {x.side} — {x.detail}</li>)}</ul>}
              <p className="ss-compare-note">{r.hero.compare.note}</p>
            </div>
          )}
          <div className="ss-rail" aria-label="대운 흐름">
            {r.hero.rail.map((x) => (
              <div key={x.year} className={x.hl ? 'hl' : ''}><b>{x.year}</b><span>{x.label}</span></div>
            ))}
          </div>
          <p className="ss-rail-note">10년 단위로 바뀌는 운(대운)의 흐름</p>
        </div>
      </header>

      <main className="ss-main">
        {r.sections.map((s) => (
          <section key={s.key} className={`ss-sec${s.key === 'wealth' ? ' wealth' : ''}`}>
            <div className="ss-label"><span className="no">{s.no}</span><span className="nm">{s.label}</span></div>
            {s.headline && <h2>{s.headline}</h2>}
            {s.coins && s.coins.length > 0 && (
              <div className="ss-money">
                {s.coins.map((c) => (
                  <div key={c.year} className="ss-coin">
                    <div className="yr">{c.year}</div>
                    <div className="age">{c.age}</div>
                    <div className="kind">{c.kind}<small>{c.hanja}</small></div>
                    <p>{c.text}</p>
                  </div>
                ))}
              </div>
            )}
            {s.locked ? <p className="ss-locked">이 항목의 본문은 유료 결과지에서 확인할 수 있습니다.</p> : <>
            {s.paras.map((t, i) => <p key={i}>{t}</p>)}
            {s.bullets && s.bullets.length > 0 && <ul className="ss-ex">{s.bullets.map((x, i) => <li key={i}>{x}</li>)}</ul>}
            {s.todo && <p className="ss-todo"><b>해볼 일</b> {s.todo}</p>}
            {s.oneLine && <p className="ss-one">{s.oneLine}</p>}
            </>}
            {s.previewCut && <p className="ss-locked">이 아래는 유료 결과지에서 확인할 수 있습니다. 예시, 한 줄 요약, 계산 근거가 이어집니다.</p>}
          </section>
        ))}

        <section className="ss-sec">
          <div className="ss-label"><span className="no">05</span><span className="nm">10대 · 20대 · 30대 운의 변화</span></div>
          {r.periodsHeadline && <h2>{r.periodsHeadline}</h2>}
          {r.periodsNote && <p className="ss-note">{r.periodsNote}</p>}
          {r.periodsLocked && <p className="ss-locked">이 항목의 본문은 유료 결과지에서 확인할 수 있습니다.</p>}
          <ol className="ss-steps">
            {r.periods.map((p) => (
              <li key={p.range} className={`ss-step${p.hl ? ' hl' : ''}`}>
                <div className="yr">{p.range}<small>{p.ganji} · {p.god}</small></div>
                <div className="ages">{p.ages}{p.school ? ` · ${p.school}` : ''}</div>
                {p.theme && <span className="theme">{p.theme}</span>}
                <p>{p.text}</p>
                {p.scene && <p className="scene">장면 · {p.scene}</p>}
                {p.diff && <p className="diff">{p.diff}</p>}
              </li>
            ))}
          </ol>
        </section>

        <p className="ss-disclaimer"><b>계산 근거와 해석의 한계.</b> {r.disclaimer}</p>

        {r.aiNotice && <p className="ss-disclaimer" style={{ marginTop: 8 }}>{r.aiNotice}</p>}

        {r.basis.length > 0 && <details className="ss-basis">
          <summary>사주 풀이 근거 · 계산 숫자와 전문 용어</summary>
          <div className="inner">
            <dl>
              {r.basis.map((e) => (
                <React.Fragment key={e.dt}>
                  <dt>{e.dt}</dt>
                  <dd>{e.dd.map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>)}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        </details>}
      </main>
      <footer className="ss-foot">우리 아이 성공운명서</footer>
    </div>
  )
}
