const express = require('express');
const User = require('../models/User');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const {
  validate,
  profileUpdateSchema,
  applyDocumentUpdateSchema,
  schemeIdParamSchema,
  objectIdParamSchema,
} = require('../utils/validators');
const { sha256Hash } = require('../utils/crypto');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  evaluateScheme,
  calculateProfileCompleteness,
  calculateDocumentReadiness,
} = require('../services/eligibility');

const router = express.Router();
router.use(requireAuth, requireRole('laborer'));

const PROFILE_FIELDS = [
  'name',
  'gender',
  'state',
  'district',
  'trade',
  'age',
  'monthlyIncome',
  'bocwRegistered',
  'ifscCode',
  'uan',
];

const ACTIVE_STATUSES = ['draft', 'eligible', 'submitted'];

function resolveOfficialPortal(scheme) {
  if (scheme?.portalUrl) return scheme.portalUrl;
  const hay = `${scheme?.title || ''} ${scheme?.code || ''} ${scheme?.category || ''}`.toLowerCase();
  if (hay.includes('e-shram') || hay.includes('eshram')) return 'https://eshram.gov.in/';
  if (hay.includes('maan-dhan') || hay.includes('pm-sym') || hay.includes('pension')) return 'https://maandhan.in/';
  if (hay.includes('ayushman') || hay.includes('pm-jay') || hay.includes('health')) return 'https://beneficiary.nha.gov.in/';
  if (hay.includes('awas') || hay.includes('pmay')) return 'https://pmayg.nic.in/';
  if (hay.includes('bocw') || hay.includes('construction')) return 'https://eshram.gov.in/';
  return 'https://www.myscheme.gov.in/';
}

async function loadUser(userId) {
  const user = await User.findById(userId).select('+nationalIdEncrypted +payoutAccountEncrypted');
  if (!user) throw new AppError('User not found', 404);
  return user;
}

async function computeKpis(userDoc) {
  const apps = await Application.find({ laborerId: userDoc._id }).lean();
  const schemes = await Scheme.find({ isActive: true }).lean();

  const eligibleSchemesCount = schemes.filter(
    (scheme) => evaluateScheme(userDoc, scheme).matched
  ).length;

  const activeApplicationsCount = apps.filter((app) =>
    ACTIVE_STATUSES.includes(app.status)
  ).length;

  const schemeById = new Map(schemes.map((scheme) => [String(scheme._id), scheme]));
  let approvedBenefitsValue = 0;
  for (const app of apps) {
    if (app.status !== 'approved') continue;
    const scheme = schemeById.get(String(app.schemeId));
    if (scheme) approvedBenefitsValue += Number(scheme.benefitAmount) || 0;
  }

  const documentReadinessPercent = calculateDocumentReadiness(apps);
  const profileCompleteness = calculateProfileCompleteness({
    ...userDoc.toObject(),
    nationalIdEncrypted: userDoc.nationalIdEncrypted,
    payoutAccountEncrypted: userDoc.payoutAccountEncrypted,
  });

  return {
    eligibleSchemesCount,
    activeApplicationsCount,
    approvedBenefitsValue,
    documentReadinessPercent,
    profileCompleteness,
  };
}

router.get(
  '/kpis',
  asyncHandler(async (req, res) => {
    const user = await loadUser(req.user._id);
    const kpis = await computeKpis(user);
    res.json({ success: true, kpis });
  })
);

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const user = await loadUser(req.user._id);
    const profile = user.toSafeJSON();
    const kpis = await computeKpis(user);
    const applications = await Application.find({ laborerId: req.user._id })
      .populate('schemeId', 'code title category benefitAmount portalUrl')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, profile, kpis, applications });
  })
);

router.get(
  '/schemes',
  asyncHandler(async (req, res) => {
    const schemes = await Scheme.find({ isActive: true }).sort({ code: 1 }).lean();
    const user = await loadUser(req.user._id);
    const apps = await Application.find({ laborerId: req.user._id })
      .select('_id schemeId referenceId portalUrl status')
      .lean();

    const appBySchemeId = new Map(apps.map((app) => [String(app.schemeId), app]));

    const result = schemes.map((scheme) => {
      const existingApp = appBySchemeId.get(String(scheme._id)) || null;
      const portalUrl = resolveOfficialPortal(scheme);
      return {
        _id: scheme._id,
        code: scheme.code,
        title: scheme.title,
        ministry: scheme.ministry,
        category: scheme.category,
        benefitSummary: scheme.benefitSummary,
        benefitAmount: scheme.benefitAmount,
        requiredDocuments: scheme.requiredDocuments,
        portalUrl,
        eligibility: evaluateScheme(user, scheme),
        applied: existingApp !== null,
        applicationId: existingApp ? String(existingApp._id) : null,
        referenceId: existingApp?.referenceId || null,
      };
    });

    res.json({ success: true, schemes: result });
  })
);

router.post(
  '/schemes/:schemeId/apply',
  validate(schemeIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const scheme = await Scheme.findOne({ _id: req.params.schemeId, isActive: true }).lean();
    if (!scheme) throw new AppError('Scheme not found or inactive', 404);

    const alreadyApplied = await Application.exists({
      laborerId: req.user._id,
      schemeId: scheme._id,
    });
    if (alreadyApplied) throw new AppError('You have already applied for this scheme', 409);

    const {
      nomineeName,
      nomineeRelation,
      worksiteName,
      govApplicationNumber,
      declarationAccepted,
    } = req.body || {};

    const hasFormPayload =
      nomineeName !== undefined ||
      nomineeRelation !== undefined ||
      worksiteName !== undefined ||
      govApplicationNumber !== undefined ||
      declarationAccepted !== undefined;

    if (hasFormPayload) {
      if (!nomineeName || String(nomineeName).trim().length < 2) {
        throw new AppError('Nominee full name is required', 400, {
          nomineeName: 'At least 2 characters required',
        });
      }
      if (!declarationAccepted) {
        throw new AppError('Statutory self-declaration must be accepted', 400, {
          declarationAccepted: 'Required before submitting claim',
        });
      }
    }

    const user = await loadUser(req.user._id);
    const evaluation = evaluateScheme(user, scheme);
    const portalUrl = resolveOfficialPortal(scheme);
    const referenceId = `SS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const application = new Application({
      laborerId: req.user._id,
      schemeId: scheme._id,
      contractorId: user.contractorId || undefined,
      status: govApplicationNumber
        ? 'submitted'
        : evaluation.matched
        ? 'eligible'
        : 'draft',
      referenceId,
      portalUrl,
      govApplicationNumber: govApplicationNumber ? String(govApplicationNumber).trim() : '',
      eligibilitySnapshot: {
        matched: evaluation.matched,
        score: evaluation.score,
        reasons: evaluation.reasons,
        evaluatedAt: new Date(),
      },
      documents: (scheme.requiredDocuments || []).map((name) => ({
        name,
        status: 'pending',
        updatedAt: new Date(),
      })),
      ...(hasFormPayload
        ? {
            formSubmission: {
              nomineeName: String(nomineeName).trim(),
              nomineeRelation: String(nomineeRelation || 'Spouse').trim(),
              worksiteName: worksiteName ? String(worksiteName).trim() : '',
              declarationAccepted: Boolean(declarationAccepted),
              submittedAt: new Date(),
            },
          }
        : {}),
    });
    await application.save();

    res.status(201).json({
      success: true,
      referenceId,
      portalUrl,
      application,
    });
  })
);

router.patch(
  '/profile',
  validate(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    // Only keys the client actually sent with a value; omitted fields must never be written.
    const keys = Object.keys(req.body).filter((key) => req.body[key] !== undefined);

    const user = await User.findById(req.user._id).select(
      '+passwordHash +nationalIdEncrypted +payoutAccountEncrypted'
    );
    if (!user) throw new AppError('User not found', 404);

    for (const key of PROFILE_FIELDS) {
      if (keys.includes(key)) user[key] = req.body[key];
    }

    if (keys.includes('nationalId')) {
      const hash = sha256Hash(req.body.nationalId);
      const taken = await User.exists({ nationalIdHash: hash, _id: { $ne: user._id } });
      if (taken) {
        throw new AppError('National ID already registered', 409, {
          nationalId: 'Already registered',
        });
      }
      user.setNationalId(req.body.nationalId);
    }

    if (keys.includes('payoutAccount')) {
      user.setPayoutAccount(req.body.payoutAccount);
    }

    await user.save();

    const apps = await Application.find({
      laborerId: user._id,
      status: { $in: ['draft', 'eligible'] },
    });
    const schemes = await Scheme.find({ _id: { $in: apps.map((a) => a.schemeId) } }).lean();
    const schemeById = new Map(schemes.map((scheme) => [String(scheme._id), scheme]));

    for (const app of apps) {
      const scheme = schemeById.get(String(app.schemeId));
      if (!scheme) continue;
      const evaluation = evaluateScheme(user, scheme);
      app.eligibilitySnapshot = {
        matched: evaluation.matched,
        score: evaluation.score,
        reasons: evaluation.reasons,
        evaluatedAt: new Date(),
      };
      app.status = evaluation.matched ? 'eligible' : 'draft';
      await app.save();
    }

    res.json({ success: true, user: user.toSafeJSON() });
  })
);

router.patch(
  '/application/:id/documents',
  validate(objectIdParamSchema, 'params'),
  validate(applyDocumentUpdateSchema),
  asyncHandler(async (req, res) => {
    const app = await Application.findOne({ _id: req.params.id, laborerId: req.user._id });
    if (!app) throw new AppError('Application not found', 404);

    const item = app.documents.find((d) => d.name === req.body.documentName);
    if (!item) {
      throw new AppError('Document is not in this application checklist', 404, {
        documentName: 'Not in checklist',
      });
    }

    item.status = req.body.status;
    item.updatedAt = new Date();
    await app.save();

    res.json({
      success: true,
      application: app,
      readiness: calculateDocumentReadiness([app]),
    });
  })
);
module.exports = router;