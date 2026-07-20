# WhoHas 🔎

**The fastest way to find who has the cheapest groceries & household supplies. No BS, just the best deal.**

WhoHas is a playful "who has…" answer engine. Ask a question (or tap a quick pick) and
get an instant single answer with product images, store comparisons, and the best deal
highlighted — plus a **My List** feature that finds the cheapest total basket across stores.
Built as a mobile app **and** an installable PWA.

---

## ✨ Features
- ⚡ **Instant price answers** — natural-language search powered by Claude Sonnet 4.6
- 🛒 **My List** — build a grocery list and see the cheapest total basket across stores
- 🏷️ **Store comparison** with the best deal highlighted + "split across stores" max savings
- 🎨 **Playful UI** — Quick Picks, Featured Sponsors, rotating Local Special, community feed
- 🏅 **WhoHas Pro** — ad-free + exclusive deals (Stripe, web/PWA only for store compliance)
- 🔒 **Anonymous by design** — no accounts, no location/IP stored in query logs
- 📲 **Installable PWA** — Add to Home Screen on any device

---

## 🧱 Tech Stack
| Layer     | Tech                                                        |
|-----------|-------------------------------------------------------------|
| Frontend  | Expo (React Native) + Expo Router, PWA (service worker)     |
| Backend   | FastAPI + Motor (async MongoDB), in-memory rate limiting    |
| Database  | MongoDB                                                     |
| AI        | Claude Sonnet 4.6 via `emergentintegrations` (Emergent key) |
| Payments  | Stripe Checkout (Pro subscriptions)                         |

---

## 📁 Structure
```
app/
├── backend/            FastAPI app
│   ├── server.py       API, LLM logic, Stripe, basket pricing, rate limits
│   ├── Dockerfile      deploy to Render / Railway / Fly.io
│   └── requirements.txt
├── frontend/           Expo app
│   ├── app/            file-based routes (tabs: Ask, Explore, My List, Community, History)
│   ├── src/            components, api client, theme, utils
│   └── public/         PWA manifest, service worker, icons, vercel.json
├── scripts/
│   └── build_pwa.sh    rebuild the PWA against a production backend URL
└── PWA_DEPLOY.md       full production deployment guide
```

---

## 🚀 Local development
**Backend**
```bash
cd backend
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
uvicorn server:app --host 0.0.0.0 --port 8001
```
**Frontend**
```bash
cd frontend
yarn install
yarn start        # Expo dev server (web + Expo Go QR)
```

### Backend environment variables
| Variable            | Description                                             |
|---------------------|---------------------------------------------------------|
| `MONGO_URL`         | MongoDB connection string (Atlas `mongodb+srv://...`)   |
| `DB_NAME`           | e.g. `whohas`                                           |
| `EMERGENT_LLM_KEY`  | Emergent universal key (Profile → Universal Key)        |
| `CLAUDE_MODEL`      | `claude-sonnet-4-6`                                     |
| `STRIPE_API_KEY`    | Your Stripe secret key (`sk_test_...` / `sk_live_...`)  |
| `SERPAPI_API_KEY`   | Optional — blank uses estimated pricing                 |

Frontend uses `EXPO_PUBLIC_BACKEND_URL` to reach the API.

---

## 🌐 Production deployment
See **[`PWA_DEPLOY.md`](./PWA_DEPLOY.md)** for the full guide. Short version:
1. **Backend** → deploy `backend/` (Docker) to Render/Railway/Fly.io with the env vars above.
2. **Rebuild PWA** → `./scripts/build_pwa.sh https://your-backend-url`
3. **Static PWA** → deploy `frontend/dist/` to Vercel (includes `vercel.json`).

> Notes: pricing is currently deterministic/estimated (add a live shopping API later).
> The bundled `sk_test_emergent` Stripe key only works on Emergent hosting — use your own
> key when self-hosting.

---

## 📄 License
Proprietary — all rights reserved.
