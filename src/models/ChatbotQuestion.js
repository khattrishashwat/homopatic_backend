const mongoose = require('mongoose');

const ChatbotQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

ChatbotQuestionSchema.index({ active: 1, order: 1 });
ChatbotQuestionSchema.index({ question: 'text', keywords: 'text' });

module.exports = mongoose.model('ChatbotQuestion', ChatbotQuestionSchema);
