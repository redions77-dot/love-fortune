// ── 결제 검증 · 주문 · 생성 작업 · 결과 이메일 · 운영자 인증 ─────────────────
// 유료 분석은 서버가 만든 주문(order)과 포트원 결제 조회 결과가 일치할 때만 생성한다.
// 클라이언트가 보내는 isPaid, 가격, 할인액, 결과 HTML, 이메일 제목은 신뢰하지 않는다.
// 이 파일은 비밀값(ADMIN_TOKEN, 포트원 키, 세션 ID, 주문 토큰)을 절대 로그에 남기지 않는다.
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { normalizeRelation } = require('./relations');
const { SUCCESS_CHILD, SUCCESS_CONSENT_VERSION, isProductOrderable } = require('./successChild');
const { renderSuccessChildMail, reportFromEvents } = require('./successChildReport');

// 가격·상품명은 서버에서만 정한다. (쿠폰 할인은 운영에 아직 없으므로 적용하지 않는다)
const PRODUCTS = Object.freeze({
  full_saju:  { amount: 1990,  name: '마이사주 전체 분석',          kind: 'personal',  analysisType: '전체',     prefix: 'saju',    autoEmail: true,  resultType: 'base',      emailLabel: '✨ 나의 사주 분석' },
  full_child: { amount: 9900,  name: '마이사주 자녀운 프리미엄',    kind: 'personal',  analysisType: '자녀천명', prefix: 'child',   autoEmail: true,  resultType: 'child',     emailLabel: '🌱 우리 아이 진로·학과 프리미엄' },
  full_nohu:  { amount: 1990,  name: '마이사주 전체 분석',          kind: 'personal',  analysisType: '노후',     prefix: 'saju',    autoEmail: true,  resultType: 'nohu',      emailLabel: '🌅 노후 운세 분석' },
  deep:       { amount: 9900,  name: '마이사주 심화 분석',          kind: 'personal',  analysisType: '심화',     prefix: 'deep',    autoEmail: true,  resultType: 'deep' },
  gunghab:    { amount: 1990,  name: '마이사주 궁합 분석',          kind: 'gunghab',   analysisType: '궁합',     prefix: 'gunghab', autoEmail: false, resultType: 'gunghab' },
  gilil:      { amount: 9900,  name: '마이사주 길일 추천',          kind: 'gilil',                               prefix: 'gilil' },
  baeknyeon:  { amount: 99000, name: '마이사주 100년 사주 인생 꿀팁', kind: 'baeknyeon', analysisType: '100년꿀팁', prefix: 'baek',    autoEmail: false, resultType: '100년꿀팁' },
  // 우리 아이 성공사주 — 가격·이름은 successChild.js 한 곳에서 정한다. SUCCESS_CHILD_ENABLED=1 이 아니면 주문을 받지 않는다(isProductOrderable).
  success_child: { amount: SUCCESS_CHILD.amount, name: SUCCESS_CHILD.name, kind: 'personal', analysisType: SUCCESS_CHILD.analysisType, prefix: 'success', autoEmail: false, resultType: 'success_child', emailLabel: '🌟 ' + SUCCESS_CHILD.reportName },
});

// 무료 체험 코드: 12자, 헷갈리는 글자(0·O·1·I) 제외, 표시는 MS-XXXX-XXXX-XXXX. 사용자가 접두어·하이픈·공백 없이 입력해도 같은 코드로 본다.
const TRIAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TRIAL_CODE_LEN = 12;
const TRIAL_PREFIX = 'MS';
function normalizeTrialCode(value) {
  let s = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length === TRIAL_CODE_LEN + TRIAL_PREFIX.length && s.startsWith(TRIAL_PREFIX)) s = s.slice(TRIAL_PREFIX.length);
  return s.length === TRIAL_CODE_LEN && [...s].every((c) => TRIAL_ALPHABET.includes(c)) ? s : '';
}

// 주문 없이 /api/analyze로 요청하면 거부할 유료 전용 분석 유형
const PAID_ONLY_ANALYSIS_TYPES = new Set(['궁합', '100년꿀팁', '심화', '길일', SUCCESS_CHILD.analysisType]);


const GILIL_PURPOSES = ['이사', '계약', '개업', '결혼', '수술', '시험'];
const JOB_TRUNCATED = 'truncated';          // done 이지만 max_tokens 로 잘린 결과 (analysis_jobs.last_error)
const JOB_REGENERATING = 'regenerating';    // 잘린 결과를 다시 만드는 중: 새 결과가 나올 때까지 기존 부분 결과를 보존
const MAX_JOB_ATTEMPTS = 3;          // 실패 후 자동 재시도 허용 횟수 (쿨다운 이후 다시 3회)
const RETRY_COOLDOWN_MINUTES = 30;
const LEASE_SECONDS = 90;            // 생성 중 작업의 임대 시간 (하트비트로 연장)
const HEARTBEAT_MS = 30 * 1000;
const ADMIN_SESSION_HOURS = 8;
const ADMIN_REMEMBER_HOURS = 24 * 365;   // 관리자 전용 주소에서 "이 기기에서 계속 사용"을 고른 로그인 (쿠키 최대 수명 400일 이내)
const adminSessionHours = (body) => (body && body.remember === true ? ADMIN_REMEMBER_HOURS : ADMIN_SESSION_HOURS);
const ADMIN_COOKIE = 'mysaju_admin';
const ADMIN_TOKEN_MIN_LENGTH = 32;

// ── 공통 유틸 ──────────────────────────────────────────
const sha256Hex = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

function safeEqualHex(a, b) {
  const ba = Buffer.from(String(a || ''), 'hex');
  const bb = Buffer.from(String(b || ''), 'hex');
  return ba.length > 0 && ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function clientIp(req) {
  const xff = req.get('x-forwarded-for');
  return (xff ? xff.split(',')[0].trim() : req.socket?.remoteAddress) || 'unknown';
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
const isValidEmail = (v) => typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v.trim());

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bool = (v) => v === true || v === 'true' || v === '1' || v === 1;
const dateStr = (v) => { const s = str(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; };
const timeStr = (v) => { const s = str(v, 5); return /^\d{1,2}:\d{2}$/.test(s) ? s : ''; };

// 간단한 메모리 기반 슬라이딩 윈도 제한기 (단일 인스턴스 기준)
function createLimiter({ windowMs, max }) {
  const buckets = new Map();
  const recent = (key) => {
    const now = Date.now();
    const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length) buckets.set(key, arr); else buckets.delete(key);
    return arr;
  };
  const sweep = setInterval(() => { for (const key of [...buckets.keys()]) recent(key); }, 10 * 60 * 1000);
  sweep.unref?.();
  return {
    limited: (key) => recent(key).length >= max,
    hit: (key) => { const arr = recent(key); arr.push(Date.now()); buckets.set(key, arr); },
    reset: (key) => buckets.delete(key),
    retryAfterSec: (key) => { const arr = recent(key); return arr.length ? Math.max(1, Math.ceil((windowMs - (Date.now() - arr[0])) / 1000)) : 0; },
  };
}

// fetch가 없는 Node 버전에서도 동작하도록 http(s) 모듈로 JSON 요청을 보낸다.
function httpJson(url, { method = 'GET', headers = {}, body, timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'http:' ? http : https;
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = lib.request(u, {
      method,
      headers: { Accept: 'application/json', ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}), ...headers },
      timeout: timeoutMs,
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(new Error('response_too_large')); });
      res.on('end', () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch { /* JSON이 아닌 응답 */ }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── 이메일 템플릿 (기존 프런트엔드 템플릿과 같은 모양, 본문은 이스케이프) ─────────
// 프런트엔드 parseSections와 같은 규칙
function parseSections(text) {
  const sections = [];
  const seen = new Set();
  const parts = String(text || '').split(/===(.+?)===/s);
  if (parts[0]?.trim()) sections.push({ title: '분석 결과', content: parts[0].trim() });
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim();
    if (!seen.has(title)) { seen.add(title); sections.push({ title, content: parts[i + 1]?.trim() || '' }); }
  }
  return sections;
}

const MAIL_WRAP_START = `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#0D1B3E;color:#FFFFFF;box-sizing:border-box;">`;
const MAIL_HR = '<hr style="border:none;border-top:1px solid rgba(201,168,76,0.3);margin:24px 0;">';
const MAIL_FOOTER = '<hr style="border:none;border-top:1px solid rgba(201,168,76,0.3);margin:32px 0 16px;"><p style="text-align:center;color:rgba(255,255,255,0.4);font-size:12px;">마이사주 · mysaju.shop</p></div>';
const mailSections = (sections) => sections.map((s) => `<div style="margin-bottom:32px;"><h2 style="color:#C9A84C;font-size:18px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(201,168,76,0.15);">${escapeHtml(s.title)}</h2><p style="color:rgba(255,255,255,0.85);font-size:17px;line-height:1.8;white-space:pre-wrap;word-break:keep-all;margin:0;">${escapeHtml(s.content)}</p></div>`).join('');

// 기존 autoSendEmail 템플릿
function standardMail(heading, name, sections) {
  return `${MAIL_WRAP_START}<h1 style="color:#C9A84C;text-align:center;font-size:22px;margin-bottom:8px;">${escapeHtml(heading)}</h1><p style="text-align:center;color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:24px;">${escapeHtml(name || '')}님의 분석 결과</p>${MAIL_HR}${mailSections(sections)}${MAIL_FOOTER}`;
}

// 기존 궁합 결과 화면의 이메일 템플릿
function gunghabMail(nameA, nameB, sections) {
  return `${MAIL_WRAP_START}<h1 style="color:#C9A84C;text-align:center;font-size:22px;margin-bottom:24px;">🔮 ${escapeHtml(nameA)}님 &amp; ${escapeHtml(nameB)}님 궁합 분석</h1>${MAIL_HR}${mailSections(sections)}${MAIL_FOOTER}`;
}

// 기존 운영자 화면의 심화 결과 재발송 템플릿
function adminResendMail(userName, resultText) {
  return `${MAIL_WRAP_START}<h1 style="color:#C9A84C;text-align:center;font-size:22px;margin-bottom:8px;">🔮 사주 심화 분석 결과</h1><p style="text-align:center;color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:24px;">${escapeHtml(userName || '')}님의 분석 결과</p>${MAIL_HR}<p style="color:rgba(255,255,255,0.85);font-size:17px;line-height:1.8;white-space:pre-wrap;word-break:keep-all;margin:0;">${escapeHtml(resultText)}</p>${MAIL_FOOTER}`;
}

// 저장된 SSE 이벤트를 프런트엔드 streamAnalyze와 같은 규칙으로 본문/유료 텍스트로 나눈다.
function textsFromEvents(events) {
  let base = '', paid = '', all = '', paidStarted = false;
  for (const chunk of events || []) {
    for (const line of String(chunk).split('\n')) {
      if (!line.startsWith('data: ')) continue;
      let json;
      try { json = JSON.parse(line.slice(6)); } catch { continue; }
      if (json.type === 'score') base += json.text || '';
      else if (json.type === 'paid_start') paidStarted = true;
      else if (typeof json.text === 'string' && !json.type) {
        all += json.text;
        if (paidStarted) paid += json.text; else base += json.text;
      }
    }
  }
  return { base, paid, all };
}

// 주문 결과로 이메일 내용을 만든다. variant: 'auto'(생성 직후 자동 발송) | 'manual'(결과 화면에서 발송)
function buildOrderMail(order, events, variant) {
  const product = PRODUCTS[order.product];
  const input = order.input || {};
  const { base, paid, all } = textsFromEvents(events);
  if (order.product === SUCCESS_CHILD.key) {
    // 우리 아이 성공운명서: 결과 모델(success_report)로 결과지 디자인 그대로 메일을 만든다. 모델이 없으면 기존 표준 양식으로 보낸다.
    const report = reportFromEvents(events);
    const name = input.userName || '';
    if (report) return { subject: name ? `${product.emailLabel} - ${name}님의 결과` : `${product.emailLabel}가 도착했습니다`, html: renderSuccessChildMail(report), resultText: all, userName: name };
  }
  if (product.kind === 'personal' && product.analysisType !== '심화') {
    const name = input.userName || '';
    const resultText = base + '\n' + paid;
    if (variant === 'auto') {
      const subject = `${product.emailLabel} - ${name}님의 결과`;
      return { subject, html: standardMail(subject, name, [...parseSections(base), ...parseSections(paid)]), resultText, userName: name };
    }
    // 결과 화면 발송: 화면에 보이는 무료 본문(서버가 저장해 둔 것) + 유료 본문
    const screenBase = (input.freeText || '') + base;
    return { subject: `✨ ${name}님의 사주 분석 결과`, html: standardMail(product.emailLabel, name, [...parseSections(screenBase), ...parseSections(paid)]), resultText, userName: name };
  }
  if (product.analysisType === '심화') {
    const name = input.userName || '';
    const filtered = parseSections(all).filter((s) => s.title !== '분석 결과' && !s.title.includes('운의계절') && s.content?.trim());
    const subject = `🔮 ${name}님의 사주 심화 분석 결과`;
    return { subject, html: standardMail(subject, name, filtered.length > 0 ? filtered : [{ title: '심화 분석', content: all }]), resultText: all, userName: name };
  }
  if (product.kind === 'gunghab') {
    const nameA = input.myName || 'A', nameB = input.partnerName || 'B';
    return { subject: `🔮 ${nameA}님 & ${nameB}님 궁합 분석 결과`, html: gunghabMail(nameA, nameB, parseSections(all)), resultText: all, userName: input.myName || '' };
  }
  if (product.kind === 'baeknyeon') {
    const name = input.userName || '';
    const subject = `🌟 ${name}님의 100년 사주 인생 꿀팁`;
    return { subject, html: standardMail(subject, name, [{ title: '100년 인생 꿀팁', content: all }]), resultText: all, userName: name };
  }
  return null;
}

// ── 메일 발송 수단 ─────────────────────────────────────
function createMailer() {
  if (process.env.EMAIL_TRANSPORT === 'test') {
    if (process.env.NODE_ENV === 'production') throw new Error('EMAIL_TRANSPORT=test는 운영 환경에서 사용할 수 없습니다.');
    const outbox = process.env.EMAIL_TEST_OUTBOX;
    return {
      async send({ to, subject, html }) {
        if (process.env.EMAIL_TEST_FAIL === '1') throw new Error('test_mail_failure');
        if (outbox) fs.appendFileSync(outbox, JSON.stringify({ to, subject, html }) + '\n');
      },
    };
  }
  return {
    async send({ to, subject, html }) {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) throw new Error('mail_not_configured');
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS } });
      await transporter.sendMail({ from: `마이사주 <${process.env.GMAIL_USER}>`, to, subject, html });
    },
  };
}

// ── 포트원(아임포트 v1) 결제 조회 ───────────────────────
// 테스트 거래(include_sandbox) 조회 허용 여부. 운영에서는 항상 false.
function sandboxLookupEnabled() {
  return process.env.PORTONE_INCLUDE_SANDBOX === 'true' && process.env.MYSAJU_TEST_ENV === '1' && process.env.NODE_ENV !== 'production';
}
function createPortoneClient() {
  if (process.env.PORTONE_INCLUDE_SANDBOX === 'true') {
    if (sandboxLookupEnabled()) console.warn('[PAY] 테스트 거래 조회 모드(include_sandbox) 켜짐 — 테스트 환경 전용');
    else console.warn('[PAY] PORTONE_INCLUDE_SANDBOX 는 테스트 환경(MYSAJU_TEST_ENV=1, NODE_ENV≠production)에서만 적용됩니다. 무시합니다.');
  }
  let cached = null; // { token, expiresAt }
  const base = () => (process.env.PORTONE_API_BASE || 'https://api.iamport.kr').replace(/\/$/, '');
  const fail = (code) => Object.assign(new Error(code), { code });

  async function accessToken() {
    if (cached && cached.expiresAt > Date.now() + 60 * 1000) return cached.token;
    const key = process.env.PORTONE_API_KEY, secret = process.env.PORTONE_API_SECRET;
    if (!key || !secret) throw fail('portone_not_configured');
    const { status, json } = await httpJson(`${base()}/users/getToken`, { method: 'POST', body: { imp_key: key, imp_secret: secret } });
    const token = json?.response?.access_token;
    if (status !== 200 || !token) throw fail('portone_auth_failed');
    const expiresAt = json.response.expired_at ? json.response.expired_at * 1000 : Date.now() + 10 * 60 * 1000;
    cached = { token, expiresAt };
    return token;
  }

  // 테스트 채널(sandbox) 거래 조회: 기본은 꺼짐. 테스트 환경 표시(MYSAJU_TEST_ENV=1)가 있고 NODE_ENV 가 production 이 아닐 때만 켜진다.
  // 운영 서버는 이 변수들을 설정하지 않으므로 조회 주소가 종전과 같다. (포트원 V1 조회 API 의 include_sandbox 파라미터)
  const sandboxQuery = (path) => (sandboxLookupEnabled() ? path + (path.includes('?') ? '&' : '?') + 'include_sandbox=true' : path);

  async function getJson(rawPath) {
    const path = sandboxQuery(rawPath);
    const token = await accessToken();
    const { status, json } = await httpJson(`${base()}${path}`, { headers: { Authorization: token } });
    if (status === 401) { cached = null; throw fail('portone_auth_failed'); }
    if (status === 404) return null;
    if (status !== 200 || !json) throw fail('portone_unavailable');
    if (json.code !== 0 || !json.response) return null;
    return json.response;
  }

  // 삭제 판단용 엄격한 조회: 포트원이 "그 주문번호의 결제 없음"을 분명히 답한 경우(HTTP 404 + code -1)만 { found: false }.
  // 200 이지만 code≠0 이거나 본문이 비어 있는 등 불명확한 응답은 "없음"으로 단정하지 않고 예외로 돌려 삭제를 보류하게 한다.
  async function findPaidStrict(merchantUid) {
    const token = await accessToken();
    const { status, json } = await httpJson(`${base()}${sandboxQuery(`/payments/find/${encodeURIComponent(merchantUid)}/paid`)}`, { headers: { Authorization: token } });
    if (status === 401) { cached = null; throw fail('portone_auth_failed'); }
    if (status === 404) { if (json && json.code === -1 && !json.response) return { found: false }; throw fail('portone_ambiguous'); }
    if (status !== 200 || !json) throw fail('portone_unavailable');
    if (json.code === 0 && json.response) return { found: true, payment: json.response };
    throw fail('portone_ambiguous');
  }

  // 결제 전액 취소(환불). 금액은 호출한 쪽이 서버 주문 기록에서 읽어 넘긴다. 취소됨(cancelled)으로 확인될 때만 성공이다.
  async function cancelPayment({ impUid, merchantUid, amount, reason }) {
    const token = await accessToken();
    const { status, json } = await httpJson(`${base()}/payments/cancel`, { method: 'POST', headers: { Authorization: token }, body: { imp_uid: impUid, merchant_uid: merchantUid, amount, checksum: amount, reason } });
    if (status === 401) { cached = null; throw fail('portone_auth_failed'); }
    if (status !== 200 || !json) throw fail('portone_unavailable');
    if (json.code !== 0 || !json.response || json.response.status !== 'cancelled') throw fail('portone_cancel_rejected');
    return json.response;
  }

  return {
    findPaidStrict,
    cancelPayment,
    // 결제 건이 없으면 null, 조회 자체가 실패하면 예외(재시도 가능)
    getPayment: (impUid) => getJson(`/payments/${encodeURIComponent(impUid)}`),
    // 주문번호(merchant_uid)로 결제 완료 건 조회 — 고객이 결제 직후 창을 닫은 경우 운영자가 확인할 때 사용
    findPaidByMerchantUid: (merchantUid) => getJson(`/payments/find/${encodeURIComponent(merchantUid)}/paid`),
  };
}

// ── 메인 ──────────────────────────────────────────────
function installSecureApi({ app, pool, runAnalysis, computeGilil, allowedOrigins, portone: portoneOverride }) {
  const RUNNER_ID = crypto.randomBytes(8).toString('hex');
  const liveJobs = new Map(); // orderId → { events, listeners, finished }
  const mailer = createMailer();
  const portone = portoneOverride || createPortoneClient();

  const adminLoginIpLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
  const adminLoginGlobalLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
  const adminAuthFailLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
  const orderCreateLimiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 20 });
  const orderAuthFailLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
  // 무료 분석은 요청마다 AI를 부르므로 IP당 10분에 20회까지만 받는다(주문 생성 제한과 같은 수준).
  const freeAnalyzeLimiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

  // ── 스키마 ── (빈 DB에서 server.js의 results 생성과 동시에 실행되면 실패할 수 있어, 실패 시 다음 요청에서 다시 시도)
  const createSchema = () => pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      product TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount >= 0),
      token_hash TEXT NOT NULL,
      input JSONB NOT NULL,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
      is_comp BOOLEAN NOT NULL DEFAULT FALSE,
      imp_uid TEXT UNIQUE,
      paid_amount INTEGER,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
    CREATE TABLE IF NOT EXISTS analysis_jobs (
      order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('generating', 'done', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      runner_id TEXT,
      lease_until TIMESTAMPTZ,
      events JSONB,
      result_text TEXT,
      last_error TEXT,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS free_results (
      id TEXT PRIMARY KEY,
      result_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id_hash TEXT PRIMARY KEY,
      token_fingerprint TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS email_sends (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT,
      result_id INTEGER,
      recipient_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_email_sends_created ON email_sends(created_at);
    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      type TEXT NOT NULL,
      result_text TEXT NOT NULL,
      user_name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE results ADD COLUMN IF NOT EXISTS order_id TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_started_at TIMESTAMPTZ;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
    ALTER TABLE analysis_jobs ADD COLUMN IF NOT EXISTS notice_sent_at TIMESTAMPTZ;
    -- 무료 체험 일회용 코드. 코드 원문은 저장하지 않고 해시만 둔다. used_at 이 채워지면 다시 쓸 수 없고, 이메일 해시는 한 번만 허용한다.
    CREATE TABLE IF NOT EXISTS trial_codes (
      code_hash TEXT PRIMARY KEY,
      label TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      used_at TIMESTAMPTZ,
      order_id TEXT UNIQUE,
      email_hash TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_trial_codes_email ON trial_codes(email_hash) WHERE email_hash IS NOT NULL;
    -- 내 결과지 다시 보기: 이메일 인증번호(해시+솔트만 저장, 유효시간·시도 횟수 제한)와 인증 후 열람 토큰(해시만 저장, 짧은 유효시간)
    CREATE TABLE IF NOT EXISTS result_otps (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      salt TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_result_otps_email ON result_otps(email, id DESC);
    CREATE TABLE IF NOT EXISTS result_sessions (
      token_hash TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `).then(() => console.log('[DB] orders / analysis_jobs / admin_sessions 테이블 준비 완료'));
  let schemaPromise = null;
  const ensureSchema = () => {
    if (!schemaPromise) {
      schemaPromise = createSchema().catch((e) => {
        console.error('[DB] 보안 테이블 생성 실패(다음 요청에서 재시도):', e.message);
        schemaPromise = null;
        throw e;
      });
    }
    return schemaPromise;
  };
  ensureSchema().catch(() => setTimeout(() => ensureSchema().catch(() => {}), 2000));

  // 오래된 임시 데이터 정리 (무료 결과 24시간, 만료 세션, 발송 기록 7일). 미결제 주문(7일)은 결제사에 먼저 확인한 뒤에만 지운다.
  const cleanup = () => ensureSchema().then(() => pool.query(`
    DELETE FROM free_results WHERE created_at < NOW() - INTERVAL '24 hours';
    DELETE FROM admin_sessions WHERE expires_at < NOW();
    DELETE FROM email_sends WHERE created_at < NOW() - INTERVAL '7 days';
    DELETE FROM result_otps WHERE expires_at < NOW() - INTERVAL '1 day';
    DELETE FROM result_sessions WHERE expires_at < NOW();
  `)).then(() => reconcileExpiredPending()).catch((e) => console.error('[DB] 정리 작업 실패:', e.message));
  setTimeout(cleanup, 5000).unref?.();
  setInterval(cleanup, 60 * 60 * 1000).unref?.();

  // ── 7일 지난 미결제(pending) 주문 정리: 삭제 전에 결제사에서 실제 결제 여부를 확인한다 ──
  // 고객이 결제 직후 창을 닫으면 결제는 됐는데 주문은 pending 으로 남는다. 이를 그대로 지우면 운영자 확인(/api/admin/orders/:id/verify)도 불가능해진다.
  //  - 결제 완료가 확인되면: 기존 결제 검증(applyVerifiedPayment: 주문번호·금액·통화·중복 방지)을 거쳐 paid 로 복구하고 지우지 않는다.
  //    (생성·메일 발송은 여기서 시작하지 않는다. 고객이 결과를 열거나 운영자가 발송/재생성한다.)
  //  - 결제사가 "결제 없음"을 분명히 답한 주문만 지운다. 조회 실패·시간 초과·불명확한 응답·검증 불일치는 지우지 않고 보류한다.
  //  - 한 번에 최대 RECONCILE_BATCH 건만, 호출 사이 간격을 두고 확인하며, 연속 조회 실패가 이어지면 이번 실행을 멈춘다.
  //  - 같은 프로세스·여러 인스턴스의 동시 실행은 DB advisory lock 으로 막는다. 보류한 주문은 일정 시간 다시 조회하지 않는다.
  const RECONCILE_BATCH = 20;
  const RECONCILE_GAP_MS = 250;
  const RECONCILE_MAX_LOOKUP_FAILURES = 3;
  const RECONCILE_HOLD_MS = 6 * 60 * 60 * 1000;           // 결제 검증 불일치 등 사람이 봐야 하는 건
  const RECONCILE_LOOKUP_RETRY_MS = 3 * 60 * 60 * 1000;   // 결제사 조회 실패(일시 장애 가능)
  const heldUntil = new Map();   // orderId → 다시 확인해도 되는 시각
  let reconciling = false;
  const sleep = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

  async function reconcileExpiredPending({ batch = RECONCILE_BATCH, gapMs = RECONCILE_GAP_MS } = {}) {
    const stats = { checked: 0, recovered: 0, deleted: 0, held: 0, skipped: null };
    if (reconciling) { stats.skipped = 'in_process'; return stats; }
    reconciling = true;
    let client;
    try {
      client = await pool.connect();
      const lock = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS ok', ['orders:reconcile']);
      if (!lock.rows[0]?.ok) { stats.skipped = 'locked'; return stats; }
      try {
        const now = Date.now();
        for (const [id, until] of heldUntil) if (until <= now) heldUntil.delete(id);
        const { rows } = await pool.query(
          `SELECT id, amount FROM orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days' AND id <> ALL($2::text[]) ORDER BY created_at LIMIT $1`,
          [batch, [...heldUntil.keys()]]
        );
        let lookupFailures = 0;
        for (const row of rows) {
          stats.checked++;
          try {
            let found;
            try {
              found = await portone.findPaidStrict(row.id);
              lookupFailures = 0;
            } catch (e) {   // 조회 실패·시간 초과·불명확한 응답: 미결제로 보지 않고 삭제를 보류한다
              lookupFailures++; stats.held++;
              // 일시 장애일 수 있어 잠시 뒤 다시 확인하되, 계속 실패하는 주문이 오래된 순서로 앞을 막지 않도록 일정 시간 건너뛴다.
              heldUntil.set(row.id, Date.now() + RECONCILE_LOOKUP_RETRY_MS);
              console.warn(`[PAY] 만료 주문 결제 조회 실패 order=${row.id} code=${e.code || 'error'}`);
              if (lookupFailures >= RECONCILE_MAX_LOOKUP_FAILURES) { stats.skipped = 'lookup_failures'; break; }
              await sleep(gapMs);
              continue;
            }
            if (found.found) {
              const r = await applyVerifiedPayment({ id: row.id, amount: row.amount }, found.payment);
              if (r.status === 200) { stats.recovered++; console.log(`[PAY] 만료 대상 주문의 결제를 확인해 복구 order=${row.id}`); }
              else { stats.held++; heldUntil.set(row.id, Date.now() + RECONCILE_HOLD_MS); console.warn(`[PAY] 만료 대상 주문의 결제 검증 보류 order=${row.id} code=${r.body?.code || r.status} (운영자 확인 필요)`); }
            } else {
              const del = await pool.query(`DELETE FROM orders WHERE id = $1 AND status = 'pending'`, [row.id]);
              stats.deleted += del.rowCount || 0;
            }
          } catch (e) {   // 주문별 오류가 전체 정리를 멈추지 않게 한다
            stats.held++; heldUntil.set(row.id, Date.now() + RECONCILE_HOLD_MS);
            console.error(`[PAY] 만료 주문 처리 오류 order=${row.id}`, e.code || e.message);
          }
          await sleep(gapMs);
        }
      } finally {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', ['orders:reconcile']).catch(() => {});
      }
    } finally {
      client?.release();
      reconciling = false;
    }
    if (stats.checked) console.log(`[PAY] 만료 주문 정리 확인=${stats.checked} 복구=${stats.recovered} 삭제=${stats.deleted} 보류=${stats.held}${stats.skipped ? ' 중단=' + stats.skipped : ''}`);
    return stats;
  }

  // 생성 중인 작업의 임대 시간을 연장한다.
  setInterval(() => {
    const ids = [...liveJobs.keys()];
    if (!ids.length) return;
    pool.query(`UPDATE analysis_jobs SET lease_until = NOW() + make_interval(secs => $3), updated_at = NOW()
                WHERE order_id = ANY($1) AND runner_id = $2 AND status = 'generating'`, [ids, RUNNER_ID, LEASE_SECONDS])
      .catch((e) => console.error('[JOB] 하트비트 실패:', e.message));
  }, HEARTBEAT_MS).unref?.();

  const withSchema = (handler) => async (req, res, next) => {
    try { await ensureSchema(); } catch { return res.status(503).json({ error: '잠시 후 다시 시도해주세요.' }); }
    try { await handler(req, res, next); } catch (e) {
      console.error('[SECURE] 처리 오류:', req.method, req.path, e?.code || '', e?.message || e);
      if (!res.headersSent) res.status(500).json({ error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.' });
      else if (!res.writableEnded) res.end();
    }
  };

  // ── CSRF 방어: 상태를 바꾸는 운영자 요청은 허용된 Origin에서만 받는다 ──
  function originAllowed(req) {
    const origin = req.get('origin');
    if (origin) return allowedOrigins.includes(origin);
    const referer = req.get('referer');
    if (!referer) return false;
    try { return allowedOrigins.includes(new URL(referer).origin); } catch { return false; }
  }

  // ── 운영자 인증 ──
  const adminTokenFingerprint = () => {
    const token = process.env.ADMIN_TOKEN || '';
    return token.length >= ADMIN_TOKEN_MIN_LENGTH ? sha256Hex('fp:' + token).slice(0, 32) : null;
  };

  function setAdminCookie(res, value, maxAgeSec) {
    const secure = process.env.ADMIN_COOKIE_INSECURE === '1' && process.env.NODE_ENV !== 'production' ? '' : '; Secure';
    res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Path=/api/admin; HttpOnly${secure}; SameSite=Strict; Max-Age=${maxAgeSec}`);
  }

  async function currentAdminSession(req) {
    const fingerprint = adminTokenFingerprint();
    if (!fingerprint) return null; // 서버 환경변수가 없으면 모든 운영자 인증 거부
    const sid = parseCookies(req.get('cookie'))[ADMIN_COOKIE];
    if (!sid || sid.length > 100) return null;
    const { rows } = await pool.query(
      'SELECT id_hash FROM admin_sessions WHERE id_hash = $1 AND token_fingerprint = $2 AND expires_at > NOW()',
      [sha256Hex(sid), fingerprint]
    );
    return rows[0] || null;
  }

  const requireAdmin = withSchema(async (req, res, next) => {
    const ip = clientIp(req);
    if (adminAuthFailLimiter.limited(ip)) {
      res.setHeader('Retry-After', String(adminAuthFailLimiter.retryAfterSec(ip)));
      return res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' });
    }
    if (req.method !== 'GET' && !originAllowed(req)) return res.status(403).json({ error: '허용되지 않은 요청입니다.' });
    const session = await currentAdminSession(req);
    if (!session) { adminAuthFailLimiter.hit(ip); return res.status(401).json({ error: '운영자 인증이 필요합니다.' }); }
    req.adminSession = session;
    next();
  });

  app.post('/api/admin/login', withSchema(async (req, res) => {
    if (!originAllowed(req)) return res.status(403).json({ error: '허용되지 않은 요청입니다.' });
    const fingerprint = adminTokenFingerprint();
    if (!fingerprint) return res.status(503).json({ error: '운영자 인증이 설정되지 않았습니다.' });
    const ip = clientIp(req);
    if (adminLoginIpLimiter.limited(ip) || adminLoginGlobalLimiter.limited('all')) {
      res.setHeader('Retry-After', String(Math.max(adminLoginIpLimiter.retryAfterSec(ip), adminLoginGlobalLimiter.retryAfterSec('all'))));
      return res.status(429).json({ error: '로그인 시도가 너무 많아요. 잠시 후 다시 시도해주세요.' });
    }
    const supplied = typeof req.body?.token === 'string' ? req.body.token : '';
    const ok = supplied.length > 0 && safeEqualHex(sha256Hex(supplied), sha256Hex(process.env.ADMIN_TOKEN));
    if (!ok) {
      adminLoginIpLimiter.hit(ip); adminLoginGlobalLimiter.hit('all');
      console.warn('[ADMIN] 로그인 실패');
      await new Promise((r) => setTimeout(r, 300));
      return res.status(401).json({ error: '인증에 실패했습니다.' });
    }
    adminLoginIpLimiter.reset(ip);
    const hours = adminSessionHours(req.body);
    const sid = randomToken(32);
    await pool.query(
      `INSERT INTO admin_sessions (id_hash, token_fingerprint, expires_at) VALUES ($1, $2, NOW() + make_interval(hours => $3))`,
      [sha256Hex(sid), fingerprint, hours]
    );
    setAdminCookie(res, sid, hours * 3600);
    console.log('[ADMIN] 로그인 성공');
    res.json({ success: true });
  }));

  app.post('/api/admin/logout', withSchema(async (req, res) => {
    if (!originAllowed(req)) return res.status(403).json({ error: '허용되지 않은 요청입니다.' });
    const sid = parseCookies(req.get('cookie'))[ADMIN_COOKIE];
    if (sid) await pool.query('DELETE FROM admin_sessions WHERE id_hash = $1', [sha256Hex(sid)]);
    setAdminCookie(res, '', 0);
    res.json({ success: true });
  }));

  app.get('/api/admin/session', withSchema(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ admin: !!(await currentAdminSession(req)) });
  }));

  // ── 주문 ──
  async function buildOrderInput(productKey, raw) {
    const product = PRODUCTS[productKey];
    const r = raw && typeof raw === 'object' ? raw : {};
    if (product.kind === 'personal') {
      const input = {
        gender: str(r.gender, 10), maritalStatus: str(r.maritalStatus, 20), birthdate: dateStr(r.birthdate), birthtime: timeStr(r.birthtime),
        mbti: str(r.mbti, 4).toUpperCase(), blood: str(r.blood, 2).toUpperCase(), isLunar: bool(r.isLunar), userName: str(r.userName, 30),
        previousText: str(r.previousText, 12000),
      };
      if (!input.birthdate) return { error: '생년월일을 입력해주세요.' };
      const freeRef = str(r.freeRef, 64);
      if (freeRef && productKey !== 'deep') {
        // 결과 화면 이메일에 넣을 무료 본문은 서버가 생성해 저장해 둔 것만 사용한다.
        const { rows } = await pool.query(`SELECT result_text FROM free_results WHERE id = $1 AND created_at > NOW() - INTERVAL '24 hours'`, [freeRef]);
        if (rows[0]) input.freeText = rows[0].result_text;
      }
      return { input };
    }
    if (product.kind === 'gunghab') {
      // 관계 선택값은 서버가 아는 값만 받는다 (모르는 값을 연인으로 바꾸지 않는다).
      const rel = normalizeRelation(str(r.관계유형, 10), str(r.내역할, 4));
      if (!rel) return { error: '관계 유형을 확인해주세요.' };
      const input = {
        gender: str(r.gender, 10), birthdate: dateStr(r.birthdate), birthtime: timeStr(r.birthtime), isLunar: bool(r.isLunar),
        partnerGender: str(r.partnerGender, 10), partnerBirthdate: dateStr(r.partnerBirthdate), partnerBirthtime: timeStr(r.partnerBirthtime), partnerIsLunar: bool(r.partnerIsLunar),
        myName: str(r.myName, 30), partnerName: str(r.partnerName, 30), 관계유형: rel.key, 내역할: rel.role,
      };
      if (!input.birthdate || !input.partnerBirthdate) return { error: '생년월일을 입력해주세요.' };
      return { input };
    }
    if (product.kind === 'baeknyeon') {
      const input = { gender: str(r.gender, 10), birthdate: dateStr(r.birthdate), birthtime: timeStr(r.birthtime), isLunar: bool(r.isLunar), userName: str(r.userName, 30) };
      if (!input.birthdate) return { error: '생년월일을 입력해주세요.' };
      return { input };
    }
    if (product.kind === 'gilil') {
      const purpose = str(r.purpose, 10);
      return { input: { purpose: GILIL_PURPOSES.includes(purpose) ? purpose : '이사' } };
    }
    return { error: '지원하지 않는 상품입니다.' };
  }

  // 주문에 저장된 입력만으로 분석 요청을 만든다. (클라이언트가 분석 시점에 보내는 값은 쓰지 않는다)
  function analysisBodyFor(order) {
    const product = PRODUCTS[order.product];
    const i = order.input || {};
    if (product.kind === 'personal') {
      return {
        gender: i.gender, maritalStatus: i.maritalStatus, birthdate: i.birthdate, birthtime: i.birthtime, mbti: i.mbti, blood: i.blood,
        type: product.analysisType, isPaid: true, isLunar: !!i.isLunar, userName: i.userName, previousText: i.freeText || i.previousText || '',
      };
    }
    if (product.kind === 'gunghab') {
      return {
        gender: i.gender, birthdate: i.birthdate, birthtime: i.birthtime, isLunar: !!i.isLunar,
        partnerGender: i.partnerGender, partnerBirthdate: i.partnerBirthdate, partnerBirthtime: i.partnerBirthtime, partnerIsLunar: !!i.partnerIsLunar,
        myName: i.myName || 'A', partnerName: i.partnerName || 'B', type: '궁합', isPaid: true, 관계유형: i.관계유형, 내역할: i.내역할 || '',
      };
    }
    if (product.kind === 'baeknyeon') {
      return { gender: i.gender || '미입력', birthdate: i.birthdate, birthtime: i.birthtime, type: '100년꿀팁', isPaid: true, isLunar: !!i.isLunar, userName: i.userName };
    }
    return null;
  }

  async function createOrder(req, res, { comp }) {
    const productKey = typeof req.body?.product === 'string' ? req.body.product : '';
    const product = PRODUCTS[productKey];
    if (!product) return res.status(400).json({ error: '지원하지 않는 상품입니다.' });
    if (!isProductOrderable(productKey)) return res.status(400).json({ error: '지원하지 않는 상품입니다.' });   // 출시 전 상품은 존재 자체를 알리지 않는다
    const email = req.body?.email ? String(req.body.email).trim() : '';
    if (email && !isValidEmail(email)) return res.status(400).json({ error: '이메일 주소를 확인해주세요.' });
    // 우리 아이 성공사주 일반 구매: 결과를 받을 이메일과 결제 전 안내 확인이 필요하다(운영자 무료 주문은 제외).
    const isSuccessSale = productKey === SUCCESS_CHILD.key && !comp;
    if (isSuccessSale && !email) return res.status(400).json({ error: '결과를 받을 이메일 주소를 입력해주세요.', code: 'email_required' });
    if (isSuccessSale && req.body?.consent !== true) return res.status(400).json({ error: '결제 전 안내를 확인하고 체크해주세요.', code: 'consent_required' });
    const built = await buildOrderInput(productKey, req.body?.input);
    if (built.error) return res.status(400).json({ error: built.error });
    if (isSuccessSale) built.input.consent = { at: new Date().toISOString(), version: SUCCESS_CONSENT_VERSION };   // 어떤 안내를 확인하고 결제했는지 남긴다
    if (productKey === SUCCESS_CHILD.key) {
      // 대운 방향(성별)과 계산 가능한 생년월일은 결제 전에 확인한다. 결제 뒤에 계산이 실패하는 주문을 만들지 않는다.
      if (built.input.gender !== '남성' && built.input.gender !== '여성') return res.status(400).json({ error: '성별을 선택해주세요.' });
      const by = Number(String(built.input.birthdate).slice(0, 4));
      if (!(by >= 1920 && by <= new Date().getFullYear())) return res.status(400).json({ error: '생년월일을 확인해주세요.' });
    }

    const amount = product.amount;   // 주문 금액은 항상 서버가 정한 판매가다(클라이언트가 보낸 금액·코드는 쓰지 않는다)

    const orderId = `${product.prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const orderToken = randomToken(32);
    await pool.query(
      `INSERT INTO orders (id, product, amount, token_hash, input, email, status, is_comp, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [orderId, productKey, amount, sha256Hex(orderToken), JSON.stringify(built.input), email || null,
        comp ? 'paid' : 'pending', !!comp, comp ? new Date() : null]
    );
    if (comp) console.log(`[ADMIN] 결제 없는 운영자 주문 생성 order=${orderId} product=${productKey}`);
    res.status(201).json({ orderId, orderToken, product: productKey, amount, name: product.name, status: comp ? 'paid' : 'pending' });
  }

  app.post('/api/orders', withSchema(async (req, res) => {
    const ip = clientIp(req);
    if (orderCreateLimiter.limited(ip)) return res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' });
    orderCreateLimiter.hit(ip);
    await createOrder(req, res, { comp: false });
  }));

  app.post('/api/admin/orders', requireAdmin, withSchema((req, res) => createOrder(req, res, { comp: true })));

  // 주문 ID와 주문 토큰이 모두 맞아야 주문에 접근할 수 있다. (없음/불일치는 구분하지 않음)
  async function authorizeOrder(req) {
    const ip = clientIp(req);
    if (orderAuthFailLimiter.limited(ip)) return { error: 429 };
    const id = String(req.params.id || '').slice(0, 64);
    const token = typeof req.body?.orderToken === 'string' ? req.body.orderToken : '';
    if (!id || !token) { orderAuthFailLimiter.hit(ip); return { error: 404 }; }
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    const order = rows[0];
    if (!order || !safeEqualHex(order.token_hash, sha256Hex(token))) { orderAuthFailLimiter.hit(ip); return { error: 404 }; }
    return { order };
  }

  const orderAuthError = (res, code) => code === 429
    ? res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' })
    : res.status(404).json({ error: '주문 정보를 확인할 수 없어요.' });

  // ── 결제 검증 ──
  app.post('/api/orders/:id/verify', withSchema(async (req, res) => {
    const { order, error } = await authorizeOrder(req);
    if (!order) return orderAuthError(res, error);
    const impUid = typeof req.body?.impUid === 'string' ? req.body.impUid.trim() : '';

    if (order.status === 'paid') {
      if (order.is_comp || order.imp_uid === impUid) return res.json({ status: 'paid' });
      return res.status(409).json({ error: '이미 다른 결제로 확인된 주문입니다.', code: 'order_already_paid' });
    }
    if (!/^imp_[0-9A-Za-z]{6,40}$/.test(impUid)) return res.status(400).json({ error: '결제 정보를 확인할 수 없어요.', code: 'invalid_imp_uid' });

    let payment;
    try {
      payment = await portone.getPayment(impUid);
    } catch (e) {
      console.error('[PAY] 포트원 결제 조회 실패:', e.code || e.message);
      return res.status(502).json({ error: '결제 확인이 지연되고 있어요. 잠시 후 다시 시도해주세요.', code: 'verify_unavailable', retryable: true });
    }
    if (!payment) return res.status(400).json({ error: '결제 정보를 확인할 수 없어요.', code: 'payment_not_found' });
    const result = await applyVerifiedPayment(order, payment);
    res.status(result.status).json(result.body);
  }));

  // 서버가 만든 주문과 포트원 결제 내역의 주문번호·상태·금액·통화를 모두 대조한 뒤,
  // 원자적 UPDATE와 imp_uid 고유 제약으로 한 결제가 한 주문에만 연결되게 한다.
  async function applyVerifiedPayment(order, payment) {
    const impUid = String(payment.imp_uid || '');
    let mismatch = null;
    if (payment.merchant_uid !== order.id) mismatch = 'order_mismatch';
    else if (payment.status !== 'paid') mismatch = 'not_paid';
    else if (Number(payment.amount) !== Number(order.amount)) mismatch = 'amount_mismatch';
    else if (payment.currency && payment.currency !== 'KRW') mismatch = 'currency_mismatch';
    else if (!impUid) mismatch = 'missing_imp_uid';
    if (mismatch) {
      console.warn(`[PAY] 결제 검증 불일치 order=${order.id} reason=${mismatch}`);
      return { status: 400, body: { error: '결제 정보가 주문과 일치하지 않아요. 고객센터로 문의해주세요.', code: mismatch } };
    }
    try {
      const { rowCount } = await pool.query(
        `UPDATE orders SET status = 'paid', imp_uid = $2, paid_amount = $3, paid_at = NOW() WHERE id = $1 AND status = 'pending'`,
        [order.id, impUid, Number(payment.amount)]
      );
      if (rowCount === 0) {
        const { rows } = await pool.query('SELECT status, imp_uid FROM orders WHERE id = $1', [order.id]);
        if (rows[0]?.status === 'paid' && rows[0].imp_uid === impUid) return { status: 200, body: { status: 'paid' } };
        return { status: 409, body: { error: '이미 다른 결제로 확인된 주문입니다.', code: 'order_already_paid' } };
      }
    } catch (e) {
      if (e.code === '23505') return { status: 409, body: { error: '이미 사용된 결제입니다.', code: 'payment_already_used' } };
      throw e;
    }
    console.log(`[PAY] 결제 확인 완료 order=${order.id} product=${order.product}`);
    if (order.product === SUCCESS_CHILD.key) await kickoffSuccessJob(order.id);   // 고객이 결제 직후 창을 닫아도 결과 생성과 이메일 발송이 진행되게 한다
    return { status: 200, body: { status: 'paid' } };
  }

  // 우리 아이 성공사주: 결제가 확인되면 서버가 바로 결과 생성을 시작한다. 이미 만들어졌거나 만드는 중이면 아무것도 하지 않는다. 화면이 열려 있으면 같은 작업에 이어 붙는다.
  // 실패해도 결제 확인 결과에는 영향이 없다(고객이 결과를 열면 기존 경로가 다시 시도한다).
  async function kickoffSuccessJob(orderId) {
    try {
      if (liveJobs.has(orderId)) return;
      const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      const order = rows[0];
      if (!order || order.product !== SUCCESS_CHILD.key || order.status !== 'paid' || !order.email || order.refund_status === 'done') return;
      if (await claimJob(order.id)) startJob(order);
    } catch (e) {
      console.error(`[JOB] 서버 시작 실패 order=${orderId}`, e.code || e.message);
    }
  }

  // ── 무료 체험(일회용 코드) ──
  // 운영자가 코드를 발급하고(/api/admin/trial-codes), 체험자는 결제 화면에서 그 코드를 입력한다. 유효하면 결제 없이(0원) 유료와 같은 전체 결과지를 받는다.
  // 코드는 원문을 저장하지 않고 해시만 둔다. 한 번 쓰면 다시 쓸 수 없고, 같은 이메일로는 한 번만 받을 수 있다. 할인코드·쿠폰 같은 금액 할인 기능은 없다.
  const trialFailLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
  const TRIAL_INVALID = '사용할 수 없는 코드예요. 코드를 다시 확인해 주세요. 이미 사용했거나 기간이 지난 코드라면 운영자에게 문의해 주세요.';
  const trialHash = (raw) => sha256Hex('trial:' + raw);
  const formatTrialCode = (raw) => TRIAL_PREFIX + '-' + raw.match(/.{4}/g).join('-');
  const randomCodeBody = () => Array.from({ length: TRIAL_CODE_LEN }, () => TRIAL_ALPHABET[crypto.randomInt(TRIAL_ALPHABET.length)]).join('');
  const trialChecksOut = (res, ip) => {
    if (trialFailLimiter.limited(ip)) { res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }); return false; }
    return true;
  };

  // 화면에서 "코드가 맞는지, 최종 금액이 0원인지"를 보여 주기 위한 확인(코드를 사용 처리하지 않는다). 출시 전(스위치 꺼짐)에는 항상 '사용할 수 없음'.
  app.post('/api/trial/check', withSchema(async (req, res) => {
    const ip = clientIp(req);
    if (!trialChecksOut(res, ip)) return;
    const code = normalizeTrialCode(req.body?.code);
    if (!isProductOrderable(SUCCESS_CHILD.key) || !code) { trialFailLimiter.hit(ip); return res.status(400).json({ error: TRIAL_INVALID, code: 'trial_invalid' }); }
    const { rows } = await pool.query('SELECT 1 FROM trial_codes WHERE code_hash = $1 AND used_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())', [trialHash(code)]);
    if (!rows[0]) { trialFailLimiter.hit(ip); return res.status(400).json({ error: TRIAL_INVALID, code: 'trial_invalid' }); }
    res.json({ valid: true, amount: 0, listAmount: PRODUCTS[SUCCESS_CHILD.key].amount });
  }));

  // 코드 사용 + 무료 주문 생성은 한 트랜잭션이다. 서버가 코드를 다시 검증하므로 화면에서 보낸 금액이나 표시는 믿지 않는다.
  app.post('/api/trial/redeem', withSchema(async (req, res) => {
    const ip = clientIp(req);
    if (!trialChecksOut(res, ip)) return;
    if (!isProductOrderable(SUCCESS_CHILD.key)) return res.status(400).json({ error: '지원하지 않는 상품입니다.' });
    const email = req.body?.email ? String(req.body.email).trim() : '';
    if (!isValidEmail(email)) return res.status(400).json({ error: '결과를 받을 이메일 주소를 입력해주세요.', code: 'email_required' });
    if (req.body?.consent !== true) return res.status(400).json({ error: '안내를 확인하고 체크해주세요.', code: 'consent_required' });
    const built = await buildOrderInput(SUCCESS_CHILD.key, req.body?.input);
    if (built.error) return res.status(400).json({ error: built.error });
    if (built.input.gender !== '남성' && built.input.gender !== '여성') return res.status(400).json({ error: '성별을 선택해주세요.' });
    const by = Number(String(built.input.birthdate).slice(0, 4));
    if (!(by >= 1920 && by <= new Date().getFullYear())) return res.status(400).json({ error: '생년월일을 확인해주세요.' });
    const code = normalizeTrialCode(req.body?.code);
    if (!code) { trialFailLimiter.hit(ip); return res.status(400).json({ error: TRIAL_INVALID, code: 'trial_invalid' }); }
    built.input.consent = { at: new Date().toISOString(), version: SUCCESS_CONSENT_VERSION };
    built.input.trial = true;   // 무료 체험 주문 표시(후기의 "무료 체험" 표시와 관리자 확인에 쓴다)
    const product = PRODUCTS[SUCCESS_CHILD.key];
    const orderId = `${product.prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const orderToken = randomToken(32);
    const client = await pool.connect();
    let done = false;
    try {
      await client.query('BEGIN');
      const claim = await client.query(
        `UPDATE trial_codes SET used_at = NOW(), email_hash = $2
         WHERE code_hash = $1 AND used_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()) RETURNING code_hash`,
        [trialHash(code), sha256Hex(email.toLowerCase())]);
      if (claim.rowCount !== 1) { await client.query('ROLLBACK'); trialFailLimiter.hit(ip); return res.status(400).json({ error: TRIAL_INVALID, code: 'trial_invalid' }); }
      await client.query(
        `INSERT INTO orders (id, product, amount, token_hash, input, email, status, is_comp, paid_at)
         VALUES ($1, $2, 0, $3, $4, $5, 'paid', TRUE, NOW())`,
        [orderId, SUCCESS_CHILD.key, sha256Hex(orderToken), JSON.stringify(built.input), email]);
      await client.query('UPDATE trial_codes SET order_id = $2 WHERE code_hash = $1', [trialHash(code), orderId]);
      await client.query('COMMIT');
      done = true;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      if (e.code === '23505') return res.status(409).json({ error: '이 이메일로는 이미 무료 체험을 이용했어요.', code: 'trial_email_used' });
      throw e;
    } finally {
      client.release();
    }
    if (done) {
      console.log(`[TRIAL] 무료 체험 주문 생성 order=${orderId}`);
      await kickoffSuccessJob(orderId);   // 화면을 닫아도 서버가 결과 생성과 이메일 발송을 이어간다(유료 주문과 같은 경로)
      res.status(201).json({ orderId, orderToken, product: SUCCESS_CHILD.key, amount: 0, name: product.name, status: 'paid', trial: true });
    }
  }));

  // 운영자: 코드 발급(원문은 이 응답에서 한 번만 보여 주고 서버에는 해시만 남긴다) / 현황 / 목록(코드 원문 없음)
  const TRIAL_STATUS_SQL = `CASE WHEN used_at IS NOT NULL THEN 'used' WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'expired' ELSE 'unused' END`;
  app.post('/api/admin/trial-codes', requireAdmin, withSchema(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const count = Math.floor(Number(req.body?.count));
    if (!Number.isFinite(count) || count < 1 || count > 100) return res.status(400).json({ error: '발급 수는 1~100 사이로 입력해주세요.' });
    const label = str(req.body?.label, 40);
    const days = req.body?.expiresDays === undefined ? 30 : Math.floor(Number(req.body.expiresDays));
    if (!Number.isFinite(days) || days < 1 || days > 180) return res.status(400).json({ error: '유효 기간은 1~180일 사이로 입력해주세요.' });
    const codes = [];
    while (codes.length < count) {
      const raw = randomCodeBody();
      const ins = await pool.query(`INSERT INTO trial_codes (code_hash, label, expires_at) VALUES ($1, $2, NOW() + make_interval(days => $3)) ON CONFLICT (code_hash) DO NOTHING`, [trialHash(raw), label, days]);
      if (ins.rowCount === 1) codes.push(formatTrialCode(raw));
    }
    console.log(`[ADMIN] 무료 체험 코드 발급 count=${count} label=${label}`);
    res.status(201).json({ success: true, codes, expiresDays: days, label });
  }));
  app.post('/api/admin/trial-codes/summary', requireAdmin, withSchema(async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { rows } = await pool.query(`SELECT label, ${TRIAL_STATUS_SQL} AS status, COUNT(*)::int AS n FROM trial_codes GROUP BY label, status ORDER BY label`);
    const groups = {};
    for (const r of rows) { const g = (groups[r.label] = groups[r.label] || { label: r.label, issued: 0, used: 0, expired: 0, unused: 0 }); g.issued += r.n; g[r.status] += r.n; }
    res.json({ success: true, groups: Object.values(groups) });
  }));
  app.post('/api/admin/trial-codes/list', requireAdmin, withSchema(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const label = typeof req.body?.label === 'string' ? req.body.label.trim().slice(0, 40) : null;
    const { rows } = await pool.query(
      `SELECT LEFT(code_hash, 8) AS id, label, ${TRIAL_STATUS_SQL} AS status, created_at, expires_at, used_at, order_id
       FROM trial_codes WHERE ($1::text IS NULL OR label = $1) ORDER BY created_at, code_hash LIMIT 500`, [label]);
    res.json({ success: true, codes: rows.map((r) => ({ id: r.id, label: r.label, status: r.status, createdAt: r.created_at, expiresAt: r.expires_at, usedAt: r.used_at, orderId: r.order_id })) });
  }));

  // ── 내 결과지 다시 보기(이메일 인증) ──
  // 결과지는 주문과 연결해 서버에 저장되어 있다(analysis_jobs.events). 결제(또는 무료 체험) 때 입력한 이메일로 일회용 인증번호를 받아 본인 확인을 한 뒤,
  // 그 이메일의 주문만 목록으로 보여 주고 저장된 결과지를 다시 보여 준다. AI를 다시 실행하지 않고, 이메일 주소만으로는 아무것도 보여 주지 않는다. 회원가입은 없다.
  const OTP_TTL_MIN = 10;              // 인증번호 유효시간
  const OTP_MAX_ATTEMPTS = 5;          // 한 번호당 입력 시도 횟수(넘으면 그 번호는 폐기)
  const OTP_COOLDOWN_SEC = 60;         // 같은 이메일 재요청 간격
  const OTP_MAX_PER_HOUR = 5;          // 같은 이메일 시간당 발송 횟수
  const RESULT_SESSION_MIN = 30;       // 인증 후 열람 유지 시간
  const reopenRequestLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
  const reopenFailLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
  const normEmail = (v) => String(v || '').trim().toLowerCase();
  const otpHash = (email, code, salt) => sha256Hex(`otp:${email}:${code}:${salt}`);
  const OTP_FAIL_MESSAGE = '인증번호가 맞지 않거나 만료되었습니다. 새 인증번호를 요청해 주세요.';
  const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://www.mysaju.shop').replace(/\/$/, '');
  const otpMail = (code) => ({
    subject: `[마이사주] 결과지 확인 인증번호 ${code}`,
    html: opsMailShell('결과지 확인 인증번호', `<p>아래 인증번호를 홈페이지에 입력해 주세요. <b>${OTP_TTL_MIN}분 안에</b> 입력하셔야 합니다.</p><p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:16px 0">${code}</p><p style="color:#666;font-size:13px">본인이 요청하지 않았다면 이 메일을 무시해 주세요. 인증번호를 다른 사람에게 알려 주지 마세요.</p>`),
  });
  const readyNoticeMail = () => ({
    subject: `[마이사주] ${SUCCESS_CHILD.reportName}가 준비되었습니다`,
    html: opsMailShell('결과지가 준비되었습니다', `<p>요청하신 결과지가 완성되었습니다. 홈페이지의 <b>내 결과지 다시 보기</b>에서 결제(또는 무료 체험) 때 입력하신 이메일로 인증하시면 바로 확인하실 수 있습니다.</p><p><a href="${SITE_URL}/success-saju">${SITE_URL}/success-saju</a></p><p style="color:#666;font-size:13px">이 메일에는 결과지 내용이 들어 있지 않습니다.</p>`),
  });
  const reopenableWhere = `o.product = $2 AND o.status = 'paid' AND o.refund_status IS DISTINCT FROM 'done'`;

  // 1) 인증번호 요청: 그 이메일의 결과지가 있는 경우에만 번호를 보낸다. 있든 없든 같은 응답을 준다(이메일 존재 여부를 알려 주지 않는다).
  app.post('/api/my-results/request', withSchema(async (req, res) => {
    const ip = clientIp(req);
    if (reopenRequestLimiter.limited(ip)) return res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' });
    reopenRequestLimiter.hit(ip);
    const email = normEmail(req.body?.email);
    if (!isValidEmail(email)) return res.status(400).json({ error: '이메일 주소를 확인해 주세요.' });
    const generic = { ok: true, expiresInMin: OTP_TTL_MIN, message: `입력하신 이메일로 결과지 내역이 있으면 인증번호를 보냈습니다. ${OTP_TTL_MIN}분 안에 입력해 주세요. 메일이 오지 않으면 구매(체험) 때 입력한 이메일이 맞는지 확인하고, 1분 뒤 다시 요청해 주세요.` };
    const has = await pool.query(`SELECT 1 FROM orders o WHERE lower(o.email) = $1 AND ${reopenableWhere} LIMIT 1`, [email, SUCCESS_CHILD.key]);
    if (!has.rows[0]) return res.json(generic);
    const recent = (await pool.query(
      `SELECT COUNT(*) FILTER (WHERE created_at > NOW() - interval '1 hour')::int AS hour, COUNT(*) FILTER (WHERE created_at > NOW() - make_interval(secs => $2))::int AS cool FROM result_otps WHERE email = $1`,
      [email, OTP_COOLDOWN_SEC])).rows[0];
    if (recent.hour >= OTP_MAX_PER_HOUR || recent.cool > 0) return res.json(generic);
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const salt = randomToken(8);
    const ins = await pool.query(`INSERT INTO result_otps (email, salt, code_hash, expires_at) VALUES ($1, $2, $3, NOW() + make_interval(mins => $4)) RETURNING id`, [email, salt, otpHash(email, code, salt), OTP_TTL_MIN]);
    const mail = otpMail(code);
    if (!(await sendOpsMail(email, mail))) await pool.query('DELETE FROM result_otps WHERE id = $1', [ins.rows[0].id]).catch(() => {});
    res.json(generic);
  }));

  // 2) 인증번호 확인: 번호당 시도 횟수를 DB에서 먼저 올려 동시에 여러 번 넣어 보는 것도 막는다. 맞으면 일정 시간만 쓰는 열람 토큰(해시로만 저장)을 준다.
  app.post('/api/my-results/verify', withSchema(async (req, res) => {
    const ip = clientIp(req);
    if (reopenFailLimiter.limited(ip)) return res.status(429).json({ error: '시도가 너무 많아요. 잠시 후 다시 시도해주세요.' });
    const email = normEmail(req.body?.email);
    const code = String(req.body?.code || '').replace(/\D/g, '');
    if (!isValidEmail(email) || code.length !== 6) { reopenFailLimiter.hit(ip); return res.status(400).json({ error: OTP_FAIL_MESSAGE }); }
    const cur = (await pool.query(`SELECT id, salt, code_hash FROM result_otps WHERE email = $1 AND used_at IS NULL AND expires_at > NOW() AND attempts < $2 ORDER BY id DESC LIMIT 1`, [email, OTP_MAX_ATTEMPTS])).rows[0];
    if (!cur) { reopenFailLimiter.hit(ip); return res.status(400).json({ error: OTP_FAIL_MESSAGE }); }
    const bumped = await pool.query(`UPDATE result_otps SET attempts = attempts + 1 WHERE id = $1 AND used_at IS NULL AND attempts < $2 RETURNING attempts`, [cur.id, OTP_MAX_ATTEMPTS]);
    if (!bumped.rows[0]) { reopenFailLimiter.hit(ip); return res.status(400).json({ error: OTP_FAIL_MESSAGE }); }
    if (!safeEqualHex(cur.code_hash, otpHash(email, code, cur.salt))) { reopenFailLimiter.hit(ip); return res.status(400).json({ error: OTP_FAIL_MESSAGE }); }
    const used = await pool.query('UPDATE result_otps SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING id', [cur.id]);
    if (!used.rows[0]) return res.status(400).json({ error: OTP_FAIL_MESSAGE });
    const token = randomToken(32);
    await pool.query(`INSERT INTO result_sessions (token_hash, email, expires_at) VALUES ($1, $2, NOW() + make_interval(mins => $3))`, [sha256Hex(token), email, RESULT_SESSION_MIN]);
    res.json({ ok: true, sessionToken: token, expiresInMin: RESULT_SESSION_MIN });
  }));

  async function resultSessionEmail(req) {
    const token = typeof req.body?.sessionToken === 'string' ? req.body.sessionToken : '';
    if (token.length < 20 || token.length > 120) return null;
    const { rows } = await pool.query('SELECT email FROM result_sessions WHERE token_hash = $1 AND expires_at > NOW()', [sha256Hex(token)]);
    return rows[0]?.email || null;
  }
  const sessionExpired = (res) => res.status(401).json({ error: '인증이 만료되었습니다. 다시 인증해 주세요.', code: 'session_expired' });

  // 3) 인증한 이메일의 결과지 목록(그 이메일로 결제·체험한 주문만, 환불된 주문 제외)
  app.post('/api/my-results/list', withSchema(async (req, res) => {
    const ip = clientIp(req);
    if (reopenFailLimiter.limited(ip)) return res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' });
    const email = await resultSessionEmail(req);
    if (!email) { reopenFailLimiter.hit(ip); return sessionExpired(res); }
    const { rows } = await pool.query(
      `SELECT o.id, o.is_comp, o.paid_at, o.input, j.status AS job_status FROM orders o LEFT JOIN analysis_jobs j ON j.order_id = o.id
       WHERE lower(o.email) = $1 AND ${reopenableWhere} ORDER BY o.paid_at DESC NULLS LAST LIMIT 20`, [email, SUCCESS_CHILD.key]);
    res.json({ ok: true, results: rows.map((r) => ({ orderId: r.id, kind: r.is_comp ? 'trial' : 'paid', paidAt: r.paid_at, ready: r.job_status === 'done', status: r.job_status || 'pending', gender: r.input?.gender || '', birthdate: r.input?.birthdate || '', userName: r.input?.userName || '' })) });
  }));

  // 4) 저장된 결과지 열기(AI를 다시 실행하지 않는다). 인증한 이메일과 주문의 이메일이 같을 때만 연다.
  app.post('/api/my-results/open', withSchema(async (req, res) => {
    const ip = clientIp(req);
    if (reopenFailLimiter.limited(ip)) return res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' });
    const email = await resultSessionEmail(req);
    if (!email) { reopenFailLimiter.hit(ip); return sessionExpired(res); }
    const orderId = String(req.body?.orderId || '').slice(0, 64);
    const { rows } = await pool.query(`SELECT o.* FROM orders o WHERE o.id = $1 AND lower(o.email) = $3 AND ${reopenableWhere}`, [orderId, SUCCESS_CHILD.key, email]);
    const order = rows[0];
    if (!order) { reopenFailLimiter.hit(ip); return res.status(404).json({ error: '결과지를 찾을 수 없어요.' }); }
    const job = await getJob(order.id);
    const report = job?.status === 'done' ? reportFromEvents(job.events) : null;
    if (!report) return res.status(409).json({ error: '결과지를 만들고 있습니다. 잠시 뒤에 다시 확인해 주세요.', code: 'not_ready' });
    res.json({ ok: true, report, kind: order.is_comp ? 'trial' : 'paid', orderId: order.id });
  }));

  // ── 생성 작업 (중복 실행 방지) ──
  async function claimJob(orderId, { force = false, fromTruncated = false } = {}) {
    const { rows } = await pool.query(
      `INSERT INTO analysis_jobs (order_id, status, attempts, runner_id, lease_until, started_at, updated_at)
       VALUES ($1, 'generating', 1, $2, NOW() + make_interval(secs => $5), NOW(), NOW())
       ON CONFLICT (order_id) DO UPDATE SET
         status = 'generating',
         attempts = CASE WHEN $4 OR (analysis_jobs.status = 'failed' AND analysis_jobs.updated_at < NOW() - make_interval(mins => $6))
                         THEN 1 ELSE analysis_jobs.attempts + 1 END,
         runner_id = $2, lease_until = NOW() + make_interval(secs => $5), started_at = NOW(), updated_at = NOW(),
         events = CASE WHEN analysis_jobs.last_error IN ('${JOB_TRUNCATED}', '${JOB_REGENERATING}') THEN analysis_jobs.events ELSE NULL END,
         result_text = CASE WHEN analysis_jobs.last_error IN ('${JOB_TRUNCATED}', '${JOB_REGENERATING}') THEN analysis_jobs.result_text ELSE NULL END,
         last_error = CASE WHEN analysis_jobs.last_error IN ('${JOB_TRUNCATED}', '${JOB_REGENERATING}') THEN '${JOB_REGENERATING}' ELSE NULL END
       WHERE (analysis_jobs.status = 'failed' AND ($4 OR analysis_jobs.attempts < $3 OR analysis_jobs.updated_at < NOW() - make_interval(mins => $6)))
          OR (analysis_jobs.status = 'generating' AND analysis_jobs.lease_until < NOW())
          OR ($7 AND analysis_jobs.status = 'done' AND analysis_jobs.last_error = '${JOB_TRUNCATED}')
       RETURNING attempts`,
      [orderId, RUNNER_ID, MAX_JOB_ATTEMPTS, force, LEASE_SECONDS, RETRY_COOLDOWN_MINUTES, fromTruncated]
    );
    return rows[0] || null;
  }

  const getJob = async (orderId) => (await pool.query('SELECT * FROM analysis_jobs WHERE order_id = $1', [orderId])).rows[0] || null;

  // runAnalysis가 쓰는 res 대신 넘기는 객체. 이벤트를 기록하고 연결된 모든 응답으로 보낸다.
  // 고객 연결이 끊겨도 생성은 끝까지 진행된다. (새로고침 후 같은 결과를 다시 받기 위해)
  function createJobSink(live) {
    const sink = {
      destroyed: false, writableEnded: false, headersSent: true, sawDone: false, sawError: false, sawTruncated: false,
      setHeader() {}, flushHeaders() {}, on() { return sink; },
      status() { return sink; },
      json(obj) { sink.write(`data: ${JSON.stringify({ error: obj?.error || '분석 중 오류가 발생했습니다.' })}\n\n`); sink.end(); },
      write(chunk) {
        const text = String(chunk);
        if (text.startsWith(':')) return true; // keepalive 주석은 기록하지 않음
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try { const j = JSON.parse(line.slice(6)); if (j.type === 'done') sink.sawDone = true; if (j.type === 'truncated') sink.sawTruncated = true; if (j.error) sink.sawError = true; } catch {}
        }
        live.events.push(text);
        for (const r of live.listeners) if (!r.writableEnded && !r.destroyed) r.write(text);
        return true;
      },
      end() { sink.writableEnded = true; },
    };
    return sink;
  }

  function startJob(order, { emailAfter = PRODUCTS[order.product].autoEmail, emailVariant = 'auto' } = {}) {
    const live = { events: [], listeners: new Set(), finished: false };
    liveJobs.set(order.id, live);
    const sink = createJobSink(live);
    (async () => {
      let ok = false, errCode = null;
      try {
        await runAnalysis(analysisBodyFor(order), sink);
        ok = sink.sawDone && !sink.sawError;
        if (!ok) errCode = sink.sawError ? 'analysis_error' : 'incomplete';
      } catch (e) {
        errCode = String(e?.message || 'exception').slice(0, 200);
        console.error(`[JOB] 생성 예외 order=${order.id}`, e?.message || e);
      }
      try {
        if (ok) {
          await pool.query(
            // 토큰 한도(max_tokens)로 끝나 잘린 결과는 done 이지만 last_error='truncated' 로 구분해 부분 결과를 그대로 보존한다(스키마 변경 없음).
            `UPDATE analysis_jobs SET status = 'done', events = $2::jsonb, result_text = $3, last_error = $5, finished_at = NOW(), updated_at = NOW(), lease_until = NULL
             WHERE order_id = $1 AND runner_id = $4`,
            [order.id, JSON.stringify(live.events), textsFromEvents(live.events).all, RUNNER_ID, sink.sawTruncated ? JOB_TRUNCATED : null]
          );
        } else {
          if (!sink.sawError) sink.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`);
          await pool.query(
            // 잘린 결과를 다시 만드는 중(last_error='regenerating')에 실패하면 새 결과가 없으므로 기존 부분 결과를 그대로 되돌려 둔다.
            `UPDATE analysis_jobs SET
               status = CASE WHEN last_error = '${JOB_REGENERATING}' THEN 'done' ELSE 'failed' END,
               last_error = CASE WHEN last_error = '${JOB_REGENERATING}' THEN '${JOB_TRUNCATED}' ELSE $2 END,
               events = CASE WHEN last_error = '${JOB_REGENERATING}' THEN events ELSE NULL END,
               finished_at = NOW(), updated_at = NOW(), lease_until = NULL
             WHERE order_id = $1 AND runner_id = $3`,
            [order.id, errCode, RUNNER_ID]
          );
        }
      } catch (e) {
        console.error(`[JOB] 상태 저장 실패 order=${order.id}`, e.message);
      }
      live.finished = true;
      for (const r of live.listeners) if (!r.writableEnded) r.end();
      liveJobs.delete(order.id);
      console.log(`[JOB] order=${order.id} product=${order.product} result=${ok ? 'done' : 'failed'}`);
      if (ok) await afterJobDone(order, live.events, { emailAfter, emailVariant, truncated: sink.sawTruncated });
      else if (order.product === SUCCESS_CHILD.key) await noticeFailure(order).catch((e) => console.error('[OPS] 실패 안내 처리 오류:', e.message));
    })();
    return live;
  }

  // 생성 완료 후: 결제 전에 받은 이메일이 있으면 결과를 저장하고, 기존처럼 자동 발송 상품이면 메일을 보낸다.
  async function afterJobDone(order, events, { emailAfter, emailVariant, truncated = false }) {
    // 잘린 결과는 정상 완료로 보지 않는다: 결과 보관(results)과 자동 메일을 하지 않는다. 운영자가 다시 생성한 뒤 발송한다.
    if (truncated) { console.warn(`[JOB] 잘린 결과라 저장·자동 발송을 생략 order=${order.id}`); return; }
    try {
      const { rows } = await pool.query('SELECT email FROM orders WHERE id = $1', [order.id]);
      const email = rows[0]?.email;
      if (!email) return;
      if (order.product === SUCCESS_CHILD.key) {   // 환불이 끝난 주문에는 결과를 보내지 않는다
        const refunded = await pool.query('SELECT refund_status FROM orders WHERE id = $1', [order.id]);
        if (refunded.rows[0]?.refund_status === 'done') return;
      }
      if (order.product === SUCCESS_CHILD.key) {   // 생성이 지연돼 준비 중 안내를 받은 고객에게만, 결과 내용이 없는 준비 완료 알림을 보낸다
        const n = await pool.query('SELECT notice_sent_at FROM analysis_jobs WHERE order_id = $1', [order.id]);
        if (n.rows[0]?.notice_sent_at) await sendOpsMail(email, readyNoticeMail());
      }
      const mail = buildOrderMail(order, events, emailVariant);
      await saveResultRow(order, email, mail);
      if (emailAfter) {
        const sent = await sendWithQuota({ orderId: order.id, to: email, subject: mail.subject, html: mail.html });
        if (!sent.ok) console.warn(`[MAIL] 자동 발송 생략 order=${order.id} reason=${sent.reason}`);
      }
    } catch (e) {
      console.error(`[MAIL] 완료 후 처리 실패 order=${order.id}`, e.message);
    }
  }

  async function saveResultRow(order, email, mail) {
    await pool.query(
      `INSERT INTO results (email, type, result_text, user_name, order_id)
       SELECT $1, $2, $3, $4, $5 WHERE NOT EXISTS (SELECT 1 FROM results WHERE order_id = $5 AND email = $1)`,
      [email, PRODUCTS[order.product].resultType, mail.resultText, mail.userName || null, order.id]
    );
  }

  function attach(live, res) {
    for (const chunk of live.events) res.write(chunk);
    if (live.finished) return res.end();
    live.listeners.add(res);
    res.on('close', () => live.listeners.delete(res));
  }

  async function waitForLive(orderId, ms) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const live = liveJobs.get(orderId);
      if (live) return live;
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  }

  const sse = (res, obj) => { if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify(obj)}\n\n`); };

  app.post('/api/orders/:id/analysis', withSchema(async (req, res) => {
    const { order, error } = await authorizeOrder(req);
    if (!order) return orderAuthError(res, error);
    if (order.status !== 'paid') return res.status(402).json({ error: '결제 확인이 필요해요.', code: 'payment_required' });
    if (order.refund_status === 'done') return res.status(410).json({ error: '환불이 완료된 주문입니다.', code: 'refunded' });
    const product = PRODUCTS[order.product];
    if (product.kind === 'gilil') return res.json({ success: true, data: computeGilil(order.input.purpose) });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const keepalive = setInterval(() => { if (!res.writableEnded) res.write(': keepalive\n\n'); }, 20000);
    res.on('close', () => clearInterval(keepalive));

    let live = liveJobs.get(order.id);
    if (live) return attach(live, res);                      // 같은 서버에서 생성 중 → 이어서 받기
    if (await claimJob(order.id)) return attach(startJob(order), res); // 새로 생성 (DB에서 원자적으로 선점)

    const job = await getJob(order.id);
    if (job?.status === 'done') {                            // 완료된 결과 → 다시 보내기 (AI 재호출 없음)
      for (const chunk of job.events || []) res.write(chunk);
      return res.end();
    }
    if (job?.status === 'generating') {
      live = await waitForLive(order.id, 2000);
      if (live) return attach(live, res);
      sse(res, { type: 'job_status', status: 'generating', retryAfterMs: 5000 });
      return res.end();
    }
    sse(res, { error: '분석을 완료하지 못했어요. 결제는 유지되니 잠시 후 다시 시도하거나 고객센터로 문의해주세요.', retryable: false });
    res.end();
  }));

  // ── 이메일 발송 (서버가 저장한 결과만, 횟수 제한) ──
  async function sendWithQuota({ orderId = null, resultId = null, to, subject, html }) {
    const recipientHash = sha256Hex(String(to).trim().toLowerCase());
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['email:' + (orderId || `result:${resultId}`)]);
      const { rows } = await client.query(
        `SELECT
           COUNT(*) FILTER (WHERE $1::text IS NOT NULL AND order_id = $1)::int AS order_day,
           COUNT(*) FILTER (WHERE $1::text IS NOT NULL AND order_id = $1 AND created_at > NOW() - INTERVAL '30 seconds')::int AS order_recent,
           COUNT(*) FILTER (WHERE $2::int IS NOT NULL AND result_id = $2)::int AS result_day,
           COUNT(*) FILTER (WHERE $2::int IS NOT NULL AND result_id = $2 AND created_at > NOW() - INTERVAL '60 seconds')::int AS result_recent,
           COUNT(*) FILTER (WHERE recipient_hash = $3)::int AS recipient_day
         FROM email_sends WHERE created_at > NOW() - INTERVAL '24 hours'`,
        [orderId, resultId, recipientHash]
      );
      const q = rows[0];
      let reason = null;
      if (orderId && (q.order_recent > 0 || q.order_day >= 5)) reason = 'order_limit';
      else if (resultId && (q.result_recent > 0 || q.result_day >= 3)) reason = 'result_limit';
      else if (q.recipient_day >= 10) reason = 'recipient_limit';
      if (reason) { await client.query('ROLLBACK'); return { ok: false, reason }; }
      await client.query('INSERT INTO email_sends (order_id, result_id, recipient_hash) VALUES ($1, $2, $3)', [orderId, resultId, recipientHash]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
    try {
      await mailer.send({ to: String(to).trim(), subject, html });
      return { ok: true };
    } catch (e) {
      console.error('[MAIL] 발송 실패:', e.message);
      return { ok: false, reason: 'send_failed' };
    }
  }

  const mailFailure = (res, reason) => reason === 'send_failed'
    ? res.status(502).json({ error: '이메일 발송에 실패했어요. 잠시 후 다시 시도해주세요.' })
    : res.status(429).json({ error: '이메일 발송 횟수를 초과했어요. 잠시 후 다시 시도해주세요.', code: reason });

  app.post('/api/orders/:id/email', withSchema(async (req, res) => {
    const { order, error } = await authorizeOrder(req);
    if (!order) return orderAuthError(res, error);
    if (order.status !== 'paid') return res.status(402).json({ error: '결제 확인이 필요해요.' });
    if (order.product === SUCCESS_CHILD.key) return res.status(400).json({ error: '이 결과지는 이메일로 보내지 않습니다. 홈페이지의 내 결과지 다시 보기에서 확인해 주세요.', code: 'email_disabled' });
    const to = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!isValidEmail(to)) return res.status(400).json({ error: '이메일 주소를 확인해주세요.' });
    if (PRODUCTS[order.product].kind === 'gilil') return res.status(400).json({ error: '이메일 발송을 지원하지 않는 상품입니다.' });
    const job = await getJob(order.id);
    if (job?.status !== 'done') return res.status(409).json({ error: '결과가 아직 준비되지 않았어요.' });
    if (job.last_error === JOB_TRUNCATED) return res.status(409).json({ error: '결과가 끝까지 만들어지지 않아 메일로 보내지 못했어요. 고객센터로 문의해주세요.', code: 'result_truncated' });
    const mail = buildOrderMail(order, job.events, 'manual');
    const sent = await sendWithQuota({ orderId: order.id, to, subject: mail.subject, html: mail.html });
    if (!sent.ok) return mailFailure(res, sent.reason);
    await saveResultRow(order, to, mail);
    await pool.query('UPDATE orders SET email = $2 WHERE id = $1 AND email IS NULL', [order.id, to]);
    res.json({ success: true });
  }));

  // ── 운영자: 결과 조회·재발송, 주문 조회·재생성 ──
  // 고객 이메일이 접근 로그(URL)에 남지 않도록 조회도 POST 본문으로 받는다.
  app.post('/api/admin/results/search', requireAdmin, withSchema(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!isValidEmail(email)) return res.status(400).json({ error: '이메일 주소를 확인해주세요.' });
    const { rows } = await pool.query(
      'SELECT id, type, result_text, user_name, created_at FROM results WHERE email = $1 ORDER BY created_at DESC LIMIT 50', [email]
    );
    res.json({ success: true, results: rows.map((r) => ({ id: r.id, type: r.type, resultText: r.result_text, userName: r.user_name, createdAt: r.created_at })) });
  }));

  app.post('/api/admin/results/:id/email', requireAdmin, withSchema(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: '잘못된 요청입니다.' });
    const { rows } = await pool.query('SELECT id, email, result_text, user_name FROM results WHERE id = $1', [id]);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: '결과를 찾을 수 없어요.' });
    // 수신자는 결과에 저장된 이메일로 고정한다.
    const sent = await sendWithQuota({ resultId: row.id, to: row.email, subject: '🔮 마이사주 심화 분석 결과', html: adminResendMail(row.user_name, row.result_text) });
    if (!sent.ok) return mailFailure(res, sent.reason);
    console.log(`[ADMIN] 결과 재발송 result=${row.id}`);
    res.json({ success: true });
  }));

  app.post('/api/admin/orders/search', requireAdmin, withSchema(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim().slice(0, 64) : '';
    const byEmail = isValidEmail(email);
    if (!byEmail && !orderId) return res.status(400).json({ error: '이메일 주소 또는 주문번호를 확인해주세요.' });
    const { rows } = await pool.query(
      `SELECT o.id, o.product, o.amount, o.status, o.is_comp, o.paid_at, o.created_at, o.input->>'userName' AS user_name, o.input->>'myName' AS my_name, (o.email IS NOT NULL) AS has_email,
              j.status AS job_status, j.attempts AS job_attempts, j.updated_at AS job_updated_at, (j.status = 'done' AND j.last_error = 'truncated') AS job_truncated
       FROM orders o LEFT JOIN analysis_jobs j ON j.order_id = o.id
       WHERE ${byEmail ? 'o.email = $1' : 'o.id = $1'} ORDER BY o.created_at DESC LIMIT 50`, [byEmail ? email : orderId]
    );
    res.json({ success: true, orders: rows.map((r) => ({
      id: r.id, product: r.product, productName: PRODUCTS[r.product]?.name || r.product, amount: r.amount, status: r.status, isComp: r.is_comp,
      paidAt: r.paid_at, createdAt: r.created_at, userName: r.user_name || r.my_name || '', hasEmail: r.has_email, jobStatus: r.job_status, jobTruncated: !!r.job_truncated, jobAttempts: r.job_attempts, jobUpdatedAt: r.job_updated_at,
    })) });
  }));

  const loadOrderById = async (id) => (await pool.query('SELECT * FROM orders WHERE id = $1', [String(id).slice(0, 64)])).rows[0] || null;

  // 운영자가 입력한 이메일을 주문에 연결한다. (주문에 이메일이 없을 때만)
  async function attachAdminEmail(order, raw) {
    if (order.email) return true;
    const email = typeof raw === 'string' ? raw.trim() : '';
    if (!email) return true;
    if (!isValidEmail(email)) return false;
    await pool.query('UPDATE orders SET email = $2 WHERE id = $1 AND email IS NULL', [order.id, email]);
    order.email = email;
    return true;
  }

  // 고객이 결제 직후 창을 닫아 결제 확인이 안 된 주문을, 운영자가 포트원 결제 내역으로 확인한다. (같은 대조 규칙)
  app.post('/api/admin/orders/:id/verify', requireAdmin, withSchema(async (req, res) => {
    const order = await loadOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: '주문을 찾을 수 없어요.' });
    if (order.status === 'paid') return res.json({ status: 'paid' });
    let payment;
    try {
      payment = await portone.findPaidByMerchantUid(order.id);
    } catch (e) {
      console.error('[PAY] 포트원 결제 조회 실패(운영자 확인):', e.code || e.message);
      return res.status(502).json({ error: '포트원 결제 조회에 실패했어요. 잠시 후 다시 시도해주세요.' });
    }
    if (!payment) return res.status(404).json({ error: '이 주문번호로 완료된 결제가 없어요.' });
    const result = await applyVerifiedPayment(order, payment);
    if (result.status === 200) console.log(`[ADMIN] 운영자 결제 확인 order=${order.id}`);
    res.status(result.status).json(result.body);
  }));

  // 완료된 주문 결과를 주문 이메일(없으면 운영자가 입력한 이메일)로 보낸다.
  app.post('/api/admin/orders/:id/send', requireAdmin, withSchema(async (req, res) => {
    const order = await loadOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: '주문을 찾을 수 없어요.' });
    if (order.status !== 'paid') return res.status(409).json({ error: '결제가 확인되지 않은 주문입니다.' });
    if (PRODUCTS[order.product].kind === 'gilil') return res.status(400).json({ error: '이메일 발송을 지원하지 않는 상품입니다.' });
    const job = await getJob(order.id);
    if (job?.status !== 'done') return res.status(409).json({ error: '결과가 아직 준비되지 않았어요.' });
    if (job.last_error === JOB_TRUNCATED) return res.status(409).json({ error: '잘린 결과라 발송하지 않았어요. 먼저 결과를 다시 생성해주세요.', code: 'result_truncated' });
    if (!(await attachAdminEmail(order, req.body?.email))) return res.status(400).json({ error: '이메일 주소를 확인해주세요.' });
    if (!order.email) return res.status(400).json({ error: '받을 이메일 주소를 입력해주세요.' });
    const mail = buildOrderMail(order, job.events, 'manual');
    const sent = await sendWithQuota({ orderId: order.id, to: order.email, subject: mail.subject, html: mail.html });
    if (!sent.ok) return mailFailure(res, sent.reason);
    await saveResultRow(order, order.email, mail);
    console.log(`[ADMIN] 주문 결과 발송 order=${order.id}`);
    res.json({ success: true });
  }));

  // 결제 완료 후 생성에 실패한 주문을 재결제 없이 다시 생성하고, 주문 이메일로 결과를 보낸다.
  app.post('/api/admin/orders/:id/regenerate', requireAdmin, withSchema(async (req, res) => {
    const order = await loadOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: '주문을 찾을 수 없어요.' });
    if (!(await attachAdminEmail(order, req.body?.email))) return res.status(400).json({ error: '이메일 주소를 확인해주세요.' });
    if (order.status !== 'paid') return res.status(409).json({ error: '결제가 확인되지 않은 주문입니다.' });
    if (PRODUCTS[order.product].kind === 'gilil') return res.status(400).json({ error: '재생성이 필요 없는 상품입니다.' });
    if (liveJobs.has(order.id)) return res.status(409).json({ error: '이미 생성 중입니다.' });
    const job = await getJob(order.id);
    const wasTruncated = job?.status === 'done' && job.last_error === JOB_TRUNCATED;
    if (job?.status === 'done' && !wasTruncated) return res.status(409).json({ error: '이미 완료된 주문입니다.' });
    if (!(await claimJob(order.id, { force: true, fromTruncated: wasTruncated }))) return res.status(409).json({ error: '이미 생성 중입니다.' });
    startJob(order, { emailAfter: !!order.email, emailVariant: 'manual' });
    console.log(`[ADMIN] 주문 재생성 시작 order=${order.id}`);
    res.status(202).json({ success: true, emailed: !!order.email });
  }));

  // ── 무료 분석: 유료 전용 요청 거부 + 결과 화면 이메일용 무료 본문 저장 ──
  function rejectPaidWithoutOrder(res) {
    res.status(402);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(`data: ${JSON.stringify({ error: '결제 확인이 필요해요. 페이지를 새로고침한 뒤 다시 시도해주세요.' })}\n\n`);
  }

  // 무료 분석 응답을 그대로 흘려보내면서 본문을 모아 두었다가, 완료되면 free_ref 이벤트로 참조 ID를 준다.
  function createFreeTee(res) {
    let collected = '', sawDone = false, sawError = false, sawTruncated = false;
    const capture = (chunk) => {
      for (const line of String(chunk).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const j = JSON.parse(line.slice(6));
          if (j.type === 'done') sawDone = true;
          else if (j.type === 'truncated') sawTruncated = true;
          else if (j.error) sawError = true;
          else if (j.type === 'score' || (!j.type && typeof j.text === 'string')) collected += j.text || '';
        } catch {}
      }
    };
    return new Proxy(res, {
      get(target, prop) {
        if (prop === 'write') return (chunk, ...rest) => { capture(chunk); return target.write(chunk, ...rest); };
        if (prop === 'end') return (...args) => {
          if (args.length || !sawDone || sawError || sawTruncated || !collected.trim() || target.writableEnded) return target.end(...args);
          const id = randomToken(18);
          ensureSchema()
            .then(() => pool.query('INSERT INTO free_results (id, result_text) VALUES ($1, $2)', [id, collected.slice(0, 40000)]))
            .then(() => { if (!target.writableEnded && !target.destroyed) target.write(`data: ${JSON.stringify({ type: 'free_ref', id })}\n\n`); })
            .catch((e) => console.error('[DB] 무료 결과 임시 저장 실패:', e.message))
            .finally(() => { if (!target.writableEnded) target.end(); });
        };
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }

  // 무료 분석 요청 제한. 허용이면 true, 초과면 429 응답을 보내고 false.
  function allowFreeAnalyze(req, res) {
    const ip = clientIp(req);
    if (freeAnalyzeLimiter.limited(ip)) {
      res.setHeader('Retry-After', String(freeAnalyzeLimiter.retryAfterSec(ip)));
      res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' });
      return false;
    }
    freeAnalyzeLimiter.hit(ip);
    return true;
  }

  // ── 우리 아이 성공사주: 결제 후 생성 실패 안내 · 자동 재생성 · 환불 ──
  // 원칙: 검사를 통과하지 못한 글은 고객에게 보내지 않는다. 고객은 "결제했는데 아무 일도 없는" 상태를 겪지 않는다.
  //  1) 생성이 실패하면 고객에게 한 번 안내 메일을 보낸다(결제 접수·재작성 중·환불 방법).
  //  2) 서버가 일정 간격으로 다시 생성한다(주문당 claim 총 MAX_JOB_ATTEMPTS 회, 즉 자동 재시도 최대 2회). 비용 상한: 주문당 전체 생성 최대 9회.
  //  3) 모두 실패하면 운영자에게 알린다(주문번호만, ADMIN_ALERT_EMAIL 이 있을 때 메일, 항상 로그).
  //  4) 고객은 생성에 성공하기 전에는 언제든 전액 환불을 요청할 수 있다. SUCCESS_AUTO_REFUND_HOURS 가 켜져 있으면 그 시간이 지나도 전달하지 못한 주문은 자동 전액 환불한다(기본 꺼짐).
  // 환불은 포트원 취소 API 만 쓰고, 금액은 서버 주문 기록(paid_amount)에서 읽는다. 결제사에 이미 취소된 건은 다시 취소하지 않는다.
  const OPS_RETRY_AFTER_MIN = 10;
  const OPS_SWEEP_MS = 5 * 60 * 1000;
  const REFUND_STALE_MIN = 10;
  const autoRefundHours = () => { const h = Number(process.env.SUCCESS_AUTO_REFUND_HOURS); return Number.isFinite(h) && h > 0 ? h : 0; };
  const alerted = new Set();

  const opsMailShell = (title, bodyHtml) => `<div style="font-family:'Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2a2a2a;line-height:1.75"><h2 style="font-size:18px;margin:0 0 14px">${title}</h2>${bodyHtml}<p style="color:#888;font-size:12px;margin-top:22px">문의: 이메일 redions77@naver.com · 카카오톡 오픈채팅 open.kakao.com/me/mysajushop (환불정책과 같은 연락처)</p></div>`;
  const failureNoticeMail = (order) => ({
    subject: `[마이사주] ${SUCCESS_CHILD.reportName}를 아직 준비 중입니다`,
    html: opsMailShell('결과지를 아직 완성하지 못했습니다',
      `<p>${order.is_comp ? '무료 체험 신청은 정상 접수되었습니다.' : '결제는 정상 접수되었습니다.'} 결과지를 작성하는 과정에서 품질 검사를 통과하지 못해, 다시 작성하고 있습니다.</p>
       <p><b>결과지가 완성되면 홈페이지의 내 결과지 다시 보기에서 확인하실 수 있습니다.</b> 입력하신 정보를 다시 쓰실 필요는 없습니다.</p>
       ${order.is_comp ? '<p>기다리는 동안 궁금한 점은 아래 문의처로 연락해 주세요.</p>' : '<p>기다리지 않고 환불을 원하시면, 결제하신 화면의 <b>전액 환불 요청</b> 버튼을 누르시거나 아래 문의처로 연락해 주세요. 결과지를 받기 전에는 전액 환불해 드립니다.</p>'}
       <p style="color:#666;font-size:13px">주문번호 ${order.id}</p>`),
  });
  const refundDoneMail = (order) => ({
    subject: `[마이사주] ${SUCCESS_CHILD.reportName} 결제가 취소(전액 환불)되었습니다`,
    html: opsMailShell('결제가 취소되었습니다',
      `<p>${SUCCESS_CHILD.reportName} 결제 ${Number(order.paid_amount).toLocaleString('ko-KR')}원이 전액 취소되었습니다. 결과지를 완성해 드리지 못해 죄송합니다.</p>
       <p>카드사에 따라 취소 내역이 확인되기까지 며칠 걸릴 수 있습니다.</p>
       <p style="color:#666;font-size:13px">주문번호 ${order.id}</p>`),
  });
  async function sendOpsMail(to, mail) {
    try { await mailer.send({ to, subject: mail.subject, html: mail.html }); return true; }
    catch (e) { console.error('[OPS] 안내 메일 발송 실패:', e.message); return false; }
  }

  // 생성 실패 안내(주문당 1번). 먼저 표시를 남겨 중복 발송을 막고, 발송에 실패하면 표시를 되돌려 다음 점검에서 다시 보낸다.
  async function noticeFailure(order) {
    if (!order?.email) return false;
    const claim = await pool.query(`UPDATE analysis_jobs SET notice_sent_at = NOW() WHERE order_id = $1 AND status = 'failed' AND notice_sent_at IS NULL RETURNING order_id`, [order.id]);
    if (!claim.rows[0]) return false;
    const ok = await sendOpsMail(order.email, failureNoticeMail(order));
    if (!ok) await pool.query(`UPDATE analysis_jobs SET notice_sent_at = NULL WHERE order_id = $1`, [order.id]).catch(() => {});
    return ok;
  }

  // 전액 환불. 같은 주문을 동시에 두 번 처리하지 않도록 DB 에서 먼저 선점한다(중간에 멈춘 건은 REFUND_STALE_MIN 분 뒤 다시 시도, 결제사에서 이미 취소된 건은 취소를 반복하지 않고 기록만 맞춘다).
  async function refundSuccessOrder(orderId, { reason = 'customer_request', allowDelivered = false } = {}) {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = rows[0];
    if (!order || order.product !== SUCCESS_CHILD.key) return { ok: false, status: 404, code: 'not_found' };
    if (order.status !== 'paid' || order.is_comp) return { ok: false, status: 409, code: 'not_refundable' };
    if (order.refund_status === 'done') return { ok: true, already: true, status: 200 };
    if (!order.imp_uid || !(Number(order.paid_amount) > 0)) return { ok: false, status: 409, code: 'no_payment' };
    const job = await getJob(order.id);
    if (!allowDelivered && job?.status === 'done' && job.last_error !== JOB_TRUNCATED) return { ok: false, status: 409, code: 'already_delivered' };
    if (!allowDelivered && (liveJobs.has(order.id) || (job?.status === 'generating' && job.lease_until && new Date(job.lease_until) > new Date()))) return { ok: false, status: 409, code: 'generating' };
    const claim = await pool.query(
      `UPDATE orders SET refund_status = 'processing', refund_reason = $2, refund_started_at = NOW()
       WHERE id = $1 AND (refund_status IS NULL OR refund_status = 'failed' OR (refund_status = 'processing' AND refund_started_at < NOW() - make_interval(mins => $3)))
       RETURNING id`, [order.id, String(reason).slice(0, 60), REFUND_STALE_MIN]);
    if (!claim.rows[0]) return { ok: false, status: 409, code: 'refund_in_progress' };
    try {
      const pay = await portone.getPayment(order.imp_uid);
      if (!pay) throw Object.assign(new Error('payment_not_found'), { code: 'payment_not_found' });
      if (pay.merchant_uid !== order.id || Number(pay.amount) !== Number(order.paid_amount)) throw Object.assign(new Error('payment_mismatch'), { code: 'payment_mismatch' });
      if (pay.status !== 'cancelled') {
        if (pay.status !== 'paid') throw Object.assign(new Error('payment_not_paid'), { code: 'payment_not_paid' });
        await portone.cancelPayment({ impUid: order.imp_uid, merchantUid: order.id, amount: Number(order.paid_amount), reason: '결과지를 전달하지 못해 전액 환불' });
      }
      await pool.query(`UPDATE orders SET refund_status = 'done', refunded_at = NOW() WHERE id = $1`, [order.id]);
      console.log(`[OPS] 전액 환불 완료 order=${order.id} reason=${reason}`);
      if (order.email) await sendOpsMail(order.email, refundDoneMail(order));
      return { ok: true, status: 200 };
    } catch (e) {
      await pool.query(`UPDATE orders SET refund_status = 'failed' WHERE id = $1`, [order.id]).catch(() => {});
      console.error(`[OPS] 환불 실패 order=${order.id} code=${e.code || e.message}`);
      return { ok: false, status: 502, code: 'refund_failed' };
    }
  }
  const REFUND_MESSAGES = {
    not_found: ['주문 정보를 확인할 수 없어요.', 404],
    not_refundable: ['환불할 수 없는 주문입니다.', 409],
    no_payment: ['결제 내역을 확인할 수 없어요. 고객센터로 문의해 주세요.', 409],
    already_delivered: ['결과지가 이미 전달되어 바로 환불할 수 없어요. 고객센터로 문의해 주세요.', 409],
    generating: ['결과지를 작성하고 있어요. 잠시 뒤에 다시 시도해 주세요.', 409],
    refund_in_progress: ['환불을 처리하고 있어요. 잠시 뒤에 확인해 주세요.', 409],
    refund_failed: ['환불 처리에 실패했어요. 잠시 뒤에 다시 시도하거나 고객센터로 문의해 주세요.', 502],
  };
  const refundReply = (res, r) => r.ok
    ? res.json({ status: 'refunded', already: !!r.already })
    : res.status(REFUND_MESSAGES[r.code]?.[1] || 409).json({ error: REFUND_MESSAGES[r.code]?.[0] || '환불을 처리하지 못했어요.', code: r.code });

  // 고객: 결과지를 받기 전이면 전액 환불 요청(주문 토큰으로 본인 확인)
  app.post('/api/orders/:id/refund', withSchema(async (req, res) => {
    const { order, error } = await authorizeOrder(req);
    if (!order) return orderAuthError(res, error);
    if (order.product !== SUCCESS_CHILD.key) return res.status(400).json({ error: '환불을 요청할 수 없는 상품입니다.' });
    refundReply(res, await refundSuccessOrder(order.id, { reason: 'customer_request' }));
  }));
  // 운영자: 전달 여부와 관계없이 전액 환불(확인 표시 필요)
  app.post('/api/admin/orders/:id/refund', requireAdmin, withSchema(async (req, res) => {
    if (req.body?.confirm !== true) return res.status(400).json({ error: '환불하려면 확인 표시(confirm: true)가 필요해요.' });
    const r = await refundSuccessOrder(String(req.params.id), { reason: 'admin', allowDelivered: true });
    if (r.ok) console.log(`[ADMIN] 환불 order=${req.params.id}`);
    refundReply(res, r);
  }));

  // 주기 점검: 실패 안내 메일 · 자동 재생성 · 운영자 알림 · (켜져 있을 때) 자동 환불. 서버 재시작 후에도 DB 상태만 보고 이어서 처리한다.
  async function successOpsTick() {
    const stats = { notices: 0, retries: 0, refunds: 0, alerts: 0 };
    const { rows } = await pool.query(
      `SELECT o.id, o.email, o.is_comp, o.paid_at, o.paid_amount, j.status AS job_status, j.attempts, j.updated_at AS job_updated_at, j.lease_until, j.notice_sent_at
       FROM orders o LEFT JOIN analysis_jobs j ON j.order_id = o.id
       WHERE o.product = $1 AND o.status = 'paid' AND o.email IS NOT NULL
         AND (o.refund_status IS NULL OR o.refund_status IN ('failed', 'processing'))
         AND (j.order_id IS NULL OR j.status <> 'done')
       ORDER BY o.paid_at LIMIT 50`, [SUCCESS_CHILD.key]);
    const now = Date.now();
    for (const r of rows) {
      if (liveJobs.has(r.id)) continue;
      const paidMin = r.paid_at ? (now - new Date(r.paid_at).getTime()) / 60000 : 0;
      const idleMin = r.job_updated_at ? (now - new Date(r.job_updated_at).getTime()) / 60000 : paidMin;
      const leaseExpired = r.job_status === 'generating' && r.lease_until && new Date(r.lease_until).getTime() < now;
      if (r.job_status === 'failed' && !r.notice_sent_at && await noticeFailure({ id: r.id, email: r.email, is_comp: r.is_comp })) stats.notices++;
      const stuck = !r.job_status ? paidMin >= 3 : leaseExpired || (r.job_status === 'failed' && Number(r.attempts) < MAX_JOB_ATTEMPTS && idleMin >= OPS_RETRY_AFTER_MIN);
      if (stuck) { await kickoffSuccessJob(r.id); stats.retries++; continue; }
      if (r.job_status === 'failed' && Number(r.attempts) >= MAX_JOB_ATTEMPTS && !alerted.has(r.id)) {
        alerted.add(r.id); stats.alerts++;
        console.error(`[OPS] 자동 재생성을 모두 소진했습니다. 운영자 확인 필요 order=${r.id}`);
        if (process.env.ADMIN_ALERT_EMAIL) await sendOpsMail(process.env.ADMIN_ALERT_EMAIL, { subject: '[마이사주] 성공사주 생성 실패 — 확인 필요', html: opsMailShell('생성 실패', `<p>자동 재생성을 모두 소진했습니다. 주문번호: ${r.id}</p>`) });
      }
      const hours = autoRefundHours();
      if (hours && !r.is_comp && paidMin >= hours * 60 && r.job_status !== 'generating') {
        const rr = await refundSuccessOrder(r.id, { reason: 'auto_timeout' });
        if (rr.ok) stats.refunds++;
      }
    }
    return stats;
  }
  if (process.env.SUCCESS_OPS_SWEEP !== '0') {
    setTimeout(() => successOpsTick().catch((e) => console.error('[OPS] 점검 실패:', e.message)), 60 * 1000).unref?.();
    setInterval(() => successOpsTick().catch((e) => console.error('[OPS] 점검 실패:', e.message)), OPS_SWEEP_MS).unref?.();
  }

  return { PAID_ONLY_ANALYSIS_TYPES, rejectPaidWithoutOrder, createFreeTee, allowFreeAnalyze, analysisBodyFor, reconcileExpiredPending, successOpsTick, refundSuccessOrder };
}

module.exports = { sandboxLookupEnabled, installSecureApi, createPortoneClient, adminSessionHours, ADMIN_SESSION_HOURS, ADMIN_REMEMBER_HOURS, PRODUCTS, PAID_ONLY_ANALYSIS_TYPES, parseSections, textsFromEvents, buildOrderMail, escapeHtml };
