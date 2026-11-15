/**
 * EN: One Google-review request per success story. When a published story has
 *     a private studentEmail and SiteSettings.googleReviewUrl is filled in, the
 *     student gets one short Bangla+English email; reviewRequestedAt makes sure
 *     it never goes twice. Reviews feed Google Business Profile, which AI
 *     answers and Maps read as third-party proof (GEO).
 * BN: Success story-প্রতি একটাই Google রিভিউ অনুরোধ। Publish হওয়া story-তে
 *     গোপন studentEmail থাকলে আর SiteSettings.googleReviewUrl ভরা থাকলে ছাত্র
 *     একটা ছোট বাংলা+ইংরেজি ইমেইল পায়; reviewRequestedAt থাকায় দ্বিতীয়বার যায়
 *     না। রিভিউ Google Business Profile-এ জমে, যা AI উত্তর ও Maps বাইরের প্রমাণ
 *     হিসেবে পড়ে (GEO)।
 */

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i;

const esc = (s) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function maybeRequestReview(storyId) {
  const { SuccessStory, SiteSettings } = require('../models');
  const story = await SuccessStory.unscoped().findByPk(storyId);
  if (!story || story.published === false || story.reviewRequestedAt) return { sent: false, reason: 'not eligible' };
  const to = String(story.studentEmail || '').trim();
  if (!EMAIL_RE.test(to)) return { sent: false, reason: 'no valid email' };
  const settings = await SiteSettings.findOne();
  const url = String(settings?.googleReviewUrl || '').trim();
  if (!/^https:\/\//.test(url)) return { sent: false, reason: 'googleReviewUrl not set' };

  const mailer = require('./mailer');
  const name = esc(story.studentName);
  const html =
    `<p>প্রিয় ${name},</p>` +
    '<p>জাপানে আপনার নতুন যাত্রার জন্য Inochi পরিবারের পক্ষ থেকে অভিনন্দন! আমাদের সাথে আপনার অভিজ্ঞতা কেমন ছিল, ' +
    'Google-এ দুই লাইনে লিখে দিলে পরের ছাত্ররা সঠিক সিদ্ধান্ত নিতে পারবে। এতে এক মিনিটও লাগবে না।</p>' +
    `<p style="text-align:center;margin:24px 0"><a href="${esc(url)}" style="background:#0F2D52;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Google-এ রিভিউ লিখুন</a></p>` +
    `<p style="color:#64748b;font-size:13px">Dear ${name}, congratulations on your new start in Japan! If you have a minute, a short Google review of your experience with Inochi helps the next students choose well.</p>` +
    '<p>ধন্যবাদ,<br/>Inochi Global Education Institute</p>';
  const r = await mailer.sendMail({
    to,
    subject: 'আপনার অভিজ্ঞতা জানাবেন? / A quick review for Inochi',
    html: mailer.brandWrap('ধন্যবাদ, আর একটা ছোট অনুরোধ', html),
    replyTo: 'inochiedu@gmail.com',
  });
  if (!r || !r.sent) return { sent: false, reason: (r && r.reason) || 'mail failed' };
  await story.update({ reviewRequestedAt: new Date() });
  return { sent: true };
}

module.exports = { maybeRequestReview, EMAIL_RE };
