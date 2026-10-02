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

// 가격·상품명은 서버에서만 정한다. (쿠폰 할인은 운영에 아직 없으므로 적용하지 않는다)
const PRODUCTS = Object.freeze({
  full_saju:  { amount: 1990,  name: '마이사주 전체 분석',          kind: 'personal',  analysisType: '전체',     prefix: 'saju',    autoEmail: true,  resultType: 'base',      emailLabel: '✨ 나의 사주 분석' },
  full_child: { amount: 9900,  name: '마이사주 자녀운 프리미엄',    kind: 'personal',  analysisType: '자녀천명', prefix: 'child',   autoEmail: true,  resultType: 'child',     emailLabel: '🌱 우리 아이 진로·학과 프리미엄' },
  full_nohu:  { amount: 1990,  name: '마이사주 전체 분석',          kind: 'personal',  analysisType: '노후',     prefix: 'saju',    autoEmail: true,  resultType: 'nohu',      emailLabel: '🌅 노후 운세 분석' },
  deep:       { amount: 9900,  name: '마이사주 심화 분석',          kind: 'personal',  analysisType: '심화',     prefix: 'deep',    autoEmail: false, resultType: 'deep' },
  gunghab:    { amount: 1990,  name: '마이사주 궁합 분석',          kind: 'gunghab',   analysisType: '궁합',     prefix: 'gunghab', autoEmail: false, resultType: 'gunghab' },
  gilil:      { amount: 9900,  name: '마이사주 길일 추천',          kind: 'gilil',                               prefix: 'gilil' },
  baeknyeon:  { amount: 99000, name: '마이사주 100년 사주 인생 꿀팁', kind: 'baeknyeon', analysisType: '100년꿀팁', prefix: 'baek',    autoEmail: false, resultType: '100년꿀팁' },
});

// 주문 없이 /api/analyze로 요청하면 거부할 유료 전용 분석 유형
const PAID_ONLY_ANALYSIS_TYPES = new Set(['궁합', '100년꿀팁', '심화', '길일']);

const GILIL_PURPOSES = ['이사', '계약', '개업', '결혼', '수술', '시험'];
const MAX_JOB_ATTEMPTS = 3;          // 실패 후 자동 재시도 허용 횟수 (쿨다운 이후 다시 3회)
const RETRY_COOLDOWN_MINUTES = 30;
const LEASE_SECONDS = 90;            // 생성 중 작업의 임대 시간 (하트비트로 연장)
const HEARTBEAT_MS = 30 * 1000;
const ADMIN_SESSION_HOURS = 8;
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
function createPortoneClient() {
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

  async function getJson(path) {
    const token = await accessToken();
    const { status, json } = await httpJson(`${base()}${path}`, { headers: { Authorization: token } });
    if (status === 401) { cached = null; throw fail('portone_auth_failed'); }
    if (status === 404) return null;
    if (status !== 200 || !json) throw fail('portone_unavailable');
    if (json.code !== 0 || !json.response) return null;
    return json.response;
  }

  return {
    // 결제 건이 없으면 null, 조회 자체가 실패하면 예외(재시도 가능)
    getPayment: (impUid) => getJson(`/payments/${encodeURIComponent(impUid)}`),
    // 주문번호(merchant_uid)로 결제 완료 건 조회 — 고객이 결제 직후 창을 닫은 경우 운영자가 확인할 때 사용
    findPaidByMerchantUid: (merchantUid) => getJson(`/payments/find/${encodeURIComponent(merchantUid)}/paid`),
  };
}

// ── 메인 ──────────────────────────────────────────────
function installSecureApi({ app, pool, runAnalysis, computeGilil, allowedOrigins }) {
  const RUNNER_ID = crypto.randomBytes(8).toString('hex');
  const liveJobs = new Map(); // orderId → { events, listeners, finished }
  const mailer = createMailer();
  const portone = createPortoneClient();

  const adminLoginIpLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
  const adminLoginGlobalLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
  const adminAuthFailLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
  const orderCreateLimiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 20 });
  const orderAuthFailLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 30 });

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

  // 오래된 임시 데이터 정리 (무료 결과 24시간, 미결제 주문 7일, 만료 세션, 발송 기록 7일)
  const cleanup = () => ensureSchema().then(() => pool.query(`
    DELETE FROM free_results WHERE created_at < NOW() - INTERVAL '24 hours';
    DELETE FROM orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days';
    DELETE FROM admin_sessions WHERE expires_at < NOW();
    DELETE FROM email_sends WHERE created_at < NOW() - INTERVAL '7 days';
  `)).catch((e) => console.error('[DB] 정리 작업 실패:', e.message));
  setTimeout(cleanup, 5000).unref?.();
  setInterval(cleanup, 60 * 60 * 1000).unref?.();

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
    const sid = randomToken(32);
    await pool.query(
      `INSERT INTO admin_sessions (id_hash, token_fingerprint, expires_at) VALUES ($1, $2, NOW() + make_interval(hours => $3))`,
      [sha256Hex(sid), fingerprint, ADMIN_SESSION_HOURS]
    );
    setAdminCookie(res, sid, ADMIN_SESSION_HOURS * 3600);
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
      const input = { gender: str(r.gender, 10), birthdate: dateStr(r.birthdate), birthtime: timeStr(r.birthtime), userName: str(r.userName, 30) };
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
      return { gender: i.gender || '미입력', birthdate: i.birthdate, birthtime: i.birthtime, type: '100년꿀팁', isPaid: true, isLunar: false, userName: i.userName };
    }
    return null;
  }

  async function createOrder(req, res, { comp }) {
    const productKey = typeof req.body?.product === 'string' ? req.body.product : '';
    const product = PRODUCTS[productKey];
    if (!product) return res.status(400).json({ error: '지원하지 않는 상품입니다.' });
    const email = req.body?.email ? String(req.body.email).trim() : '';
    if (email && !isValidEmail(email)) return res.status(400).json({ error: '이메일 주소를 확인해주세요.' });
    const built = await buildOrderInput(productKey, req.body?.input);
    if (built.error) return res.status(400).json({ error: built.error });

    const orderId = `${product.prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const orderToken = randomToken(32);
    await pool.query(
      `INSERT INTO orders (id, product, amount, token_hash, input, email, status, is_comp, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [orderId, productKey, product.amount, sha256Hex(orderToken), JSON.stringify(built.input), email || null,
        comp ? 'paid' : 'pending', !!comp, comp ? new Date() : null]
    );
    if (comp) console.log(`[ADMIN] 결제 없는 운영자 주문 생성 order=${orderId} product=${productKey}`);
    res.status(201).json({ orderId, orderToken, product: productKey, amount: product.amount, name: product.name, status: comp ? 'paid' : 'pending' });
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
    return { status: 200, body: { status: 'paid' } };
  }

  // ── 생성 작업 (중복 실행 방지) ──
  async function claimJob(orderId, { force = false } = {}) {
    const { rows } = await pool.query(
      `INSERT INTO analysis_jobs (order_id, status, attempts, runner_id, lease_until, started_at, updated_at)
       VALUES ($1, 'generating', 1, $2, NOW() + make_interval(secs => $5), NOW(), NOW())
       ON CONFLICT (order_id) DO UPDATE SET
         status = 'generating',
         attempts = CASE WHEN $4 OR (analysis_jobs.status = 'failed' AND analysis_jobs.updated_at < NOW() - make_interval(mins => $6))
                         THEN 1 ELSE analysis_jobs.attempts + 1 END,
         runner_id = $2, lease_until = NOW() + make_interval(secs => $5), started_at = NOW(), updated_at = NOW(),
         events = NULL, result_text = NULL, last_error = NULL
       WHERE (analysis_jobs.status = 'failed' AND ($4 OR analysis_jobs.attempts < $3 OR analysis_jobs.updated_at < NOW() - make_interval(mins => $6)))
          OR (analysis_jobs.status = 'generating' AND analysis_jobs.lease_until < NOW())
       RETURNING attempts`,
      [orderId, RUNNER_ID, MAX_JOB_ATTEMPTS, force, LEASE_SECONDS, RETRY_COOLDOWN_MINUTES]
    );
    return rows[0] || null;
  }

  const getJob = async (orderId) => (await pool.query('SELECT * FROM analysis_jobs WHERE order_id = $1', [orderId])).rows[0] || null;

  // runAnalysis가 쓰는 res 대신 넘기는 객체. 이벤트를 기록하고 연결된 모든 응답으로 보낸다.
  // 고객 연결이 끊겨도 생성은 끝까지 진행된다. (새로고침 후 같은 결과를 다시 받기 위해)
  function createJobSink(live) {
    const sink = {
      destroyed: false, writableEnded: false, headersSent: true, sawDone: false, sawError: false,
      setHeader() {}, flushHeaders() {}, on() { return sink; },
      status() { return sink; },
      json(obj) { sink.write(`data: ${JSON.stringify({ error: obj?.error || '분석 중 오류가 발생했습니다.' })}\n\n`); sink.end(); },
      write(chunk) {
        const text = String(chunk);
        if (text.startsWith(':')) return true; // keepalive 주석은 기록하지 않음
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try { const j = JSON.parse(line.slice(6)); if (j.type === 'done') sink.sawDone = true; if (j.error) sink.sawError = true; } catch {}
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
            `UPDATE analysis_jobs SET status = 'done', events = $2::jsonb, result_text = $3, finished_at = NOW(), updated_at = NOW(), lease_until = NULL
             WHERE order_id = $1 AND runner_id = $4`,
            [order.id, JSON.stringify(live.events), textsFromEvents(live.events).all, RUNNER_ID]
          );
        } else {
          if (!sink.sawError) sink.write(`data: ${JSON.stringify({ error: '분석 중 오류가 발생했습니다.' })}\n\n`);
          await pool.query(
            `UPDATE analysis_jobs SET status = 'failed', last_error = $2, events = NULL, finished_at = NOW(), updated_at = NOW(), lease_until = NULL
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
      if (ok) await afterJobDone(order, live.events, { emailAfter, emailVariant });
    })();
    return live;
  }

  // 생성 완료 후: 결제 전에 받은 이메일이 있으면 결과를 저장하고, 기존처럼 자동 발송 상품이면 메일을 보낸다.
  async function afterJobDone(order, events, { emailAfter, emailVariant }) {
    try {
      const { rows } = await pool.query('SELECT email FROM orders WHERE id = $1', [order.id]);
      const email = rows[0]?.email;
      if (!email) return;
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
    const to = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!isValidEmail(to)) return res.status(400).json({ error: '이메일 주소를 확인해주세요.' });
    if (PRODUCTS[order.product].kind === 'gilil') return res.status(400).json({ error: '이메일 발송을 지원하지 않는 상품입니다.' });
    const job = await getJob(order.id);
    if (job?.status !== 'done') return res.status(409).json({ error: '결과가 아직 준비되지 않았어요.' });
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
              j.status AS job_status, j.attempts AS job_attempts, j.updated_at AS job_updated_at
       FROM orders o LEFT JOIN analysis_jobs j ON j.order_id = o.id
       WHERE ${byEmail ? 'o.email = $1' : 'o.id = $1'} ORDER BY o.created_at DESC LIMIT 50`, [byEmail ? email : orderId]
    );
    res.json({ success: true, orders: rows.map((r) => ({
      id: r.id, product: r.product, productName: PRODUCTS[r.product]?.name || r.product, amount: r.amount, status: r.status, isComp: r.is_comp,
      paidAt: r.paid_at, createdAt: r.created_at, userName: r.user_name || r.my_name || '', hasEmail: r.has_email, jobStatus: r.job_status, jobAttempts: r.job_attempts, jobUpdatedAt: r.job_updated_at,
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
    if (job?.status === 'done') return res.status(409).json({ error: '이미 완료된 주문입니다.' });
    if (!(await claimJob(order.id, { force: true }))) return res.status(409).json({ error: '이미 생성 중입니다.' });
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
    let collected = '', sawDone = false, sawError = false;
    const capture = (chunk) => {
      for (const line of String(chunk).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const j = JSON.parse(line.slice(6));
          if (j.type === 'done') sawDone = true;
          else if (j.error) sawError = true;
          else if (j.type === 'score' || (!j.type && typeof j.text === 'string')) collected += j.text || '';
        } catch {}
      }
    };
    return new Proxy(res, {
      get(target, prop) {
        if (prop === 'write') return (chunk, ...rest) => { capture(chunk); return target.write(chunk, ...rest); };
        if (prop === 'end') return (...args) => {
          if (args.length || !sawDone || sawError || !collected.trim() || target.writableEnded) return target.end(...args);
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

  return { PAID_ONLY_ANALYSIS_TYPES, rejectPaidWithoutOrder, createFreeTee };
}

module.exports = { installSecureApi, PRODUCTS, PAID_ONLY_ANALYSIS_TYPES, parseSections, textsFromEvents, buildOrderMail, escapeHtml };
