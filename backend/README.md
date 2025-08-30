# RE7 Backend API

Node.js + Express + Prisma backend that exposes token balances, transactions, and ERC‑20 transfer endpoints across multiple networks. Includes Postgres persistence, Ganache fork support for local e2e, and a Dockerized dev stack.

## Requirements

- Node 20+
- npm 10+
- PostgreSQL 14+ (for local dev) or Docker Compose

Optional for local chain/fork testing:
- Ganache (auto-started in tests or via Docker compose)

## Getting started

1) Install dependencies

```bash
cd backend
npm ci
```

2) Configure environment

Set a Postgres `DATABASE_URL` in the environment and an Ethereum signer key for transfers:

```bash
# example (local Postgres)
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/re7?schema=public"

# required for /wallet-address and /transfer
export PRIVATE_KEY="0x...your_private_key"

# optional RPCs (defaults are provided if omitted)
export MAINNET_RPC_URL="https://ethereum.publicnode.com"
export SEPOLIA_RPC_URL="https://ethereum-sepolia.publicnode.com"
export POLYGON_RPC_URL="https://polygon-rpc.com"
```

3) Initialize database (Prisma)

```bash
npm run prisma:db:push && npm run prisma:generate
```

4) Run the API in dev mode (SQLite + local fork)

```bash
npm run dev
# API on http://localhost:4000
```

## Scripts

- `npm run dev`: Start dev helper that: switches Prisma to SQLite, starts a local Ganache fork, seeds tokens, and runs the watcher
- `npm run build`: TypeScript build to `dist`
- `npm start`: Run compiled server from `dist`
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:db:push`: Apply schema to the configured database
- `npm test`: Run test suite with an ephemeral SQLite DB and optional local fork
- `npm run seed:fork`: Deploy sample ERC‑20s to a fork and seed DB (uses `FORK_RPC_URL`)

## Environment variables

- `DATABASE_URL` (required for Postgres runtime)
- `PRIVATE_KEY` (required for signing transfers and `/wallet-address`)
- `MAINNET_RPC_URL`, `SEPOLIA_RPC_URL`, `POLYGON_RPC_URL` (optional; sensible defaults exist)
- `FORK_RPC_URL` (optional; used by tests/seed and Docker entrypoint)
- `PORT` (default 4000)

Test-only (loaded from `env.test` by vitest):
- `DATABASE_URL=file:./test.db?connection_limit=1`

## API

Base URL: `http://localhost:4000`

- `GET /healthz` → `{ ok: true }`
- `GET /networks` → `string[]` of supported networks: `ethereum`, `sepolia`, `matic`
- `GET /wallet-address` → Returns the address derived from `PRIVATE_KEY`

Tokens
- `GET /tokens/:address` → Aggregated balances across supported networks for an EVM address
- `GET /tokens/:network` → Supported tokens for a network from DB (enabled only)

Transactions
- `GET /transactions/:address/:token` → Transactions for `address` and `token`

Transfers
- `POST /transfer` → Submit ERC‑20 transfer

Request body:
```json
{
  "network": "sepolia",
  "to": "0x...",
  "token": "0x...",
  "amount": "1.5"
}
```

Responses:
- `202 { "hash": "0x..." }` on acceptance
- `400` for validation errors or blacklisted recipient

Admin
- `POST /blacklist` → `{ address, reason? }` to blacklist a recipient
- `POST /add-supported-token` → `{ network, token: { tokenAddress, symbol, name, decimals, enabled? } }`
- `POST /remove-supported-token` → `{ network, token }` (token is address)

## Data model (Prisma)

Key tables:
- `Transaction`: tracked transfers
- `AddressBlacklist`: addresses prevented from receiving transfers
- `SupportedToken`: per-network token allowlist for balances/UX

See `prisma/schema.prisma` for full schema.

## Running tests

The test suite uses vitest. Unit tests mock external services; e2e tests optionally spin up a local fork.

```bash
cd backend
npm test
```

Notes:
- Tests temporarily switch Prisma provider to SQLite and clean up the file DB afterward.
- If Ganache is available, a local fork is started automatically via global setup. Otherwise, set `FORK_RPC_URL` and `PRIVATE_KEY` if you want the e2e transfer test to run.

## Docker and Compose

This repo includes a Dockerfile for the backend and a top-level `docker-compose.yml` that starts:
- `fork`: Ganache (chainId 11155111)
- `db`: Postgres
- `backend`: this API (auto-seeds supported tokens on startup if `FORK_RPC_URL` is reachable)
- `frontend`: example Next.js app (points to the backend)

Start everything:

```bash
docker compose up --build
# Backend: http://localhost:4000
# Frontend: http://localhost:3000
```

Backend container env in compose:
- `DATABASE_URL=postgresql://postgres:postgres@db:5432/re7?schema=public`
- `FORK_RPC_URL=http://fork:8545` (also used to seed tokens at entry)
- `SEPOLIA_RPC_URL=http://fork:8545`
- Provide `PRIVATE_KEY` to enable `/wallet-address` and `/transfer` from the container if needed.

## Seeding on a fork

On container start, `docker-entrypoint.sh` waits for `FORK_RPC_URL`, then runs `dist/scripts/seed.js` to deploy sample ERC‑20 tokens and insert them into `SupportedToken` for `sepolia`. You can also run locally with:

```bash
cd backend
FORK_RPC_URL=http://127.0.0.1:8545 PRIVATE_KEY=0x... npm run seed:fork
```

## Development tips

- Address validation and network checks return `400` with helpful messages.
- Supported networks and providers are configured in `src/config/networks.ts`.
- Contract interactions are in `src/services/contract.ts`.
- DB helpers are in `src/services/dbService.ts`.


