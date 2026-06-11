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

// EN: Three editorial themes the auto-pilot rotates through so the daily
//     posts stay varied and on-brand. Each theme bundles its own category
//     labels + concrete topic ideas. When the admin queue is empty the
//     scheduler asks pickFallbackTopic() for the next theme in rotation.
//       1. study-in-japan — JLPT, schools, visa, documents: the nuts and
//          bolts of actually getting to + studying in Japan.
//       2. why-japan      — what makes Japan worth choosing: safety, culture,
//          technology, work ethic, quality of life, scenery, daily life.
//       3. higher-study   — higher / further study abroad for Bangladeshi
//          students, with Japan framed as the smart, affordable option.
// BN: তিনটি editorial theme — auto-pilot ঘুরে ঘুরে এগুলো থেকে বেছে নেয়, যাতে
//     প্রতিদিনের পোস্ট বৈচিত্র্যময় ও brand-এর সাথে মানানসই থাকে। প্রতিটি
//     theme-এ নিজস্ব category label + concrete topic idea। admin queue খালি
//     হলে scheduler pickFallbackTopic()-কে rotation-এর পরের theme দিতে বলে।
//       ১. study-in-japan — JLPT, school, visa, document: জাপানে পড়তে যাওয়ার
//          আসল খুঁটিনাটি।
//       ২. why-japan      — জাপান কেন বেছে নেবেন: নিরাপত্তা, সংস্কৃতি, প্রযুক্তি,
//          কাজের পরিবেশ, জীবনমান, সৌন্দর্য, দৈনন্দিন জীবন।
//       ৩. higher-study   — বাংলাদেশি শিক্ষার্থীদের বিদেশে উচ্চশিক্ষা, জাপানকে
//          smart ও সাশ্রয়ী option হিসেবে।
const TOPIC_THEMES = [
  {
    key: 'study-in-japan',
    label: 'Study in Japan',
    categories: [
      'JLPT preparation',
      'Japanese language learning',
      'Study in Japan',
      'Japan student visa',
      'Choosing a Japanese language school',
    ],
    topics: [
      'JLPT N5 30-day study plan for working professionals',
      'How to write a Statement of Purpose for a Japanese language school',
      'Top 5 mistakes Bangladeshi students make in the Japan student visa interview',
      'How to verify a Japanese language school is legitimate before paying',
      'JLPT N3 grammar points that always confuse Bangla speakers',
      'Document checklist for a Japan student visa from Bangladesh',
      'Language school vs vocational (senmon) school — how to choose',
      'COE (Certificate of Eligibility) explained step by step for Bangladeshi applicants',
    ],
  },
  {
    key: 'why-japan',
    label: 'Why Japan',
    categories: [
      'Life in Japan for Bangladeshi students',
      'Japanese culture and etiquette',
      'Part-time work in Japan',
      'Cost of living in Japan',
      'Bangladeshi community in Japan',
    ],
    topics: [
      'Why Japan is one of the safest countries for international students',
      'Part-time work in Japan: the 28-hour rule and realistic monthly earnings',
      'Monthly budget breakdown for a Bangladeshi student in Tokyo',
      'How to choose between Tokyo and Osaka as a study destination',
      'Surviving the first month in Japan — apartment, SIM, bank, koban',
      'Onsen, garbage rules, train etiquette — daily-life norms Bangladeshis miss',
      'Halal food, mosques and Ramadan as a Bangladeshi student in Japan',
      'What Japanese discipline and work culture teach a young student',
    ],
  },
  {
    key: 'higher-study',
    label: 'Higher study abroad',
    categories: [
      'Higher study abroad',
      'Scholarships in Japan',
      'Career after graduation in Japan',
      'Study abroad planning',
    ],
    topics: [
      'Higher study abroad for Bangladeshi students: why Japan wins on cost',
      'Difference between MEXT and JASSO scholarships explained simply',
      'From language school to a Japanese university: the realistic pathway',
      'SSW (Tokutei Ginou) vs Engineer visa — a Bangladeshi perspective on careers',
      'How a Bangladeshi student can fund higher study in Japan without a rich sponsor',
      'Career and PR after graduating in Japan: what to plan for',
      'Diploma, bachelor or vocational in Japan — which route fits which student',
      'Study-abroad timeline: what a Bangladeshi HSC student should do 12 months out',
    ],
  },
];

// EN: Flattened views kept for backward compatibility with any seed importer
//     or caller that still expects the old flat arrays.
// BN: পুরোনো flat array আশা করা seed importer / caller-এর সাথে backward-
//     compatible রাখতে flatten করা view।
const CATEGORY_POOL = TOPIC_THEMES.flatMap((t) => t.categories);
const TOPIC_FALLBACK_POOL = TOPIC_THEMES.flatMap((t) => t.topics);

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// EN: Pick a fallback topic for a given slot of the day (0 = first post,
//     1 = second post, …) while AVOIDING anything used recently.
//     The theme rotates by (day + slot) so the two daily posts land on
//     DIFFERENT themes, and the rotation drifts across days so all three
//     themes get even coverage over time.
//
//     IMPORTANT — do NOT index the topic by minutes-since-epoch. The cron
//     fires at the same minute every day, so minutes advance by exactly
//     1440/day and `minutes % poolSize` lands on the SAME topic forever
//     whenever poolSize divides 1440 (it does for 8, 12, …). That aliasing
//     is what made the auto-pilot publish the same article every day.
//     Instead we advance by DAY (step coprime with the pool) and then
//     linear-probe past any topic in `avoidTopics` (recent run history),
//     guaranteeing a fresh angle even if timing/pool sizes change.
// BN: দিনের একটি slot-এর (0 = প্রথম পোস্ট, 1 = দ্বিতীয়) fallback topic বেছে
//     নেয়, সাম্প্রতিক ব্যবহৃত topic এড়িয়ে। theme ঘোরে (day + slot) দিয়ে — তাই
//     দিনের দুটি পোস্ট ভিন্ন theme-এ পড়ে, দিন বদলালে rotation সরে বলে তিনটি
//     theme-ই সমানভাবে কভার হয়।
//
//     গুরুত্বপূর্ণ — topic-কে minutes-since-epoch দিয়ে index করা যাবে না। cron
//     প্রতিদিন একই মিনিটে চলে, তাই minutes দিনে ঠিক 1440 বাড়ে আর poolSize
//     1440-কে ভাগ করলে (8, 12, … করে) `minutes % poolSize` চিরকাল একই
//     topic দেয়। এই aliasing-এর জন্যই প্রতিদিন একই লেখা publish হচ্ছিল।
//     তাই DAY দিয়ে এগোই (pool-এর সাথে coprime step) এবং `avoidTopics`
//     (সাম্প্রতিক run history)-এ থাকা topic পেরিয়ে linear-probe করি —
//     timing/pool size বদলালেও fresh angle নিশ্চিত।
function pickFallbackTopic(slotIndex = 0, avoidTopics = []) {
  const days = Math.floor(Date.now() / 86400000);
  const theme = TOPIC_THEMES[(days + slotIndex) % TOPIC_THEMES.length];
  const avoid = new Set(
    (Array.isArray(avoidTopics) ? avoidTopics : [])
      .map((t) => String(t || '').trim().toLowerCase())
      .filter(Boolean)
  );
  // EN: Day-advancing start (step 3 is coprime with the 8-topic pools, so
  //     every topic eventually gets used) then probe forward for the first
  //     topic not in the recent-history avoid set.
  // BN: দিন-অনুযায়ী start (step 3, ৮-টপিক pool-এর সাথে coprime, তাই সব topic
  //     একসময় ব্যবহার হয়) — তারপর forward probe করে recent-history-তে নেই
  //     এমন প্রথম topic নেয়।
  const start = (days * 3 + slotIndex) % theme.topics.length;
  let topic = theme.topics[start];
  for (let i = 0; i < theme.topics.length; i++) {
    const cand = theme.topics[(start + i) % theme.topics.length];
    if (!avoid.has(cand.toLowerCase())) {
      topic = cand;
      break;
    }
  }
  const category = theme.categories[(days + slotIndex) % theme.categories.length];
  return { topic, category, theme: theme.key };
}

function buildSystemPrompt() {
  return [
    'You are a senior education counsellor at Inochi Global Education Institute, a Bangladesh-based agency that helps students go to Japan to study. You have personally lived in Japan and guided hundreds of Bangladeshi students, so you write from real experience — not generic web copy.',
    'Target audience: Bangladeshi students (HSC / undergrad age) and their parents who are considering studying in Japan.',
    'Voice: warm, human and specific — like an experienced mentor talking to one student over tea. Use first person ("I often tell students…") and second person ("you\'ll notice…"). In English use natural contractions (you\'ll, it\'s, don\'t). In Bangla write the way an educated Bangladeshi mentor actually speaks — natural and conversational, with comfortable everyday loanwords (ভিসা, পার্টটাইম, ক্লাস) — NOT stiff translation-Bangla or over-Sanskritised words.',
    'Make it READ HUMAN, not AI: vary sentence length (mix short punchy lines with longer ones), open with a hook (a real scene, a surprising fact, or a direct question) instead of a dictionary definition, and include at least one concrete mini-anecdote or scenario with real specifics (yen amounts, ward / city names, train lines, school names, JLPT levels). Give at least one honest trade-off or caution — never make everything sound perfect.',
    'BANNED phrases — never use any of these: "In today\'s fast-paced world", "In conclusion", "Moreover", "Furthermore", "It is important to note", "delve", "tapestry", "navigate the complexities", "embark on a journey", "unlock", "in the realm of", "ever-evolving". End with a warm, practical nudge — not a summary paragraph.',
    'Be factually accurate and current. If a number can shift (fees, exchange rates, visa rules), say it is approximate and tell the reader to confirm. Never invent fake statistics, fake named student quotes, or fake scholarship guarantees.',
    'Always return a single valid JSON object — no Markdown fences, no commentary, no leading text.',
    'Every blog must include all three languages: Bangla (primary), English, and Japanese. Bangla and Japanese must be the article RE-WRITTEN NATIVELY in that language — same ideas, natural to a native reader — not a literal word-for-word translation.',
    'HTML content must be valid semantic HTML using <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>, <a> only. No <script>, no inline styles, no <html>/<body> wrappers. Structure each article well: a short hook intro paragraph, then 3–5 <h2> sections (with <h3> sub-points where useful), at least one <ul> list, and a closing nudge with a soft call to action.',
    'Embed 2–4 internal links naturally pointing to: /eligibility, /scholarships, /jlpt-calendar, /universities, /pre-departure, /contact — but ONLY where genuinely relevant to the sentence.',
    'Aim for 800–1200 words in each language.',
  ].join(' ');
}

// EN: One-line angle guidance per editorial theme, injected into the user
//     prompt so DeepSeek frames the article from the right perspective.
// BN: প্রতি theme-এ এক লাইনের angle guidance — user prompt-এ যোগ হয় যাতে
//     DeepSeek সঠিক দৃষ্টিকোণ থেকে লেখে।
const THEME_ANGLE = {
  'study-in-japan':
    'Angle: the practical how-to of studying in Japan (JLPT, schools, visa, documents). Give concrete steps the student can act on this week.',
  'why-japan':
    'Angle: why Japan is genuinely a great choice — safety, culture, technology, work ethic, quality of life, scenery, daily life. Sell the destination honestly with vivid, concrete detail while staying credible.',
  'higher-study':
    'Angle: higher study abroad for Bangladeshi students, positioning Japan as a smart, affordable route versus other destinations. Talk money, timeline and career outcomes realistically.',
};

function buildUserPrompt({ topic, category, keywordsCsv, theme }) {
  const cat = category || 'auto-pick from: JLPT, Japan study, scholarships, visa, life in Japan';
  const kw = keywordsCsv
    ? `Weave these keywords naturally where relevant: ${keywordsCsv}.`
    : 'Pick 5–8 long-tail SEO keywords yourself appropriate for Bangladeshi students researching Japan study.';
  return [
    `Topic brief: ${topic}.`,
    THEME_ANGLE[theme] || '',
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
        // EN: 2–4 short English keywords for the cover image search — concrete
        //     visuals (people / places / objects) that match the post's mood.
        //     Avoid abstract words ("knowledge", "future"). Example: "tokyo
        //     train station students", "kanji study desk", "japan visa stamp".
        // BN: cover image search-এর জন্য ২-৪টা সংক্ষিপ্ত English keyword —
        //     post-এর mood-এর সাথে মিল রেখে concrete visual (মানুষ / স্থান /
        //     বস্তু)। abstract শব্দ avoid। Example: "tokyo train station
        //     students", "kanji study desk", "japan visa stamp"।
        imageQuery: 'tokyo students study',
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

function makeSlug(...titleCandidates) {
  // EN: Slugify with `strict: true` (only [a-z0-9-], lowercase). Bangla /
  //     Japanese characters get stripped to nothing, so we try the English
  //     title first when available, then fall back to others. Last resort
  //     is a timestamped placeholder so we never insert an empty slug.
  // BN: `strict: true`-এ slugify (শুধু [a-z0-9-], lowercase)। Bangla /
  //     Japanese character সব strip হয়, তাই English title আগে try করি,
  //     না থাকলে অন্য candidate। সবগুলো খালি হলে timestamped placeholder —
  //     empty slug কখনো insert হয় না।
  for (const t of titleCandidates) {
    if (!t || typeof t !== 'string') continue;
    const base = slugify(t.slice(0, 120), { lower: true, strict: true, trim: true });
    if (base) return base.slice(0, 80);
  }
  return `post-${Date.now()}`;
}

async function callDeepSeek({ topic, category, keywordsCsv, theme }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { ok: false, error: 'DEEPSEEK_API_KEY missing' };

  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt({ topic, category, keywordsCsv, theme }) },
    ],
    // EN: 0.8 adds a little more variety in phrasing across days (we already
    //     vary the topic itself). max_tokens bumped to 8000 — three 800–1200
    //     word articles + JSON overflowed 4000 and truncated the response,
    //     which broke JSON.parse and forced silent fallbacks.
    // BN: 0.8 দিনে দিনে শব্দচয়নে একটু বেশি বৈচিত্র্য দেয় (topic নিজেই তো
    //     বদলাচ্ছে)। max_tokens 8000 — তিনটি 800–1200 শব্দের লেখা + JSON
    //     4000 ছাড়িয়ে response truncate করত, JSON.parse ভাঙত, silent
    //     fallback হত।
    temperature: 0.8,
    max_tokens: 8000,
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
