const { Review } = require('../models');
const { notifyReview } = require('../helpers/mailer');
const { logAudit } = require('../helpers/audit');

const ALLOWED_STATUSES = ['pending', 'approved', 'rejected'];

// EN: Strip private fields (email, phone, adminNotes) before serving to the
//     public site. The full row is fine for admin endpoints.
// BN: Public site-এ পাঠানোর আগে private field (email, phone, adminNotes)
//     বাদ দেই। Admin endpoint-এ পুরা row ঠিক আছে।
function publicShape(r) {
  return {
    id: r.id,
    name: r.name,
    rating: r.rating,
    review: r.review,
    reviewEn: r.reviewEn,
    location: r.location,
    locationEn: r.locationEn,
    photoUrl: r.photoUrl,
    jlptLevel: r.jlptLevel,
    batchYear: r.batchYear,
    createdAt: r.createdAt,
  };
}

// EN: Public submission. No auth — any visitor can submit a review through
//     the site form. Status starts as 'pending' so nothing surfaces until
//     admin moderates. Sends an email notification so admin sees it.
// BN: Public submission। Auth নাই — যে কেউ সাইটের form দিয়ে review submit
//     করতে পারে। Status 'pending' থেকে শুরু — admin moderate না করা পর্যন্ত
//     কিছু দেখাবে না। Email notification পাঠায় যাতে admin দেখে।
exports.createReview = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      rating,
      review,
      reviewEn,
      location,
      locationEn,
      photoUrl,
      jlptLevel,
      batchYear,
    } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'নাম দিতে হবে' });
    }
    if (!review || !String(review).trim()) {
      return res.status(400).json({ error: 'Review লিখতে হবে' });
    }
    const ratingNum = Number(rating);
    const safeRating = Number.isFinite(ratingNum) && ratingNum >= 1 && ratingNum <= 5
      ? Math.round(ratingNum)
      : 5;

    const created = await Review.create({
      name: String(name).trim().slice(0, 150),
      email: email ? String(email).trim().slice(0, 150) : '',
      phone: phone ? String(phone).trim().slice(0, 40) : '',
      rating: safeRating,
      review: String(review).trim(),
      reviewEn: reviewEn ? String(reviewEn).trim() : '',
      location: location ? String(location).trim().slice(0, 120) : '',
      locationEn: locationEn ? String(locationEn).trim().slice(0, 120) : '',
      photoUrl: photoUrl || '',
      jlptLevel: jlptLevel || '',
      batchYear: batchYear || '',
      status: 'pending',
      published: false,
    });

    notifyReview(created).catch((err) => {
      console.error('Review email notify failed:', err.message);
    });

    res.status(201).json({
      message: 'ধন্যবাদ! আপনার review আমাদের কাছে পৌঁছেছে — moderation-এর পর সাইটে দেখাবে।',
      review: publicShape(created),
    });
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Admin listing — supports ?status=pending|approved|rejected filter.
//     Returns full row including private fields.
// BN: Admin listing — ?status=pending|approved|rejected filter support।
//     Private field সহ পুরা row return করে।
exports.listReviews = async (req, res) => {
  try {
    const where = {};
    if (req.query.status && ALLOWED_STATUSES.includes(req.query.status)) {
      where.status = req.query.status;
    }
    const reviews = await Review.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json({ reviews });
  } catch (err) {
    console.error('Error listing reviews:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Public listing — only approved + published, with private fields stripped.
//     This is what the /reviews page on the public site consumes.
// BN: Public listing — শুধু approved + published, private field বাদ। Public
//     site-এর /reviews page এই endpoint use করে।
exports.listPublishedReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { status: 'approved', published: true },
      order: [['createdAt', 'DESC']],
    });
    res.json({ reviews: reviews.map(publicShape) });
  } catch (err) {
    console.error('Error listing published reviews:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Admin moderation update — only allows whitelisted fields so a
//     compromised admin token can't escalate to arbitrary writes (e.g.
//     overwriting submitter's name or photo).
// BN: Admin moderation update — শুধু whitelisted field allow, যাতে
//     compromised admin token দিয়ে arbitrary write না হয় (যেমন submitter-এর
//     name/photo overwrite)।
exports.updateReview = async (req, res) => {
  try {
    const r = await Review.findByPk(req.params.id);
    if (!r) return res.status(404).json({ error: 'Review not found' });
    const before = { status: r.status, published: r.published };
    const { status, published, adminNotes, rating, location, locationEn } = req.body || {};
    const patch = {};
    if (status && ALLOWED_STATUSES.includes(status)) patch.status = status;
    if (typeof published === 'boolean') patch.published = published;
    if (typeof adminNotes === 'string') patch.adminNotes = adminNotes;
    const ratingNum = Number(rating);
    if (Number.isFinite(ratingNum) && ratingNum >= 1 && ratingNum <= 5) {
      patch.rating = Math.round(ratingNum);
    }
    if (typeof location === 'string') patch.location = location.slice(0, 120);
    if (typeof locationEn === 'string') patch.locationEn = locationEn.slice(0, 120);
    await r.update(patch);

    const summaryParts = [];
    if (patch.status && patch.status !== before.status) summaryParts.push(`status ${before.status}→${patch.status}`);
    if (typeof patch.published === 'boolean' && patch.published !== before.published) {
      summaryParts.push(patch.published ? 'published' : 'unpublished');
    }
    logAudit(req, {
      action: 'update',
      entity: 'Review',
      entityId: r.id,
      summary: `Review by ${r.name}${summaryParts.length ? ` — ${summaryParts.join(', ')}` : ''}`,
      details: { before, after: { status: r.status, published: r.published } },
    });

    res.json({ message: 'Review updated', review: r });
  } catch (err) {
    console.error('Error updating review:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const r = await Review.findByPk(req.params.id);
    if (!r) return res.status(404).json({ error: 'Review not found' });
    const snap = { name: r.name, rating: r.rating, status: r.status };
    await r.destroy();
    logAudit(req, {
      action: 'delete',
      entity: 'Review',
      entityId: req.params.id,
      summary: `Deleted review by ${snap.name} (${snap.rating}★)`,
      details: snap,
    });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
