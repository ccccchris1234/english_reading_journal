# Reading Journal V2

A personal reading journal website built with React + Vite.

## New in V2

This version adds **Reading Mode**:

- Left window: article text stays visible
- Right window: comments, highlighted sentences, vocabulary, and summary
- Select a sentence from the article and click **Add Selection to Highlights**
- Save notes without leaving the reading screen

## Features

- Add articles
- Save article title, source, link, category, date, status, and difficulty
- Write summaries
- Add comments/reflections
- Collect useful vocabulary and expressions
- Search and filter saved articles
- Export/import your local backup as JSON

## Important

This version uses `localStorage`.

Your articles are saved in your browser on your current device. Use **Export Backup** regularly.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy on Vercel

- Framework Preset: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`
