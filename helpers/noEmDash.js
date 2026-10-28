/**
 * EN: Remove em dashes (—, U+2014) from public copy. The site avoids them as
 *     a style rule: they read as machine-written. Same rules the frontend
 *     codemod used, so DB text and code text end up consistent:
 *       - a pair in one sentence (an aside) → commas
 *       - a single dash → colon, or comma when the next word continues the
 *         clause ("…, backed by", "…, including")
 *       - next to Japanese text → 、 ; digit—digit → en dash (–)
 *       - a lone "—" placeholder → "-"
 *     Works on plain text and HTML (only text characters are touched).
 * BN: Public লেখা থেকে em dash (—, U+2014) সরায়। Site-এর style rule: em dash
 *     যন্ত্রে-লেখা মনে হয়। Frontend codemod-এর একই নিয়ম, যাতে DB আর code-এর
 *     লেখা একরকম থাকে: বাক্যে জোড়া → কমা; একক → কোলন (পরের শব্দ বাক্য চালিয়ে
 *     গেলে কমা); জাপানি লেখার পাশে → 、 ; সংখ্যা—সংখ্যা → en dash; শুধু "—"
 *     → "-"। Plain text আর HTML দুটোতেই চলে।
 */

const DASH = '—';
const CJK = /[぀-ヿ㐀-鿿＀-￯]/;
const CONTINUES =
  /^(and|or|but|so|which|who|that|including|backed|plus|not|with|without|from|for|as|by|than|then|even|all|in|on|at|to|before|after)$/i;

function fixSentence(sent, titleLike) {
  const n = (sent.match(/—/g) || []).length;
  return sent.replace(/\s*—\s*/g, (m, off, str) => {
    const before = str.slice(Math.max(0, off - 2), off);
    const rest = str.slice(off + m.length);
    if (CJK.test(before) || CJK.test(rest.slice(0, 2))) return '、';
    const next = (rest.replace(/^<[^>]+>/, '').match(/^[^\s,.;:<]+/) || [''])[0];
    const continues = CONTINUES.test(next) || /^[a-z]+(ing|ed)$/.test(next);
    if (n >= 2 || continues) return ', ';
    if (titleLike) return ': ';
    if (str.slice(0, off).includes(':')) return ', ';
    return ': ';
  });
}

function removeEmDash(text, { titleLike = false } = {}) {
  if (typeof text !== 'string' || !text.includes(DASH)) return text;
  if (text.trim() === DASH) return text.replace(DASH, '-');
  let out = text
    .replace(/(\d)\s*—\s*(\d)/g, '$1–$2')
    .replace(/(^|>)(\s*)—\s*/g, '$1$2')
    .replace(/\s*—(\s*)(<|$)/g, '$1$2');
  // EN: Split into sentences but keep the separators, so HTML whitespace
  //     and line breaks survive untouched.
  // BN: বাক্যে ভাগ করি কিন্তু separator রেখে — HTML-এর whitespace আর
  //     line break অক্ষত থাকে।
  const parts = out.split(/((?<=[.!?।。])\s+|<\/?(?:p|li|h[1-6]|br|div)[^>]*>)/);
  out = parts.map((p, i) => (i % 2 === 0 ? fixSentence(p, titleLike) : p)).join('');
  return out
    .replace(/,\s*([,.;:!?)])/g, '$1')
    .replace(/:\s*([,.;:!?)])/g, '$1')
    .replace(/、\s*([、。])/g, '$1')
    .replace(/\(\s*,\s*/g, '(');
}

const TITLE_FIELD =
  /^(title|titleEn|titleJa|name|nameEn|nameJa|heading|label|tagline|taglineEn|taglineJa|caption|captionEn|captionJa)$/;

// EN: Deep version for JSON columns and whole rows: strings anywhere inside
//     arrays/objects are cleaned; `field` decides the title rule.
// BN: JSON column আর পুরো row-এর জন্য deep version: array/object-এর ভেতরের
//     যেকোনো string পরিষ্কার হয়; `field` title নিয়ম ঠিক করে।
function removeEmDashDeep(value, field = '') {
  if (typeof value === 'string') return removeEmDash(value, { titleLike: TITLE_FIELD.test(field) });
  if (Array.isArray(value)) return value.map((v) => removeEmDashDeep(v, field));
  if (value && typeof value === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(value)) o[k] = removeEmDashDeep(v, k);
    return o;
  }
  return value;
}

module.exports = { removeEmDash, removeEmDashDeep };
