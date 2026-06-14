# crate-ms-polyglot

e-commerce microservices demo. Three backend services written in different languages, communicating over HTTP and Kafka, each with its own PostgreSQL database.

---

## Architecture

```
Browser
  │
  ├── :5173  →  Frontend (React / Nginx)
  │               │  (redirects here to sign in)
  │               ▼
  ├── :8081  →  Zitadel (identity provider — hosted login, issues OIDC JWTs)
  │
  └── :8080  →  API Gateway (Nginx)
                  │
                  ├── /users/*    →  user-service     (Python / FastAPI)   :8000
                  ├── /products/* →  product-service  (Java / Spring Boot) :8081
                  └── /orders/*   →  order-service    (Node.js / Express)  :3000

Every backend service independently verifies the bearer JWT against Zitadel's
JWKS (RS256, stateless — no shared secret, no per-request DB lookup for auth).

Kafka
  order-service  ──publishes──▶  order.placed     ──▶  product-service       (decrements stock)
                                                    └─▶  notification-service (sends confirmation email)
  order-service  ──publishes──▶  order.cancelled  ──▶  notification-service  (sends cancellation email)

Databases (one per service, PostgreSQL 17)
  user-db      ←→  user-service
  product-db   ←→  product-service
  order-db     ←→  order-service
```

---

## Services

### user-service — Python / FastAPI

Thin profile service. No longer owns credentials or issues tokens — Zitadel does. Verifies the bearer JWT against Zitadel's JWKS and lazily upserts a local profile row (keyed by the token's `sub`) on first sight of a new Zitadel user.

- **Database**: PostgreSQL via SQLAlchemy
- **Migrations**: Alembic (`alembic upgrade head` runs at startup)
- **Auth**: RS256 JWT verified via Zitadel JWKS (`ZITADEL_ISSUER`)

### product-service — Java / Spring Boot

Manages the product catalog and stock levels. Listens on the `order.placed` Kafka topic and decrements stock automatically when an order is placed.

- **Database**: PostgreSQL via Spring Data JPA
- **Migrations**: Flyway (`V1__init.sql` runs at startup, `ddl-auto=validate`)
- **Kafka**: Consumer on `order.placed` topic (group `product-service`)
- **Auth**: Spring Security OAuth2 resource server — browsing (`GET /products*`) is public, mutating endpoints require the `admin` role (Zitadel project role, asserted in the JWT)

### order-service — Node.js / Express / TypeScript

Creates and manages orders. Validates items against product-service, persists the order, then publishes an event to Kafka. Stock is decremented asynchronously — the HTTP response returns immediately without waiting for Kafka.

- **Database**: PostgreSQL via Prisma ORM
- **Migrations**: Prisma Migrate (`migrate deploy` runs at startup)
- **Kafka**: Producer on `order.placed` and `order.cancelled` topics
- **Auth**: RS256 JWT verified via Zitadel JWKS (`ZITADEL_ISSUER`) — `GET /orders/all` requires the `admin` role; other endpoints are scoped to the order's owner (or `admin`)

### notification-service — Node.js / Express / TypeScript

Standalone Kafka consumer. Doesn't talk to any other service or expose any API beyond `/health` — listens for order events and emails the customer.

- **Kafka**: Consumer on `order.placed` and `order.cancelled` topics (group `notification-service`)
- **Mail**: SMTP via Nodemailer. In dev, mail goes to [Maildev](https://github.com/maildev/maildev) — view sent emails at http://localhost:1080. Point `SMTP_HOST`/`SMTP_PORT` at a real SMTP provider for production.
- **No database, no auth** — fire-and-forget side effect of order events; failures are logged and don't affect the order flow

---

## Identity & Access (Zitadel)

Authentication and authorization are delegated entirely to [Zitadel](https://zitadel.com), a self-hosted OIDC identity provider running alongside the other services. Nobody in this codebase hashes a password or signs a JWT — the frontend redirects to Zitadel's hosted login UI (Authorization Code + PKCE), and every backend service independently verifies the resulting RS256 JWT against Zitadel's JWKS endpoint.

### One-time console setup

After the stack is up, Zitadel's console is at **http://localhost:8081**. The very first run prints initial admin credentials to the container logs — `docker compose logs zitadel | grep -i password`. Log in and:

1. **Create a Project** — e.g. `ecommerce`.
2. **Define project roles** — add `customer` and `admin` under the project's "Roles" tab, and enable **"Assert Roles on Authentication"** in the project settings so role keys land in issued tokens under the `urn:zitadel:iam:org:project:roles` claim.
3. **Create an Application** — type **User Agent (SPA)**, auth method **PKCE** (no client secret — it's a public client):
   - Redirect URI: `http://localhost:5173/callback`
   - Post-logout redirect URI: `http://localhost:5173/`
   - Copy the generated **Client ID** into `.env` as `ZITADEL_CLIENT_ID`, then rebuild the frontend (`docker compose up --build frontend`).
4. **Grant roles to your test user(s)** — under the project's "Authorizations", grant `admin` to whichever user should be able to manage the product catalog, and `customer` to everyone else.

### How it flows

```
1. User clicks "Sign in" → frontend redirects to Zitadel's hosted login (PKCE)
2. User authenticates with Zitadel → redirected back to /callback with an auth code
3. Frontend exchanges the code for tokens (access + ID token, RS256-signed)
4. Frontend attaches `Authorization: Bearer <access_token>` to API calls through the gateway
5. Each backend service fetches Zitadel's JWKS (cached), verifies the token's
   signature/issuer/audience locally, and reads `sub` / role claims — no calls
   back to Zitadel or to user-service for authorization decisions
```

### Gateway internal proxy routes

Two routes on the gateway exist only for backend-to-Zitadel traffic, not for browser use:

```
GET /oauth/v2/keys     JWKS proxy — backend services fetch signing keys here
GET /oidc/v1/userinfo  Userinfo proxy — user-service resolves email/name for
                       tokens that only carry `sub`
```

Both rewrite the `Host` header to `ZITADEL_EXTERNALDOMAIN:ZITADEL_EXTERNALPORT` (the token issuer), since the JDK's `HttpURLConnection` (product-service) and Python's httpx (user-service) need that to match for Zitadel to accept the request/validate the issuer.

---

## Frontend Routes

| Route             | Page            | Access            |
| ------------------ | --------------- | ----------------- |
| `/products`        | Browse products | Public            |
| `/cart`             | Cart / checkout | Signed in         |
| `/orders`           | Your orders     | Signed in         |
| `/profile`          | Profile & shipping address | Signed in |
| `/admin/products`   | Create/edit/delete products | `admin` role |
| `/admin/orders`     | View and update all orders  | `admin` role |

Admin routes are hidden from the nav and redirect to `/products` for users without the `admin` project role.

---

## Running Locally

### Prerequisites

- Docker + Docker Compose

### Setup

```bash
# 1. Create your local secrets file
cp .env.example .env
# Generate a real Zitadel masterkey (must be exactly 32 bytes):
#   openssl rand -base64 32
# Paste it over ZITADEL_MASTERKEY in .env. Edit other passwords if you like
# (defaults work for local dev).

# 2. Start everything
docker compose up --build
```

Services will start in dependency order. Kafka, databases and Zitadel start first, then the application services once they are healthy.

Zitadel needs its **one-time console setup** before login works end-to-end — see [Identity & Access](#identity--access-zitadel) above. Once you have a `ZITADEL_CLIENT_ID`, add it to `.env` and rebuild the frontend: `docker compose up --build frontend`.

### Accessing the application

| Interface             | URL                          |
| --------------------- | ---------------------------- |
| Frontend (React UI)   | http://localhost:5173        |
| API Gateway           | http://localhost:8080        |
| Gateway health check  | http://localhost:8080/health |
| Zitadel console/login | http://localhost:8081        |

---

## API Reference

All API calls go through the gateway at `http://localhost:8080`.

Sign-up and login no longer live here — they're handled by Zitadel's hosted UI (see [Identity & Access](#identity--access-zitadel)). Every example below needs a bearer token: sign in through the frontend at http://localhost:5173, then copy the `access_token` out of the browser's session storage (devtools → Application → Session Storage → key starting `oidc.user:`) for use with `curl`.

### Users

```
GET   /users/me           Get current user profile (auth required — lazily created on first call)
PATCH /users/me           Update current user profile (name, phone, shipping address)
GET   /users/:id          Get user by ID
GET   /users              List users (auth required)
```

### Products

```
GET    /products                List products (?category=&search=)               — public
GET    /products/:id            Get product by ID                                 — public
POST   /products                Create product (auth required, role: admin)
PUT    /products/:id            Update product (auth required, role: admin)
DELETE /products/:id            Delete product (auth required, role: admin)
```

**Create a product:**

```bash
curl -X POST http://localhost:8080/products \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"name":"Laptop","description":"Dev machine","price":999.99,"stock":50,"category":"Electronics"}'
```

### Orders

All order endpoints require authentication.

```
GET    /orders              List your orders
GET    /orders/all          List all orders                — admin only
GET    /orders/:id          Get order by ID
POST   /orders              Place an order
PATCH  /orders/:id/status   Update order status
DELETE /orders/:id          Cancel order (pending orders only)
```

**Place an order:**

```bash
curl -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"items":[{"product_id":1,"quantity":2}]}'
```

Valid statuses: `pending` → `confirmed` → `shipped` → `delivered` (or `cancelled`)

---

## End-to-End Quickstart

Sign in through the frontend (http://localhost:5173 → "Sign in" → Zitadel hosted login), then grab your `access_token` from session storage (devtools → Application → Session Storage → `oidc.user:...`) and export it:

```bash
TOKEN=eyJhbGciOiJSUzI1NiIs...   # paste access_token here (needs the `admin` role to create products)

# Create a product
PRODUCT=$(curl -s -X POST http://localhost:8080/products \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Keyboard","description":"Mechanical","price":79.99,"stock":20,"category":"Peripherals"}')
PRODUCT_ID=$(echo $PRODUCT | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Place an order (Kafka event fires async — stock decrements within seconds)
curl -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"items\":[{\"product_id\":$PRODUCT_ID,\"quantity\":3}]}"

# Check stock was decremented (wait ~2s for Kafka consumer)
curl http://localhost:8080/products/$PRODUCT_ID
```

---

## Event Flow

When an order is placed:

1. `order-service` validates items against `product-service` via HTTP
2. Order is persisted in `order-db` with status `pending`
3. HTTP 201 response is returned immediately
4. `order-service` publishes `order.placed` event to Kafka (fire-and-forget)
5. `product-service` Kafka consumer receives the event and decrements stock

This means the order response arrives before stock is updated — eventual consistency. If Kafka publish fails it is logged but does not affect the order response.

---

## Secrets

Secrets are loaded from a `.env` file in the project root. Docker Compose reads this automatically.

```
POSTGRES_USER_PASS     Password for user-db
POSTGRES_PRODUCT_PASS  Password for product-db
POSTGRES_ORDER_PASS    Password for order-db
POSTGRES_ZITADEL_PASS  Password for zitadel-db
ZITADEL_MASTERKEY      32-byte key Zitadel uses to encrypt data at rest (`openssl rand -base64 32`)
ZITADEL_CLIENT_ID      Client ID of the SPA app created in the Zitadel console (public client, no secret)
ZITADEL_ORG_ID         Org ID that owns the SPA client — pins login/registration to that org
ZITADEL_EXTERNALDOMAIN Hostname Zitadel issues tokens with as `iss` (default: localhost)
ZITADEL_EXTERNALPORT   Port Zitadel issues tokens with as `iss` (default: 8081)
```

Copy `.env.example` to `.env` to get started. The default values work for local development.

> **Production note:** replace `.env` with your platform's secret injection (Kubernetes Secrets, AWS Secrets Manager, Railway env vars, etc.).

---

## Database Migrations

Each service uses a dedicated migration tool — no `create_all`, no `ddl-auto=update`.

| Service         | Tool           | Where migrations live                              |
| --------------- | -------------- | -------------------------------------------------- |
| user-service    | Alembic        | `user-service/alembic/versions/`                   |
| product-service | Flyway         | `product-service/src/main/resources/db/migration/` |
| order-service   | Prisma Migrate | `order-service/prisma/migrations/`                 |

Migrations run automatically at container startup (`alembic upgrade head` / Flyway auto-run / `prisma migrate deploy`).

> **Production note:** migrations should run in a separate CI/CD job before deploying new containers, not inside the container startup command.

---

## Stack Summary

| Component        | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| API Gateway      | Nginx                                                         |
| Identity         | Zitadel (self-hosted OIDC — Authorization Code + PKCE)        |
| Frontend         | React + Vite (served by Nginx), `oidc-client-ts`              |
| user-service     | Python 3.11, FastAPI, SQLAlchemy, Alembic                     |
| product-service  | Java 21, Spring Boot 3, Spring Data JPA, Flyway, Spring Kafka |
| order-service    | Node.js 20, Express, TypeScript, Prisma ORM                   |
| notification-service | Node.js 20, Express, TypeScript, KafkaJS, Nodemailer      |
| Message broker   | Apache Kafka (KRaft mode)                                     |
| Mail catcher     | Maildev (dev SMTP)                                            |
| Databases        | PostgreSQL 17 (one instance per service)                      |
| Containerisation | Docker + Docker Compose                                       |
