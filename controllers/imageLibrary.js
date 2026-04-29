const cloudinary = require('cloudinary').v2;

// EN: Cloudinary credentials are already configured in userAuth.js, but
//     re-applying here keeps this controller self-contained — if userAuth
//     is later moved or removed, the image library still works.
// BN: Cloudinary credential userAuth.js-এ already configured, কিন্তু এখানেও
//     re-apply — userAuth সরিয়ে নিলেও image library কাজ করবে।
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// EN: List images from Cloudinary so admin can browse + reuse instead of
//     re-uploading the same asset. Uses the search API which paginates via
//     `next_cursor`. Returns minimal fields to keep the payload small.
//     Optional ?q= search filter (Cloudinary search expression: filename
//     match, tag match, folder, etc.).
// BN: Cloudinary থেকে image list — admin re-upload না করে browse + reuse
//     করতে পারে। Search API ব্যবহার, `next_cursor` দিয়ে paginate। Payload
//     ছোট রাখতে minimal field। Optional ?q= search (Cloudinary search
//     expression: filename match, tag, folder ইত্যাদি)।
exports.listImages = async (req, res) => {
  try {
    const max = Math.min(Number(req.query.max) || 60, 100);
    const cursor = req.query.cursor || undefined;
    const q = (req.query.q || '').trim();

    let expression = 'resource_type:image';
    if (q) {
      // EN: Match filename or tag — covers the common admin search intent.
      // BN: Filename বা tag match — সাধারণ admin search intent কভার করে।
      expression += ` AND (filename:*${q}* OR tags=${q})`;
    }

    const result = await cloudinary.search
      .expression(expression)
      .sort_by('created_at', 'desc')
      .max_results(max)
      .next_cursor(cursor)
      .execute();

    const resources = (result.resources || []).map((r) => ({
      url: r.secure_url,
      publicId: r.public_id,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      format: r.format,
      filename: r.filename || r.public_id?.split('/').pop() || '',
      createdAt: r.created_at,
    }));

    res.json({
      resources,
      nextCursor: result.next_cursor || null,
      total: result.total_count || resources.length,
    });
  } catch (err) {
    console.error('Cloudinary list error:', err);
    res.status(500).json({ error: 'Could not list images', detail: err.message });
  }
};
