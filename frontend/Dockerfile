# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --loglevel=warn

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx vercel build --yes

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.vercel/output ./.vercel/output
RUN npm i -g vercel@39.3.0
ENV PORT=3000
EXPOSE 3000
CMD ["vercel", "start", "--listen", "0.0.0.0:3000"]

