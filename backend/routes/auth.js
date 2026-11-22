const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  validate,
  registerLaborerSchema,
  registerContractorSchema,
  loginSchema,
} = require('../utils/validators');
const { sha256Hash } = require('../utils/crypto');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { authLimiter } = require('../middleware/security');
const { requireAuth, signToken } = require('../middleware/auth');

const LABORER_FIELDS = [
  'name', 'phone', 'age', 'gender', 'state', 'district', 'trade',
  'monthlyIncome', 'bocwRegistered', 'ifscCode', 'uan',
];

const CONTRACTOR_FIELDS = [
  'name', 'phone', 'state', 'district', 'companyName', 'ifscCode', 'uan',
];

// Shared registration flow: uniqueness checks, hashing, vault-encrypted fields, save.
async function createAccount(body, role, fieldNames) {
  if (await User.exists({ phone: body.phone })) {
    throw new AppError('Phone number already registered', 409, { phone: 'Already registered' });
  }

  if (body.nationalId) {
    const hash = sha256Hash(body.nationalId);
    if (await User.exists({ nationalIdHash: hash })) {
      throw new AppError('National ID already registered', 409, { nationalId: 'Already registered' });
    }
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  const data = { role, passwordHash };
  for (const field of fieldNames) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const user = new User(data);

  if (body.nationalId) user.setNationalId(body.nationalId);
  if (body.payoutAccount) user.setPayoutAccount(body.payoutAccount);

  await user.save();
  return user;
}

router.post(
  '/register/laborer',
  authLimiter,
  validate(registerLaborerSchema),
  asyncHandler(async (req, res) => {
    const user = await createAccount(req.body, 'laborer', LABORER_FIELDS);
    res.status(201).json({
      success: true,
      token: signToken(user),
      user: user.toSafeJSON(),
    });
  })
);

router.post(
  '/register/contractor',
  authLimiter,
  validate(registerContractorSchema),
  asyncHandler(async (req, res) => {
    const user = await createAccount(req.body, 'contractor', CONTRACTOR_FIELDS);
    res.status(201).json({
      success: true,
      token: signToken(user),
      user: user.toSafeJSON(),
    });
  })
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ phone: req.body.phone })
      .select('+passwordHash +nationalIdEncrypted +payoutAccountEncrypted');

    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      throw new AppError('Invalid phone or password', 401);
    }

    res.status(200).json({
      success: true,
      token: signToken(user),
      user: user.toSafeJSON(),
    });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await User.findById(req.user._id)
      .select('+nationalIdEncrypted +payoutAccountEncrypted');

    if (!doc) {
      throw new AppError('User not found', 404);
    }

    res.json({ success: true, user: doc.toSafeJSON() });
  })
);

module.exports = router;
