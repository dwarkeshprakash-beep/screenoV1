# Coding Standards — Common (applies to frontend AND backend)

> Read this file first, every time, before starting any feature — then read the frontend or backend file depending on what you're touching. These are basic-to-moderate standards: readable, consistent, secure by default. Nothing exotic.

---

## 1. Naming Conventions (project-wide rule)

| Layer | Convention | Example |
|---|---|---|
| Database (tables, columns) | `snake_case` | `product_id`, `created_at`, `cart_items` |
| Everything else (TypeScript variables, functions, object keys, JSON payloads, API request/response fields) | `camelCase` | `productId`, `createdAt`, `getCartTotal()` |
| Classes, interfaces, types, React components, NestJS providers/modules | `PascalCase` | `CartService`, `ProductCard`, `AddCartItemDto` |
| Constants (true fixed values, see Section 2) | `UPPER_SNAKE_CASE` | `MAX_CART_ITEM_QUANTITY`, `DEFAULT_PAGE_SIZE` |
| Files | `kebab-case`, matching the primary export | `cart.service.ts`, `product-card.tsx`, `add-cart-item.dto.ts` |
| Folders | `kebab-case` | `design-board/`, `product-images/` |
| Environment variables | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_SECRET` |

**The ORM boundary is where snake_case becomes camelCase.** Never let a `snake_case` field leak past the entity/repository layer into a service, controller, or frontend — map it explicitly at the entity (`@Column({ name: 'created_at' }) createdAt: Date`). Never let `camelCase` leak into raw SQL or migration files.

No abbreviations that aren't obvious (`qty` is fine, `qty` vs `q` is not; `req`/`res` in Express-style handlers is fine because it's idiomatic). Boolean names read as a yes/no question: `isActive`, `hasStock`, `canEdit` — not `active`, `stock`, `edit`.

---

## 2. Magic Numbers and Strings — always named constants

**Never** write a bare number or string literal that has meaning beyond its immediate line, anywhere in the codebase — frontend or backend. If you find yourself typing a number that isn't `0`, `1`, or `-1` used as a trivial loop/array operation, it needs a name.

```ts
// ❌ Bad — what is 100? what is 6? why 0.25?
if (subtotal >= 100) { ... }
const debounceMs = 250;
if (quantity % 0.25 !== 0) { ... }

// ✅ Good — one constants file, imported everywhere it's needed
// constants/commerce.constants.ts
export const FREE_SHIPPING_THRESHOLD_USD = 100;
export const SEARCH_DEBOUNCE_MS = 250;
export const MIN_FABRIC_CUT_INCREMENT_YARDS = 0.25;
```

Rules:
- One `constants/` folder per app (`frontend/lib/constants/`, `backend/src/common/constants/`), grouped by domain (`commerce.constants.ts`, `pagination.constants.ts`, `validation.constants.ts`) — not one giant catch-all file.
- Status/enum-like strings (`'active'`, `'draft'`, `'converted'`) become TypeScript enums or `as const` union types, never repeated string literals scattered across files.
- If a value genuinely lives in `site_config` (database-backed, admin-editable — e.g. the free shipping threshold per the project's DB schema), the constant is the **fallback/default only**; the real value is read from config at runtime. Don't hardcode it a second time somewhere else "just to be safe."
- Test files are allowed to inline small literal values (e.g. `expect(result).toBe(3)`) where the number is the thing being tested, not configuration.

---

## 3. DRY — No Duplicated Logic

If the same logic (a calculation, a validation rule, a formatting function, a query shape) appears in two places, it must be extracted before the second occurrence is written — not "later, if it shows up a third time."

- **Backend:** shared logic goes in a service method, a shared util in `common/utils/`, or a shared decorator/guard/pipe in `common/` — never copy-pasted between modules. If two modules need the same validation, extract a shared validator.
- **Frontend:** shared logic goes in a custom hook (`hooks/`), a util function (`lib/utils/`), or a shared component (`components/`) — never copy-pasted between pages/components. If two components render a similar card with minor variations, that's one component with props, not two components.
- **Types/interfaces** shared between frontend and backend (e.g. the shape of a `Product` API response) should be defined once and not hand-retyped differently on each side — at minimum keep them named identically and structurally identical; a shared types package is a nice-to-have, not required for this project's scope.
- Before writing a new function, search the codebase for something that already does approximately this. Reuse and extend over rewrite.

---

## 4. Security — Non-Negotiable Baseline

These apply everywhere, not just the backend:

1. **Never commit secrets.** No API keys, DB passwords, JWT secrets, or `.env` files in git. `.env`/`.env.local` are always in `.gitignore`. Commit a `.env.example` with placeholder values instead.
2. **Never trust client input.** Every value coming from the frontend, a query param, or a request body is validated and sanitized on the backend before use — regardless of whether the frontend also validates it. Frontend validation is for UX, backend validation is for security. Assume the API can be called directly, bypassing the UI entirely.
3. **Never build SQL/queries by string concatenation.** Always use the ORM's parameterized query builder (TypeORM query builder / repository methods) or parameterized raw queries. String-concatenated SQL is the single most common way to introduce SQL injection — it is never acceptable, even for "internal" or "admin-only" tooling.
4. **Never log sensitive data.** No passwords, tokens, full card numbers, or full session/cart tokens in `console.log`/logger output — mask or omit them. Log the *fact* of an event ("user login failed"), not the secret itself.
5. **Never store raw payment card data.** Use a tokenized payment processor (Stripe, Authorize.net, etc.) — store only the processor's customer/payment-method token, never a card number, CVV, or expiry. (This project's own legacy schema had this exact violation — do not repeat it.)
6. **Auth tokens live in httpOnly cookies**, not `localStorage` or `sessionStorage`, for both real user JWTs and guest-identity tokens (cart/wishlist/design-board). This applies to both frontend storage and backend cookie-setting code.
7. **Passwords are hashed** with bcrypt or argon2 (never MD5/SHA1, never stored in plain text), with an appropriate work factor/salt — never compare passwords with `===`.
8. **Rate-limit and validate at the edge.** Public endpoints likely to be abused (login, register, search, "notify me" forms) get rate limiting and basic input shape validation before any business logic runs.
9. **Principle of least privilege.** A DB user/connection string used by the app should only have the permissions the app actually needs. Admin-only endpoints are guarded by role checks server-side, not hidden by frontend routing alone.
10. **Dependencies are kept current.** Don't add a new npm package without a quick check that it's actively maintained; don't ignore `npm audit` high/critical findings.

---

## 5. Error Handling

- Never swallow an error silently (`catch {}` with nothing in it). At minimum log it; usually also return/throw a meaningful error to the caller.
- Errors returned to a client (frontend, or any external API consumer) never leak internals — no raw stack traces, no raw DB error messages, no file paths. Return a clean, consistent error shape (see backend standards for the exact envelope) and log the full detail server-side only.
- Distinguish expected errors (validation failure, not found, unauthorized — handled gracefully, proper HTTP status) from unexpected errors (bugs, crashes — logged loudly, generic 500 response to the client).

---

## 6. Comments & Documentation

- Code should be readable enough that most lines don't need a comment. Comment **why**, not **what** — `// snapshot price so a later price change doesn't retroactively affect this cart line` is useful; `// set price` is not.
- Every exported function/class in the backend that isn't trivially named gets a one-line JSDoc if its behavior isn't obvious from the name and signature alone. Don't over-document getters/setters/trivial DTOs.
- No commented-out dead code left in commits — delete it (git history has it if it's ever needed again).
- `TODO:` comments are acceptable but should say what's missing and ideally reference an issue/ticket, not just sit there indefinitely.

---

## 7. Git & Commit Hygiene

- Commit messages: short imperative summary line (`Add cart merge-on-login endpoint`, not `added stuff` or `fix`), body only if the "why" isn't obvious from the diff.
- One logical change per commit where reasonably possible — don't bundle an unrelated refactor into a feature commit.
- Don't commit commented-out code, `console.log` debugging leftovers, or `.env` files.
- Branch per feature/phase (matches the project's phase-wise build plan), merged via PR/review even if working solo — it's a natural checkpoint to re-read your own diff before it's permanent.

---

## 8. General Code Quality Checklist (run through this before considering a feature "done")

- [ ] No magic numbers/strings — all named constants (Section 2).
- [ ] No duplicated logic — extracted into a shared function/hook/service (Section 3).
- [ ] All naming follows Section 1's conventions consistently.
- [ ] All external input (body, query, params) is validated before use.
- [ ] No secrets, tokens, or passwords logged or committed.
- [ ] No raw/string-concatenated SQL anywhere.
- [ ] Errors are handled, not swallowed; nothing leaks internal details to the client.
- [ ] New environment variables are added to `.env.example` with a placeholder.
- [ ] TypeScript: no unnecessary `any` (see frontend/backend files for specifics).
