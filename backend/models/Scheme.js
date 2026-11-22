const mongoose = require('mongoose');
const { TRADES } = require('../utils/validators');

const CATEGORIES = ['Health', 'Pension', 'Housing', 'Education', 'Accident & Life'];

const schemeSchema = new mongoose.Schema(
  {
    code: { type: String, required: [true, 'Scheme code is required'], unique: true, uppercase: true },
    title: { type: String, required: [true, 'Title is required'] },
    ministry: { type: String, required: [true, 'Ministry is required'] },
    category: { type: String, enum: { values: CATEGORIES, message: 'Invalid category' }, required: true },
    benefitSummary: { type: String, required: [true, 'Benefit summary is required'] },
    benefitAmount: { type: Number, min: [0, 'Benefit amount cannot be negative'], default: 0 },
    description: { type: String, default: '' },
    eligibilityRules: {
      type: new mongoose.Schema(
        {
          minAge: { type: Number },
          maxAge: { type: Number },
          maxMonthlyIncome: { type: Number, min: 0 },
          allowedTrades: {
            type: [String],
            default: [],
            validate: { validator: (arr) => arr.every((t) => TRADES.includes(t)), message: 'Unknown trade in allowedTrades' },
          },
          requiresBocw: { type: Boolean, default: false },
        },
        { _id: false }
      ),
      default: () => ({}),
    },
    requiredDocuments: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scheme', schemeSchema);
