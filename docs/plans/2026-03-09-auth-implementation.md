# Auth System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Supabase magic link authentication, server-side OKR set persistence via Vercel Edge Functions, and prepare for future monetization.

**Architecture:** React SPA (Vite) talks to Supabase Auth directly for magic link sign-in. Reads go through Supabase client with RLS. Writes go through Vercel Edge Functions (`/api/*`) that validate payloads and write via Supabase service role. Two Postgres tables: `profiles` and `okr_sets` with JSONB state columns.

**Tech Stack:** React 19, Vite 7, Supabase (Auth + Postgres + RLS), Vercel Edge Functions, @supabase/supabase-js

**Design doc:** `docs/plans/2026-03-09-auth-system-design.md`

---

## Phase 1 — Supabase Setup & Client Library

### Task 1: Create Supabase project and configure database

**Manual steps (user must do in Supabase dashboard):**

1. Go to https://supabase.com → create a new project (name: `okr-builder`)
2. Copy the **Project URL** and **anon public key** from Settings → API
3. Copy the **service_role key** (keep secret, never in client code)
4. Go to SQL Editor and run:

```sql
-- Table: profiles (auto-created on signup)
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
CREATE POLICY "Users see own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Table: okr_sets
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
CREATE POLICY "Users manage own sets" ON okr_sets
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_okr_sets_user ON okr_sets(user_id) WHERE is_active = true;

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

5. Go to Authentication → URL Configuration:
   - Set Site URL to `http://localhost:5173` (dev) and later `https://your-domain.vercel.app` (prod)
   - Add `http://localhost:5173/auth/callback` to Redirect URLs
   - Add `https://your-domain.vercel.app/auth/callback` to Redirect URLs

6. Go to Authentication → Email Templates → Magic Link:
   - Ensure the template sends users to `{{ .SiteURL }}/auth/callback?code={{ .Token }}&type=magiclink`

**Step 1: Verify SQL ran without errors in Supabase dashboard**

No code to write yet. Confirm the user has completed the setup.

**Step 2: Commit (no files changed — just a checkpoint)**

---

### Task 2: Install dependencies and configure environment

**Files:**
- Modify: `package.json` (add @supabase/supabase-js)
- Create: `.env.local` (local dev secrets)
- Create: `.env.example` (template for other devs)
- Modify: `.gitignore` (ensure .env.local is ignored)

**Step 1: Install Supabase client**

Run:
```bash
npm install @supabase/supabase-js
```

**Step 2: Create `.env.example`**

```env
# Supabase (get from https://supabase.com/dashboard → Settings → API)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Server-side only (Vercel env vars, NOT in client bundle)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Step 3: Create `.env.local` with real values**

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Step 4: Verify `.gitignore` includes `.env.local`**

Check `.gitignore` — Vite projects typically include `.env*.local`. If missing, add:
```
.env.local
.env.*.local
```

**Step 5: Commit**

```bash
git add .env.example .gitignore package.json package-lock.json
git commit -m "chore: install @supabase/supabase-js and add env config"
```

---

### Task 3: Create Supabase client singleton

**Files:**
- Create: `src/lib/supabase.js`

**Step 1: Write `src/lib/supabase.js`**

```javascript
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds (supabase client is tree-shakeable, won't error if unused yet)

**Step 3: Commit**

```bash
git add src/lib/supabase.js
git commit -m "feat: add Supabase client singleton"
```

---

## Phase 2 — Auth Context & Components

### Task 4: Create AuthContext provider

**Files:**
- Create: `src/contexts/AuthContext.jsx`

**Step 1: Write `src/contexts/AuthContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "../lib/supabase"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email) => {
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/contexts/AuthContext.jsx
git commit -m "feat: add AuthContext with magic link sign-in/out"
```

---

### Task 5: Create LoginPage component

**Files:**
- Create: `src/components/auth/LoginPage.jsx`

**Step 1: Write `src/components/auth/LoginPage.jsx`**

```jsx
import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Button } from "@/components/ui/button"

const STATUS = { idle: "idle", sending: "sending", sent: "sent", error: "error" }

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState(STATUS.idle)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus(STATUS.sending)
    setErrorMsg("")

    try {
      await signIn(email.trim())
      setStatus(STATUS.sent)
    } catch (err) {
      setErrorMsg(err.message || "Failed to send magic link")
      setStatus(STATUS.error)
    }
  }

  if (status === STATUS.sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">✉️</div>
          <h1 className="font-sans font-bold text-2xl text-foreground">Check your inbox</h1>
          <p className="text-muted-foreground text-sm">
            We sent a login link to <span className="font-semibold text-foreground">{email}</span>.
            Click the link in the email to sign in.
          </p>
          <button
            type="button"
            onClick={() => setStatus(STATUS.idle)}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-sans font-bold text-3xl gradient-heading">OKR Builder</h1>
          <p className="text-muted-foreground text-sm">
            Build data-driven OKRs for your B2B SaaS team
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {status === STATUS.error && (
            <p className="text-sm text-red-500">{errorMsg}</p>
          )}

          <Button
            type="submit"
            disabled={status === STATUS.sending || !email.trim()}
            className="w-full"
          >
            {status === STATUS.sending ? "Sending..." : "Send magic link"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          No password needed. We'll email you a secure login link.
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/auth/LoginPage.jsx
git commit -m "feat: add LoginPage with magic link form"
```

---

### Task 6: Create AuthCallback component

**Files:**
- Create: `src/components/auth/AuthCallback.jsx`

This component handles the redirect from the magic link email. Supabase encodes the auth token in the URL hash fragment. The Supabase client's `onAuthStateChange` listener (in AuthContext) picks it up automatically.

**Step 1: Write `src/components/auth/AuthCallback.jsx`**

```jsx
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function AuthCallback({ onComplete }) {
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error: err }) => {
          if (err) {
            setError(err.message)
          } else {
            window.history.replaceState({}, "", window.location.pathname)
            onComplete()
          }
        })
    } else {
      // Hash-based flow (fallback): Supabase client handles it automatically
      // via onAuthStateChange in AuthContext. Just wait.
      const timeout = setTimeout(() => onComplete(), 2000)
      return () => clearTimeout(timeout)
    }
  }, [onComplete])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-semibold">Authentication failed</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => window.location.replace("/")}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  )
}
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/auth/AuthCallback.jsx
git commit -m "feat: add AuthCallback for magic link redirect"
```

---

### Task 7: Create AuthGuard wrapper

**Files:**
- Create: `src/components/auth/AuthGuard.jsx`

**Step 1: Write `src/components/auth/AuthGuard.jsx`**

```jsx
import { useAuth } from "../../contexts/AuthContext"
import LoginPage from "./LoginPage"

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  return children
}
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/auth/AuthGuard.jsx
git commit -m "feat: add AuthGuard component"
```

---

## Phase 3 — Wire Auth Into the App

### Task 8: Integrate auth into main.jsx and App.jsx

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`

The app currently renders `<App />` directly. We need to:
1. Wrap in `<AuthProvider>`
2. Handle the `/auth/callback` route
3. Wrap the wizard in `<AuthGuard>`

Since this is a single-page app with no router, we use a simple URL path check.

**Step 1: Modify `src/main.jsx`**

Replace contents with:

```jsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { AuthProvider } from "./contexts/AuthContext"
import AppRouter from "./AppRouter"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>,
)
```

**Step 2: Create `src/AppRouter.jsx`**

This is a minimal path-based router (no library needed):

```jsx
import { useState, useEffect, useCallback } from "react"
import AuthCallback from "./components/auth/AuthCallback"
import AuthGuard from "./components/auth/AuthGuard"
import App from "./App"

export default function AppRouter() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const handleAuthComplete = useCallback(() => {
    window.history.replaceState({}, "", "/")
    setPath("/")
  }, [])

  if (path === "/auth/callback") {
    return <AuthCallback onComplete={handleAuthComplete} />
  }

  return (
    <AuthGuard>
      <App />
    </AuthGuard>
  )
}
```

**Step 3: Verify build passes**

Run: `npm run build`

**Step 4: Test locally**

Run: `npm run dev`

Expected behavior:
- Opening `http://localhost:5173` shows the LoginPage (no session yet)
- The wizard is hidden behind AuthGuard
- `/auth/callback` renders the AuthCallback spinner

**Step 5: Commit**

```bash
git add src/main.jsx src/AppRouter.jsx
git commit -m "feat: wire auth into app entry point with simple router"
```

---

## Phase 4 — Edge Functions (API Routes)

### Task 9: Create API helper modules

**Files:**
- Create: `api/_lib/supabase-admin.js`
- Create: `api/_lib/auth.js`
- Create: `api/_lib/cors.js`

Vercel Edge Functions live in the `/api` directory at project root. Files in `_lib` are helpers (not deployed as endpoints).

**Step 1: Create `api/_lib/supabase-admin.js`**

```javascript
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
```

**Step 2: Create `api/_lib/auth.js`**

```javascript
import { supabaseAdmin } from "./supabase-admin.js"

export async function getUser(req) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) return null
  return user
}
```

**Step 3: Create `api/_lib/cors.js`**

```javascript
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
]

export function corsHeaders(req) {
  const origin = req.headers.get("origin") || ""
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

export function handleCors(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  return null
}
```

**Step 4: Commit**

```bash
git add api/_lib/
git commit -m "feat: add API helper modules (supabase-admin, auth, cors)"
```

---

### Task 10: Create `/api/okr-sets` Edge Function

**Files:**
- Create: `api/okr-sets.js`

**Step 1: Write `api/okr-sets.js`**

```javascript
import { supabaseAdmin } from "./_lib/supabase-admin.js"
import { getUser } from "./_lib/auth.js"
import { corsHeaders, handleCors } from "./_lib/cors.js"

export const config = { runtime: "edge" }

function json(data, status = 200, req) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  })
}

async function handleGet(req, user) {
  const { data, error } = await supabaseAdmin
    .from("okr_sets")
    .select("id, name, ctx, selected, funnel, custom_targets, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })

  if (error) return json({ error: error.message }, 500, req)
  return json({ data }, 200, req)
}

async function handlePost(req, user) {
  const body = await req.json()
  const { name, ctx, selected, funnel, custom_targets } = body

  const { data, error } = await supabaseAdmin
    .from("okr_sets")
    .insert({
      user_id: user.id,
      name: name || "Mon OKR Set",
      ctx: ctx || {},
      selected: selected || {},
      funnel: funnel || {},
      custom_targets: custom_targets || {},
    })
    .select("id, name, created_at, updated_at")
    .single()

  if (error) return json({ error: error.message }, 500, req)
  return json({ data }, 201, req)
}

async function handlePut(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  const body = await req.json()
  const { name, ctx, selected, funnel, custom_targets } = body

  const updates = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (ctx !== undefined) updates.ctx = ctx
  if (selected !== undefined) updates.selected = selected
  if (funnel !== undefined) updates.funnel = funnel
  if (custom_targets !== undefined) updates.custom_targets = custom_targets

  const { data, error } = await supabaseAdmin
    .from("okr_sets")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, updated_at")
    .single()

  if (error) return json({ error: error.message }, 500, req)
  if (!data) return json({ error: "Not found" }, 404, req)
  return json({ data }, 200, req)
}

async function handleDelete(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  const { error } = await supabaseAdmin
    .from("okr_sets")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return json({ error: error.message }, 500, req)
  return json({ success: true }, 200, req)
}

export default async function handler(req) {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const user = await getUser(req)
  if (!user) return json({ error: "Unauthorized" }, 401, req)

  switch (req.method) {
    case "GET": return handleGet(req, user)
    case "POST": return handlePost(req, user)
    case "PUT": return handlePut(req, user)
    case "DELETE": return handleDelete(req, user)
    default: return json({ error: "Method not allowed" }, 405, req)
  }
}
```

**Step 2: Commit**

```bash
git add api/okr-sets.js
git commit -m "feat: add /api/okr-sets Edge Function (CRUD)"
```

---

### Task 11: Create `/api/me` Edge Function

**Files:**
- Create: `api/me.js`

**Step 1: Write `api/me.js`**

```javascript
import { supabaseAdmin } from "./_lib/supabase-admin.js"
import { getUser } from "./_lib/auth.js"
import { corsHeaders, handleCors } from "./_lib/cors.js"

export const config = { runtime: "edge" }

function json(data, status = 200, req) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  })
}

export default async function handler(req) {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const user = await getUser(req)
  if (!user) return json({ error: "Unauthorized" }, 401, req)

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, company, plan, created_at")
      .eq("id", user.id)
      .single()

    if (error) return json({ error: error.message }, 500, req)
    return json({ data }, 200, req)
  }

  if (req.method === "PATCH") {
    const body = await req.json()
    const updates = { updated_at: new Date().toISOString() }
    if (body.full_name !== undefined) updates.full_name = body.full_name
    if (body.company !== undefined) updates.company = body.company

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("id, email, full_name, company, plan")
      .single()

    if (error) return json({ error: error.message }, 500, req)
    return json({ data }, 200, req)
  }

  return json({ error: "Method not allowed" }, 405, req)
}
```

**Step 2: Commit**

```bash
git add api/me.js
git commit -m "feat: add /api/me Edge Function (profile GET/PATCH)"
```

---

## Phase 5 — API Client & Persistence Hook

### Task 12: Create API client for the front-end

**Files:**
- Create: `src/lib/api.js`

This module wraps `fetch` calls to the Edge Functions with the Supabase JWT token.

**Step 1: Write `src/lib/api.js`**

```javascript
import { supabase } from "./supabase"

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error("Not authenticated")
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
  }
}

async function apiFetch(path, options = {}) {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api${path}`, { ...options, headers })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `API error ${res.status}`)
  return body
}

export const api = {
  listSets: () => apiFetch("/okr-sets"),
  createSet: (payload) => apiFetch("/okr-sets", { method: "POST", body: JSON.stringify(payload) }),
  updateSet: (id, payload) => apiFetch(`/okr-sets?id=${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSet: (id) => apiFetch(`/okr-sets?id=${id}`, { method: "DELETE" }),
  getProfile: () => apiFetch("/me"),
  updateProfile: (payload) => apiFetch("/me", { method: "PATCH", body: JSON.stringify(payload) }),
}
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add API client with JWT auth headers"
```

---

### Task 13: Create useCloudSync hook (replaces localStorage)

**Files:**
- Create: `src/hooks/useCloudSync.js`

This hook auto-saves state to the API (debounced), replacing the current localStorage persistence in `useOKRState.js`.

**Step 1: Write `src/hooks/useCloudSync.js`**

```javascript
import { useEffect, useRef, useState, useCallback } from "react"
import { api } from "../lib/api"

export function useCloudSync(state, dispatch) {
  const [activeSetId, setActiveSetId] = useState(null)
  const [saveStatus, setSaveStatus] = useState("idle") // idle | saving | saved | error
  const [sets, setSets] = useState([])
  const timerRef = useRef(null)
  const lastSavedRef = useRef(null)

  // Load list of sets
  const loadSets = useCallback(async () => {
    try {
      const { data } = await api.listSets()
      setSets(data)
      return data
    } catch {
      setSets([])
      return []
    }
  }, [])

  // Load a specific set into the reducer
  const loadSet = useCallback((set) => {
    setActiveSetId(set.id)
    dispatch({
      type: "LOAD",
      payload: {
        ctx: set.ctx,
        selected: set.selected,
        funnel: set.funnel,
        customTargets: set.custom_targets,
        step: 0,
      },
    })
    lastSavedRef.current = JSON.stringify({
      ctx: set.ctx,
      selected: set.selected,
      funnel: set.funnel,
      custom_targets: set.custom_targets,
    })
  }, [dispatch])

  // Create a new set
  const createSet = useCallback(async (name) => {
    const payload = {
      name: name || state.ctx.company || "Mon OKR Set",
      ctx: state.ctx,
      selected: state.selected,
      funnel: state.funnel,
      custom_targets: state.customTargets,
    }
    const { data } = await api.createSet(payload)
    setActiveSetId(data.id)
    lastSavedRef.current = JSON.stringify({
      ctx: state.ctx,
      selected: state.selected,
      funnel: state.funnel,
      custom_targets: state.customTargets,
    })
    setSaveStatus("saved")
    await loadSets()
    return data
  }, [state, loadSets])

  // Auto-save debounced (only if we have an active set)
  useEffect(() => {
    if (!activeSetId) return

    const currentPayload = JSON.stringify({
      ctx: state.ctx,
      selected: state.selected,
      funnel: state.funnel,
      custom_targets: state.customTargets,
    })

    // Skip if nothing changed
    if (currentPayload === lastSavedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setSaveStatus("saving")
      try {
        await api.updateSet(activeSetId, {
          name: state.ctx.company || "Mon OKR Set",
          ctx: state.ctx,
          selected: state.selected,
          funnel: state.funnel,
          custom_targets: state.customTargets,
        })
        lastSavedRef.current = currentPayload
        setSaveStatus("saved")
      } catch {
        setSaveStatus("error")
      }
    }, 1500)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [activeSetId, state.ctx, state.selected, state.funnel, state.customTargets])

  return {
    activeSetId,
    saveStatus,
    sets,
    loadSets,
    loadSet,
    createSet,
    setActiveSetId,
  }
}
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/hooks/useCloudSync.js
git commit -m "feat: add useCloudSync hook for server-side auto-save"
```

---

## Phase 6 — Set Selector & UI Integration

### Task 14: Create SetSelector page

**Files:**
- Create: `src/components/auth/SetSelector.jsx`

This page shows when the user is logged in but hasn't selected which OKR set to work on.

**Step 1: Write `src/components/auth/SetSelector.jsx`**

```jsx
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "../../contexts/AuthContext"

export default function SetSelector({ sets, onLoadSet, onCreateNew, loading }) {
  const { user, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sans font-bold text-3xl gradient-heading">OKR Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-bold text-lg text-foreground">Your OKR sets</h2>
            <Button onClick={onCreateNew}>+ New set</Button>
          </div>

          {sets.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center glass-card">
              <p className="text-muted-foreground mb-4">
                No OKR sets yet. Create your first one to get started.
              </p>
              <Button onClick={onCreateNew}>Create my first OKR set</Button>
            </div>
          )}

          <div className="space-y-3">
            {sets.map((set) => {
              const objCount = (set.selected?.sales?.length || 0)
                + (set.selected?.marketing?.length || 0)
                + (set.selected?.csm?.length || 0)

              return (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => onLoadSet(set)}
                  className="w-full text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all cursor-pointer glass-card"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {set.name || "Untitled"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {objCount} objective{objCount !== 1 ? "s" : ""}
                        {set.ctx?.stage && ` \u00b7 ${set.ctx.stage}`}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(set.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/auth/SetSelector.jsx
git commit -m "feat: add SetSelector page to list and pick OKR sets"
```

---

### Task 15: Integrate cloud sync and set selector into App.jsx

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/hooks/useOKRState.js`

This is the main integration task. We need to:
1. Remove localStorage auto-save from `useOKRState.js`
2. Add `useCloudSync` to `App.jsx`
3. Show `SetSelector` before the wizard when no set is active
4. Keep localStorage as a fallback for the URL share feature

**Step 1: Modify `src/hooks/useOKRState.js`**

Remove the localStorage auto-save effect. Keep the `loadState()` call only for the initial URL share flow (which happens before auth). The hook should be pure state management.

Replace the entire file with:

```javascript
import { useReducer, useCallback } from "react"

const INITIAL_STATE = {
  step: 0,
  maxStep: 0,
  ctx: {
    company: "",
    arr: "",
    stage: "",
    bottleneck: "",
    winRate: "",
    churn: "",
    founderLed: "",
  },
  selected: { sales: [], marketing: [], csm: [] },
  funnel: {
    target: 3000000,
    acv: 100000,
    winRate: 25,
    demoToProp: 50,
    meetToDemo: 40,
    callToMeet: 10,
    mktShare: 40,
    l2mql: 30,
  },
  customTargets: {},
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_STEP":
      return {
        ...state,
        step: action.payload,
        maxStep: Math.max(state.maxStep, action.payload),
      }
    case "SET_CTX":
      return { ...state, ctx: { ...state.ctx, [action.key]: action.value } }
    case "TOGGLE_OBJECTIVE": {
      const { team, id } = action.payload
      const cur = state.selected[team]
      const next = cur.includes(id)
        ? cur.filter(x => x !== id)
        : cur.length >= 5
          ? cur
          : [...cur, id]
      return { ...state, selected: { ...state.selected, [team]: next } }
    }
    case "SET_FUNNEL":
      return { ...state, funnel: { ...state.funnel, [action.key]: action.value } }
    case "SET_CUSTOM_TARGET":
      return { ...state, customTargets: { ...state.customTargets, [action.krId]: action.value } }
    case "SYNC_CTX_TO_FUNNEL":
      return { ...state, funnel: { ...state.funnel, ...action.payload } }
    case "RESET":
      return { ...INITIAL_STATE }
    case "LOAD":
      return { ...INITIAL_STATE, ...action.payload }
    default:
      return state
  }
}

export function useOKRState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const setStep = useCallback((s) => dispatch({ type: "SET_STEP", payload: s }), [])
  const setCtx = useCallback((key, value) => dispatch({ type: "SET_CTX", key, value }), [])
  const toggleObjective = useCallback((team, id) => dispatch({ type: "TOGGLE_OBJECTIVE", payload: { team, id } }), [])
  const setFunnel = useCallback((key, value) => dispatch({ type: "SET_FUNNEL", key, value }), [])
  const setCustomTarget = useCallback((krId, value) => dispatch({ type: "SET_CUSTOM_TARGET", krId, value }), [])
  const syncCtxToFunnel = useCallback((updates) => dispatch({ type: "SYNC_CTX_TO_FUNNEL", payload: updates }), [])
  const reset = useCallback(() => dispatch({ type: "RESET" }), [])

  return { state, dispatch, setStep, setCtx, toggleObjective, setFunnel, setCustomTarget, syncCtxToFunnel, reset }
}
```

**Step 2: Modify `src/App.jsx`**

Replace the entire file with:

```jsx
import { useState, useCallback, useEffect } from "react"
import { parseContextValue } from "./utils/parseContextValue"
import { useOKRState } from "./hooks/useOKRState"
import { useFunnelCalc } from "./hooks/useFunnelCalc"
import { useCloudSync } from "./hooks/useCloudSync"
import { generatePDF } from "./utils/exportPDF"
import { generateExcel } from "./utils/exportExcel"
import { copyNotionMarkdown } from "./utils/exportNotion"
import { useShareableURL } from "./hooks/useShareableURL"
import AppShell from "./components/layout/AppShell"
import ContextStep from "./components/steps/ContextStep"
import SelectionStep from "./components/steps/SelectionStep"
import FunnelStep from "./components/steps/FunnelStep"
import OKRSystemStep from "./components/steps/OKRSystemStep"
import SetSelector from "./components/auth/SetSelector"

export default function App() {
  const {
    state, dispatch, setStep, setCtx, toggleObjective,
    setFunnel, setCustomTarget, syncCtxToFunnel, reset
  } = useOKRState()
  const calc = useFunnelCalc(state.funnel)
  const { share, shared } = useShareableURL(state, dispatch)
  const [notionCopied, setNotionCopied] = useState(false)

  const {
    activeSetId, saveStatus, sets,
    loadSets, loadSet, createSet, setActiveSetId,
  } = useCloudSync(state, dispatch)

  const [setsLoading, setSetsLoading] = useState(true)

  // Load sets on mount
  useEffect(() => {
    loadSets().then(() => setSetsLoading(false))
  }, [loadSets])

  const handleContextNext = useCallback(() => {
    const parsedWinRate = parseContextValue(state.ctx.winRate)
    if (parsedWinRate != null && parsedWinRate > 0 && parsedWinRate <= 100) {
      syncCtxToFunnel({ winRate: parsedWinRate })
    }
    setStep(1)
  }, [state.ctx.winRate, syncCtxToFunnel, setStep])

  const handleCopyNotion = useCallback(async () => {
    await copyNotionMarkdown({
      ctx: state.ctx,
      selected: state.selected,
      calc,
      customTargets: state.customTargets,
    })
    setNotionCopied(true)
    setTimeout(() => setNotionCopied(false), 2000)
  }, [state.ctx, state.selected, calc, state.customTargets])

  const handleCreateNew = useCallback(async () => {
    reset()
    const newSet = await createSet("Mon OKR Set")
    setActiveSetId(newSet.id)
  }, [reset, createSet, setActiveSetId])

  const handleBackToSets = useCallback(() => {
    setActiveSetId(null)
    reset()
    loadSets()
  }, [setActiveSetId, reset, loadSets])

  // Show set selector if no active set (and not loading a shared URL)
  if (!activeSetId) {
    return (
      <SetSelector
        sets={sets}
        loading={setsLoading}
        onLoadSet={loadSet}
        onCreateNew={handleCreateNew}
      />
    )
  }

  return (
    <AppShell
      step={state.step}
      maxStep={state.maxStep}
      setStep={setStep}
      ctx={state.ctx}
      selected={state.selected}
      onReset={() => { reset(); setStep(0) }}
      onShare={share}
      shared={shared}
      saveStatus={saveStatus}
      onBackToSets={handleBackToSets}
    >
      {state.step === 0 && (
        <ContextStep
          ctx={state.ctx}
          setCtx={setCtx}
          onNext={handleContextNext}
        />
      )}
      {state.step === 1 && (
        <SelectionStep
          ctx={state.ctx}
          selected={state.selected}
          toggleObjective={toggleObjective}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {state.step === 2 && (
        <FunnelStep
          funnel={state.funnel}
          setFunnel={setFunnel}
          calc={calc}
          ctxArr={state.ctx.arr}
          ctxWinRate={state.ctx.winRate}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {state.step === 3 && (
        <OKRSystemStep
          ctx={state.ctx}
          selected={state.selected}
          funnel={state.funnel}
          calc={calc}
          customTargets={state.customTargets}
          setCustomTarget={setCustomTarget}
          onBack={() => setStep(2)}
          onReset={() => { reset(); setStep(0) }}
          onExportPDF={() => generatePDF({
            ctx: state.ctx,
            selected: state.selected,
            calc,
            customTargets: state.customTargets,
          })}
          onExportExcel={() => generateExcel({
            ctx: state.ctx,
            selected: state.selected,
            funnel: state.funnel,
            calc,
            customTargets: state.customTargets,
          })}
          onCopyNotion={handleCopyNotion}
          notionCopied={notionCopied}
          onShare={share}
          shared={shared}
        />
      )}
    </AppShell>
  )
}
```

**Step 3: Verify build passes**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/hooks/useOKRState.js src/App.jsx
git commit -m "feat: integrate cloud sync, remove localStorage, add set selector flow"
```

---

### Task 16: Add user profile and save indicator to Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`

**Step 1: Modify `src/components/layout/Sidebar.jsx`**

Add a `UserFooter` component at the bottom of the sidebar that shows:
- User email
- Save status indicator (Saved / Saving... / Error)
- "My sets" link
- Sign out link

Add these new props to the Sidebar: `saveStatus`, `onBackToSets`.

At the bottom of the desktop sidebar (after the MiniRecap), add:

```jsx
// Add import at top of file
import { useAuth } from "../../contexts/AuthContext"
```

Add a new `UserFooter` component inside the file:

```jsx
function UserFooter({ saveStatus, onBackToSets }) {
  const { user, signOut } = useAuth()
  if (!user) return null

  const statusLabel = {
    idle: "",
    saving: "Saving...",
    saved: "\u2713 Saved",
    error: "\u26a0 Save failed",
  }[saveStatus] || ""

  const statusColor = {
    saving: "text-amber-500",
    saved: "text-emerald-500",
    error: "text-red-500",
  }[saveStatus] || "text-transparent"

  return (
    <div className="px-3 pb-4 space-y-2">
      <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-sidebar-foreground/60 truncate">{user.email}</p>
        <span className={`text-[10px] ${statusColor}`}>{statusLabel}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBackToSets}
          className="text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors cursor-pointer"
        >
          My sets
        </button>
        <button
          type="button"
          onClick={signOut}
          className="text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
```

Add `saveStatus` and `onBackToSets` to the Sidebar props destructuring and render `<UserFooter>` at the bottom of the desktop nav, after the MiniRecap block.

**Step 2: Pass new props through `AppShell.jsx`**

`AppShell` already spreads `{...sidebarProps}` to `<Sidebar>`, so the new props from `App.jsx` (`saveStatus`, `onBackToSets`) will pass through automatically. No changes needed in AppShell.

**Step 3: Verify build passes**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/components/layout/Sidebar.jsx
git commit -m "feat: add user profile, save status, and My sets link to sidebar"
```

---

## Phase 7 — Vercel Configuration & Deployment

### Task 17: Configure Vercel for Edge Functions

**Files:**
- Create: `vercel.json`

**Step 1: Write `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/auth/callback", "destination": "/index.html" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

This ensures:
- `/auth/callback` serves the SPA (client-side routing)
- All non-API routes serve the SPA
- `/api/*` routes are handled by Vercel Edge Functions (automatic)

**Step 2: Set environment variables in Vercel**

Run:
```bash
npx vercel env add VITE_SUPABASE_URL
npx vercel env add VITE_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
```

Or set them in the Vercel dashboard: Settings → Environment Variables.

**Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel.json with SPA rewrites for auth callback"
```

---

### Task 18: Handle shared URL flow with auth

**Files:**
- Modify: `src/hooks/useShareableURL.js`
- Modify: `src/AppRouter.jsx`

The URL share feature (`?s=...`) needs to work even with auth. When someone opens a shared link:
1. They see the login page
2. After login, the `?s=` param should still be there
3. The shared state loads into the wizard

**Step 1: Modify `src/hooks/useShareableURL.js`**

No changes needed — the hook reads `?s=` on mount and dispatches `LOAD`. It runs inside `App.jsx` which is behind `AuthGuard`, so the user is always logged in when this runs.

However, we need to preserve the `?s=` param across the auth redirect. Modify the `LoginPage` to store the current URL in a query param or sessionStorage before redirecting.

**Step 2: Modify `src/components/auth/LoginPage.jsx`**

Before sending the magic link, store the current URL query params in `sessionStorage`:

Add this before the `signIn` call in `handleSubmit`:

```javascript
// Preserve shared URL params across auth redirect
const currentSearch = window.location.search
if (currentSearch) {
  sessionStorage.setItem("okr-redirect-params", currentSearch)
}
```

**Step 3: Modify `src/components/auth/AuthCallback.jsx`**

After successful auth, restore the query params:

After `window.history.replaceState(...)`, add:

```javascript
const savedParams = sessionStorage.getItem("okr-redirect-params")
sessionStorage.removeItem("okr-redirect-params")
if (savedParams) {
  window.history.replaceState({}, "", `/${savedParams}`)
}
```

**Step 4: Verify build passes**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/components/auth/LoginPage.jsx src/components/auth/AuthCallback.jsx
git commit -m "feat: preserve shared URL params across auth redirect"
```

---

### Task 19: Deploy and test end-to-end

**Step 1: Build locally**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Deploy to Vercel**

Run: `npx vercel --prod`

**Step 3: Test the full flow**

1. Open the production URL → should see LoginPage
2. Enter email → "Send magic link" → check email
3. Click magic link → AuthCallback spinner → redirected to SetSelector
4. "Create my first OKR set" → wizard starts
5. Fill Context step → Select objectives → Configure funnel → System step
6. Check sidebar: email shown, "Saving..." then "Saved" indicator
7. Refresh page → should auto-load back to the set selector with the set listed
8. Click the set → wizard loads with saved state
9. Test exports (Excel, PDF, Notion) — should work unchanged
10. Test URL share → copy link → open in incognito → login → shared state loads

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: end-to-end testing fixes"
```

---

## Phase 8 — Cleanup

### Task 20: Remove unused localStorage code

**Files:**
- Delete or empty: `src/utils/storage.js`

Since we replaced localStorage with Supabase persistence, the storage utils are no longer used.

**Step 1: Check for remaining references**

Run: `grep -r "storage" src/ --include="*.js" --include="*.jsx"`

If no references remain, delete `src/utils/storage.js`.

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Final deploy**

Run: `npx vercel --prod`

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused localStorage storage utils"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 — Supabase Setup | 1-3 | DB schema, env config, Supabase client |
| 2 — Auth Components | 4-7 | AuthContext, LoginPage, AuthCallback, AuthGuard |
| 3 — Wire Auth | 8 | Auth integrated into app entry point |
| 4 — Edge Functions | 9-11 | /api/okr-sets CRUD, /api/me profile |
| 5 — API Client | 12-13 | Front-end API client, useCloudSync hook |
| 6 — UI Integration | 14-16 | SetSelector page, sidebar user footer |
| 7 — Vercel Config | 17-19 | SPA routing, env vars, E2E testing |
| 8 — Cleanup | 20 | Remove dead localStorage code |

**Total: 20 tasks across 8 phases**
