FROM oven/bun:latest

WORKDIR /usr/src/app

COPY package*.json bun.lockb* ./

RUN bun install --frozen-lockfile

COPY . .

CMD ["sh", "-c", "bun run db:migration && bun run start"]
