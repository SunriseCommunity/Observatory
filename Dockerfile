FROM oven/bun:1.4

WORKDIR /usr/src/app

COPY package.json bun.lock bunfig.toml ./
COPY server/src/common/ ./server/src/common/
COPY server/src/modules/ ./server/src/modules/

RUN bun install --frozen-lockfile

COPY . .

CMD ["sh", "-c", "bun run db:migration && exec bun run start"]
