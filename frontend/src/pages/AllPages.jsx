import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Mic,
  CheckCircle2,
  Clock,
  FileCheck2,
  Sparkles,
  Search,
  UserPlus,
  Layers,
  RefreshCw,
  Newspaper,
  IndianRupee,
  Award,
  Briefcase,
  X,
} from 'lucide-react';
import { CreditCard, CheckCircle2 /* ...your existing icons */ } from 'lucide-react';
import {
  apiRequest,
  sanitizeField,
  validateVaultFields,
  useAuth,
  downloadClaimDossier,
  printClaimDossier,
  downloadContractorComplianceCsv,
  printContractorComplianceSummary,
  simulateSchemeEligibility,
} from '../lib/core';
import { AppShell, KpiCard, ProgressRing, VaultInput } from '../components/ShellAndUi';

const TRADES = ['Mason', 'Electrician', 'Plumber', 'Carpenter', 'Welder', 'Painter', 'General Helper'];

function getOfficialPortalUrl(scheme) {
  if (scheme?.portalUrl) return scheme.portalUrl;
  const title = (scheme?.title || '').toLowerCase();
  if (title.includes('e-shram') || title.includes('eshram')) return 'https://eshram.gov.in/';
  if (title.includes('maan-dhan') || title.includes('pm-sym') || title.includes('pension')) return 'https://maandhan.in/';
  if (title.includes('ayushman') || title.includes('pm-jay') || title.includes('health')) return 'https://beneficiary.nha.gov.in/';
  if (title.includes('awas') || title.includes('pmay')) return 'https://pmayg.nic.in/';
  return 'https://www.myscheme.gov.in/';
}

/* =========================================================
1. LANDING PAGE (/)
   ========================================================= */
export function Landing() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState('');
  const [demoError, setDemoError] = useState('');

  const handleDemoAccess = async (role) => {
    setDemoError('');
    setDemoLoading(role);
    const creds =
      role === 'contractor'
        ? {
            phone: '9876543200',
            password: 'Password@123',
            fallback: {
              name: 'Vikramaditya Builders',
              phone: '9811122200',
              password: 'Password@123',
              companyName: 'Apex Infra Projects Pvt Ltd',
              state: 'Delhi',
              district: 'New Delhi',
            },
          }
        : {
            phone: '9876543210',
            password: 'Password@123',
            fallback: {
              name: 'Ramesh Kumar',
              phone: '9811122211',
              password: 'Password@123',
              age: 32,
              gender: 'Male',
              state: 'Delhi',
              district: 'South Delhi',
              trade: 'Mason',
              monthlyIncome: 14500,
              bocwRegistered: true,
            },
          };

    try {
      try {
        await login(creds.phone, creds.password);
      } catch {
        try {
          await login(creds.fallback.phone, creds.fallback.password);
        } catch {
          await register(role, creds.fallback);
        }
      }
      navigate(role === 'contractor' ? '/contractor' : '/laborer');
    } catch (err) {
      setDemoError(err.message || 'Could not start demo session');
    } finally {
      setDemoLoading('');
    }
  };

  return (
    <div className="min-h-screen mesh-bg">
      <header className="border-b border-zinc-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-base font-semibold tracking-tight text-zinc-950">SchemeSetu</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to={user.role === 'contractor' ? '/contractor' : '/laborer'}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white"
              >
                Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-xs font-medium text-zinc-700 hover:text-zinc-950 px-3 py-2">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800 mb-6">
            <Lock className="w-3.5 h-3.5" />
            <span>AES-256-GCM Encrypted Identity Vault • Sarvam & Gnani Voice AI</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-zinc-950 leading-[1.08]">
            Automated welfare & compliance infrastructure for India’s workforce.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-zinc-600 leading-relaxed max-w-2xl">
            Real-time eligibility scoring, encrypted KYC verification, bulk contractor enrollment, and a bilingual Indic voice assistant built for construction workers and enterprise contractors.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-all shadow-sm"
            >
              Create Account <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => handleDemoAccess('laborer')}
              disabled={Boolean(demoLoading)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer disabled:opacity-50"
            >
              {demoLoading === 'laborer' ? 'Launching...' : '1-Click Demo: Laborer'}
            </button>
            <button
              onClick={() => handleDemoAccess('contractor')}
              disabled={Boolean(demoLoading)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer disabled:opacity-50"
            >
              {demoLoading === 'contractor' ? 'Launching...' : '1-Click Demo: Contractor'}
            </button>
          </div>

          {demoError && <p className="mt-3 text-xs text-rose-600">{demoError}</p>}
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Zero-Exposure PII Vault',
              desc: '12-digit National IDs and payout accounts are encrypted with AES-256-GCM at rest and never exposed in API payloads.',
            },
            {
              icon: Mic,
              title: 'Indic Voice Co-Pilot',
              desc: 'Workers speak naturally in Hindi, Tamil, Marathi, or Bengali via Gnani STT/TTS and Sarvam 105B reasoning.',
            },
            {
              icon: Layers,
              title: 'Contractor Bulk Compliance',
              desc: 'Contractors track BOCW readiness, KYC coverage, and enroll entire site crews into welfare schemes in one click.',
            },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs"
              >
                <div className="mb-4 inline-flex rounded-xl bg-zinc-100 p-2.5 text-zinc-900">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-zinc-950">{card.title}</h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{card.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

/* =========================================================
2. LOGIN (/login) & REGISTER (/register)
   ========================================================= */
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await login(phone, password);
      navigate(u.role === 'contractor' ? '/contractor' : '/laborer');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-zinc-950">SchemeSetu</span>
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Welcome back</h1>
        <p className="mt-1 text-xs text-zinc-500">Sign in with your 10-digit registered mobile number.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <VaultInput
            label="Mobile Number"
            name="phone"
            value={phone}
            onChange={(_, v) => setPhone(v)}
            maxDigits={10}
            placeholder="9876543210"
          />
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
            />
          </div>

          {error && <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-zinc-950 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          New to SchemeSetu?{' '}
          <Link to="/register" className="font-semibold text-zinc-950 underline">
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('laborer');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    age: '28',
    gender: 'Male',
    state: 'Delhi',
    district: 'New Delhi',
    trade: 'Mason',
    monthlyIncome: '14000',
    bocwRegistered: true,
    companyName: '',
    nationalId: '',
    payoutAccount: '',
    ifscCode: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const fieldErrors = validateVaultFields(form, { requireAuthFields: true });
    if (role === 'contractor' && !form.companyName.trim()) {
      fieldErrors.companyName = 'Company or agency name is required';
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const payload =
        role === 'contractor'
          ? {
              name: form.name.trim(),
              phone: form.phone,
              password: form.password,
              companyName: form.companyName.trim(),
              state: form.state,
              district: form.district,
            }
          : {
              name: form.name.trim(),
              phone: form.phone,
              password: form.password,
              age: Number(form.age) || 28,
              gender: form.gender,
              state: form.state,
              district: form.district,
              trade: form.trade,
              monthlyIncome: Number(form.monthlyIncome) || 0,
              bocwRegistered: Boolean(form.bocwRegistered),
              ...(form.nationalId ? { nationalId: form.nationalId } : {}),
              ...(form.payoutAccount ? { payoutAccount: form.payoutAccount } : {}),
              ...(form.ifscCode ? { ifscCode: form.ifscCode } : {}),
            };

      const u = await register(role, payload);
      navigate(u.role === 'contractor' ? '/contractor' : '/laborer');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-950">SchemeSetu</span>
          </Link>

          <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/70">
            {['laborer', 'contractor'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`relative px-3.5 py-1.5 text-xs font-semibold capitalize cursor-pointer ${
                  role === r ? 'text-zinc-950' : 'text-zinc-500'
                }`}
              >
                {role === r && (
                  <motion.span
                    layoutId="rolePill"
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className="absolute inset-0 rounded-lg bg-white shadow-2xs"
                  />
                )}
                <span className="relative z-10">{r}</span>
              </button>
            ))}
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Create {role === 'contractor' ? 'Contractor' : 'Worker'} Account
        </h1>
        <p className="mt-1 text-xs text-zinc-500">All identity fields are validated and AES-256-GCM encrypted.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ramesh Kumar"
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
            </div>

            <VaultInput
              label="Mobile Number (10 digits)"
              name="phone"
              value={form.phone}
              onChange={updateField}
              maxDigits={10}
              placeholder="9876543210"
              error={errors.phone}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Min 6 characters"
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
              />
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
            </div>

            {role === 'contractor' ? (
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Company / Agency Name</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="Apex Constructions"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
                />
                {errors.companyName && <p className="mt-1 text-xs text-rose-600">{errors.companyName}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Primary Trade</label>
                <select
                  value={form.trade}
                  onChange={(e) => updateField('trade', e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900 bg-white"
                >
                  {TRADES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">District</label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => updateField('district', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          {role === 'laborer' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">Age (18–75)</label>
                  <input
                    type="number"
                    min={18}
                    max={75}
                    value={form.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">Monthly Income (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.monthlyIncome}
                    onChange={(e) => updateField('monthlyIncome', e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900 tabular-nums"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.bocwRegistered}
                      onChange={(e) => updateField('bocwRegistered', e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 accent-zinc-950"
                    />
                    BOCW Registered
                  </label>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <VaultInput
                  label="12-Digit National ID (Optional)"
                  name="nationalId"
                  value={form.nationalId}
                  onChange={updateField}
                  maxDigits={12}
                  placeholder="123456789012"
                  error={errors.nationalId}
                />
                <VaultInput
                  label="Payout Account (Optional)"
                  name="payoutAccount"
                  value={form.payoutAccount}
                  onChange={updateField}
                  maxDigits={18}
                  placeholder="9–18 digits"
                  error={errors.payoutAccount}
                />
                <VaultInput
                  label="IFSC Code (Optional)"
                  name="ifscCode"
                  value={form.ifscCode}
                  onChange={updateField}
                  maxDigits={11}
                  placeholder="SBIN0001234"
                  error={errors.ifscCode}
                />
              </div>
            </>
          )}

          {serverError && (
            <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-zinc-950 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Creating Encrypted Profile...' : 'Complete Registration'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-zinc-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-zinc-950 underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

/* =========================================================
3. LABORER COMMAND CENTER (/laborer)
   ========================================================= */
export function LaborerDashboard() {
  const { user, refreshUser } = useAuth();
  const [kpis, setKpis] = useState({
    eligibleSchemesCount: 0,
    activeApplicationsCount: 0,
    approvedBenefitsValue: 0,
    documentReadinessPercent: 0,
    profileCompleteness: user?.profileCompleteness || 0,
  });
  const [applications, setApplications] = useState([]);
  const [newsPreview, setNewsPreview] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const [dashRes, kpiRes] = await Promise.all([
        apiRequest('/laborer/dashboard'),
        apiRequest('/laborer/kpis').catch(() => null),
      ]);
      const mergedKpis = { ...(dashRes.kpis || {}), ...(kpiRes?.kpis || kpiRes || {}) };
      setKpis((prev) => ({ ...prev, ...mergedKpis }));
      setApplications(dashRes.applications || []);
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }

    apiRequest('/ai/news')
      .then((res) => {
        const list = Array.isArray(res) ? res : res.news || [];
        setNewsPreview(list.slice(0, 3));
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const updateApplicationMeta = async (appId, payload) => {
    setApplications((prev) =>
      prev.map((a) => (a._id === appId ? { ...a, ...payload } : a))
    );
    try {
      const res = await apiRequest(`/laborer/application/${appId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (res?.application) {
        setApplications((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, ...res.application } : a))
        );
      }
      const kpiRes = await apiRequest('/laborer/kpis').catch(() => null);
      if (kpiRes?.kpis || kpiRes) {
        setKpis((prev) => ({ ...prev, ...(kpiRes?.kpis || kpiRes) }));
      }
    } catch {
      loadDashboard();
    }
  };

  const cycleDocStatus = async (appId, doc) => {
    const order = ['pending', 'uploaded', 'verified'];
    const nextStatus = order[(order.indexOf(doc.status) + 1) % order.length];

    setApplications((prev) =>
      prev.map((app) =>
        app._id === appId
          ? {
              ...app,
              documents: app.documents.map((d) => (d.name === doc.name ? { ...d, status: nextStatus } : d)),
            }
          : app
      )
    );

    try {
      await apiRequest(`/laborer/application/${appId}/documents`, {
        method: 'PATCH',
        body: JSON.stringify({ documentName: doc.name, status: nextStatus }),
      });
      const kpiRes = await apiRequest('/laborer/kpis');
      setKpis((prev) => ({ ...prev, ...(kpiRes?.kpis || kpiRes) }));
      refreshUser();
    } catch {
      loadDashboard();
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Worker Command Center</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Trade: <strong className="text-zinc-800">{user?.trade || 'Worker'}</strong> • Location:{' '}
            <strong className="text-zinc-800">{user?.state || 'India'}</strong>
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 shadow-2xs">
          <ProgressRing
            percent={kpis.profileCompleteness ?? user?.profileCompleteness ?? 0}
            size={64}
            stroke={6}
            label="Profile Completeness"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Eligible Schemes"
          value={kpis.eligibleSchemesCount}
          icon={Sparkles}
          accent="emerald"
          subtext="Matched to your profile"
        />
        <KpiCard
          label="Active Applications"
          value={kpis.activeApplicationsCount}
          icon={FileCheck2}
          subtext="Submitted or in review"
        />
        <KpiCard
          label="Approved Benefits"
          value={kpis.approvedBenefitsValue}
          prefix="₹"
          icon={IndianRupee}
          accent="emerald"
          subtext="Direct Benefit Transfer value"
        />
        <KpiCard
          label="Document Readiness"
          value={kpis.documentReadinessPercent}
          suffix="%"
          icon={ShieldCheck}
          accent="amber"
          subtext="Click checklist items to update"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-950">Applications & Explainable Eligibility</h2>
            <Link to="/laborer/schemes" className="text-xs font-semibold text-zinc-900 underline">
              Explore all schemes →
            </Link>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500">
              Loading live applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-zinc-900">No active scheme applications yet</p>
              <p className="mt-1 text-xs text-zinc-500">Browse matched welfare schemes and apply in one click.</p>
              <Link
                to="/laborer/schemes"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white"
              >
                Discover Schemes <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            applications.map((app) => {
              const scheme = app.schemeId || {};
              const snap = app.eligibilitySnapshot || { matched: true, score: 85, reasons: [] };
              return (
                <motion.div
                  key={app._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                          {scheme.category || 'Welfare'}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            snap.matched ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {snap.matched ? `Matched • ${snap.score}%` : `Partial • ${snap.score}%`}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-zinc-950">{scheme.title || 'Welfare Scheme'}</h3>
                      <p className="text-xs text-zinc-500">{scheme.ministry}</p>
                    </div>
                    <span className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold capitalize text-zinc-800">
                      {app.status}
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${snap.score || 0}%` }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>

                  {snap.reasons?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {snap.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-zinc-50 border border-zinc-200/70 px-2 py-1 text-[11px] text-zinc-600"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {app.documents?.length > 0 && (
                    <div className="mt-4 border-t border-zinc-100 pt-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                        Document Checklist (Click to toggle status)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {app.documents.map((doc) => {
                          const styles = {
                            verified: 'border-emerald-200 bg-emerald-50 text-emerald-800',
                            uploaded: 'border-blue-200 bg-blue-50 text-blue-800',
                            pending: 'border-zinc-200 bg-zinc-50 text-zinc-600',
                          };
                          return (
                            <motion.button
                              key={doc.name}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => cycleDocStatus(app._id, doc)}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                styles[doc.status] || styles.pending
                              }`}
                            >
                              {doc.status === 'verified' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                              <span>{doc.name}</span>
                              <span className="uppercase text-[10px] opacity-75">({doc.status})</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => downloadClaimDossier({ app, scheme: app.schemeId, user })}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-800 hover:bg-zinc-100 cursor-pointer"
                    >
                      Download Dossier (.txt)
                    </button>
                    <button
                      type="button"
                      onClick={() => printClaimDossier({ app, scheme: app.schemeId, user })}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    >
                      Print Receipt
                    </button>
                    {app.referenceId && (
                      <span className="ml-auto font-mono text-[11px] text-zinc-500">
                        Ref: {app.referenceId}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Claim Stage
                      </label>
                      <select
                        value={app.status || 'draft'}
                        onChange={(e) => updateApplicationMeta(app._id, { status: e.target.value })}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 outline-none focus:border-zinc-900"
                      >
                        <option value="draft">Draft</option>
                        <option value="eligible">Eligible / Prepared</option>
                        <option value="submitted">Submitted on Portal</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected / Needs Review</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Application Notes / Ack Ref
                      </label>
                      <input
                        type="text"
                        defaultValue={app.notes || ''}
                        placeholder="e.g., CSC visit booked or portal ack #..."
                        onBlur={(e) => {
                          const nextNote = e.target.value;
                          if (nextNote !== (app.notes || '')) {
                            updateApplicationMeta(app._id, { notes: nextNote });
                          }
                        }}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:bg-white focus:border-zinc-900"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-950">Live Policy Updates</h2>
            <Link to="/news" className="text-xs font-semibold text-zinc-900 underline">
              Full feed →
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-2xs">
            {newsPreview.length === 0 ? (
              <p className="text-xs text-zinc-500">Fetching latest welfare advisories via Sarvam AI...</p>
            ) : (
              newsPreview.map((item, idx) => (
                <div key={item.id || idx} className="border-b border-zinc-100 last:border-0 pb-3 last:pb-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    {item.category}
                  </span>
                  <h4 className="mt-0.5 text-xs font-semibold text-zinc-900 leading-snug">{item.title}</h4>
                  <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2">{item.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* =========================================================
4. SCHEME DISCOVERY (/laborer/schemes)
   ========================================================= */
export function LaborerSchemes() {
  const { user } = useAuth();
  const [schemes, setSchemes] = useState([]);
  const [query, setQuery] = useState('');
  const [onlyMatched, setOnlyMatched] = useState(false);
  const [loading, setLoading] = useState(true);

  const [simOpen, setSimOpen] = useState(false);
  const [simProfile, setSimProfile] = useState({
    age: user?.age ?? 28,
    monthlyIncome: user?.monthlyIncome ?? 14000,
    trade: user?.trade ?? 'Mason',
    bocwRegistered: Boolean(user?.bocwRegistered),
  });

  const [activeScheme, setActiveScheme] = useState(null);
  const [claimForm, setClaimForm] = useState({
    nomineeName: '',
    nomineeRelation: 'Spouse',
    worksiteName: '',
    govApplicationNumber: '',
    declarationAccepted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadSchemes = async () => {
    try {
      const res = await apiRequest('/laborer/schemes');
      setSchemes(Array.isArray(res) ? res : res.schemes || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemes();
  }, []);

  useEffect(() => {
    if (user) {
      setSimProfile({
        age: user.age ?? 28,
        monthlyIncome: user.monthlyIncome ?? 14000,
        trade: user.trade ?? 'Mason',
        bocwRegistered: Boolean(user.bocwRegistered),
      });
    }
  }, [user]);

  const openApplyModal = (scheme) => {
    setFormError('');
    setReceipt(null);
    setCopied(false);
    setClaimForm({
      nomineeName: '',
      nomineeRelation: 'Spouse',
      worksiteName: '',
      govApplicationNumber: '',
      declarationAccepted: false,
    });
    setActiveScheme(scheme);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!claimForm.nomineeName.trim()) {
      setFormError('Please enter your beneficiary/nominee full name.');
      return;
    }
    if (!claimForm.declarationAccepted) {
      setFormError('Please confirm the statutory self-declaration checkbox.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest(`/laborer/schemes/${activeScheme._id}/apply`, {
        method: 'POST',
        body: JSON.stringify(claimForm),
      });
      setReceipt({
        referenceId: res.referenceId || `SS-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        portalUrl: res.portalUrl || getOfficialPortalUrl(activeScheme),
        schemeTitle: activeScheme.title,
      });
      await loadSchemes();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyPacketForGovPortal = () => {
    const summary = [
      `Applicant Name: ${user?.name || ''}`,
      `Mobile: +91 ${user?.phone || ''}`,
      `Trade: ${user?.trade || ''} | State: ${user?.state || ''}, ${user?.district || ''}`,
      `Monthly Income: INR ${user?.monthlyIncome || 0} | BOCW Registered: ${user?.bocwRegistered ? 'Yes' : 'No'}`,
      `Nominee: ${claimForm.nomineeName} (${claimForm.nomineeRelation})`,
      `SchemeSetu Ref ID: ${receipt?.referenceId || ''}`,
    ].join('\n');
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = schemes.filter((s) => {
    const evalData = s.eligibility || s;
    if (onlyMatched && !evalData.matched) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.ministry?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Welfare Scheme Discovery & Filing</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Complete your verified claim form and submit directly on the linked Government of India portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search schemes..."
              className="rounded-xl border border-zinc-200 bg-white pl-9 pr-3.5 py-2 text-xs outline-none focus:border-zinc-900"
            />
          </div>
          <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMatched}
              onChange={(e) => setOnlyMatched(e.target.checked)}
              className="accent-zinc-950"
            />
            Eligible only
          </label>
        </div>
      </div>

      {/* What-If Eligibility Simulator */}
      <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                What-If Simulator
              </span>
              <h2 className="text-sm font-semibold text-zinc-950">Scheme Eligibility Simulator</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Preview how changing BOCW registration, monthly income, age, or trade changes matched schemes without saving your profile.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {simOpen && (
              <button
                type="button"
                onClick={() =>
                  setSimProfile({
                    age: user?.age ?? 28,
                    monthlyIncome: user?.monthlyIncome ?? 14000,
                    trade: user?.trade ?? 'Mason',
                    bocwRegistered: Boolean(user?.bocwRegistered),
                  })
                }
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                Reset to Profile
              </button>
            )}
            <button
              type="button"
              onClick={() => setSimOpen((prev) => !prev)}
              className="rounded-xl border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 cursor-pointer"
            >
              {simOpen ? 'Hide Simulator' : 'Open What-If Check'}
            </button>
          </div>
        </div>

        {simOpen && (() => {
          const simResults = schemes.map((s) => ({
            scheme: s,
            sim: simulateSchemeEligibility(simProfile, s),
          }));
          const matchedCount = simResults.filter((x) => x.sim.matched).length;
          const potentialBenefit = simResults
            .filter((x) => x.sim.matched)
            .reduce((sum, x) => sum + (Number(x.scheme.benefitAmount) || 0), 0);

          return (
            <div className="mt-4 pt-4 border-t border-zinc-200/80 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">Simulated Age</label>
                  <input
                    type="number"
                    min="14"
                    max="80"
                    value={simProfile.age}
                    onChange={(e) => setSimProfile({ ...simProfile, age: Number(e.target.value) })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">Monthly Income (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={simProfile.monthlyIncome}
                    onChange={(e) => setSimProfile({ ...simProfile, monthlyIncome: Number(e.target.value) })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">Trade</label>
                  <select
                    value={simProfile.trade}
                    onChange={(e) => setSimProfile({ ...simProfile, trade: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900"
                  >
                    {TRADES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simProfile.bocwRegistered}
                      onChange={(e) => setSimProfile({ ...simProfile, bocwRegistered: e.target.checked })}
                      className="h-4 w-4 accent-zinc-950"
                    />
                    BOCW Registered
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-zinc-200 px-4 py-2.5 text-xs">
                <div>
                  Simulated Eligible Schemes:{' '}
                  <strong className="text-emerald-700">
                    {matchedCount} / {schemes.length}
                  </strong>
                </div>
                <div>
                  Simulated Benefit Pool:{' '}
                  <strong className="text-zinc-950 tabular-nums">
                    ₹{potentialBenefit.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {simResults.map(({ scheme, sim }) => (
                  <div
                    key={scheme._id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs"
                  >
                    <div className="pr-2">
                      <div className="font-medium text-zinc-900">{scheme.title}</div>
                      <div className="text-[11px] text-zinc-500">{sim.reasons?.[0] || ''}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        sim.matched ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {sim.matched ? `Match (${sim.score}%)` : `${sim.score}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {loading ? (
        <div className="text-xs text-zinc-500">Evaluating welfare schemes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((scheme) => {
            const evalData = scheme.eligibility || scheme;
            const officialUrl = getOfficialPortalUrl(scheme);
            return (
              <motion.div
                key={scheme._id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
                      {scheme.category}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        evalData.matched ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {evalData.matched ? `Eligible • ${evalData.score}%` : `Score ${evalData.score}%`}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold text-zinc-950">{scheme.title}</h3>
                  <p className="text-xs text-zinc-500">{scheme.ministry}</p>
                  <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{scheme.description || scheme.benefitSummary}</p>

                  {evalData.reasons?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {evalData.reasons.map((r, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-zinc-50 border border-zinc-200/80 px-2 py-0.5 text-[11px] text-zinc-600"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-zinc-400">Benefit</span>
                    <div className="text-base font-semibold text-zinc-950 tabular-nums">
                      ₹{(scheme.benefitAmount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                    >
                      Gov Portal ↗
                    </a>
                    {scheme.applied ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" /> Filed
                      </span>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => openApplyModal(scheme)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
                      >
                        Start Application <ArrowRight className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {activeScheme && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Official Welfare Claim Form
                  </span>
                  <h3 className="text-lg font-semibold text-zinc-950 mt-0.5">{activeScheme.title}</h3>
                  <p className="text-xs text-zinc-500">{activeScheme.ministry}</p>
                </div>
                <button
                  onClick={() => setActiveScheme(null)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {receipt ? (
                <div className="py-5 space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Claim Packet Recorded & Ready for Portal Submission</span>
                    </div>
                    <p className="mt-1.5 text-xs text-emerald-900/80">
                      Tracking Reference ID: <strong className="font-mono text-zinc-950">{receipt.referenceId}</strong>
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700 space-y-1.5">
                    <div className="font-semibold text-zinc-950">Next Step: Complete Official Government Submission</div>
                    <p>
                      Click <strong>Copy Pre-Filled Details</strong> below, then launch the official ministry portal to paste your details and complete verification.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={copyPacketForGovPortal}
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 cursor-pointer"
                    >
                      {copied ? 'Copied to Clipboard ✓' : 'Copy Pre-Filled Details'}
                    </button>
                    <a
                      href={receipt.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800"
                    >
                      Open Official Gov Portal ({new URL(receipt.portalUrl).hostname}) ↗
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-900">Verified Applicant Profile</span>
                      <span className="text-[11px] text-emerald-700 font-medium">
                        {user?.nationalIdVerified ? 'National ID Encrypted ✓' : 'Update National ID in Vault'}
                      </span>
                    </div>
                    <div className="text-zinc-600">
                      {user?.name} • +91 {user?.phone} • {user?.trade} ({user?.district}, {user?.state})
                    </div>
                    <div className="text-zinc-500">
                      Official Filing Endpoint:{' '}
                      <a
                        href={getOfficialPortalUrl(activeScheme)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-zinc-900 underline"
                      >
                        {getOfficialPortalUrl(activeScheme)} ↗
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Nominee / Beneficiary Full Name *
                      </label>
                      <input
                        type="text"
                        value={claimForm.nomineeName}
                        onChange={(e) => setClaimForm({ ...claimForm, nomineeName: e.target.value })}
                        placeholder="e.g., Sunita Devi"
                        className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-xs outline-none focus:border-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">Relationship with Applicant</label>
                      <select
                        value={claimForm.nomineeRelation}
                        onChange={(e) => setClaimForm({ ...claimForm, nomineeRelation: e.target.value })}
                        className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-xs bg-white outline-none focus:border-zinc-900"
                      >
                        <option>Spouse</option>
                        <option>Mother</option>
                        <option>Father</option>
                        <option>Child</option>
                        <option>Dependent Sibling</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Current Worksite / Contractor (Optional)
                      </label>
                      <input
                        type="text"
                        value={claimForm.worksiteName}
                        onChange={(e) => setClaimForm({ ...claimForm, worksiteName: e.target.value })}
                        placeholder="e.g., Metro Phase-4 Site"
                        className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-xs outline-none focus:border-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Gov Portal Ack No. (If already filed)
                      </label>
                      <input
                        type="text"
                        value={claimForm.govApplicationNumber}
                        onChange={(e) => setClaimForm({ ...claimForm, govApplicationNumber: e.target.value })}
                        placeholder="Optional portal acknowledgment ID"
                        className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-xs outline-none focus:border-zinc-900"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 rounded-xl border border-zinc-200 p-3 text-xs text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={claimForm.declarationAccepted}
                      onChange={(e) => setClaimForm({ ...claimForm, declarationAccepted: e.target.checked })}
                      className="mt-0.5 h-4 w-4 accent-zinc-950"
                    />
                    <span>
                      I declare that my income, trade, and BOCW details are accurate and authorize SchemeSetu to prepare my claim dossier for submission on the official government portal.
                    </span>
                  </label>

                  {formError && (
                    <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                      {formError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveScheme(null)}
                      className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? 'Generating Claim Packet...' : 'Submit Application & Launch Portal'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

/* =========================================================
5. LABORER IDENTITY & COMPLIANCE VAULT (/laborer/profile)
   ========================================================= */
export function LaborerProfile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    age: user?.age || 28,
    gender: user?.gender || 'Male',
    state: user?.state || '',
    district: user?.district || '',
    trade: user?.trade || 'Mason',
    monthlyIncome: user?.monthlyIncome ?? 0,
    bocwRegistered: Boolean(user?.bocwRegistered),
    nationalId: '',
    payoutAccount: '',
    ifscCode: user?.ifscCode || '',
    uanNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [statusMsg, setStatusMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const updateField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    const fieldErrors = validateVaultFields(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender,
        state: form.state,
        district: form.district,
        trade: form.trade,
        monthlyIncome: Number(form.monthlyIncome),
        bocwRegistered: Boolean(form.bocwRegistered),
        ...(form.nationalId ? { nationalId: form.nationalId } : {}),
        ...(form.payoutAccount ? { payoutAccount: form.payoutAccount } : {}),
        ...(form.ifscCode ? { ifscCode: form.ifscCode } : {}),
        ...(form.uanNumber ? { uanNumber: form.uanNumber } : {}),
      };
      await apiRequest('/laborer/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await refreshUser();
      setForm((prev) => ({ ...prev, nationalId: '', payoutAccount: '', uanNumber: '' }));
      setStatusMsg('Profile & encrypted vault updated successfully.');
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Identity & Compliance Vault</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Sensitive numbers are encrypted with AES-256-GCM before storage and never displayed in plaintext.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5">
            <ProgressRing percent={user?.profileCompleteness || 0} size={56} stroke={5} label="Completeness" />
          </div>
        </div>

        <form onSubmit={handleSave} className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 space-y-6 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Primary Trade</label>
              <select
                value={form.trade}
                onChange={(e) => updateField('trade', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900 bg-white"
              >
                {TRADES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Age</label>
              <input
                type="number"
                min={18}
                max={75}
                value={form.age}
                onChange={(e) => updateField('age', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Monthly Income (₹)</label>
              <input
                type="number"
                min={0}
                value={form.monthlyIncome}
                onChange={(e) => updateField('monthlyIncome', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900 tabular-nums"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.bocwRegistered}
                  onChange={(e) => updateField('bocwRegistered', e.target.checked)}
                  className="h-4 w-4 accent-zinc-950"
                />
                BOCW Welfare Registered
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">District</label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => updateField('district', e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted KYC & Direct Benefit Transfer Vault</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <VaultInput
                label="12-Digit National ID"
                name="nationalId"
                value={form.nationalId}
                onChange={updateField}
                maxDigits={12}
                verified={Boolean(user?.nationalIdVerified)}
                placeholder="Enter 12 numeric digits"
                error={errors.nationalId}
              />
              <VaultInput
                label="12-Digit UAN Number (Optional)"
                name="uanNumber"
                value={form.uanNumber}
                onChange={updateField}
                maxDigits={12}
                placeholder="Enter 12 numeric digits"
                error={errors.uanNumber}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <VaultInput
                label="Bank Payout Account"
                name="payoutAccount"
                value={form.payoutAccount}
                onChange={updateField}
                maxDigits={18}
                verified={Boolean(user?.payoutAccountVerified)}
                placeholder="9 to 18 numeric digits"
                error={errors.payoutAccount}
              />
              <VaultInput
                label="Bank IFSC Code"
                name="ifscCode"
                value={form.ifscCode}
                onChange={updateField}
                maxDigits={11}
                placeholder="SBIN0001234"
                error={errors.ifscCode}
              />
            </div>
          </div>

          {statusMsg && (
            <div
              className={`rounded-xl px-4 py-2.5 text-xs font-medium ${
                statusMsg.startsWith('Error')
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {statusMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Encrypting & Saving...' : 'Save to Encrypted Vault'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

/* =========================================================
6. CONTRACTOR WORKFORCE HUB (/contractor)
   ========================================================= */
export function ContractorDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState({
    totalWorkers: 0,
    kycVerifiedPercent: 0,
    complianceScore: 0,
    totalBenefitUnlocked: 0,
  });
  const [workers, setWorkers] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showOnboard, setShowOnboard] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');

  // Razorpay Pro Plan states
  const [paying, setPaying] = useState(false);
  const [isPro, setIsPro] = useState(user?.plan === 'pro');
  const [payError, setPayError] = useState('');

  const [workerForm, setWorkerForm] = useState({
    name: '',
    phone: '',
    password: 'Password@123',
    age: '29',
    gender: 'Male',
    state: user?.state || 'Delhi',
    district: user?.district || 'New Delhi',
    trade: 'Mason',
    monthlyIncome: '14000',
    bocwRegistered: true,
    nationalId: '',
    payoutAccount: '',
    ifscCode: '',
  });
  const [workerErrors, setWorkerErrors] = useState({});
  const [onboardError, setOnboardError] = useState('');

  useEffect(() => {
    if (user?.plan === 'pro') setIsPro(true);
  }, [user?.plan]);

  const loadAll = async (q = '') => {
    try {
      const [kpiRes, workersRes, schemesRes] = await Promise.all([
        apiRequest('/contractor/kpis'),
        apiRequest(`/contractor/workers${q ? `?search=${encodeURIComponent(q)}` : ''}`),
        apiRequest('/contractor/schemes').catch(() => ({ schemes: [] })),
      ]);
      setKpis((prev) => ({ ...prev, ...(kpiRes?.kpis || kpiRes) }));
      setWorkers(Array.isArray(workersRes) ? workersRes : workersRes.workers || []);
      const sList = Array.isArray(schemesRes) ? schemesRes : schemesRes.schemes || [];
      setSchemes(sList);
      if (sList[0]?._id && !selectedSchemeId) setSelectedSchemeId(sList[0]._id);
    } catch {
      // handled
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadAll(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const handleUpgradeCheckout = async () => {
    setPayError('');
    if (!window.Razorpay) {
      setPayError('Payment SDK not loaded. Refresh and try again.');
      return;
    }

    try {
      setPaying(true);
      const order = await apiRequest('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ amount: 999, plan: 'contractor_pro' }),
      });

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'SchemeSetu',
        description: 'Contractor Pro Compliance Plan (₹999/mo)',
        order_id: order.orderId,
        prefill: {
          name: user?.name || '',
          contact: user?.phone ? `+91${user.phone}` : '',
        },
        theme: { color: '#09090b' },
        handler: async (response) => {
          try {
            await apiRequest('/payments/verify', {
              method: 'POST',
              body: JSON.stringify(response),
            });
            setIsPro(true);
          } catch (verifyErr) {
            setPayError(verifyErr.message || 'Payment verification failed');
          }
        },
      });

      rzp.on('payment.failed', (resp) => {
        setPayError(resp?.error?.description || 'Payment failed or cancelled');
      });

      rzp.open();
    } catch (err) {
      setPayError(err.message || 'Unable to start checkout');
    } finally {
      setPaying(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleOnboardWorker = async (e) => {
    e.preventDefault();
    setOnboardError('');
    const errs = validateVaultFields(workerForm, { requireAuthFields: true });
    if (Object.keys(errs).length > 0) {
      setWorkerErrors(errs);
      return;
    }
    try {
      await apiRequest('/contractor/workers', {
        method: 'POST',
        body: JSON.stringify({
          ...workerForm,
          age: Number(workerForm.age),
          monthlyIncome: Number(workerForm.monthlyIncome),
          ...(workerForm.nationalId ? { nationalId: workerForm.nationalId } : { nationalId: undefined }),
          ...(workerForm.payoutAccount ? { payoutAccount: workerForm.payoutAccount } : { payoutAccount: undefined }),
          ...(workerForm.ifscCode ? { ifscCode: workerForm.ifscCode } : { ifscCode: undefined }),
        }),
      });
      setShowOnboard(false);
      loadAll(search);
    } catch (err) {
      setOnboardError(err.message);
    }
  };

  const handleBulkEnroll = async () => {
    if (!selectedSchemeId || selectedIds.length === 0) return;
    setBulkStatus('Enrolling selected crew...');
    try {
      const res = await apiRequest('/contractor/bulk-enroll', {
        method: 'POST',
        body: JSON.stringify({ schemeId: selectedSchemeId, laborerIds: selectedIds }),
      });
      setBulkStatus(res.message || `Successfully enrolled ${selectedIds.length} workers.`);
      setSelectedIds([]);
      loadAll(search);
      setTimeout(() => {
        setShowBulk(false);
        setBulkStatus('');
      }, 1200);
    } catch (err) {
      setBulkStatus(`Error: ${err.message}`);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Contractor Workforce Hub</h1>
            {isPro && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Pro Active
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1">{user?.companyName || 'Site Compliance & Welfare Operations'}</p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {!isPro && (
              <button
                type="button"
                onClick={handleUpgradeCheckout}
                disabled={paying}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                <span>{paying ? 'Opening Checkout...' : 'Upgrade Pro (₹999/mo)'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                downloadContractorComplianceCsv({
                  workers,
                  kpis,
                  contractorName: user?.companyName || user?.name || 'Contractor Hub',
                })
              }
              className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 cursor-pointer"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() =>
                printContractorComplianceSummary({
                  workers,
                  kpis,
                  contractorName: user?.companyName || user?.name || 'Contractor Hub',
                })
              }
              className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 cursor-pointer"
            >
              Print Audit
            </button>
            <button
              onClick={() => setShowBulk(true)}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Bulk Enroll ({selectedIds.length})
            </button>
            <button
              onClick={() => setShowOnboard(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Onboard Worker
            </button>
          </div>
          {payError && <span className="text-[11px] text-rose-600">{payError}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Workforce" value={kpis.totalWorkers} icon={Briefcase} subtext="Active site laborers" />
        <KpiCard
          label="KYC Verified"
          value={kpis.kycVerifiedPercent}
          suffix="%"
          icon={ShieldCheck}
          accent="emerald"
          subtext="Encrypted National IDs"
        />
        <KpiCard
          label="Compliance Score"
          value={kpis.complianceScore}
          suffix="%"
          icon={Award}
          accent="amber"
          subtext="BOCW & documentation index"
        />
        <KpiCard
          label="Benefits Unlocked"
          value={kpis.totalBenefitUnlocked}
          prefix="₹"
          icon={IndianRupee}
          accent="emerald"
          subtext="Cumulative crew welfare"
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 p-5">
          <h2 className="text-sm font-semibold text-zinc-950">Assigned Workforce Directory</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, trade..."
              className="rounded-xl border border-zinc-200 pl-9 pr-3.5 py-2 text-xs outline-none focus:border-zinc-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={workers.length > 0 && selectedIds.length === workers.length}
                    onChange={(e) => setSelectedIds(e.target.checked ? workers.map((w) => w._id) : [])}
                    className="accent-zinc-950"
                  />
                </th>
                <th className="py-3 px-4">Worker</th>
                <th className="py-3 px-4">Trade & Income</th>
                <th className="py-3 px-4">Vault KYC</th>
                <th className="py-3 px-4">BOCW</th>
                <th className="py-3 px-4">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No workers found. Click “Onboard Worker” to add crew members.
                  </td>
                </tr>
              ) : (
                workers.map((w) => (
                  <tr key={w._id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(w._id)}
                        onChange={() => toggleSelect(w._id)}
                        className="accent-zinc-950"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-950">{w.name}</div>
                      <div className="text-zinc-500 tabular-nums">+91 {w.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-zinc-800">{w.trade}</div>
                      <div className="text-zinc-500 tabular-nums">₹{(w.monthlyIncome || 0).toLocaleString('en-IN')}/mo</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          w.nationalIdVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {w.nationalIdVerified ? 'Encrypted & Verified' : 'Pending KYC'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          w.bocwRegistered ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {w.bocwRegistered ? 'Registered' : 'Unregistered'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-semibold text-zinc-800">{w.profileCompleteness || 0}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showOnboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-950">Onboard Site Worker</h3>
                <button onClick={() => setShowOnboard(false)} className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleOnboardWorker} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={workerForm.name}
                      onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs outline-none"
                    />
                    {workerErrors.name && <p className="text-[11px] text-rose-600 mt-0.5">{workerErrors.name}</p>}
                  </div>
                  <VaultInput
                    label="Mobile (10 digits)"
                    name="phone"
                    value={workerForm.phone}
                    onChange={(k, v) => setWorkerForm({ ...workerForm, [k]: v })}
                    maxDigits={10}
                    error={workerErrors.phone}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Trade</label>
                    <select
                      value={workerForm.trade}
                      onChange={(e) => setWorkerForm({ ...workerForm, trade: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs bg-white"
                    >
                      {TRADES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Monthly Income (₹)</label>
                    <input
                      type="number"
                      value={workerForm.monthlyIncome}
                      onChange={(e) => setWorkerForm({ ...workerForm, monthlyIncome: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs tabular-nums"
                    />
                  </div>
                </div>
                <VaultInput
                  label="12-Digit National ID (Optional)"
                  name="nationalId"
                  value={workerForm.nationalId}
                  onChange={(k, v) => setWorkerForm({ ...workerForm, [k]: v })}
                  maxDigits={12}
                  error={workerErrors.nationalId}
                />
                {onboardError && <p className="text-xs text-rose-600">{onboardError}</p>}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-zinc-950 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
                >
                  Create Worker Profile
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulk && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-950">Bulk Scheme Enrollment</h3>
                <button onClick={() => setShowBulk(false)} className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-600 mb-4">
                Enrolling <strong>{selectedIds.length}</strong> selected worker(s) with live eligibility snapshots.
              </p>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Target Welfare Scheme</label>
              <select
                value={selectedSchemeId}
                onChange={(e) => setSelectedSchemeId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-xs bg-white mb-4"
              >
                {schemes.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.title} (₹{(s.benefitAmount || 0).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
              {bulkStatus && <p className="mb-3 text-xs font-medium text-emerald-700">{bulkStatus}</p>}
              <button
                onClick={handleBulkEnroll}
                className="w-full rounded-xl bg-zinc-950 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
              >
                Confirm Bulk Enrollment
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

/* =========================================================
7. LIVE SARVAM WELFARE NEWS (/news)
   ========================================================= */
export function PolicyNews() {
  const { askSchemeMitra } = useAuth();
  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categories = ['All', 'Labour Codes', 'Social Security', 'Health & Insurance', 'Employment', 'Housing'];

  const fetchNews = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await apiRequest(`/ai/news${forceRefresh ? '?refresh=true' : ''}`);
      setArticles(Array.isArray(res) ? res : res.news || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews(false);
  }, []);

  const visible = category === 'All' ? articles : articles.filter((a) => a.category === category);

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1">
            <Newspaper className="w-3.5 h-3.5" /> Powered by Sarvam AI
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Welfare Schemes & Labour Policy News</h1>
        </div>

        <button
          onClick={() => fetchNews(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing via Sarvam...' : 'Refresh Live Feed'}</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              category === cat
                ? 'bg-zinc-950 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-44 rounded-2xl border border-zinc-200 bg-white p-6 animate-pulse">
              <div className="h-3 w-24 rounded bg-zinc-200 mb-4" />
              <div className="h-5 w-3/4 rounded bg-zinc-200 mb-3" />
              <div className="h-3 w-full rounded bg-zinc-100 mb-2" />
              <div className="h-3 w-2/3 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visible.map((item, idx) => (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="rounded-md bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 font-semibold text-emerald-800">
                    {item.category}
                  </span>
                  <span className="text-zinc-400">{item.date}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-zinc-950 leading-snug">{item.title}</h3>
                <p className="text-[11px] font-medium text-zinc-500 mt-0.5">{item.ministry}</p>
                <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{item.summary}</p>
                {item.workerTakeaway && (
                  <div className="mt-3 rounded-xl bg-zinc-50 border border-zinc-200/70 p-3 text-xs text-zinc-700">
                    <strong className="text-zinc-950">Takeaway:</strong> {item.workerTakeaway}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-100 flex justify-end">
                <button
                  onClick={() =>
                    askSchemeMitra(
                      `Explain this policy update and whether I qualify or need to take action: "${item.title}"`
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-950 hover:text-emerald-700 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ask SchemeMitra about this →</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}