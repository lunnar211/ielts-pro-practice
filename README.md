# IELTS Pro Practice

Free IELTS preparation: full mock tests for Listening, Reading, Writing and
Speaking, instant band scores, AI marking for Writing and Speaking, and a
progress dashboard. Academic and General Training tracks.

> **Practice only.** This site is not affiliated with IELTS, IDP, the British
> Council or Cambridge. Band scores here — especially the AI-marked Writing
> and Speaking bands — are estimates for practice, not official IELTS results.

## What it does

- **Listening** — 4 sections, 40 questions, 30 minutes + 10 minutes to
  transfer answers. Each recording plays once, just like the real test. Real
  mp3 recordings play when uploaded; otherwise a text-to-speech reading of
  the transcript is used for practice.
- **Reading** — 3 passages, 40 questions, 60 minutes. Highlight the passage
  text, take notes, and get instant marking with the evidence for every
  answer (True/False/Not Given, Yes/No/Not Given, matching, MCQ, completion).
- **Writing** — Task 1 (20 min, at least 150 words) + Task 2 essay (40 min,
  at least 250 words), 60 minutes total. AI marking gives a band for each of
  the four criteria, sentence corrections, vocabulary upgrades, a model
  answer and an improvement plan. You can also upload a photo of handwritten
  work — it is read on your device with OCR (Tesseract.js).
- **Speaking** — Parts 1, 2 and 3, 11–14 minutes, with a cue card and a
  1-minute preparation timer for Part 2. Record in the browser (microphone)
  or upload an audio file; answers are transcribed and AI-marked with
  fluency stats (words per minute, filler words, long pauses), corrections,
  better-answer examples and follow-up questions.
- **Full mock test** — all four modules back to back in real test order
  (Listening → Reading → Writing → Speaking, about 2h 45m) with one combined
  overall band at the end.
- **Dashboard** — target-band tracker, test history, band progress chart,
  weakest question types, day streak, and a per-attempt result page with a
  radar chart and a downloadable PDF report (jsPDF).
- **No sign-in, no admin panel** — everything is free and open. Attempts
  are saved on the device (localStorage) and the dashboard reads them from
  there. No account is needed to practise.

## Tech stack (all free)

| Layer | Choice | Free tier |
| --- | --- | --- |
| Framework | Next.js 14 (App Router) + TypeScript + Tailwind CSS 3 | — |
| Database, Auth, Storage | Supabase (Postgres + RLS, Email + Google auth, Storage buckets) | Free project |
| AI marking | Groq (free tier) first, Google Gemini (free tier) as fallback | Free keys |
| Speech-to-text | Groq Whisper via `/api/ai/transcribe` | Free tier |
| Charts | Recharts | — |
| PDF export | jsPDF | — |
| Handwriting OCR | Tesseract.js (runs in the browser) | — |
| Dark / light mode | next-themes | — |
| Icons | lucide-react | — |

No real API keys or secrets are stored in this repo. Never commit
`.env.local`.

## Local setup

```bash
git clone <your-repo-url>
cd ielts-pro-practice
npm install
cp .env.example .env.local   # fill in your own keys — never commit .env.local
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server only — never expose it) |
| `GROQ_API_KEY` | Groq API key for AI marking + transcription |
| `GEMINI_API_KEY` | Google Gemini API key (fallback for AI marking) |

The site works without Supabase and without AI keys: practice tests run,
attempts are saved on the device, and AI marking shows a friendly
"AI not configured" message instead of crashing. See
[Troubleshooting](#troubleshooting).

## Free API key setup

### 1. Groq (free key — AI marking + transcription)

1. Go to [console.groq.com](https://console.groq.com) and sign up / sign in
   (free account, no card required for the free tier).
2. Open **API Keys** → **Create API Key**, give it a name, and copy the key.
   It is shown once — store it somewhere safe.
3. Add it to `.env.local` (local) or to Vercel (deploy):
   `GROQ_API_KEY=gsk_...`

### 2. Gemini (free key — fallback AI marking)

1. Go to [Google AI Studio](https://aistudio.google.com) and sign in with a
   Google account.
2. Open **Get API key** → **Create API key in new project** (or pick an
   existing project) and copy the key.
3. Add it to `.env.local` or Vercel: `GEMINI_API_KEY=AIza...`

The app tries Groq first and falls back to Gemini when Groq is unavailable
or unconfigured. Either key alone is enough for AI marking.

### 3. Supabase (free project — accounts, attempts, uploads)

1. Go to [supabase.com](https://supabase.com), sign up / sign in, and click
   **New project**. Pick a name, a database password (save it somewhere
   safe), and the region closest to your users. The free tier is enough.
2. When the project is ready, open **SQL Editor** → **New query**, paste the
   whole contents of `supabase/schema.sql`, and click **Run**. This creates
   the `profiles`, `tests`, `test_attempts` and `uploads` tables, the
   auto-create-profile trigger, Row Level Security policies, and the Storage
   bucket rows.
3. Open **Storage** and check the buckets exist: `audio` (public),
   `uploads` (private), `charts` (public). If any is missing, create it with
   that exact name — `audio` and `charts` public, `uploads` private.
4. Enable sign-in methods in **Authentication → Providers**:
   - **Email** — turn it on (email confirmation is off by default in this
     project; turn it on in the provider settings if you want confirmation
     emails).
   - **Google** — turn it on, then add the Google OAuth client ID and secret
     from [Google Cloud Console](https://console.cloud.google.com) (APIs &
     Services → Credentials → Create OAuth client ID, type "Web
     application"). Add the Supabase callback URL shown in the provider
     settings to the OAuth client's authorised redirect URIs.
5. Copy the project URL and anon key from **Project Settings → API** into
   `.env.local` (or Vercel):
   `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`
   `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`
6. The service-role key (same page, **Project Settings → API**) is only
   needed for server-side admin work: `SUPABASE_SERVICE_ROLE_KEY=...`. Keep
   it server-side only — it bypasses Row Level Security.

To make a user a teacher or admin, update their row in the `profiles` table
(`role` = `teacher` or `admin`); new sign-ups start as `student`.

## Deploy: Vercel + GitHub

1. Push the repo to GitHub:
   ```bash
   git init
   git add .
   git commit -m "IELTS Pro Practice"
   git branch -M main
   git remote add origin https://github.com/<you>/ielts-pro-practice.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com), sign in, and click **Add New →
   Project → Import** your GitHub repo (one-time import from the Vercel
   dashboard).
3. In the project settings, open **Environment Variables** and add all five
   variables from the table above (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `GROQ_API_KEY`, `GEMINI_API_KEY`). Set them for Production (and Preview
   if you want preview deploys to work too).
4. Click **Deploy**. Vercel builds the Next.js app and gives you a
   `*.vercel.app` URL.
5. After that, every push to `main` redeploys automatically. To redeploy
   manually, use **Deployments → ⋯ → Redeploy** in the Vercel dashboard.
   Changing an environment variable also needs a redeploy to take effect.

## Project structure

```
app/
  page.tsx                    Landing page
  practice/                   Practice index, per-module test lists
    listening/[testId]        Listening exam page
    reading/[testId]          Reading exam page
    writing/[testId]          Writing exam page
    speaking/[testId]         Speaking exam page
    mock/                     Full mock test picker
    mock/[testId]             Full mock test (Listening → Reading → Writing → Speaking)
  dashboard/                  Student dashboard (history, chart, streak, target band)
    attempt/[id]              Result detail page + PDF report
  api/ai/
    mark-writing/             Writing AI marking (Groq → Gemini, with rate limits)
    mark-speaking/            Speaking AI marking
    transcribe/               Audio transcription (Groq Whisper)
src/
  components/
    ListeningExam.tsx         Listening exam (30 + 10 min, play-once audio/TTS)
    ReadingExam.tsx           Reading exam (highlighting, notes, instant marking)
    WritingExam.tsx           Writing exam (OCR handwriting upload, AI marking)
    SpeakingExam.tsx          Speaking exam (mic recording, upload, AI report)
    MockTest.tsx              Mock-test sequencer + overall-band summary
    Header.tsx                Site header / navigation
  lib/
    types.ts                  Test, question, marking and AI-result types
    bands.ts                  Raw-score → band tables + overallBand()
    reading.ts / listening.ts Objective marking for Reading / Listening
    prompts.ts                AI marking prompts + result shapes
    ai.ts                     Groq / Gemini client helpers
    seed.ts                   Loads the two seeded tests (src/data/*.json)
    attempts.ts               Attempt normalisation, weak types, streak
    supabase/client.ts        Browser Supabase client + isSupabaseConfigured()
    supabase/server.ts        Server Supabase clients (anon + service role)
  data/
    test-1.json               Sample Test 1 — Academic
    test-2.json               Sample Test 2 — General Training
supabase/schema.sql           Postgres schema, RLS policies, Storage buckets
```

## Rate-limit behaviour + friendly error messages

AI marking is the only part that costs anything, so it is guarded:

- The marking API routes (`/api/ai/mark-writing`, `/api/ai/mark-speaking`,
  `/api/ai/transcribe`) enforce a per-IP rate limit on the free tier. When
  the limit is hit they return HTTP 429 with a plain message such as
  "Too many requests — please wait a minute and try again." The exam pages
  show that message in place of the result instead of crashing, and the
  answers are not lost — the student can submit again.
- When neither `GROQ_API_KEY` nor `GEMINI_API_KEY` is set, marking returns a
  clear "AI marking is not configured" error, and the page explains that the
  teacher needs to add a free API key. Listening and Reading marking never
  needs AI — it is instant and unlimited.
- When Supabase is not configured, the site keeps working: attempts are
  saved on the device and the dashboard reads them from localStorage.
- Friendly messages are used everywhere instead of raw errors: microphone
  denied ("Microphone access was denied…"), transcription failed, handwriting
  photo unreadable, PDF that cannot be read directly, file over the size
  limit (audio 50 MB, chart image 10 MB).

## Troubleshooting

| Problem | What to do |
| --- | --- |
| **AI not configured** — Writing/Speaking marking says AI is not set up | Add a free `GROQ_API_KEY` (or `GEMINI_API_KEY`) to `.env.local` and restart `npm run dev`, or add it in Vercel and redeploy. Either key alone works. |
| **Supabase not configured** — attempts only on this device | Copy `.env.example` to `.env.local`, fill in `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, restart the dev server. Run `supabase/schema.sql` in the Supabase SQL editor first. |
| **"Too many requests" when marking** | The free-tier rate limit was hit. Wait a minute and submit again — your answers are kept. |
| **Microphone not working (Speaking)** | Allow microphone access when the browser asks. The test needs `https` (or `localhost`) — on plain `http` the browser blocks the microphone. As a fallback, upload an audio file (mp3/wav/m4a) instead of recording. |
| **Text-to-speech doesn't play (Listening)** | Your browser needs speech synthesis voices; check the device volume and that no other tab is speaking. If a real mp3 is uploaded for the section, it plays instead of TTS. |
| **Listening audio won't play in the mock** | Each section plays once by design. If the browser blocked autoplay, click the Play button — and check the file was uploaded to the `audio` bucket. |
| **Dashboard is empty after a test** | Attempts live only on the device where the test was taken. |
| **PDF report won't download** | Allow downloads/pop-ups for the site; the report is built in the browser with jsPDF. |
| **Build fails with a missing seed file** | `src/data/test-1.json` and `test-2.json` must exist — `src/lib/seed.ts` throws a clear error naming the missing file. |

## Practice-only disclaimer

This site is for IELTS practice only. It is not affiliated with IELTS, IDP,
the British Council or Cambridge, and it is not an official test. Band scores
shown here are estimates: Listening and Reading are marked against the sample
tests' answer keys, while Writing and Speaking bands are AI estimates for
practice only, not an official IELTS result. The sample tests are original
practice content written for this site.
