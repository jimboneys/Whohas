# WhoHas — Product Requirements Document

## Original Problem Statement
"A web browser or app called WhoHas." Clarified into an **AI-driven "who has…" answer engine**: users ask natural questions ("who has the best wings", "who has discounts on pizza", "who has the world record") and get a ranked answer with a summary + top contenders, each linking to a source.

## User Choices
- Platform: Mobile app (Expo/React Native)
- AI model: Claude Sonnet 4.6 (via Anthropic / Emergent universal key)
- Grounding: live web results (SerpApi) — desired
- Auth: none (local-only v1)
- Design: colorful & playful

## Architecture
- **Frontend**: Expo Router, bottom tabs (Ask / Explore / History) + `results` stack screen. Fonts: Fredoka + Nunito (expo-font, local TTFs). Theme tokens in `/app/frontend/src/theme.ts`. Local history via `@/src/utils/storage` (AsyncStorage).
- **Backend**: FastAPI (`/api` prefix). `POST /api/ask` → web_search (SerpApi) → claude_synthesize (Claude Sonnet 4.6) → ranked JSON; demo keyword fallback when no keys. `GET /api/trending-questions`. Stores every query in MongoDB `queries` collection (Motor async).
- **DB**: local MongoDB via `MONGO_URL`.

## Status / Implemented (2026-06-26)
- [x] Ask screen: search input, example chips, recent searches
- [x] Results screen: AI summary card, ranked Top Contenders, TOP PICK badge, source links (expo-web-browser), demo banner, pull-to-refresh
- [x] Explore screen: trending question categories
- [x] History screen: local recent questions, re-ask, clear, empty state
- [x] Backend ask pipeline (Claude + SerpApi wired, demo fallback active)
- [x] MongoDB persistence of queries
- [x] Full validation passed (backend 10/10, all frontend flows)

## Current Limitation (IMPORTANT)
AI answers run in **DEMO MODE** (keyword-based fallback) because no API keys are provisioned in this workspace. Real Claude Sonnet 4.6 + SerpApi answers activate automatically once these are added to `backend/.env`: `ANTHROPIC_API_KEY` (or `EMERGENT_LLM_KEY`) and `SERPAPI_API_KEY` (SerpApi optional — Claude alone answers from knowledge).

## Backlog
- P0: Provision LLM key to switch on real AI answers (web-grounded with citations once SerpApi added)
- P1: Location-aware "near me" queries; share an answer; thumbs up/down feedback stored in Mongo
- P2: Save/bookmark answers; on-brand empty-state illustration; answer caching for repeated questions

## Next Tasks
1. Add API key(s) to enable live AI.
2. Optional: geolocation for local queries; answer sharing.
