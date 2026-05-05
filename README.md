# Polyglot E-Commerce Microservices

Three-service e-commerce backend with a polyglot stack.

## Architecture

```
Client
  │
  ▼
NGINX Gateway :8080
  ├── /users/*    → user-service   (FastAPI / Python)  :8000
  ├── /products/* → product-service (Spring Boot / Java) :8081
  └── /orders/*  → order-service  (Express.js / Node)  :3000
```

## Services

| Service | Stack | Responsibility |
|---------|-------|----------------|
| user-service | FastAPI + SQLite | Register, login, JWT auth |
| product-service | Spring Boot + H2 | Product CRUD, stock management |
| order-service | Express.js + SQLite | Orders, inter-service calls |

## Run

```bash
docker compose up --build
```

## API Reference

### Users (FastAPI)

```
POST /users/register   { email, full_name, password }
POST /users/login      { email, password }
GET  /users/me         Authorization: Bearer <token>
GET  /users/:id
GET  /users            Authorization: Bearer <token>
```

### Products (Spring Boot)

```
GET    /products               ?category=&search=
GET    /products/:id
POST   /products               { name, description, price, stock, category }
PUT    /products/:id
DELETE /products/:id
PATCH  /products/:id/decrement-stock  { quantity }
```

### Orders (Express.js)

```
GET    /orders                 Authorization: Bearer <token>
GET    /orders/:id             Authorization: Bearer <token>
POST   /orders                 { items: [{ product_id, quantity }] }
PATCH  /orders/:id/status      { status: pending|confirmed|shipped|delivered|cancelled }
DELETE /orders/:id             (cancel — only pending orders)
```

## Quickstart

```bash
# 1. Register
curl -X POST http://localhost:8080/users/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","full_name":"Alice","password":"secret123"}'

# 2. Login and grab token
TOKEN=$(curl -s -X POST http://localhost:8080/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"secret123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 3. Browse products
curl http://localhost:8080/products

# 4. Place an order
curl -X POST http://localhost:8080/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"product_id":1,"quantity":2}]}'
```
