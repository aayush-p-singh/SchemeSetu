const mongoose = require('mongoose');
const {
  PHONE_RE,
  IFSC_RE,
  UAN_RE,
  NATIONAL_ID_RE,
  PAYOUT_ACCOUNT_RE,
  TRADES,
  GENDERS,
} = require('../utils/validators');
const { encrypt, decrypt, sha256Hash } = require('../utils/crypto');

const COMPLETENESS_FIELDS = [
  'name',
  'phone',
  'age',
  'gender',
  'state',
  'district',
  'trade',
  'monthlyIncome',
  'bocwRegistered',
  'nationalIdEncrypted',
  'payoutAccountEncrypted',
  'ifscCode',
  'uan',
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minlength: 2, maxlength: 100, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v) => PHONE_RE.test(v),
        message: 'Phone must be 10 digits starting with 6-9',
      },
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['laborer', 'contractor'], required: true },

    age: { type: Number, validate: { validator: Number.isInteger, message: 'Age must be an integer' }, min: 18, max: 75 },
    gender: { type: String, enum: GENDERS },
    state: { type: String },
    district: { type: String },
    trade: { type: String, enum: TRADES },
    monthlyIncome: { type: Number, min: 0 },
    bocwRegistered: { type: Boolean, default: false },

    // Sensitive vault fields: select:false, server-side only.
    nationalIdEncrypted: { type: String, select: false },
    nationalIdHash: { type: String, select: false, unique: true, sparse: true },
    payoutAccountEncrypted: { type: String, select: false },

    ifscCode: { type: String, match: IFSC_RE },
    uan: { type: String, match: UAN_RE },

    companyName: {
      type: String,
      maxlength: 150,
      required: function () {
        return this.role === 'contractor';
      },
    },
    contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: undefined },

    profileCompleteness: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

userSchema.methods.computeProfileCompleteness = function () {
  const filled = COMPLETENESS_FIELDS.filter((f) => {
    const v = this[f];
    return v !== undefined && v !== null && v !== '';
  }).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
};

// Encrypted fields are select:false, so saves must load them with
// select('+nationalIdEncrypted +payoutAccountEncrypted').
// Mongoose 9: async-style hooks take no next() callback; returning normally completes the hook.
userSchema.pre('save', function () {
  this.profileCompleteness = this.computeProfileCompleteness();
});

userSchema.methods.setNationalId = function (raw) {
  const digits = String(raw);
  if (!NATIONAL_ID_RE.test(digits)) {
    throw new Error('National ID must be exactly 12 digits');
  }
  this.nationalIdEncrypted = encrypt(digits);
  this.nationalIdHash = sha256Hash(digits);
};

userSchema.methods.setPayoutAccount = function (raw) {
  const digits = String(raw);
  if (!PAYOUT_ACCOUNT_RE.test(digits)) {
    throw new Error('Payout account must be 9 to 18 digits');
  }
  this.payoutAccountEncrypted = encrypt(digits);
};

// SERVER-SIDE ONLY. Never send these values to clients.
userSchema.methods.getNationalId = function () {
  return this.nationalIdEncrypted ? decrypt(this.nationalIdEncrypted) : null;
};

// SERVER-SIDE ONLY. Never send these values to clients.
userSchema.methods.getPayoutAccount = function () {
  return this.payoutAccountEncrypted ? decrypt(this.payoutAccountEncrypted) : null;
};

// The verified flags are accurate only when loaded with the +select fields.
userSchema.methods.toSafeJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    phone: this.phone,
    role: this.role,
    age: this.age,
    gender: this.gender,
    state: this.state,
    district: this.district,
    trade: this.trade,
    monthlyIncome: this.monthlyIncome,
    bocwRegistered: this.bocwRegistered,
    ifscCode: this.ifscCode,
    uan: this.uan,
    companyName: this.companyName,
    contractorId: this.contractorId,
    profileCompleteness: this.profileCompleteness,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    nationalIdVerified: Boolean(this.nationalIdEncrypted),
    payoutAccountVerified: Boolean(this.payoutAccountEncrypted),
  };
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.nationalIdEncrypted;
    delete ret.nationalIdHash;
    delete ret.payoutAccountEncrypted;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
