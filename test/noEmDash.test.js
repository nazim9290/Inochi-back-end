// EN: Em dash removal rules (helpers/noEmDash.js).
// BN: Em dash সরানোর নিয়ম (helpers/noEmDash.js)।
const test = require('node:test');
const assert = require('node:assert');
const { removeEmDash, removeEmDashDeep } = require('../helpers/noEmDash');

test('single dash before an explanation becomes a colon', () => {
  assert.strictEqual(
    removeEmDash('WhatsApp or form — we reply in 24 hours.'),
    'WhatsApp or form: we reply in 24 hours.'
  );
});

test('a pair around an aside becomes commas', () => {
  assert.strictEqual(
    removeEmDash('Teachers — including Japanese nationals — train you.'),
    'Teachers, including Japanese nationals, train you.'
  );
});

test('a continuing clause gets a comma, not a colon', () => {
  assert.strictEqual(
    removeEmDash('Inochi means life — and we help you.'),
    'Inochi means life, and we help you.'
  );
});

test('Japanese text, number ranges and placeholders', () => {
  assert.strictEqual(removeEmDash('東京 — 日本の首都'), '東京、日本の首都');
  assert.strictEqual(removeEmDash('9—5 shift'), '9–5 shift');
  assert.strictEqual(removeEmDash('—'), '-');
});

test('HTML structure and line breaks survive', () => {
  assert.strictEqual(
    removeEmDash('<p>Japan is affordable — visa, jobs.</p>\n<p>Next.</p>'),
    '<p>Japan is affordable: visa, jobs.</p>\n<p>Next.</p>'
  );
});

test('deep version cleans nested JSON and leaves other values', () => {
  assert.deepStrictEqual(removeEmDashDeep({ title: 'N5 — Beginner', list: ['a — b'], n: 3 }), {
    title: 'N5: Beginner',
    list: ['a: b'],
    n: 3,
  });
});

test('admin saves of public content lose their em dashes (model hooks)', async () => {
  const { Faq, Contact } = require('../models');
  const faq = Faq.build({ answer: 'Yes — we help.', answerEn: 'Yes — we help.' });
  await Faq.runHooks('beforeSave', faq, {});
  assert.strictEqual(faq.get('answer'), 'Yes: we help.');
  const opts = { attributes: { answer: 'A — B' } };
  await Faq.runHooks('beforeBulkUpdate', opts);
  assert.strictEqual(opts.attributes.answer, 'A: B');
  // visitor-written text is left as typed
  assert.strictEqual(
    Contact.options.hooks?.beforeSave?.some((h) => h.name === 'noEmDash') || false,
    false
  );
});
