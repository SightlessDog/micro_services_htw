# ecom-ms-polyglot

Polyglot e-commerce microservices demo. Three backend services written in different languages, communicating over HTTP and Kafka, each with its own PostgreSQL database.

---

## Architecture

```
Browser
  │
  ├── :5173  →  Frontend (React / Nginx)
  │
  └── :8080  →  API Gateway (Nginx)
                  │
                  ├── /users/*    →  user-service     (Python / FastAPI)   :8000
                  ├── /products/* →  product-service  (Java / Spring Boot) :8081
                  └── /orders/*   →  order-service    (Node.js / Express)  :3000

Kafka
  order-service  ──publishes──▶  order.placed     ──▶  product-service (decrements stock)
  order-service  ──publishes──▶  order.cancelled  ──▶  (reserved for notifications service)

Databases (one per service, PostgreSQL 17)
  user-db      ←→  user-service
  product-db   ←→  product-service
  order-db     ←→  order-service
```

---

## Services

### user-service — Python / FastAPI

Handles user identity. Registers users, issues JWT tokens on login, and verifies tokens for authenticated routes.

- **Database**: PostgreSQL via SQLAlchemy
- **Migrations**: Alembic (`alembic upgrade head` runs at startup)
- **Auth**: JWT signed with `JWT_SECRET`

### product-service — Java / Spring Boot

Manages the product catalog and stock levels. Listens on the `order.placed` Kafka topic and decrements stock automatically when an order is placed.

- **Database**: PostgreSQL via Spring Data JPA
- **Migrations**: Flyway (`V1__init.sql` runs at startup, `ddl-auto=validate`)
- **Kafka**: Consumer on `order.placed` topic (group `product-service`)

### order-service — Node.js / Express

Creates and manages orders. Validates items against product-service, persists the order, then publishes an event to Kafka. Stock is decremented asynchronously — the HTTP response returns immediately without waiting for Kafka.

- **Database**: PostgreSQL via Prisma ORM
- **Migrations**: Prisma Migrate (`migrate deploy` runs at startup)
- **Kafka**: Producer on `order.placed` and `order.cancelled` topics

---

## Running Locally

### Prerequisites

- Docker + Docker Compose

### Setup

```bash
# 1. Create your local secrets file
cp .env.example .env
# Edit .env if you want to change passwords (defaults work for local dev)

# 2. Start everything
docker compose up --build
```

Services will start in dependency order. Kafka and databases start first, then the application services once they are healthy.

### Accessing the application

| Interface            | URL                          |
| -------------------- | ---------------------------- |
| Frontend (React UI)  | http://localhost:5173        |
| API Gateway          | http://localhost:8080        |
| Gateway health check | http://localhost:8080/health |

---

## API Reference

All API calls go through the gateway at `http://localhost:8080`.

### Users

```
POST /users/register      Register a new user
POST /users/login         Log in, receive JWT token
GET  /users/me            Get current user (auth required)
GET  /users/:id           Get user by ID
GET  /users               List users (auth required)
```

**Register:**

```bash
curl -X POST http://localhost:8080/users/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","full_name":"Alice","password":"secret123"}'
```

**Login:**

```bash
curl -X POST http://localhost:8080/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"secret123"}'
# Response includes access_token — use it as: Authorization: Bearer <token>
```

### Products

```
GET    /products                List products (?category=&search=)
GET    /products/:id            Get product by ID
POST   /products                Create product (auth required)
PUT    /products/:id            Update product (auth required)
DELETE /products/:id            Delete product (auth required)
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

```bash
# Register and capture token in one step
TOKEN=$(curl -s -X POST http://localhost:8080/users/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","full_name":"Alice","password":"secret123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

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
JWT_SECRET          Shared secret for signing and verifying JWTs across services
POSTGRES_USER_PASS  Password for user-db
POSTGRES_PRODUCT_PASS  Password for product-db
POSTGRES_ORDER_PASS Password for order-db
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
| Frontend         | React + Vite (served by Nginx)                                |
| user-service     | Python 3.11, FastAPI, SQLAlchemy, Alembic                     |
| product-service  | Java 21, Spring Boot 3, Spring Data JPA, Flyway, Spring Kafka |
| order-service    | Node.js 20, Express, Prisma ORM                               |
| Message broker   | Apache Kafka (KRaft mode)                                     |
| Databases        | PostgreSQL 17 (one instance per service)                      |
| Containerisation | Docker + Docker Compose                                       |
