# Coding Standards — Frontend (Next.js + TypeScript)

> Read `00-coding-standards-common.md` first. This file covers frontend-specific structure and rules. Goal: a **modular architecture** — features are self-contained, nothing is duplicated across pages, and each piece (data-fetching, UI, state) has one clear home.

---

## 1. Folder Structure (modular by feature, not just by file type)

```
frontend/
  app/                          # routes only — thin, no business logic
    category/[slug]/page.tsx
    product/[slug]/page.tsx
    cart/page.tsx
    wishlist/page.tsx
    design-board/page.tsx
    login/page.tsx
    register/page.tsx
    layout.tsx
  modules/                      # one folder per feature — this is the "modular" part
    catalog/
      components/               # ProductGrid, ProductCard, FacetSidebar, SortDropdown
      hooks/                    # useProducts, useProductFilters
      types.ts                  # Product, Category, Facet types (mirrors backend DTOs)
    search/
      components/               # SearchBar, SuggestionsDropdown
      hooks/                    # useSearchSuggestions, useDebouncedSearch
    cart/
      components/               # CartDrawer, CartLineItem, FreeShippingProgress
      hooks/                    # useCart (single source of cart state + mutations)
      types.ts
    wishlist/
    design-board/
    auth/
      components/               # LoginForm, RegisterForm
      hooks/                    # useAuth
  components/                    # truly shared, cross-feature UI only (Button, Input, Modal, Skeleton)
  lib/
    api-client.ts                # single fetch wrapper — see Section 3
    constants/                   # per Section 2 of the common standards file
    utils/                       # formatCurrency, debounce, etc. — pure functions only
  .env.local
```

**Rule of thumb:** if a component/hook/type is only used by one feature, it lives inside that feature's `modules/<feature>/` folder. It only moves to the shared top-level `components/`/`lib/` once a *second* feature genuinely needs it — don't pre-guess shared-ness.

---

## 2. Component Rules

- **One component, one responsibility.** A component that fetches data, manages complex state, *and* renders a large UI tree should be split: a thin page/container component that fetches (or a Server Component that already has the data) + smaller presentational components that just take props and render.
- **Server Components by default** for anything that doesn't need interactivity (listing pages, product detail, static sections). Add `"use client"` only where interaction is genuinely needed (search box, filters, cart drawer, design board canvas, forms) — don't blanket-mark whole pages as client components out of convenience.
- **Props are typed explicitly** — no untyped/`any` props. Define a `Props` interface per component, even for simple ones.
- **No inline business logic in JSX.** If a `.map()`/conditional is more than a couple of lines or reused, pull it into a named function above the component or into a hook.
- Components are named `PascalCase`, files are `kebab-case` matching the component (`product-card.tsx` exports `ProductCard`).

```tsx
// ❌ Bad — fetching, filtering logic, and rendering all mixed in one client component
"use client";
export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/products?status=active&limit=24`)
      .then(r => r.json()).then(setProducts);
  }, []);
  return <div>{products.filter(p => p.stockQty > 0).map(p => <div key={p.id}>{p.name} - ${p.price}</div>)}</div>;
}

// ✅ Good — Server Component fetches via the shared API client, presentational component renders
// app/category/[slug]/page.tsx
export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const products = await getProducts({ categorySlug: params.slug, status: 'active', limit: DEFAULT_PAGE_SIZE });
  return <ProductGrid products={products} />;
}

// modules/catalog/components/product-grid.tsx
interface ProductGridProps { products: Product[] }
export function ProductGrid({ products }: ProductGridProps) {
  return <div className="grid grid-cols-4 gap-4">{products.map(p => <ProductCard key={p.id} product={p} />)}</div>;
}
```

---

## 3. Data Fetching — one API client, never scattered `fetch()` calls

All backend calls go through a single wrapper in `lib/api-client.ts`. No component calls `fetch()` directly against a hardcoded or inline-built URL.

```ts
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include', // sends httpOnly cookies (auth + guest tokens)
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => null));
  }
  return res.json();
}

export const getProducts = (params: ProductQueryParams) => apiRequest<ProductListResponse>(`/products?${toQueryString(params)}`);
export const getProduct = (slug: string) => apiRequest<Product>(`/products/${slug}`);
// ...one exported function per endpoint, grouped by feature in modules/<feature>/api.ts if the list gets long
```

Reasons: one place to add auth headers/error handling/retries later, one place to see every endpoint the frontend actually calls, and it removes the duplication risk of five components each building a slightly different fetch call to the same endpoint.

---

## 4. State Management

- **Local component state** (`useState`) for anything that doesn't need to be shared — a dropdown's open/closed state, a form field.
- **URL state** (`useSearchParams`/`next/navigation`) for anything that defines *what the user is looking at* — filters, sort, page number, search query. This makes the view shareable/bookmarkable and is not optional for the catalog filtering feature (see project spec).
- **A feature-level hook** (`useCart`, `useAuth`, `useWishlist`) as the single source of truth for state that's shared across several components within a feature — the hook owns the fetch/mutate logic and every component consuming that feature's state goes through it, rather than each component fetching independently.
- **No global state library** (Redux/Zustand/etc.) unless a specific cross-cutting need actually appears — for this project's scope, feature-level hooks + URL state cover it. Don't add one preemptively.
- Optimistic UI updates (e.g. cart badge count) update local state immediately then reconcile with the server response — never let the client-computed total silently diverge from the server's as the permanent source of truth.

---

## 5. TypeScript Rules

- `strict: true` in `tsconfig.json`, don't weaken it.
- No `any`. If a type is genuinely unknown (e.g. a third-party library return value), use `unknown` and narrow it, or write a minimal explicit type — don't reach for `any` to make an error go away.
- Types that mirror a backend DTO/response shape are named the same as the backend concept (`Product`, `CartResponse`, `AddCartItemRequest`) so it's obvious which frontend type corresponds to which backend contract.
- Prefer `interface` for object shapes that might be extended (component props, entity-like shapes), `type` for unions/aliases.
- Enum-like string values (`status: 'active' | 'draft'`) are defined once as a union type or const object and imported, not retyped as inline string literals in multiple files.

---

## 6. Security (frontend-specific, in addition to the common file)

- **Never** put a secret, API key, or anything sensitive in a `NEXT_PUBLIC_*` env var — anything prefixed `NEXT_PUBLIC_` is shipped to the browser and is public. Only the API base URL and similarly non-sensitive values belong there.
- Auth/guest tokens are set as httpOnly cookies by the **backend** response, not read/written from frontend JS. The frontend never touches the raw token value.
- Any user-generated content rendered to the page (product reviews if added later, wishlist names, etc.) is escaped by default — React does this automatically for you as long as you don't use `dangerouslySetInnerHTML`. Avoid `dangerouslySetInnerHTML` entirely unless there's a specific, reviewed reason (e.g. rendering sanitized rich-text from a trusted admin CMS field), and if used, sanitize with a library (e.g. DOMPurify) first.
- All forms (login, register, "notify me", checkout later) validate input shape client-side for UX, but the actual security validation happens backend-side regardless — never assume a disabled submit button is a security control.

---

## 7. Styling & Accessibility (basic level)

- Use Tailwind utility classes (per the project's frontend-design conventions) consistently — don't mix in ad-hoc inline `style={{}}` unless truly one-off and dynamic (e.g. a computed drag position on the design board canvas).
- Every interactive element is a real `<button>`/`<a>`, not a `<div onClick>` — keeps keyboard/screen-reader accessibility basically intact without extra effort.
- Images use `next/image` with meaningful `alt` text (product name at minimum) — not decorative-only empty alt unless the image genuinely is decorative.
- Loading states (skeletons) and empty states (zero search results, empty cart, empty wishlist) are handled explicitly for every data-driven view — never leave a view that just renders nothing with no explanation.

---

## 8. Performance (basic level)

- Server Components + ISR (`revalidate`) for catalog pages as specified in the project architecture — don't turn these into client-side-only fetches.
- Debounce any input that triggers a network call as-you-type (search box, live filters) — see `SEARCH_DEBOUNCE_MS` constant.
- Don't fetch more than the page needs — respect pagination/`limit` params, don't fetch "all products" and filter client-side.
- Memoize (`useMemo`/`useCallback`) only where a component re-renders often *and* the computation/callback identity is provably expensive or causing child re-renders — don't sprinkle memoization everywhere by default, it adds noise for little benefit at this project's scale.

---

## 9. Frontend Checklist (in addition to the common checklist)

- [ ] New component placed in the correct `modules/<feature>/` folder, not dumped in the shared `components/` folder unless genuinely cross-feature.
- [ ] No component calls `fetch()` directly — goes through `lib/api-client.ts`.
- [ ] Filter/sort/search state lives in the URL, not only in component state.
- [ ] No `any` types; props are explicitly typed.
- [ ] No secrets in `NEXT_PUBLIC_*` variables.
- [ ] Loading and empty states handled for every data-driven view.
- [ ] Images use `next/image` with real `alt` text.
