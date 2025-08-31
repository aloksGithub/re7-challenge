# RE7 Frontend (Next.js + React Query)

Simple UI for viewing balances, sending ERC‑20 transfers, and browsing transaction history. Talks to the backend API.

## Requirements

- Node 20+
- npm 10+

## Configuration

- `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000`) — backend API base URL.

Set in your shell or an `.env.local` file:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Development

```bash
cd frontend
npm install
npm run dev
# App on http://localhost:3000
```

## Build and start (production)

```bash
npm run build
npm start
```

## Scripts

- `npm run dev`: Next dev server (Turbopack)
- `npm run build`: Production build
- `npm start`: Start production server
- `npm run lint`: Run ESLint

## Features

- Network selector populated from `GET /networks`
- Shows aggregated balances from `GET /tokens/:address` (filtered by selected network)
- Token page with:
  - Transfer tab (`POST /transfer`)
  - History tab (`GET /transactions/:address/:token`)

## Project structure

- `src/app` — App Router pages
- `src/components` — UI components
- `src/context/NetworkContext.tsx` — network selection state
- `src/hooks/useBackend.ts` — React Query hooks
- `src/lib/api.ts` — API client
- `src/lib/config.ts` — API base URL configuration
- `src/lib/types.ts` — shared types
