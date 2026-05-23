// EN: IndexNow helper. IndexNow lets us instantly tell participating search
//     engines (Bing, Yandex, Seznam, Naver — NOT Google) that a URL was just
//     created or updated, so they re-crawl in minutes instead of days.
//     Every ping is fire-and-forget: it must NEVER block or break the admin's
//     publish request. Uses native fetch (Node 18+); no SDK.
//
//     Setup: the same INDEXNOW_KEY must be set in this backend's .env AND in
//     the frontend's env (the frontend serves it at /indexnow.txt). The key
//     is a public verification token, not a secret.
//
// BN: IndexNow helper। IndexNow দিয়ে অংশগ্রহণকারী search engine-কে (Bing,
//     Yandex, Seznam, Naver — Google নয়) সাথে সাথে জানানো যায় যে একটা URL
//     এইমাত্র তৈরি/আপডেট হয়েছে — তারা কয়েক মিনিটেই re-crawl করে, দিনের
//     পর দিন অপেক্ষা নয়। প্রতিটা ping fire-and-forget: admin-এর publish
//     request কখনো block বা break করবে না। Native fetch (Node 18+) ব্যবহার।
//
//     Setup: একই INDEXNOW_KEY এই backend-এর .env আর frontend-এর env দুটোতেই
//     লাগবে (frontend /indexnow.txt-এ serve করে)। Key public verification
//     token, গোপন নয়।

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';
const SITE_URL = (
  process.env.PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://inochieducation.com'
).replace(/\/$/, '');
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const LOCALES = ['en', 'bn', 'ja'];

let HOST = 'inochieducation.com';
try {
  HOST = new URL(SITE_URL).host;
} catch (_) {
  /* keep default */
}
const KEY_LOCATION = `${SITE_URL}/indexnow.txt`;

const isConfigured = () => Boolean(INDEXNOW_KEY);

// EN: Expand a locale-agnostic public path ("/blog/42") into the three
//     locale-specific absolute URLs. `en` is the default locale (no prefix);
//     `bn`/`ja` are prefixed — matching the frontend routing.
// BN: একটা locale-নিরপেক্ষ public path ("/blog/42")-কে তিনটা locale-নির্দিষ্ট
//     absolute URL-এ expand করে। `en` default (prefix নেই); `bn`/`ja`
//     prefix-যুক্ত — frontend routing-এর সাথে মিলে।
function localeUrls(path) {
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return LOCALES.map((loc) => {
    const prefix = loc === 'en' ? '' : `/${loc}`;
    return `${SITE_URL}${prefix}${clean}` || `${SITE_URL}/`;
  });
}

// EN: Submit a flat list of absolute URLs to IndexNow. Deduped + capped at
//     the 10k-per-request limit. Returns a result object; never throws.
// BN: IndexNow-এ absolute URL-এর flat list submit করে। Dedupe + 10k/request
//     limit-এ cap। result object return করে; কখনো throw করে না।
async function submitUrls(urls) {
  if (!isConfigured()) return { ok: false, reason: 'indexnow-not-configured' };
  const urlList = [...new Set((Array.isArray(urls) ? urls : [urls]).filter(Boolean))].slice(0, 10000);
  if (urlList.length === 0) return { ok: false, reason: 'no-urls' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList }),
      signal: controller.signal,
    });
    // IndexNow returns 200 or 202 on success; 4xx on bad key/host.
    if (!res.ok) {
      console.warn(`[indexnow] submit failed: HTTP ${res.status} for ${urlList.length} url(s)`);
      return { ok: false, reason: `http-${res.status}`, count: urlList.length };
    }
    return { ok: true, count: urlList.length };
  } catch (err) {
    console.warn('[indexnow] submit error:', err.message);
    return { ok: false, reason: err.message };
  } finally {
    clearTimeout(timer);
  }
}

// EN: Fire-and-forget ping for one or more public paths. Each path fans out
//     to all three locales. Safe to call from a request handler — it does not
//     await, so the publish response returns immediately.
// BN: এক বা একাধিক public path-এর জন্য fire-and-forget ping। প্রতিটা path
//     তিন locale-এ fan-out হয়। Request handler থেকে নিরাপদে call করা যায় —
//     await করে না, তাই publish response সাথে সাথে return করে।
function pingPaths(paths) {
  if (!isConfigured()) return;
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
  if (list.length === 0) return;
  const urls = list.flatMap((p) => localeUrls(p));
  submitUrls(urls).catch(() => {});
}

// EN: Shared internals — capture the JSON response body (so URL builders can
//     read the new id/slug) and ping on a successful (2xx) finish.
// BN: শেয়ার্ড internals — JSON response body capture (যাতে URL builder নতুন
//     id/slug পড়তে পারে) এবং সফল (2xx) finish-এ ping।
function attachFinish(req, res, computePaths) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res._indexnowBody = body;
    return originalJson(body);
  };
  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    try {
      const paths = computePaths(req, res._indexnowBody);
      pingPaths(paths);
    } catch (err) {
      console.warn('[indexnow] finish hook error:', err.message);
    }
  });
}

// EN: Router-level middleware for RESTful resources. Skips GET (reads). On a
//     successful mutating response, derives the resource key from the matched
//     route (e.g. "/bd-cities/:id" → "bd-cities"), looks it up in `map`, and
//     pings the resource's list path(s) + an optional detail path built from
//     the response body.
//     map shape: { 'bd-cities': { paths: ['/study-from'], detail: (body) => '/study-from/<slug>' | null } }
// BN: RESTful resource-এর জন্য router-level middleware। GET (read) skip করে।
//     সফল mutating response-এ matched route থেকে resource key বের করে (যেমন
//     "/bd-cities/:id" → "bd-cities"), `map`-এ খোঁজে, এবং resource-এর list
//     path + response body থেকে বানানো optional detail path ping করে।
function autoPing(map) {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    attachFinish(req, res, (request, body) => {
      const routePath = request.route && String(request.route.path);
      const key = routePath ? routePath.split('/')[1] : '';
      const entry = map[key];
      if (!entry) return [];
      const paths = [...(entry.paths || [])];
      if (typeof entry.detail === 'function') {
        const detail = entry.detail(body, request);
        if (detail) paths.push(detail);
      }
      return paths;
    });
    next();
  };
}

// EN: Per-route middleware for non-RESTful endpoints (blog publish, team,
//     seminars). `buildPaths(req, body)` returns the public path(s) to ping.
//     Pings on any 2xx (including GET endpoints that mutate, like the blog
//     publish route) since it is attached deliberately.
// BN: Non-RESTful endpoint-এর (blog publish, team, seminar) জন্য per-route
//     middleware। `buildPaths(req, body)` ping করার public path return করে।
//     যেকোনো 2xx-এ ping করে (mutate করা GET endpoint সহ, যেমন blog publish
//     route) — কারণ এটা ইচ্ছাকৃতভাবে attach করা।
function pingIndexNow(buildPaths) {
  return (req, res, next) => {
    attachFinish(req, res, (request, body) => buildPaths(request, body) || []);
    next();
  };
}

// EN: One-shot bulk submit of EVERY public URL by reading the live
//     /sitemap.xml and extracting each <loc>. Used for the initial submission
//     and the admin "resubmit" action. Already-correct URLs (incl. locale
//     variants) are in the sitemap, so no locale fan-out needed here.
// BN: live /sitemap.xml পড়ে প্রতিটা <loc> বের করে প্রতিটি public URL একবারে
//     bulk submit। প্রথমবারের submission আর admin "resubmit" action-এর জন্য।
//     Sitemap-এ ইতিমধ্যে সঠিক URL (locale variant সহ) আছে, তাই এখানে locale
//     fan-out লাগে না।
async function resubmitFromSitemap() {
  if (!isConfigured()) return { ok: false, reason: 'indexnow-not-configured' };
  try {
    const res = await fetch(`${SITE_URL}/sitemap.xml`, { headers: { Accept: 'application/xml' } });
    if (!res.ok) return { ok: false, reason: `sitemap-http-${res.status}` };
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    if (locs.length === 0) return { ok: false, reason: 'no-locs-in-sitemap' };
    const result = await submitUrls(locs);
    return result;
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

// EN: Config snapshot for the admin diagnostics endpoint — confirms the key
//     is set and shows where engines will look for it.
// BN: Admin diagnostics endpoint-এর জন্য config snapshot — key set আছে কিনা
//     নিশ্চিত করে আর engine কোথায় key খুঁজবে দেখায়।
function status() {
  return { configured: isConfigured(), siteUrl: SITE_URL, host: HOST, keyLocation: KEY_LOCATION };
}

module.exports = {
  isConfigured,
  status,
  submitUrls,
  pingPaths,
  autoPing,
  pingIndexNow,
  resubmitFromSitemap,
  // Exposed for tests / diagnostics
  _internals: { SITE_URL, HOST, KEY_LOCATION, localeUrls },
};
