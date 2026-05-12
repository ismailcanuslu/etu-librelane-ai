FROM node:20-alpine AS base

# 1. Aşama: Bağımlılıkları yükle
FROM base AS deps
# Hata buradaydı: --no-alt-client yerine --no-cache kullanıyoruz
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN npm ci

# 2. Aşama: Build aşaması
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Aşama: Çalışma aşaması (Runner)
FROM base AS runner
WORKDIR /app

# Warning çözümü: ENV anahtar=değer formatına geçildi
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Warning çözümü: Eşittir işareti eklendi
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# BFF sunucu tarafı fetch (Route Handlers). Konteyner içinde 127.0.0.1 host'u göstermez.
# Backend aynı ağdaysa: -e WORKSPACE_BACKEND=http://librelane-backend:8001 --network librelane-network
# Backend host'taysa (Linux): -e WORKSPACE_BACKEND=http://host.docker.internal:8001 --add-host=host.docker.internal:host-gateway

CMD ["node", "server.js"]
