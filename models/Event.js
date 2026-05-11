/**
 * EN: Event — public-facing event listings (seminars, workshops, alumni
 *     meetups, cultural festivals). Drives /events on the public site.
 *     Each row = one occurrence; series are modelled as multiple rows so
 *     filtering by date is straightforward.
 *
 *     Multilingual fields use the project convention (<field> = Bangla
 *     primary, <field>En = English mirror, <field>Ja = optional Japanese
 *     for the same headline-level fields the rest of the renovation has).
 *
 *     `eventDate` is a real DATEONLY so the controller can ORDER BY it and
 *     filter past/future. `time` stays a free-form string ("16:00",
 *     "10:00 IST") — keeping it loose avoids timezone drama for now.
 *     `extra` JSONB is reserved for stuff we don't want first-class
 *     columns for yet (sponsor info, partner logos, etc.).
 *
 * BN: Event — public-facing event listing (seminar, workshop, alumni
 *     meetup, cultural festival)। /events public পেজ চালায়। প্রতিটা row
 *     = একটা occurrence; series হলে একাধিক row — তারিখে filter সহজ থাকে।
 *
 *     Multilingual field-এ project convention (<field> = Bangla primary,
 *     <field>En = English mirror, <field>Ja = optional Japanese — যে
 *     headline-level field-গুলো পুরো renovation-এ আছে)।
 *
 *     `eventDate` DATEONLY — controller ORDER BY আর past/future filter
 *     করতে পারে। `time` free-form string ("16:00", "10:00 IST") —
 *     timezone drama আপাতত এড়াতে loose। `extra` JSONB reserve — যা first-
 *     class column করার মত যথেষ্ট structured না (sponsor info, partner
 *     logo ইত্যাদি)।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define(
  'Event',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: Type — drives the badge colour. Free string so admin can introduce
    //     new categories without schema change.
    // BN: Type — badge color চালায়। Free string — admin schema change
    //     ছাড়াই নতুন category আনতে পারে।
    type: { type: DataTypes.STRING(40), defaultValue: 'seminar' },

    // EN: Title trio.
    // BN: Title trio।
    title: { type: DataTypes.STRING(255), allowNull: false },
    titleEn: { type: DataTypes.STRING(255), defaultValue: '' },
    titleJa: { type: DataTypes.STRING(255), defaultValue: '' },

    // EN: Long-form description trio.
    // BN: লম্বা description trio।
    description: { type: DataTypes.TEXT, defaultValue: '' },
    descriptionEn: { type: DataTypes.TEXT, defaultValue: '' },
    descriptionJa: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: When + how long.
    // BN: কবে + কতক্ষণ।
    eventDate: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.STRING(20), defaultValue: '' },
    durationMin: { type: DataTypes.INTEGER, defaultValue: 60 },

    // EN: Where — location string trio + a city slug for filtering.
    // BN: কোথায় — location string trio + filter-এর জন্য city slug।
    location: { type: DataTypes.STRING(255), defaultValue: '' },
    locationEn: { type: DataTypes.STRING(255), defaultValue: '' },
    locationJa: { type: DataTypes.STRING(255), defaultValue: '' },
    city: { type: DataTypes.STRING(40), defaultValue: '' },

    // EN: RSVP destination — internal route (/seminars) or external URL.
    // BN: RSVP-র গন্তব্য — internal route (/seminars) বা external URL।
    rsvpUrl: { type: DataTypes.STRING(500), defaultValue: '' },

    // EN: Cover / hero image.
    // BN: Cover / hero image।
    heroImage: { type: DataTypes.STRING(500), defaultValue: '' },

    // EN: Pricing — boolean flag for "free", text for fee amount.
    // BN: Pricing — "free" boolean flag, fee amount text।
    isFree: { type: DataTypes.BOOLEAN, defaultValue: false },
    fee: { type: DataTypes.STRING(60), defaultValue: '' },

    // EN: Highlight pins the event to the top of the page.
    // BN: Highlight event-কে পেজের উপরে pin করে।
    highlight: { type: DataTypes.BOOLEAN, defaultValue: false },

    extra: { type: DataTypes.JSONB, defaultValue: {} },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'events',
    timestamps: true,
  }
);

module.exports = Event;
