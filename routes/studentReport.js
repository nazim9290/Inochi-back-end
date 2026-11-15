/**
 * EN: GET  /api/student-report  public, the latest totals (or {} when none yet).
 *     PUT  /api/student-report  header x-report-key = STUDENT_REPORT_KEY; the
 *          monthly Agency Book routine posts totals here. Only aggregate
 *          numbers are accepted, anything else is rejected.
 * BN: GET public, সর্বশেষ মোট সংখ্যা। PUT শুধু STUDENT_REPORT_KEY থাকলে;
 *     মাসিক Agency Book routine এখানে পাঠায়। শুধু মোট সংখ্যা নেয়, অন্য কিছু নয়।
 */
const express = require('express');
const crypto = require('crypto');
const { StudentReport } = require('../models');

const router = express.Router();

const int = (v, max = 100000) => Number.isInteger(v) && v >= 0 && v <= max;
const label = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 60 && !/[<>]/.test(v);
const rows = (list, key) =>
  Array.isArray(list) && list.length <= 30 && list.every((r) => r && label(r[key]) && int(r.students));

// EN: Returns the cleaned report or null when the payload is not exactly what we expect.
// BN: ঠিকঠাক থাকলে পরিষ্কার report দেয়, নইলে null।
function validateReport(b) {
  if (!b || typeof b !== 'object') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.asOf || '')) return null;
  if (!int(b.totalStudents) || !int(b.japaneseSchools) || !int(b.arrivedInJapan)) return null;
  if (!rows(b.byIntake, 'intake') || !rows(b.byStage, 'stage')) return null;
  const pick = (list, key) => list.map((r) => ({ [key]: r[key].trim(), students: r.students }));
  return {
    asOf: b.asOf,
    totalStudents: b.totalStudents,
    japaneseSchools: b.japaneseSchools,
    arrivedInJapan: b.arrivedInJapan,
    byIntake: pick(b.byIntake, 'intake'),
    byStage: pick(b.byStage, 'stage'),
  };
}

const keyOk = (given) => {
  const want = process.env.STUDENT_REPORT_KEY || '';
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(want);
  return want.length >= 24 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

router.get('/student-report', async (req, res) => {
  try {
    const row = await StudentReport.findByPk(1);
    res.json({ report: row ? row.data : {}, updatedAt: row ? row.updatedAt : null });
  } catch (err) {
    console.error('student-report get failed:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/student-report', async (req, res) => {
  if (!keyOk(req.get('x-report-key'))) return res.status(401).json({ error: 'Unauthorized' });
  const data = validateReport(req.body);
  if (!data) return res.status(400).json({ error: 'Invalid report shape' });
  try {
    await StudentReport.upsert({ id: 1, data });
    require('../helpers/indexnow').pingPaths(['/guides/bangladeshi-students-in-japan-statistics']);
    res.json({ ok: true, report: data });
  } catch (err) {
    console.error('student-report put failed:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
module.exports.validateReport = validateReport;
