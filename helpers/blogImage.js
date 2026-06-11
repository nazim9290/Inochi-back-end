/**
 * EN: AI cover-image generator for blog posts. Uses Pollinations.ai's free
 *     Flux endpoint (no API key required) to render a 1200x630 landscape
 *     image from an English prompt, then uploads the result to Cloudinary
 *     so we own the asset (Pollinations is a public service we shouldn't
 *     hot-link long-term). Saved shape matches the legacy
 *     {url, public_id, alt, credit} that the frontend already renders.
 *
 *     Failure modes are all silent — caller writes the blog post with
 *     image=null and the frontend renders fine without a cover.
 * BN: Blog post-এর AI cover-image generator। Pollinations.ai-র free Flux
 *     endpoint (কোনো API key লাগে না) দিয়ে English prompt থেকে 1200x630
 *     landscape image render, তারপর Cloudinary-তে upload — আমরা asset
 *     own করি (Pollinations public service, দীর্ঘমেয়াদে hot-link করা
 *     ঠিক না)। Saved shape legacy {url, public_id, alt, credit}-এর সাথে
 *     মিল — frontend আগের মতই render করে।
 *
 *     যেকোনো failure-এ silent — caller image=null দিয়ে blog লেখে,
 *     frontend cover ছাড়াই ঠিকঠাক render করে।
 */

const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

// EN: Module-level Cloudinary config — env vars are read at first import,
//     same pattern as controllers/userAuth.js so we don't double-configure.
// BN: Module-level Cloudinary config — env var প্রথম import-এ পড়া হয়,
//     controllers/userAuth.js-এর মতই pattern, double-configure এড়ায়।
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

// EN: Build a richer image prompt out of the AI's short keyword hint by
//     padding with style + composition guidance that suits a blog hero.
//     Photographic + brand-safe (no people in compromising poses, no
//     copyrighted logos), warm lighting, editorial style.
// BN: AI-র সংক্ষিপ্ত keyword hint-এর সাথে style + composition guidance
//     যোগ করে richer image prompt তৈরি। Blog hero-র উপযোগী — photographic,
//     brand-safe, warm lighting, editorial style।
function enrichPrompt(rawQuery) {
  const q = String(rawQuery || 'students studying Japanese in Tokyo').trim().slice(0, 200);
  return [
    q,
    'editorial photograph, natural lighting, warm tones, sharp focus',
    'no text, no watermark, no logos',
    'wide cinematic composition',
  ].join(', ');
}

// EN: Pollinations URL — public Flux endpoint. `seed` makes the output
//     deterministic for the same prompt+seed combo so re-runs reproduce.
//     `nologo=true` strips the small Pollinations badge.
// BN: Pollinations URL — public Flux endpoint। `seed` একই prompt+seed-এ
//     deterministic output দেয়, re-run-এ একই image। `nologo=true`
//     ছোট Pollinations badge সরায়।
function buildPollinationsUrl(prompt, seed, model = 'flux') {
  const params = new URLSearchParams({
    width: '1200',
    height: '630',
    seed: String(seed),
    nologo: 'true',
    model,
  });
  return `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?${params}`;
}

// EN: Pull image bytes from Pollinations. Generation can take 10-25 s
//     server-side; default 60 s abort so a slow gen doesn't block the whole
//     scheduler run (we retry across a few attempts, so per-attempt is short).
// BN: Pollinations থেকে image bytes pull। Server-side generation 10-25s
//     লাগতে পারে; default 60s abort — slow gen যাতে পুরো scheduler block না
//     করে (কয়েকবার retry করি বলে per-attempt ছোট রাখি)।
async function fetchImageBuffer(url, timeoutMs = 60 * 1000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } finally {
    clearTimeout(timer);
  }
}

// EN: Upload buffer to Cloudinary via the upload_stream API. Pinned under
//     a dedicated `inochi/ai-blog` folder so admins can audit / clear AI
//     assets independently of human-uploaded images.
// BN: Buffer Cloudinary-তে upload — upload_stream API। `inochi/ai-blog`
//     folder-এ pin — admin AI asset আলাদাভাবে audit / clear করতে পারে।
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
 * EN: Generate + upload a cover image. Returns {ok, photo, error}.
 *     `photo` shape: {url, public_id, alt, credit{name, source, sourceLink}}.
 * BN: Cover image generate + upload। Return {ok, photo, error}।
 *     `photo` shape: {url, public_id, alt, credit{name, source, sourceLink}}।
 */
async function generateCoverImage(rawQuery, seedSource) {
  // EN: Cloudinary keys are required to host the result; if any is missing
  //     bail out early so we don't burn a Pollinations generation just to
  //     fail at upload time.
  // BN: Result host করতে Cloudinary key required; কোনোটি missing থাকলে
  //     আগেই bail out — Pollinations generation burn করে upload-এ fail
  //     করার কোনো মানে নেই।
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return { ok: false, photo: null, error: 'Cloudinary credentials missing' };
  }

  const enriched = enrichPrompt(rawQuery);
  // EN: Stable seed from the prompt — same brief, same image. Avoids the
  //     auto-pilot accidentally producing identical hero images on
  //     consecutive days when the AI gives the same imageQuery twice.
  // BN: Prompt থেকে stable seed — একই brief, একই image। AI পরপর দু'দিন
  //     একই imageQuery দিলে accidentally একই hero image যাতে না আসে।
  const seed = parseInt(crypto.createHash('sha256').update(String(seedSource || enriched)).digest('hex').slice(0, 8), 16);

  // EN: Pollinations' free tier is flaky — it can 5xx, time out, or return a
  //     tiny HTML error page. A silent failure is exactly why recent posts
  //     shipped with no cover image. Retry across a couple of seeds and fall
  //     back to the faster `turbo` model before giving up.
  // BN: Pollinations-এর free tier অস্থির — 5xx, timeout, বা ছোট HTML error
  //     page দিতে পারে। এই silent failure-এর জন্যই সাম্প্রতিক পোস্টে cover
  //     image আসেনি। হাল ছাড়ার আগে কয়েকটি seed-এ retry + দ্রুততর `turbo`
  //     model-এ fall back করি।
  const attempts = [
    { model: 'flux', seed },
    { model: 'flux', seed: (seed + 101) >>> 0 },
    { model: 'turbo', seed },
  ];
  let buffer = null;
  let lastError = 'unknown';
  for (const attempt of attempts) {
    const polUrl = buildPollinationsUrl(enriched, attempt.seed, attempt.model);
    try {
      const buf = await fetchImageBuffer(polUrl);
      if (buf && buf.length >= 1000) {
        buffer = buf;
        break;
      }
      lastError = 'Pollinations returned empty/tiny image';
    } catch (err) {
      lastError = `Pollinations fetch failed (${attempt.model}): ${err.message || err}`;
    }
  }
  if (!buffer) {
    return { ok: false, photo: null, error: lastError };
  }

  const publicId = `${Date.now()}-${seed.toString(36)}`;
  let uploaded;
  try {
    uploaded = await uploadToCloudinary(buffer, publicId);
  } catch (err) {
    return { ok: false, photo: null, error: `Cloudinary upload failed: ${err.message || err}` };
  }

  return {
    ok: true,
    error: null,
    photo: {
      url: uploaded.secure_url,
      public_id: uploaded.public_id,
      alt: String(rawQuery || '').slice(0, 200),
      credit: {
        name: 'AI generated (Flux)',
        source: 'Pollinations.ai',
        sourceLink: 'https://pollinations.ai',
      },
    },
  };
}

module.exports = { generateCoverImage, enrichPrompt };
