/**
 * EN: Lightweight server-side uptime check. Pings the three production URLs
 *     and emails admin once a target has FAILED_THRESHOLD consecutive misses
 *     (so a single network blip doesn't generate noise). Recovery is also
 *     emailed once. State (last status + consecutive failure count per URL)
 *     lives in /home/inochi/logs/uptime-state.json so cron runs are stateful
 *     across invocations.
 * BN: Lightweight server-side uptime check। তিনটা production URL ping করে এবং
 *     যেকোনো target FAILED_THRESHOLD বার consecutive miss করলে admin-কে email
 *     করে (single network blip-এ noise না)। Recovery-ও একবার email হয়। State
 *     (per-URL last status + consecutive failure count) /home/inochi/logs/
 *     uptime-state.json-এ — cron run-এর মধ্যে stateful।
 *
 *     Run via cron:  * /5 * * * *  cd /home/inochi/back-end && node scripts/uptime-check.js
 */

require('dotenv').config({ path: '/home/inochi/back-end/.env' });
const fs = require('fs');
const path = require('path');
const mailer = require('../helpers/mailer');

const TARGETS = [
  { name: 'web', url: 'https://inochieducation.com/' },
  { name: 'api', url: 'https://api.inochieducation.com/api/branches' },
  { name: 'admin', url: 'https://admin.inochieducation.com/' },
];

// EN: Email after this many consecutive failures — keeps single-blip noise out.
// BN: এতগুলো consecutive failure-এর পর email — single blip noise বাঁচায়।
const FAILED_THRESHOLD = 2;
const TIMEOUT_MS = 12_000;
const STATE_FILE = '/home/inochi/logs/uptime-state.json';
const LOG_FILE = '/home/inochi/logs/uptime-check.log';

const log = (line) => {
  const stamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `${stamp} ${line}\n`);
};

// EN: AbortController-backed fetch so a hung request doesn't tie up the cron.
// BN: AbortController-backed fetch — hung request cron আটকায় না।
async function ping(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {}
  return {};
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function notifyDown(target, status) {
  const subject = `[Inochi Uptime] DOWN — ${target.name}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0F2D52;">
      <h2 style="margin-top:0">⚠ ${target.name} is DOWN</h2>
      <p><strong>URL:</strong> <a href="${target.url}">${target.url}</a></p>
      <p><strong>Last status:</strong> ${status}</p>
      <p><strong>When:</strong> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</p>
      <p>Failed ${FAILED_THRESHOLD}+ consecutive checks. Investigate via PM2:</p>
      <pre style="background:#f0fafc;padding:10px;border-radius:6px;font-family:monospace;font-size:12px;">pm2 status
pm2 logs inochi-${target.name === 'web' ? 'web' : target.name === 'api' ? 'api' : 'admin'} --lines 50</pre>
      <p style="font-size:11px;color:#94a3b8">A recovery email will follow once the target responds again.</p>
    </div>`;
  await mailer.send
    ? mailer.send({ to: process.env.ADMIN_EMAIL || process.env.SMTP_USER, subject, html })
    : sendDirect(subject, html);
}

async function notifyUp(target, downSince) {
  const subject = `[Inochi Uptime] RECOVERED — ${target.name}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0F2D52;">
      <h2 style="margin-top:0;color:#0a8a0a">✓ ${target.name} is back UP</h2>
      <p><strong>URL:</strong> <a href="${target.url}">${target.url}</a></p>
      <p><strong>Down since:</strong> ${downSince}</p>
      <p><strong>Recovered at:</strong> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</p>
    </div>`;
  await sendDirect(subject, html);
}

// EN: Direct send via the existing mailer helper. We import nodemailer paths
//     indirectly through helpers/mailer.js which already configures SMTP.
// BN: helpers/mailer.js (যেটা SMTP configure করা) দিয়ে direct send।
async function sendDirect(subject, html) {
  const nodemailer = require('nodemailer');
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    log('skip-email: smtp-not-configured');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `Inochi Uptime <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject,
      html,
    });
  } catch (err) {
    log(`email-fail: ${err.message}`);
  }
}

(async () => {
  const state = loadState();
  for (const target of TARGETS) {
    const result = await ping(target.url);
    const prev = state[target.name] || { ok: true, fails: 0 };
    if (result.ok) {
      // EN: Recovery: was DOWN long enough that we emailed → tell admin we're back.
      // BN: Recovery: যথেষ্ট DOWN ছিল যে email গিয়েছিল → admin-কে up জানাই।
      if (prev.fails >= FAILED_THRESHOLD) {
        log(`${target.name}: RECOVERED (was failing ${prev.fails}× since ${prev.downSince})`);
        await notifyUp(target, prev.downSince || 'unknown');
      } else if (!prev.ok) {
        log(`${target.name}: ok again (${result.status})`);
      }
      state[target.name] = { ok: true, status: result.status, fails: 0 };
    } else {
      const fails = (prev.fails || 0) + 1;
      const downSince = prev.downSince || new Date().toISOString();
      log(`${target.name}: FAIL #${fails} status=${result.status} ${result.error || ''}`);
      // EN: Email exactly once when we cross the threshold; subsequent failures stay quiet.
      // BN: Threshold cross-এর সময় ঠিক একবার email; পরের failure-এ চুপ।
      if (fails === FAILED_THRESHOLD) {
        await notifyDown(target, result.status || result.error);
      }
      state[target.name] = { ok: false, status: result.status, fails, downSince };
    }
  }
  saveState(state);
})().catch((err) => {
  log(`fatal: ${err.message}`);
  process.exit(1);
});
