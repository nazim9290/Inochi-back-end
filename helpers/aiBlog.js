/**
 * EN: Anthropic-powered trilingual blog generator. Given a topic brief, asks
 *     Claude to return a structured JSON document with Bangla (primary),
 *     English, and Japanese title/content/excerpt/category/keywords/tags
 *     in one call so the three locales stay editorially consistent.
 *
 *     Topic supply (2026-08-23 rewrite — see blogScheduler.js for the
 *     orchestration):
 *       1. admin queue (BlogTopicQueue) — always first;
 *       2. the built-in themed pool below, minus EVERY brief/title already
 *          published (permanent ledger, not a 20-run window);
 *       3. when the pool is exhausted, `proposeTopic()` asks Claude for a
 *          brand-new brief that is explicitly NOT a rephrase of anything
 *          covered so far.
 *     Every candidate is checked with helpers/blogSimilarity.js, so the
 *     auto-pilot can run for years without publishing the same article
 *     twice.
 *
 *     Returns null / {ok:false} on any failure (network, parse, missing
 *     key) — caller decides how to log it. Never throws; the scheduler
 *     must keep running.
 * BN: Anthropic-চালিত trilingual blog generator। Topic brief দিলে Claude-কে
 *     একটি structured JSON document return করতে বলে — Bangla (primary),
 *     English, Japanese title/content/excerpt/category/keywords/tags সব
 *     একটি call-এ, যাতে তিনটি locale editorially consistent থাকে।
 *
 *     Topic supply (2026-08-23 rewrite — orchestration blogScheduler.js-এ):
 *       ১. admin queue (BlogTopicQueue) — সবসময় আগে;
 *       ২. নিচের built-in themed pool, তবে আগে publish হওয়া প্রতিটি
 *          brief/title বাদ (permanent ledger, ২০-run window নয়);
 *       ৩. pool শেষ হলে `proposeTopic()` Claude-কে একদম নতুন brief দিতে
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
      // EN: Briefs aimed at students still deciding WHETHER and WHERE to go
      //     abroad — the questions they actually type before "Japan" is in
      //     their head. Each answers the general question honestly and only
      //     then shows where Japan fits, so the post earns the broad search
      //     without reading as an advert.
      // BN: যারা এখনো ঠিক করেনি বিদেশে যাবে কি না, গেলে কোথায় — "জাপান" মাথায়
      //     আসার আগে তারা যা লেখে, সেই প্রশ্নগুলোর brief। প্রতিটা সাধারণ
      //     প্রশ্নটার সৎ উত্তর দেয়, তারপরই জাপান কোথায় বসে দেখায় — তাই broad
      //     search পায়, অথচ বিজ্ঞাপনের মতো পড়ে না।
      'Study abroad from Bangladesh after HSC: the six real routes compared (Japan, Malaysia, Canada, UK, Australia, Germany) by cost, IELTS and work rights',
      'Study abroad without IELTS: which countries and programmes genuinely accept Bangladeshi students, and what they ask for instead',
      'How much does it really cost to study abroad from Bangladesh? A line-by-line budget for five countries',
      'Can you study abroad with a low HSC GPA or a study gap? Honest options for Bangladeshi students',
      'Part-time work while studying abroad: legal hours, typical pay and living costs country by country',
      'Scholarships for Bangladeshi students abroad: the ones that actually pay out, and how early to apply',
      'Study-abroad agency or apply yourself? What a consultancy should and should not charge for in Bangladesh',
      'The student-visa interview: what embassies ask Bangladeshi applicants and the answers that fail',
      'Study abroad for the whole family: which student visas let you bring a spouse, and what income they demand',
      'Twelve months before you fly: a study-abroad checklist for a Bangladeshi HSC student and their parents',
    ],
  },
];

// EN: Words the "thinking about studying abroad" audience actually searches,
//     in both scripts. Injected into every prompt so posts carry them
//     naturally — this is the audience that has not chosen a country yet.
// BN: "বিদেশে পড়াশোনা ভাবছি" — এই মানুষগুলো আসলে যা লিখে খোঁজে, দুই লিপিতে।
//     প্রতিটা prompt-এ যায় যাতে post-এ স্বাভাবিকভাবে থাকে — এরাই সেই দল যারা
//     এখনো দেশ ঠিক করেনি।
const BROAD_INTENT_KEYWORDS = [
  'study abroad from Bangladesh',
  'higher study abroad after HSC',
  'study abroad without IELTS',
  'cheapest country to study abroad',
  'study abroad cost from Bangladesh',
  'student visa consultancy Bangladesh',
  'scholarship for Bangladeshi students',
  'study abroad with part-time job',
  'বিদেশে উচ্চশিক্ষা',
  'HSC-র পর বিদেশে পড়াশোনা',
  'কম খরচে বিদেশে পড়াশোনা',
  'IELTS ছাড়া বিদেশে পড়াশোনা',
  'বিদেশে পড়াশোনার খরচ',
  'স্টুডেন্ট ভিসা',
  'বিদেশে স্কলারশিপ',
];

// EN: Flattened views kept for backward compatibility with any seed importer
//     or caller that still expects the old flat arrays.
// BN: পুরোনো flat array আশা করা seed importer / caller-এর সাথে backward-
//     compatible রাখতে flatten করা view।
const CATEGORY_POOL = TOPIC_THEMES.flatMap((t) => t.categories);
const TOPIC_FALLBACK_POOL = TOPIC_THEMES.flatMap((t) => t.topics);

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-5-5';

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
    'Make it READ HUMAN, not AI: vary sentence length (mix short punchy lines with longer ones) and use real specifics (yen amounts, ward / city names, train lines, school names, JLPT levels). Weave at least one honest caution into the body — never make everything sound perfect — but do NOT give it its own section titled "An honest trade-off" / "An honest caution".',
    // EN: Every post used to open with the same scene ("Last year a student
    //     walked into my office… 'Sir, …'") and end with the same "What you
    //     can do this week" section — the per-post ARTICLE FORMAT in the user
    //     prompt now decides the opening and the structure instead.
    // BN: আগে প্রতিটা post একই দৃশ্য দিয়ে শুরু হত ("গত বছর এক student আমার
    //     অফিসে এল… 'Sir, …'") আর একই "What you can do this week" section-এ
    //     শেষ হত — এখন user prompt-এর post-প্রতি ARTICLE FORMAT-ই শুরু আর
    //     কাঠামো ঠিক করে।
    'Follow the ARTICLE FORMAT given in the user prompt exactly — it decides how the article opens and how it is structured. NEVER open with a student or parent visiting / calling / messaging the office, and never use the address "Sir". Do not reuse the stock section headings "What you can do this week", "An honest trade-off", "An honest word" or "Why Japan is worth it". A personal anecdote is optional, at most one short one, and never in the first paragraph unless the format asks for a story.',
    'BANNED phrases — never use any of these: "In today\'s fast-paced world", "In conclusion", "Moreover", "Furthermore", "It is important to note", "delve", "tapestry", "navigate the complexities", "embark on a journey", "unlock", "in the realm of", "ever-evolving". End with a warm, practical nudge — not a summary paragraph.',
    'Be factually accurate and current. If a number can shift (fees, exchange rates, visa rules), say it is approximate and tell the reader to confirm. Never invent fake statistics, fake named student quotes, or fake scholarship guarantees.',
    'Always return a single valid JSON object — no Markdown fences, no commentary, no leading text.',
    'Every blog must include all three languages: Bangla (primary), English, and Japanese. Bangla and Japanese must be the article RE-WRITTEN NATIVELY in that language — same ideas, natural to a native reader — not a literal word-for-word translation.',
    'HTML content must be valid semantic HTML using <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <a> only. No <script>, no inline styles, no <html>/<body> wrappers. Use the structure the ARTICLE FORMAT describes, with <h2> section headings written specifically for this topic (never generic headings), and end with the closing paragraph below.',
    'Embed 2–4 internal links naturally using relative paths from this list ONLY where genuinely relevant: the guide pages given in the user prompt, plus /eligibility, /scholarships, /jlpt-calendar, /universities, /pre-departure, /fees, /contact, the office page and the service page named in the user prompt.',
    // EN: Every post must end by saying, in plain words, WHO wrote it, WHERE
    //     they sit and WHAT they do — because search engines and AI answer
    //     engines lift entity facts from article text, and a post that never
    //     names the agency, an office or a service teaches them nothing about
    //     Inochi. The office rotates per post (chosen in the user prompt) so
    //     Dhaka, Narayanganj and Barishal each get named over time.
    // BN: প্রতিটা post-এর শেষে সাদা কথায় বলতে হবে কে লিখল, কোথায় বসে, কী করে
    //     — কারণ search engine আর AI answer engine লেখার ভেতর থেকেই entity-র
    //     তথ্য তোলে; যে post-এ agency, office বা service-এর নামই নেই, সেটা
    //     Inochi সম্পর্কে ওদের কিছু শেখায় না। Office post-প্রতি ঘোরে (user
    //     prompt-এ বাছা হয়) — ঢাকা, নারায়ণগঞ্জ, বরিশাল সবাই পালা করে নাম পায়।
    'CLOSING PARAGRAPH (mandatory, in all three languages, 2–3 sentences, natural not salesy): name "Inochi Global Education Institute" in full, mention the specific office given in the user prompt with its neighbourhood (linking its /branches/... page), and link the one service page given in the user prompt using natural anchor text that describes the service (never "click here"). Frame it as who is speaking, e.g. "I counsel students at our North Badda, Dhaka office…" — one honest offer of help, no superlatives like "best" or "No. 1".',
    'Aim for 800–1200 words in each language.',
  ].join(' ');
}

// EN: The three Bangladesh offices the closing paragraph rotates through,
//     and the four service pages it may link. Kept in sync by hand with
//     the frontend's BRANCHES / services routes — the backend cannot import
//     them.
// BN: Closing paragraph যে তিনটা বাংলাদেশ office-এ পালা করে ঘোরে, আর যে
//     চারটা service page link করতে পারে। Frontend-এর BRANCHES / services
//     route-এর সাথে হাতে মিলিয়ে রাখা — backend ওগুলো import করতে পারে না।
const OFFICES_FOR_CLOSING = [
  {
    slug: 'dhaka',
    label: 'Dhaka (North Badda, Pragati Sarani — 13 minutes from the Japan Embassy)',
  },
  { slug: 'narayanganj', label: 'Narayanganj (Chashara, College Road)' },
  { slug: 'barishal', label: 'Barishal (Nobogram Road, Muslim Para)' },
];

const SERVICE_FOR_THEME = {
  'study-in-japan': [
    '/services/study-in-japan',
    '/services/visa-coe-support',
    '/services/language-training',
  ],
  'why-japan': ['/services/post-arrival', '/services/study-in-japan'],
  'higher-study': ['/services/study-in-japan', '/services/visa-coe-support'],
};

// EN: Deterministic per day + slot, like themeForSlot, so the two daily
//     posts name different offices and the rotation is even over a week.
// BN: themeForSlot-এর মতো দিন + slot ধরে deterministic — দিনের দুটো post
//     আলাদা office-এর নাম নেয়, আর সপ্তাহ জুড়ে সমান ভাগে ঘোরে।
function officeForSlot(slotIndex = 0) {
  const days = Math.floor(Date.now() / 86400000);
  return OFFICES_FOR_CLOSING[(days + slotIndex) % OFFICES_FOR_CLOSING.length];
}

function serviceForSlot(theme, slotIndex = 0) {
  const list = SERVICE_FOR_THEME[theme] || SERVICE_FOR_THEME['study-in-japan'];
  const days = Math.floor(Date.now() / 86400000);
  return list[(days + slotIndex) % list.length];
}

// EN: One-line angle guidance per editorial theme, injected into the user
//     prompt so Claude frames the article from the right perspective.
// BN: প্রতি theme-এ এক লাইনের angle guidance — user prompt-এ যোগ হয় যাতে
//     Claude সঠিক দৃষ্টিকোণ থেকে লেখে।
const THEME_ANGLE = {
  'study-in-japan':
    'Angle: the practical how-to of studying in Japan (JLPT, schools, visa, documents). Give concrete steps the student can act on this week.',
  'why-japan':
    'Angle: why Japan is genuinely a great choice — safety, culture, technology, work ethic, quality of life, scenery, daily life. Sell the destination honestly with vivid, concrete detail while staying credible.',
  'higher-study':
    'Angle: higher study abroad for Bangladeshi students, positioning Japan as a smart, affordable route versus other destinations. Talk money, timeline and career outcomes realistically.',
};

// EN: One format per post, rotated by day, so consecutive posts read
//     differently: different opening move, different skeleton. Each entry
//     is a prompt instruction, not a template.
// BN: post-প্রতি একটা format, দিন ধরে ঘোরে — পরপর দুটো post আলাদা পড়ায়:
//     আলাদা শুরু, আলাদা কাঠামো। প্রতিটা entry prompt-এর নির্দেশ, template নয়।
const ARTICLE_FORMATS = [
  'STEP-BY-STEP GUIDE — open with a 2-sentence direct answer to the question the title asks (no story). Then a numbered <ol> of the steps, each step an <h3> with what to do, what it costs and how long it takes.',
  'FAQ — open with one short paragraph saying who this is for. Then 6–8 real questions students ask, each as an <h3> phrased exactly as a student would type it into Google, each answered in 2–4 sentences.',
  'MYTH vs FACT — open by stating the single most common myth about this topic in bold, then correct it. Then 4–5 more myths, each an <h2> "Myth: …" followed by the fact and the evidence.',
  'NUMBERS BREAKDOWN — open with the one headline number the reader most wants (a cost, a duration, a score) in the first sentence. Then break it down section by section with yen and taka figures, and say what makes it go up or down.',
  'MISTAKES TO AVOID — open with the single costliest mistake and what it cost someone (no office scene). Then 5–7 mistakes, each an <h2>, saying why it happens and how to avoid it.',
  'MONTH-BY-MONTH TIMELINE — open with the deadline that matters most. Then a timeline: each <h2> is a month or phase, listing what must be done in it and what happens if it slips.',
  'DAY-IN-THE-LIFE STORY — written in second person ("you"), set in Japan, not in an office. Open in the middle of a concrete moment (a train platform, a konbini shift, a classroom). Weave the practical facts into the story, with <h2> breaks for each part of the day or journey.',
  'SIDE-BY-SIDE COMPARISON — open with a one-paragraph verdict ("choose A if…, choose B if…"). Then compare the options criterion by criterion (cost, time, difficulty, future options), one <h2> per criterion.',
];

function formatForSlot(slotIndex = 0) {
  const days = Math.floor(Date.now() / 86400000);
  return ARTICLE_FORMATS[(days + slotIndex) % ARTICLE_FORMATS.length];
}

function buildUserPrompt({
  topic,
  category,
  keywordsCsv,
  theme,
  avoidTitles,
  recentOpenings,
  slotIndex = 0,
}) {
  const themeDef = TOPIC_THEMES.find((t) => t.key === theme) || TOPIC_THEMES[0];
  const office = officeForSlot(slotIndex);
  const service = serviceForSlot(theme, slotIndex);
  const cat =
    category || `choose the single best fit for this topic from: ${themeDef.categories.join(', ')}`;
  const kw = keywordsCsv
    ? `Weave these keywords naturally where relevant: ${keywordsCsv}.`
    : 'Pick 5–8 long-tail SEO keywords yourself appropriate for Bangladeshi students researching Japan study.';
  // EN: Two or three broad study-abroad phrases per post, rotated by day so
  //     the whole bank is covered across a fortnight without stuffing any one
  //     article.
  // BN: post-প্রতি দুই-তিনটা broad study-abroad phrase, দিন ধরে ঘোরে — কোনো
  //     একটা লেখায় গাদাগাদি না করে দু'সপ্তাহে পুরো bank ঘুরে আসে।
  const dayIdx = Math.floor(Date.now() / 86400000) + slotIndex;
  const broad = [0, 1, 2].map(
    (i) => BROAD_INTENT_KEYWORDS[(dayIdx * 3 + i) % BROAD_INTENT_KEYWORDS.length]
  );
  const broadKw = `Also work in, naturally and at most once each, these broader study-abroad phrases (they are what students who have not yet chosen a country search for): ${broad.join('; ')}. Use the Bangla ones in the Bangla version and the English ones in the English version.`;
  const links = (GUIDE_LINKS[theme] || GUIDE_LINKS['study-in-japan']).join(', ');
  const avoid =
    Array.isArray(avoidTitles) && avoidTitles.length
      ? `IMPORTANT — these articles ALREADY EXIST on our blog. Your title, angle and structure must be clearly different from every one of them (no rephrasing): ${avoidTitles
          .slice(0, 12)
          .map((t) => `"${t}"`)
          .join('; ')}.`
      : '';
  // EN: The first lines of our latest posts — so the model sees exactly
  //     which openings are already worn out.
  // BN: সাম্প্রতিক post-গুলোর প্রথম লাইন — model যেন দেখে কোন শুরু আগেই
  //     বহুবার হয়ে গেছে।
  const openings =
    Array.isArray(recentOpenings) && recentOpenings.length
      ? `Our latest posts opened like this — your opening must be completely different in form and content from every one of them:\n${recentOpenings
          .slice(0, 8)
          .map((o) => `- "${o}"`)
          .join('\n')}`
      : '';
  return [
    `Topic brief: ${topic}.`,
    THEME_ANGLE[theme] || '',
    `ARTICLE FORMAT for this post: ${formatForSlot(slotIndex)}`,
    openings,
    `Category guideline: ${cat}.`,
    kw,
    broadKw,
    `Relevant guide pages to link to (relative paths): ${links}.`,
    `Office to name in the closing paragraph: ${office.label} — its page is /branches/${office.slug}. Service page to link in the closing paragraph: ${service}.`,
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
        // EN: Was the literal example 'tokyo students study' — the model
        //     copied it into almost every post, so every cover was the same
        //     photo. Keep this a description, never a sample value.
        // BN: আগে এখানে হুবহু 'tokyo students study' ছিল — model প্রায় প্রতিটা
        //     post-এ সেটাই কপি করত, ফলে সব cover একই ছবি। এটা বর্ণনা থাকবে,
        //     কখনো নমুনা মান নয়।
        imageQuery:
          '2–4 English words naming ONE concrete, photographable subject specific to THIS article (a place, object or scene, e.g. a landmark, food, document, season, vehicle). Never generic words like students, study, university, education.',
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

// EN: Shared low-level Anthropic chat call. Returns { ok, text } or
//     { ok:false, error }. 240 s timeout; never throws.
// BN: Shared low-level Anthropic chat call। { ok, text } বা { ok:false, error }
//     দেয়। ২৪০ সেকেন্ড timeout; কখনো throw করে না।
async function chat(messages, { effort = 'medium', maxTokens = 16000 } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY missing' };
  // EN: Anthropic keeps the system prompt OUT of messages, unlike the
  //     OpenAI-shaped API this used before — so split it off here and leave
  //     every caller untouched.
  // BN: Anthropic-এ system আলাদা থাকে, messages-এর ভিতরে নয় (আগের
  //     OpenAI-ধাঁচের API-তে ভিতরেই ছিল) — তাই এখানেই আলাদা করে নিই,
  //     ডাকনেওয়ালা কোনো জায়গা বদলাতে হয় না।
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const turns = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  const body = {
    model: AI_MODEL,
    max_tokens: maxTokens,
    // EN: No `temperature` — Sonnet 5.5 rejects any non-default value with a
    //     400. Thinking runs by default and its tokens count against
    //     max_tokens, so `effort` is the knob that keeps it in budget.
    // BN: `temperature` নেই — Sonnet 5.5 default ছাড়া যেকোনো মানে 400 দেয়।
    //     Thinking নিজে থেকেই চলে আর max_tokens থেকেই খরচ হয়, তাই budget-এ
    //     রাখতে `effort` ব্যবহার।
    output_config: { effort },
    // EN: no response_format here; extractJsonObject already tolerates fences.
    // BN: এখানে response_format নেই; extractJsonObject ফেন্স এমনিতেই সামলায়।
    messages: turns.length ? turns : [{ role: 'user', content: '' }],
  };
  if (system) body.system = system + '\n\nReturn a single JSON object and nothing else.';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 240 * 1000);
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, error: `Anthropic ${res.status}: ${txt.slice(0, 300)}` };
    }
    const json = await res.json();
    if (json?.stop_reason === 'refusal' || json?.stop_reason === 'max_tokens') {
      return { ok: false, error: `Anthropic stopped early: ${json.stop_reason}` };
    }
    const text = Array.isArray(json?.content)
      ? json.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('')
      : '';
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: `Anthropic request failed: ${err.message || err}` };
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
async function generateArticle({
  topic,
  category,
  keywordsCsv,
  theme,
  avoidTitles,
  recentOpenings,
  slotIndex = 0,
}) {
  // EN: max_tokens 16000 — three 800–1200 word articles + JSON need ~8000,
  //     and thinking tokens come out of the same budget.
  // BN: max_tokens 16000 — তিনটি 800–1200 শব্দের লেখা + JSON-এ ~8000 লাগে,
  //     আর thinking-ও একই budget থেকে খরচ হয়।
  const r = await chat(
    [
      { role: 'system', content: buildSystemPrompt() },
      {
        role: 'user',
        content: buildUserPrompt({
          topic,
          category,
          keywordsCsv,
          theme,
          avoidTitles,
          recentOpenings,
          slotIndex,
        }),
      },
    ],
    { effort: 'medium', maxTokens: 16000 }
  );
  if (!r.ok) return r;
  const doc = extractJsonObject(r.text);
  if (!isValid(doc)) return { ok: false, error: 'AI returned invalid/empty JSON' };
  return { ok: true, doc };
}

/**
 * EN: Ask Claude for ONE brand-new topic brief in a theme that is not a
 *     rephrase of anything in `covered` (briefs + titles already on the
 *     blog). Used only when the built-in pool is exhausted. The result is
 *     re-checked with isNearDuplicate by the caller — the model's promise
 *     is not trusted.
 * BN: Claude-কে একটি theme-এ একদম নতুন topic brief দিতে বলে — যা `covered`
 *     (blog-এ থাকা brief + title)-এর কোনোটার rephrase নয়। শুধু built-in
 *     pool শেষ হলে ব্যবহার। Caller isNearDuplicate দিয়ে আবার যাচাই করে —
 *     model-এর প্রতিশ্রুতিতে ভরসা নেই।
 */
// EN: Subject areas the blog has barely touched. Three random ones are
//     suggested per proposal so the model stops circling back to JLPT /
//     visa / intake, which it did when left to pick freely.
// BN: যে বিষয়গুলোতে blog প্রায় লেখেইনি। প্রতি প্রস্তাবে random তিনটা সাজেস্ট
//     করা হয়, যাতে model বারবার JLPT / ভিসা / intake-এ ফিরে না যায় — নিজে
//     বাছতে দিলে সেটাই করছিল।
const SUBJECT_AREAS = [
  'food and halal eating in Japan',
  'renting an apartment and guarantors',
  'opening a bank account and sending money home',
  'health insurance and seeing a doctor',
  'phone SIM and internet',
  'ward office registration and My Number card',
  'a specific smaller city (Fukuoka, Sendai, Nagoya, Hiroshima, Sapporo, Kobe)',
  'named scholarships (MEXT, JASSO, school-specific)',
  'vocational schools (senmon gakko) and specific fields',
  'IT and engineering careers in Japan',
  'nursing and caregiving careers',
  'hospitality and tourism careers',
  'Japanese workplace culture and job interviews',
  'job hunting (shukatsu) after graduation',
  'parents’ questions: safety, cost, staying in touch',
  'religion, prayer spaces and Ramadan in Japan',
  'earthquakes and disaster preparedness',
  'public transport passes and getting around',
  'friendship, loneliness and mental health abroad',
  'Japanese etiquette and everyday rules',
  'studying Japanese at home in Bangladesh (apps, books, methods)',
  'university entrance (EJU) and graduate school',
  'tax, pension and residence card renewal',
  'bringing a spouse or family to Japan',
];

function randomAreas(n = 3) {
  const a = [...SUBJECT_AREAS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

async function proposeTopic({ themeKey, covered = [], excludeHint = '' }) {
  const theme = TOPIC_THEMES.find((t) => t.key === themeKey) || TOPIC_THEMES[0];
  // EN: The FULL ledger (was the last 150 of an unordered list, so the
  //     model never saw most of what exists and kept re-proposing it).
  // BN: পুরো ledger (আগে unordered list-এর শেষ ১৫০টা যেত, তাই model বেশিরভাগ
  //     বিদ্যমান লেখা দেখতই না আর সেগুলোই আবার প্রস্তাব করত)।
  const coveredList = covered
    .slice(0, 800)
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
        `Prefer a topic within one of these under-covered areas: ${randomAreas().join('; ')}.`,
        `It must NOT be a rephrase, subset or superset of ANY topic already covered below. Pick a genuinely different subject.${excludeHint ? ` ${excludeHint}` : ''}`,
        'Already covered:',
        coveredList || '- (none yet)',
        'Return exactly: {"topic": "one-line brief, max 140 chars", "category": "one of the category options", "keywords": "comma,separated,long-tail,keywords"}',
      ].join('\n\n'),
    },
  ];
  // EN: 400 tokens was eaten by thinking → empty text → "too-short topic".
  // BN: 400 token thinking-এই শেষ হয়ে যেত → খালি text → "too-short topic"।
  const r = await chat(messages, { effort: 'low', maxTokens: 4000 });
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

/**
 * EN: Ask Claude whether `topic` covers the same subject as any recent post.
 *     Word overlap misses rephrasings ("Japan Weather… What to Pack" vs
 *     "Japan's Four Seasons on a Student Budget" scored 0.08), so this is
 *     the meaning-level check for AI-proposed topics. Fails open: on an API
 *     error the topic is allowed rather than blocking the day's post.
 * BN: Claude-কে জিজ্ঞেস করে `topic` সাম্প্রতিক কোনো post-এর একই বিষয় কিনা।
 *     শব্দ-মিল rephrase ধরে না ("Japan Weather… What to Pack" বনাম "Japan's
 *     Four Seasons on a Student Budget" = 0.08), তাই AI-প্রস্তাবিত topic-এর
 *     অর্থ-ভিত্তিক যাচাই এটা। API error হলে topic আটকায় না — দিনের post
 *     বন্ধ হওয়ার চেয়ে সেটা ভালো।
 */
async function isSameSubject({ topic, recentTitles = [] }) {
  if (!recentTitles.length) return { duplicate: false };
  const r = await chat(
    [
      {
        role: 'system',
        content:
          'You check a blog topic plan for repetition. Two topics are the SAME SUBJECT when a reader who read one would find the other mostly repeats it (same question answered, e.g. two posts on Japan seasons / what to pack, or two on April vs October intake), even if the wording or angle differs. Return only a JSON object.',
      },
      {
        role: 'user',
        content: [
          `New topic: ${topic}`,
          'Existing posts:',
          recentTitles.map((t) => `- ${t}`).join('\n'),
          'Return exactly: {"duplicate": true or false, "of": "the existing title it repeats, or empty string"}',
        ].join('\n\n'),
      },
    ],
    { effort: 'low', maxTokens: 4000 }
  );
  if (!r.ok) return { duplicate: false, error: r.error };
  const doc = extractJsonObject(r.text);
  return { duplicate: doc?.duplicate === true, of: String(doc?.of || '') };
}

// EN: A cover-image search for an EXISTING post, from its title — used by
//     scripts/refresh-duplicate-covers.js to re-cover old posts.
// BN: বিদ্যমান post-এর title থেকে cover-image search — পুরোনো post-এর ছবি
//     বদলাতে scripts/refresh-duplicate-covers.js ব্যবহার করে।
async function proposeImageQuery(title) {
  const r = await chat(
    [
      {
        role: 'system',
        content:
          'You pick a cover photo search for a blog post about studying or living in Japan. Return only a JSON object.',
      },
      {
        role: 'user',
        content: `Post title: ${title}\n\nReturn exactly: {"imageQuery": "2–4 English words naming ONE concrete, photographable subject specific to this post (a place, object or scene, e.g. a landmark, food, document, season, vehicle). Never generic words like students, study, university, education."}`,
      },
    ],
    { effort: 'low', maxTokens: 2000 }
  );
  if (!r.ok) return { ok: false, error: r.error };
  const q = String(extractJsonObject(r.text)?.imageQuery || '').trim();
  return q ? { ok: true, imageQuery: q.slice(0, 80) } : { ok: false, error: 'empty imageQuery' };
}

module.exports = {
  proposeImageQuery,
  ARTICLE_FORMATS,
  formatForSlot,
  isSameSubject,
  TOPIC_THEMES,
  CATEGORY_POOL,
  TOPIC_FALLBACK_POOL,
  GUIDE_LINKS,
  themeForSlot,
  pickFallbackTopic,
  proposeTopic,
  generateArticle,
  makeSlug,
  // EN: Re-exported so tests and the scheduler share one similarity rule.
  // BN: Test আর scheduler যাতে একই similarity rule share করে — re-export।
  isNearDuplicate,
  nearestMatch,
};
