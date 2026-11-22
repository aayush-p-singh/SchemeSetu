'use strict';

/*
 * End-to-end smoke test for the Scheme Setu API.
 * Requires the server to be running. Usage: node verify.js
 * Never prints tokens, nationalId or payoutAccount values.
 */

require('dotenv').config();

const PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${PORT}/api`;
const TEST_PASSWORD = 'VerifyPass@123';
const PAYOUT_ACCOUNT = '123456789';
const IFSC_CODE = 'SBIN0001234';

// ---------- Fresh per-run test data ----------

function randomDigits(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}
const freshPhone = () => '7' + randomDigits(9);
const freshNationalId = () => '5' + randomDigits(11);

const RUN = {
  laborerPhone: freshPhone(),
  contractorPhone: freshPhone(),
  workerPhone: freshPhone(),
  laborerNationalId: freshNationalId(),
  workerNationalId: freshNationalId(),
};

// Shared state filled in by earlier checks.
const S = {
  laborerToken: null,
  contractorToken: null,
  schemes: [],
  applicationId: null,
  documentName: null,
  workerId: null,
};

// ---------- Result tracking & helpers ----------

let passCount = 0;
let failCount = 0;
let skipCount = 0;

class SkipError extends Error {}
class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.isNetwork = true;
  }
}

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

function expectStatus(res, code) {
  const detail = res.json && res.json.error ? ` (${res.json.error})` : '';
  expect(res.status === code, `expected HTTP ${code}, got ${res.status}${detail}`);
}

async function request(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new NetworkError(`Server not reachable at ${BASE}; is it running?`);
  }

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function printSummary() {
  console.log('');
  console.log(`Summary: ${passCount} PASS, ${failCount} FAIL, ${skipCount} SKIP`);
}

async function check(name, fn) {
  try {
    await fn();
    passCount++;
    console.log(`PASS ${name}`);
  } catch (err) {
    if (err instanceof SkipError) {
      skipCount++;
      console.log(`SKIP ${name}: ${err.message}`);
      return;
    }
    failCount++;
    console.log(`FAIL ${name}: ${err.message}`);
    if (err instanceof NetworkError) {
      printSummary();
      process.exit(1);
    }
  }
}

// ---------- Payload builders ----------

function laborerPayload(overrides = {}) {
  return {
    name: 'Verify Laborer',
    phone: RUN.laborerPhone,
    password: TEST_PASSWORD,
    age: 30,
    gender: 'Male',
    state: 'Bihar',
    district: 'Patna',
    trade: 'Mason',
    monthlyIncome: 12000,
    bocwRegistered: true,
    nationalId: RUN.laborerNationalId,
    payoutAccount: PAYOUT_ACCOUNT,
    ifscCode: IFSC_CODE,
    ...overrides,
  };
}

function contractorPayload(overrides = {}) {
  return {
    name: 'Verify Contractor',
    phone: RUN.contractorPhone,
    password: TEST_PASSWORD,
    state: 'Bihar',
    district: 'Patna',
    companyName: 'Verify Builders Pvt Ltd',
    age: 45,
    gender: 'Male',
    trade: 'Plumber',
    monthlyIncome: 80000,
    bocwRegistered: true,
    ...overrides,
  };
}

function workerPayload(overrides = {}) {
  return {
    name: 'Verify Worker',
    phone: RUN.workerPhone,
    password: 'VerifyPass@123',
    age: 28,
    gender: 'Male',
    state: 'Bihar',
    district: 'Patna',
    trade: 'Carpenter',
    monthlyIncome: 11000,
    bocwRegistered: true,
    nationalId: RUN.workerNationalId,
    payoutAccount: PAYOUT_ACCOUNT,
    ifscCode: IFSC_CODE,
    ...overrides,
  };
}

// ---------- Check groups ----------

async function checkHealth() {
  const res = await request('GET', '/health');
  expectStatus(res, 200);
  expect(res.json && res.json.status === 'ok', 'health json.status is not "ok"');
}

async function checkValidation() {
  const cases = [
    ['short nationalId', laborerPayload({ nationalId: '12345' }), 'nationalId'],
    ['non-numeric nationalId', laborerPayload({ nationalId: 'ABCDEFGHIJKL' }), 'nationalId'],
    ['invalid phone', laborerPayload({ phone: '1234567890' }), 'phone'],
    ['lowercase ifscCode', laborerPayload({ ifscCode: 'sbin0001234' }), 'ifscCode'],
  ];
  for (const [label, body, field] of cases) {
    const res = await request('POST', '/auth/register/laborer', { body });
    expectStatus(res, 400);
    expect(
      res.json && res.json.fields && res.json.fields[field] !== undefined,
      `${label}: response missing fields.${field}`
    );
  }
}

async function checkLaborerRegistration() {
  const res = await request('POST', '/auth/register/laborer', { body: laborerPayload() });
  expectStatus(res, 201);
  expect(typeof res.json.token === 'string', 'json.token is not a string');
  expect(res.json.user, 'json.user missing');
  expect(res.json.user.nationalIdVerified === true, 'nationalIdVerified is not true');
  expect(res.json.user.payoutAccountVerified === true, 'payoutAccountVerified is not true');
  expect(res.json.user.nationalId === undefined, 'json.user.nationalId leaked');
  expect(res.json.user.passwordHash === undefined, 'json.user.passwordHash leaked');
  expect(
    !JSON.stringify(res.json).includes(RUN.laborerNationalId),
    'response body contains the nationalId digits'
  );
}

async function checkDuplicate() {
  const res = await request('POST', '/auth/register/laborer', { body: laborerPayload() });
  expectStatus(res, 409);
}

async function checkLogin() {
  const ok = await request('POST', '/auth/login', {
    body: { phone: RUN.laborerPhone, password: TEST_PASSWORD },
  });
  expectStatus(ok, 200);
  expect(typeof ok.json.token === 'string', 'login json.token is not a string');
  S.laborerToken = ok.json.token;

  const bad = await request('POST', '/auth/login', {
    body: { phone: RUN.laborerPhone, password: 'WrongPass@999' },
  });
  expectStatus(bad, 401);
}

async function checkMe() {
  const res = await request('GET', '/auth/me', { token: S.laborerToken });
  expectStatus(res, 200);
  expect(res.json.user && res.json.user.phone === RUN.laborerPhone, 'me phone does not match');
}

async function checkContractorRegistration() {
  const reg = await request('POST', '/auth/register/contractor', { body: contractorPayload() });
  expectStatus(reg, 201);
  expect(typeof reg.json.token === 'string', 'contractor registration token missing');

  const login = await request('POST', '/auth/login', {
    body: { phone: RUN.contractorPhone, password: TEST_PASSWORD },
  });
  expectStatus(login, 200);
  S.contractorToken = login.json.token;
}

async function checkRbac() {
  expectStatus(await request('GET', '/laborer/kpis'), 401);
  expectStatus(await request('GET', '/laborer/kpis', { token: S.contractorToken }), 403);
  expectStatus(await request('GET', '/contractor/kpis', { token: S.laborerToken }), 403);
  expectStatus(await request('POST', '/ai/chat', { body: { message: 'hi' } }), 401);
}

async function checkLaborerKpis() {
  const res = await request('GET', '/laborer/kpis', { token: S.laborerToken });
  expectStatus(res, 200);
  const k = res.json.kpis || {};
  for (const field of [
    'eligibleSchemesCount',
    'activeApplicationsCount',
    'approvedBenefitsValue',
    'documentReadinessPercent',
    'profileCompleteness',
  ]) {
    expect(typeof k[field] === 'number', `kpis.${field} is not numeric`);
  }
}

async function checkSchemesAndApply() {
  const list = await request('GET', '/laborer/schemes', { token: S.laborerToken });
  expectStatus(list, 200);
  expect(Array.isArray(list.json.schemes), 'json.schemes is not an array');
  expect(list.json.schemes.length >= 1, 'No active schemes; run npm run seed first');
  S.schemes = list.json.schemes;

  const schemeId = S.schemes[0]._id;
  const apply = await request('POST', `/laborer/schemes/${schemeId}/apply`, {
    token: S.laborerToken,
  });
  expectStatus(apply, 201);
  expect(Array.isArray(apply.json.application.documents), 'application.documents is not an array');
  S.applicationId = apply.json.application._id;
  const docs = apply.json.application.documents;
  expect(docs.length >= 1, 'application has no documents to toggle');
  S.documentName = docs[0].name;

  const again = await request('POST', `/laborer/schemes/${schemeId}/apply`, {
    token: S.laborerToken,
  });
  expectStatus(again, 409);
}

async function checkChecklistToggle() {
  const path = `/laborer/application/${S.applicationId}/documents`;
  const ok = await request('PATCH', path, {
    token: S.laborerToken,
    body: { documentName: S.documentName, status: 'uploaded' },
  });
  expectStatus(ok, 200);
  const doc = (ok.json.application.documents || []).find((d) => d.name === S.documentName);
  expect(doc && doc.status === 'uploaded', 'document status was not updated to uploaded');

  const bad = await request('PATCH', path, {
    token: S.laborerToken,
    body: { documentName: S.documentName, status: 'done' },
  });
  expectStatus(bad, 400);
}

async function checkProfileUpdate() {
  const res = await request('PATCH', '/laborer/profile', {
    token: S.laborerToken,
    body: { monthlyIncome: 15000 },
  });
  expectStatus(res, 200);
  expect(res.json.user && res.json.user.monthlyIncome === 15000, 'monthlyIncome not updated');

  expectStatus(
    await request('PATCH', '/laborer/profile', { token: S.laborerToken, body: {} }),
    400
  );
}

async function checkProfileBocwPreserved() {
  const res = await request('PATCH', '/laborer/profile', {
    token: S.laborerToken,
    body: { monthlyIncome: 15001 },
  });
  expectStatus(res, 200);
  expect(res.json.user && res.json.user.monthlyIncome === 15001, 'monthlyIncome not updated');
  expect(
    res.json.user && res.json.user.bocwRegistered === true,
    'Regression: PATCH /profile without bocwRegistered reset bocwRegistered to false'
  );
}

async function checkContractorWorkers() {
  const kpis = await request('GET', '/contractor/kpis', { token: S.contractorToken });
  expectStatus(kpis, 200);
  const k = kpis.json.kpis || {};
  expect(typeof k.totalWorkers === 'number', 'kpis.totalWorkers is not numeric');
  expect(typeof k.complianceScore === 'number', 'kpis.complianceScore is not numeric');

  const create = await request('POST', '/contractor/workers', {
    token: S.contractorToken,
    body: workerPayload(),
  });
  expectStatus(create, 201);
  expect(create.json.worker.nationalIdVerified === true, 'worker nationalIdVerified is not true');
  S.workerId = create.json.worker._id;

  const all = await request('GET', '/contractor/workers', { token: S.contractorToken });
  expectStatus(all, 200);
  const workers = Array.isArray(all.json) ? all.json : all.json.workers;
  expect(Array.isArray(workers), 'workers list is not an array');
  expect(
    workers.some((w) => w.phone === RUN.workerPhone),
    'created worker not found in contractor worker list'
  );

  const searched = await request('GET', '/contractor/workers?search=Carpenter', {
    token: S.contractorToken,
  });
  expectStatus(searched, 200);
  const found = Array.isArray(searched.json) ? searched.json : searched.json.workers;
  expect(Array.isArray(found) && found.length >= 1, 'search=Carpenter returned no workers');
}

async function checkBulkEnroll() {
  const schemes = await request('GET', '/laborer/schemes', { token: S.laborerToken });
  expectStatus(schemes, 200);
  expect(
    Array.isArray(schemes.json.schemes) && schemes.json.schemes.length >= 1,
    'No active schemes; run npm run seed first'
  );
  const schemeId = schemes.json.schemes[0]._id;

  const empty = await request('POST', '/contractor/bulk-enroll', {
    token: S.contractorToken,
    body: { schemeId, laborerIds: [] },
  });
  expectStatus(empty, 400);

  const res = await request('POST', '/contractor/bulk-enroll', {
    token: S.contractorToken,
    body: { schemeId, laborerIds: [S.workerId] },
  });
  expectStatus(res, 201);
  expect(typeof res.json.created === 'number' && res.json.created >= 0, 'json.created invalid');
}

async function checkAiChat() {
  const res = await request('POST', '/ai/chat', {
    token: S.laborerToken,
    body: { message: 'What schemes am I eligible for?' },
  });
  if (res.status === 200) {
    expect(
      typeof res.json.reply === 'string' && res.json.reply.trim().length > 0,
      'json.reply is empty or not a string'
    );
    return;
  }
  if (res.status === 503 && res.json && String(res.json.error || '').includes('AI service is not configured')) {
    throw new SkipError('AI service is not configured');
  }
  throw new Error(`HTTP ${res.status}: ${(res.json && res.json.error) || 'no error message'}`);
}

// ---------- Runner ----------

async function main() {
  console.log(`Verifying API at ${BASE}`);

  await check('1. Health', checkHealth);
  await check('2. Validation (400 with fields)', checkValidation);
  await check('3. Laborer registration', checkLaborerRegistration);
  await check('4. Duplicate registration (409)', checkDuplicate);
  await check('5. Login (200) and wrong password (401)', checkLogin);
  await check('6. Me', checkMe);
  await check('7. Contractor registration and login', checkContractorRegistration);
  await check('8. RBAC (401/403)', checkRbac);
  await check('9. Laborer KPIs', checkLaborerKpis);
  await check('10. Schemes and apply', checkSchemesAndApply);
  await check('11. Checklist toggle', checkChecklistToggle);
  await check('12. Profile update', checkProfileUpdate);
  await check('Profile update preserves bocwRegistered', checkProfileBocwPreserved);
  await check('13. Contractor KPIs and workers', checkContractorWorkers);
  await check('14. Bulk enroll', checkBulkEnroll);
  await check('15. AI chat', checkAiChat);

  printSummary();
  process.exit(failCount > 0 ? 1 : 0);
}

main();
