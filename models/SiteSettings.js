const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Translatable text fields are stored as both <name> (Bangla — primary) and
// <name>En (English). Numbers, URLs, IDs and license codes are language-agnostic.
const SiteSettings = sequelize.define(
  'SiteSettings',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // Hero
    heroEyebrow: { type: DataTypes.STRING, defaultValue: '' },
    heroEyebrowEn: { type: DataTypes.STRING, defaultValue: '' },
    heroTitle: { type: DataTypes.STRING(500), defaultValue: '' },
    heroTitleEn: { type: DataTypes.STRING(500), defaultValue: '' },
    heroTitleJp: { type: DataTypes.STRING, defaultValue: '' },
    heroSubtitle: { type: DataTypes.TEXT, defaultValue: '' },
    heroSubtitleEn: { type: DataTypes.TEXT, defaultValue: '' },
    heroCtaPrimary: { type: DataTypes.STRING, defaultValue: '' },
    heroCtaPrimaryEn: { type: DataTypes.STRING, defaultValue: '' },
    heroCtaPrimaryLink: { type: DataTypes.STRING, defaultValue: '' },
    heroCtaSecondary: { type: DataTypes.STRING, defaultValue: '' },
    heroCtaSecondaryEn: { type: DataTypes.STRING, defaultValue: '' },
    heroCtaSecondaryLink: { type: DataTypes.STRING, defaultValue: '' },
    heroBackgroundUrl: { type: DataTypes.STRING(500), defaultValue: '' },
    heroBadges: { type: DataTypes.JSONB, defaultValue: [] }, // [{label, labelEn, value}]

    // Stats — values stay numeric, only labels translate
    statStudents: { type: DataTypes.STRING, defaultValue: '500+' },
    statStudentsLabel: { type: DataTypes.STRING, defaultValue: '' },
    statStudentsLabelEn: { type: DataTypes.STRING, defaultValue: '' },
    statSuccess: { type: DataTypes.STRING, defaultValue: '95%' },
    statSuccessLabel: { type: DataTypes.STRING, defaultValue: '' },
    statSuccessLabelEn: { type: DataTypes.STRING, defaultValue: '' },
    statPartners: { type: DataTypes.STRING, defaultValue: '50+' },
    statPartnersLabel: { type: DataTypes.STRING, defaultValue: '' },
    statPartnersLabelEn: { type: DataTypes.STRING, defaultValue: '' },
    statYears: { type: DataTypes.STRING, defaultValue: '10+' },
    statYearsLabel: { type: DataTypes.STRING, defaultValue: '' },
    statYearsLabelEn: { type: DataTypes.STRING, defaultValue: '' },

    // Trust
    govLicense: { type: DataTypes.STRING, defaultValue: '' },
    bairaNumber: { type: DataTypes.STRING, defaultValue: '' },
    trustNote: { type: DataTypes.STRING, defaultValue: '' },
    trustNoteEn: { type: DataTypes.STRING, defaultValue: '' },

    // Contact
    whatsappNumber: { type: DataTypes.STRING, defaultValue: '' },
    hotline: { type: DataTypes.STRING, defaultValue: '' },
    email: { type: DataTypes.STRING, defaultValue: '' },
    addressBd: { type: DataTypes.TEXT, defaultValue: '' },
    addressBdEn: { type: DataTypes.TEXT, defaultValue: '' },
    addressJp: { type: DataTypes.TEXT, defaultValue: '' },
    addressJpEn: { type: DataTypes.TEXT, defaultValue: '' },
    officeHoursBd: { type: DataTypes.STRING, defaultValue: '' },
    officeHoursBdEn: { type: DataTypes.STRING, defaultValue: '' },
    officeHoursJp: { type: DataTypes.STRING, defaultValue: '' },
    officeHoursJpEn: { type: DataTypes.STRING, defaultValue: '' },
    mapEmbedUrl: { type: DataTypes.STRING(500), defaultValue: '' },

    // Social
    facebookUrl: { type: DataTypes.STRING, defaultValue: '' },
    youtubeUrl: { type: DataTypes.STRING, defaultValue: '' },
    instagramUrl: { type: DataTypes.STRING, defaultValue: '' },
    tiktokUrl: { type: DataTypes.STRING, defaultValue: '' },
    linkedinUrl: { type: DataTypes.STRING, defaultValue: '' },
    twitterUrl: { type: DataTypes.STRING, defaultValue: '' },
    googleBusinessUrl: { type: DataTypes.STRING(500), defaultValue: '' },

    // About
    aboutHeading: { type: DataTypes.STRING(500), defaultValue: '' },
    aboutHeadingEn: { type: DataTypes.STRING(500), defaultValue: '' },
    aboutBody: { type: DataTypes.TEXT, defaultValue: '' },
    aboutBodyEn: { type: DataTypes.TEXT, defaultValue: '' },
    aboutImageUrl: { type: DataTypes.STRING(500), defaultValue: '' },

    // Facebook integration
    fbPageId: { type: DataTypes.STRING, defaultValue: '' },
    fbPageAccessToken: { type: DataTypes.TEXT, defaultValue: '' },
    fbAppId: { type: DataTypes.STRING, defaultValue: '' },
    fbAutoPostBlogs: { type: DataTypes.BOOLEAN, defaultValue: false },
    fbPixelId: { type: DataTypes.STRING, defaultValue: '' },
    fbMessengerEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    fbMessengerPageId: { type: DataTypes.STRING, defaultValue: '' },

    // Google integration
    gaTrackingId: { type: DataTypes.STRING, defaultValue: '' },
    googleSiteVerification: { type: DataTypes.STRING, defaultValue: '' },
    googleTagManagerId: { type: DataTypes.STRING, defaultValue: '' },

    // SEO / meta — admin-overridable defaults that show in browser tab,
    // search results, and social share cards. Empty fields fall back to
    // built-in translations / hardcoded site name.
    siteTitle: { type: DataTypes.STRING(200), defaultValue: '' },
    siteTitleEn: { type: DataTypes.STRING(200), defaultValue: '' },
    siteDescription: { type: DataTypes.TEXT, defaultValue: '' },
    siteDescriptionEn: { type: DataTypes.TEXT, defaultValue: '' },
    metaKeywords: { type: DataTypes.TEXT, defaultValue: '' }, // CSV: "japan study,jlpt,..."
    ogImageUrl: { type: DataTypes.STRING(500), defaultValue: '' }, // 1200x630 social card

    // Blog OG promo band — overlays a navy strip with brand text on every blog
    // share card. Cloudinary text overlay does the rendering server-side, so
    // changing any of these takes effect on the next page render (no rebuild).
    blogOgPromoEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    blogOgPromoText: {
      type: DataTypes.STRING(200),
      defaultValue: 'inochieducation.com — Japan Study Consultancy',
    },
    blogOgPromoBandColor: { type: DataTypes.STRING(20), defaultValue: '#0F2D52' },
    blogOgPromoTextColor: { type: DataTypes.STRING(20), defaultValue: '#FFFFFF' },
    blogOgPromoFont: { type: DataTypes.STRING(40), defaultValue: 'Roboto' },
    blogOgPromoFontSize: { type: DataTypes.INTEGER, defaultValue: 40 },
    blogOgPromoBandHeight: { type: DataTypes.INTEGER, defaultValue: 80 },
  },
  {
    tableName: 'site_settings',
    timestamps: true,
  }
);

module.exports = SiteSettings;
