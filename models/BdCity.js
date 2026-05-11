/**
 * EN: BdCity — Bangladesh-specific "Study from <city>" landing page content.
 *     Each row drives one card on /study-from and one full page at
 *     /study-from/<slug>. Captures local SEO context that matters in
 *     Bangladesh (division-level alumni count, neighborhood callouts,
 *     branch presence, counselling mode) so we can rank for queries like
 *     "study in Japan from Sylhet" without hardcoding it in JSX.
 *
 *     Multilingual fields follow the project convention: <field> stores the
 *     primary Bangla copy, <field>En mirrors English. For city name and
 *     short tagline we ALSO carry a Japanese variant (<field>Ja) because
 *     the Japanese parent audience reads city names in katakana — falling
 *     back to English ("Sylhet") feels off for them.
 *
 *     Array-shaped fields (phones, highlights, nearbyAreas, programsOffered)
 *     live in JSONB so admins can add/remove items without schema changes.
 *     The controller transforms each row into the multilingual-object shape
 *     the public Next.js page already expects, so the frontend rendering
 *     code is untouched — we just swap the data source from a JSON file
 *     to this DB.
 *
 * BN: BdCity — বাংলাদেশের "<শহর> থেকে জাপানে অধ্যয়ন" landing page-এর
 *     content। প্রতিটা row /study-from-এ একটা card আর /study-from/<slug>-এ
 *     একটা পূর্ণ page চালায়। Local SEO context ধরে রাখে — বিভাগ-ভিত্তিক
 *     alumni সংখ্যা, এলাকা callout, শাখা আছে কিনা, counselling-এর mode —
 *     যাতে "Study in Japan from Sylhet" type query-তে rank করা যায়, JSX-এ
 *     hardcode না করে।
 *
 *     Multilingual field-এ project convention: <field> = Bangla primary,
 *     <field>En = English mirror। city name + short tagline-এ Japanese
 *     variant (<field>Ja)-ও আছে — Japanese অভিভাবকরা katakana-তে শহরের নাম
 *     পড়েন, English-এ fall back ("Sylhet") তাদের কাছে অস্বস্তিকর।
 *
 *     Array field (phones, highlights, nearbyAreas, programsOffered) JSONB-এ
 *     — admin schema পরিবর্তন ছাড়াই add/remove করতে পারে। Controller
 *     row-টাকে public Next.js page-এর expected multilingual-object shape-এ
 *     transform করে — frontend rendering code একটুও বদলায় না, শুধু data
 *     source JSON file থেকে DB-তে যায়।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BdCity = sequelize.define(
  'BdCity',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: Slug doubles as URL segment (/study-from/<slug>) and must be unique.
    // BN: Slug URL segment-ও (/study-from/<slug>) এবং unique হতে হবে।
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },

    // EN: City name in three languages — name displays in card heading.
    // BN: শহরের নাম তিন ভাষায় — card heading-এ দেখানো হয়।
    name: { type: DataTypes.STRING(120), allowNull: false },
    nameEn: { type: DataTypes.STRING(120), defaultValue: '' },
    nameJa: { type: DataTypes.STRING(120), defaultValue: '' },

    // EN: Short one-paragraph tagline shown under the card heading.
    // BN: Card heading-এর নিচে দেখানো ছোট এক-paragraph tagline।
    tagline: { type: DataTypes.TEXT, defaultValue: '' },
    taglineEn: { type: DataTypes.TEXT, defaultValue: '' },
    taglineJa: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: Number of alumni currently in Japan from this division — surfaced
    //     prominently as social proof.
    // BN: এই বিভাগ থেকে বর্তমানে জাপানে alumni সংখ্যা — social proof হিসেবে
    //     প্রকটভাবে দেখানো হয়।
    studentsPlaced: { type: DataTypes.INTEGER, defaultValue: 0 },

    // EN: Branch info — empty when there's no physical office in this city.
    //     `hasBranch` lets the UI flip the card mode (in-person vs remote).
    // BN: শাখার তথ্য — শহরে অফিস না থাকলে খালি। `hasBranch` দিয়ে UI
    //     card-এর mode বদলায় (in-person vs remote)।
    hasBranch: { type: DataTypes.BOOLEAN, defaultValue: false },
    branchAddress: { type: DataTypes.TEXT, defaultValue: '' },
    branchAddressEn: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: Phones — JSONB array, e.g. ["+880 1784-889646"]. Each entry
    //     becomes a clickable tel: chip on the public page.
    // BN: ফোন — JSONB array, যেমন ["+880 1784-889646"]। প্রতিটা public
    //     page-এ clickable tel: chip হয়ে যায়।
    phones: { type: DataTypes.JSONB, defaultValue: [] },

    // EN: Hero image — Cloudinary URL. Optional; card falls back to a teal
    //     gradient when empty.
    // BN: Hero image — Cloudinary URL। Optional; খালি থাকলে card teal
    //     gradient-এ fall back করে।
    heroImage: { type: DataTypes.STRING(500), defaultValue: '' },

    // EN: Highlights — JSONB array of {en, bn} (and optional ja). Bullet
    //     list under the tagline. Renderer ignores empty entries.
    // BN: Highlights — {en, bn} (optional ja)-এর JSONB array। Tagline-এর
    //     নিচে bullet list। Empty entry renderer ignore করে।
    highlights: { type: DataTypes.JSONB, defaultValue: [] },

    // EN: Nearby areas — neighborhoods this city covers. Used both as SEO
    //     keywords and as a chip cloud on the detail page.
    // BN: কাছাকাছি এলাকা — এই শহরের আওতাধীন। SEO keyword হিসেবে এবং
    //     detail page-এ chip cloud — দুই কাজেই ব্যবহৃত।
    nearbyAreas: { type: DataTypes.JSONB, defaultValue: [] },

    // EN: Programs offered locally (e.g. "JLPT N5 in-person", "Visa support").
    //     Drives the badge row on the index card.
    // BN: এই শহরে যে সব program দেওয়া হয় (যেমন "JLPT N5 in-person",
    //     "ভিসা সহায়তা")। Index card-এ badge row চালায়।
    programsOffered: { type: DataTypes.JSONB, defaultValue: [] },

    // EN: Next intake — short label like "মার্চ ২০২৬" or "ongoing".
    //     Free-form text so admin can write whatever fits.
    // BN: পরবর্তী intake — ছোট label যেমন "মার্চ ২০২৬" বা "চলমান"।
    //     Free-form text — admin যা fit হয় লিখতে পারে।
    nextIntake: { type: DataTypes.STRING(80), defaultValue: '' },
    nextIntakeEn: { type: DataTypes.STRING(80), defaultValue: '' },

    // EN: Counselling mode — one of "in-person", "online", "hybrid".
    //     Drives the icon + colour of the mode badge on the card.
    // BN: Counselling mode — "in-person", "online", বা "hybrid"-এর একটা।
    //     Card-এ mode badge-এর icon + colour এই field দিয়ে চালায়।
    counsellingMode: { type: DataTypes.STRING(20), defaultValue: 'online' },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'bd_cities',
    timestamps: true,
  }
);

module.exports = BdCity;
