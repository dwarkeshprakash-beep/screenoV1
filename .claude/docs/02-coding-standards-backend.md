# Coding Standards — Backend (NestJS + TypeScript)

> Read `00-coding-standards-common.md` first. This file covers backend-specific structure and rules. Goal: a **clean, layered architecture** — every request flows Controller → Service → Repository/Entity in one direction, each layer has one job, and nothing skips a layer.

---

## 1. Layered Architecture (keep it simple — three layers, not more)

```
Request
  → Controller   (HTTP concerns only: routes, param/body parsing via DTOs, calls one service method, returns response)
    → Service    (business logic: validation rules, orchestration, calls repositories, throws domain errors)
      → Repository / Entity (TypeORM — data access only, no business logic here)
        → PostgreSQL
```

**Rules that keep this clean:**
- **Controllers never talk to the database directly.** No `@InjectRepository` in a controller. A controller's only job is: receive the HTTP request, hand a validated DTO to the service, return what the service gives back (or throw the HTTP exception the service tells it to).
- **Services never touch `Request`/`Response` objects.** A service takes plain arguments (IDs, DTOs, a resolved "owner" object) and returns plain data or throws a domain-level exception (e.g. `NotFoundException`, a custom `InsufficientStockException`) — it doesn't know or care that it's being called from HTTP.
- **Business logic never lives in a controller or a TypeORM entity.** Entities describe data shape and relations only (see the project's DB schema doc for exact entity definitions) — no calculated business rules inside an entity method.
- **One service method does one thing.** If `CartService.addItem()` is doing stock checking, price snapshotting, *and* triggering an email, split it, or at minimum make the sub-steps clearly named private methods it calls in sequence — don't let one method become a 150-line wall.

```
backend/
  src/
    catalog/
      catalog.module.ts
      catalog.controller.ts       // HTTP layer only
      catalog.service.ts          // business logic
      entities/
        product.entity.ts         // data shape only
        category.entity.ts
      dto/
        product-query.dto.ts
    cart/
      cart.module.ts
      cart.controller.ts
      cart.service.ts
      entities/
      dto/
        add-cart-item.dto.ts
        update-cart-item.dto.ts
    search/
    design-board/
    wishlist/
    auth/
    common/                        # cross-cutting, used by multiple modules
      decorators/                  # e.g. CartOwner
      guards/                      # e.g. JwtAuthGuard
      filters/                     # global exception filter (Section 5)
      interceptors/
      constants/                   # per common coding-standards file Section 2
      pipes/
    database/
      data-source.ts
      migrations/
```

---

## 2. Modules

- One NestJS module per feature/domain (matches the folder structure above and the project's existing module layout).
- A module exports only what other modules genuinely need to import (its service, typically) — don't export everything by default.
- Circular dependencies between modules are a sign something's misplaced (shared logic should move to `common/`, not be imported cross-module) — resolve the actual coupling, don't paper over it with `forwardRef()` as a first response.

---

## 3. DTOs — the only way data enters or leaves a controller

- **Every** controller method that accepts a body/query/params defines an explicit DTO class with `class-validator` decorators. Never accept a raw untyped `@Body()` and pull fields off it manually.
- **Never use the TypeORM entity itself as the request DTO.** This prevents mass-assignment bugs (a client sending `{ price: 0.01 }` in a request that shouldn't be able to touch price) and keeps the API contract independent of the DB schema.
- Response shapes: use a plain response DTO/interface where the entity has fields that should never be exposed (e.g. don't return a full `User` entity with `passwordHash` — return a `UserResponseDto` without it).
- Enable global validation (`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`) in `main.ts` so unexpected fields are stripped/rejected automatically, not just validated.

```ts
// dto/add-cart-item.dto.ts
export class AddCartItemDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsNumber()
  @Min(MIN_FABRIC_CUT_INCREMENT_YARDS)
  quantity: number;
}

// ❌ Bad — controller trusts raw body shape
@Post('items')
addItem(@Body() body: any) {
  return this.cartService.addItem(body.productId, body.quantity);
}

// ✅ Good — DTO validated before the controller method body even runs
@Post('items')
addItem(@Body() dto: AddCartItemDto, @CartOwner() owner: CartOwnerContext) {
  return this.cartService.addItem(owner, dto.productId, dto.quantity);
}
```

---

## 4. Database Access Rules

- **Always through TypeORM's repository/query builder — never raw string-concatenated SQL.** Parameterized queries only (`.where('p.price >= :min', { min })`, not template-string interpolation into SQL).
- **Every schema change is a migration file** — never hand-edit the database, never use `synchronize: true` outside of a throwaway local sandbox. Migrations are committed to git and are the only source of truth for schema history.
- **snake_case in the database, camelCase in TypeScript** — mapped explicitly at the entity level (`@Column({ name: 'created_at' }) createdAt: Date`), per the common standards file. Never rely on automatic case conversion strategies that could silently mismatch.
- **N+1 queries are avoided** — use `relations: [...]` or explicit joins when a list of entities will need related data, don't loop and query per-item.
- Transactions (`queryRunner` or `DataSource.transaction()`) wrap any multi-step write that must succeed or fail atomically — the project's cart-merge-on-login logic is the canonical example: merge items, mark old cart converted, and this must not partially apply.

---

## 5. Error Handling & Response Shape

- Use NestJS's built-in HTTP exceptions (`NotFoundException`, `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `ConflictException`) from services — don't return raw error objects or `null`/`false` from a service and have the controller guess what happened.
- One **global exception filter** normalizes every error response into a consistent shape, so every consumer of the API can rely on it:

```ts
// common/filters/all-exceptions.filter.ts — normalized error envelope
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found",
  "timestamp": "2026-09-08T12:00:00.000Z",
  "path": "/products/does-not-exist"
}
```

- Unexpected/unhandled errors (bugs, DB connection failures) are caught by the same global filter, logged with full detail server-side, and returned to the client as a generic `500 Internal Server Error` with no internal detail leaked (no stack trace, no raw DB error message, no file paths).
- Custom domain exceptions (e.g. `InsufficientStockException`) extend NestJS's `HttpException` so they flow through the same filter and get a sensible status code, rather than inventing a parallel error-handling path.

---

## 6. Security (backend-specific, in addition to the common file)

- **Global middleware:** `helmet()` for security headers, CORS configured with an explicit allowed-origins whitelist (never `origin: '*'` once real domains are known), and rate limiting (e.g. `@nestjs/throttler`) on at least the public-facing endpoints most likely to be abused (auth, search, "notify me").
- **Auth guards** (`JwtAuthGuard`, role guards) are applied at the controller or method level explicitly — don't rely on "forgetting to call it" being safe by default; prefer marking things `@Public()` explicitly if a route is genuinely open, so the default posture is "protected unless stated otherwise."
- **Ownership checks, not just auth checks.** Being logged in isn't enough — `updateItem`/`removeItem`/etc. on a cart, wishlist, or design board must confirm the resolved owner (from the `CartOwner`-style decorator) actually matches the resource being modified, not just that *some* valid token was presented.
- **Passwords:** bcrypt/argon2 hashing in the `auth` module, never anywhere else, never logged, never returned in any response DTO.
- **No raw payment data.** When checkout/payments are eventually built, only a payment-processor token is ever persisted — see the common standards file and the project's schema reconciliation notes on this exact point.
- **Environment-based config** (`@nestjs/config`) for every secret and connection string — nothing hardcoded, nothing committed. A missing required env var should fail fast at startup with a clear error, not silently default to something insecure.

---

## 7. Constants & Configuration

- Magic numbers/strings follow the common standards file (Section 2) — a `common/constants/` folder, grouped by domain.
- Runtime-configurable business values (free shipping threshold, etc.) are read from the `site_config` database table per the project's schema, with the constant serving only as the fallback default if the config row is missing — not duplicated as a second hardcoded source of truth.
- Enum-like DB string columns (`status: 'active' | 'draft' | 'discontinued'`) are defined once as a TypeScript enum or const object in the relevant module and imported wherever checked or set — never re-typed as a string literal in multiple files.

---

## 8. Testing (basic level — not exhaustive coverage required)

- Services (business logic) get unit tests for their non-trivial methods, especially anything involving money, quantity, or ownership/security checks (cart pricing, merge-on-login, stock validation).
- Controllers can be covered lightly by e2e/integration tests hitting real routes against a test database — full unit-testing of controllers (which should be thin per Section 1) isn't a priority.
- Don't chase 100% coverage; do make sure the "checkpoint" behavior described for each phase in the project's build plan actually has at least one test proving it works, for anything touching money, auth, or data integrity.

---

## 9. Backend Checklist (in addition to the common checklist)

- [ ] Controller has no direct repository/DB access — goes through a service.
- [ ] Every endpoint has an explicit DTO with `class-validator` rules; no raw untyped `@Body()`/`@Query()`.
- [ ] No entity is used directly as a request or response DTO where it would expose or accept fields it shouldn't.
- [ ] All DB access goes through TypeORM's query builder/repositories — no string-concatenated SQL.
- [ ] Every schema change is a migration file, none hand-applied.
- [ ] Multi-step writes that must be atomic are wrapped in a transaction.
- [ ] New protected routes have an explicit guard; ownership is checked, not just authentication.
- [ ] Errors flow through the global exception filter; nothing leaks internal detail to the client.
- [ ] New secrets/config values are added via `@nestjs/config` + `.env.example`, never hardcoded.
