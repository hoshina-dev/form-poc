# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/poc/package.json apps/poc/package.json
COPY apps/gallery/package.json apps/gallery/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/forms/package.json packages/forms/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter poc build

FROM node:24-alpine AS runner
WORKDIR /app

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder --chown=nextjs:nextjs /repo/apps/poc/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /repo/apps/poc/.next/static ./apps/poc/.next/static
COPY --from=builder --chown=nextjs:nextjs /repo/apps/poc/public ./apps/poc/public
COPY --from=builder --chown=nextjs:nextjs /repo/apps/poc/examples ./apps/poc/data/forms

USER nextjs
WORKDIR /app/apps/poc
EXPOSE 3000

CMD ["node", "server.js"]
