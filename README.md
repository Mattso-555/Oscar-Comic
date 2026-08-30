# Oscar's Comic Maker

Oscar's own comic maker. **The kid draws everything** — characters, backdrops, props, effects — saves them to a Toy Box, and builds multi-page comics. The Story Helper only ever brings **words**: story plans, dialogue, and dares to draw more. It never generates art.

## Features

- **Draw studio** — smooth brush, paint-bucket fill, eraser, 30-colour paintbox + any-colour picker, undo, photo upload with automatic paper removal
- **Beginner mode** — step-by-step coaching and faint trace outlines that match what the kid picked (robot, monster, castle…), never saved into the art
- **Toy Box** — persistent library with kinds (character / backdrop / prop / effect), sub-types, and story roles (goodie / baddie / sidekick / extra); rename and filter
- **Comic builder** — multiple pages, 1–9 panels per page, drag & drop, flip/resize/duplicate/scatter, one-tap backdrop colours, speech bubbles, caption strips
- **Story Helper** — Claude-powered story plans, ideas, and dialogue that use the kid's own cast by name; embeds captions straight into panels; **falls back to a built-in offline idea engine automatically** if no API key is set
- **Everything saves** — the Toy Box and comics persist in the browser between sessions
- **Share** — download any comic page as a PNG

## Deploy (about 10 minutes)

1. **Push to GitHub**
   ```bash
   git init && git add -A && git commit -m "Oscars Comic Maker"
   git remote add origin https://github.com/Mattso-555/Oscar-Comic.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the repo
   - Framework preset: **Next.js** (auto-detected). Click **Deploy**.

3. **(Optional but recommended) Turn on the real AI story brain**
   - Get an API key at [console.anthropic.com](https://console.anthropic.com) (add a few dollars of credit — kid usage costs pennies)
   - In Vercel → your project → **Settings → Environment Variables**, add:
     - `ANTHROPIC_API_KEY` = `sk-ant-...`
   - Redeploy. Without a key, the Story Helper quietly uses its built-in offline ideas instead — the app never breaks.

## Run locally

```bash
npm install
cp .env.local.example .env.local   # optional: add your key for AI stories
npm run dev
```

## Notes

- Drawings and comics are saved in the browser (localStorage) — per device. Clearing browser data clears the Toy Box.
- The `/api/story` route is a narrow proxy: the API key stays on the server and the browser never sees it.
