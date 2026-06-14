# Product

## Register

product

## Users

Two audiences:
- **Shoppers/customers** browsing the catalog, adding to cart, placing and viewing orders.
- **Admins** (Zitadel `admin` role) managing the product catalog and viewing/managing all orders.

Secondary audience: anyone reviewing this as a course/portfolio project (HTW polyglot e-commerce microservices demo) — UI polish reflects engineering quality.

## Product Purpose

A polyglot e-commerce microservices demo: React/Vite storefront talking through an Nginx gateway to a Python (FastAPI) user-service, Java (Spring Boot) product-service, and Node/TS order-service, with Kafka events and Zitadel-hosted OIDC auth. The frontend covers storefront (products, cart, orders, profile) and an admin area (manage products, view all orders). Success = the UI feels like a deliberate, cohesive product, not a default scaffold, while staying fast to iterate on.

## Brand Personality

Terminal-native, precise, restrained. Think Linear: crisp dark surfaces, sharp typography, subtle motion, monospace used for technical/data moments (the `CRATE` wordmark, prices, codes) rather than decoration. Confident and quiet, not flashy.

## Anti-references

- Generic Bootstrap/Material admin dashboard templates (sidebar + cards + no point of view).
- Bright SaaS gradient hero/card look, gradient text, glassmorphism-as-default.
- Identical uniform card grids with icon+heading+text repeated everywhere.

## Design Principles

- **One accent, used deliberately**: `--accent` is reserved for price, primary CTA, active nav, focus rings — don't dilute by spreading color around (Restrained color strategy).
- **Monospace marks "data"**: prices, the wordmark, ids/codes use mono; everything else (labels, body, headings) stays sans.
- **Hierarchy via spacing and borders, not nested boxes**: avoid cards-inside-cards; use `border-border`, spacing rhythm, and `bg-elevated` for layering.
- **One system, two densities**: admin views reuse storefront components/tokens but denser (more rows/columns, tighter spacing) rather than a separate visual language.
- **Every state is intentional**: hover/focus/active must follow the existing border-lighten + bg-elevated pattern already used in Header/ProductsPage — never default browser states.

## Accessibility & Inclusion

Standard WCAG AA: sufficient contrast on the dark palette, visible focus states (existing `focus:ring-accent/15` pattern), full keyboard navigation. No special accommodations beyond AA required.
