# Firebreak

Personalized wildfire smoke risk, built on a real trained model and decision engine — not a wrapper around someone else's API.

**Live app:** [firebreak-beta.vercel.app](https://firebreak-beta.vercel.app)

## Why this exists

Official air quality monitors leave real gaps — a station can be 50 miles from where you actually are. And even where AQI is available, it treats everyone the same: a pregnant woman, an asthmatic teenager, and an outdoor worker all get identical advice today. Firebreak fixes both problems. It combines live AQI, a photo of your own sky (read by a model I trained myself), and your personal health profile into one number and one plain-language recommendation, instead of three separate readings you'd have to reconcile yourself.

## What's actually in here

- **A real computer vision model** — MobileNetV2, fine-tuned on 13,391 images from three public wildfire datasets across three continents, not a single region's sky. 79.5% test accuracy, exported to ONNX so no training code or framework ever touches production. Every prediction ships with a real class activation map (computed straight from the trained weights, no extra gradient pass) so you can see exactly what part of the sky it looked at.
- **A rule-based risk engine, deliberately not a model** — a health decision needs to be traceable. Age, declared conditions, AQI, and photo reading combine through a plain, auditable decision table, and any single emergency symptom (chest pain, confusion, reduced fetal movement) forces the safety ceiling no matter what else the score says.
- **An optional personal layer on top** — once you've logged 6+ days of symptoms, a small logistic regression (plain numpy, no ML framework) fits *your* apparent flare-up threshold. Shown alongside the rule engine, never instead of it, and it refuses to guess if the data's too thin.
- **A crowd-sourced coverage map** for the monitoring deserts official stations don't reach — submissions are geohash-fuzzed before storage, cross-checked against their own EXIF GPS as a trust signal, deduped by perceptual hash, and purged after 48 hours.
- **A short-term trend forecast** using Holt's linear smoothing over actual elapsed time — a real point forecast, always labeled as a statistical extrapolation, never dressed up as a weather forecast.
- **A retrieval-only Q&A assistant** — TF-IDF search over a curated knowledge base, answers assembled by fixed rules from whatever it retrieves, every answer cites its source. Zero calls to an external LLM anywhere in this app.

More on the reasoning behind each of these — plus the honest limitations — is on the app's own [About page](https://firebreak-beta.vercel.app/about).

## Stack

| | |
|---|---|
| Frontend | Next.js 16, deployed on Vercel |
| Backend | FastAPI, deployed on Render |
| Database | Postgres (Neon) in production, SQLite locally |
| CV model | MobileNetV2 → ONNX Runtime |
| Mobile | Expo, wrapping the same deployed site in a WebView — no separate app to maintain |

## Running it locally

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8100
```
Copy `.env.example` to `.env` if you have real `AIRNOW_API_KEY`/`NOAA_API_KEY` values — without them the backend still runs, just without live AQI data.

**Frontend**
```bash
cd firebreak
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_BASE_URL at your local backend
npm run dev
```

**Mobile**
```bash
cd mobile
npm install
npx expo run:ios   # or: npx expo start --dev-client, if already built once
```

See [`README-DATABASE.md`](./README-DATABASE.md) if you're setting up a persistent Postgres database instead of the local SQLite default.

## What's not finished

I'd rather say this here than have a judge find it first: the coverage map's clean-air location data only covers one demo region so far, the CV model's training license is non-commercial-use, and a spot-check of the training labels found the "heavy smoke" class is the model's known weak point — the risk engine is specifically designed so that weakness alone can't cause harm, since it always defers to the worse of the photo or the official reading, but it's still a real limitation worth naming.

— Nysa
