/**
 * EN: Title/topic similarity for the AI blog pipeline. Two briefs or titles
 *     that share most of their meaningful words ("Part-Time Job Hunting
 *     Tips for First-Year Students" vs "Part-Time Job Tips for First-Year
 *     Students") are the same article to a reader and to Google — this
 *     module is the single place that decides "near-duplicate".
 *
 *     Algorithm: lower-case, strip punctuation, drop stop-words and the
 *     words that appear in EVERY post on this site (japan, student,
 *     bangladeshi…), then Jaccard overlap of the remaining token sets.
 *     0.5 was calibrated against the 152 live posts (2026-08-23): it
 *     clustered the 24 repeated briefs correctly with no false merges.
 * BN: AI blog pipeline-এর title/topic similarity। যে দুটো brief বা title-এর
 *     অর্থবহ শব্দের বেশিরভাগ এক ("Part-Time Job Hunting Tips…" vs "Part-Time
 *     Job Tips…") — পাঠক আর Google-এর কাছে সেটা একই লেখা; "near-duplicate"
 *     সিদ্ধান্ত এই একটা module-ই নেয়।
 *
 *     Algorithm: lower-case, punctuation বাদ, stop-word আর এই site-এর
 *     প্রতিটা post-এ থাকা শব্দ (japan, student, bangladeshi…) বাদ, তারপর
 *     বাকি token set-এর Jaccard overlap। 0.5 threshold ১৫২টি live post
 *     (2026-08-23) দিয়ে calibrate করা: ২৪টি repeated brief ঠিকভাবে cluster
 *     হয়েছে, ভুল merge হয়নি।
 */

const STOP_WORDS = new Set(
  (
    'a an the and or of for to in on at by with from vs versus is are your you how what which why when ' +
    'before after guide guides students student bangladeshi bangladesh japan japanese step complete ' +
    'realistic best top tips explained simple simply plan planning every everything can should must ' +
    'need needs do does make making get getting go going one all any new now 2024 2025 2026 2027'
  ).split(/\s+/)
);

// EN: Light English stemmer so "choose/choosing", "study/studying",
//     "apply/applying" count as the same word. Crude on purpose — we only
//     compare titles against each other, never show the stems.
// BN: হালকা English stemmer — "choose/choosing", "study/studying",
//     "apply/applying" একই শব্দ ধরা হয়। ইচ্ছা করেই crude — শুধু title-এর
//     সাথে title মেলাই, stem কখনো দেখাই না।
function stem(w) {
  if (w.length <= 4 || /[ঀ-৿]/.test(w)) return w;
  // EN: Strip ONE suffix family, then drop a plural -s only when nothing
  //     else was stripped (else "choosing" → "choos" → "choo" ≠ "choose").
  // BN: একটা suffix family বাদ, plural -s শুধু তখনই বাদ যদি আর কিছু বাদ না
  //     পড়ে (নইলে "choosing" → "choos" → "choo" ≠ "choose")।
  let s = w.replace(/(ings?|ations?|tions?|ers?|ed|es|(?<=[a-z]{4})ly)$/, '');
  if (s === w) s = s.replace(/(?<=[a-z]{3})s$/, '');
  return s.replace(/(?<=[a-z]{3})e$/, '').replace(/(?<=[a-z]{2})i$/, 'y');
}

// EN: Tokenise — keeps Latin and Bangla word characters, drops stop-words
//     and 1-char fragments, then stems.
// BN: Tokenise — Latin ও Bangla শব্দ রাখে, stop-word আর ১-অক্ষরের টুকরো বাদ,
//     তারপর stem।
function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9ঀ-৿\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem);
}

function normalize(text) {
  return [...new Set(tokens(text))].sort().join(' ');
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter || 1);
}

function similarity(a, b) {
  return jaccard(tokens(a), tokens(b));
}

// EN: Highest-scoring entry of `list` for `candidate`: { score, match }.
// BN: `candidate`-এর জন্য `list`-এর সর্বোচ্চ-score entry: { score, match }।
function nearestMatch(candidate, list = []) {
  const c = tokens(candidate);
  let best = { score: 0, match: null };
  for (const item of list) {
    if (!item) continue;
    const s = jaccard(c, tokens(item));
    if (s > best.score) best = { score: s, match: item };
  }
  return best;
}

const DEFAULT_THRESHOLD = 0.5;

function isNearDuplicate(candidate, list = [], threshold = DEFAULT_THRESHOLD) {
  if (!candidate) return false;
  const n = normalize(candidate);
  for (const item of list) {
    if (item && normalize(item) === n) return true;
  }
  return nearestMatch(candidate, list).score >= threshold;
}

// EN: Group a list of {id, title} into near-duplicate clusters (greedy,
//     order-preserving). Used by the one-off dedupe script and by tests.
// BN: {id, title} list-কে near-duplicate cluster-এ ভাগ (greedy, order রাখে)।
//     One-off dedupe script আর test-এ ব্যবহার।
function clusterByTitle(items, threshold = DEFAULT_THRESHOLD) {
  const clusters = [];
  for (const item of items) {
    const t = tokens(item.title);
    let best = null;
    let bestScore = 0;
    for (const c of clusters) {
      const s = Math.max(...c.map((x) => jaccard(t, x._tokens)));
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    const entry = { ...item, _tokens: t };
    if (best && bestScore >= threshold) best.push(entry);
    else clusters.push([entry]);
  }
  return clusters.map((c) => c.map(({ _tokens, ...rest }) => rest));
}

module.exports = {
  STOP_WORDS,
  DEFAULT_THRESHOLD,
  tokens,
  normalize,
  jaccard,
  similarity,
  nearestMatch,
  isNearDuplicate,
  clusterByTitle,
};
