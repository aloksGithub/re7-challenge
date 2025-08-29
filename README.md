Re7 Challenge - Scaffold

Run locally without Docker:

1. Backend
   - cd backend
   - Copy env: cp .env.example .env (or set DATABASE_URL to Postgres)
   - npm install
   - npm run prisma:generate
   - npm run dev

2. Frontend
   - cd frontend
   - npm install
   - npm run dev

Run with Docker Compose:

1. From repo root: docker compose up --build
2. Open http://localhost:3000 (frontend) and http://localhost:4000/healthz (backend)

Notes:
- Backend uses Express + TypeScript + Prisma. Tests run against SQLite in-memory.
- Frontend uses Next.js and will be run with `vercel start` inside the container.
- Set RPC_URL in environment for real chain calls with ethers.

