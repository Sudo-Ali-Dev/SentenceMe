# SentenceMe

A personal daily vocabulary trainer: AI-generated (or custom) words, sentence practice with instant AI feedback, weekly Sunday tests, spaced repetition, and streak tracking.

**Live app:** [GitHub Pages](https://your-username.github.io/SentenceMe/) (after setup below)

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind, HashRouter for GitHub Pages
- **Backend:** Supabase (Auth, Postgres, Edge Functions)
- **AI:** Groq `llama-3.3-70b-versatile` via secure Edge Function proxy

## Local development

### 1. Clone and install

```bash
git clone https://github.com/your-username/SentenceMe.git
cd SentenceMe
npm install
```

### 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy the **Project URL** and **anon public** key
3. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Run database migration

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), link your project, and push migrations:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste the SQL from `supabase/migrations/20250531000000_initial_schema.sql` into the Supabase SQL Editor and run it.

### 4. Deploy Edge Functions

Get a [Groq API key](https://console.groq.com/) and set it as a Supabase secret:

```bash
supabase secrets set GROQ_API_KEY=gsk_...
```

Deploy both functions:

```bash
supabase functions deploy generate-words
supabase functions deploy grade-sentence
```

### 5. Enable Auth

In Supabase Dashboard → **Authentication → Providers**, enable **Email** provider.

### 6. Run locally

```bash
npm run dev
```

Open http://localhost:5173/SentenceMe/

## GitHub Pages deployment

1. In repo **Settings → Pages**, set source to **GitHub Actions**
2. Add repository secrets (Settings → Secrets → Actions):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and deploys automatically

The app uses HashRouter, so routes work at `https://username.github.io/SentenceMe/#/`.

## Features

| Feature | Description |
|---------|-------------|
| Daily practice | AI generates words at your level; write sentences, get instant feedback |
| Spaced repetition | Weak words recycle into your daily pool based on mastery |
| Sunday test | Weekly review of all words from the current week + carryovers |
| Custom words | Paste your own vocabulary; optional AI fill for definitions |
| Streak | GitHub-style activity heatmap; streak updates on session complete |
| Settings | Words/day, level, categories, timezone |

## Project structure

```
src/
  components/   # UI components (Layout, WordCard, StreakHeatmap)
  hooks/        # Auth context
  lib/          # Supabase client, dates, mastery, words, sessions
  pages/        # Auth, Dashboard, DailyPractice, SundayTest, AddWords, Settings
supabase/
  migrations/   # Postgres schema + RLS
  functions/    # generate-words, grade-sentence Edge Functions
```

## Security

- The Groq API key is stored only in Supabase Edge Function secrets — never exposed to the browser
- All database tables use Row Level Security (`user_id = auth.uid()`)
- Edge Functions verify the caller's JWT before any AI or DB operations

## License

MIT
