require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const Fingerprint = require('express-fingerprint');
const { nanoid } = require('nanoid');
const rateLimit = require('express-rate-limit');

const { sequelize, Image } = require('./models');

const app = express();
const port = process.env.PORT || 8080;

// EN: Trust the first proxy (PM2 behind Nginx on VPS) so rate-limit reads
//     the real client IP from X-Forwarded-For instead of treating every
//     request as coming from 127.0.0.1.
// BN: PM2 → Nginx-এর পিছনে চলায় first proxy trust করি — rate-limit তখন
//     X-Forwarded-For থেকে আসল client IP পায়, সব 127.0.0.1 ধরে না।
app.set('trust proxy', 1);

// EN: CORS allow-list — comma-separated CORS_ORIGINS env, defaulting to the
//     public site + admin URLs. Wildcard kept only when DEV_CORS=open is set.
// BN: CORS allow-list — comma-separated CORS_ORIGINS env, default public
//     site + admin URL। DEV_CORS=open থাকলে wildcard থাকে (শুধু dev-এ)।
const DEFAULT_ORIGINS = [
  process.env.PUBLIC_SITE_URL || 'https://inochieducation.com',
  process.env.ADMIN_SITE_URL || 'https://admin.inochieducation.com',
  'http://localhost:3000',
  'http://localhost:3100',
  'http://localhost:4000',
  'http://localhost:5173',
];
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(DEFAULT_ORIGINS);

const corsOptions = {
  origin(origin, cb) {
    if (process.env.DEV_CORS === 'open') return cb(null, true);
    if (!origin) return cb(null, true); // server-to-server / curl
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(helmet());
// EN: 1MB JSON cap — image uploads use multer, so legitimate JSON is tiny.
//     Caps slow-loris / large-payload DoS attempts.
// BN: 1MB JSON cap — image upload multer handle করে, তাই legit JSON ছোট।
//     Slow-loris / large-payload DoS-এর চেষ্টা আটকে।
// EN: `verify` stashes the raw body buffer so webhook routes (e.g. Facebook
//     Lead Ads) can validate HMAC signatures. No effect on normal parsing.
// BN: `verify` raw body buffer রেখে দেয় — webhook route (যেমন Facebook Lead Ads)
//     HMAC signature যাচাই করতে পারে। সাধারণ parsing-এ কোনো প্রভাব নেই।
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(
  Fingerprint({
    parameters: [Fingerprint.useragent, Fingerprint.acceptHeaders, Fingerprint.geoip],
  })
);

// EN: Global soft limiter — 300 req / 15 min per IP across all routes.
//     Catches obvious crawlers/abuse without affecting normal browsing.
// BN: Global soft limiter — IP-প্রতি 15 মিনিটে 300 request।
//     সাধারণ ব্রাউজিং না আটকে স্পষ্ট crawler/abuse ধরে।
// EN: The public website renders server-side on this same VPS, so every page
//     build / ISR refresh reaches this API from ONE IP — 2026-08-23 a deploy
//     burned the 300-request bucket and the site served empty fallbacks.
//     Requests carrying the shared INTERNAL_API_KEY (x-internal-key) skip the
//     general limiter; on the strict limiters they are keyed by the visitor
//     IP the site forwards in x-client-ip (trusted ONLY together with the
//     key, so the public cannot spoof it). Unset key = no exemption at all.
// BN: Public website এই একই VPS-এ server-side render হয়, তাই প্রতিটা page
//     build / ISR refresh একটাই IP থেকে এই API-তে আসে — 2026-08-23 এক deploy
//     300-request bucket শেষ করে দেয় আর site খালি fallback দেখায়। Shared
//     INTERNAL_API_KEY (x-internal-key) থাকা request general limiter এড়ায়;
//     strict limiter-এ site-এর পাঠানো x-client-ip (visitor IP) দিয়ে key হয়
//     (শুধু key-সহ বিশ্বাস করা হয়, public spoof করতে পারে না)। Key unset =
//     কোনো ছাড় নেই।
const { ipKeyGenerator } = require('express-rate-limit');
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const isInternalRequest = (req) =>
  Boolean(INTERNAL_API_KEY) && req.get('x-internal-key') === INTERNAL_API_KEY;
const limiterKey = (req) => {
  const forwarded = isInternalRequest(req) ? String(req.get('x-client-ip') || '').trim() : '';
  return ipKeyGenerator(forwarded || req.ip);
};

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isInternalRequest,
  message: { error: 'Too many requests — please try again later.' },
});
app.use('/api', generalLimiter);

// EN: Tight limiter for high-abuse endpoints (mail-triggering, auth).
//     5 requests / 10 min / IP — generous for humans, lethal for bots.
//     Mounted before specific route registrations below.
// BN: Mail-trigger + auth এর মতো high-abuse endpoint-এর জন্য কড়া limiter।
//     IP-প্রতি 10 মিনিটে 5 request — মানুষের জন্য যথেষ্ট, bot-এর জন্য মারাত্মক।
const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: limiterKey,
  message: { error: 'Too many attempts — please wait a few minutes.' },
});
app.use('/api/subscriber', strictLimiter);
app.use('/api/contact', strictLimiter);
app.use('/api/seminer-book', strictLimiter);
app.use('/api/register', strictLimiter);
app.use('/api/login', strictLimiter);

// Health
app.get('/', (req, res) => {
  res.json({
    serverName: 'Inochi Global Education Institute',
    status: 'ok',
  });
});

app.get('/fingerprint', (req, res) => {
  res.json({ fingerprint: req.fingerprint, clientIp: req.clientIp });
});

// Routes
app.use('/api', require('./routes/userContactRoute'));
app.use('/api', require('./routes/subscriber'));
app.use('/api', require('./routes/blogRoute'));
app.use('/api', require('./routes/data'));
app.use('/api', require('./routes/questionRoute'));
app.use('/api', require('./routes/userRoute'));
app.use('/api', require('./routes/siteContent'));
app.use('/api', require('./routes/contentExtras'));
app.use('/api', require('./routes/indexnow'));
app.use('/api', require('./routes/emailOutreach'));
app.use('/api', require('./routes/applications'));
app.use('/api', require('./routes/reviews'));
app.use('/api', require('./routes/imageLibrary'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/auditLog'));
app.use('/api', require('./routes/blogReactionRoute'));
app.use('/api', require('./routes/blogCommentRoute'));
app.use('/api', require('./routes/meRoute'));
app.use('/api', require('./routes/aiBlog'));
app.use('/api', require('./routes/fbLeadgen'));

// Image upload (kept inline because it's a single endpoint pair)
// EN: requireAuth here — image upload was previously open to anonymous
//     callers, which let anyone fill the database with arbitrary 5MB blobs.
// BN: এখানে requireAuth — image upload আগে anonymous-কে দিয়েই 5MB blob
//     spam করা যেত; এখন authenticated user-ই শুধু পারবে।
const { requireAuth } = require('./middleware/auth');
const UPLOAD_LIMIT = 5 * 1024 * 1024; // 5MB
const uploadAuthed = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_LIMIT },
  fileFilter: (req, file, cb) => {
    // EN: Reject non-image MIME types early so bad uploads don't even buffer.
    // BN: image না হলে আগেই reject — খারাপ upload buffer-ও হয় না।
    if (!/^image\/(png|jpe?g|gif|webp|svg\+xml)$/i.test(file.mimetype)) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

app.post('/api/upload', requireAuth, uploadAuthed.single('image'), async (req, res) => {
  try {
    const publicId = nanoid(10);
    const url = 'data:image/png;base64,' + req.file.buffer.toString('base64');
    await Image.create({ url, publicId });
    res.status(201).json({ message: 'File uploaded successfully', public_id: publicId });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/api/images/:public_id', async (req, res) => {
  try {
    const image = await Image.findOne({ where: { publicId: req.params.public_id } });
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    res.status(200).json({ url: image.url, public_id: image.publicId });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// EN: Error handler — in production we never echo the raw err.message back
//     to the client (it can leak file paths, ORM internals, stack-trace
//     fragments). We always log the real error server-side. In dev we keep
//     the verbose message so debugging stays fast.
// BN: Error handler — production-এ raw err.message client-কে কখনো ফেরাই
//     না (file path / ORM internals / stack-trace leak করে)। Server-এ
//     আসল error log করি। Dev-এ verbose message রাখি যাতে debug সহজ থাকে।
const IS_PROD = process.env.NODE_ENV === 'production';
app.use((err, req, res, _next) => {
  console.error('[error]', req.method, req.originalUrl, '-', err.message || err);
  const status = err.status || 500;
  const message = IS_PROD
    ? status >= 500
      ? 'Internal Server Error'
      : err.message || 'Bad request'
    : err.message || 'Internal Server Error';
  res.status(status).json({ message });
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');

    if (process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: true });
      console.log('Schema synced (alter mode)');
    }

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });

    // EN: Boot the daily AI blog scheduler. No-op when AI_BLOG_ENABLED!='true'
    //     so the feature ships dormant until the admin flips the env var.
    // BN: Daily AI blog scheduler boot। AI_BLOG_ENABLED!='true' হলে কিছু
    //     করে না — env flip না করা পর্যন্ত feature dormant ship করে।
    try {
      require('./helpers/blogScheduler').startScheduler();
    } catch (e) {
      console.error('[ai-blog] scheduler boot failed:', e?.message || e);
    }
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
})();
