FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS build
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS prod-deps
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
USER app
EXPOSE 3001
CMD ["node", "dist/index.js"]

# Dev target: full deps + tsx watch, source bind-mounted at runtime.
FROM base AS dev
RUN npm ci
EXPOSE 3001
CMD ["npm", "run", "dev"]
