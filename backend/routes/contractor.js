const express = require('express');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const { validate, workerCreateSchema, bulkEnrollSchema } = require('../utils/validators');
const { sha256Hash } = require('../utils/crypto');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const { evaluateScheme, calculateProfileCompleteness } = require('../services/eligibility');

const router = express.Router();

router.use(requireAuth, requireRole('contractor'));

// ---------- helpers ----------

async function loadWorkers(contractorId, filter = {}) {
  return User.find({ contractorId, role: 'laborer', ...filter })
    .select('+nationalIdEncrypted +payoutAccountEncrypted')
    .sort({ name: 1 });
}

async function computeKpis(contractorId) {
  const workers = await loadWorkers(contractorId);
  const apps = await Application.find({ contractorId }).lean();

  const totalWorkers = workers.length;

  const kycCount = workers.filter((w) => Boolean(w.nationalIdEncrypted)).length;
  const kycVerifiedPercent = totalWorkers ? Math.round((kycCount / totalWorkers) * 100) : 0;

  const activeApplications = apps.filter((a) =>
    ['draft', 'eligible', 'submitted'].includes(a.status)
  ).length;

  const complianceScore = totalWorkers
    ? Math.round(
        workers.reduce(
          (sum, w) =>
            sum +
            calculateProfileCompleteness({
              ...w.toObject(),
              nationalIdEncrypted: w.nationalIdEncrypted,
              payoutAccountEncrypted: w.payoutAccountEncrypted,
            }),
          0
        ) / totalWorkers
      )
    : 0;

  const approvedApps = apps.filter((a) => a.status === 'approved');
  const approvedSchemeIds = approvedApps.map((a) => a.schemeId);
  const schemes = await Scheme.find({ _id: { $in: approvedSchemeIds } }).lean();
  const schemeById = new Map(schemes.map((s) => [String(s._id), s]));

  const totalBenefitUnlocked = approvedApps.reduce((sum, a) => {
    const scheme = schemeById.get(String(a.schemeId));
    return sum + (scheme && scheme.benefitAmount ? scheme.benefitAmount : 0);
  }, 0);

  return {
    totalWorkers,
    kycVerifiedPercent,
    activeApplications,
    complianceScore,
    totalBenefitUnlocked,
  };
}

// ---------- routes ----------

// GET /kpis
router.get(
  '/kpis',
  asyncHandler(async (req, res) => {
    res.json({ success: true, kpis: await computeKpis(req.user._id) });
  })
);

// GET /dashboard
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const kpis = await computeKpis(req.user._id);
    const workers = await loadWorkers(req.user._id);

    const workerSummary = workers.slice(0, 10).map((w) => ({
      _id: w._id,
      name: w.name,
      trade: w.trade,
      state: w.state,
      profileCompleteness: w.profileCompleteness,
      nationalIdVerified: Boolean(w.nationalIdEncrypted),
      payoutAccountVerified: Boolean(w.payoutAccountEncrypted),
    }));

    const recentApplications = await Application.find({ contractorId: req.user._id })
      .populate('laborerId', 'name trade')
      .populate('schemeId', 'code title')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, kpis, workers: workerSummary, recentApplications });
  })
);

// GET /workers
router.get(
  '/workers',
  asyncHandler(async (req, res) => {
    const filter = {};
    const search =
      typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { phone: regex }, { trade: regex }];
    }

    const workers = await loadWorkers(req.user._id, filter);
    res.json({ success: true, workers: workers.map((w) => w.toSafeJSON()) });
  })
);

// POST /workers
router.post(
  '/workers',
  validate(workerCreateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body;

    if (await User.exists({ phone: body.phone })) {
      throw new AppError('Phone number already registered', 409, { phone: 'Already registered' });
    }

    if (body.nationalId) {
      if (await User.exists({ nationalIdHash: sha256Hash(body.nationalId) })) {
        throw new AppError('National ID already registered', 409, {
          nationalId: 'Already registered',
        });
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const profileKeys = [
      'name',
      'phone',
      'age',
      'gender',
      'state',
      'district',
      'trade',
      'monthlyIncome',
      'bocwRegistered',
      'ifscCode',
      'uan',
    ];
    const fields = {};
    for (const key of profileKeys) {
      if (body[key] !== undefined) fields[key] = body[key];
    }
    fields.role = 'laborer';
    fields.contractorId = req.user._id;
    fields.passwordHash = passwordHash;

    const worker = new User(fields);
    if (body.nationalId) worker.setNationalId(body.nationalId);
    if (body.payoutAccount) worker.setPayoutAccount(body.payoutAccount);

    await worker.save();

    res.status(201).json({ success: true, worker: worker.toSafeJSON() });
  })
);

// POST /bulk-enroll
router.post(
  '/bulk-enroll',
  validate(bulkEnrollSchema),
  asyncHandler(async (req, res) => {
    const body = req.body;

    const scheme = await Scheme.findOne({ _id: body.schemeId, isActive: true }).lean();
    if (!scheme) {
      throw new AppError('Scheme not found or inactive', 404);
    }

    const workers = await User.find({
      _id: { $in: body.laborerIds },
      contractorId: req.user._id,
      role: 'laborer',
    }).select('+nationalIdEncrypted +payoutAccountEncrypted');

    const assignedIds = new Set(workers.map((w) => String(w._id)));

    const skipped = body.laborerIds
      .filter((id) => !assignedIds.has(id))
      .map((id) => ({ laborerId: id, reason: 'Not assigned to this contractor' }));

    const existing = await Application.find({
      schemeId: scheme._id,
      laborerId: { $in: [...assignedIds] },
    })
      .select('laborerId')
      .lean();
    const existingSet = new Set(existing.map((a) => String(a.laborerId)));

    const docs = [];
    for (const worker of workers) {
      const workerId = String(worker._id);
      if (existingSet.has(workerId)) {
        skipped.push({ laborerId: workerId, reason: 'Already applied' });
        continue;
      }

      const evaluation = evaluateScheme(worker, scheme);
      const now = new Date();

      docs.push({
        laborerId: worker._id,
        schemeId: scheme._id,
        contractorId: req.user._id,
        status: evaluation.matched ? 'eligible' : 'draft',
        eligibilitySnapshot: {
          matched: evaluation.matched,
          score: evaluation.score,
          reasons: evaluation.reasons,
          evaluatedAt: now,
        },
        documents: (scheme.requiredDocuments || []).map((name) => ({
          name,
          status: 'pending',
          updatedAt: now,
        })),
      });
    }

    if (docs.length) {
      await Application.insertMany(docs);
    }

    res.status(201).json({
      success: true,
      created: docs.length,
      enrolled: docs.map((d) => String(d.laborerId)),
      skipped,
    });
  })
);

router.get(
  '/schemes',
  asyncHandler(async (req, res) => {
    const schemes = await Scheme.find({ isActive: true })
      .select('_id code title category benefitAmount requiredDocuments eligibilityRules')
      .sort({ code: 1 })
      .lean();
    res.json({ success: true, schemes });
  })
);


module.exports = router;
