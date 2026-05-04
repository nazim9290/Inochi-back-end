// EN: Application — full student application from the public /apply page.
//     Heavier than the lead form (which is just "interested"); this captures
//     enough to actually start admission processing. Admin moves through:
//       new → reviewing → accepted | rejected | withdrawn
//     Documents are URL pointers (Drive / Cloudinary) so admins can request
//     scans separately without dealing with multi-megabyte uploads here.
// BN: Application — public /apply page থেকে আসা পূর্ণ student application।
//     Lead form-এর চেয়ে heavy (lead "interested" মাত্র); এটা admission start
//     করার মতো তথ্য নেয়। Admin status-এর মধ্য দিয়ে move করে:
//       new → reviewing → accepted | rejected | withdrawn
//     Document গুলো URL pointer (Drive / Cloudinary) — multi-megabyte upload
//     এখানে handle না করে admin আলাদাভাবে scan request করতে পারে।
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Application = sequelize.define(
  'Application',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: Personal info — minimum needed to identify + contact the applicant.
    // BN: Personal info — applicant identify + contact-এর জন্য minimum।
    fullName: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false },
    phone: { type: DataTypes.STRING(40), allowNull: false },
    dateOfBirth: { type: DataTypes.DATEONLY },
    gender: { type: DataTypes.STRING(20), defaultValue: '' },
    nationality: { type: DataTypes.STRING(80), defaultValue: 'Bangladeshi' },
    address: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: Education — kept as a single highest-qualification block so the form
    //     stays simple. Multi-row history can be added later if needed.
    // BN: Education — সবচেয়ে high qualification একটা block; form simple রাখার
    //     জন্য। দরকার হলে পরে multi-row history যোগ করা যাবে।
    highestEducation: { type: DataTypes.STRING(80), defaultValue: '' }, // SSC/HSC/Diploma/Bachelor/Master
    institution: { type: DataTypes.STRING(200), defaultValue: '' },
    passingYear: { type: DataTypes.INTEGER },
    gpaOrGrade: { type: DataTypes.STRING(40), defaultValue: '' },

    // EN: Japan plan — what the applicant wants to do in Japan.
    // BN: Japan plan — applicant জাপানে কী করতে চায়।
    targetProgram: { type: DataTypes.STRING(60), defaultValue: '' }, // language/undergrad/grad/vocational
    targetIntake: { type: DataTypes.STRING(20), defaultValue: '' }, // jan/apr/jul/oct + year
    jlptLevel: { type: DataTypes.STRING(8), defaultValue: 'none' }, // none/N5/N4/N3/N2/N1
    sponsor: { type: DataTypes.STRING(40), defaultValue: '' }, // self/parent/relative/scholarship/other
    fatherName: { type: DataTypes.STRING(150), defaultValue: '' },
    motherName: { type: DataTypes.STRING(150), defaultValue: '' },
    parentOccupation: { type: DataTypes.STRING(150), defaultValue: '' },

    // EN: Document URLs — admin asks for missing scans by email. Photo lives
    //     in Cloudinary (uploaded via /upload-image-file).
    // BN: Document URL — অনুপস্থিত scan admin email-এ request করে। Photo
    //     Cloudinary-তে upload (/upload-image-file দিয়ে)।
    photoUrl: { type: DataTypes.STRING(500), defaultValue: '' },
    documentsUrl: { type: DataTypes.STRING(500), defaultValue: '' },

    // EN: Free-text from the applicant + admin's running notes (private).
    // BN: Applicant-এর free-text + admin-এর running note (private)।
    notes: { type: DataTypes.TEXT, defaultValue: '' },
    adminNotes: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: Pipeline status. Defaults to "new" — admin moves through stages.
    //     Validated by app code (not DB enum) so we can add states without
    //     migration.
    // BN: Pipeline status। Default "new" — admin stage-এর মধ্যে দিয়ে move করে।
    //     App code validate করে (DB enum না) যাতে migration ছাড়াই নতুন state
    //     যোগ করা যায়।
    status: { type: DataTypes.STRING(30), defaultValue: 'new' },

    // EN: Optional FK to the User who submitted while logged in. Stays null
    //     for anonymous submissions; backfilled on demand by matching email.
    //     Powers the /account "My Applications" tracker.
    // BN: Logged-in হয়ে submit করা User-এর optional FK। Anonymous submission-এ
    //     null; email match দিয়ে on-demand backfill হয়। /account "My
    //     Applications" tracker এই field দিয়ে চলে।
    userId: {
      type: DataTypes.UUID,
      field: 'user_id',
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    tableName: 'applications',
    timestamps: true,
  }
);

module.exports = Application;
