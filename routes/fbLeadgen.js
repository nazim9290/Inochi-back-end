// EN: Facebook Lead Ads webhook. Two endpoints under /api:
//       GET  /api/fb-leadgen  — one-time verify handshake when you subscribe
//                               the webhook in the Meta App dashboard.
//       POST /api/fb-leadgen  — Meta posts here on every new Instant-Form lead;
//                               we fetch + store it as a Contact (source tag
//                               "Facebook Lead Ad") so it shows in the admin
//                               Contacts inbox alongside website leads.
//     Activation needs (admin side): a Meta App webhook subscribed to the Page
//     "leadgen" topic with this callback URL + FB_LEADGEN_VERIFY_TOKEN, and a
//     Page access token saved in Site Settings (same token as blog auto-post).
// BN: Facebook Lead Ads webhook। /api-এর নিচে দুটি endpoint:
//       GET  /api/fb-leadgen  — Meta App-এ webhook subscribe করার সময়ের
//                               একবারের verify handshake।
//       POST /api/fb-leadgen  — নতুন Instant-Form lead এলে Meta এখানে POST করে;
//                               আমরা সেটা এনে Contact হিসেবে store করি
//                               (source "Facebook Lead Ad") — অ্যাডমিন Contacts
//                               ইনবক্সে website lead-এর পাশেই দেখা যায়।
//     চালু করতে (admin side): Meta App-এ Page "leadgen" topic-এ এই callback URL
//     + FB_LEADGEN_VERIFY_TOKEN দিয়ে webhook subscribe, আর Site Settings-এ Page
//     access token (ব্লগ auto-post-এর একই token)।

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { Contact } = require('../models');
const { fetchAndMapLead } = require('../helpers/facebookLeadAds');
const mailer = require('../helpers/mailer');

// EN: Verify Meta's X-Hub-Signature-256 (HMAC-SHA256 of the raw body with the
//     App Secret). Enforced when FB_APP_SECRET is set — set it to fully lock the
//     endpoint. If unset we skip (the verify-token handshake gates subscription,
//     leadgen_id is strictly numeric, and forged ids fail the Graph fetch, so a
//     spoofed POST can't inject data). Constant-time compare; length-guarded.
// BN: Meta-র X-Hub-Signature-256 (raw body-র HMAC-SHA256, App Secret দিয়ে) যাচাই।
//     FB_APP_SECRET সেট থাকলে enforce — endpoint পুরোপুরি lock করতে এটা সেট করুন।
//     না থাকলে skip (verify-token handshake subscription আটকায়, leadgen_id কঠোর
//     numeric, জাল id Graph fetch-এ fail করে — তাই spoofed POST ডেটা inject পারে না)।
function verifySignature(req) {
  const secret = process.env.FB_APP_SECRET || '';
  if (!secret) return true; // not configured → graceful skip
  const sig = req.get('X-Hub-Signature-256') || '';
  if (!sig || !req.rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// EN: Verify handshake — Meta sends hub.mode/hub.verify_token/hub.challenge.
//     Echo the challenge only when the token matches our configured secret.
// BN: Verify handshake — Meta hub.mode/hub.verify_token/hub.challenge পাঠায়।
//     token মিললে তবেই challenge echo করি।
router.get('/fb-leadgen', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = process.env.FB_LEADGEN_VERIFY_TOKEN || '';
  if (mode === 'subscribe' && expected && token === expected) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// EN: Lead receiver. Ack 200 immediately (Meta retries on slow/non-200), then
//     process each leadgen change best-effort. A forged POST is harmless: an
//     invalid leadgen_id simply fails the Graph fetch and nothing is stored.
// BN: Lead receiver। আগে 200 ack (Meta slow/non-200-এ retry করে), তারপর প্রতিটি
//     leadgen change best-effort process। জাল POST ক্ষতিকর নয়: ভুল leadgen_id-তে
//     Graph fetch fail করে, কিছুই store হয় না।
router.post('/fb-leadgen', async (req, res) => {
  // EN: Reject spoofed payloads before doing any work (when App Secret is set).
  // BN: কোনো কাজের আগেই spoofed payload reject (App Secret সেট থাকলে)।
  if (!verifySignature(req)) return res.sendStatus(403);
  res.sendStatus(200);
  try {
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const ch of changes) {
        if (ch.field !== 'leadgen') continue;
        const leadgenId = ch.value && ch.value.leadgen_id;
        if (!leadgenId) continue;
        const r = await fetchAndMapLead(leadgenId);
        if (!r.ok) {
          console.error('[fb-leadgen] fetch failed:', r.reason);
          continue;
        }
        await Contact.create(r.lead);
        // EN: Notify admin like a website contact (fire-and-forget).
        // BN: website contact-এর মতই admin notify (fire-and-forget)।
        if (typeof mailer.notifyContact === 'function') {
          mailer.notifyContact(r.lead).catch((e) => console.error('[fb-leadgen] notify:', e.message));
        }
        console.log('[fb-leadgen] lead saved:', r.lead.name);
      }
    }
  } catch (err) {
    console.error('[fb-leadgen] processing error:', err.message);
  }
});

module.exports = router;
