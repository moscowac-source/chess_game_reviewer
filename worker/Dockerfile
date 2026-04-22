# Persistent worker image for the Chess Improver sync pipeline.
# Loads Stockfish NNUE 16 weights once at boot and keeps the engine warm
# across Inngest job invocations — fixes the cold-start 40MB-weights freeze
# that made the Vercel/serverless pipeline hang (issue #67).

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json package-lock.json ./
# The worker only needs a slice of the root dependency tree (inngest,
# stockfish, supabase, chess.js), but installing from the root lock-file keeps
# versions exactly in sync with the Next.js app that produces the events.
RUN npm ci --omit=dev --ignore-scripts

FROM base AS build
COPY package.json package-lock.json tsconfig.json ./
COPY --from=deps /app/node_modules ./node_modules
# Dev deps required to compile TS. Separate layer so the final image stays thin.
RUN npm ci --ignore-scripts
COPY lib ./lib
COPY types ./types
COPY worker ./worker
# tsc by itself leaves the `@/lib/...` path aliases in the emitted JS and
# Node's CJS resolver then blows up at boot with MODULE_NOT_FOUND (tsconfig
# `paths` is type-check-only). tsc-alias rewrites them into real relative
# paths so the worker can actually start.
RUN npx tsc --project worker/tsconfig.json \
  && npx tsc-alias --project worker/tsconfig.json

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/worker/dist ./worker/dist
COPY --from=build /app/lib ./lib
COPY --from=build /app/types ./types
COPY package.json ./

EXPOSE 3000
CMD ["node", "worker/dist/worker/src/index.js"]
