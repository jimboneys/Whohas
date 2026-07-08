# WhoHas — Test Credentials & Admin Access

## Ad / Partner Slots admin
- Endpoint to book/release a slot: `PUT /api/ad-slots/{key}`
- Header required: `X-Admin-Token: whohas-admin`  (env var `ADMIN_TOKEN`, default `whohas-admin`)
- Slot keys: deal, sponsor, weekly, flash, local, coupon
- Book:    body `{"sponsor":{"name":"Aldi","tagline":"...","url":"https://...","image":"<url-or-base64>"}}`
- Release: body `{"sponsor":null}`
- Read (public): `GET /api/ad-slots`

## App auth
- No user authentication in the app (local-only, no login).

## LLM
- Emergent Universal LLM key configured in backend/.env (`EMERGENT_LLM_KEY`). Claude Sonnet 4.6 live.
