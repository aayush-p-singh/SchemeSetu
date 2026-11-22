'use strict';

/**
 * Pure eligibility and readiness helpers. No database or I/O.
 * Reasons never include national ID or payout account values.
 */

const PROFILE_FIELDS = [
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

function isNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value);
}

function isFilled(value) {
  return value !== undefined && value !== null && value !== '';
}

function normaliseTrade(value) {
  return String(value).trim().toLowerCase();
}

/**
 * Evaluate a scheme's eligibility rules against a user.
 * @returns {{ matched: boolean, score: number, reasons: string[] }}
 */
function evaluateScheme(user, scheme) {
  const rules = (scheme && scheme.eligibilityRules) || {};
  const profile = user || {};
  const outcomes = [];

  if (isNumber(rules.minAge)) {
    if (!isNumber(profile.age)) {
      outcomes.push({ ok: false, reason: 'Not eligible: age is not on file' });
    } else if (profile.age >= rules.minAge) {
      outcomes.push({ ok: true, reason: `Eligible: age ${profile.age} meets the minimum of ${rules.minAge}` });
    } else {
      outcomes.push({ ok: false, reason: `Not eligible: age ${profile.age} is below the minimum of ${rules.minAge}` });
    }
  }

  if (isNumber(rules.maxAge)) {
    if (!isNumber(profile.age)) {
      outcomes.push({ ok: false, reason: 'Not eligible: age is not on file' });
    } else if (profile.age <= rules.maxAge) {
      outcomes.push({ ok: true, reason: `Eligible: age ${profile.age} is within the maximum of ${rules.maxAge}` });
    } else {
      outcomes.push({ ok: false, reason: `Not eligible: age ${profile.age} is above the maximum of ${rules.maxAge}` });
    }
  }

  if (isNumber(rules.maxMonthlyIncome)) {
    if (!isNumber(profile.monthlyIncome)) {
      outcomes.push({ ok: false, reason: 'Not eligible: monthly income is not on file' });
    } else if (profile.monthlyIncome <= rules.maxMonthlyIncome) {
      outcomes.push({ ok: true, reason: `Eligible: monthly income ${profile.monthlyIncome} is within the limit of ${rules.maxMonthlyIncome}` });
    } else {
      outcomes.push({ ok: false, reason: `Not eligible: monthly income ${profile.monthlyIncome} is above the limit of ${rules.maxMonthlyIncome}` });
    }
  }

  if (Array.isArray(rules.allowedTrades) && rules.allowedTrades.length > 0) {
    const allowedList = rules.allowedTrades.join(', ');
    if (!isFilled(profile.trade)) {
      outcomes.push({ ok: false, reason: 'Not eligible: trade is not on file' });
    } else {
      const allowed = rules.allowedTrades.some(
        (t) => normaliseTrade(t) === normaliseTrade(profile.trade)
      );
      if (allowed) {
        outcomes.push({ ok: true, reason: `Eligible: trade ${profile.trade} is in the allowed trades (${allowedList})` });
      } else {
        outcomes.push({ ok: false, reason: `Not eligible: trade ${profile.trade} is not in the allowed trades (${allowedList})` });
      }
    }
  }

  if (rules.requiresBocw === true) {
    if (profile.bocwRegistered === true) {
      outcomes.push({ ok: true, reason: 'Eligible: BOCW registration is held' });
    } else if (!isFilled(profile.bocwRegistered)) {
      outcomes.push({ ok: false, reason: 'Not eligible: BOCW registration status is not on file' });
    } else {
      outcomes.push({ ok: false, reason: 'Not eligible: BOCW registration is required' });
    }
  }

  if (outcomes.length === 0) {
    return { matched: true, score: 100, reasons: ['No eligibility conditions apply'] };
  }

  const satisfied = outcomes.filter((o) => o.ok).length;
  return {
    matched: satisfied === outcomes.length,
    score: Math.round((satisfied / outcomes.length) * 100),
    reasons: outcomes.map((o) => o.reason),
  };
}

/**
 * Percentage (0-100) of the 13 profile fields that are filled.
 */
function calculateProfileCompleteness(user) {
  const profile = user || {};
  const filled = PROFILE_FIELDS.filter((field) => isFilled(profile[field])).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

/**
 * Percentage (0-100) of documents across all applications that are
 * 'uploaded' or 'verified'. Returns 0 when there are no documents.
 */
function calculateDocumentReadiness(applications) {
  const list = Array.isArray(applications) ? applications : [];
  let total = 0;
  let ready = 0;

  for (const app of list) {
    const documents = app && Array.isArray(app.documents) ? app.documents : [];
    for (const doc of documents) {
      total += 1;
      if (doc && (doc.status === 'uploaded' || doc.status === 'verified')) {
        ready += 1;
      }
    }
  }

  if (total === 0) return 0;
  return Math.round((ready / total) * 100);
}

module.exports = {
  evaluateScheme,
  calculateProfileCompleteness,
  calculateDocumentReadiness,
};
