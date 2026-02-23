FROM node:20-slim AS base

WORKDIR /app

# Railway injects NODE_ENV=production which causes pnpm to skip devDependencies.
# Force development mode so vite, vue-tsc, typescript, etc. are installed for the build.
ENV NODE_ENV=development

# Enable corepack with pinned pnpm version
COPY package.json ./
RUN corepack enable && corepack prepare pnpm@9.15.5 --activate

# Install ALL dependencies (including devDependencies needed for build)
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server
COPY packages/client packages/client

# Build all packages in dependency order
RUN pnpm --filter @beatcord/shared build
RUN pnpm --filter @beatcord/client build
RUN pnpm --filter @beatcord/server build

# ── Production stage ──────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Copy package manifests (all workspace packages must be present for pnpm)
COPY --from=base /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=base /app/packages/shared/package.json packages/shared/
COPY --from=base /app/packages/server/package.json packages/server/
COPY --from=base /app/packages/client/package.json packages/client/

# Enable corepack with explicit version and --activate
RUN corepack enable && corepack prepare pnpm@9.15.5 --activate

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=base /app/packages/shared/dist packages/shared/dist
COPY --from=base /app/packages/server/dist packages/server/dist
COPY --from=base /app/packages/client/dist packages/client/dist

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e 'fetch("http://localhost:"+(process.env.PORT||3000)+"/api/health").then(r=>{if(!r.ok)throw r.status}).catch(()=>process.exit(1))'

CMD ["node", "packages/server/dist/index.js"]
