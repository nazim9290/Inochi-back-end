/**
 * EN: Cover-image picker for AI blog posts. Searches Wikimedia Commons for a
 *     real, topic-relevant photo (no API key required), downloads it, then
 *     uploads to Cloudinary so we own/serve the asset. Saved shape matches the
 *     legacy {url, public_id, alt, credit} the frontend already renders.
 *
 *     Why Commons (chosen 2026-06-11): Pollinations.ai (the old free Flux
 *     generator) became paywalled and now returns HTTP 402, so every recent
 *     post shipped image-less. Commons is keyless, free, brand-safe, and gives
 *     real Japan/Tokyo/study photos — we just have to attribute properly.
 *
 *     All failure modes are silent — caller writes the post with image=null
 *     and the frontend renders fine without a cover.
 * BN: AI blog post-এর cover-image picker। Wikimedia Commons-এ topic-সম্পর্কিত
 *     আসল ছবি খোঁজে (কোনো API key লাগে না), download করে, তারপর Cloudinary-তে
 *     upload — asset আমরা own/serve করি। Saved shape legacy
 *     {url, public_id, alt, credit}-এর সাথে মিল, frontend আগের মতই render করে।
 *
 *     Commons কেন (2026-06-11-এ বেছে নেওয়া): Pollinations.ai (পুরোনো free Flux
 *     generator) paywalled হয়ে HTTP 402 দেয়, তাই সাম্প্রতিক সব পোস্ট image
 *     ছাড়া যাচ্ছিল। Commons keyless, free, brand-safe, আসল জাপান/টোকিও/study
 *     ছবি দেয় — শুধু ঠিকভাবে attribution দিতে হয়।
 *
 *     যেকোনো failure-এ silent — caller image=null দিয়ে পোস্ট লেখে।
 */

const cloudinary = require('cloudinary').v2;

// EN: Module-level Cloudinary config — env read at first import.
// BN: Module-level Cloudinary config — env প্রথম import-এ পড়া।
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

// EN: Wikimedia REQUIRES a descriptive User-Agent or it blocks the request
//     (403/429). Identify the bot + a contact URL per their policy.
// BN: Wikimedia একটি descriptive User-Agent বাধ্যতামূলক করে, নাহলে request
//     block করে (403/429)। ওদের policy অনুযায়ী bot + contact URL দিই।
const USER_AGENT =
  'InochiEducationBot/1.0 (https://inochieducation.com; contact: info@inochieducation.com)';

// EN: Generic brand-safe fallback searches, tried in order when the AI's own
//     image query finds nothing usable, so a post is never left image-less.
// BN: brand-safe generic fallback search — AI-র নিজের query-তে usable কিছু না
//     পেলে ক্রমে try হয়, যাতে কোনো পোস্ট image ছাড়া না থাকে।
const FALLBACK_QUERIES = [
  'Japan university students',
  'Tokyo Japan cityscape',
  'Japan study abroad',
];

// EN: Strip HTML + collapse whitespace from Commons extmetadata fields
//     (Artist/License often arrive as small HTML snippets).
// BN: Commons extmetadata field থেকে HTML সরাই + whitespace ছোট করি
//     (Artist/License প্রায়ই ছোট HTML snippet হিসেবে আসে)।
function stripHtml(s) {
  return s
    ? String(s)
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200)
    : '';
}

// EN: Reduce a free-form query to plain search terms (letters/digits/spaces).
// BN: free-form query-কে plain search term-এ নামাই (অক্ষর/সংখ্যা/space)।
function cleanQuery(raw) {
  return String(raw || '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

// EN: Search Commons (File namespace) for a usable photo matching `query`.
//     Returns {thumbUrl, descriptionUrl, artist, license} or null. We only
//     accept real raster photos (jpeg/png) at least 800px wide and ask the
//     API for a 1200px-wide thumbnail so the download stays small.
// BN: `query`-র সাথে মেলা usable photo-র জন্য Commons (File namespace) search।
//     Returns {thumbUrl, descriptionUrl, artist, license} বা null। শুধু আসল
//     raster photo (jpeg/png) ≥800px চওড়া নিই, আর API থেকে 1200px-চওড়া
//     thumbnail চাই যাতে download ছোট থাকে।
async function searchCommonsImage(query) {
  const q = cleanQuery(query);
  if (!q) return null;
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${q} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1200',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25 * 1000);
  let json;
  try {
    const res = await fetch(`${COMMONS_API}?${params}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Commons API HTTP ${res.status}`);
    json = await res.json();
  } finally {
    clearTimeout(timer);
  }

  const pages = json?.query?.pages;
  if (!pages) return null;

  // EN: Preserve search-relevance order via each page's `index`.
  // BN: প্রতি page-এর `index` দিয়ে search-relevance order রাখি।
  const ranked = Object.values(pages).sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const page of ranked) {
    const ii = page.imageinfo && page.imageinfo[0];
    if (!ii) continue;
    if (!/^image\/(jpeg|png)$/.test(ii.mime || '')) continue; // photos only, no SVG/GIF
    if ((ii.width || 0) < 800) continue; // big enough for a hero
    const thumbUrl = ii.thumburl || ii.url;
    if (!thumbUrl) continue;
    const meta = ii.extmetadata || {};
    const license =
      stripHtml(meta.LicenseShortName?.value) || stripHtml(meta.License?.value) || 'see source';
    return {
      thumbUrl,
      descriptionUrl:
        ii.descriptionurl ||
        `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
      artist: stripHtml(meta.Artist?.value),
      license,
    };
  }
  return null;
}

// EN: Download image bytes (with the required UA). 45 s abort cap.
// BN: image bytes download (required UA সহ)। 45s abort cap।
async function fetchImageBuffer(url, timeoutMs = 45 * 1000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

// EN: Upload buffer to Cloudinary under `inochi/ai-blog`, normalised to jpg.
// BN: Buffer Cloudinary-তে `inochi/ai-blog`-এ upload, jpg-তে normalise।
function uploadToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'inochi/ai-blog',
        public_id: publicId,
        resource_type: 'image',
        format: 'jpg',
        overwrite: true,
      },
      (err, result) => {
        if (err) return reject(err);
        if (!result?.secure_url) return reject(new Error('Cloudinary returned no url'));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/**
 * EN: Find + host a cover image. Returns {ok, photo, error}. `photo` shape:
 *     {url, public_id, alt, credit{name, source, sourceLink}}. `rawQuery` is
 *     the AI's short English image keywords; `seedSource` (the topic) is used
 *     as a secondary search term before the generic fallbacks.
 * BN: Cover image খুঁজে host করে। Returns {ok, photo, error}। `photo` shape:
 *     {url, public_id, alt, credit{name, source, sourceLink}}। `rawQuery` =
 *     AI-র সংক্ষিপ্ত English image keyword; `seedSource` (topic) generic
 *     fallback-এর আগে secondary search term হিসেবে ব্যবহৃত।
 */
async function generateCoverImage(rawQuery, seedSource) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return { ok: false, photo: null, error: 'Cloudinary credentials missing' };
  }

  // EN: Try the AI keywords, then the topic, then brand-safe generics.
  // BN: আগে AI keyword, তারপর topic, তারপর brand-safe generic।
  const queries = [rawQuery, seedSource, ...FALLBACK_QUERIES].filter(Boolean);
  let found = null;
  let lastError = 'no Commons match found';
  for (const q of queries) {
    try {
      found = await searchCommonsImage(q);
      if (found) break;
    } catch (err) {
      lastError = `Commons search failed: ${err.message || err}`;
    }
  }
  if (!found) return { ok: false, photo: null, error: lastError };

  let buffer;
  try {
    buffer = await fetchImageBuffer(found.thumbUrl);
  } catch (err) {
    return { ok: false, photo: null, error: `Image download failed: ${err.message || err}` };
  }
  if (!buffer || buffer.length < 1000) {
    return { ok: false, photo: null, error: 'Downloaded image empty/tiny' };
  }

  const publicId = `commons-${Date.now()}`;
  let uploaded;
  try {
    uploaded = await uploadToCloudinary(buffer, publicId);
  } catch (err) {
    return { ok: false, photo: null, error: `Cloudinary upload failed: ${err.message || err}` };
  }

  // EN: Attribution — Commons licenses require crediting the author + license.
  // BN: Attribution — Commons license অনুযায়ী author + license credit বাধ্যতামূলক।
  const creditName = found.artist
    ? `${found.artist} / Wikimedia Commons (${found.license})`
    : `Wikimedia Commons (${found.license})`;

  return {
    ok: true,
    error: null,
    photo: {
      url: uploaded.secure_url,
      public_id: uploaded.public_id,
      alt: cleanQuery(rawQuery).slice(0, 200),
      credit: {
        name: creditName,
        source: 'Wikimedia Commons',
        sourceLink: found.descriptionUrl,
      },
    },
  };
}

module.exports = { generateCoverImage };
