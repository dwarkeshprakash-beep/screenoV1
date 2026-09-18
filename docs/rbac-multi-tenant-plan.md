# RBAC / Multi-Tenant Access Control — Plan

**Status:** Proposed, not yet implemented. No migrations, tables, or code exist for this yet — the app currently runs on a single `users.role` string column and `requireRole()` middleware (see [Current state](#current-state)). This document is the agreed design to build against once open questions below are answered.

---

## Why

Today a user has exactly one role (`users.role`, a plain string) and every route is gated with `requireRole('manager')`-style exact matches (`backend/src/middleware/role.js`). That doesn't support:
- A user needing more than one role (e.g. someone who is both a Manager and a BDE).
- Per-company customization of what a role can do — every company is stuck with the same hardcoded role behavior.
- Fine-grained permissions (view vs. create vs. edit vs. delete) — today it's all-or-nothing per route.
- Controlling sidebar/module visibility from data instead of hardcoded route guards.

## Current state

```
users.role          single string column ('manager' | 'candidate' | 'admin' | 'bde' | ...)
users.company_id     tenancy already exists at the data level — all queries scope by company_id
requireRole(...roles)   middleware: exact string match against req.user.role, used per-route
```

This stays working during the migration — see [Migration strategy](#migration-strategy).

---

## Target model

Decisions locked in for this design:

| Entity | Scope | Why |
|---|---|---|
| **Modules** | Global — same catalog for every company | The sidebar structure is fixed product surface, not something tenants customize |
| **Roles** | Per-company | Each company defines its own role names/set |
| **ACLs** | Per-company | Each company defines its own permission buckets |
| **ACL permissions** | Per-action (`view` / `create` / `edit` / `delete` / `export`) | A role's grant on an ACL is a set of actions, not a single yes/no |

### Entities

**`modules`** — global, fixed, seeded once (like a static catalog, not managed by companies)
`id`, `name`, `path`, `icon`, `sort_order`

**`roles`** — per company
`id`, `company_id`, `name`, `description`, `created`

**`user_roles`** — many-to-many, a user can hold multiple roles
`id`, `user_id`, `role_id`

**`acls`** — per company; a named permission bucket tied to exactly one module
`id`, `company_id`, `module_id`, `name`, `description`, `created`
`module_id` is a strict 1:1 — each ACL gates exactly one module, and (enforced in the service layer, no FK constraints per project convention) a given module has at most one ACL per company via unique `(company_id, module_id)`.

**`role_acl_permissions`** — the actual grants: what a role can do on an ACL
`id`, `company_id`, `role_id`, `acl_id`, `permission`
`permission` ∈ `view | create | edit | delete | export`. One row per granted action (a role with full CRUD on an ACL has 4 rows, or `view` only has 1).

### Relationships

```
users ──< user_roles >── roles ──< role_acl_permissions >── acls ── (1:1 module_id) ── modules
  (many-to-many)              (role's actions on an ACL)
```

### Permission resolution

To answer "can User A do action `edit` on Module M?":

1. Look up A's roles via `user_roles` (all scoped to A's `company_id`).
2. Look up Module M's ACL for A's company: `acls` where `company_id = A's company` and `module_id = M`.
3. Check `role_acl_permissions` for any row matching (any of A's role ids, that `acl_id`, `permission = 'edit'`).
4. Allow if any such row exists; deny otherwise.

Sidebar visibility for Module M = user has *any* permission row (at minimum `view`) on M's ACL through any of their roles.

This resolution should live in a single service function (e.g. `permission.service.js` → `can(userId, moduleKey, action)`), never re-implemented per route.

---

## Migration strategy — gradual dual-run

Chosen over a hard cutover so existing routes keep working while the new system is built and adopted incrementally.

1. **Build alongside, don't replace.** Add the new tables (`roles`, `user_roles`, `acls`, `role_acl_permissions`) and the `permission.service.js` resolution logic. `users.role` and `requireRole()` keep working untouched.
2. **Backfill.** For each existing company, seed one `role` row per distinct `users.role` value currently in use (e.g. `manager`, `candidate`, `admin`, `bde`), and populate `user_roles` from the existing `users.role` column so every user has an equivalent role in the new system from day one.
3. **Introduce `requirePermission(moduleKey, action)`** as a new middleware, built on `permission.service.js`. New routes/features use this exclusively.
4. **Migrate existing routes module-by-module.** Swap `requireRole(...)` for `requirePermission(...)` one module at a time, verifying behavior matches before moving to the next. Both middlewares can coexist on different routes during this phase.
5. **Retire.** Once every route uses `requirePermission`, drop `requireRole()` and stop reading `users.role` for authorization (the column itself can stay for display/reporting or be dropped later — separate decision).

---

## Pilot module

Migrating "one module at a time" (per [Migration strategy](#migration-strategy) step 4), start with **Client Mandates** (`client_templates` / `client_teams` / `client_mandate_requirements`, routes under `/api/templates/client`):

- It's the exact example used to describe the ACL concept in the first place — validating the design against the module it was designed for.
- It already has real multi-role usage in production: Managers (full control) vs. BDEs (assigned to a mandate, restricted view) per the recent `assigned_bde_id` work — a genuine case for distinct `view`/`edit`/`create` grants per role, not just a single on/off switch.
- Actions map cleanly to the permission set: `create` (new mandate), `view` (BDE/manager read), `edit` (update mandate/requirements, assign BDE), `delete` (archive).
- It's not on the critical path of auth, login, or the live interview-taking flow — lowest blast radius if something is wrong in the first cutover.

Avoid starting with Team Management or the interview/exam flow — those are higher-traffic and more failure-sensitive; better to prove the pattern on Client Mandates first.

## Open questions (unresolved — need answers before schema/migrations are written)

1. **New company defaults.** Since roles and ACLs are per-company, a brand-new company starts with zero roles and zero grants, which locks out every user until someone configures it by hand. Do we seed a default template (e.g. clone a standard Manager/BDE/Candidate role set with sane ACL grants) automatically on company creation?
2. **Platform/super-admin scope.** Is there an operator role above all companies (Screeno's own team managing tenants/billing/impersonation) that by definition can't live inside one company's `roles` table? If yes, this needs a separate concept (e.g. a `platform_admin` flag on `users`, independent of the per-company RBAC) rather than being folded into this model.

## Non-goals (for this phase)

- No changes to module list/sidebar structure itself — modules are fixed; this plan only controls who can see/act on them.
- No UI work specified yet — this document covers data model + resolution logic only. Admin screens for managing Roles/ACLs/Module mappings are a follow-up once the schema is agreed.
