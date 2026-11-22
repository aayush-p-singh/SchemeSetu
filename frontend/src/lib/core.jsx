import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

export const REGEX = {
  nationalId: /^\d{12}$/,
  phone: /^[6-9]\d{9}$/,
  payoutAccount: /^\d{9,18}$/,
  ifscCode: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  uanNumber: /^\d{12}$/,
};

export function sanitizeField(name, rawValue) {
  const val = String(rawValue ?? '');
  switch (name) {
    case 'nationalId':
    case 'uanNumber':
      return val.replace(/\D/g, '').slice(0, 12);
    case 'phone':
      return val.replace(/\D/g, '').slice(0, 10);
    case 'payoutAccount':
      return val.replace(/\D/g, '').slice(0, 18);
    case 'ifscCode':
      return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    default:
      return val;
  }
}

export function validateVaultFields(data, { requireAuthFields = false } = {}) {
  const errors = {};
  if (requireAuthFields) {
    if (!data.name || data.name.trim().length < 2) errors.name = 'Enter full name (min 2 chars)';
    if (!REGEX.phone.test(data.phone || '')) errors.phone = '10-digit mobile starting with 6–9 required';
    if (!data.password || data.password.length < 6) errors.password = 'Password must be at least 6 characters';
  } else if (data.phone && !REGEX.phone.test(data.phone)) {
    errors.phone = '10-digit mobile starting with 6–9 required';
  }

  if (data.nationalId && !REGEX.nationalId.test(data.nationalId)) {
    errors.nationalId = 'National ID must be strictly 12 numeric digits';
  }
  if (data.payoutAccount && !REGEX.payoutAccount.test(data.payoutAccount)) {
    errors.payoutAccount = 'Account number must be 9 to 18 numeric digits';
  }
  if (data.ifscCode && !REGEX.ifscCode.test(data.ifscCode)) {
    errors.ifscCode = 'IFSC must be 11 chars (e.g., SBIN0001234)';
  }
  if (data.uanNumber && !REGEX.uanNumber.test(data.uanNumber)) {
    errors.uanNumber = 'UAN must be strictly 12 numeric digits';
  }
  return errors;
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('schemesetu_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    localStorage.removeItem('schemesetu_token');
    localStorage.removeItem('schemesetu_user');
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    let detailMsg = '';
    if (Array.isArray(data?.errors) && data.errors[0]) {
      detailMsg = data.errors[0].message || String(data.errors[0]);
    } else if (Array.isArray(data?.details) && data.details[0]) {
      detailMsg = data.details[0].message || String(data.details[0]);
    } else if (Array.isArray(data?.issues) && data.issues[0]) {
      detailMsg = `${data.issues[0].path?.join('.') || 'Field'}: ${data.issues[0].message}`;
    } else if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
      const firstKey = Object.keys(data.fieldErrors)[0];
      if (firstKey) detailMsg = `${firstKey}: ${data.fieldErrors[firstKey]}`;
    } else if (data?.details && typeof data.details === 'object') {
      const firstKey = Object.keys(data.details)[0];
      if (firstKey) detailMsg = `${firstKey}: ${JSON.stringify(data.details[firstKey])}`;
    }
    throw new Error(detailMsg || data?.message || data?.error || `Request failed (${res.status})`);
  }

  return data;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('schemesetu_token') || '');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('schemesetu_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('schemesetu_token')));
  const [chatOpen, setChatOpen] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState('');

  const persistSession = useCallback((newToken, newUser) => {
    localStorage.setItem('schemesetu_token', newToken);
    localStorage.setItem('schemesetu_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('schemesetu_token');
    localStorage.removeItem('schemesetu_user');
    setToken('');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('schemesetu_token')) {
      setLoading(false);
      return null;
    }
    try {
      const res = await apiRequest('/auth/me');
      const u = res.user || res;
      localStorage.setItem('schemesetu_user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch {
      logout();
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (phone, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    persistSession(res.token, res.user);
    return res.user;
  };

  const register = async (role, payload) => {
    const endpoint = role === 'contractor' ? '/auth/register/contractor' : '/auth/register/laborer';
    const res = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    persistSession(res.token, res.user);
    return res.user;
  };

  const askSchemeMitra = useCallback((promptText) => {
    setQueuedPrompt(promptText);
    setChatOpen(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        chatOpen,
        setChatOpen,
        queuedPrompt,
        setQueuedPrompt,
        askSchemeMitra,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function buildClaimDossierText({ app, scheme, user }) {
  const refId = app?.referenceId || 'PENDING-REF';
  const title = scheme?.title || app?.schemeId?.title || 'Welfare Scheme';
  const ministry = scheme?.ministry || app?.schemeId?.ministry || 'Government Welfare Board';
  const benefit = Number(scheme?.benefitAmount || app?.schemeId?.benefitAmount || 0).toLocaleString('en-IN');
  const portalUrl = app?.portalUrl || scheme?.portalUrl || 'https://www.myscheme.gov.in/';
  const nominee = app?.formSubmission?.nomineeName
    ? `${app.formSubmission.nomineeName} (${app.formSubmission.nomineeRelation || 'Nominee'})`
    : 'Not specified';
  const worksite = app?.formSubmission?.worksiteName || 'Not specified';
  const govAck = app?.govApplicationNumber || 'Not yet entered';
  const reasons = Array.isArray(app?.eligibilitySnapshot?.reasons) && app.eligibilitySnapshot.reasons.length
    ? app.eligibilitySnapshot.reasons.map((r) => `  - ${r}`).join('\n')
    : '  - Profile evaluated against scheme rules';
  const docs = Array.isArray(app?.documents) && app.documents.length
    ? app.documents.map((d) => `  - ${d.name}: ${(d.status || 'pending').toUpperCase()}`).join('\n')
    : '  - National ID, Bank Passbook, BOCW / Trade Proof';

  return [
    '============================================================',
    'SCHEMESETU — WELFARE CLAIM DOSSIER & PORTAL HANDOFF RECEIPT',
    '============================================================',
    `Reference ID     : ${refId}`,
    `Generated On     : ${new Date().toLocaleString('en-IN')}`,
    `Application Stage: ${(app?.status || 'draft').toUpperCase()}`,
    `Gov Portal Ack # : ${govAck}`,
    '',
    '--- SCHEME DETAILS ---',
    `Scheme Name      : ${title}`,
    `Ministry / Board : ${ministry}`,
    `Estimated Benefit: INR ${benefit}`,
    `Official Portal  : ${portalUrl}`,
    '',
    '--- APPLICANT & CLAIM DETAILS ---',
    `Applicant Name   : ${user?.name || 'Worker'}`,
    `Mobile Number    : +91 ${user?.phone || ''}`,
    `Trade & Location : ${user?.trade || 'N/A'} | ${user?.district || ''}, ${user?.state || ''}`,
    `Vault KYC Flags  : National ID ${user?.nationalIdVerified ? 'Encrypted/Verified' : 'Pending'} | Bank ${user?.payoutAccountVerified ? 'Encrypted/Verified' : 'Pending'}`,
    `Nominee          : ${nominee}`,
    `Worksite         : ${worksite}`,
    '',
    '--- ELIGIBILITY EVALUATION ---',
    reasons,
    '',
    '--- DOCUMENT READINESS CHECKLIST ---',
    docs,
    '',
    'Note: SchemeSetu prepares your claim dossier and links you to the',
    'official government portal for final verification/submission.',
    '============================================================',
  ].join('\n');
}

export function downloadClaimDossier({ app, scheme, user }) {
  const content = buildClaimDossierText({ app, scheme, user });
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeRef = (app?.referenceId || 'dossier').replace(/[^a-zA-Z0-9_-]/g, '');
  link.href = url;
  link.download = `SchemeSetu-${safeRef}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function printClaimDossier({ app, scheme, user }) {
  const content = buildClaimDossierText({ app, scheme, user })
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const win = window.open('', '_blank', 'width=760,height=840');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>SchemeSetu Dossier - ${app?.referenceId || 'Claim'}</title>
        <style>
          body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 28px; color: #111; line-height: 1.5; }
          pre { white-space: pre-wrap; word-break: break-word; font-size: 12.5px; }
        </style>
      </head>
      <body>
        <pre>${content}</pre>
        <script>window.onload = function() { window.print(); };</script>
      </body>
    </html>
  `);
  win.document.close();
}
function escapeCsvCell(value) {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildContractorComplianceCsv({ workers = [], kpis = {}, contractorName = 'Contractor Hub' }) {
  const headers = [
    'Contractor Hub',
    'Worker Name',
    'Phone',
    'Trade',
    'Monthly Income (INR)',
    'State',
    'District',
    'BOCW Registered',
    'National ID Vault',
    'Payout Account Vault',
    'Readiness Status',
  ];

  const rows = workers.map((w) => {
    const idOk = Boolean(w.nationalIdVerified);
    const bankOk = Boolean(w.payoutAccountVerified);
    const bocwOk = Boolean(w.bocwRegistered);
    const readiness =
      idOk && bankOk && bocwOk
        ? 'Payout & BOCW Ready'
        : idOk && bankOk
        ? 'KYC Ready (BOCW Pending)'
        : 'Action Needed';

    return [
      contractorName,
      w.name || 'Worker',
      w.phone ? `+91 ${w.phone}` : '',
      w.trade || '',
      Number(w.monthlyIncome) || 0,
      w.state || '',
      w.district || '',
      bocwOk ? 'Yes' : 'No',
      idOk ? 'Encrypted/Verified' : 'Missing',
      bankOk ? 'Encrypted/Verified' : 'Missing',
      readiness,
    ].map(escapeCsvCell).join(',');
  });

  const summaryLines = [
    `# SchemeSetu Contractor Compliance & Payout Readiness Report`,
    `# Generated At: ${new Date().toLocaleString('en-IN')}`,
    `# Total Workforce: ${workers.length} | Compliance Score: ${kpis?.complianceScore ?? 'N/A'}% | Benefits Unlocked: INR ${Number(kpis?.benefitsUnlocked || 0).toLocaleString('en-IN')}`,
    '',
    headers.map(escapeCsvCell).join(','),
    ...rows,
  ];

  return summaryLines.join('\n');
}

export function downloadContractorComplianceCsv({ workers = [], kpis = {}, contractorName = 'Contractor Hub' }) {
  const csv = buildContractorComplianceCsv({ workers, kpis, contractorName });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `SchemeSetu-Compliance-Report-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function printContractorComplianceSummary({ workers = [], kpis = {}, contractorName = 'Contractor Hub' }) {
  const total = workers.length;
  const kycReady = workers.filter((w) => w.nationalIdVerified && w.payoutAccountVerified).length;
  const bocwReady = workers.filter((w) => w.bocwRegistered).length;

  const tableRows = workers
    .map((w) => {
      const idBadge = w.nationalIdVerified ? 'Verified' : 'Missing';
      const bankBadge = w.payoutAccountVerified ? 'Verified' : 'Missing';
      const bocwBadge = w.bocwRegistered ? 'Yes' : 'No';
      return `
        <tr>
          <td>${String(w.name || 'Worker').replace(/</g, '&lt;')}</td>
          <td>${String(w.trade || '-').replace(/</g, '&lt;')}</td>
          <td>₹${Number(w.monthlyIncome || 0).toLocaleString('en-IN')}</td>
          <td>${idBadge}</td>
          <td>${bankBadge}</td>
          <td>${bocwBadge}</td>
        </tr>
      `;
    })
    .join('');

  const win = window.open('', '_blank', 'width=840,height=780');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>SchemeSetu Compliance Audit - ${contractorName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { color: #555; font-size: 12px; margin-bottom: 18px; }
          .stats { display: flex; gap: 24px; margin-bottom: 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f4f4f5; }
        </style>
      </head>
      <body>
        <h1>SchemeSetu — Contractor Compliance & Payout Readiness Audit</h1>
        <div class="meta">${String(contractorName).replace(/</g, '&lt;')} • Generated ${new Date().toLocaleString('en-IN')}</div>
        <div class="stats">
          <div><strong>Workforce:</strong> ${total}</div>
          <div><strong>KYC + Payout Ready:</strong> ${kycReady}/${total}</div>
          <div><strong>BOCW Registered:</strong> ${bocwReady}/${total}</div>
          <div><strong>Compliance Score:</strong> ${kpis?.complianceScore ?? 'N/A'}%</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Trade</th>
              <th>Monthly Income</th>
              <th>National ID Vault</th>
              <th>Bank Vault</th>
              <th>BOCW</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>window.onload = function() { window.print(); };</script>
      </body>
    </html>
  `);
  win.document.close();
}
export function simulateSchemeEligibility(profile = {}, scheme = {}) {
  const reasons = [];
  let checksPassed = 0;
  let totalChecks = 0;

  const rules = scheme.eligibilityRules || scheme.criteria || {};
  const age = Number(profile.age);
  const income = Number(profile.monthlyIncome);
  const trade = String(profile.trade || '').trim().toLowerCase();
  const bocw = Boolean(profile.bocwRegistered);

  if (rules.minAge !== undefined && rules.minAge !== null && rules.minAge !== '') {
    totalChecks += 1;
    const minAge = Number(rules.minAge);
    if (!Number.isNaN(age) && age >= minAge) {
      checksPassed += 1;
      reasons.push(`Age ${age} meets minimum ${minAge}`);
    } else {
      reasons.push(`Requires age ≥ ${minAge} (current: ${Number.isNaN(age) ? 'N/A' : age})`);
    }
  }

  if (rules.maxAge !== undefined && rules.maxAge !== null && rules.maxAge !== '') {
    totalChecks += 1;
    const maxAge = Number(rules.maxAge);
    if (!Number.isNaN(age) && age <= maxAge) {
      checksPassed += 1;
      reasons.push(`Age ${age} within maximum ${maxAge}`);
    } else {
      reasons.push(`Requires age ≤ ${maxAge} (current: ${Number.isNaN(age) ? 'N/A' : age})`);
    }
  }

  if (rules.maxMonthlyIncome !== undefined && rules.maxMonthlyIncome !== null && rules.maxMonthlyIncome !== '') {
    totalChecks += 1;
    const maxInc = Number(rules.maxMonthlyIncome);
    if (!Number.isNaN(income) && income <= maxInc) {
      checksPassed += 1;
      reasons.push(`Income ₹${income.toLocaleString('en-IN')}/mo within ₹${maxInc.toLocaleString('en-IN')} limit`);
    } else {
      reasons.push(
        `Income ₹${Number.isNaN(income) ? 0 : income.toLocaleString('en-IN')}/mo exceeds ₹${maxInc.toLocaleString('en-IN')} cap`
      );
    }
  }

  if (Array.isArray(rules.allowedTrades) && rules.allowedTrades.length > 0) {
    totalChecks += 1;
    const allowedLower = rules.allowedTrades.map((t) => String(t).toLowerCase());
    if (trade && allowedLower.includes(trade)) {
      checksPassed += 1;
      reasons.push(`Trade "${profile.trade}" is eligible`);
    } else {
      reasons.push(`Trade requires ${rules.allowedTrades.join(', ')} (current: ${profile.trade || 'N/A'})`);
    }
  }

  if (rules.requiresBocw === true) {
    totalChecks += 1;
    if (bocw) {
      checksPassed += 1;
      reasons.push('BOCW registration active');
    } else {
      reasons.push('Requires active BOCW registration');
    }
  }

  // Fallback heuristic if a seeded scheme doesn't expose structured eligibilityRules
  if (totalChecks === 0) {
    const text = `${scheme.title || ''} ${scheme.benefitSummary || ''} ${scheme.description || ''}`.toLowerCase();
    totalChecks = 2;

    if (text.includes('bocw') || text.includes('construction')) {
      if (bocw || Boolean(trade)) {
        checksPassed += 1;
        reasons.push(bocw ? 'BOCW registration active' : `Construction trade (${profile.trade || 'set'}) matches sector`);
      } else {
        reasons.push('BOCW registration or construction trade recommended');
      }
    } else {
      checksPassed += 1;
      reasons.push('General unorganized worker profile check passed');
    }

    const incomeCap = text.includes('15,000') || text.includes('15000') ? 15000 : 25000;
    if (!Number.isNaN(income) && income <= incomeCap) {
      checksPassed += 1;
      reasons.push(`Monthly income ₹${income.toLocaleString('en-IN')} within ₹${incomeCap.toLocaleString('en-IN')} benchmark`);
    } else {
      reasons.push(`Monthly income ₹${Number.isNaN(income) ? 0 : income.toLocaleString('en-IN')} above ₹${incomeCap.toLocaleString('en-IN')} benchmark`);
    }
  }

  const score = totalChecks > 0 ? Math.round((checksPassed / totalChecks) * 100) : 100;
  const matched = checksPassed === totalChecks;

  return { matched, score, reasons };
}