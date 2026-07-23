# Springbok Rush — SA White-label Slot Kit (MVP)

Configurable **5-reel / 3-row** slot shell for the **South African** market, built as a **demo / free-play** product for portfolio and B2B operator integration.

> **Not a real-money product.** No deposits, no wallet, no licensed wagering.  
> Server-authoritative outcomes. PixiJS is presentation only.

## Why this exists

Aligned with a Durban / SA iGaming path:

- **Game studio IP** — one shell, many themes
- **B2B white-label** — `operatorId` + `gameId` embed params
- **Local market** — ZAR, EN + isiZulu, 18+ / RG chrome, mobile portrait
- **Compliance-aware** — demo-only, no unlicensed operator surface

## Stack

| Layer | Tech |
|--------|------|
| Client | PixiJS 8 + Vite + TypeScript |
| Server | Express + TypeScript |
| Shared | Game config, paytable math, i18n |
| Currency | ZAR (cents integer math) |

## Features (MVP)

**Player**

- Demo balance (R1 000 start)
- Bet ladder R1 – R100
- Spin with staggered reel stop
- Server win evaluation + line highlight + coin burst
- Autoplay with stop conditions (N spins, single win ≥ X, balance ≤ Y)
- Turbo + reduced motion
- Paytable / rules / RTP / session summary
- Sound toggle (WebAudio beeps)
- EN ↔ isiZulu

**Operator / studio**

- Theme + branding in `shared/src/defaultConfig.ts`
- Paytable + reel strips + 20 paylines as data
- Feature flags: wild, scatter, free spins
- Embed: `?operatorId=...&gameId=springbok-rush`
- Always demo mode

## Quick start

```bash
cd sa-white-label-slot
npm install
npm run build -w shared
npm run dev
```

- Game UI: http://localhost:5173  
- API: http://localhost:8787  
- Embed example: http://localhost:5173/?operatorId=lulabet-demo&gameId=springbok-rush

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Health + market metadata |
| `POST` | `/api/session` | Create demo session `{ operatorId, gameId }` |
| `GET` | `/api/session/:id` | Session + config |
| `GET` | `/api/config/:gameId` | Game config JSON |
| `POST` | `/api/spin` | `{ sessionId, betCents }` → grid + wins |

## Project layout

```
sa-white-label-slot/
  shared/     types, math, i18n, default SA config
  server/     session store + spin service + static host
  client/     PixiJS reels + HTML HUD (mobile-first)
```

## Reskinning (next theme in 1–2 days)

1. Clone `defaultConfig` → new `gameId` (e.g. `psl-nights`)
2. Change `branding` colours + `logoText`
3. Swap symbol labels/colours in `client/src/symbols.ts` (or load textures)
4. Tune `reelStrips` + `paytable` for feel
5. Register in `server/src/sessionStore.ts` map

## Production notes (later)

- Persist sessions in Redis/Postgres
- Certified RNG + manufacturer licence path before real money
- Operator wallet integration (never client-side balance as source of truth)
- Asset CDN, SFX packs, compressed textures
- CSP headers for iframe embeds
- Full RG tooling (limits, self-exclusion) with licensed partner

## Legal

Demo software for **portfolio / integration demos** with **licensed** South African operators only.  
Does not constitute a gambling product or licence.  
18+ · [Responsible Gambling](https://www.responsiblegambling.org.za/)
