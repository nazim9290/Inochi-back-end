#!/usr/bin/env node
/**
 * EN: Give every AI post that shares its cover photo with another post a
 *     cover of its own. Until 2026-10-16 the generator copied the literal
 *     example image query, so ~110 posts carried one of two Commons photos
 *     (one of them an 1882 class photo).
 *     Per shared photo, the OLDEST post keeps it; the rest get a new one.
 *     Photos in ALWAYS_REPLACE (archive shots) are replaced on every post.
 *     Old image objects are written to --backup so the change can be undone.
 *
 *     node scripts/refresh-duplicate-covers.js                 # dry run: list only
 *     node scripts/refresh-duplicate-covers.js --apply [--limit 20] [--backup /tmp/covers-backup.json]
 *
 * BN: যে AI post-এর cover ছবি অন্য post-এর সাথে মিলে যায়, তাকে নিজস্ব cover
 *     দেয়। ২০২৬-১০-১৬ পর্যন্ত generator নমুনা image query হুবহু কপি করত, তাই
 *     ~১১০টা post দুটো Commons ছবির একটা পেয়েছিল (একটা ১৮৮২-র class photo)।
 *     প্রতিটা শেয়ার করা ছবি সবচেয়ে পুরোনো post রাখে; বাকিরা নতুন ছবি পায়।
 *     ALWAYS_REPLACE-এর (archive) ছবি সব post থেকেই বদলায়। পুরোনো image
 *     object --backup-এ লেখা হয়, যাতে ফিরিয়ে আনা যায়।
 */
require('dotenv').config();
const fs = require('fs');
const { Op } = require('sequelize');
const { Blog } = require('../models');
const { proposeImageQuery } = require('../helpers/aiBlog');
const { generateCoverImage } = require('../helpers/blogImage');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const argVal = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const LIMIT = Number(argVal('--limit', 0)) || Infinity;
const BACKUP = argVal('--backup', '/tmp/covers-backup.json');

// EN: Archive photos that should not be a cover anywhere.
// BN: যে archive ছবি কোথাও cover হওয়া উচিত নয়।
const ALWAYS_REPLACE = [/First_students_of_1882/, /\(1967-05-04_by_Roger_W\)/];

const sourceOf = (b) => (b.image && b.image.credit && b.image.credit.sourceLink) || '';

(async () => {
  const posts = await Blog.findAll({
    where: { aiGeneratedAt: { [Op.ne]: null }, status: 'published' },
    order: [['createdAt', 'ASC']],
  });
  const allRows = await Blog.findAll({ attributes: ['image'], raw: true });
  const used = new Set(allRows.map(sourceOf).filter(Boolean));

  const seen = new Set();
  const todo = [];
  for (const p of posts) {
    const src = sourceOf(p);
    if (!src) continue;
    if (ALWAYS_REPLACE.some((re) => re.test(src)) || seen.has(src)) todo.push(p);
    else seen.add(src);
  }
  console.log(`${todo.length} posts need a new cover${APPLY ? '' : ' (dry run)'}`);
  if (!APPLY) {
    for (const p of todo) console.log('-', p.titleEn || p.title);
    process.exit(0);
  }

  const backup = fs.existsSync(BACKUP) ? JSON.parse(fs.readFileSync(BACKUP, 'utf8')) : {};
  let done = 0;
  let failed = 0;
  for (const p of todo.slice(0, LIMIT)) {
    const title = p.titleEn || p.title;
    const q = await proposeImageQuery(title);
    const query = q.ok ? q.imageQuery : title;
    const img = await generateCoverImage(query, title, { exclude: used });
    if (!img.ok) {
      failed++;
      console.log(`FAIL ${p.id} "${title}" — ${img.error}`);
      continue;
    }
    if (!backup[p.id]) backup[p.id] = p.image;
    fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2));
    p.image = img.photo;
    p.changed('image', true);
    await p.save();
    used.add(img.photo.credit.sourceLink);
    done++;
    console.log(`OK ${done} "${title}" ← [${query}] ${img.photo.credit.sourceLink}`);
  }
  console.log(`done=${done} failed=${failed} backup=${BACKUP}`);
  process.exit(0);
})();
