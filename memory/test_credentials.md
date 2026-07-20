# WhoHas — Test Credentials & Notes

## App auth
- No user authentication (anonymous app, no login). Pro entitlement is tied to an anonymous device_id generated client-side.

## Stripe (WhoHas Pro)
- STRIPE_API_KEY set in backend/.env = `sk_test_emergent` (emergent-managed test key).
- Plans (server-side fixed): yearly = $60 (365d), monthly = $6.99 (30d).
- Endpoints: POST /api/pro/checkout {plan, device_id, origin_url} -> {url, session_id};
  GET /api/pro/status/{session_id}; GET /api/pro/entitlement?device_id=...; POST /api/webhook/stripe.

## Admin (ad slots)
- Admin write endpoint PUT /api/ad-slots/{key} is DISABLED unless env `ADMIN_TOKEN` is set (returns 503). No weak default.

## Security
- Rate limits (per IP, 60s window): ask=25, comments=8, like=40, ad-click=40, checkout=6. Exceed -> HTTP 429.

## LLM
- EMERGENT_LLM_KEY in backend/.env (Claude Sonnet 4.6 live).
