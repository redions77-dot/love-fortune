// 우리 아이 성공운명서 후기 게시판. love-fortune-moms 의 후기 코드(backend/reviews.js)를 가져와 이 상품에 맞게 줄인 것이다.
// 달라진 점: 작성 자격은 '성공운명서 주문'만(구매 인증 = 결제 확인된 주문, 무료 체험 = 체험 코드로 만든 주문), 후기 작성 혜택(자녀 사주 무료)은 없다.
// 후기는 운영자가 승인(published)한 것만 공개된다. 주문은 읽기만 하고 새 reviews 테이블만 쓴다.
const crypto = require('crypto');

const CONCERNS = Object.freeze({ study: '공부·진로', career: '직업·사업', money: '재물·시기', etc: '기타' });
const CONTENT_MIN = 20;
const CONTENT_MAX = 500;
const NICKNAME_MAX = 12;
const STATUSES = ['pending', 'published', 'hidden'];
const PRODUCT_KEY = 'success_child';

const REVIEWS_SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS reviews (
      id BIGSERIAL PRIMARY KEY,
      nickname VARCHAR(30) NOT NULL,
      concern TEXT NOT NULL CHECK (concern IN ('study', 'career', 'money', 'etc')),
      rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
      content TEXT NOT NULL,
      usage_kind TEXT NOT NULL CHECK (usage_kind IN ('trial', 'paid')),
      order_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'hidden')),
      status_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON reviews(status, created_at DESC);
`;

const sha256Hex = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const countChars = (s) => Array.from(s).length;
const CONTACT_RE = /([^\s@]+@[^\s@]+\.[^\s@]+)|(\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b)|(https?:\/\/|www\.)/i;

function cleanText(v, max) {
  return typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim().slice(0, max) : '';
}

function parseReviewBody(body) {
  const b = body && typeof body === 'object' ? body : {};
  const nickname = cleanText(b.nickname, 60).replace(/\n/g, ' ');
  if (!nickname || countChars(nickname) > NICKNAME_MAX) return { error: `닉네임은 1~${NICKNAME_MAX}자로 적어주세요.` };
  const concern = typeof b.concern === 'string' && CONCERNS[b.concern] ? b.concern : '';
  if (!concern) return { error: '관심 분야를 선택해주세요.' };
  let rating = null;
  if (b.rating !== undefined && b.rating !== null && b.rating !== '') {
    rating = Number(b.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: '별점은 1~5점 중에서 선택해주세요.' };
  }
  const content = cleanText(b.content, CONTENT_MAX + 200);
  const len = countChars(content);
  if (len < CONTENT_MIN) return { error: `후기는 ${CONTENT_MIN}자 이상 적어주세요.` };
  if (len > CONTENT_MAX) return { error: `후기는 ${CONTENT_MAX}자 이내로 적어주세요.` };
  if (CONTACT_RE.test(nickname) || CONTACT_RE.test(content)) return { error: '이메일·전화번호·링크는 적을 수 없어요. 지우고 다시 남겨주세요.' };
  return { value: { nickname, concern, rating, content } };
}

// 작성 자격: 성공운명서 주문이고, 결제 확인(또는 무료 체험 접수) 상태이며, 환불되지 않았을 것.
// 본인 확인은 이 기기의 주문번호+주문 토큰, 또는 이메일 인증 후 받은 열람 토큰(sessionEmail)과 주문 이메일의 일치 중 하나다.
async function resolveEligibility(pool, body, { safeEqualHex, sessionEmail }) {
  const b = body && typeof body === 'object' ? body : {};
  const orderId = typeof b.orderId === 'string' ? b.orderId.trim().slice(0, 64) : '';
  if (!orderId) return { error: 400 };
  const { rows } = await pool.query('SELECT id, product, email, status, is_comp, token_hash, refund_status FROM orders WHERE id = $1', [orderId]);
  const order = rows[0];
  const token = typeof b.orderToken === 'string' ? b.orderToken : '';
  let ok = false;
  if (order && token) ok = safeEqualHex(order.token_hash, sha256Hex(token));
  else if (order && sessionEmail && order.email) ok = order.email.trim().toLowerCase() === sessionEmail;
  if (!ok || order.product !== PRODUCT_KEY || order.status !== 'paid' || order.refund_status === 'done') return { error: 404 };
  return { kind: order.is_comp ? 'trial' : 'paid', orderId: order.id };
}

const publicReview = (r) => ({
  id: String(r.id),
  nickname: r.nickname,
  concern: r.concern,
  concernLabel: CONCERNS[r.concern] || CONCERNS.etc,
  rating: r.rating,
  content: r.content,
  usageKind: r.usage_kind,            // 'paid' = 구매 인증, 'trial' = 무료 체험
  createdAt: r.created_at,
});

function installReviews({ app, pool, withSchema, requireAdmin, clientIp, createLimiter, safeEqualHex, getSessionEmail }) {
  const submitLimiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 10 });
  const verifyFailLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
  const tooMany = (res, limiter, ip) => {
    res.setHeader('Retry-After', String(limiter.retryAfterSec(ip)));
    return res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' });
  };

  async function verify(req, res) {
    const ip = clientIp(req);
    if (verifyFailLimiter.limited(ip)) { tooMany(res, verifyFailLimiter, ip); return null; }
    const body = req.body || {};
    const sessionEmail = typeof body.sessionToken === 'string' && body.sessionToken ? await getSessionEmail(req) : null;
    const found = await resolveEligibility(pool, body, { safeEqualHex, sessionEmail });
    if (found.error) {
      verifyFailLimiter.hit(ip);
      res.status(found.error).json({ error: found.error === 400 ? '주문 정보가 필요해요.' : '주문 정보를 확인할 수 없어요.' });
      return null;
    }
    const dup = await pool.query('SELECT 1 FROM reviews WHERE order_id = $1', [found.orderId]);
    found.alreadyReviewed = !!dup.rows[0];
    return found;
  }

  // ── 공개: 승인된 실제 후기만 ──
  app.get('/api/reviews', withSchema(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { rows } = await pool.query(
      `SELECT id, nickname, concern, rating, content, usage_kind, created_at
       FROM reviews WHERE status = 'published' ORDER BY published_at DESC NULLS LAST, id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    const { rows: stat } = await pool.query(
      `SELECT COUNT(*)::int AS total, COUNT(rating)::int AS rated, ROUND(AVG(rating)::numeric, 1)::float AS avg FROM reviews WHERE status = 'published'`);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, total: stat[0].total, ratingCount: stat[0].rated, ratingAverage: stat[0].rated ? stat[0].avg : null, hasMore: offset + rows.length < stat[0].total, reviews: rows.map(publicReview) });
  }));

  app.post('/api/reviews/check', withSchema(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const found = await verify(req, res);
    if (!found) return;
    res.json({ success: true, kind: found.kind, alreadyReviewed: found.alreadyReviewed });
  }));

  // 저장. 승인 전에는 공개되지 않는다(status=pending). 주문당 1건.
  app.post('/api/reviews', withSchema(async (req, res) => {
    const ip = clientIp(req);
    if (submitLimiter.limited(ip)) return tooMany(res, submitLimiter, ip);
    const parsed = parseReviewBody(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const found = await verify(req, res);
    if (!found) return;
    if (found.alreadyReviewed) return res.status(409).json({ error: '이미 후기를 남겨주셨어요. 고맙습니다.' });
    submitLimiter.hit(ip);
    const v = parsed.value;
    try {
      await pool.query(
        `INSERT INTO reviews (nickname, concern, rating, content, usage_kind, order_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [v.nickname, v.concern, v.rating, v.content, found.kind, found.orderId]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: '이미 후기를 남겨주셨어요. 고맙습니다.' });
      throw e;
    }
    res.status(201).json({ success: true, message: '후기를 받았어요. 확인 후 공개돼요.' });
  }));

  // ── 운영자 ──
  app.get('/api/admin/reviews', requireAdmin, withSchema(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const status = STATUSES.includes(req.query.status) ? req.query.status : null;
    const { rows } = await pool.query(
      `SELECT * FROM reviews WHERE ($1::text IS NULL OR status = $1) ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 200`, [status]);
    res.json({ success: true, reviews: rows.map((r) => ({ ...publicReview(r), status: r.status, statusNote: r.status_note || '', orderId: r.order_id, publishedAt: r.published_at })) });
  }));

  app.post('/api/admin/reviews/:id/status', requireAdmin, withSchema(async (req, res) => {
    const status = req.body?.status;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: '상태 값을 확인해주세요.' });
    const note = cleanText(req.body?.note, 200);
    const { rowCount } = await pool.query(
      `UPDATE reviews SET status = $2, status_note = $3,
         published_at = CASE WHEN $2 = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END WHERE id = $1`,
      [String(req.params.id).slice(0, 20), status, note || null]);
    if (!rowCount) return res.status(404).json({ error: '후기를 찾을 수 없어요.' });
    res.json({ success: true });
  }));
}

module.exports = { installReviews, REVIEWS_SCHEMA_SQL, parseReviewBody, resolveEligibility, CONCERNS, CONTENT_MIN, CONTENT_MAX, NICKNAME_MAX };
