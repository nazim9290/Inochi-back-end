// EN: Admin IndexNow routes — diagnostics + a one-click "resubmit everything"
//     action. Auto-pings on publish already keep fresh content indexed; this
//     resubmit is for the initial submission and for after bulk/structural
//     changes. Both are admin-only.
// BN: Admin IndexNow route — diagnostics + এক-ক্লিকে "সব আবার জমা দাও"
//     action। Publish-এ auto-ping তো fresh content index রাখেই; এই resubmit
//     প্রথমবারের submission আর bulk/structural পরিবর্তনের পরের জন্য। দুটোই
//     admin-only।

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const indexnow = require('../helpers/indexnow');

const router = express.Router();

// EN: Is IndexNow configured, and where is the key expected?
// BN: IndexNow configured কিনা, এবং key কোথায় থাকার কথা?
router.get('/indexnow/status', requireAuth, checkAdmin, (req, res) => {
  res.json(indexnow.status());
});

// EN: Read every URL from the live sitemap.xml and submit them all to
//     IndexNow. Returns how many were submitted.
// BN: live sitemap.xml থেকে প্রতিটা URL পড়ে সব IndexNow-এ submit করে।
//     কতগুলো submit হলো তা return করে।
router.post('/indexnow/resubmit', requireAuth, checkAdmin, async (req, res) => {
  const result = await indexnow.resubmitFromSitemap();
  if (!result.ok) return res.status(502).json(result);
  res.json({ message: `Submitted ${result.count} URL(s) to IndexNow`, ...result });
});

module.exports = router;
