const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Blog = sequelize.define(
  'Blog',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    titleEn: { type: DataTypes.STRING, defaultValue: '' },
    titleJa: { type: DataTypes.STRING, defaultValue: '' },
    content: { type: DataTypes.TEXT, allowNull: false },
    contentEn: { type: DataTypes.TEXT, defaultValue: '' },
    contentJa: { type: DataTypes.TEXT, defaultValue: '' },
    // EN: Excerpt used for blog list cards + meta description. Short, plain
    //     text (no HTML). AI generator fills all three locales; manual posts
    //     can leave them empty and the renderer falls back to stripped content.
    // BN: Blog list card + meta description-এ excerpt। ছোট, plain text (HTML
    //     নাই)। AI generator তিনটেই fill করে; manual post খালি রাখতে পারে,
    //     renderer তখন stripped content দিয়ে fallback দেয়।
    excerpt: { type: DataTypes.TEXT, defaultValue: '' },
    excerptEn: { type: DataTypes.TEXT, defaultValue: '' },
    excerptJa: { type: DataTypes.TEXT, defaultValue: '' },
    // EN: SEO slug (from title) + meta keywords (CSV). Slug enables clean
    //     /blog/<slug> URLs in addition to the existing /blog/[id].
    // BN: SEO slug (title থেকে) + meta keywords (CSV)। বিদ্যমান
    //     /blog/[id]-এর পাশাপাশি /blog/<slug> URL-ও enable করে।
    slug: { type: DataTypes.STRING(200), defaultValue: '' },
    metaKeywords: { type: DataTypes.TEXT, defaultValue: '' },
    // EN: When AI generated this post — null for manually written posts.
    //     Lets admin filter "AI vs human" in the manage screen.
    // BN: AI generated post-এর timestamp — manual post-এ null। Admin
    //     manage screen-এ "AI vs human" filter করতে কাজে লাগে।
    aiGeneratedAt: { type: DataTypes.DATE, allowNull: true },
    image: { type: DataTypes.JSONB, defaultValue: null },
    category: { type: DataTypes.STRING, allowNull: false },
    categoryEn: { type: DataTypes.STRING, defaultValue: '' },
    categoryJa: { type: DataTypes.STRING, defaultValue: '' },
    authorId: {
      type: DataTypes.UUID,
      field: 'author_id',
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM('draft', 'published'),
      defaultValue: 'draft',
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: { blogs: false, study: false, service: false },
    },
  },
  {
    tableName: 'blogs',
    timestamps: true,
  }
);

module.exports = Blog;
