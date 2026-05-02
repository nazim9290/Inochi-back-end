/**
 * EN: Application controller — public POST (visitors) + admin GET/PUT/DELETE.
 *     New submissions trigger an email notification (fire-and-forget) so the
 *     admission team is alerted in real time. Status transitions are validated
 *     against a known set so the UI can't accidentally save garbage.
 * BN: Application controller — public POST (visitor) + admin GET/PUT/DELETE।
 *     নতুন submission email notification trigger করে (fire-and-forget) — যাতে
 *     admission team real-time alert পায়। Status transition known set-এর
 *     বিরুদ্ধে validate — UI accidentally garbage save করতে পারে না।
 */

const { Application } = require('../models');
const mailer = require('../helpers/mailer');
const { logAudit } = require('../helpers/audit');

// EN: Allowed status values. Reject anything else from the admin UI.
// BN: Allowed status value। Admin UI থেকে অন্য কিছু আসলে reject।
const ALLOWED_STATUSES = ['new', 'reviewing', 'accepted', 'rejected', 'withdrawn'];

// EN: Public — visitor submits an application. Required fields validated here
//     so a malformed POST doesn't blow up the DB write with a Sequelize error.
// BN: Public — visitor application submit করে। Required field এখানে validate —
//     malformed POST DB write Sequelize error দিয়ে blow up করে না।
exports.createApplication = async (req, res) => {
  const { fullName, email, phone } = req.body || {};
  if (!fullName || !email || !phone) {
    return res.status(400).json({ error: 'fullName, email and phone are required.' });
  }
  try {
    const app = await Application.create({ ...req.body, status: 'new' });
    // EN: Friendly Bangla acknowledgement to the applicant — fires immediately
    //     so they see "we got it" before they put the phone down. Non-blocking.
    // BN: Applicant-কে friendly Bangla acknowledgement — সাথে সাথে fire,
    //     তারা phone নামানোর আগেই "পেয়েছি" দেখে। Non-blocking।
    if (typeof mailer.thankApplicant === 'function') {
      mailer.thankApplicant(app).catch((e) => console.error('thankApplicant:', e));
    }
    // EN: notifyApplication may not exist on older mailer setups — guard.
    // BN: পুরাতন mailer setup-এ notifyApplication নাও থাকতে পারে — guard।
    if (typeof mailer.notifyApplication === 'function') {
      mailer.notifyApplication(app).catch((e) => console.error('notifyApplication:', e));
    } else if (typeof mailer.notifyContact === 'function') {
      // EN: Fall back to the existing contact-notification path so admin still
      //     gets an email even before notifyApplication is added.
      // BN: Existing contact-notification path-এ fallback — notifyApplication
      //     যোগ হওয়ার আগেও admin email পায়।
      mailer
        .notifyContact({
          name: app.fullName,
          email: app.email,
          phone: app.phone,
          msg: `[NEW APPLICATION] ${app.targetProgram || 'program?'} — ${app.targetIntake || 'intake?'}`,
        })
        .catch((e) => console.error('notifyApplication-fallback:', e));
    }
    return res.status(201).json({ message: 'Application received', application: app });
  } catch (err) {
    console.error('Error creating application:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Admin — list all applications, newest first. Optional ?status filter
//     so the admin UI can request just one bucket at a time if it wants.
// BN: Admin — সব application list, newest first। Optional ?status filter —
//     admin UI চাইলে এক bucket আলাদা করে চাইতে পারে।
exports.listApplications = async (req, res) => {
  try {
    const where = {};
    if (req.query.status && ALLOWED_STATUSES.includes(req.query.status)) {
      where.status = req.query.status;
    }
    const applications = await Application.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ applications });
  } catch (err) {
    console.error('Error listing applications:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Admin — single application for the detail drawer.
// BN: Admin — detail drawer-এর জন্য একটা application।
exports.getApplication = async (req, res) => {
  try {
    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    return res.status(200).json({ application: app });
  } catch (err) {
    console.error('Error getting application:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Admin — update status and/or admin notes. Only `status` and `adminNotes`
//     are accepted from the body so applicants' submitted data can't be
//     overwritten by mistake.
// BN: Admin — status এবং/অথবা admin note update। Body থেকে শুধু `status` আর
//     `adminNotes` accept — applicant-এর submit করা data accidentally
//     overwrite হতে পারে না।
exports.updateApplication = async (req, res) => {
  try {
    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    const patch = {};
    let statusChanged = false;
    if (typeof req.body?.status === 'string') {
      if (!ALLOWED_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: `Status must be one of ${ALLOWED_STATUSES.join(', ')}` });
      }
      // EN: Email the applicant only when the status actually moves — no
      //     duplicate sends if admin just hits the same button twice.
      // BN: Status আসলেই বদলালে তবেই applicant-কে email — admin একই button
      //     দ্বিতীয়বার চাপলে duplicate send হবে না।
      if (req.body.status !== app.status) {
        statusChanged = true;
      }
      patch.status = req.body.status;
    }
    if (typeof req.body?.adminNotes === 'string') {
      patch.adminNotes = req.body.adminNotes;
    }
    await app.update(patch);

    // EN: Fire-and-forget the applicant notification AFTER we've successfully
    //     persisted the new status — otherwise the email could promise a
    //     state we never wrote.
    // BN: নতুন status save হওয়ার পরই applicant-কে notify করি (fire-and-forget)
    //     — না হলে email এমন state promise করত যা আমরা write করিনি।
    if (statusChanged && typeof mailer.statusUpdateApplicant === 'function') {
      mailer
        .statusUpdateApplicant(app, patch.status)
        .catch((e) => console.error('statusUpdateApplicant:', e));
    }

    if (statusChanged) {
      logAudit(req, {
        action: 'update',
        entity: 'Application',
        entityId: app.id,
        summary: `Application by ${app.fullName}: status → ${patch.status}`,
        details: { name: app.fullName, status: patch.status },
      });
    }

    return res.status(200).json({ message: 'Application updated', application: app });
  } catch (err) {
    console.error('Error updating application:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Admin — hard delete. No soft-delete column on the model so this is final.
// BN: Admin — hard delete। Model-এ soft-delete column নেই, তাই এটা final।
exports.deleteApplication = async (req, res) => {
  try {
    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    const snap = { fullName: app.fullName, email: app.email, status: app.status };
    await app.destroy();
    logAudit(req, {
      action: 'delete',
      entity: 'Application',
      entityId: req.params.id,
      summary: `Deleted application by ${snap.fullName}`,
      details: snap,
    });
    return res.status(200).json({ message: 'Application deleted' });
  } catch (err) {
    console.error('Error deleting application:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
