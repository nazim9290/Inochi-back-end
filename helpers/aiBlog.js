/**
 * EN: DeepSeek-powered trilingual blog generator. Given a topic brief, asks
 *     DeepSeek to return a structured JSON document with Bangla (primary),
 *     English, and Japanese title/content/excerpt/category/keywords/tags
 *     in one call so the three locales stay editorially consistent.
 *
 *     Returns null on any failure (network, parse, missing key) — caller
 *     decides how to log it. Never throws; the scheduler must keep running.
 * BN: DeepSeek-চালিত trilingual blog generator। Topic brief দিলে DeepSeek-কে
 *     একটি structured JSON document return করতে বলে — Bangla (primary),
 *     English, Japanese title/content/excerpt/category/keywords/tags সব
 *     একটি call-এ, যাতে তিনটি locale editorially consistent থাকে।
 *
 *     যেকোনো failure-এ null return (network, parse, missing key)। Caller
 *     log করার সিদ্ধান্ত নেয়। কখনো throw করে না — scheduler চালিয়ে যেতে হবে।
 */

const slugify = require('slugify');

// EN: Topic category pool — DeepSeek picks one when admin queue is empty.
//     Keep it tight to brand: Japan-study, JLPT, visa, life-in-Japan, careers.
// BN: Topic category pool — admin queue খালি হলে DeepSeek একটি বেছে নেয়।
//     Brand-tight: জাপান-study, JLPT, visa, জাপানে জীবন, career।
const CATEGORY_POOL = [
  'JLPT preparation',
  'Japanese language learning',
  'Study in Japan',
  'Japan student visa',
  'Scholarships in Japan',
  'Life in Japan for Bangladeshi students',
  'Part-time work in Japan',
  'Career after graduation in Japan',
  'Japanese culture and etiquette',
  'Cost of living in Japan',
  'Choosing a Japanese language school',
  'Bangladeshi community in Japan',
];

// EN: Fallback topic ideas the AI can pick when no admin queue topic exists.
//     Mixed across the categories above so the auto-pilot stays varied.
// BN: Admin queue topic না থাকলে AI যেসব fallback topic থেকে বেছে নিতে পারে।
//     উপরের category-গুলোর মধ্যে mix — auto-pilot variety রাখে।
const TOPIC_FALLBACK_POOL = [
  'JLPT N5 30-day study plan for working professionals',
  'How to write a Statement of Purpose for Japanese language school',
  'Top 5 mistakes Bangladeshi students make in Japan student visa interview',
  'Monthly budget breakdown for a Bangladeshi student in Tokyo',
  'Difference between MEXT and JASSO scholarships explained simply',
  'Part-time job hunting tips for first-year language students in Japan',
  'How to choose between Tokyo and Osaka as a study destination',
  'JLPT N3 grammar points that always confuse Bangla speakers',
  'Surviving the first month in Japan — apartment, SIM, bank, koban',
  'Specified Skilled Worker (SSW / Tokutei Ginou) vs Engineer visa — Bangladeshi perspective',
  'Onsen, garbage rules, train etiquette — daily life norms Bangladeshis miss',
  'How to verify a Japanese language school is legitimate before paying',
];

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// EN: Round-robin pick a fallback topic. Uses minutes-since-epoch as the
//     index so two calls in the same minute don't collide on the same topic.
// BN: Round-robin fallback topic বেছে নেয়। minutes-since-epoch ব্যবহার করে
//     index, যাতে একই minute-এ দুটি call একই topic-এ না লাগে।
function pickFallbackTopic() {
  const minutes = Math.floor(Date.now() / 60000);
  const idx = minutes % TOPIC_FALLBACK_POOL.length;
  return {
    topic: TOPIC_FALLBACK_POOL[idx],
    category: CATEGORY_POOL[idx % CATEGORY_POOL.length],
  };
}

function buildSystemPrompt() {
  return [
    'You are an SEO content writer for Inochi Global Education Institute, a Bangladesh-based agency that helps students go to Japan to study Japanese.',
    'Target audience: Bangladeshi students and their parents who are considering studying in Japan.',
    'Tone: warm, encouraging, practical, factually accurate. Avoid fluff.',
    'Always return a single valid JSON object — no Markdown fences, no commentary, no leading text.',
    'Every blog must include all three languages: Bangla (primary), English, and Japanese.',
    'HTML content must be valid semantic HTML using <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>, <a> only. No <script>, no inline styles, no <html>/<body> wrappers.',
    'Embed 2–4 internal links naturally pointing to: /eligibility, /scholarships, /jlpt-calendar, /universities, /pre-departure, /contact — but ONLY where genuinely relevant to the sentence.',
    'Aim for 700–1100 words in each language. Bangla and Japanese should be the same article re-written natively, not a literal word-for-word translation.',
  ].join(' ');
}

function buildUserPrompt({ topic, category, keywordsCsv }) {
  const cat = category || 'auto-pick from: JLPT, Japan study, scholarships, visa, life in Japan';
  const kw = keywordsCsv
    ? `Weave these keywords naturally where relevant: ${keywordsCsv}.`
    : 'Pick 5–8 long-tail SEO keywords yourself appropriate for Bangladeshi students researching Japan study.';
  return [
    `Topic brief: ${topic}.`,
    `Category guideline: ${cat}.`,
    kw,
    'Return exactly this JSON shape (all strings, no nulls — use empty string if truly unknown):',
    JSON.stringify(
      {
        title: 'Bangla title (max 100 chars, compelling, includes keyword)',
        titleEn: 'English title (max 100 chars)',
        titleJa: 'Japanese title (max 100 chars)',
        excerpt: 'Bangla excerpt (140–180 chars, plain text, no HTML)',
        excerptEn: 'English excerpt (140–180 chars, plain text, no HTML)',
        excerptJa: 'Japanese excerpt (140–180 chars, plain text, no HTML)',
        content: '<p>...</p> Bangla full HTML body (700–1100 words, valid semantic HTML)',
        contentEn: '<p>...</p> English full HTML body (700–1100 words)',
        contentJa: '<p>...</p> Japanese full HTML body (700–1100 words)',
        category: 'Bangla category label (1–3 words)',
        categoryEn: 'English category label (1–3 words)',
        categoryJa: 'Japanese category label (1–3 words)',
        metaKeywords: 'comma,separated,long-tail,seo,keywords',
        tags: { blogs: true, study: false, service: false },
      },
      null,
      2
    ),
    'Output ONLY the JSON object. No code fences. No prose before or after.',
  ].join('\n\n');
}

// EN: Extract the JSON object from a model response that may include code
//     fences or surrounding chatter. Defensive — we don't trust the LLM
//     to follow "no fences" instruction every time.
// BN: Model response থেকে JSON object বের করে — code fence বা আশেপাশের
//     chatter থাকতে পারে। Defensive — "no fences" instruction LLM সবসময়
//     follow করবে এমন আশা না করেই।
function extractJsonObject(text) {
  if (!text) return null;
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  // EN: Find the first { and last } as a coarse parse target.
  // BN: প্রথম { ও শেষ } খুঁজে coarse parse target বানাই।
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

// EN: Validate that the AI returned the expected shape with non-empty
//     Bangla title + content (the minimum to publish). Other locales
//     may be empty — renderer will fall back.
// BN: AI প্রত্যাশিত shape return করেছে এবং Bangla title + content non-empty
//     (publish-এর minimum)। অন্য locale খালি থাকলে renderer fallback দেয়।
function isValid(doc) {
  if (!doc || typeof doc !== 'object') return false;
  if (!doc.title || typeof doc.title !== 'string') return false;
  if (!doc.content || typeof doc.content !== 'string' || doc.content.length < 200) return false;
  return true;
}

function makeSlug(title) {
  // EN: slugify with `strict: true` so we drop everything except [a-z0-9-]
  //     and lowercase. Limit to 80 chars to fit common DB constraints +
  //     keep URLs scannable.
  // BN: `strict: true`-এ slugify — [a-z0-9-] ছাড়া বাকি drop, lowercase।
  //     80 char-এ limit — DB constraint + URL scannable রাখে।
  const base = slugify(String(title || '').slice(0, 120), { lower: true, strict: true, trim: true });
  if (!base) return `post-${Date.now()}`;
  return base.slice(0, 80);
}

async function callDeepSeek({ topic, category, keywordsCsv }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { ok: false, error: 'DEEPSEEK_API_KEY missing' };

  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt({ topic, category, keywordsCsv }) },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    // EN: Ask for JSON object response format where supported; ignored
    //     gracefully by older models.
    // BN: যেখানে support আছে JSON object response format চাই; পুরোনো
    //     model gracefully ignore করে।
    response_format: { type: 'json_object' },
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90 * 1000);
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, error: `DeepSeek ${res.status}: ${txt.slice(0, 300)}` };
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    const doc = extractJsonObject(text);
    if (!isValid(doc)) return { ok: false, error: 'AI returned invalid/empty JSON' };
    return { ok: true, doc };
  } catch (err) {
    return { ok: false, error: `DeepSeek request failed: ${err.message || err}` };
  }
}

module.exports = {
  CATEGORY_POOL,
  TOPIC_FALLBACK_POOL,
  pickFallbackTopic,
  callDeepSeek,
  makeSlug,
};
