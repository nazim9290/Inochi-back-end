/**
 * EN: Regression tests for the AI-blog duplicate bug (2026-08-23).
 *     Run: `npm test` (node:test, no extra deps). Pure functions only —
 *     no DB, no network.
 * BN: AI-blog duplicate bug-এর regression test (2026-08-23)।
 *     Run: `npm test` (node:test, extra dependency নেই)। শুধু pure function —
 *     DB বা network নেই।
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  similarity,
  isNearDuplicate,
  nearestMatch,
  clusterByTitle,
} = require('../helpers/blogSimilarity');
const { pickFallbackTopic, TOPIC_THEMES, TOPIC_FALLBACK_POOL } = require('../helpers/aiBlog');

// EN: Real titles from the live duplicate clusters (2026-08-23).
// BN: Live duplicate cluster-এর আসল title (2026-08-23)।
const DUPES = [
  [
    'Part-Time Job Hunting Tips for First-Year Language Students in Japan',
    'Part-Time Job Tips for First-Year Language Students in Japan',
  ],
  [
    'Career and PR after Graduating in Japan: How to Plan?',
    'Career and PR After Studying in Japan: How to Plan',
  ],
  [
    'How to Write a Statement of Purpose for a Japanese Language School',
    'How to Write an SOP for a Japanese Language School — Step-by-Step Guide',
  ],
  [
    'Tokyo vs Osaka: Which City to Choose for Studying in Japan?',
    'Tokyo or Osaka? Choosing the Right City for Bangladeshi Students',
  ],
  [
    'Surviving the First Month in Japan: Apartment, SIM, Bank, Koban',
    'Surviving Your First Month in Japan: Apartment, SIM, Bank, Koban',
  ],
  [
    'COE (Certificate of Eligibility) Explained Step by Step for Bangladeshi Applicants',
    'What is COE (Certificate of Eligibility) and Step-by-Step Process for Bangladeshi Applicants',
  ],
];

const DISTINCT = [
  [
    'Part-Time Work in Japan: The 28-Hour Rule and Realistic Monthly Earnings',
    'Halal Food, Mosques, and Ramadan in Japan: A Real Guide for Bangladeshi Students',
  ],
  [
    'JLPT N5 in 30 Days: A Realistic Study Plan for Busy Professionals',
    'MEXT vs JASSO Scholarship: Which One is Right for You?',
  ],
  [
    'Surviving the First Month in Japan: Apartment, SIM, Bank, Koban',
    'Winter in Japan for someone who has never seen snow: clothes, heating bills, health',
  ],
  [
    'COE (Certificate of Eligibility) explained step by step for Bangladeshi applicants',
    'Reapplying after a COE refusal: what to change and when the next intake is',
  ],
];

test('near-duplicate titles from the live clusters are detected', () => {
  for (const [a, b] of DUPES) {
    assert.ok(
      similarity(a, b) >= 0.5,
      `expected near-duplicate: "${a}" vs "${b}" (${similarity(a, b).toFixed(2)})`
    );
    assert.equal(isNearDuplicate(b, [a]), true);
  }
});

test('genuinely different topics are NOT flagged', () => {
  for (const [a, b] of DISTINCT) {
    assert.ok(
      similarity(a, b) < 0.5,
      `expected distinct: "${a}" vs "${b}" (${similarity(a, b).toFixed(2)})`
    );
    assert.equal(isNearDuplicate(b, [a]), false);
  }
});

test('exact normalised match counts as duplicate regardless of punctuation/case', () => {
  assert.equal(
    isNearDuplicate('tokyo VS osaka — which city?', ['Tokyo vs Osaka: Which City']),
    true
  );
});

test('nearestMatch returns the closest existing title and its score', () => {
  const { match, score } = nearestMatch('Career and PR after Graduating in Japan: How to Prepare', [
    'Halal Food in Japan',
    'Career and PR after Graduating in Japan: How to Plan?',
  ]);
  assert.equal(match, 'Career and PR after Graduating in Japan: How to Plan?');
  assert.ok(score >= 0.5);
});

test('clusterByTitle groups the 8-post live cluster into one cluster', () => {
  const titles = [
    'Part-Time Job Hunting Tips for First-Year Language Students in Japan',
    'Part-Time Job Tips for First-Year Language Students in Japan',
    'Easy Tips for First-Year Language Students to Find Part-Time Jobs in Japan',
    'Halal Food, Mosques, and Ramadan in Japan: A Real Guide for Bangladeshi Students',
  ].map((title, i) => ({ id: String(i), title }));
  const clusters = clusterByTitle(titles);
  assert.equal(clusters.length, 2);
  assert.equal(clusters[0].length, 3);
});

test('pool has grown and every brief is unique within the pool', () => {
  assert.ok(TOPIC_FALLBACK_POOL.length >= 60, `pool size ${TOPIC_FALLBACK_POOL.length}`);
  for (let i = 0; i < TOPIC_FALLBACK_POOL.length; i++) {
    for (let j = i + 1; j < TOPIC_FALLBACK_POOL.length; j++) {
      assert.ok(
        similarity(TOPIC_FALLBACK_POOL[i], TOPIC_FALLBACK_POOL[j]) < 0.5,
        `pool briefs overlap: "${TOPIC_FALLBACK_POOL[i]}" / "${TOPIC_FALLBACK_POOL[j]}"`
      );
    }
  }
});

test('picker never returns a brief that is in the ledger (exact or rephrased)', () => {
  const used = TOPIC_FALLBACK_POOL.slice(0, 10);
  const rephrased = ['Part-Time Work in Japan: The 28-Hour Rule and Realistic Monthly Earnings'];
  for (let slot = 0; slot < 4; slot++) {
    const pick = pickFallbackTopic(slot, [...used, ...rephrased]);
    assert.ok(pick && pick.topic, 'expected a topic while pool not exhausted');
    assert.equal(
      isNearDuplicate(pick.topic, [...used, ...rephrased]),
      false,
      `picked a used brief: ${pick.topic}`
    );
  }
});

test('picker returns null when the whole pool is covered (old code fell back to a used brief)', () => {
  const everything = [...TOPIC_FALLBACK_POOL];
  for (let slot = 0; slot < TOPIC_THEMES.length; slot++) {
    assert.equal(pickFallbackTopic(slot, everything), null);
  }
});

test('picker drains the pool without repeats over a simulated run of every slot', () => {
  const ledger = [];
  let picks = 0;
  // EN: Keep picking and adding to the ledger until exhaustion — must be
  //     exactly the pool size, with no brief twice.
  // BN: শেষ না হওয়া পর্যন্ত pick করে ledger-এ যোগ — ঠিক pool size-এর সমান
  //     হবে, কোনো brief দুবার নয়।
  while (picks <= TOPIC_FALLBACK_POOL.length + 5) {
    const p = pickFallbackTopic(picks % 2, ledger);
    if (!p) break;
    assert.equal(ledger.includes(p.topic), false, `repeated brief: ${p.topic}`);
    ledger.push(p.topic);
    picks += 1;
  }
  assert.equal(picks, TOPIC_FALLBACK_POOL.length);
});
