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
const { generateCoverImage } = require('./blogImage');
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
function shape(doc, source, topic, image) {
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
    // EN: Cover image already fetched + shaped by the caller; null if
    //     Unsplash failed or the env key is missing.
    // BN: Cover image caller আগেই fetch + shape করেছে; Unsplash fail বা
    //     env key না থাকলে null।
    image: image || null,
  };
}

// EN: Single end-to-end run. Returns {ok, blog, runRow, error}. Always
//     persists an AiBlogRun row regardless of outcome so the audit log
//     is complete even when nothing was published.
// BN: একক end-to-end run। Returns {ok, blog, runRow, error}। নির্বিশেষে
//     AiBlogRun row persist — কিছু publish না হলেও audit log complete থাকে।
async function runOnce({ source = 'auto', slotIndex = 0 } = {}) {
  const startedAt = Date.now();

  // EN: Decide topic — admin queue first, then AI fallback.
  // BN: Topic ঠিক — প্রথমে admin queue, না থাকলে AI fallback।
  let queueRow = null;
  let topic = '';
  let category = '';
  let keywordsCsv = '';
  let theme = '';

  // EN: Even for manual triggers, prefer to drain the admin queue first.
  // BN: Manual trigger-ও admin queue আগে drain করে।
  queueRow = await BlogTopicQueue.findOne({
    where: { status: 'pending' },
    order: [['createdAt', 'ASC']],
  });

  if (queueRow) {
    topic = queueRow.topic;
    category = queueRow.category || '';
    keywordsCsv = queueRow.keywordsCsv || '';
  } else {
    // EN: Fall back to a rotating themed topic, but skip anything we've used
    //     in the recent run history so the auto-pilot never repeats itself.
    // BN: rotating themed topic-এ fall back, তবে সাম্প্রতিক run history-তে
    //     ব্যবহৃত যেকোনো topic বাদ — auto-pilot যেন কখনো নিজের পুনরাবৃত্তি না করে।
    const avoid = await recentTopics(20).catch(() => []);
    const fb = pickFallbackTopic(slotIndex, avoid);
    topic = fb.topic;
    category = fb.category;
    theme = fb.theme;
  }

  const usedSource = queueRow ? 'queue' : source;

  const ai = await callDeepSeek({ topic, category, keywordsCsv, theme });
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

  // EN: AI cover image — Pollinations (Flux) generation + Cloudinary host.
  //     Seeded on the AI image query so the same brief reproduces the same
  //     image on retry. Failure silent: post still publishes with image=null.
  // BN: AI cover image — Pollinations (Flux) generate + Cloudinary host।
  //     AI image query-তে seed — একই brief retry-তে একই image। Failure
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

// EN: Return the topic briefs of the most recent runs (any status) so the
//     fallback picker can skip anything used lately. Looking at runs (not
//     just published Blogs) means a failed attempt on a topic still counts
//     as "recently tried" and we move on to a fresh angle.
// BN: সাম্প্রতিক run-গুলোর (যেকোনো status) topic brief ফেরত — fallback picker
//     যাতে সম্প্রতি ব্যবহৃত topic এড়াতে পারে। Blog নয়, run দেখা মানে কোনো
//     topic-এ fail হলেও সেটা "সম্প্রতি চেষ্টা করা" ধরে পরের fresh angle-এ যাই।
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
  return AiBlogRun.count({
    where: { status: 'success', createdAt: { [Op.gte]: startOfDay } },
  });
}

function startScheduler() {
  if (process.env.AI_BLOG_ENABLED !== 'true') {
    console.log('[ai-blog] disabled (AI_BLOG_ENABLED != true)');
    return;
  }
  const perDay = getPerDay();
  const hours = getPublishHours(perDay);
  // EN: One cron per configured hour. Each fire checks today's success count:
  //     skip if we've already hit perDay, otherwise generate the next slot.
  //     The slot index (= today's success count) drives theme rotation so the
  //     day's posts span different themes.
  // BN: প্রতিটি configured hour-এ একটি cron। প্রতিবার আজকের success count
  //     দেখে: perDay হয়ে গেলে skip, নাহলে পরের slot generate। slot index
  //     (= আজকের success count) theme rotation চালায় — দিনের পোস্টগুলো ভিন্ন
  //     theme-এ পড়ে।
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
  console.log(`[ai-blog] scheduled ${perDay}/day at ${hours.map((h) => `${h}:17`).join(', ')} local`);
}

module.exports = {
  startScheduler,
  runOnce,
  successfulRunsToday,
  recentTopics,
  getPerDay,
  getPublishHours,
};
