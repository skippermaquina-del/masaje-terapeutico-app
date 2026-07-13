# MyoMBLEx — Therapeutic Massage Exam Prep

A free, bilingual/trilingual study app for the **MBLEx** (Massage & Bodywork Licensing Examination). Built as a personal study tool and shared with fellow students.

🔗 **Live app:** https://skippermaquina-del.github.io/masaje-terapeutico-app/

## Features

- **18 topics** covering the full MBLEx content outline (anatomy & physiology, kinesiology, pathology & contraindications, benefits/effects of soft tissue manipulation, client assessment, ethics & law, and professional practice guidelines)
- **100 original practice questions per topic**, each with an explanation
- **Flashcards** and an auto-generated **mind map** per topic
- **Notes in English, Spanish, and Russian** (content toggle — the interface itself stays in English)
- **Images** with open-license sourcing and full attribution per topic
- **Audio narration** of the English notes, for studying hands-free
- **Ask AI** — a chat assistant grounded in each topic's notes, for follow-up questions
- **Progress dashboard** showing topics completed and quiz scores across everyone using the app
- Offline-friendly: progress is saved locally and synced to Supabase when online

## Tech stack

- [Vite](https://vitejs.dev/) + vanilla TypeScript (no framework)
- [`marked`](https://github.com/markedjs/marked) for Markdown rendering
- [`markmap`](https://markmap.js.org/) for mind maps
- [Supabase](https://supabase.com/) — Postgres for progress/feedback storage, Edge Functions for the AI chat proxy and email notifications
- Deployed to **GitHub Pages** via GitHub Actions on every push to `main`

## Project structure

```
public/
  content/<topic-slug>/
    en.md, es.md, ru.md   # study notes, one per language
    flashcards.json
    questions.json         # 100 quiz questions
    mindmap.md
    audio.mp3
    images/                # sourced images + credits.json
  data/topics.json         # topic index (title, status, question count, etc.)
src/
  main.ts                  # routing + page shells
  chat.ts, quiz.ts, flashcards.ts, mindmap.ts, images.ts, audio.ts, feedback.ts
  lib/                     # data access, Supabase client, types, markdown
supabase/
  functions/                # Edge Functions (ai-chat, notify-progress)
  migrations/                # SQL schema
```

## Running locally

```bash
npm install
npm run dev
```

Requires a `.env` file (see `.env.example`) with a Supabase project URL and anon key for progress sync and the AI chat feature to work; the app still functions without them (progress falls back to `localStorage`, and the Ask AI tab just won't be configured).

```bash
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

## Content

All study content (notes, flashcards, quiz questions) is written from scratch in original wording — never copied verbatim from any copyrighted source. Images are sourced from Wikimedia Commons and similar under open licenses, each with attribution in that topic's `images/credits.json`.

## License

Free to use for personal study purposes.
