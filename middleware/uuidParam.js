// EN: router.param guard for UUID ids: a malformed id is a 404, not a
//     Postgres "invalid input syntax for type uuid" turned into a 500.
// BN: UUID id-র router.param guard: ভুল id হলে 404, Postgres-এর
//     "invalid input syntax for type uuid" থেকে 500 নয়।
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = (req, res, next, id) =>
  UUID_RE.test(id) ? next() : res.status(404).json({ error: 'Not found' });
