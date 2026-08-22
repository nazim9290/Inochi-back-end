/**
 * EN: Daily AI blog scheduler. Runs AI_BLOG_PER_DAY times per day at the
 *     configured hours:
 *       1. Choose a topic that has NEVER been published:
 *            a. oldest pending BlogTopicQueue row (admin-curated), else
 *            b. a never-used brief from the built-in pool, else
 *            c. a brand-new brief proposed by DeepSeek.
 *          Every candidate is checked against the permanent ledger (all
 *          successful run briefs + all blog titles) with the similarity
 *          rule in helpers/blogSimilarity.js.
 *       2. Call DeepSeek to generate a trilingual post.
 *       3. Duplicate-title gate: if the generated title is a near-duplicate
 *          of an existing post, regenerate once with the conflicting titles
 *          listed; if still a duplicate, FAIL the run (nothing published).
 *       4. Insert a published Blog row attributed to AI_BLOG_AUTHOR_ID.
 *       5. Ping IndexNow so Bing/Yandex pick it up immediately.
 *       6. Record an AiBlogRun audit row (success or failure with reason).
 *
 *     The cron is GUARDED by AI_BLOG_ENABLED=true. Default is OFF so the
 *     feature ships dormant — admin flips the env var when ready.
 * BN: Daily AI blog scheduler। configured hour-এ দিনে AI_BLOG_PER_DAY বার চলে:
 *       ১. এমন topic বাছে যা কখনো publish হয়নি:
 *            ক. সবচেয়ে পুরোনো pending BlogTopicQueue row (admin-curated), নইলে
 *            খ. built-in pool-এর কখনো-ব্যবহার-না-হওয়া brief, নইলে
 *            গ. DeepSeek-এর প্রস্তাবিত একদম নতুন brief।
 *          প্রতিটি candidate permanent ledger (সব successful run-এর brief +
 *          সব blog title)-এর সাথে helpers/blogSimilarity.js-এর rule-এ যাচাই।
 *       ২. DeepSeek call করে trilingual post generate।
 *       ৩. Duplicate-title gate: generated title বিদ্যমান post-এর near-
 *          duplicate হলে conflicting title-সহ একবার regenerate; তবুও
 *          duplicate হলে run FAIL (কিছু publish হয় না)।
 *       ৪. AI_BLOG_AUTHOR_ID-এ attributed published Blog row insert।
 *       ৫. IndexNow ping — Bing/Yandex সাথে সাথে index করবে।
 *       ৬. AiBlogRun audit row record (success / failure reason)।
 *
 *     AI_BLOG_ENABLED=true না থাকলে cron run করে না। Default OFF — feature
 *     dormant ship করে; admin তৈরি হলে env flip করে।
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Blog, BlogTopicQueue, AiBlogRun, User } = require('../models');
const {
  callDeepSeek,
  pickFallbackTopic,
  proposeTopic,
  themeForSlot,
  makeSlug,
  isNearDuplicate,
  nearestMatch,
} = require('./aiBlog');
const { generateCoverImage } = require('./blogImage');
const { pingPaths } = require('./indexnow');

// EN: Resolve the User row to attribute the AI post to. Priority:
//       1. process.env.AI_BLOG_AUTHOR_ID if set + exists
//       2. First admin in the DB
//       3. Any user (deterministic order) — last-resort, should never happen in prod
//     Cached on success so we don't hit the DB every run.
// BN: AI post যেই User-এর author হবে। Priority:
//       ১. process.env.AI_BLOG_AUTHOR_ID set + exists
//       ২. DB-র প্রথম admin
//       ৩. যেকোনো user (deterministic order) — last-resort, prod-এ ঘটার কথা না
//     সফল হলে cache — প্রতি run-এ DB hit এড়াতে।
let cachedAuthorId = null;
async function resolveAuthorId() {
  if (cachedAuthorId) return cachedAuthorId;
  const envId = process.env.AI_BLOG_AUTHOR_ID;
  if (envId) {
    const u = await User.findByPk(envId).catch(() => null);
    if (u) {
      cachedAuthorId = u.id;
      return cachedAuthorId;
    }
  }
  const admin = await User.findOne({ where: { role: 'admin' }, order: [['createdAt', 'ASC']] });
  if (admin) {
    cachedAuthorId = admin.id;
    return cachedAuthorId;
  }
  const any = await User.findOne({ order: [['createdAt', 'ASC']] });
  cachedAuthorId = any?.id || null;
  return cachedAuthorId;
}

// EN: Sanitise + slim AI output before insert. The generator already
//     constrains shape; this guards against undefined/null leakage and
//     enforces field length caps so we never blow DB column limits.
// BN: Insert-এর আগে AI output sanitise + slim। Generator আগেই shape
//     constrain করে; এটা undefined/null leakage আটকায় ও field-এর length
//     cap enforce করে — DB column limit কখনো ভাঙবে না।
function shape(doc, source, topic, image) {
  const slug = makeSlug(doc.titleEn, doc.titleJa, doc.title);
  const safeTags =
    typeof doc.tags === 'object' && doc.tags
      ? { blogs: !!doc.tags.blogs, study: !!doc.tags.study, service: !!doc.tags.service }
      : { blogs: true, study: false, service: false };
  return {
    title: String(doc.title || '').slice(0, 250),
    titleEn: String(doc.titleEn || '').slice(0, 250),
    titleJa: String(doc.titleJa || '').slice(0, 250),
    content: String(doc.content || ''),
    contentEn: String(doc.contentEn || ''),
    contentJa: String(doc.contentJa || ''),
    excerpt: String(doc.excerpt || '').slice(0, 400),
    excerptEn: String(doc.excerptEn || '').slice(0, 400),
    excerptJa: String(doc.excerptJa || '').slice(0, 400),
    category: String(doc.category || 'Blog').slice(0, 80),
    categoryEn: String(doc.categoryEn || 'Blog').slice(0, 80),
    categoryJa: String(doc.categoryJa || 'ブログ').slice(0, 80),
    metaKeywords: String(doc.metaKeywords || '').slice(0, 500),
    slug,
    tags: safeTags,
    status: 'published',
    aiGeneratedAt: new Date(),
    image: image || null,
  };
}

// EN: The permanent ledger — every brief that produced a post + every blog
//     title in any language/status. Unlike the old "last 20 runs" window
//     this never forgets, so a brief can be used exactly once, ever.
// BN: Permanent ledger — post তৈরি করা প্রতিটি brief + যেকোনো ভাষা/status-এর
//     প্রতিটি blog title। পুরোনো "শেষ ২০ run" window-এর মতো ভোলে না — তাই
//     একটি brief জীবনে ঠিক একবারই ব্যবহার হয়।
async function coveredTopics() {
  const [runs, blogs] = await Promise.all([
    AiBlogRun.findAll({ attributes: ['topic'], where: { status: 'success' }, raw: true }),
    Blog.findAll({ attributes: ['title', 'titleEn'], raw: true }),
  ]);
  const set = new Set();
  for (const r of runs) if (r.topic) set.add(String(r.topic).trim());
  for (const b of blogs) {
    if (b.titleEn) set.add(String(b.titleEn).trim());
    if (b.title) set.add(String(b.title).trim());
  }
  return [...set].filter(Boolean);
}

// EN: Existing blog titles only (EN preferred, Bangla fallback) — used by
//     the post-generation title gate. Briefs are excluded here on purpose:
//     a generated title is naturally close to its own brief.
// BN: শুধু বিদ্যমান blog title (EN আগে, নইলে Bangla) — post-generation title
//     gate-এ ব্যবহার। Brief ইচ্ছা করেই বাদ: generated title নিজের brief-এর
//     কাছাকাছি হওয়াই স্বাভাবিক।
async function existingTitles() {
  const blogs = await Blog.findAll({ attributes: ['title', 'titleEn'], raw: true });
  return blogs.map((b) => b.titleEn || b.title).filter(Boolean);
}

/**
 * EN: Choose the topic for this run. Returns
 *     { topic, category, keywordsCsv, theme, source, queueRow } or null
 *     when no unique topic could be found (caller records a failed run).
 * BN: এই run-এর topic বাছে। { topic, category, keywordsCsv, theme, source,
 *     queueRow } দেয়, বা null — unique topic না পেলে (caller failed run
 *     record করে)।
 */
async function selectTopic({ slotIndex = 0, covered }) {
  // EN: 1) admin queue — always first, even for manual triggers.
  // BN: ১) admin queue — manual trigger-এও সবসময় আগে।
  const queueRow = await BlogTopicQueue.findOne({
    where: { status: 'pending' },
    order: [['createdAt', 'ASC']],
  });
  if (queueRow) {
    return {
      topic: queueRow.topic,
      category: queueRow.category || '',
      keywordsCsv: queueRow.keywordsCsv || '',
      theme: themeForSlot(slotIndex).key,
      source: 'queue',
      queueRow,
    };
  }

  // EN: 2) built-in pool minus the ledger.
  // BN: ২) built-in pool বাদ ledger।
  const fb = pickFallbackTopic(slotIndex, covered);
  if (fb) return { ...fb, keywordsCsv: '', source: 'auto', queueRow: null };

  // EN: 3) pool exhausted → ask DeepSeek for a new brief, verify it against
  //     the ledger ourselves, retry with a hint if the model rephrased.
  // BN: ৩) pool শেষ → DeepSeek-কে নতুন brief দিতে বলি, নিজেরা ledger-এর সাথে
  //     যাচাই করি, model rephrase করলে hint দিয়ে retry।
  const themeKey = themeForSlot(slotIndex).key;
  let excludeHint = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = await proposeTopic({ themeKey, covered, excludeHint });
    if (!p.ok) {
      console.log('[ai-blog] proposeTopic failed:', p.error);
      break;
    }
    if (!isNearDuplicate(p.topic, covered)) {
      return { ...p, source: 'ai-topic', queueRow: null };
    }
    const near = nearestMatch(p.topic, covered).match;
    console.log(`[ai-blog] proposed topic too close to existing ("${near}") — retrying`);
    excludeHint = `Your previous proposal "${p.topic}" was too similar to "${near}". Choose a completely different subject.`;
  }
  return null;
}

async function recordRun(fields) {
  return AiBlogRun.create(fields);
}

// EN: Single end-to-end run. Returns {ok, blog, runRow, error}. Always
//     persists an AiBlogRun row regardless of outcome so the audit log
//     is complete even when nothing was published.
// BN: একক end-to-end run। Returns {ok, blog, runRow, error}। নির্বিশেষে
//     AiBlogRun row persist — কিছু publish না হলেও audit log complete থাকে।
async function runOnce({ source = 'auto', slotIndex = 0 } = {}) {
  const startedAt = Date.now();
  const covered = await coveredTopics().catch(() => []);

  const pick = await selectTopic({ slotIndex, covered });
  if (!pick) {
    const err =
      'No unique topic available (pool exhausted and AI proposals duplicated existing posts)';
    const runRow = await recordRun({
      topic: '',
      source,
      status: 'failed',
      errorMessage: err,
      durationMs: Date.now() - startedAt,
    });
    return { ok: false, error: err, runRow };
  }

  const { topic, category, keywordsCsv, theme, queueRow } = pick;
  const usedSource = pick.source === 'auto' ? source : pick.source;

  // EN: Generate, then run the duplicate-title gate. One retry with the
  //     conflicting titles spelled out; a second duplicate fails the run.
  // BN: Generate, তারপর duplicate-title gate। Conflicting title বলে দিয়ে
  //     একবার retry; দ্বিতীয়বারও duplicate হলে run fail।
  const titles = await existingTitles().catch(() => []);
  let ai = await callDeepSeek({ topic, category, keywordsCsv, theme });
  let duplicateOf = null;
  for (let attempt = 0; attempt < 2 && ai.ok; attempt++) {
    const candidate = ai.doc.titleEn || ai.doc.title;
    const near = nearestMatch(candidate, titles);
    if (!isNearDuplicate(candidate, titles)) {
      duplicateOf = null;
      break;
    }
    duplicateOf = near.match;
    console.log(
      `[ai-blog] generated title "${candidate}" duplicates "${near.match}" (${near.score.toFixed(2)})`
    );
    if (attempt === 0) {
      ai = await callDeepSeek({ topic, category, keywordsCsv, theme, avoidTitles: [near.match] });
    }
  }

  if (!ai.ok || duplicateOf) {
    const err = ai.ok
      ? `Duplicate title — too similar to existing post "${duplicateOf}"`
      : ai.error;
    if (queueRow && duplicateOf) {
      // EN: A duplicate admin topic must not block the queue forever —
      //     mark it failed (no blog) so the next run moves on; the reason
      //     is in the AiBlogRun row the admin panel shows.
      // BN: Duplicate admin topic যেন queue চিরকাল আটকে না রাখে — failed
      //     (blog ছাড়া) করে দিই, পরের run এগোয়; কারণ admin panel-এ দেখানো
      //     AiBlogRun row-তে থাকে।
      queueRow.status = 'failed';
      queueRow.usedAt = new Date();
      await queueRow.save().catch(() => {});
    }
    const runRow = await recordRun({
      topic,
      source: usedSource,
      status: 'failed',
      errorMessage: err,
      durationMs: Date.now() - startedAt,
    });
    return { ok: false, error: err, runRow };
  }

  let authorId;
  try {
    authorId = await resolveAuthorId();
  } catch {
    authorId = null;
  }
  if (!authorId) {
    const err = 'No User row available to attribute the AI blog to';
    const runRow = await recordRun({
      topic,
      source: usedSource,
      status: 'failed',
      errorMessage: err,
      durationMs: Date.now() - startedAt,
    });
    return { ok: false, error: err, runRow };
  }

  // EN: Cover image — Wikimedia Commons search + Cloudinary host. Failure
  //     is silent: the post still publishes with image=null.
  // BN: Cover image — Wikimedia Commons search + Cloudinary host। Failure
  //     silent: post image=null দিয়েই publish হয়।
  let imageMeta = null;
  try {
    const imgRes = await generateCoverImage(ai.doc.imageQuery || topic, ai.doc.imageQuery || topic);
    if (imgRes.ok) {
      imageMeta = imgRes.photo;
      console.log('[ai-blog] cover image generated:', imageMeta.url);
    } else {
      console.log('[ai-blog] cover image skipped:', imgRes.error);
    }
  } catch (e) {
    console.log('[ai-blog] cover image threw:', e?.message || e);
  }

  const blogData = { ...shape(ai.doc, usedSource, topic, imageMeta), authorId };

  try {
    const blog = await Blog.create(blogData);
    if (queueRow) {
      queueRow.status = 'used';
      queueRow.usedAt = new Date();
      queueRow.blogId = blog.id;
      await queueRow.save();
    }
    pingPaths(['/blog', `/blog/${blog.id}`]);
    const runRow = await recordRun({
      topic,
      source: usedSource,
      status: 'success',
      blogId: blog.id,
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, blog, runRow };
  } catch (err) {
    const msg = err?.message || String(err);
    const runRow = await recordRun({
      topic,
      source: usedSource,
      status: 'failed',
      errorMessage: `DB insert failed: ${msg}`,
      durationMs: Date.now() - startedAt,
    });
    return { ok: false, error: msg, runRow };
  }
}

// EN: Kept for the admin status endpoint / older callers: most recent run
//     briefs. No longer used for de-duplication (see coveredTopics).
// BN: Admin status endpoint / পুরোনো caller-এর জন্য রাখা: সাম্প্রতিক run-এর
//     brief। De-duplication-এ আর ব্যবহার হয় না (coveredTopics দেখুন)।
async function recentTopics(limit = 20) {
  const rows = await AiBlogRun.findAll({
    attributes: ['topic'],
    order: [['createdAt', 'DESC']],
    limit,
  });
  return rows.map((r) => r.topic).filter(Boolean);
}

// EN: How many posts to auto-publish per day. AI_BLOG_PER_DAY, default 2,
//     clamped to a sane 1–6.
// BN: দিনে কয়টি পোস্ট auto-publish হবে। AI_BLOG_PER_DAY, default 2, 1–6-এ clamp।
function getPerDay() {
  const n = parseInt(process.env.AI_BLOG_PER_DAY, 10);
  return Math.max(1, Math.min(6, Number.isFinite(n) ? n : 2));
}

// EN: Local hours (0–23) at which to fire each daily run. AI_BLOG_HOURS
//     (comma list, e.g. "9,18") wins; otherwise spread `perDay` slots evenly
//     starting at AI_BLOG_HOUR (default 9). Always sorted + de-duplicated.
//     Each run still fires at HH:17 to avoid :00 clustering across deploys.
// BN: প্রতিটি daily run কোন কোন local hour-এ (0–23) চলবে। AI_BLOG_HOURS
//     (comma list, যেমন "9,18") আগে; না থাকলে AI_BLOG_HOUR (default 9) থেকে
//     শুরু করে `perDay` slot সমানভাবে ছড়িয়ে দিই। সবসময় sorted + unique।
//     প্রতিটি run HH:17-এ চলে — deploy জুড়ে :00 clustering এড়াতে।
function getPublishHours(perDay = getPerDay()) {
  const raw = String(process.env.AI_BLOG_HOURS || '').trim();
  let hours = [];
  if (raw) {
    hours = raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23);
  }
  if (!hours.length) {
    const base = Math.max(0, Math.min(23, parseInt(process.env.AI_BLOG_HOUR, 10) || 9));
    const step = Math.max(1, Math.floor(24 / perDay));
    for (let i = 0; i < perDay; i++) hours.push((base + i * step) % 24);
  }
  return [...new Set(hours)].sort((a, b) => a - b);
}

// EN: Count today's SUCCESSFUL runs. Used both to (a) cap the day at perDay
//     posts even if the process restarts across a cron hour, and (b) derive
//     the slot index so each run of the day uses a different theme.
// BN: আজকের SUCCESSFUL run গুনি। ব্যবহার: (ক) process restart হলেও দিনে
//     perDay-র বেশি পোস্ট না হওয়া, (খ) slot index বের করা যাতে দিনের প্রতিটি
//     run আলাদা theme পায়।
async function successfulRunsToday() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return AiBlogRun.count({ where: { status: 'success', createdAt: { [Op.gte]: startOfDay } } });
}

function startScheduler() {
  if (process.env.AI_BLOG_ENABLED !== 'true') {
    console.log('[ai-blog] disabled (AI_BLOG_ENABLED != true)');
    return;
  }
  const perDay = getPerDay();
  const hours = getPublishHours(perDay);
  hours.forEach((hour) => {
    const expr = `17 ${hour} * * *`;
    cron.schedule(expr, async () => {
      try {
        const done = await successfulRunsToday();
        if (done >= perDay) {
          console.log(`[ai-blog] today already has ${done}/${perDay} successful runs — skipping`);
          return;
        }
        console.log(`[ai-blog] run starting (slot ${done + 1}/${perDay})`);
        const r = await runOnce({ source: 'auto', slotIndex: done });
        console.log(`[ai-blog] run: ok=${r.ok} blogId=${r.blog?.id || '-'} err=${r.error || '-'}`);
      } catch (err) {
        console.error('[ai-blog] run threw:', err);
      }
    });
  });
  console.log(
    `[ai-blog] scheduled ${perDay}/day at ${hours.map((h) => `${h}:17`).join(', ')} local`
  );
}

module.exports = {
  startScheduler,
  runOnce,
  selectTopic,
  coveredTopics,
  existingTitles,
  successfulRunsToday,
  recentTopics,
  getPerDay,
  getPublishHours,
};
