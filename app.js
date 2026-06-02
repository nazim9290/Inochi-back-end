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
app.use(express.json({ limit: '1mb' }));
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
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
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

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
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
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
})();
