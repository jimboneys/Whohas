# WhoHas — Test Credentials

This app has **no authentication / login** (v1 is local-use, no accounts).

- No login screen, no user accounts, no admin panel.
- Nothing to log in to; all features are accessible without credentials.

## Environment keys (backend/.env, NOT credentials for login)
- `EMERGENT_LLM_KEY` — Emergent universal key powering Claude Sonnet 4.6 (configured).
- `SERPAPI_API_KEY` — optional, for live web grounding (blank = answers from model knowledge).
- `MONGO_URL`, `DB_NAME` — database connection (managed by platform).
