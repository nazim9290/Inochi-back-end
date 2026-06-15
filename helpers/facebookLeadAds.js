// EN: Facebook Lead Ads helper. When someone submits a Meta Instant Form, Meta
//     sends a webhook with a `leadgen_id`; we fetch the full lead from the
//     Graph API using the Page access token stored in site_settings (the SAME
//     token that powers blog auto-post), then map Graph `field_data` into our
//     Contact shape so the lead lands in the admin inbox with a "Facebook Lead
//     Ad" source tag. Returns {ok, lead} or {ok:false, reason}; never throws.
// BN: Facebook Lead Ads helper. কেউ Meta Instant Form submit করলে Meta একটা
//     `leadgen_id` সহ webhook পাঠায়; site_settings-এ রাখা Page access token
//     (ব্লগ auto-post-এর একই token) দিয়ে Graph API থেকে পূর্ণ lead এনে
//     `field_data` আমাদের Contact shape-এ map করি — lead অ্যাডমিন ইনবক্সে
//     "Facebook Lead Ad" source ট্যাগসহ আসে। কখনো throw করে না।

const { SiteSettings } = require('../models');

const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v19.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// EN: First non-empty value among the given field names (case-insensitive).
// BN: দেওয়া field name-গুলোর মধ্যে প্রথম non-empty value (case-insensitive)।
function pick(fieldData, ...names) {
  for (const n of names) {
    const f = fieldData.find((x) => String(x.name || '').toLowerCase() === n);
    if (f && Array.isArray(f.values) && f.values.length) return String(f.values[0]).trim();
  }
  return '';
}

exports.fetchAndMapLead = async (leadgenId) => {
  // EN: leadgen_id is attacker-controllable (it arrives in the webhook POST).
  //     Reject anything that isn't a plain numeric id so it can't inject extra
  //     path segments / query params into the Graph URL (SSRF / path injection).
  // BN: leadgen_id attacker-controllable (webhook POST-এ আসে)। numeric ছাড়া কিছু
  //     reject করি যাতে Graph URL-এ বাড়তি path/query inject করা না যায় (SSRF)।
  if (!/^[0-9]{1,32}$/.test(String(leadgenId || ''))) {
    return { ok: false, reason: 'bad-leadgen-id' };
  }

  const s = await SiteSettings.findOne();
  const token = s?.fbPageAccessToken;
  if (!token) return { ok: false, reason: 'fb-not-configured (no Page access token in Site Settings)' };

  try {
    // EN: Token in the Authorization header (not the query string) so it never
    //     lands in proxy / access logs.
    // BN: token Authorization header-এ (query string-এ নয়) — proxy/access log-এ
    //     যাতে না যায়।
    const res = await fetch(`${GRAPH_BASE}/${leadgenId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, reason: data.error?.message || 'graph-error' };

    const fd = Array.isArray(data.field_data) ? data.field_data : [];
    const fullName = pick(fd, 'full_name') || `${pick(fd, 'first_name')} ${pick(fd, 'last_name')}`.trim();
    const summary = fd.map((f) => `${f.name}: ${(f.values || []).join(', ')}`).join('\n');

    return {
      ok: true,
      lead: {
        name: (fullName || 'Facebook Lead').slice(0, 200),
        email: pick(fd, 'email').slice(0, 200),
        phone: pick(fd, 'phone_number', 'phone').slice(0, 50),
        msg: (summary || 'Facebook Lead Ad submission').slice(0, 4000),
        source: 'Facebook Lead Ad',
        attribution: `leadgen_id=${leadgenId}${data.form_id ? ' | form_id=' + data.form_id : ''}`.slice(0, 600),
      },
    };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
};
