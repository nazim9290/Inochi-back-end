/**
 * EN: Daily AI blog scheduler. Runs once per day at AI_BLOG_HOUR (local time):
 *       1. Pick the oldest pending topic from BlogTopicQueue, OR fall back
 *          to an AI-picked topic from the built-in pool.
 *       2. Call DeepSeek to generate a trilingual post.
 *       3. Insert a published Blog row attributed to AI_BLOG_AUTHOR_ID.
 *       4. Ping IndexNow so Bing/Yandex pick it up immediately.
 *       5. Record an AiBlogRun audit row (success or failure with reason).
 *
 *     The cron is GUARDED by AI_BLOG_ENABLED=true. Default is OFF so the
 *     feature ships dormant — admin flips the env var when ready.
 * BN: Daily AI blog scheduler। AI_BLOG_HOUR (local time)-এ দিনে একবার চলে:
 *       ১. BlogTopicQueue থেকে সবচেয়ে পুরোনো pending topic, না থাকলে
 *          built-in pool থেকে AI-picked topic।
 *       ২. DeepSeek call করে trilingual post generate।
 *       ৩. AI_BLOG_AUTHOR_ID-এ attributed published Blog row insert।
 *       ৪. IndexNow ping — Bing/Yandex সাথে সাথে index করবে।
 *       ৫. AiBlogRun audit row record (success / failure reason)।
 *
 *     AI_BLOG_ENABLED=true না থাকলে cron run করে না। Default OFF — feature
 *     dormant ship করে; admin তৈরি হলে env flip করে।
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Blog, BlogTopicQueue, AiBlogRun, User } = require('../models');
const { callDeepSeek, pickFallbackTopic, makeSlug } = require('./aiBlog');
const { pingPaths } = require('./indexnow');

const PUBLIC_BASE = (process.env.PUBLIC_SITE_URL || 'https://inochieducation.com').replace(/\/$/, '');

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
function shape(doc, source, topic) {
  // EN: Prefer English title for the slug (ASCII-clean), fall back to Ja
  //     (romaji-stripped becomes empty anyway), then Bangla title.
  // BN: Slug-এর জন্য English title আগে (ASCII-clean), না থাকলে Ja
  //     (romaji-strip-এ খালি হয়), শেষে Bangla title।
  const slug = makeSlug(doc.titleEn, doc.titleJa, doc.title);
  const safeTags =
    typeof doc.tags === 'object' && doc.tags
      ? {
          blogs: !!doc.tags.blogs,
          study: !!doc.tags.study,
          service: !!doc.tags.service,
        }
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
  };
}

// EN: Single end-to-end run. Returns {ok, blog, runRow, error}. Always
//     persists an AiBlogRun row regardless of outcome so the audit log
//     is complete even when nothing was published.
// BN: একক end-to-end run। Returns {ok, blog, runRow, error}। নির্বিশেষে
//     AiBlogRun row persist — কিছু publish না হলেও audit log complete থাকে।
async function runOnce({ source = 'auto' } = {}) {
  const startedAt = Date.now();

  // EN: Decide topic — admin queue first, then AI fallback.
  // BN: Topic ঠিক — প্রথমে admin queue, না থাকলে AI fallback।
  let queueRow = null;
  let topic = '';
  let category = '';
  let keywordsCsv = '';

  if (source !== 'manual' || true) {
    // EN: Even for manual triggers, prefer to drain the admin queue first.
    // BN: Manual trigger-ও admin queue আগে drain করে।
    queueRow = await BlogTopicQueue.findOne({
      where: { status: 'pending' },
      order: [['createdAt', 'ASC']],
    });
  }

  if (queueRow) {
    topic = queueRow.topic;
    category = queueRow.category || '';
    keywordsCsv = queueRow.keywordsCsv || '';
  } else {
    const fb = pickFallbackTopic();
    topic = fb.topic;
    category = fb.category;
  }

  const usedSource = queueRow ? 'queue' : source;

  const ai = await callDeepSeek({ topic, category, keywordsCsv });
  if (!ai.ok) {
    if (queueRow) {
      // EN: Don't burn the topic on a transient AI failure — leave it
      //     pending so the next run retries.
      // BN: Transient AI failure-এ topic পুড়িয়ে ফেলব না — pending রেখে
      //     দিই, next run retry করবে।
    }
    const runRow = await AiBlogRun.create({
      topic,
      source: usedSource,
      status: 'failed',
      errorMessage: ai.error,
      durationMs: Date.now() - startedAt,
    });
    return { ok: false, error: ai.error, runRow };
  }

  let authorId;
  try {
    authorId = await resolveAuthorId();
  } catch (e) {
    authorId = null;
  }
  if (!authorId) {
    const err = 'No User row available to attribute the AI blog to';
    const runRow = await AiBlogRun.create({
      topic,
      source: usedSource,
      status: 'failed',
      errorMessage: err,
      durationMs: Date.now() - startedAt,
    });
    return { ok: false, error: err, runRow };
  }

  const blogData = { ...shape(ai.doc, usedSource, topic), authorId };

  try {
    const blog = await Blog.create(blogData);
    if (queueRow) {
      queueRow.status = 'used';
      queueRow.usedAt = new Date();
      queueRow.blogId = blog.id;
      await queueRow.save();
    }
    // EN: IndexNow — push the URL list right after publish. /blog (list)
    //     and the new post itself. blog/[id] is the canonical detail.
    // BN: IndexNow — publish-এর সাথে সাথে URL list push। /blog (list) ও
    //     নতুন post। blog/[id] canonical detail।
    pingPaths(['/blog', `/blog/${blog.id}`]);
    const runRow = await AiBlogRun.create({
      topic,
      source: usedSource,
      status: 'success',
      blogId: blog.id,
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, blog, runRow };
  } catch (err) {
    const msg = err?.message || String(err);
    const runRow = await AiBlogRun.create({
      topic,
      source: usedSource,
      status: 'failed',
      errorMessage: `DB insert failed: ${msg}`,
      durationMs: Date.now() - startedAt,
    });
    return { ok: false, error: msg, runRow };
  }
}

// EN: Guard against double-firing the same day if the process restarts
//     across the cron hour. We check today's AiBlogRun success count before
//     firing — if >= 1 success exists for today, skip silently.
// BN: একই দিনে process restart হলে cron দু'বার fire হওয়া আটকাই। Fire-এর
//     আগে আজকের AiBlogRun success count check; ≥1 থাকলে silent skip।
async function hasSuccessfulRunToday() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const count = await AiBlogRun.count({
    where: { status: 'success', createdAt: { [Op.gte]: startOfDay } },
  });
  return count >= 1;
}

function startScheduler() {
  if (process.env.AI_BLOG_ENABLED !== 'true') {
    console.log('[ai-blog] disabled (AI_BLOG_ENABLED != true)');
    return;
  }
  const hour = Math.max(0, Math.min(23, parseInt(process.env.AI_BLOG_HOUR, 10) || 9));
  // EN: Use a deterministic off-minute (17) so multiple sites running this
  //     same library don't all hit DeepSeek at :00. node-cron uses local time.
  // BN: Deterministic off-minute (17) — একই library চালানো একাধিক site
  //     একসাথে :00-এ DeepSeek hit না করুক। node-cron local time ব্যবহার করে।
  const expr = `17 ${hour} * * *`;
  cron.schedule(expr, async () => {
    try {
      if (await hasSuccessfulRunToday()) {
        console.log('[ai-blog] today already has a successful run — skipping');
        return;
      }
      console.log('[ai-blog] daily run starting');
      const r = await runOnce({ source: 'auto' });
      console.log(`[ai-blog] daily run: ok=${r.ok} blogId=${r.blog?.id || '-'} err=${r.error || '-'}`);
    } catch (err) {
      console.error('[ai-blog] daily run threw:', err);
    }
  });
  console.log(`[ai-blog] scheduled daily at ${hour}:17 local`);
}

module.exports = { startScheduler, runOnce, hasSuccessfulRunToday };
