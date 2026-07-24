FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate && apk add --no-cache openssl
WORKDIR /app

FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY libs/engine/package.json ./libs/engine/
COPY libs/infrastructure/package.json ./libs/infrastructure/
COPY applications/web/package.json ./applications/web/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/libs/engine/node_modules ./libs/engine/node_modules
COPY --from=dependencies /app/libs/infrastructure/node_modules ./libs/infrastructure/node_modules
COPY --from=dependencies /app/applications/web/node_modules ./applications/web/node_modules
COPY . .
RUN pnpm db:generate && pnpm build

FROM base AS production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/applications/web/node_modules ./applications/web/node_modules
COPY --from=build /app/libs/engine/node_modules ./libs/engine/node_modules
COPY --from=build /app/libs/infrastructure/node_modules ./libs/infrastructure/node_modules
COPY --from=build /app/applications/web/build ./applications/web/build
COPY libs/engine/src ./libs/engine/src
COPY libs/infrastructure/src ./libs/infrastructure/src
COPY libs/infrastructure/prisma ./libs/infrastructure/prisma
COPY applications/web/package.json ./applications/web/
COPY libs/engine/package.json ./libs/engine/
COPY libs/infrastructure/package.json ./libs/infrastructure/
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

EXPOSE 3000
# Apply pending migrations before boot so the container is self-contained.
CMD ["sh", "-c", "pnpm db:deploy && cd applications/web && pnpm start"]
