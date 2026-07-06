# English Reading Journal v4

This upgrade keeps the original article journal and adds a complete reading-progress system:

- progress dashboard and current reading streak
- book library and page progress
- daily reading sessions
- comprehension, difficulty, reading-speed, and unknown-word tracking
- structured vocabulary with New / Recognizable / Active levels
- weekly and monthly goals
- two-week progress tests and comparison charts
- weekly reflection archive
- full JSON backup and import
- backward-compatible import for the old article-only JSON backup

## Preserving the existing website data

The old website stores articles in the browser under:

```text
reading-journal-articles-v3
```

This version deliberately keeps that same storage key. When it is deployed to the **same Vercel domain** (`english-reading-journal.vercel.app`), the articles and notes already saved in that browser should remain available.

It also migrates each line from the old article vocabulary field into the new structured Vocabulary page once.

### Important safeguard

Before replacing the current deployment, open the existing website and choose **Export Backup**. Local browser data belongs to the exact domain and browser profile. A different Vercel preview URL will have separate local storage.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to the existing Vercel project

Replace the project files in the existing Git repository with this version, commit, and push. Vercel should rebuild the same production project automatically.

```bash
git add .
git commit -m "Add reading progress dashboard and training tracker"
git push
```

Do not create a new Vercel project if you want the same production domain and browser storage.

## Backup format

Version 4 exports one JSON object containing articles, books, sessions, vocabulary, tests, goals, and weekly reviews. Import also accepts the previous article-only JSON array.
