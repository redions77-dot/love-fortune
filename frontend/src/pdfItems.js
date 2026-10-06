// PDF 문서에 들어갈 항목 목록(pdfExport 의 items)을 만든다. 화면과 PDF 가 같은 순서·같은 PART 번호를 쓰도록 한곳에 둔다.
// 사주표는 번호 없는 공통 정보 영역이고, PART 번호는 실제로 출력되는 풀이 섹션만 1부터 연속으로 매긴다(내용이 없는 항목은 건너뛰지 않는다).

const hasContent = (sec) => !!(sec && String(sec.content || '').trim())

// 무료 핵심 풀이 / 전체 분석(무료 풀이 + 유료 풀이)
// coreSections: 내 사주 리포트의 핵심 성향·이유·강점·주의·팁(내용 있는 것만).
export function buildResultPdfItems({ useSajuReport, sajuSummary, coreSections = [], baseShown = [], paidSections = [], moneySummary, sajuData, typeInfo }) {
  const paid = paidSections.filter(hasContent)
  const coreCount = useSajuReport ? coreSections.length : baseShown.length
  // 사주표는 번호 없는 공통 정보 영역이라 세 상품 모두 표지 바로 아래(심화와 같은 자리)에 둔다.
  return [
    ...(sajuData?.사주 ? [{ kind: 'saju', pillars: sajuData.사주, typeInfo: useSajuReport ? typeInfo : undefined }] : []),
    ...(sajuSummary ? [{ kind: 'summary', data: sajuSummary }] : []),
    ...(useSajuReport
      ? coreSections.map((sec, i) => ({ kind: 'section', ...sec, part: i + 1 }))
      : [
          { kind: 'card', selector: '[data-pdf-card="type"]' },
          ...baseShown.map((sec, i) => ({ kind: 'section', title: sec.title, content: sec.content, part: i + 1 })),
        ]),
    ...(paid.length ? [{ kind: 'label', text: '✦ 전체 분석 결과 ✦' }] : []),
    ...(moneySummary ? [{ kind: 'summary', data: moneySummary }] : []),
    ...paid.map((sec, i) => ({ kind: 'section', title: sec.title, content: sec.content, part: coreCount + i + 1 })),
  ]
}

// 심화 분석: 사주표 → (재물·직업 요약) → 풀이 섹션(종합 흐름 요약 바로 다음에 표 두 개) → 마무리(핵심 한 줄 + 행동 계획표)
export function buildDeepPdfItems({ sajuData, moneySummary, sections = [], fallbackText = '', flowTable, choiceTable, closing }) {
  const summaryIdx = sections.findIndex((sec) => /종합\s*흐름/.test(sec.title))
  const tables = [flowTable, choiceTable].filter(Boolean).map((table) => ({ kind: 'table', table }))
  return [
    ...(sajuData?.사주 ? [{ kind: 'saju', pillars: sajuData.사주 }] : []),
    ...(moneySummary ? [{ kind: 'summary', data: moneySummary }] : []),
    ...(sections.length > 0
      ? [
          ...(summaryIdx < 0 ? tables : []),
          ...sections.flatMap((sec, i) => [
            { kind: 'section', title: sec.title, content: sec.content, part: i + 1 },
            ...(i === summaryIdx ? tables : []),
          ]),
        ]
      : [{ kind: 'section', title: '심화 분석', content: fallbackText }]),
    ...(closing ? [{ kind: 'closing', closing }] : []),
  ]
}
