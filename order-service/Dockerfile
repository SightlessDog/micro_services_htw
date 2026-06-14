FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl
COPY package*.json ./
COPY prisma ./prisma/

FROM base AS build
RUN npm ci && npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS prod-deps
RUN npm ci --omit=dev && npx prisma generate

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=prod-deps --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/dist ./dist
USER app
EXPOSE 3000
# In production, migrations run in a separate CI/CD step before deployment.
# For this demo, migrate deploy runs at startup using committed migration files.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]

# Dev target: full deps + tsx watch, source bind-mounted at runtime.
FROM base AS dev
RUN npm ci && npx prisma generate
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
