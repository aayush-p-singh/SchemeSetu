# SchemeSetu

> **Automated welfare discovery, document readiness, and workforce compliance infrastructure for India's workforce.**

Built for **Codebenders — Ace Builders Hackathon 2026** under **Problem Statement 5: Citizens and Public Services ("Claim What's Yours")**, SchemeSetu helps workers and contractors navigate public welfare schemes, check rule-based eligibility in plain language or voice, prepare required documents, and track applications without getting lost in scattered notices or middlemen.

---

## Key Features

* **Explainable Eligibility Scoring:** Evaluates worker profiles against scheme rules transparently—showing *why* a scheme matches ("likely eligible", never guaranteed) along with unmet or missing criteria.
* **Personalised Document Checklists & Application Tracking:** Tracks required documents, application progress, and deadlines so eligible benefits don't lapse.
* **SchemeMitra AI (Text + Indic Voice):** Conversational assistant supporting typed and spoken queries across regional/Indian languages with voice playback, grounded in non-identifying profile and scheme context.
* **Identity Vault & Quick Demo Flows:** Includes 1-click demo personas (**Laborer** and **Contractor**) plus structured profile/vault fields with client and server validation.
* **Contractor Workforce Hub & Compliance Tools:** Enables site contractors to onboard workers, run bulk scheme enrollments, search crew records, export compliance CSVs, print audit summaries, and upgrade via a **Razorpay** Pro plan checkout flow.
* **Live Policy News Feed:** Surfaces recent government welfare and labour updates with caching and a reliable fallback feed.

---

## Tech Stack

* **Frontend:** React, Vite, Tailwind CSS, Motion, Lucide Icons (`https://schemesetudyog.netlify.app`)
* **Backend:** Node.js, Express, MongoDB / Mongoose
* **AI & Voice:** Sarvam AI (chat & Indic speech/TTS) with Gnani voice integration/fallback
* **Payments:** Razorpay Checkout (order creation + HMAC-SHA256 signature verification)
* **Deployment:** Netlify (Frontend) & Render (Backend)

---

## Project Structure

```text
├── backend/
│   ├── config/          # Environment configuration
│   ├── middleware/      # Auth, rate limiting, Helmet & CORS security
│   ├── models/          # Mongoose models (User, Scheme, Application, etc.)
│   ├── routes/          # API routes (/api/auth, /api/ai, /api/contractor, /api/payments)
│   ├── services/        # Rule-based eligibility engine
│   └── utils/           # Validators, error classes, async wrappers
└── frontend/
    ├── index.html       # Entry HTML & Razorpay checkout script
    └── src/
        ├── App.jsx      # Protected routes & global SchemeMitra mount
        ├── components/  # AppShell, SchemeMitra, VaultInput, KPIs & UI primitives
        ├── lib/         # Auth context, API client & helpers
        └── pages/       # Landing, Dashboards, Schemes, Vault & Policy News
```

---

## Local Setup

### 1. Backend
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
SARVAM_API_KEY=your_sarvam_api_key
SARVAM_API_URL=https://api.sarvam.ai
GNANI_API_KEY=optional_gnani_api_key
GNANI_STT_URL=optional_gnani_stt_endpoint
GNANI_TTS_URL=optional_gnani_tts_endpoint
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Start the backend server:
```bash
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the Vite dev server:
```bash
npm run dev
```

---

## Guardrails & Responsible Scope

* **No Guaranteed Claims:** Eligibility results indicate *likely match* based on configured rules and profile data—final approval rests with the relevant issuing authority.
* **Sample Data & Privacy:** Intended for hackathon testing with sample/synthetic profiles; avoids exposing sensitive personal identifiers in AI prompts or logs.
* **Official Portal Handoff:** SchemeSetu helps users understand eligibility, organize checklists, and prepare for official portals rather than bypassing official government verification workflows.

---

## Roadmap (Post-Hackathon)

* **Civil & Electrical Tender Discovery:** Filterable tenders with guided pre-fill questionnaires, saved drafts, copy-to-clipboard/companion sheets, and official portal redirects.
* **Official Source & Verification Metadata:** Explicit official portal links and "last verified" dates on every scheme card.
* **Public SEO Scheme Guides & Partner Sponsorships:** Non-intrusive, clearly labeled partner/sponsor slots alongside free worker access.
