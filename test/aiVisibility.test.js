// EN: Scoring rules for the monthly AI visibility check (helpers/aiVisibility.js).
// BN: মাসিক AI visibility check-এর স্কোরিং নিয়ম।
const test = require('node:test');
const assert = require('node:assert');
const { scoreAnswer } = require('../helpers/aiVisibility');

test('citation objects and plain URLs in text both count, www stripped', () => {
  const r = scoreAnswer([
    { type: 'server_tool_use' },
    { type: 'text', text: 'Agencies include ', citations: [] },
    { type: 'text', text: 'Inochi Global Education', citations: [{ url: 'https://www.inochieducation.com/en/fees' }] },
    { type: 'text', text: ' and MACES (see https://www.thedailystar.net/x).' },
  ]);
  assert.deepStrictEqual(r, {
    mentioned: true,
    cited: true,
    seen: false,
    domains: ['thedailystar.net', 'inochieducation.com'],
  });
});

test('in search results but missing from the answer is "seen" only', () => {
  const r = scoreAnswer([
    {
      type: 'web_search_tool_result',
      content: [{ type: 'web_search_result', url: 'https://inochieducation.com/' }],
    },
    { type: 'text', text: 'Try **Japan Education & Job Center**: https://www.facebook.com/jejcbd/.' },
  ]);
  assert.deepStrictEqual(r, { mentioned: false, cited: false, seen: true, domains: ['facebook.com'] });
});

test('Bangla name without link is mentioned only; empty answer is nothing', () => {
  assert.deepStrictEqual(scoreAnswer([{ type: 'text', text: 'ইনোচি একটি এজেন্সি' }]), {
    mentioned: true,
    cited: false,
    seen: false,
    domains: [],
  });
  assert.deepStrictEqual(scoreAnswer([]), { mentioned: false, cited: false, seen: false, domains: [] });
  // EN: error-shaped search result (object, not list) must not throw.
  // BN: error-আকৃতির search result (list নয়, object) হলে throw করবে না।
  assert.strictEqual(scoreAnswer([{ type: 'web_search_tool_result', content: { error_code: 'x' } }]).seen, false);
});
