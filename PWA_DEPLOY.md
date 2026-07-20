# WhoHas — Production PWA Deployment

The PWA is just the web build. It must point at a **stable backend URL** (not the
temporary Emergent preview URL). Two moving parts: **backend** + **static PWA on Vercel**.

---

## Step 1 — Deploy the backend (pick ONE)

### Option A — Emergent Publish (recommended, keeps Emergent keys working)
The `EMERGENT_LLM_KEY` (Claude) and Stripe test key (`sk_test_emergent`) route through
Emergent's gateway, so hosting the backend on Emergent avoids extra setup.
1. Click **Publish / Deploy** (top-right).
2. Note the deployed backend base URL it gives you.

### Option B — Self-host (Render / Railway / Fly.io)
A `Dockerfile` is included at `backend/Dockerfile`.
You must provide these environment variables on the host:

| Variable            | What it is                                              |
|---------------------|---------------------------------------------------------|
| `MONGO_URL`         | MongoDB connection string — use MongoDB Atlas free tier |
| `DB_NAME`           | e.g. `whohas`                                           |
| `EMERGENT_LLM_KEY`  | your Emergent universal key (from Profile → Universal Key) |
| `CLAUDE_MODEL`      | `claude-sonnet-4-6`                                      |
| `STRIPE_API_KEY`    | **your own** Stripe secret key (`sk_live_...` / `sk_test_...`) — the built-in `sk_test_emergent` only works on Emergent hosting |
| `SERPAPI_API_KEY`   | optional (leave empty → estimated pricing)              |

Render quick path: New → Web Service → connect repo/upload → it detects the Dockerfile →
set the env vars above → deploy → copy the `https://...onrender.com` URL.

> MongoDB: create a free cluster at cloud.mongodb.com, add a database user, allow network
> access `0.0.0.0/0`, and copy the `mongodb+srv://...` string into `MONGO_URL`.

> Stripe note: on self-hosted backends the built-in test key won't work. Put your own
> Stripe key in `STRIPE_API_KEY`. (Pro checkout only shows on web/PWA anyway.)

---

## Step 2 — Rebuild the PWA against that backend URL

Run (from `/app`):

```bash
./scripts/build_pwa.sh https://YOUR-BACKEND-URL
```

This regenerates `frontend/dist/` and `whohas-pwa.zip` with the backend URL baked in.
It does **not** modify your local `.env`, so the preview keeps working.

---

## Step 3 — Deploy the PWA to Vercel

The `dist/` folder already contains `vercel.json` (SPA rewrites + PWA headers).

**Easiest (no CLI):**
1. Unzip `whohas-pwa.zip`.
2. Go to vercel.com → Add New → Project → drag-and-drop the unzipped folder,
   or use the Vercel CLI: `cd dist && npx vercel deploy --prod`.
3. Vercel gives you `https://your-app.vercel.app` — that's your **PWA link**.

**Install on device:** open the Vercel URL →
- Android/Chrome/Edge: menu → *Install app*
- iOS/Safari: Share → *Add to Home Screen*
- Desktop Chrome/Edge: install icon in the address bar

---

## Checklist
- [ ] Backend deployed, `/api/ask` returns 200 at the new URL
- [ ] `./scripts/build_pwa.sh <backend-url>` run successfully
- [ ] `dist/` deployed to Vercel over HTTPS
- [ ] Opened the Vercel URL and saw the Install prompt
