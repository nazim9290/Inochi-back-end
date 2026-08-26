/**
 * EN: Reads visitor numbers back out of Google Analytics 4 so the admin can see
 *     them inside this panel instead of logging into analytics.google.com.
 *
 *     GA4 is the source of truth — this only reads. Nothing here writes, and a
 *     missing or broken credential never breaks the dashboard: every failure
 *     path returns `configured:false` with a reason, and the admin UI shows
 *     setup instructions instead of an error.
 *
 * BN: Google Analytics 4 থেকে visitor সংখ্যা পড়ে আনে, যাতে admin
 *     analytics.google.com-এ আলাদা করে login না করেই এই panel-এ দেখতে পারেন।
 *
 *     GA4-ই আসল উৎস — এখানে শুধু পড়া হয়। কিছু লেখা হয় না, আর credential না
 *     থাকলে বা নষ্ট হলেও dashboard ভাঙে না: প্রতিটা failure path কারণ-সহ
 *     `configured:false` ফেরত দেয়, আর admin UI error না দেখিয়ে setup-এর
 *     নির্দেশনা দেখায়।
 */

const PROPERTY_ID = (process.env.GA4_PROPERTY_ID || '').trim();
const SA_KEY_JSON = (process.env.GA4_SA_KEY_JSON || '').trim();
const SA_KEY_FILE = (process.env.GA4_SA_KEY_FILE || '').trim();

// EN: Cache the last good answer. GA4's free quota is generous but not
//     unlimited, and several admins refreshing the dashboard should not each
//     cost an API call. One hour is far finer than the data actually moves.
// BN: শেষ ভালো উত্তরটা cache করে রাখে। GA4-এর ফ্রি quota উদার, তবু অসীম নয় —
//     কয়েকজন admin dashboard refresh করলে প্রত্যেকবার API call খরচ করা উচিত
//     নয়। ডেটা যত দ্রুত বদলায়, এক ঘণ্টা তার চেয়ে অনেক সূক্ষ্ম।
const CACHE_MS = 60 * 60 * 1000;
const cache = new Map();

let clientPromise = null;

// EN: Build the GA4 client once. The key can arrive either as inline JSON in
//     the env (easiest to deploy) or as a path to a file on disk.
// BN: GA4 client একবারই তৈরি হয়। Key আসতে পারে env-এ inline JSON হিসেবে
//     (deploy করা সবচেয়ে সহজ) অথবা disk-এ একটা file-এর path হিসেবে।
const getClient = () => {
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const { BetaAnalyticsDataClient } = require('@google-analytics/data');

    if (SA_KEY_JSON) {
      const credentials = JSON.parse(SA_KEY_JSON);
      return new BetaAnalyticsDataClient({ credentials });
    }
    if (SA_KEY_FILE) {
      return new BetaAnalyticsDataClient({ keyFilename: SA_KEY_FILE });
    }
    // EN: Fall back to Google's own ambient discovery (GOOGLE_APPLICATION_CREDENTIALS).
    // BN: শেষে Google-এর নিজস্ব ambient discovery (GOOGLE_APPLICATION_CREDENTIALS)।
    return new BetaAnalyticsDataClient();
  })();

  return clientPromise;
};

const isConfigured = () =>
  Boolean(PROPERTY_ID) &&
  Boolean(SA_KEY_JSON || SA_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS);

// EN: Visitors grouped by country for the requested window. `days` is clamped
//     so a hand-edited URL cannot ask GA4 for an enormous range.
// BN: চাওয়া সময়সীমার জন্য দেশভিত্তিক visitor। `days` clamp করা — হাতে URL
//     বদলে GA4-এর কাছে বিশাল range চাওয়া যাবে না।
exports.getCountryVisitors = async (req, res) => {
  if (!isConfigured()) {
    return res.json({
      configured: false,
      reason: !PROPERTY_ID ? 'ga4-property-id-missing' : 'ga4-credentials-missing',
      countries: [],
    });
  }

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const cacheKey = `countries:${days}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return res.json({ ...hit.payload, cached: true });
  }

  try {
    const client = await getClient();
    const [report] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'country' }, { name: 'countryId' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 50,
    });

    const countries = (report.rows || []).map((row) => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      // EN: Two-letter code — the admin turns it into a flag emoji.
      // BN: দুই-অক্ষরের code — admin এটাকে flag emoji বানায়।
      code: row.dimensionValues?.[1]?.value || '',
      users: Number(row.metricValues?.[0]?.value || 0),
      sessions: Number(row.metricValues?.[1]?.value || 0),
    }));

    const totalUsers = countries.reduce((sum, c) => sum + c.users, 0);
    const payload = { configured: true, days, totalUsers, countries };

    cache.set(cacheKey, { at: Date.now(), payload });
    res.json(payload);
  } catch (err) {
    console.error('[analytics] GA4 country report failed:', err.message);
    // EN: Serve a stale answer rather than nothing when GA4 is briefly down.
    // BN: GA4 সাময়িকভাবে বন্ধ থাকলে কিছু না দেখিয়ে পুরনো উত্তরটাই দেখানো ভালো।
    if (hit) return res.json({ ...hit.payload, cached: true, stale: true });
    res.json({ configured: false, reason: err.message, countries: [] });
  }
};
