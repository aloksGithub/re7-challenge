RE7 Challenge – Full‑Stack Scaffold

Backend: Node.js + Express + Prisma + Ethers
Frontend: Next.js (App Router) + React Query

This app lists balances for supported ERC‑20 tokens, allows submitting transfers, and tracks transactions. It supports multiple networks with sensible RPC defaults and a convenient local fork for development.

## Monorepo layout

- `backend/` — API server and scripts
- `frontend/` — Next.js UI

## Quick start (without Docker)

1) Backend

```bash
cd backend
npm install
npm run dev
# API on http://localhost:4000
```

2) Frontend

```bash
cd frontend
npm install
npm run dev
# App on http://localhost:3000
```

Defaults:
- In backend dev, if no `FORK_RPC_URL` is provided, a local Ganache fork may be started automatically and sample ERC‑20s are deployed to the `localhost` network. A default signer key from that fork may also be set automatically for convenience.
- The frontend points to `http://localhost:4000` by default (via `NEXT_PUBLIC_API_BASE_URL`).

## Docker Compose

This repo includes a `docker-compose.yml` that starts a complete stack for local testing:
- `fork` — Ganache JSON‑RPC at `http://localhost:8545`
- `db` — Postgres 16 with a `re7` database
- `backend` — API on `http://localhost:4000`
- `frontend` — UI on `http://localhost:3000`

Run:

```bash
docker compose up --build
```

To exclude spinning up a fork and seeding it with ERC20 tokens, use `docker-compose-prod.yml` instead
```bash
docker compose -f .\docker-compose-prod.yml up --build
```

Environment defaults in compose (edit as needed):
- Backend
  - `DATABASE_URL=postgresql://postgres:postgres@db:5432/re7?schema=public`
  - `FORK_RPC_URL=http://fork:8545`
  - `LOCALHOST_RPC_URL=http://fork:8545`
  - `PRIVATE_KEY` set to the deterministic Ganache account key
- Frontend
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`

Open:
- Frontend: http://localhost:3000
- Backend health: http://localhost:4000/healthz

## API overview

Base URL: `http://localhost:4000`

- `GET /healthz`
- `GET /networks` → supported networks
- `GET /wallet-address` → server wallet address
- `GET /tokens/:address` → aggregated balances
- `GET /supported-tokens/:network` → enabled tokens for network
- `GET /transactions/:address/:token` → transfer history
- `POST /transfer` → submit ERC‑20 transfer

Admin endpoints:
- `POST /blacklist`
- `POST /add-supported-token`
- `POST /remove-supported-token`

## Development notes

- See `backend/README.md` for backend environment and scripts
- See `frontend/README.md` for frontend configuration and scripts

