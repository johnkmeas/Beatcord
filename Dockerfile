FROM node:20-slim AS base
RUN corepack enable

WORKDIR /app

# Install dependencies
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server
COPY packages/client packages/client

# Build
RUN pnpm --filter @beatcord/shared build
RUN pnpm --filter @beatcord/client build
RUN pnpm --filter @beatcord/server build

# Production stage
FROM node:20-slim AS production
RUN corepack enable

WORKDIR /app

COPY --from=base /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=base /app/packages/shared/package.json packages/shared/
COPY --from=base /app/packages/shared/dist packages/shared/dist
COPY --from=base /app/packages/server/package.json packages/server/
COPY --from=base /app/packages/server/dist packages/server/dist
COPY --from=base /app/packages/client/dist packages/client/dist

RUN pnpm install --frozen-lockfile --prod

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
