const router = require('express').Router();
const config = require('../config/env');
const User = require('../models/User');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const { validate, chatSchema, voiceSchema } = require('../utils/validators');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/security');
const { evaluateScheme } = require('../services/eligibility');

const SYSTEM_PROMPT =
  'You are SchemeMitra, a friendly assistant for SchemeSetu, a welfare and labour compliance platform in India. ' +
  'Reply in clean Markdown. Reply in the same language the user writes in: Hindi, Hinglish, or English. ' +
  'Keep answers practical and concise. Do not ask for or repeat Aadhaar, bank account, or other sensitive personal numbers. ' +
  'Use the user context below only to personalise the answer.';

const NO_SPEECH_REPLY =
  'I did not catch any speech. Please try speaking again, a little closer to the microphone.';

const LOCALE_MAP = new Map([
  ['hi-IN', 'hi-IN'],
  ['en-IN', 'en-IN'],
  ['hinglish', 'hi-IN'],
]);

// Builds a plain-text context block. Only non-identifying profile fields are included.
function buildContext(user, matchedSchemes) {
  const income =
    typeof user.monthlyIncome === 'number' ? `${user.monthlyIncome} INR` : 'unknown';
  const line =
    `Role: ${user.role || 'unknown'}, ` +
    `Trade: ${user.trade || 'unknown'}, ` +
    `State: ${user.state || 'unknown'}, ` +
    `District: ${user.district || 'unknown'}, ` +
    `Gender: ${user.gender || 'unknown'}, ` +
    `Monthly income: ${income}, ` +
    `BOCW registered: ${user.bocwRegistered ? 'yes' : 'no'}, ` +
    `Age: ${typeof user.age === 'number' ? user.age : 'unknown'}`;
  const schemes =
    matchedSchemes && matchedSchemes.length
      ? `Matched schemes: ${matchedSchemes.join(', ')}`
      : 'Matched schemes: none on record';
  return `${line}\n${schemes}`;
}

async function callSarvam(messages) {
  if (!config.SARVAM_API_KEY) {
    throw new AppError('AI service is not configured', 503);
  }
  const res = await fetch(`${config.SARVAM_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': config.SARVAM_API_KEY,
    },
    body: JSON.stringify({ model: 'sarvam-105b', messages, temperature: 0.4 }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    await res.text().catch(() => '');
    throw new AppError('AI service error', 502);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

function buildMessages(user, matchedSchemes, history, userMessage) {
  return [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nUser context:\n${buildContext(user, matchedSchemes)}`,
    },
    ...(history || []).slice(0, 20),
    { role: 'user', content: userMessage },
  ];
}

async function matchedSchemesFor(user) {
  const schemes = await Scheme.find({ isActive: true }).lean();
  return schemes
    .filter((s) => evaluateScheme(user, s).matched)
    .map((s) => s.title);
}

// Walks the RIFF chunk list and returns the 'fmt ' and 'data' chunk descriptors.
function parseWav(buf) {
  let offset = 12;
  let fmt = null;
  let data = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === 'fmt ' && start + 16 <= buf.length) {
      fmt = {
        audioFormat: buf.readUInt16LE(start),
        bitsPerSample: buf.readUInt16LE(start + 14),
      };
    } else if (id === 'data') {
      data = { start, end: Math.min(start + size, buf.length) };
    }
    offset = start + size + (size % 2);
  }
  return { fmt, data };
}

// ---------- live news helpers ----------

const PIB_RSS_URL =
  process.env.PIB_RSS_URL || 'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3';
const NEWS_CACHE_MS = 60 * 60 * 1000;
const NEWS_ITEM_LIMIT = 8;


let newsCache = { data: null, expiresAt: 0 };

const FALLBACK_WELFARE_NEWS = [
  {
    id: 'eshram-panch-suraksha-2026',
    title: 'e-Shram "Panch Suraksha" Livelihood Profile Links Workers to 5 Core Social Security Pillars',
    ministry: 'Ministry of Labour & Employment',
    category: 'Labour Codes',
    date: 'Nov 2026',
    summary: 'Marking one year of the four Labour Codes, the upgraded e-Shram portal integrates food security, Ayushman health cover, life insurance, disability protection, and pension enrollment in a single profile.',
    workerTakeaway: 'Ensure your 12-digit National ID and BOCW registration are verified in your vault to unlock auto-linked benefits.',
  },
  {
    id: 'pm-vbry-2026',
    title: 'PM Viksit Bharat Rozgar Yojana (PMVBRY) Offers Up to ₹15,000 Wage Support for New Entrants',
    ministry: 'Ministry of Labour & Employment / EPFO',
    category: 'Employment',
    date: 'Nov 2026',
    summary: 'First-time formal workforce entrants earning up to ₹1 lakh/month receive one month’s wage up to ₹15,000 in two DBT installments via UMANG Face-Auth UAN generation.',
    workerTakeaway: 'Add your 12-digit UAN in the Identity Vault and link an active bank account with valid IFSC.',
  },
  {
    id: 'pmjay-70-plus-2026',
    title: 'Ayushman Bharat PM-JAY Expands ₹5 Lakh Cashless Hospitalization to All Seniors Aged 70+',
    ministry: 'Ministry of Health & Family Welfare',
    category: 'Health & Insurance',
    date: 'Nov 2026',
    summary: 'All senior citizens aged 70 and above are now eligible for ₹5 lakh/year cashless secondary and tertiary hospitalization across empanelled hospitals regardless of family income.',
    workerTakeaway: 'Enrolled worker households can generate separate senior cards for dependent parents aged 70+.',
  },
  {
    id: 'pm-rahat-2026',
    title: 'PM-RAHAT Guarantees ₹1.5 Lakh Cashless Trauma Care for Road Accident Victims',
    ministry: 'Ministry of Road Transport & Highways',
    category: 'Health & Insurance',
    date: 'Nov 2026',
    summary: 'Under PM-RAHAT, road accident victims on any highway or urban road receive immediate cashless stabilization and hospital treatment up to ₹1.5 lakh for the first 7 days.',
    workerTakeaway: 'No upfront deposit is required at designated trauma centers during the golden-hour treatment window.',
  },
  {
    id: 'pm-svanidhi-samman-2026',
    title: 'PM SVANidhi Crosses 1.21 Crore Collateral-Free Micro-Loans & 8-Scheme Welfare Profiling',
    ministry: 'Ministry of Housing & Urban Affairs',
    category: 'Social Security',
    date: 'Nov 2026',
    summary: 'Through SVANidhi se Samriddhi socio-economic profiling, urban self-employed and gig/street workers gain priority sanctions across PMJJBY, PMSBY, and PM-SYM pension schemes.',
    workerTakeaway: 'Keep your mobile number and DBT bank account active to receive tranche upgrades and interest subsidies.',
  },
  {
    id: 'pmay-urban-2-2026',
    title: 'PMAY-Urban 2.0 Interest Subsidy & Construction Worker Housing Grant Window Open',
    ministry: 'Ministry of Housing & Urban Affairs',
    category: 'Housing',
    date: 'Nov 2026',
    summary: 'Economically Weaker Section (EWS) and Low-Income Group urban workers can apply for Beneficiary-Led Construction (BLC) grants and subsidized home loans.',
    workerTakeaway: 'Registered BOCW workers with verified income certificates receive priority state-board housing top-ups.',
  },
];

router.get('/news', requireAuth, async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  if (!forceRefresh && newsCache.data && Date.now() < newsCache.expiresAt) {
    return res.json(newsCache.data);
  }

  try {
    const baseUrl = (process.env.SARVAM_API_URL || 'https://api.sarvam.ai').replace(/\/$/, '');
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) throw new Error('Missing SARVAM_API_KEY');

    const prompt =
      'Return ONLY a valid JSON array (no markdown, no explanation) of 6 current Indian government labour and social welfare scheme updates for construction and unorganized workers in 2026. ' +
      'Each object must have keys: "id" (string), "title" (string), "ministry" (string), "category" (one of: "Labour Codes", "Social Security", "Health & Insurance", "Employment", "Housing"), "date" (string), "summary" (2 concise sentences), and "workerTakeaway" (1 actionable sentence).';

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        model: 'sarvam-105b',
        messages: [
          { role: 'system', content: 'You are a JSON API that outputs strictly valid JSON arrays with zero markdown formatting.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sarvam API status ${response.status}`);
    }

    const payload = await response.json();
    const rawText = payload?.choices?.[0]?.message?.content || '';
    const startIdx = rawText.indexOf('[');
    const endIdx = rawText.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('No JSON array found in Sarvam response');
    }

    const parsed = JSON.parse(rawText.slice(startIdx, endIdx + 1));
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Empty news array');
    }

    newsCache = { data: parsed, expiresAt: Date.now() + 60 * 60 * 1000 };
    return res.json(parsed);
  } catch (err) {
    console.warn('[ai/news] Using curated fallback feed:', err.message);
    newsCache = { data: FALLBACK_WELFARE_NEWS, expiresAt: Date.now() + 15 * 60 * 1000 };
    return res.json(FALLBACK_WELFARE_NEWS);
  }
});



module.exports = router;
