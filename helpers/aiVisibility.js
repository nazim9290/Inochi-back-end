/**
 * EN: Monthly AI-answer visibility check (GEO measurement). Asks Claude, with
 *     live web search, the questions real Bangladeshi
 *     students ask about going to Japan, then records whether the answer
 *     names Inochi and whether inochieducation.com is cited. Emails the admin
 *     a Bangla report with the score, last month's score and the sites that
 *     ARE being cited instead. History: logs/ai-visibility.jsonl.
 *     Manual run: node -e "require('dotenv').config();require('./helpers/aiVisibility').runAiVisibility().then(r=>console.log(r.score))"
 * BN: মাসিক AI-উত্তরে উপস্থিতি পরীক্ষা (GEO মাপা)। বাংলাদেশি ছাত্ররা জাপান
 *     নিয়ে যে প্রশ্ন করে, সেগুলো Claude-কে (live web search
 *     সহ) জিজ্ঞেস করে দেখে উত্তরে Inochi-র নাম আছে কি না, আর
 *     inochieducation.com উদ্ধৃত হয়েছে কি না। Admin-কে বাংলায় রিপোর্ট পাঠায়:
 *     স্কোর, গত মাসের স্কোর, আর Inochi-র বদলে কোন সাইট উদ্ধৃত হচ্ছে।
 *     ইতিহাস: logs/ai-visibility.jsonl।
 */

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-5-5';
const HISTORY = path.join(__dirname, '..', 'logs', 'ai-visibility.jsonl');
const OUR_DOMAIN = 'inochieducation.com';

// EN: Questions people really type. Never mention Inochi here, or the test
//     measures nothing. Keep the list stable so months stay comparable.
// BN: মানুষ আসলেই যা লেখে। এখানে Inochi-র নাম কখনো নয়, নইলে পরীক্ষা অর্থহীন।
//     তালিকা স্থির রাখুন যাতে মাসে মাসে তুলনা করা যায়।
const QUESTIONS = [
  'Best Japan study abroad agency in Dhaka?',
  'Which consultancy should I use to study in Japan from Bangladesh?',
  'How much does it cost to study in Japan from Bangladesh in 2026?',
  'Japan student visa requirements for Bangladeshi students',
  'How to go to Japan from Bangladesh as a student',
  'Can I study in Japan without IELTS from Bangladesh?',
  'Study in Japan after HSC from Bangladesh',
  'Japanese language school fees in Japan for Bangladeshi students',
  'Japan vs Korea vs Germany for Bangladeshi students, which is better?',
  'How many Bangladeshi students are studying in Japan?',
  'Japanese language course in Dhaka for student visa',
  'Specified Skilled Worker (SSW) visa Japan from Bangladesh process',
  'Japan student visa rejection reasons for Bangladeshi applicants',
  'Japan study agency in Narayanganj or Barishal',
  'জাপানে পড়তে যাওয়ার জন্য ঢাকায় ভালো এজেন্সি কোনটা?',
  'বাংলাদেশ থেকে জাপানে পড়তে যেতে কত টাকা লাগে?',
  'জাপান স্টুডেন্ট ভিসার জন্য কী কী কাগজ লাগে?',
  'আইইএলটিএস ছাড়া কি জাপানে পড়া যায়?',
  'জাপানে পার্ট টাইম কাজ করে কত আয় করা যায়?',
  'জাপান যাওয়ার জন্য কোন কনসালটেন্সি বিশ্বস্ত, কীভাবে বুঝবো?',
];

const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// EN: Pure scoring of one API response (exported for tests).
// BN: একটা API response-এর স্কোর বের করা, pure function (test-এর জন্য export)।
function scoreAnswer(content = []) {
  const text = content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const cited = new Set();
  for (const b of content) {
    if (b.type === 'text') for (const c of b.citations || []) cited.add(hostOf(c.url));
  }
  cited.delete('');
  return {
    mentioned: /inochi|ইনোচি|イノチ/i.test(text),
    cited: cited.has(OUR_DOMAIN),
    domains: [...cited],
  };
}

async function ask(question) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 8000,
      output_config: { effort: 'low' },
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: 3,
          // EN: No user_location: the API rejects country "BD" (400); the questions name Bangladesh.
          // BN: user_location নেই: API "BD" country নেয় না (400); প্রশ্নেই বাংলাদেশ লেখা।
        },
      ],
      // EN: Mimic an AI search assistant; without this, low effort answers from memory and never searches.
      // BN: AI search assistant-এর মতো আচরণ; এটা ছাড়া low effort-এ সার্চই করে না।
      system:
        'You are a search assistant. Search the web before answering and base the answer on what you find. ' +
        'When the user asks which organisation or service to use, name the specific options you found.',
      messages: [{ role: 'user', content: question }],
    }),
    signal: AbortSignal.timeout(180 * 1000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  // shortcut: a pause_turn answer is scored as-is (no resume), fine for a trend metric.
  return scoreAnswer((await res.json()).content);
}

function lastRun() {
  try {
    const lines = fs.readFileSync(HISTORY, 'utf8').trim().split('\n');
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

async function runAiVisibility({ email = true } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');
  const prev = lastRun();
  const rows = [];
  for (const q of QUESTIONS) {
    try {
      rows.push({ q, ...(await ask(q)) });
    } catch (err) {
      rows.push({ q, error: err.message, mentioned: false, cited: false, domains: [] });
    }
  }
  const score = rows.filter((r) => r.mentioned || r.cited).length;
  const tally = {};
  for (const r of rows) for (const d of r.domains) tally[d] = (tally[d] || 0) + 1;
  const top = Object.entries(tally)
    .filter(([d]) => d !== OUR_DOMAIN)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const run = { date: new Date().toISOString().slice(0, 10), model: AI_MODEL, score, total: rows.length, top, rows };

  fs.mkdirSync(path.dirname(HISTORY), { recursive: true });
  fs.appendFileSync(HISTORY, JSON.stringify(run) + '\n');

  if (email) {
    const esc = (s) =>
      String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const mark = (r) => (r.error ? '⚠️ ত্রুটি' : r.cited ? '✅ লিংকসহ' : r.mentioned ? '🟡 শুধু নাম' : '❌ নেই');
    const html =
      `<p style="margin-top:0">AI-এর উত্তরে Inochi এসেছে <strong>${score}/${rows.length}</strong> প্রশ্নে` +
      (prev ? ` (গত বার ${esc(prev.score)}/${esc(prev.total)}, ${esc(prev.date)})` : '') +
      '।</p><table style="border-collapse:collapse;font-size:13px">' +
      rows.map((r) => `<tr><td style="padding:3px 8px">${mark(r)}</td><td style="padding:3px 8px">${esc(r.q)}</td></tr>`).join('') +
      '</table><p><strong>Inochi-র বদলে যেসব সাইট উদ্ধৃত হচ্ছে:</strong><br/>' +
      (top.map(([d, n]) => `${esc(d)} (${n})`).join(', ') || 'কোনোটা নয়') +
      '</p><p style="font-size:12px;color:#94a3b8;">প্রতি মাসের ১ তারিখে Claude (web search) দিয়ে স্বয়ংক্রিয় পরীক্ষা। ' +
      'এই সাইটগুলোতে Inochi-র উল্লেখ বা লেখা পৌঁছাতে পারলে স্কোর বাড়বে।</p>';
    await require('./mailer').sendAdminAlert({
      subject: `[Inochi সাইট] AI-উত্তরে উপস্থিতি: ${score}/${rows.length}`,
      title: 'মাসিক GEO রিপোর্ট',
      html,
    });
  }
  return run;
}

// EN: 1st of every month, 11:23 (after the 10:07 health check).
// BN: প্রতি মাসের ১ তারিখ, ১১:২৩ (১০:০৭-এর health check-এর পরে)।
function startAiVisibility() {
  if (!process.env.ANTHROPIC_API_KEY) return;
  cron.schedule('23 11 1 * *', () =>
    runAiVisibility()
      .then((r) => console.log(`[geo] AI visibility ${r.score}/${r.total}`))
      .catch((err) => console.error('[geo] AI visibility failed:', err.message))
  );
  console.log('[geo] monthly AI visibility check scheduled (1st, 11:23)');
}

module.exports = { startAiVisibility, runAiVisibility, scoreAnswer, QUESTIONS };
