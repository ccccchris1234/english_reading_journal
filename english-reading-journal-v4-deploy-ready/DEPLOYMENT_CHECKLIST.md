# Upgrade checklist for the existing Vercel site

1. Open the current production website in the same browser where your data is saved.
2. Click **Export Backup** and keep the JSON file.
3. Put the files from this package into the Git repository already connected to the existing Vercel project.
4. Commit and push to the same production branch.
5. Confirm that Vercel updates `english-reading-journal.vercel.app`, rather than creating a new project or preview-only domain.
6. Open the production URL and check the **Articles** and **Vocabulary** pages.
7. The app will keep `reading-journal-articles-v3` and migrate old vocabulary lines into structured vocabulary cards.
8. If browser data does not appear, use **Import** and select the backup from step 2.

## What is preserved automatically

- saved articles
- summaries and comments
- article text
- tags and status
- highlights
- old vocabulary lists
- reading mode and random review

## New storage collections

- `reading-journal-books-v1`
- `reading-journal-sessions-v1`
- `reading-journal-vocabulary-v1`
- `reading-journal-tests-v1`
- `reading-journal-goals-v1`
- `reading-journal-reviews-v1`

The new full backup contains all collections in one JSON file. Old article-only backup arrays remain importable.
