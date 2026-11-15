// EN: Scoring rules for the monthly AI visibility check (helpers/aiVisibility.js).
// BN: মাসিক AI visibility check-এর স্কোরিং নিয়ম।
const test = require('node:test');
const assert = require('node:assert');
const { scoreAnswer } = require('../helpers/aiVisibility');

test('citation of our domain counts as cited, www stripped', () => {
  const r = scoreAnswer([
    { type: 'server_tool_use' },
    { type: 'text', text: 'Agencies include ', citations: [] },
    { type: 'text', text: 'Inochi Global Education', citations: [{ url: 'https://www.inochieducation.com/en/fees' }] },
    { type: 'text', text: ' and MACES.', citations: [{ url: 'https://www.thedailystar.net/x' }] },
  ]);
  assert.deepStrictEqual(r, { mentioned: true, cited: true, domains: ['inochieducation.com', 'thedailystar.net'] });
});

test('Bangla name without link is mentioned only; empty answer is neither', () => {
  assert.deepStrictEqual(scoreAnswer([{ type: 'text', text: 'ইনোচি একটি এজেন্সি' }]), {
    mentioned: true,
    cited: false,
    domains: [],
  });
  assert.deepStrictEqual(scoreAnswer([]), { mentioned: false, cited: false, domains: [] });
});
