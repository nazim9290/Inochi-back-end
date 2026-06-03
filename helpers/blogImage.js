/**
 * EN: Cover-image fetcher for AI-generated blog posts. Calls the Unsplash
 *     Search Photos endpoint with a short English keyword query, picks
 *     the first landscape result, and returns a {url, public_id, alt,
 *     credit} object that matches the legacy Blog.image JSONB shape.
 *
 *     Returns null on:
 *       - Missing UNSPLASH_ACCESS_KEY (feature disabled silently)
 *       - Network / API failure
 *       - Zero results for the query
 *     The caller writes a blog post with image=null in those cases — the
 *     frontend already renders the post fine without a cover.
 *
 *     Unsplash API ToS REQUIRES that we ping the photo's `download_location`
 *     endpoint whenever we use it; this fires fire-and-forget after the
 *     URL is selected.
 * BN: AI-generated blog post-এর cover-image fetcher। Unsplash Search Photos
 *     endpoint-এ সংক্ষিপ্ত English keyword query করে, প্রথম landscape
 *     result বেছে নিয়ে legacy Blog.image JSONB shape-এর সাথে মিল রেখে
 *     {url, public_id, alt, credit} object return করে।
 *
 *     null return করে যদি:
 *       - UNSPLASH_ACCESS_KEY না থাকে (feature নীরবে disabled)
 *       - Network / API failure
 *       - Query-তে কোনো result না পাওয়া
 *     ঐ ক্ষেত্রে caller image=null দিয়ে blog post লেখে — frontend cover
 *     ছাড়াই post ঠিকঠাক render করে।
 *
 *     Unsplash API ToS-অনুযায়ী আমরা photo-র `download_location` endpoint
 *     fire করতে বাধ্য — URL select হওয়ার পর fire-and-forget।
 */

const UNSPLASH_SEARCH = 'https://api.unsplash.com/search/photos';
const UTM_PARAMS = 'utm_source=inochi_education&utm_medium=referral';

// EN: Sanitise the query — strip newlines/quotes, cap length, lowercase.
//     Bad queries produce empty results; defensive trimming is cheaper
//     than re-running the whole AI generation.
// BN: query sanitise — newline/quote remove, length cap, lowercase। খারাপ
//     query empty result দেয়; পুরো AI generation re-run-এর চেয়ে
//     defensive trim সস্তা।
function cleanQuery(raw) {
  return String(raw || '')
    .replace(/["\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .toLowerCase();
}

// EN: Build photographer attribution required by Unsplash API guidelines.
//     `link` opens the photographer's Unsplash profile with our UTM tag so
//     they can see clicks from us in their analytics (good citizenship +
//     keeps our API access in good standing).
// BN: Unsplash API guideline অনুযায়ী photographer attribution। `link`
//     আমাদের UTM tag-সহ photographer-এর Unsplash profile খোলে — তারা
//     analytics-এ আমাদের traffic দেখে (ভাল practice + API access
//     good standing-এ রাখে)।
function shapePhoto(p) {
  if (!p || !p.urls) return null;
  // EN: `regular` is 1080px wide JPG — enough for our 1200x630 hero crop
  //     and ~150KB so blog list pages stay snappy.
  // BN: `regular` 1080px wide JPG — আমাদের 1200x630 hero crop-এর জন্য
  //     যথেষ্ট ও ~150KB, blog list page snappy থাকে।
  const url = p.urls.regular || p.urls.full || p.urls.small;
  if (!url) return null;
  const user = p.user || {};
  const username = user.username || 'unsplash';
  return {
    url,
    public_id: `unsplash-${p.id}`,
    alt: p.alt_description || p.description || '',
    credit: {
      name: user.name || 'Unsplash contributor',
      link: `https://unsplash.com/@${username}?${UTM_PARAMS}`,
      source: 'Unsplash',
      sourceLink: `https://unsplash.com/?${UTM_PARAMS}`,
    },
    // EN: Kept for the required download tracking ping; not displayed.
    // BN: Required download tracking ping-এর জন্য রাখা; দেখানো হয় না।
    _downloadLocation: p.links?.download_location || null,
  };
}

async function fetchUnsplashPhoto(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return { ok: false, error: 'UNSPLASH_ACCESS_KEY missing', photo: null };

  const q = cleanQuery(query);
  if (!q) return { ok: false, error: 'empty query', photo: null };

  try {
    const url = `${UNSPLASH_SEARCH}?per_page=5&orientation=landscape&content_filter=high&query=${encodeURIComponent(q)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        'Accept-Version': 'v1',
        Authorization: `Client-ID ${key}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, error: `Unsplash ${res.status}: ${txt.slice(0, 200)}`, photo: null };
    }
    const data = await res.json();
    const first = Array.isArray(data?.results) ? data.results[0] : null;
    const photo = shapePhoto(first);
    if (!photo) return { ok: false, error: `no results for "${q}"`, photo: null };

    // EN: Required by Unsplash ToS — track that we used this photo.
    //     Fire-and-forget; failure does not affect post publish.
    // BN: Unsplash ToS-অনুযায়ী এটা required — আমরা photo ব্যবহার করেছি
    //     সেটা track করতে হবে। Fire-and-forget; failure publish আটকায় না।
    if (photo._downloadLocation) {
      fetch(photo._downloadLocation, {
        headers: { Authorization: `Client-ID ${key}` },
      }).catch(() => {});
    }
    delete photo._downloadLocation;

    return { ok: true, photo, error: null };
  } catch (err) {
    return { ok: false, error: `Unsplash request failed: ${err.message || err}`, photo: null };
  }
}

module.exports = { fetchUnsplashPhoto, cleanQuery };
