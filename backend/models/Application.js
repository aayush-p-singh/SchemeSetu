const mongoose = require('mongoose');

const DOCUMENT_STATUSES = ['pending', 'uploaded', 'verified'];
const APPLICATION_STATUSES = ['draft', 'eligible', 'submitted', 'approved', 'rejected'];

const applicationSchema = new mongoose.Schema(
  {
    laborerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', required: true, index: true },
    contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: undefined },
    status: { type: String, enum: { values: APPLICATION_STATUSES, message: 'Invalid application status' }, default: 'draft' },
    eligibilitySnapshot: {
      matched: { type: Boolean, default: false },
      score: { type: Number, min: 0, max: 100, default: 0 },
      reasons: { type: [String], default: [] },
      evaluatedAt: { type: Date },
    },
    documents: {
      type: [
        {
          name: { type: String, required: [true, 'Document name is required'] },
          status: { type: String, enum: { values: DOCUMENT_STATUSES, message: 'Invalid document status' }, default: 'pending' },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

applicationSchema.index({ laborerId: 1, schemeId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
