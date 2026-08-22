#!/usr/bin/env node
/**
 * EN: One-off cleanup for the AI-blog duplicate era (2026-06 → 2026-08).
 *     Clusters AI-generated PUBLISHED posts by title similarity, keeps the
 *     best post of each cluster (has cover image > longest English body >
 *     newest) and moves the rest to status='draft' (reversible — nothing
 *     is deleted). Writes a redirect map {duplicateId: keptId} so the
 *     frontend can 301 old URLs to the surviving post.
 *
 *     Usage (on the VPS, as the `inochi` user):
 *       node scripts/dedupe-ai-blogs.js            # dry run, prints the plan
 *       node scripts/dedupe-ai-blogs.js --apply    # performs the updates
 *       node scripts/dedupe-ai-blogs.js --apply --out /tmp/blog-redirects.json
 * BN: AI-blog duplicate যুগের (2026-06 → 2026-08) one-off cleanup।
 *     AI-generated PUBLISHED post-গুলো title similarity দিয়ে cluster করে,
 *     প্রতিটি cluster-এর সেরা post রাখে (cover image আছে > দীর্ঘতম English
 *     body > নতুনতম) আর বাকিগুলো status='draft' করে (reversible — কিছু delete
 *     হয় না)। Redirect map {duplicateId: keptId} লেখে, যাতে frontend পুরোনো
 *     URL-কে টিকে থাকা post-এ 301 করতে পারে।
 *
 *     ব্যবহার (VPS-এ, `inochi` user হিসেবে):
 *       node scripts/dedupe-ai-blogs.js            # dry run, plan দেখায়
 *       node scripts/dedupe-ai-blogs.js --apply    # update করে
 *       node scripts/dedupe-ai-blogs.js --apply --out /tmp/blog-redirects.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { Blog } = require('../models');
const { clusterByTitle } = require('../helpers/blogSimilarity');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : path.join(__dirname, '..', 'blog-redirects.json');

function hasImage(b) {
  const img = b.image;
  return !!(img && (img.url || img.secure_url));
}

// EN: Higher is better: image (dominant), then English body length, then recency.
// BN: বেশি = ভালো: image (প্রধান), তারপর English body-র দৈর্ঘ্য, তারপর নতুনত্ব।
function score(b) {
  const len = (b.contentEn || b.content || '').length;
  return (hasImage(b) ? 1e9 : 0) + len * 1000 + new Date(b.createdAt).getTime() / 1e9;
}

(async () => {
  const posts = await Blog.findAll({
    where: { status: 'published', aiGeneratedAt: { [Op.ne]: null } },
    attributes: ['id', 'title', 'titleEn', 'content', 'contentEn', 'image', 'createdAt'],
    order: [['createdAt', 'ASC']],
    raw: true,
  });
  const items = posts.map((p) => ({ ...p, title: p.titleEn || p.title }));
  const clusters = clusterByTitle(items);
  const dupClusters = clusters.filter((c) => c.length > 1);

  const redirects = {};
  let retire = 0;
  console.log(
    `AI posts: ${posts.length} | clusters: ${clusters.length} | clusters with duplicates: ${dupClusters.length}`
  );
  for (const c of dupClusters) {
    const sorted = [...c].sort((a, b) => score(b) - score(a));
    const keep = sorted[0];
    const rest = sorted.slice(1);
    console.log(
      `\nKEEP   ${keep.id} ${String(keep.createdAt).slice(0, 10)} img=${hasImage(keep) ? 'y' : 'n'} len=${(keep.contentEn || '').length} | ${keep.title}`
    );
    for (const d of rest) {
      console.log(
        `  draft ${d.id} ${String(d.createdAt).slice(0, 10)} img=${hasImage(d) ? 'y' : 'n'} len=${(d.contentEn || '').length} | ${d.title}`
      );
      redirects[d.id] = keep.id;
      retire += 1;
    }
  }
  console.log(
    `\nPlan: keep ${dupClusters.length} posts, move ${retire} duplicates to draft, ${posts.length - retire} AI posts stay published.`
  );

  if (!APPLY) {
    console.log('\nDry run — re-run with --apply to perform the updates.');
    process.exit(0);
  }

  const ids = Object.keys(redirects);
  const [n] = await Blog.update({ status: 'draft' }, { where: { id: ids } });
  fs.writeFileSync(OUT, JSON.stringify(redirects, null, 2) + '\n');
  console.log(`\nUpdated ${n} rows to draft. Redirect map written to ${OUT}`);
  try {
    // EN: Tell IndexNow the list changed (the surviving posts keep their URLs).
    // BN: IndexNow-কে জানাই list বদলেছে (টিকে থাকা post-এর URL একই)।
    require('../helpers/indexnow').pingPaths(['/blog']);
  } catch {
    /* optional */
  }
  process.exit(0);
})().catch((e) => {
  console.error('dedupe failed:', e);
  process.exit(1);
});
