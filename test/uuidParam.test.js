// EN: Malformed blog/comment ids must be a 404, never reach Postgres.
// BN: ভুল blog/comment id হলে 404, Postgres পর্যন্ত যাবে না।
const test = require('node:test');
const assert = require('node:assert');
const uuidParam = require('../middleware/uuidParam');

test('uuid param guard passes real ids and 404s injection-shaped ones', () => {
  let status = 0;
  let passed = 0;
  const res = { status: (c) => ((status = c), res), json: () => res };
  uuidParam({}, res, () => passed++, '3182a245-0683-41a3-a25d-608721c0f7ed');
  uuidParam({}, res, () => passed++, "1' OR '1'='1");
  assert.strictEqual(passed, 1);
  assert.strictEqual(status, 404);
});
