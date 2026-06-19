FROM node:20-alpine AS build
WORKDIR /app
# Build-time values are only used by `vite dev` / CI.
# In Docker the nginx entrypoint overwrites config.js at runtime.
ARG VITE_ZITADEL_ISSUER=http://localhost:8081
ARG VITE_ZITADEL_CLIENT_ID=placeholder
ARG VITE_ZITADEL_ORG_ID=
ENV VITE_ZITADEL_ISSUER=${VITE_ZITADEL_ISSUER}
ENV VITE_ZITADEL_CLIENT_ID=${VITE_ZITADEL_CLIENT_ID}
ENV VITE_ZITADEL_ORG_ID=${VITE_ZITADEL_ORG_ID}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY templates /etc/nginx/templates
COPY docker-entrypoint.d/40-inject-config.sh /docker-entrypoint.d/40-inject-config.sh
RUN chmod +x /docker-entrypoint.d/40-inject-config.sh
EXPOSE 80

# Dev target: Vite dev server with HMR, source bind-mounted at runtime.
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
