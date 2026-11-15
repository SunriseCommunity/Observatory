FROM oven/bun:latest

WORKDIR /usr/src/app

COPY package.json bun.lock bunfig.toml ./
COPY server/src/common/ ./server/src/common/
COPY server/src/modules/ ./server/src/modules/

RUN bun install --frozen-lockfile

COPY . .

CMD ["sh", "-c", "bun run db:migration && bun run start"]
