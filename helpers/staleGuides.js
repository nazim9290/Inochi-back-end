/**
 * EN: Which /guides pages are overdue for a fact refresh. AI answers prefer
 *     fresh, dated sources, so old numbers cost citations (GEO). Reads the
 *     frontend's guide JSON on the same VPS; used by the Monday health check.
 * BN: কোন /guides পাতার তথ্য হালনাগাদের সময় পেরিয়েছে। AI উত্তর নতুন, তারিখসহ
 *     সূত্র পছন্দ করে, তাই পুরোনো সংখ্যা মানে কম উদ্ধৃতি (GEO)। একই VPS-এ
 *     frontend-এর guide JSON পড়ে; সোমবারের health check ব্যবহার করে।
 */
const fs = require('fs');
const path = require('path');

// EN: Days before a guide counts as stale. Data-heavy guides go stale sooner.
// BN: কত দিন পর guide পুরোনো ধরা হবে। ডেটা-ভারী guide আগে পুরোনো হয়।
const DEFAULT_MAX_DAYS = 240;
const MAX_DAYS = {
  'bangladeshi-students-in-japan-statistics': 150, // JASSO (May-Jun), ISA (Mar, Oct)
  'nat-test-japanese-exam-in-bangladesh': 120, // exam dates
  'japanese-language-school-fees-in-japan-for-bangladeshi-students': 180, // yearly fees
  'japan-vs-korea-vs-germany-study-abroad-from-bangladesh': 180, // wages, blocked account
  'specified-skilled-worker-ssw-japan-from-bangladesh': 150, // rule changes 2027
};

// EN: Pure: guides [{slug, updated}] → [{slug, updated, ageDays, maxDays}], oldest first.
// BN: Pure: guide তালিকা → পুরোনোগুলো, সবচেয়ে পুরোনো আগে।
function staleGuides(guides, today = new Date()) {
  const out = [];
  for (const g of guides) {
    const t = Date.parse(g.updated || g.published || '');
    if (!g.slug || Number.isNaN(t)) continue;
    const ageDays = Math.floor((today - t) / 86400000);
    const maxDays = MAX_DAYS[g.slug] || DEFAULT_MAX_DAYS;
    if (ageDays > maxDays) out.push({ slug: g.slug, updated: g.updated, ageDays, maxDays });
  }
  return out.sort((a, b) => b.ageDays - a.ageDays);
}

function readGuides(dir = process.env.GUIDES_DIR || '/home/inochi/global/content/guides') {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const g = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { slug: g.slug, updated: g.updated, published: g.published };
    });
}

module.exports = { staleGuides, readGuides, MAX_DAYS, DEFAULT_MAX_DAYS };
