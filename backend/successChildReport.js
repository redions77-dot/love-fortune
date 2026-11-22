// '우리 아이 성공운명서' 결과 모델과 이메일.
// AI가 쓴 해석(successChildPrompt 형식)과 서버 계산값(successChild 의 facts)을 합쳐 화면·이메일이 같이 쓰는 JSON 모델을 만든다.
// 연도·나이·학령, 재물 카드(편재·정재), 계산 근거표, 한계 고지는 계산값과 고정 문장으로 서버가 만든다. AI는 해석 문장만 쓴다.
// 이 파일은 AI를 호출하지 않는다.

const { SECTION_TITLES, PERIOD_COUNT, parseSections, fieldOf, bulletsOf, BULLET_RE, LABEL_RE } = require('./successChildPrompt');
const { TYPE_NAME } = require('./successChildCompare');
const { serverBasis } = require('./successChildPlain');

const EASY_ELEMENT = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' };
const STEM_ELEMENT = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' };
const WEALTH = ['편재', '정재'];
// 첫 화면 대운 띠에는 명리 용어 대신 쉬운 말을 쓴다(용어는 맨 아래 근거란에 보존)
const RAIL_LABEL = { 식신: '재능이 자란다', 상관: '재능이 드러난다', 편재: '돈이 움직인다', 정재: '돈이 쌓인다', 편관: '경쟁과 평가', 정관: '안정된 제도', 편인: '배움이 쌓인다', 정인: '배움이 깊어진다', 비견: '혼자 해낸다', 겁재: '경쟁하는 힘' };
// 전통 해석 사전(3단계 프롬프트의 사전과 같은 문장). 재물 카드는 AI가 아니라 이 문장과 계산값으로 서버가 만든다.
const WEALTH_MEANING = {
  편재: { hanja: '偏財', text: '전통에서 편재는 사업, 영업, 투자, 거래처럼 움직이는 재물과 그 재물을 다루는 감각을 뜻합니다. 들어오고 나가는 폭이 크다는 뜻이며, 큰돈을 번다는 뜻은 아닙니다.' },
  정재: { hanja: '正財', text: '전통에서 정재는 월급이나 정해진 대가처럼 정해진 방식으로 들어와 쌓이고 지켜지는 재물을 뜻합니다. 수입이 안정된다는 보장은 아닙니다.' },
};
const SECTION_META = { 공부운: ['01', 'study'], 직업운: ['02', 'career'], 사업운: ['03', 'business'], 재물운: ['04', 'wealth'] };
// 결과 화면·이메일에 표시하는 생성형 AI 사용 고지(최소 문구)
const AI_NOTICE = '이 결과지의 해석 문장은 생성형 AI가 작성했습니다.';
const PERIODS_NOTE = '시기 옆의 나이는 해당 연도에서 태어난 해를 뺀 나이(사주에서 쓰는 나이)입니다. 만 나이와 1살 차이가 날 수 있습니다.';
const TODO_NOTE = '해볼 일은 아이의 관심과 반응을 살펴보는 방법입니다. 그 결과만으로 아이의 적성이나 미래를 정하지는 않습니다.';
const COMPARE_NOTE = '이 비교는 사주 구조를 푼 설명입니다. 실제 성적, 재능, 진로는 아이의 관심과 경험으로 정해집니다.';
const SIDE_LABEL = { biz: '사업·시장 쪽', study: '공부·제도 쪽', neutral: '어느 쪽도 아님' };
const DISCLAIMER = '이 결과지는 전통 명리학의 해석입니다. 의대·SKY 합격, 직업, 소득, 재산, 사업 성공을 보장하거나 예측하지 않습니다. 대운이 바뀌는 시점은 생일과 절기 계산에 따라 1년 안팎 차이가 납니다.';

const range = (r) => `${r.startYear} ~ ${r.endYear}`;
const ageRange = (r) => `${r.ageFrom}~${r.ageTo}세`;
const paragraphsOf = (body) => String(body || '').split('\n').map((l) => l.trim()).filter((l) => l && !LABEL_RE.test(l) && !BULLET_RE.test(l));

function buildSuccessChildReport(text, facts, { name = '' } = {}) {
  const sec = parseSections(text);
  const SB = serverBasis(facts);
  const rows = facts.rows;
  const first = rows.slice(0, PERIOD_COUNT);

  // 핵심 결론
  const lead = fieldOf(sec['핵심 결론'] || '', '결론');
  // 결론 문장에서 금색으로 강조할 핵심 구절을 고른다(디자인의 강조 위치 유지)
  const m = /^(.*?무기는\s*)(.+?)(입니다\.?)$/.exec(lead) || /^(이 아이는 )((?:사업가형|공부형)\s*사주)(입니다\.?)$/.exec(lead) || /^(.*?)((?:공부|사업)(?:·\S+)? 쪽 특징이)(.*)$/.exec(lead) || /^(이 아이는 )(공부와 사업을 함께 쓰는 사주)(입니다\.?)$/.exec(lead) || /^(.*?)(두 방향이 .+?)(\s(?:사주|구조|아이)입니다\.?)$/.exec(lead);
  const hero = {
    lead,
    leadParts: m ? { pre: m[1], em: m[2], post: m[3] } : { pre: lead, em: '', post: '' },
    summary: fieldOf(sec['핵심 결론'] || '', '요약'),
    compare: facts.compare ? {
      type: facts.compare.type, typeName: TYPE_NAME[facts.compare.type],
      study: fieldOf(sec['핵심 결론'] || '', '공부 쪽'), biz: fieldOf(sec['핵심 결론'] || '', '사업 쪽'), diff: fieldOf(sec['핵심 결론'] || '', '차이'),
      oneLine: fieldOf(sec['핵심 결론'] || '', '한 줄'),
      basisLine: SB.hero,
      todo: fieldOf(sec['핵심 결론'] || '', '해볼 일'),
      signals: facts.compare.signals.map((x) => ({ title: x.title, side: SIDE_LABEL[x.side], detail: x.detail })),
      note: COMPARE_NOTE,
    } : null,
    oneLine: fieldOf(sec['핵심 결론'] || '', '한 줄'),
    todo: fieldOf(sec['핵심 결론'] || '', '해볼 일'),
    todoNote: TODO_NOTE,
    rail: first.map((r) => ({ year: r.startYear, label: RAIL_LABEL[r.stemGod] || r.stemGod, hl: WEALTH.includes(r.stemGod) })),
  };

  // 공부운·직업운·사업운·재물운
  const sections = ['공부운', '직업운', '사업운', '재물운'].map((t) => {
    const b = sec[t] || '';
    const s = { no: SECTION_META[t][0], key: SECTION_META[t][1], label: t, headline: fieldOf(b, '결론'), paras: paragraphsOf(b), bullets: bulletsOf(b), todo: fieldOf(b, '해볼 일'), oneLine: fieldOf(b, '한 줄'), basis: SB[SECTION_META[t][1]] || '' };
    if (t === '재물운') {
      s.coins = rows.slice(0, 6).filter((r) => WEALTH.includes(r.stemGod)).map((r) => ({
        year: range(r), age: `${ageRange(r)} · ${r.ganji} 대운`, kind: r.stemGod, hanja: WEALTH_MEANING[r.stemGod].hanja,
        text: `${WEALTH_MEANING[r.stemGod].text} 이 시기 대운 천간 ${r.ganji[0]}이 ${r.stemGod}입니다.`,
      }));
    }
    return s;
  });

  // 10대·20대·30대 운의 변화: 연도·나이·학령은 서버 계산값, 주제·해석·차이는 AI
  const pb = sec[SECTION_TITLES[5]] || '';
  const periods = first.map((r, idx) => {
    const head = `[대운${idx + 1}]`;
    const i = pb.indexOf(head);
    let blk = '';
    if (i >= 0) { const next = pb.indexOf('\n[대운', i + head.length); blk = pb.slice(i, next < 0 ? undefined : next); }
    return {
      range: range(r), ganji: r.ganji, god: r.stemGod, ages: ageRange(r), school: '',
      theme: fieldOf(blk, '주제'), text: fieldOf(blk, '해석'), scene: fieldOf(blk, '장면'), diff: fieldOf(blk, '차이'), hl: WEALTH.includes(r.stemGod),
    };
  });

  return {
    version: 1,
    name: String(name || '').slice(0, 30),
    meta: metaOf(facts),
    hero, sections, periods,
    periodsHeadline: fieldOf(pb, '결론'),
    periodsNote: PERIODS_NOTE,
    basis: [...leadBasis(hero, sections), ...basisOf(facts)],
    disclaimer: DISCLAIMER,
    aiNotice: AI_NOTICE,
  };
}

// 핵심 결론·각 항목의 '근거:' 줄을 맨 아래 근거란의 앞부분으로 옮긴다
function leadBasis(hero, sections) {
  const out = [];
  if (hero.compare && hero.compare.basisLine) out.push({ dt: '핵심 결론의 근거', dd: [hero.compare.basisLine] });
  for (const s of sections) if (s.basis) out.push({ dt: `${s.label}의 근거`, dd: [s.basis] });
  return out;
}

function metaOf(facts) {
  const c = facts.calc.input;
  const [y, mo, d] = c.birthdate.split('-').map(Number);
  const time = c.timeKnown ? ` ${Number(c.birthtime.slice(0, 2))}시 ${Number(c.birthtime.slice(3))}분` : '';
  return {
    gender: c.gender === '남성' ? '남' : '여',
    birth: `${y}년 ${mo}월 ${d}일${time}생${c.timeKnown ? '' : '(출생 시간 미입력)'}`,
    age: `올해(${facts.age.asOf.slice(0, 4)}년) 만 ${facts.age.man}세`,
  };
}

function basisOf(facts) {
  const t = facts.calc.tenGods, P = facts.calc.pillars;
  const g = (c) => ['식상', '관성', '비겁', '인성', '재성'].map((k) => `${k} ${c.groups[k]}`).join(', ');
  const dayEl = EASY_ELEMENT[STEM_ELEMENT[facts.calc.dayStem]];
  const list = facts.rows.slice(0, 5).map((r) => `${r.ganji}(${r.stemGod})`).join(' → ');
  const jiji = facts.rows.slice(0, PERIOD_COUNT).filter((r) => WEALTH.includes(r.branchMainGod));
  const daeun = [`${facts.calc.daeun.forward ? '순행' : '역행'}, 약 ${facts.calc.daeun.startAge.years}세 ${facts.calc.daeun.startAge.months}개월 시작 · ${list}`];
  if (jiji.length) daeun.push(`본문의 재성 문장은 대운 천간 기준입니다. 대운 지지는 ${jiji.map((r) => `${r.ganji[1]}(본기 ${r.branchMainGod})`).join(', ')}로 재성을 포함합니다.`);
  const entries = [
    { dt: '사주', dd: [`${Object.values(P).filter(Boolean).map((p, i) => p + ['년', '월', '일', '시'][i]).join(' ')} · 일간 ${facts.calc.dayStem}(${dayEl})`] },
    { dt: '십성 집계 (나 자신을 뺀 글자)', dd: [`천간·지지 본기 기준(${t.surface.total}글자): ${g(t.surface)}`, `지장간 포함 기준(${t.withHidden.total}개): ${g(t.withHidden)}`, '두 집계는 서로 다른 값이며, 본문의 "겉으로 드러난 글자"는 앞의 집계입니다.'] },
    ...(facts.compare ? [{ dt: '공부·사업 비교 판정', dd: [...facts.compare.signals.map((x) => `${x.title}: ${SIDE_LABEL[x.side]} — ${x.detail}`), `설명 유형 ${facts.compare.type}: ${TYPE_NAME[facts.compare.type]}. ${facts.compare.reason}.`, '점수나 개수의 합으로 정하지 않았고, 성공 방향이나 능력을 확정하는 값이 아닙니다.'] }] : []),
    { dt: '대운', dd: daeun },
    { dt: '나이', dd: ['대운 구간의 나이는 해당 연도 − 출생 연도(사주에서 쓰는 연 나이)이고, 맨 위의 현재 나이는 만 나이입니다. 둘은 1살 차이가 날 수 있습니다.'] },
    { dt: '계산 범위', dd: [
      '월주와 대운은 절입 시각 기준이며 절입 시각 계산 오차는 약 9분 이내입니다.',
      `지장간은 ${t.tableStatus} 표를 따랐습니다.`,
      '신강·신약, 용신, 격국, 신살, 세운, 지지끼리의 합·충은 계산하지 않았고 본문에 사용하지 않았습니다.',
    ] },
  ];
  if (facts.calc.boundary.nearBoundary) entries[entries.length - 1].dd.unshift('출생 시각이 절입 시각과 20분 이내여서 월주(또는 년주)가 경계에 있습니다.');
  return entries;
}

// 무료 공통 샘플 화면용: 핵심 결론(결론·요약·대운 띠)과 공부운 첫 문단만 보여 주고, 나머지는 제목만 남긴 채 내용을 서버에서 지운다.
// (화면에서 가리는 것이 아니라 모델에서 지우므로 잠긴 내용은 브라우저로 전달되지 않는다.)
function toFreePreview(report) {
  const sections = report.sections.map((s, i) => i === 0
    ? { no: s.no, key: s.key, label: s.label, headline: s.headline, paras: s.paras.slice(0, 1), bullets: [], oneLine: '', basis: '', previewCut: true }
    : { no: s.no, key: s.key, label: s.label, headline: '', paras: [], bullets: [], oneLine: '', basis: '', locked: true });
  return {
    version: report.version, name: report.name, meta: report.meta, preview: true,
    hero: { lead: report.hero.lead, leadParts: report.hero.leadParts, summary: report.hero.summary, oneLine: report.hero.oneLine, todo: report.hero.todo, todoNote: report.hero.todoNote, compare: null, rail: report.hero.rail },
    sections, periods: [], periodsHeadline: '', periodsNote: '', periodsLocked: true,
    basis: [], disclaimer: report.disclaimer, aiNotice: report.aiNotice,
  };
}

// 저장된 이벤트(SSE 조각 배열)에서 결과 모델을 찾는다.
function reportFromEvents(events) {
  for (const chunk of events || []) for (const line of String(chunk).split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try { const j = JSON.parse(line.slice(6)); if (j.type === 'success_report' && j.report) return j.report; } catch { /* 건너뜀 */ }
  }
  return null;
}

// ── 이메일 ── (메일 클라이언트 호환을 위해 표·인라인 스타일만 쓴다. 짙은 녹색·금색 결과지 디자인을 그대로 옮긴다)
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const C = { hero: '#1F2B28', heroInk: '#F4EEE2', heroMuted: '#B9B2A3', gold: '#D6B36A', goldDeep: '#A9802F', goldSoft: '#F3E7CC', goldInk: '#6E4F12', paper: '#F6F1E8', card: '#FFFDF9', ink: '#241F1B', body: '#3A332D', muted: '#8A7F74', line: '#E4DACB' };
const FONT = "'Noto Sans KR','Malgun Gothic',Arial,sans-serif", SERIF = "'Noto Serif KR','Batang',serif";

function renderSuccessChildMail(r) {
  const p = (t, extra = '') => `<p style="margin:0 0 14px;font-size:15px;line-height:1.85;color:${C.body};word-break:keep-all;${extra}">${esc(t)}</p>`;
  const lead = r.hero.leadParts.em ? `${esc(r.hero.leadParts.pre)}<span style="color:${C.gold}">${esc(r.hero.leadParts.em)}</span>${esc(r.hero.leadParts.post)}` : esc(r.hero.lead);
  const rail = `<table role="presentation" width="100%" cellspacing="6" cellpadding="0" style="margin-top:22px"><tr>${r.hero.rail.map((x) => `<td valign="top" style="border-top:2px solid ${x.hl ? C.gold : '#3B4A45'};padding-top:8px;font-size:12px;line-height:1.5;color:${x.hl ? C.heroInk : C.heroMuted}"><b style="font-family:${SERIF};font-size:15px;color:${x.hl ? C.gold : C.heroInk};font-weight:500">${x.year}</b><br>${esc(x.label)}</td>`).join('')}</tr></table>`;
  const heroTop = (r.hero.oneLine ? `<div style="font-size:16px;line-height:1.7;font-weight:700;color:${C.gold};margin-bottom:14px">${esc(r.hero.oneLine)}</div>` : '')
    + (r.hero.todo ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;border:1px solid ${C.gold};border-radius:12px"><tr><td style="padding:14px 16px;font-size:14.5px;line-height:1.8;color:${C.heroInk}"><b style="color:${C.gold}">이번 달 해볼 일</b><br>${esc(r.hero.todo)}<div style="font-size:12px;line-height:1.7;color:${C.heroMuted};margin-top:8px">${esc(r.hero.todoNote || '')}</div></td></tr></table>` : '');
  const cp = r.hero.compare;
  const compare = cp ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;border:1px solid #3B4A45;border-radius:12px"><tr><td style="padding:16px 16px 6px;font-size:12.5px;letter-spacing:.06em;color:${C.gold}">공부 vs 사업 · ${esc(cp.typeName)}</td></tr>
    <tr><td style="padding:0 16px 8px;font-size:14px;line-height:1.8;color:${C.heroInk}"><b style="color:${C.gold}">공부 쪽</b>&nbsp; ${esc(cp.study)}</td></tr>
    <tr><td style="padding:0 16px 8px;font-size:14px;line-height:1.8;color:${C.heroInk}"><b style="color:${C.gold}">사업 쪽</b>&nbsp; ${esc(cp.biz)}</td></tr>
    <tr><td style="padding:0 16px 8px;font-size:14px;line-height:1.8;color:${C.heroInk}"><b style="color:${C.gold}">차이</b>&nbsp; ${esc(cp.diff)}</td></tr>
    <tr><td style="padding:0 16px 8px;font-size:12.5px;line-height:1.75;color:${C.heroMuted}">${cp.basisLine ? '' : cp.signals.map((x) => esc(x.title + ': ' + x.side + ' — ' + x.detail)).join('<br>')}</td></tr>
    <tr><td style="padding:0 16px 14px;font-size:12px;line-height:1.7;color:${C.heroMuted}">${esc(cp.note)}</td></tr></table>` : '';
  const secBlock = (s) => `<tr><td style="padding:30px 24px 8px;border-top:1px solid ${C.line}">
    <div style="font-size:13px;color:${C.muted};letter-spacing:.06em"><span style="font-family:${SERIF};color:${C.goldDeep}">${s.no}</span>&nbsp; <b>${esc(s.label)}</b></div>
    <h2 style="font-family:${SERIF};font-size:20px;line-height:1.5;color:${C.ink};margin:10px 0 16px;font-weight:700">${esc(s.headline)}</h2>
    ${(s.coins || []).map((c) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 14px;border:1px solid ${C.goldDeep};background:${C.goldSoft};border-radius:12px"><tr><td style="padding:16px 18px"><div style="font-family:${SERIF};font-size:22px;font-weight:700;color:${C.goldInk}">${esc(c.year)}</div><div style="font-size:12.5px;color:${C.muted};margin:2px 0 8px">${esc(c.age)}</div><div style="font-family:${SERIF};font-size:18px;font-weight:700;color:${C.ink}">${esc(c.kind)} <span style="font-family:${FONT};font-size:12px;font-weight:400;color:${C.goldInk}">${esc(c.hanja)}</span></div><div style="font-size:14px;line-height:1.8;color:${C.body};margin-top:6px">${esc(c.text)}</div></td></tr></table>`).join('')}
    ${s.paras.map((t) => p(t)).join('')}
    ${(s.bullets || []).length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 16px">${s.bullets.map((x) => `<tr><td valign="top" width="18" style="color:${C.goldDeep};font-size:15px;line-height:1.85">•</td><td style="font-size:14.5px;line-height:1.85;color:${C.body};padding-bottom:8px;word-break:keep-all">${esc(x)}</td></tr>`).join('')}</table>` : ''}
    ${s.todo ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 14px;border:1px solid ${C.line};border-radius:10px"><tr><td style="padding:12px 14px;font-size:14px;line-height:1.75;color:${C.body}"><b style="color:${C.goldInk}">해볼 일</b>&nbsp; ${esc(s.todo)}</td></tr></table>` : ''}
    ${s.oneLine ? `<p style="margin:4px 0 14px;padding:12px 14px;background:${C.goldSoft};border-left:3px solid ${C.goldDeep};font-size:14.5px;line-height:1.7;color:${C.goldInk};font-weight:700">${esc(s.oneLine)}</p>` : ''}
  </td></tr>`;
  const periods = `<tr><td style="padding:30px 24px 8px;border-top:1px solid ${C.line}">
    <div style="font-size:13px;color:${C.muted};letter-spacing:.06em"><span style="font-family:${SERIF};color:${C.goldDeep}">05</span>&nbsp; <b>10대 · 20대 · 30대 운의 변화</b></div>
    <h2 style="font-family:${SERIF};font-size:20px;line-height:1.5;color:${C.ink};margin:10px 0 16px;font-weight:700">${esc(r.periodsHeadline)}</h2>
    ${r.periodsNote ? `<p style="margin:0 0 16px;font-size:12.5px;line-height:1.7;color:${C.muted}">${esc(r.periodsNote)}</p>` : ''}
    ${r.periods.map((x) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;border-left:3px solid ${x.hl ? C.goldDeep : C.line}"><tr><td style="padding:2px 0 2px 14px"><div style="font-family:${SERIF};font-size:18px;font-weight:700;color:${C.ink}">${esc(x.range)} <span style="font-family:${FONT};font-size:12.5px;font-weight:400;color:${C.muted}">${esc(x.ganji)} · ${esc(x.god)}</span></div><div style="font-size:13px;color:${C.muted};margin:0 0 6px">${esc(x.ages)}${x.school ? ' · ' + esc(x.school) : ''}</div>${x.theme ? `<div style="font-size:12px;font-weight:700;color:${C.goldInk};margin-bottom:4px">${esc(x.theme)}</div>` : ''}${p(x.text, 'margin-bottom:6px;font-size:14.5px')}${x.scene ? p('장면 · ' + x.scene, `margin-bottom:6px;font-size:14px;color:${C.goldInk}`) : ''}${x.diff ? p(x.diff, `margin-bottom:0;font-size:13.5px;color:${C.muted}`) : ''}</td></tr></table>`).join('')}
  </td></tr>`;
  const basis = `<tr><td style="padding:24px;border-top:1px solid ${C.line}"><p style="margin:0 0 14px;font-size:12.5px;line-height:1.75;color:${C.muted}"><b>계산 근거와 해석의 한계.</b> ${esc(r.disclaimer)}</p>
    ${r.aiNotice ? `<p style="margin:0 0 14px;font-size:12.5px;line-height:1.75;color:${C.muted}">${esc(r.aiNotice)}</p>` : ''}
    <p style="margin:18px 0 0;font-size:13px;color:${C.body}"><b>사주 풀이 근거</b></p>
    ${r.basis.map((e) => `<div style="font-size:12.5px;line-height:1.8;color:${C.muted};margin-top:10px"><b style="color:${C.body}">${esc(e.dt)}</b><br>${e.dd.map(esc).join('<br>')}</div>`).join('')}</td></tr>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>우리 아이 성공운명서</title><style>@media only screen and (max-width:600px){[style*="font-size:19px"]{font-size:21px!important}[style*="font-size:16px"]{font-size:20px!important}[style*="font-size:20px"]{font-size:22px!important}[style*="font-size:18px"]{font-size:19px!important}[style*="font-size:15px"],[style*="font-size:14.5px"],[style*="font-size:14px"]{font-size:16px!important}[style*="font-size:13.5px"],[style*="font-size:13px"],[style*="font-size:12.5px"]{font-size:14px!important}[style*="font-size:12px"],[style*="font-size:11.5px"]{font-size:13px!important}}</style></head><body style="margin:0;padding:0;background:${C.paper}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.paper}"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;font-family:${FONT};background:${C.card}">
<tr><td style="background:${C.hero};padding:36px 24px 30px;color:${C.heroInk}">
  <div style="font-family:${SERIF};font-size:13px;letter-spacing:.14em;color:${C.gold};margin-bottom:14px">우리 아이 성공운명서</div>
  <h1 style="font-family:${SERIF};font-size:26px;line-height:1.42;margin:0 0 12px;font-weight:700;color:${C.heroInk}">우리 애, 공부로 성공할까?<br>사업으로 성공할까?</h1>
  <div style="font-size:13px;line-height:1.7;color:${C.heroMuted};margin-bottom:24px">${r.name ? esc(r.name) + ' · ' : ''}${esc(r.meta.gender)} · ${esc(r.meta.birth)}<br>${esc(r.meta.age)}</div>
  <div style="border-top:1px solid #3B4A45;padding-top:22px"><div style="font-family:${SERIF};font-size:19px;line-height:1.7;color:${C.heroInk};margin-bottom:14px">${lead}</div>${heroTop}<div style="font-size:14.5px;line-height:1.85;color:${C.heroMuted}">${esc(r.hero.summary)}</div>${compare}${rail}</div>
</td></tr>
${r.sections.map(secBlock).join('')}${periods}${basis}
<tr><td style="padding:18px 24px 30px;text-align:center;font-size:11.5px;color:${C.muted}">우리 아이 성공운명서 · 결제하신 이메일로 발송된 결과지입니다.</td></tr>
</table></td></tr></table></body></html>`;
}

module.exports = { toFreePreview, buildSuccessChildReport, renderSuccessChildMail, reportFromEvents, DISCLAIMER, AI_NOTICE, WEALTH_MEANING };
