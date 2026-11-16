FROM oven/bun:1.4 AS builder

WORKDIR /usr/src/app

COPY package.json bun.lock bunfig.toml ./
COPY server/src/common/ ./server/src/common/
COPY server/src/modules/ ./server/src/modules/

RUN bun install --frozen-lockfile --ignore-scripts

COPY bundler.ts tsconfig.json ./
COPY server/src/index.ts server/src/app.ts ./server/src/
COPY server/public/ ./server/public/

RUN bun run build

FROM oven/bun:1.4-slim AS runner

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist/ ./

ENV NODE_ENV=production

CMD ["sh", "-c", "bun run db:migration && exec bun run start"]
