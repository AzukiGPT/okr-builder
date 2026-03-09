# Auth System Design — OKR Builder

**Date**: 2026-03-09
**Status**: Approved

## Objective

Add authentication, server-side persistence, and access control to the OKR Builder. Prepare the data model for future monetization (paywall) without implementing it now.

## Decisions

| Decision | Choice |
|----------|--------|
| Auth provider | Supabase (Auth + Postgres + RLS) |
| Auth method | Magic link (email) |
| Access model | Login required to use the app |
| Backend layer | Vercel Edge Functions (`/api/*`) |
| Paywall | Not now — `plan` field in profiles table for later |
| Persistence | Replace localStorage with Supabase Postgres |

## Architecture

```
React SPA (Vite) ──▶ Supabase Auth (magic link, JWT sessions)
       │
       ├─ reads ──▶ Supabase Postgres (via client + RLS)
       │
       └─ writes ─▶ Vercel Edge Functions (/api/*) ──▶ Supabase (service role)
```

- **Auth**: Front calls Supabase Auth directly for magic link sign-in
- **Reads**: Front reads own data via Supabase client (RLS enforced)
- **Writes**: Front calls Edge Functions which validate payloads and write via service role
- **RLS**: Row-level security ensures users only access their own data

## Database Schema

### Table: `profiles`

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  company     TEXT,
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own profile" ON profiles FOR ALL USING (auth.uid() = id);
```

Auto-created on signup via a DB trigger on `auth.users`.

### Table: `okr_sets`

```sql
CREATE TABLE okr_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Mon OKR Set',
  ctx             JSONB NOT NULL DEFAULT '{}',
  selected        JSONB NOT NULL DEFAULT '{}',
  funnel          JSONB NOT NULL DEFAULT '{}',
  custom_targets  JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE okr_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sets" ON okr_sets FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_okr_sets_user ON okr_sets(user_id) WHERE is_active = true;
```

State stored as JSONB (ctx, selected, funnel, custom_targets) — mirrors the existing client-side state shape with zero mapping.

## Edge Functions

### `/api/okr-sets.js`

| Method | Action | Auth |
|--------|--------|------|
| GET | List user's sets | JWT required |
| POST | Create new set | JWT required |
| PUT `?id=xxx` | Update a set | JWT + owner check |
| DELETE `?id=xxx` | Soft delete (is_active=false) | JWT + owner check |

### `/api/me.js`

| Method | Action |
|--------|--------|
| GET | Return user profile |
| PATCH | Update full_name, company |

### Shared helpers (`/api/_lib/`)

- `supabase-admin.js` — Supabase client with service_role key
- `auth.js` — JWT verification middleware
- `validate.js` — Payload shape validation

## Auth Flow

1. User opens app
2. `AuthGuard` checks Supabase session
3. No session → redirect to `LoginPage`
4. User enters email → "Send magic link"
5. Supabase sends email with login link
6. User clicks link → redirected to `/auth/callback`
7. `AuthCallback` exchanges code for JWT session
8. DB trigger creates profile if first login
9. Redirect to app → load user's OKR sets

## New Components

| Component | Purpose |
|-----------|---------|
| `LoginPage.jsx` | Email input + "Send magic link" button |
| `AuthCallback.jsx` | Handles `/auth/callback` redirect, exchanges code for session |
| `SetSelector.jsx` | Lists user's OKR sets, create new or continue existing |
| `AuthGuard.jsx` | Wraps app, redirects to login if no session |
| `AuthContext.jsx` | React Context providing user, session, signIn, signOut |

## Changes to Existing Components

### `App.jsx`
- Wrapped in `<AuthProvider>` and `<AuthGuard>`
- New pre-wizard step: `SetSelector` (if user has multiple sets)
- Auto-save debounced to Supabase (replaces localStorage)

### `Sidebar.jsx`
- User profile at bottom (email + logout link)
- Save indicator (Saved / Saving...)
- "My sets" link to return to set selector

### `OKRSystemStep.jsx`
- Optional "Save as new set" for duplication

## What Does NOT Change

- The 4-step wizard (Context → Select → Funnel → System)
- Excel/PDF/Notion export functionality
- URL sharing (LZ-String compression)
- Design system (colors, components, layout)
- Funnel calculations and scoring logic

## Environment Variables

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (server-side only, never exposed to client)
```
