// EN: Stale-guide rule (helpers/staleGuides.js) and the student-report shape
//     gate (routes/studentReport.js), the trust boundary for the cloud routine.
// BN: পুরোনো guide-এর নিয়ম আর student-report-এর গঠন যাচাই (cloud routine-এর
//     জন্য trust boundary)।
const test = require('node:test');
const assert = require('node:assert');
const { staleGuides } = require('../helpers/staleGuides');
const { validateReport } = require('../routes/studentReport');

test('stale guides use per-slug limits, oldest first, skip bad dates', () => {
  const today = new Date('2026-11-15');
  const out = staleGuides(
    [
      { slug: 'nat-test-japanese-exam-in-bangladesh', updated: '2026-06-01' }, // 167 > 120
      { slug: 'study-in-japan-from-bangladesh', updated: '2026-06-01' }, // 167 < 240
      { slug: 'japan-scholarships-for-bangladeshi-students', updated: '2025-12-01' }, // 349 > 240
      { slug: 'broken', updated: 'n/a' },
    ],
    today
  );
  assert.deepStrictEqual(
    out.map((g) => g.slug),
    ['japan-scholarships-for-bangladeshi-students', 'nat-test-japanese-exam-in-bangladesh']
  );
});

const good = {
  asOf: '2026-12-01',
  totalStudents: 190,
  japaneseSchools: 24,
  arrivedInJapan: 3,
  byIntake: [{ intake: 'April 2027', students: 150 }],
  byStage: [{ stage: 'Enrolled', students: 120 }],
};

test('valid report passes and extra fields (e.g. names) are dropped', () => {
  const r = validateReport({ ...good, names: ['MD X'], byIntake: [{ intake: ' April 2027 ', students: 150, phone: '017' }] });
  assert.deepStrictEqual(Object.keys(r).sort(), ['arrivedInJapan', 'asOf', 'byIntake', 'byStage', 'japaneseSchools', 'totalStudents']);
  assert.deepStrictEqual(r.byIntake, [{ intake: 'April 2027', students: 150 }]);
});

test('bad shapes are rejected', () => {
  assert.strictEqual(validateReport(null), null);
  assert.strictEqual(validateReport({ ...good, asOf: 'Dec 2026' }), null);
  assert.strictEqual(validateReport({ ...good, totalStudents: -1 }), null);
  assert.strictEqual(validateReport({ ...good, totalStudents: 1.5 }), null);
  assert.strictEqual(validateReport({ ...good, byStage: [{ stage: '<script>', students: 1 }] }), null);
  assert.strictEqual(validateReport({ ...good, byIntake: 'April' }), null);
});
