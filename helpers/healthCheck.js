/**
 * EN: Daily site health check. Runs every morning (10:07 local, off-minute so
 *     multi-tenant deploys don't cluster), collects problems a non-technical
 *     admin must know about, and emails ADMIN_EMAIL in plain Bangla ONLY when
 *     something is wrong:
 *       1. Facebook Page token dead/expired → auto-posts silently stop.
 *       2. AI blog runs that FAILED in the last 24h (bad JSON, duplicate
 *          title, no unique topic...).
 *     A healthy day sends nothing — no inbox noise. `runHealthCheck` is also
 *     callable manually (used right after deploy to verify the pipeline).
 * BN: দৈনিক site health check। প্রতিদিন সকালে (১০:০৭ local) চলে, যে সমস্যাগুলো
 *     non-technical admin-এর জানা দরকার সেগুলো জড়ো করে, শুধু সমস্যা থাকলেই
 *     ADMIN_EMAIL-এ সহজ বাংলায় ইমেল পাঠায়:
 *       ১. Facebook Page token মরে গেলে → auto-post নিঃশব্দে বন্ধ হয়ে যায়।
 *       ২. গত ২৪ ঘণ্টায় ব্যর্থ AI blog run (ভাঙা JSON, duplicate title,
 *          unique topic নেই...)।
 *     সব ঠিক থাকলে কিছুই পাঠায় না — inbox-এ শব্দ নেই। `runHealthCheck`
 *     manually-ও ডাকা যায় (deploy-এর পর pipeline যাচাইয়ে ব্যবহার হয়)।
 */

const cron = require('node-cron');
const { Op } = require('sequelize');

const esc = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// EN: Gather issues. Each item: { title, detail } (detail is HTML-safe here).
// BN: সমস্যা জড়ো করা। প্রতিটা item: { title, detail } (detail HTML-safe)।
async function collectIssues() {
  const issues = [];

  // 1) Facebook Page token — only when FB is configured at all.
  try {
    const { SiteSettings } = require('../models');
    const s = await SiteSettings.findOne();
    if (s?.fbPageId && s?.fbPageAccessToken) {
      const fb = await require('./facebook').checkToken();
      if (!fb.ok) {
        issues.push({
          title: 'Facebook auto-post বন্ধ — token কাজ করছে না',
          detail:
            `Facebook বলছে: <em>${esc(fb.reason || 'unknown error')}</em><br/>` +
            'সমাধান: Admin → Site Settings → Facebook Integration-এ নতুন ' +
            'Page Access Token বসিয়ে Save করুন, তারপর "সংযোগ পরীক্ষা করুন" ' +
            'বাটনে সবুজ ✅ দেখে নিন।',
        });
      }
    }
  } catch (err) {
    issues.push({
      title: 'Facebook চেক চালানো যায়নি',
      detail: esc(err.message),
    });
  }

  // 1.5) SMTP login — if this is broken, contact/booking notifications and
  //      newsletter double-opt-in confirm emails are silently failing too.
  try {
    const nodemailer = require('nodemailer');
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await t.verify().catch((err) => {
        issues.push({
          title: 'ইমেল পাঠানো বন্ধ — SMTP login ব্যর্থ',
          detail:
            `Mail server বলছে: <em>${esc(err.response || err.message)}</em><br/>` +
            'এর মানে contact/booking notification আর newsletter-এর confirm ' +
            'ইমেলও যাচ্ছে না। সমাধান: mailbox-এর সঠিক password VPS-এর ' +
            '<code>/home/inochi/back-end/.env</code>-এ SMTP_PASS-এ বসাতে হবে।',
        });
      });
    }
  } catch (err) {
    issues.push({ title: 'SMTP চেক চালানো যায়নি', detail: esc(err.message) });
  }

  // 2) AI blog failures in the last 24 hours.
  try {
    const { AiBlogRun } = require('../models');
    const failed = await AiBlogRun.findAll({
      where: {
        status: 'failed',
        createdAt: { [Op.gte]: new Date(Date.now() - 24 * 3600 * 1000) },
      },
      order: [['createdAt', 'DESC']],
      limit: 10,
    });
    if (failed.length) {
      issues.push({
        title: `AI blog: গত ২৪ ঘণ্টায় ${failed.length}টা run ব্যর্থ`,
        detail:
          failed
            .map(
              (f) =>
                `${f.createdAt.toISOString().slice(0, 16).replace('T', ' ')} — ${esc(
                  String(f.errorMessage || 'unknown').slice(0, 140)
                )}`
            )
            .join('<br/>') +
          '<br/><br/>বিস্তারিত: Admin → AI Blog → Run history। এক-আধটা ' +
          'ব্যর্থতা স্বাভাবিক (পরের slot-এ নিজে থেকেই পুষিয়ে নেয়); পরপর সব ' +
          'ব্যর্থ হলে জানাবেন।',
      });
    }
  } catch (err) {
    issues.push({ title: 'AI blog history পড়া যায়নি', detail: esc(err.message) });
  }

  return issues;
}

// EN: Run once. Emails only when there are issues (or notifyWhenHealthy).
// BN: একবার চালানো। শুধু সমস্যা থাকলে (বা notifyWhenHealthy দিলে) ইমেল যায়।
async function runHealthCheck({ notifyWhenHealthy = false } = {}) {
  const issues = await collectIssues();
  const mailer = require('./mailer');

  if (issues.length) {
    const html =
      '<p style="margin-top:0"><strong>আজকের স্বয়ংক্রিয় পরীক্ষায় নিচের সমস্যাগুলো ধরা পড়েছে:</strong></p>' +
      issues
        .map(
          (i) =>
            `<div style="margin:0 0 16px;padding:12px 14px;border-left:4px solid #e55d5d;background:#fdf3f3;border-radius:6px;">` +
            `<p style="margin:0 0 6px;font-weight:bold;color:#0F2D52;">⚠️ ${i.title}</p>` +
            `<p style="margin:0;font-size:13px;">${i.detail}</p></div>`
        )
        .join('') +
      '<p style="font-size:12px;color:#94a3b8;">এই ইমেল প্রতিদিন সকালে স্বয়ংক্রিয়ভাবে পরীক্ষা চালিয়ে শুধু সমস্যা পেলেই আসে।</p>';
    const mail = await mailer.sendAdminAlert({
      subject: `[Inochi সাইট] ⚠️ ${issues.length}টা সমস্যা ধরা পড়েছে`,
      title: 'দৈনিক স্বাস্থ্য-পরীক্ষা',
      html,
    });

    // EN: Dashboard fallback — ALWAYS drop the alert into the admin's contact
    //     list too. If SMTP itself is the broken thing, the email above can
    //     never arrive; this row is the only alert channel that still works.
    // BN: Dashboard fallback — alert-টা admin-এর contact list-এও সবসময় ফেলে
    //     রাখা। SMTP নিজেই ভাঙা থাকলে উপরের ইমেল কোনোদিন পৌঁছাবে না; তখন এই
    //     row-ই একমাত্র কার্যকর alert।
    try {
      const { Contact } = require('../models');
      await Contact.create({
        name: '⚠️ সাইট স্বাস্থ্য-পরীক্ষা (স্বয়ংক্রিয়)',
        email: 'system@inochieducation.com',
        phone: '',
        msg:
          `আজকের স্বয়ংক্রিয় পরীক্ষায় ${issues.length}টা সমস্যা ধরা পড়েছে:\n\n` +
          issues
            .map((i, n) => `${n + 1}. ${i.title}\n${i.detail.replace(/<[^>]+>/g, '')}`)
            .join('\n\n') +
          (mail?.sent ? '' : '\n\n(ইমেল alert পাঠানো যায়নি — এই বার্তাটাই একমাত্র নোটিশ।)'),
        source: 'System health check',
      });
    } catch (err) {
      console.error('[health] dashboard alert row failed:', err.message);
    }
  } else if (notifyWhenHealthy) {
    await mailer.sendAdminAlert({
      subject: '[Inochi সাইট] ✅ দৈনিক পরীক্ষা — সব ঠিক আছে',
      title: 'দৈনিক স্বাস্থ্য-পরীক্ষা',
      html:
        '<p style="margin-top:0">✅ <strong>সব ঠিক আছে।</strong></p>' +
        '<p>যা যা পরীক্ষা হয়েছে: Facebook auto-post সংযোগ, AI blog-এর গত ২৪ ঘণ্টার run।</p>' +
        '<p style="font-size:12px;color:#94a3b8;">এখন থেকে প্রতিদিন সকালে এই পরীক্ষা নিজে নিজে চলবে — সমস্যা পেলে তবেই ইমেল পাবেন, নইলে চুপ থাকবে।</p>',
    });
  }
  return issues;
}

// EN: Schedule the daily run. Called once from app.js after listen.
// BN: দৈনিক run schedule করা। app.js listen-এর পরে একবার ডাকে।
function startHealthCheck() {
  cron.schedule('7 10 * * *', async () => {
    try {
      const issues = await runHealthCheck();
      console.log(`[health] daily check done — ${issues.length} issue(s)`);
    } catch (err) {
      console.error('[health] daily check threw:', err);
    }
  });
  console.log('[health] daily site health check scheduled at 10:07 local');
}

module.exports = { startHealthCheck, runHealthCheck, collectIssues };
