# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://crm:crm@db:5432/dairy_crm?schema=public"
RUN npx prisma generate
RUN npx next build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# So prisma.config.ts can resolve `prisma/config` from the global install
ENV NODE_PATH=/usr/local/lib/node_modules
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Prisma CLI + tsx for migrate/seed (cached; far smaller than full node_modules)
RUN npm install -g prisma@7.8.0 tsx@4.23.1

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

# Standalone output — only traced production deps (~tens of MB, not hundreds)
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv

# prisma.config.ts imports `prisma/config` — link global package into app node_modules
RUN ln -sfn /usr/local/lib/node_modules/prisma ./node_modules/prisma

# Ensure seed/login runtime deps exist in standalone image
RUN npm install --omit=dev --ignore-scripts --no-save \
  bcryptjs@3.0.3 \
  pg@8.22.0 \
  @prisma/adapter-pg@7.8.0 \
  @prisma/client@7.8.0 \
  dotenv@17.4.2 \
  && chown -R nextjs:nodejs node_modules

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
