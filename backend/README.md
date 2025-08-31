# RE7 Backend API

Node.js + Express + Prisma + Ethers backend that exposes token balances, transactions, and ERC‑20 transfers across multiple networks.

## Requirements

- Node 20+
- npm 10+
- PostgreSQL 14+ (for production or if you prefer Postgres locally)

Dev defaults to SQLite unless `DATABASE_URL` points to Postgres.

## Getting started (local, no Docker)

1) Install dependencies

```bash
cd backend
npm install
```

2) Run in development

```bash
# Uses SQLite by default and may start a local fork automatically
npm run dev
# API on http://localhost:4000
```

Notes:
- In dev, if `FORK_RPC_URL` is not set, a local Ganache fork is started automatically and the first account’s private key is used. If a fork RPC is available, sample ERC‑20s are deployed and registered under the `localhost` network.
- If you want to use Postgres locally, set `DATABASE_URL` before starting (see Environment).

3) Build and run (compiled)

```bash
npm run build
npm start
```

## Scripts

- `npm run dev`: Developer helper (ensures Prisma schema, may start local fork, optionally seeds tokens, runs server with watch)
- `npm run build`: Compile TypeScript to `dist`
- `npm start`: Start compiled server
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:db:push`: Apply schema to configured database
- `npm run seed`: Deploy sample ERC‑20s to a fork and register them (requires `FORK_RPC_URL` and a signer)
- `npm test`: Run tests with an ephemeral SQLite DB (and optional local fork)

## Environment variables

Common:
- `PORT` (default `4000`)
- `DATABASE_URL` (Postgres or SQLite). Examples:
  - `postgresql://postgres:postgres@localhost:5432/re7?schema=public`
  - `file:./dev.db?connection_limit=1`
- `PRIVATE_KEY` (required for `/wallet-address` and `/transfer`; set automatically in dev if using the local fork helper)
- `API_KEY` (required for authenticated endpoints like `/transfer` and all admin endpoints)
- RPCs (defaults provided if omitted):
  - `MAINNET_RPC_URL` (default `https://ethereum.publicnode.com`)
  - `SEPOLIA_RPC_URL` (default `https://ethereum-sepolia.publicnode.com`)
  - `POLYGON_RPC_URL` (default `https://polygon-rpc.com`)
  - `LOCALHOST_RPC_URL` (default `http://127.0.0.1:8545`)
- Fork/dev helpers:
  - `FORK_RPC_URL` (if set, used for token seeding and localhost network)
  - `ENABLE_FORK` (`true`/`false`) force-enable/disable creating a local fork in dev when `FORK_RPC_URL` is not set
  - `AUTO_SEED_ON_START` (`true` by default) to auto‑deploy/register sample tokens when a fork RPC is reachable

Rarely used:
- `PRISMA_PROVIDER` (`sqlite` or `postgresql`)
- `DB_PUSH_RETRIES`, `DB_PUSH_RETRY_DELAY_MS`

Example (Postgres + explicit signer):
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/re7?schema=public"
export PRIVATE_KEY="0x..."
```

## API

Base URL: `http://localhost:4000`

- Authentication: Sensitive endpoints require an API key provided via the `x-api-key` header. Set `API_KEY` in the server environment and include the same value in requests.

- `GET /healthz` → `{ ok: true }`
- `GET /networks` → Supported networks: `ethereum`, `sepolia`, `matic` (+ `localhost` in non‑prod)
- `GET /wallet-address` → The server wallet address (derived from `PRIVATE_KEY`)

Tokens
- `GET /tokens/:address` → Aggregated balances for an EVM address across supported networks
- `GET /supported-tokens/:network` → Supported tokens for a network from DB (enabled only)

Transactions
- `GET /transactions/:address/:token` → Transactions for `address` and `token`

Transfers
- `POST /transfer` (requires `x-api-key`) → Submit ERC‑20 transfer

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
- `400` for validation/blacklist errors; `401` for missing/invalid API key; `5xx` for upstream/provider issues (normalized)

Example (with API key):
```bash
curl -X POST "$API_BASE/transfer" \
  -H "content-type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"network":"sepolia","to":"0x...","token":"0x...","amount":"1.5"}'
```

Admin
- All admin endpoints require the `x-api-key` header:
- `POST /blacklist` → `{ address, reason? }`
- `POST /add-supported-token` → `{ network, token: { tokenAddress, symbol, name, decimals, enabled? } }`
- `POST /remove-supported-token` → `{ network, token }` (token is address)

## Data model (Prisma)

Key tables:
- `Transaction`: tracked transfers
- `AddressBlacklist`: addresses prevented from receiving transfers
- `SupportedToken`: per‑network token allowlist for balances/UX

See `prisma/schema.prisma` for the full schema.

## Running tests

```bash
cd backend
npm test
```

Notes:
- Tests temporarily switch Prisma to SQLite and clean up the file DB afterward.
- A local fork may be started automatically; set `FORK_RPC_URL` and `PRIVATE_KEY` to run e2e transfer tests against your own RPC.

## Development notes

- Supported networks/providers: `src/config/networks.ts`
- Contract interactions: `src/services/contract.ts`
- DB helpers: `src/services/dbService.ts`

