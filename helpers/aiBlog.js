/**
 * EN: DeepSeek-powered trilingual blog generator. Given a topic brief, asks
 *     DeepSeek to return a structured JSON document with Bangla (primary),
 *     English, and Japanese title/content/excerpt/category/keywords/tags
 *     in one call so the three locales stay editorially consistent.
 *
 *     Topic supply (2026-08-23 rewrite — see blogScheduler.js for the
 *     orchestration):
 *       1. admin queue (BlogTopicQueue) — always first;
 *       2. the built-in themed pool below, minus EVERY brief/title already
 *          published (permanent ledger, not a 20-run window);
 *       3. when the pool is exhausted, `proposeTopic()` asks DeepSeek for a
 *          brand-new brief that is explicitly NOT a rephrase of anything
 *          covered so far.
 *     Every candidate is checked with helpers/blogSimilarity.js, so the
 *     auto-pilot can run for years without publishing the same article
 *     twice.
 *
 *     Returns null / {ok:false} on any failure (network, parse, missing
 *     key) — caller decides how to log it. Never throws; the scheduler
 *     must keep running.
 * BN: DeepSeek-চালিত trilingual blog generator। Topic brief দিলে DeepSeek-কে
 *     একটি structured JSON document return করতে বলে — Bangla (primary),
 *     English, Japanese title/content/excerpt/category/keywords/tags সব
 *     একটি call-এ, যাতে তিনটি locale editorially consistent থাকে।
 *
 *     Topic supply (2026-08-23 rewrite — orchestration blogScheduler.js-এ):
 *       ১. admin queue (BlogTopicQueue) — সবসময় আগে;
 *       ২. নিচের built-in themed pool, তবে আগে publish হওয়া প্রতিটি
 *          brief/title বাদ (permanent ledger, ২০-run window নয়);
 *       ৩. pool শেষ হলে `proposeTopic()` DeepSeek-কে একদম নতুন brief দিতে
 *          বলে — যা এখন পর্যন্ত cover করা কিছুর rephrase নয়।
 *     প্রতিটি candidate helpers/blogSimilarity.js দিয়ে যাচাই হয় — তাই
 *     auto-pilot বছরের পর বছর চললেও একই লেখা দুবার publish হবে না।
 *
 *     যেকোনো failure-এ null / {ok:false} (network, parse, missing key)।
 *     Caller log করার সিদ্ধান্ত নেয়। কখনো throw করে না — scheduler চালিয়ে
 *     যেতে হবে।
 */

const slugify = require('slugify');
const { isNearDuplicate, nearestMatch } = require('./blogSimilarity');

// EN: Three editorial themes the auto-pilot rotates through so the daily
//     posts stay varied and on-brand. Each theme bundles its own category
//     labels + concrete topic ideas. The pools are deliberately large
//     (~20 each) AND every brief is single-use: once a brief has produced a
//     published post it is never picked again (see pickFallbackTopic).
// BN: তিনটি editorial theme — auto-pilot ঘুরে ঘুরে এগুলো থেকে বেছে নেয়, যাতে
//     প্রতিদিনের পোস্ট বৈচিত্র্যময় ও brand-এর সাথে মানানসই থাকে। Pool ইচ্ছা
//     করেই বড় (~২০টি করে) এবং প্রতিটি brief একবারই ব্যবহারযোগ্য: একবার
//     published post হয়ে গেলে আর কখনো বাছা হয় না (pickFallbackTopic দেখুন)।
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
      'Hiragana and katakana in 14 days: a daily drill plan for absolute beginners',
      'JLPT N4 listening section: why Bangladeshi candidates lose marks and how to fix it',
      'Kanji for N5: the 100 characters to learn first and the order that makes them stick',
      'NAT-TEST vs JLPT: which Japanese test to sit if you missed the July/December date',
      'JFT-Basic explained: format, score, booking at Prometric Dhaka and who needs it',
      'April vs October intake for Japanese language schools: which fits an HSC graduate',
      'How Japanese language schools interview applicants on Skype — and how to prepare',
      'Choosing a language school city: Tokyo, Saitama, Osaka, Fukuoka compared for cost and jobs',
      'The sponsor file: bank statement, income proof and tax papers Japanese immigration actually checks',
      'Study gap and age: how to explain a 3-year gap in a Japan student visa application',
      'From N5 to N2 in two years: a realistic month-by-month progress map',
      'Japanese particles は・が・を・に・で for Bangla speakers — a sentence-pattern approach',
      'What happens in the first week at a Japanese language school: placement test, orientation, rules',
      'Reapplying after a COE refusal: what to change and when the next intake is',
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
      'Winter in Japan for someone who has never seen snow: clothes, heating bills, health',
      'Japanese konbini culture: how convenience stores become a student’s kitchen, bank and post office',
      'Earthquakes and typhoons: what every Bangladeshi student should prepare in the first week',
      'Saitama vs Tokyo: why so many Bangladeshi students choose Warabi, Toda and Kawaguchi',
      'Japanese health insurance for students: what ¥2,000 a month actually covers',
      'Cycling, trains and IC cards: getting around a Japanese city on a student budget',
      'Sending money home from Japan legally: Wise, SBI Remit and why hundi risks your visa',
      'Making Japanese friends as a shy international student: clubs, language exchange, part-time work',
      'Cherry blossoms to autumn leaves: the Japanese seasons a Bangladeshi student experiences',
      'Japan’s 100-yen shops, second-hand stores and student discounts: furnishing a room for ¥20,000',
      'What a Japanese landlord expects: noise, garbage day, guarantor and the deposit you get back',
      'Eid in Tokyo: where Bangladeshi students pray, eat and celebrate together',
      'Night shifts at a konbini: the honest pros and cons for a first-year language student',
      'Cooking Bangladeshi food in Japan: where to buy rice, fish and spices without overpaying',
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
      'EJU explained: the exam that opens Japanese universities to Bangladeshi students',
      'English-taught degrees in Japan: APU, Waseda SILS, Sophia FLA and what they ask for',
      'Nursing and caregiving in Japan: EPA, SSW and the path for Bangladeshi nursing graduates',
      'IT careers in Japan for Bangladeshi CSE graduates: visas, salaries, Japanese level',
      'How Japanese companies hire international graduates: shukatsu, entry sheets and interviews',
      'Senmon gakko for IT, hospitality and automotive: what a 2-year diploma really leads to',
      'Permanent residency in Japan: the 10-year path versus the Highly Skilled Professional points',
      'Japan vs Canada vs UK for a Bangladeshi family: total cost, work rights and settlement compared',
      'Bringing your spouse to Japan: which visas allow dependents and what income they require',
      'School scholarships and tuition waivers at Japanese language schools: how attendance earns money',
      'Master’s in Japan for Bangladeshi engineers: finding a professor, MEXT and lab culture',
      'Returning to Bangladesh after Japan: how Japanese experience is valued by employers at home',
      'Specified Skilled Worker in caregiving: tests, salary and the honest daily reality',
      'Changing from a student visa to a work visa in Japan: documents, timing and common refusals',
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

// EN: Guide hub pages the generator should link to — the strongest
//     internal-link targets on the site for each theme.
// BN: Generator যে guide hub page-গুলোতে link দেবে — প্রতিটি theme-এর জন্য
//     site-এর সবচেয়ে শক্ত internal-link target।
const GUIDE_LINKS = {
  'study-in-japan': [
    '/guides/study-in-japan-from-bangladesh',
    '/guides/japan-student-visa-requirements-from-bangladesh',
    '/guides/jlpt-guide-for-bangladeshi-students',
    '/guides/coe-certificate-of-eligibility-japan',
    '/guides/japanese-language-course-in-dhaka',
  ],
  'why-japan': [
    '/guides/living-in-japan-guide-for-bangladeshi-students',
    '/guides/part-time-jobs-in-japan-for-bangladeshi-students',
    '/guides/cost-of-studying-in-japan-from-bangladesh',
    '/japan-cities',
  ],
  'higher-study': [
    '/guides/japanese-language-school-vs-university-in-japan',
    '/guides/student-visa-vs-ssw-vs-work-visa-japan',
    '/guides/study-in-japan-after-hsc',
    '/scholarships',
  ],
};

function themeForSlot(slotIndex = 0) {
  const days = Math.floor(Date.now() / 86400000);
  return TOPIC_THEMES[(days + slotIndex) % TOPIC_THEMES.length];
}

/**
 * EN: Pick a NEVER-USED pool topic for a slot of the day (0 = first post,
 *     1 = second…). `avoidTopics` is the permanent ledger: every brief that
 *     already produced a post plus every existing blog title. A candidate
 *     is rejected if it is an exact match OR a near-duplicate (Jaccard ≥
 *     0.5) of anything in the ledger. Starts in the slot's theme and
 *     probes the other themes before giving up. Returns `null` when the
 *     whole pool is exhausted — the caller then asks proposeTopic().
 *
 *     History: the first version indexed by minutes-since-epoch (aliasing
 *     → same topic daily); the second advanced by day but only avoided the
 *     last 20 runs, so with 24 topics and 2 posts/day every brief came
 *     back every ~12 days (145 posts = 24 briefs × ~6). A permanent ledger
 *     is the only fix that cannot regress.
 * BN: দিনের একটি slot-এর জন্য (0 = প্রথম পোস্ট, 1 = দ্বিতীয়…) কখনো-ব্যবহার-
 *     না-হওয়া pool topic বাছে। `avoidTopics` = permanent ledger: যে brief
 *     আগে post তৈরি করেছে + সব বিদ্যমান blog title। Exact match বা
 *     near-duplicate (Jaccard ≥ 0.5) হলে candidate বাদ। Slot-এর theme থেকে
 *     শুরু, তারপর অন্য theme probe করে; পুরো pool শেষ হলে `null` — caller
 *     তখন proposeTopic() ডাকে।
 *
 *     ইতিহাস: প্রথম version minutes-since-epoch দিয়ে index করত (aliasing →
 *     প্রতিদিন একই topic); দ্বিতীয়টা দিন ধরে এগোত কিন্তু শুধু শেষ ২০টি run
 *     এড়াত — ২৪টি topic আর দিনে ২ পোস্টে প্রতিটি brief ~১২ দিনে ফিরে আসত
 *     (১৪৫ পোস্ট = ২৪ brief × ~৬)। Permanent ledger-ই একমাত্র fix যা আর
 *     পিছিয়ে যেতে পারে না।
 */
function pickFallbackTopic(slotIndex = 0, avoidTopics = []) {
  const days = Math.floor(Date.now() / 86400000);
  const avoid = (Array.isArray(avoidTopics) ? avoidTopics : [])
    .map((t) => String(t || '').trim())
    .filter(Boolean);
  const startTheme = (days + slotIndex) % TOPIC_THEMES.length;

  for (let t = 0; t < TOPIC_THEMES.length; t++) {
    const theme = TOPIC_THEMES[(startTheme + t) % TOPIC_THEMES.length];
    const start = (days * 3 + slotIndex) % theme.topics.length;
    for (let i = 0; i < theme.topics.length; i++) {
      const cand = theme.topics[(start + i) % theme.topics.length];
      if (!isNearDuplicate(cand, avoid)) {
        // EN: No fixed category — the model picks the best fit from this
        //     theme's list (see buildUserPrompt). The old date-rotated pick
        //     labelled a hiragana post "Japan student visa".
        // BN: Fixed category নেই — model এই theme-এর list থেকে সবচেয়ে মানানসই
        //     বাছে (buildUserPrompt দেখুন)। আগের date-rotated pick hiragana
        //     post-এ "Japan student visa" label বসাত।
        return { topic: cand, category: '', theme: theme.key };
      }
    }
  }
  return null;
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
    'Embed 2–4 internal links naturally using relative paths from this list ONLY where genuinely relevant: the guide pages given in the user prompt, plus /eligibility, /scholarships, /jlpt-calendar, /universities, /pre-departure, /fees, /contact.',
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

function buildUserPrompt({ topic, category, keywordsCsv, theme, avoidTitles }) {
  const themeDef = TOPIC_THEMES.find((t) => t.key === theme) || TOPIC_THEMES[0];
  const cat =
    category || `choose the single best fit for this topic from: ${themeDef.categories.join(', ')}`;
  const kw = keywordsCsv
    ? `Weave these keywords naturally where relevant: ${keywordsCsv}.`
    : 'Pick 5–8 long-tail SEO keywords yourself appropriate for Bangladeshi students researching Japan study.';
  const links = (GUIDE_LINKS[theme] || GUIDE_LINKS['study-in-japan']).join(', ');
  const avoid =
    Array.isArray(avoidTitles) && avoidTitles.length
      ? `IMPORTANT — these articles ALREADY EXIST on our blog. Your title, angle and structure must be clearly different from every one of them (no rephrasing): ${avoidTitles
          .slice(0, 12)
          .map((t) => `"${t}"`)
          .join('; ')}.`
      : '';
  return [
    `Topic brief: ${topic}.`,
    THEME_ANGLE[theme] || '',
    `Category guideline: ${cat}.`,
    kw,
    `Relevant guide pages to link to (relative paths): ${links}.`,
    avoid,
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
        // BN: cover image search-এর জন্য ২-৪টা সংক্ষিপ্ত English keyword —
        //     post-এর mood-এর সাথে মিল রেখে concrete visual।
        imageQuery: 'tokyo students study',
        tags: { blogs: true, study: false, service: false },
      },
      null,
      2
    ),
    'Output ONLY the JSON object. No code fences. No prose before or after.',
  ]
    .filter(Boolean)
    .join('\n\n');
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

// EN: Shared low-level DeepSeek chat call. Returns { ok, text } or
//     { ok:false, error }. 90 s timeout; never throws.
// BN: Shared low-level DeepSeek chat call। { ok, text } বা { ok:false, error }
//     দেয়। ৯০ সেকেন্ড timeout; কখনো throw করে না।
async function chat(messages, { temperature = 0.8, maxTokens = 8000 } = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { ok: false, error: 'DEEPSEEK_API_KEY missing' };
  const body = {
    model: DEEPSEEK_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90 * 1000);
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, error: `DeepSeek ${res.status}: ${txt.slice(0, 300)}` };
    }
    const json = await res.json();
    return { ok: true, text: json?.choices?.[0]?.message?.content || '' };
  } catch (err) {
    return { ok: false, error: `DeepSeek request failed: ${err.message || err}` };
  }
}

/**
 * EN: Generate the trilingual article. `avoidTitles` (optional) lists
 *     existing titles the new post must differ from — used on the retry
 *     after the scheduler's duplicate-title gate rejects a draft.
 * BN: Trilingual article generate। `avoidTitles` (optional) = বিদ্যমান title
 *     যেগুলো থেকে নতুন post আলাদা হতে হবে — scheduler-এর duplicate-title gate
 *     draft reject করার পর retry-তে ব্যবহার।
 */
async function callDeepSeek({ topic, category, keywordsCsv, theme, avoidTitles }) {
  // EN: 0.8 adds a little more variety in phrasing across days. max_tokens
  //     8000 — three 800–1200 word articles + JSON overflowed 4000 and
  //     truncated the response, which broke JSON.parse.
  // BN: 0.8 শব্দচয়নে একটু বেশি বৈচিত্র্য দেয়। max_tokens 8000 — তিনটি
  //     800–1200 শব্দের লেখা + JSON 4000 ছাড়িয়ে truncate করত, JSON.parse ভাঙত।
  const r = await chat(
    [
      { role: 'system', content: buildSystemPrompt() },
      {
        role: 'user',
        content: buildUserPrompt({ topic, category, keywordsCsv, theme, avoidTitles }),
      },
    ],
    { temperature: 0.8, maxTokens: 8000 }
  );
  if (!r.ok) return r;
  const doc = extractJsonObject(r.text);
  if (!isValid(doc)) return { ok: false, error: 'AI returned invalid/empty JSON' };
  return { ok: true, doc };
}

/**
 * EN: Ask DeepSeek for ONE brand-new topic brief in a theme that is not a
 *     rephrase of anything in `covered` (briefs + titles already on the
 *     blog). Used only when the built-in pool is exhausted. The result is
 *     re-checked with isNearDuplicate by the caller — the model's promise
 *     is not trusted.
 * BN: DeepSeek-কে একটি theme-এ একদম নতুন topic brief দিতে বলে — যা `covered`
 *     (blog-এ থাকা brief + title)-এর কোনোটার rephrase নয়। শুধু built-in
 *     pool শেষ হলে ব্যবহার। Caller isNearDuplicate দিয়ে আবার যাচাই করে —
 *     model-এর প্রতিশ্রুতিতে ভরসা নেই।
 */
async function proposeTopic({ themeKey, covered = [], excludeHint = '' }) {
  const theme = TOPIC_THEMES.find((t) => t.key === themeKey) || TOPIC_THEMES[0];
  const coveredList = covered
    .slice(-150)
    .map((t) => `- ${t}`)
    .join('\n');
  const messages = [
    {
      role: 'system',
      content:
        'You are the content strategist for Inochi Global Education Institute, a Bangladeshi institute that sends students to Japan. You plan blog topics for Bangladeshi students and parents researching study, work and life in Japan. Return only a JSON object.',
    },
    {
      role: 'user',
      content: [
        `Theme: ${theme.label} (${theme.key}). ${THEME_ANGLE[theme.key] || ''}`,
        `Category options: ${theme.categories.join('; ')}.`,
        'Propose ONE new, specific, search-worthy blog topic for this theme that a Bangladeshi student would actually google — concrete (a named exam, a city, a visa step, a cost, a season, a job type, a mistake), not a vague overview.',
        `It must NOT be a rephrase, subset or superset of ANY topic already covered below. Pick a genuinely different subject.${excludeHint ? ` ${excludeHint}` : ''}`,
        'Already covered:',
        coveredList || '- (none yet)',
        'Return exactly: {"topic": "one-line brief, max 140 chars", "category": "one of the category options", "keywords": "comma,separated,long-tail,keywords"}',
      ].join('\n\n'),
    },
  ];
  const r = await chat(messages, { temperature: 1.0, maxTokens: 400 });
  if (!r.ok) return r;
  const doc = extractJsonObject(r.text);
  const topic = String(doc?.topic || '').trim();
  if (!topic || topic.length < 15)
    return { ok: false, error: 'AI proposed an empty/too-short topic' };
  return {
    ok: true,
    topic: topic.slice(0, 200),
    category: String(doc?.category || theme.categories[0]).slice(0, 80),
    keywordsCsv: String(doc?.keywords || '').slice(0, 500),
    theme: theme.key,
  };
}

module.exports = {
  TOPIC_THEMES,
  CATEGORY_POOL,
  TOPIC_FALLBACK_POOL,
  GUIDE_LINKS,
  themeForSlot,
  pickFallbackTopic,
  proposeTopic,
  callDeepSeek,
  makeSlug,
  // EN: Re-exported so tests and the scheduler share one similarity rule.
  // BN: Test আর scheduler যাতে একই similarity rule share করে — re-export।
  isNearDuplicate,
  nearestMatch,
};
