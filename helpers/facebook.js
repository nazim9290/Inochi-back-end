// Facebook Graph API helper. Uses native fetch (Node 18+); no SDK needed.
// All credentials live in `site_settings` so the admin can change page/token
// without redeploying.

const { SiteSettings } = require('../models');

const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v19.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const getSettings = async () => {
  const settings = await SiteSettings.findOne();
  return settings || null;
};

// Public — caller passes blog metadata. We compose a friendly message and
// call /<page_id>/feed. Returns {ok:true, postId} on success.
exports.postBlogToPage = async ({ title, summary, blogUrl, imageUrl }) => {
  const s = await getSettings();
  if (!s?.fbPageId || !s?.fbPageAccessToken) {
    return { ok: false, reason: 'fb-not-configured' };
  }
  if (!s.fbAutoPostBlogs) {
    return { ok: false, reason: 'fb-auto-post-disabled' };
  }

  const message = [title, summary, blogUrl].filter(Boolean).join('\n\n');

  // /feed accepts {message, link} for link posts. With imageUrl, /photos works
  // for an image post — we use /feed because link previews drive more clicks.
  try {
    const res = await fetch(`${GRAPH_BASE}/${s.fbPageId}/feed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message,
        link: blogUrl,
        access_token: s.fbPageAccessToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('FB API error:', data);
      return { ok: false, reason: data.error?.message || 'graph-error', detail: data };
    }
    return { ok: true, postId: data.id };
  } catch (err) {
    console.error('FB post failed:', err);
    return { ok: false, reason: err.message };
  }
};

// Manual post — same payload but bypasses the auto-post toggle so the admin
// can publish on demand even if auto-post is off.
exports.postManually = async ({ title, summary, blogUrl, imageUrl }) => {
  const s = await getSettings();
  if (!s?.fbPageId || !s?.fbPageAccessToken) {
    return { ok: false, reason: 'fb-not-configured' };
  }
  const message = [title, summary, blogUrl].filter(Boolean).join('\n\n');
  try {
    const res = await fetch(`${GRAPH_BASE}/${s.fbPageId}/feed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message,
        link: blogUrl,
        access_token: s.fbPageAccessToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, reason: data.error?.message || 'graph-error' };
    }
    return { ok: true, postId: data.id };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
};

// Quick health check the admin can hit to verify the token is still alive.
exports.checkToken = async () => {
  const s = await getSettings();
  if (!s?.fbPageId || !s?.fbPageAccessToken) {
    return { ok: false, reason: 'fb-not-configured' };
  }
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${s.fbPageId}?fields=id,name&access_token=${encodeURIComponent(s.fbPageAccessToken)}`
    );
    const data = await res.json();
    if (!res.ok) return { ok: false, reason: data.error?.message };
    return { ok: true, page: data };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
};
