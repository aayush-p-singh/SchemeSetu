'use strict';

require('dotenv').config();
const config = require('./config/env');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Scheme = require('./models/Scheme');
const Application = require('./models/Application');
const { evaluateScheme } = require('./services/eligibility');

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'SchemeSetu@2024';
const BCRYPT_ROUNDS = 12;

const SCHEMES = [
  {
    code: 'BOCW-WB',
    title: 'BOCW Welfare Board Registration Benefits',
    ministry: 'Ministry of Labour and Employment',
    category: 'Accident & Life',
    benefitSummary: 'Education, marriage, maternity and death assistance for registered building and construction workers',
    benefitAmount: 50000,
    description: 'Welfare assistance for construction workers registered under the Building and Other Construction Workers Cess Act.',
    eligibilityRules: {
      minAge: 18,
      maxAge: 60,
      allowedTrades: ['Mason', 'Electrician', 'Plumber', 'Carpenter', 'General Helper'],
      requiresBocw: true,
    },
    requiredDocuments: ['BOCW registration card', 'National ID card', 'Bank passbook', 'Income certificate'],
    isActive: true,
  },
  {
    code: 'PM-SYM',
    title: 'PM Shram Yogi Maan-dhan Pension',
    ministry: 'Ministry of Labour and Employment',
    category: 'Pension',
    benefitSummary: 'Monthly pension of Rs 3,000 after age 60 for unorganised workers',
    benefitAmount: 36000,
    description: 'Voluntary contributory pension scheme for unorganised workers with monthly income up to Rs 15,000.',
    eligibilityRules: { minAge: 18, maxAge: 40, maxMonthlyIncome: 15000 },
    requiredDocuments: ['National ID card', 'Bank passbook', 'e-Shram UAN card'],
    isActive: true,
  },
  {
    code: 'PMJAY',
    title: 'Ayushman Bharat PM-JAY',
    ministry: 'Ministry of Health and Family Welfare',
    category: 'Health',
    benefitSummary: 'Health cover of Rs 5 lakh per family per year for secondary and tertiary hospitalisation',
    benefitAmount: 500000,
    description: 'Cashless health insurance for eligible families, including unorganised labourers.',
    eligibilityRules: { maxMonthlyIncome: 25000 },
    requiredDocuments: ['National ID card', 'Ration card', 'Income certificate'],
    isActive: true,
  },
  {
    code: 'PMAY-G',
    title: 'PM Awas Yojana - Gramin',
    ministry: 'Ministry of Rural Development',
    category: 'Housing',
    benefitSummary: 'Financial assistance to build a pucca house for eligible rural households',
    benefitAmount: 120000,
    description: 'Housing assistance for households without a pucca house.',
    eligibilityRules: { maxMonthlyIncome: 18000 },
    requiredDocuments: ['National ID card', 'Bank passbook', 'Land document', 'Income certificate'],
    isActive: true,
  },
  {
    code: 'EShram-AI',
    title: 'e-Shram Accidental Insurance Scheme',
    ministry: 'Ministry of Labour and Employment',
    category: 'Accident & Life',
    benefitSummary: 'Accidental insurance cover of Rs 2 lakh for registered unorganised workers',
    benefitAmount: 200000,
    description: 'Free accident insurance for workers registered on the e-Shram portal.',
    // minAge 16 is intentional for this scheme.
    eligibilityRules: { minAge: 16, maxAge: 59 },
    requiredDocuments: ['e-Shram UAN card', 'National ID card', 'Bank passbook'],
    isActive: true,
  },
];

const CONTRACTOR = {
  phone: '9876543210',
  role: 'contractor',
  profile: {
    name: 'Ramesh Kumar',
    companyName: 'Kumar Builders Pvt Ltd',
    state: 'Bihar',
    district: 'Patna',
    gender: 'Male',
    age: 45,
    monthlyIncome: 80000,
    bocwRegistered: true,
    ifscCode: 'SBIN0001234',
    uan: null,
  },
  nationalId: '123456789012',
  payoutAccount: '123456789012',
};

const LABORERS = [
  {
    phone: '9123456780',
    role: 'laborer',
    profile: {
      name: 'Sunil Mason',
      age: 34,
      gender: 'Male',
      state: 'Bihar',
      district: 'Patna',
      trade: 'Mason',
      monthlyIncome: 12000,
      bocwRegistered: true,
      ifscCode: 'HDFC0001234',
    },
    nationalId: '210987654321',
    payoutAccount: '50100123456789',
  },
  {
    phone: '9123456781',
    role: 'laborer',
    profile: {
      name: 'Anita Devi',
      age: 29,
      gender: 'Female',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      trade: 'General Helper',
      monthlyIncome: 9000,
      bocwRegistered: false,
      ifscCode: 'UTIB0002345',
    },
    nationalId: '334455667788',
    payoutAccount: '60123456789',
  },
  {
    phone: '9123456782',
    role: 'laborer',
    profile: {
      name: 'Mohd Irfan',
      age: 41,
      gender: 'Male',
      state: 'Bihar',
      district: 'Gaya',
      trade: 'Plumber',
      monthlyIncome: 18000,
      bocwRegistered: true,
      ifscCode: 'ICIC0003456',
    },
    nationalId: '998877665544',
    payoutAccount: '1234567890123',
  },
];

// Upserts a user by phone. Existing users get non-sensitive fields only;
// their password and encrypted vault values are left untouched.
async function upsertUser({ phone, role, profile, nationalId, payoutAccount, contractorId }) {
  const existing = await User.findOne({ phone });
  if (existing) {
    const $set = { ...profile };
    if (contractorId) $set.contractorId = contractorId;
    await User.updateOne({ _id: existing._id }, { $set });
    return { doc: existing, created: false };
  }

  const user = new User({ phone, role, ...profile });
  if (contractorId) user.contractorId = contractorId;
  user.passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);
  user.setNationalId(nationalId);
  user.setPayoutAccount(payoutAccount);
  await user.save();
  return { doc: user, created: true };
}

async function upsertSchemes() {
  const byCode = {};
  let created = 0;
  let existing = 0;
  for (const doc of SCHEMES) {
    const wasPresent = await Scheme.exists({ code: doc.code });
    byCode[doc.code] = await Scheme.findOneAndUpdate(
      { code: doc.code },
      { $set: doc },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    if (wasPresent) existing += 1;
    else created += 1;
  }
  console.log(`Schemes: ${created} created, ${existing} existing`);
  return byCode;
}

// Mixed demo checklist statuses per laborer index.
function documentsFor(laborerIndex, requiredDocuments) {
  const now = new Date();
  return requiredDocuments.map((name, j) => {
    let status = 'pending';
    if (laborerIndex === 0) {
      if (j === 0) status = 'verified';
      else if (j === 1) status = 'uploaded';
    } else if (laborerIndex === 1) {
      if (j === 0) status = 'uploaded';
    } else if (laborerIndex === 2) {
      if (j < 2) status = 'verified';
    }
    return { name, status, updatedAt: now };
  });
}

async function main() {
  if (SEED_PASSWORD.length < 8) {
    throw new Error('SEED_PASSWORD must be at least 8 characters');
  }

  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const schemes = await upsertSchemes();

  const contractorResult = await upsertUser({
    phone: CONTRACTOR.phone,
    role: CONTRACTOR.role,
    profile: CONTRACTOR.profile,
    nationalId: CONTRACTOR.nationalId,
    payoutAccount: CONTRACTOR.payoutAccount,
  });
  const contractor = contractorResult.doc;
  console.log(`Contractors: ${contractorResult.created ? 1 : 0} created, ${contractorResult.created ? 0 : 1} existing`);

  const laborers = [];
  let laborerCreated = 0;
  for (const spec of LABORERS) {
    const result = await upsertUser({
      phone: spec.phone,
      role: spec.role,
      profile: spec.profile,
      nationalId: spec.nationalId,
      payoutAccount: spec.payoutAccount,
      contractorId: contractor._id,
    });
    if (result.created) laborerCreated += 1;
    laborers.push(result.doc);
  }
  console.log(`Laborers: ${laborerCreated} created, ${LABORERS.length - laborerCreated} existing`);

  let appCreated = 0;
  let appExisting = 0;
  for (let i = 0; i < laborers.length; i += 1) {
    const laborer = laborers[i];
    let submittedSet = false;

    for (const scheme of Object.values(schemes)) {
      const result = (await evaluateScheme(laborer, scheme)) || {};
      const matched = Boolean(result.matched);
      const alwaysPmSym = i === 0 && scheme.code === 'PM-SYM';
      if (!matched && !alwaysPmSym) continue;

      const now = new Date();
      const isSubmitted = i === 0 && !submittedSet;
      if (isSubmitted) submittedSet = true;

      const setOnInsert = {
        contractorId: contractor._id,
        status: isSubmitted ? 'submitted' : matched ? 'eligible' : 'draft',
        eligibilitySnapshot: {
          matched,
          score: Number(result.score) || 0,
          reasons: Array.isArray(result.reasons) ? result.reasons : [],
          evaluatedAt: now,
        },
        documents: documentsFor(i, scheme.requiredDocuments),
      };
      if (isSubmitted) setOnInsert.submittedAt = now;

      const write = await Application.updateOne(
        { laborerId: laborer._id, schemeId: scheme._id },
        { $setOnInsert: setOnInsert },
        { upsert: true }
      );
      if (write.upsertedCount > 0) appCreated += 1;
      else appExisting += 1;
    }
  }
  console.log(`Applications: ${appCreated} created, ${appExisting} existing`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err.message);
  process.exitCode = 1;
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect errors during failure exit
  }
  process.exit(1);
});
