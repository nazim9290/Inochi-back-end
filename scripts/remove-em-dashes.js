#!/usr/bin/env node
/**
 * EN: Remove em dashes from public content already in the database (blog
 *     posts and the admin-editable site content tables). People's own
 *     messages (contacts) and internal logs are never touched.
 *     Old values of every changed row are saved to --backup first.
 *
 *     node scripts/remove-em-dashes.js                      # dry run: counts only
 *     node scripts/remove-em-dashes.js --apply [--backup /home/inochi/emdash-backup.json]
 *
 * BN: Database-এ থাকা public লেখা থেকে em dash সরায় (blog post আর admin-এ
 *     সম্পাদনযোগ্য site content table)। মানুষের পাঠানো বার্তা (contacts) আর
 *     internal log কখনো ছোঁয়া হয় না। বদলানো প্রতিটা row-এর পুরোনো মান আগে
 *     --backup-এ রাখা হয়।
 */
require('dotenv').config();
const fs = require('fs');
const db = require('../models');
const { removeEmDashDeep } = require('../helpers/noEmDash');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const bi = args.indexOf('--backup');
const BACKUP = bi >= 0 ? args[bi + 1] : '/tmp/emdash-backup.json';

// EN: Public-content models only. Anything not listed is left alone.
// BN: শুধু public-content model। তালিকায় না থাকলে ছোঁয়া হয় না।
const MODELS = [
  'Blog',
  'JpCity',
  'BdCity',
  'Event',
  'JlptCourse',
  'ScamItem',
  'Faq',
  'HowItWorksStep',
  'SiteSettings',
  'AgencyMoment',
];

const TEXTY = /STRING|TEXT|JSON|ARRAY/;
const count = (v) => (JSON.stringify(v ?? '').match(/—/g) || []).length;

(async () => {
  const backup = fs.existsSync(BACKUP) ? JSON.parse(fs.readFileSync(BACKUP, 'utf8')) : {};
  let total = 0;
  for (const name of MODELS) {
    const M = db[name] || db.sequelize.models[name];
    if (!M) {
      console.log(`skip ${name}: model not found`);
      continue;
    }
    const pk = M.primaryKeyAttribute;
    const cols = Object.entries(M.rawAttributes)
      .filter(([, a]) => TEXTY.test(a.type.key || a.type.constructor.key || ''))
      .map(([k]) => k);
    const rows = await M.findAll();
    let removed = 0;
    let changedRows = 0;
    for (const row of rows) {
      const patch = {};
      const old = {};
      for (const c of cols) {
        const v = row.get(c);
        if (!count(v)) continue;
        const next = removeEmDashDeep(v, c);
        if (JSON.stringify(next) === JSON.stringify(v)) continue;
        removed += count(v) - count(next);
        patch[c] = next;
        old[c] = v;
      }
      if (!Object.keys(patch).length) continue;
      changedRows++;
      if (APPLY) {
        const key = `${name}:${row.get(pk)}`;
        if (!backup[key]) backup[key] = old;
        fs.writeFileSync(BACKUP, JSON.stringify(backup));
        // EN: silent + no hooks: a content cleanup must not re-trigger
        //     Facebook auto-posts or IndexNow pings.
        // BN: silent + hook নেই: content পরিষ্কার করলে যেন Facebook auto-post
        //     বা IndexNow ping আবার না চলে।
        await M.update(patch, { where: { [pk]: row.get(pk) }, hooks: false, silent: true });
      }
    }
    total += removed;
    console.log(`${name}: ${removed} em dashes in ${changedRows} rows${APPLY ? ' → fixed' : ''}`);
  }
  console.log(`total=${total}${APPLY ? ` backup=${BACKUP}` : ' (dry run)'}`);
  process.exit(0);
})();
