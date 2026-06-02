FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --from=deps --chown=app:app /app/prisma ./prisma
COPY --chown=app:app src ./src
USER app
EXPOSE 3000
# In production, migrations run in a separate CI/CD step before deployment.
# For this demo, migrate deploy runs at startup using committed migration files.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node src/index.js"]
