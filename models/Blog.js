const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    shortDescription: { type: String },
    content: { type: String, required: true },
    thumbnailImage: { type: String },
    coverImage: { type: String },
    category: { type: String },
    tags: [{ type: String }],
    likes: { type: Number, default: 0 },
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: [{ type: String }],
    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Blog', blogSchema);
