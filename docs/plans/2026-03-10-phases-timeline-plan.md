# Action Phases, Timeline & Kanban DnD — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add action phases with auto-scheduling, fix Kanban drag & drop, and enable phase-based timeline in Gantt.

**Architecture:** New `action_phases` table linked to `actions` via `phase_id`. Client-side auto-scheduler computes dates from phase order + estimated_days. Kanban columns get `useDroppable` for proper DnD. Phases are hybrid (5 defaults + user-customizable).

**Tech Stack:** React 19, @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, frappe-gantt, Supabase (Edge Functions), Tailwind v4.

**Design doc:** `docs/plans/2026-03-10-phases-timeline-design.md`

---

## Task 1: Database Migration — action_phases table + actions columns

**Files:**
- Create: `supabase/migrations/20260310_action_phases.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================================
-- Action Phases: groupement logique + auto-scheduling
-- ============================================================

-- 1. New table for phases
CREATE TABLE IF NOT EXISTS public.action_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.okr_sets(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL,
  color_hex text DEFAULT '#8B5CF6',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_phases_set ON public.action_phases(set_id);

-- 2. Add phase_id + estimated_days to actions
ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES public.action_phases(id) ON DELETE SET NULL;
ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS estimated_days int DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_actions_phase ON public.actions(phase_id);

-- 3. Add default_phase + estimated_days to action_templates
ALTER TABLE public.action_templates ADD COLUMN IF NOT EXISTS default_phase text;
ALTER TABLE public.action_templates ADD COLUMN IF NOT EXISTS estimated_days int DEFAULT 5;

-- 4. RLS policies for action_phases (same pattern as actions)
ALTER TABLE public.action_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read phases of their sets"
  ON public.action_phases FOR SELECT
  USING (
    set_id IN (SELECT set_id FROM public.set_members WHERE user_id = auth.uid())
    OR set_id IN (SELECT id FROM public.okr_sets WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert phases to their sets"
  ON public.action_phases FOR INSERT
  WITH CHECK (
    set_id IN (SELECT set_id FROM public.set_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
    OR set_id IN (SELECT id FROM public.okr_sets WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update phases of their sets"
  ON public.action_phases FOR UPDATE
  USING (
    set_id IN (SELECT set_id FROM public.set_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
    OR set_id IN (SELECT id FROM public.okr_sets WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete phases of their sets"
  ON public.action_phases FOR DELETE
  USING (
    set_id IN (SELECT set_id FROM public.set_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
    OR set_id IN (SELECT id FROM public.okr_sets WHERE user_id = auth.uid())
  );
```

**Step 2: Run migration in Supabase SQL editor**

Go to https://supabase.com/dashboard/project/pqruyqbsfoeylwrkuqsn/sql and execute the migration.

**Step 3: Commit**

```bash
git add supabase/migrations/20260310_action_phases.sql
git commit -m "feat: add action_phases table + phase_id/estimated_days columns"
```

---

## Task 2: Seed template phases

**Files:**
- Create: `supabase/migrations/20260310_seed_template_phases.sql`

**Step 1: Write the seed migration**

Assign `default_phase` and `estimated_days` to all 248 templates. The mapping logic:

- channel `ops` + action_type `strategy` → phase `audit`, 7 days
- channel `ops` + action_type `process` → phase `setup`, 10 days
- channel `ops` + action_type `technical` → phase `setup`, 10 days
- channel `content` + action_type `creation` → phase `launch`, 14 days
- channel `content` + action_type `strategy` → phase `audit`, 7 days
- channel `paid` → phase `launch`, 5 days
- channel `outbound` → phase `launch`, 7 days
- channel `email` → phase `launch`, 7 days
- channel `social` → phase `launch`, 5 days
- channel `events` → phase `launch`, 14 days
- channel `seo` → phase `setup`, 21 days
- channel `product` → phase `setup`, 14 days
- effort `low` → estimated_days 5, effort `medium` → 10, effort `high` → 21
- Default fallback: phase `launch`, 10 days

```sql
-- Assign default_phase based on channel + action_type combo
UPDATE public.action_templates SET default_phase = 'audit'
WHERE (channel = 'ops' AND action_type = 'strategy')
   OR (channel = 'content' AND action_type = 'strategy');

UPDATE public.action_templates SET default_phase = 'setup'
WHERE default_phase IS NULL
  AND ((channel = 'ops' AND action_type IN ('process', 'technical'))
    OR channel = 'seo'
    OR channel = 'product');

UPDATE public.action_templates SET default_phase = 'launch'
WHERE default_phase IS NULL;

-- Assign estimated_days based on effort
UPDATE public.action_templates SET estimated_days = 5 WHERE effort = 'low';
UPDATE public.action_templates SET estimated_days = 10 WHERE effort = 'medium';
UPDATE public.action_templates SET estimated_days = 21 WHERE effort = 'high';
UPDATE public.action_templates SET estimated_days = 10 WHERE estimated_days IS NULL OR estimated_days = 5;
```

**Step 2: Run in Supabase SQL editor**

**Step 3: Verify**

```sql
SELECT default_phase, COUNT(*) FROM action_templates GROUP BY default_phase;
-- Should show audit, setup, launch with counts summing to ~248
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260310_seed_template_phases.sql
git commit -m "feat: seed default_phase + estimated_days on action_templates"
```

---

## Task 3: API endpoint — action-phases.js

**Files:**
- Create: `api/action-phases.js`

**Step 1: Write the endpoint**

Follow exact same patterns as `api/actions.js` (lines 1-41 for imports, auth, checkSetAccess). The endpoint handles GET/POST/PUT/DELETE for phases.

```javascript
import { supabaseAdmin } from "./_lib/supabase-admin.js"
import { getUser } from "./_lib/auth.js"
import { corsHeaders, handleCors } from "./_lib/cors.js"

export const config = { runtime: "edge" }

function json(data, statusCode = 200, req) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  })
}

async function checkSetAccess(userId, setId, minRole = "editor") {
  const { data: member } = await supabaseAdmin
    .from("set_members")
    .select("role")
    .eq("set_id", setId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!member) {
    const { data: legacySet } = await supabaseAdmin
      .from("okr_sets").select("id").eq("id", setId).eq("user_id", userId).maybeSingle()
    if (!legacySet) return { allowed: false }
    return { allowed: true, role: "owner" }
  }
  const h = { owner: 3, editor: 2, viewer: 1 }
  return { allowed: (h[member.role] || 0) >= (h[minRole] || 0), role: member.role }
}

async function handleGet(req, user) {
  const url = new URL(req.url)
  const setId = url.searchParams.get("set_id")
  if (!setId) return json({ error: "Missing set_id" }, 400, req)
  const access = await checkSetAccess(user.id, setId, "viewer")
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const { data, error } = await supabaseAdmin
    .from("action_phases")
    .select("*")
    .eq("set_id", setId)
    .order("position", { ascending: true })
  if (error) return json({ error: error.message }, 500, req)
  return json({ data: data || [] }, 200, req)
}

async function handlePost(req, user) {
  const body = await req.json()
  const { set_id, name, position, color_hex } = body
  if (!set_id || !name) return json({ error: "Missing set_id or name" }, 400, req)
  const access = await checkSetAccess(user.id, set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const { data, error } = await supabaseAdmin
    .from("action_phases")
    .insert({ set_id, name, position: position ?? 0, color_hex: color_hex || "#8B5CF6" })
    .select("*")
    .single()
  if (error) return json({ error: error.message }, 500, req)
  return json({ data }, 201, req)
}

async function handlePut(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id" }, 400, req)

  const { data: existing } = await supabaseAdmin
    .from("action_phases").select("set_id").eq("id", id).single()
  if (!existing) return json({ error: "Not found" }, 404, req)
  const access = await checkSetAccess(user.id, existing.set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const body = await req.json()
  const updates = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.position !== undefined) updates.position = body.position
  if (body.color_hex !== undefined) updates.color_hex = body.color_hex

  const { data, error } = await supabaseAdmin
    .from("action_phases").update(updates).eq("id", id).select("*").single()
  if (error) return json({ error: error.message }, 500, req)
  return json({ data }, 200, req)
}

async function handleDelete(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id" }, 400, req)

  const { data: existing } = await supabaseAdmin
    .from("action_phases").select("set_id").eq("id", id).single()
  if (!existing) return json({ error: "Not found" }, 404, req)
  const access = await checkSetAccess(user.id, existing.set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  // Actions with this phase_id will get NULL (ON DELETE SET NULL)
  const { error } = await supabaseAdmin.from("action_phases").delete().eq("id", id)
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

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add api/action-phases.js
git commit -m "feat: add action-phases CRUD API endpoint"
```

---

## Task 4: Modify actions API to accept phase_id + estimated_days

**Files:**
- Modify: `api/actions.js:96-98` (POST destructuring)
- Modify: `api/actions.js:108-123` (POST insert)
- Modify: `api/actions.js:160-163` (PUT destructuring)
- Modify: `api/actions.js:165-177` (PUT updates)

**Step 1: Update POST handler**

In `handlePost`, add `phase_id` and `estimated_days` to the destructured fields (line 96-98):

```javascript
  const { set_id, title, description, channel, action_type, assignee_id,
    priority, start_date, end_date, budget_estimated, currency,
    source, template_id, kr_ids, phase_id, estimated_days } = body
```

Add to insert object (after line 122):

```javascript
      phase_id: phase_id || null,
      estimated_days: estimated_days || 5,
```

**Step 2: Update PUT handler**

In `handlePut`, add `phase_id` and `estimated_days` to destructuring (line 161-163):

```javascript
  const { title, description, channel, action_type, assignee_id, status,
    priority, start_date, end_date, budget_estimated, budget_actual,
    currency, kr_ids, phase_id, estimated_days } = body
```

Add to updates block (after line 177):

```javascript
  if (phase_id !== undefined) updates.phase_id = phase_id
  if (estimated_days !== undefined) updates.estimated_days = estimated_days
```

**Step 3: Verify build passes**

Run: `npm run build`

**Step 4: Commit**

```bash
git add api/actions.js
git commit -m "feat: accept phase_id and estimated_days in actions API"
```

---

## Task 5: API client — add phase methods

**Files:**
- Modify: `src/lib/api.js:30-31` (add after deleteAction)

**Step 1: Add phase API methods**

After the `deleteAction` line (line 30), add:

```javascript
  listPhases: (setId) => apiFetch(`/action-phases?set_id=${setId}`),
  createPhase: (payload) => apiFetch("/action-phases", { method: "POST", body: JSON.stringify(payload) }),
  updatePhase: (id, payload) => apiFetch(`/action-phases?id=${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePhase: (id) => apiFetch(`/action-phases?id=${id}`, { method: "DELETE" }),
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add phase CRUD methods to API client"
```

---

## Task 6: DEFAULT_PHASES config + phase grouping

**Files:**
- Modify: `src/data/actions-config.js` (add at end)
- Modify: `src/utils/groupActions.js:1,4-46,76-79` (add phase config)

**Step 1: Add DEFAULT_PHASES to actions-config.js**

Append after `ACTION_PRIORITIES`:

```javascript
export const DEFAULT_PHASES = [
  { key: "audit", name: "Audit & Research", position: 0, colorHex: "#06B6D4" },
  { key: "setup", name: "Foundation & Setup", position: 1, colorHex: "#8B5CF6" },
  { key: "launch", name: "Launch & Execution", position: 2, colorHex: "#F59E0B" },
  { key: "optimize", name: "Optimize & Iterate", position: 3, colorHex: "#22C55E" },
  { key: "scale", name: "Scale & Expand", position: 4, colorHex: "#EC4899" },
]
```

**Step 2: Add phase grouping to groupActions.js**

Add to imports (line 1):

```javascript
import { ACTION_STATUSES, ACTION_CHANNELS, ACTION_PRIORITIES, DEFAULT_PHASES } from "../data/actions-config"
```

Add new group config to `GROUP_CONFIGS` (after line 45, before the closing `}`):

```javascript
  phase: {
    getKey: (a) => a.phase_id || "unassigned",
    // columns will be dynamically set from actual phases
    columns: [
      ...DEFAULT_PHASES.map((p) => ({ key: p.key, label: p.name, colorHex: p.colorHex })),
      { key: "unassigned", label: "Unassigned", colorHex: "#6B7280" },
    ],
  },
```

Update `getGroupFieldName` (line 77) to include phase:

```javascript
  const map = { status: "status", channel: "channel", priority: "priority", team: null, phase: "phase_id" }
```

**Step 3: Add dynamic phase columns support**

The `groupActions` function needs to accept dynamic phase columns when groupBy is "phase". Modify `groupActions` signature and logic:

```javascript
export function groupActions(actions, groupBy, uuidToTeam, dynamicPhases) {
  const config = getGroupConfig(groupBy)
  const groups = new Map()

  // Use dynamic phase columns when available
  const columns = (groupBy === "phase" && dynamicPhases?.length > 0)
    ? [
        ...dynamicPhases.map((p) => ({ key: p.id, label: p.name, colorHex: p.color_hex })),
        { key: "unassigned", label: "Unassigned", colorHex: "#6B7280" },
      ]
    : config.columns

  for (const col of columns) {
    groups.set(col.key, { ...col, actions: [] })
  }

  for (const action of actions) {
    const key = groupBy === "team"
      ? config.getKey(action, uuidToTeam)
      : config.getKey(action)
    const group = groups.get(key)
    if (group) {
      group.actions.push(action)
    } else {
      // Fallback to "unassigned" for phase, or first group otherwise
      const fallback = groups.get("unassigned") || groups.values().next().value
      if (fallback) fallback.actions.push(action)
    }
  }

  return [...groups.values()]
}
```

**Step 4: Verify build passes**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/data/actions-config.js src/utils/groupActions.js
git commit -m "feat: add DEFAULT_PHASES config and phase grouping support"
```

---

## Task 7: usePhases hook

**Files:**
- Create: `src/hooks/usePhases.js`

**Step 1: Write the hook**

```javascript
import { useState, useCallback, useEffect, useRef } from "react"
import { api } from "../lib/api"
import { DEFAULT_PHASES } from "../data/actions-config"

export function usePhases(activeSetId) {
  const [phases, setPhases] = useState([])
  const [phasesLoading, setPhasesLoading] = useState(false)
  const initializedRef = useRef(false)

  const loadPhases = useCallback(async () => {
    if (!activeSetId) {
      setPhases([])
      return []
    }
    setPhasesLoading(true)
    try {
      const { data } = await api.listPhases(activeSetId)
      setPhases(data || [])
      return data || []
    } catch {
      setPhases([])
      return []
    } finally {
      setPhasesLoading(false)
    }
  }, [activeSetId])

  const ensureDefaultPhases = useCallback(async () => {
    if (!activeSetId || initializedRef.current) return
    initializedRef.current = true

    const existing = await loadPhases()
    if (existing.length > 0) return

    const created = []
    for (const phase of DEFAULT_PHASES) {
      try {
        const { data } = await api.createPhase({
          set_id: activeSetId,
          name: phase.name,
          position: phase.position,
          color_hex: phase.colorHex,
        })
        created.push(data)
      } catch {
        // Continue creating remaining phases
      }
    }
    if (created.length > 0) {
      setPhases(created)
    }
  }, [activeSetId, loadPhases])

  useEffect(() => {
    initializedRef.current = false
  }, [activeSetId])

  const createPhase = useCallback(async (payload) => {
    const { data } = await api.createPhase({ ...payload, set_id: activeSetId })
    setPhases((prev) => [...prev, data].sort((a, b) => a.position - b.position))
    return data
  }, [activeSetId])

  const updatePhase = useCallback(async (id, payload) => {
    const { data } = await api.updatePhase(id, payload)
    setPhases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p)).sort((a, b) => a.position - b.position)
    )
    return data
  }, [])

  const deletePhase = useCallback(async (id) => {
    await api.deletePhase(id)
    setPhases((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return {
    phases,
    phasesLoading,
    loadPhases,
    ensureDefaultPhases,
    createPhase,
    updatePhase,
    deletePhase,
  }
}
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/hooks/usePhases.js
git commit -m "feat: add usePhases hook with default phase creation"
```

---

## Task 8: Auto-scheduler utility

**Files:**
- Create: `src/utils/computeSchedule.js`

**Step 1: Write the scheduler**

```javascript
/**
 * Compute auto-scheduled dates for actions based on phase order.
 * Actions within the same phase run in parallel.
 * Phase N+1 starts when the longest action in phase N ends.
 *
 * @param {Array} phases - sorted by position ascending
 * @param {Array} actions - all actions for the set
 * @param {string} startDate - ISO date string for the project start (defaults to today)
 * @returns {Array} actions with computed start_date and end_date
 */
export function computeSchedule(phases, actions, startDate) {
  const projectStart = startDate ? new Date(startDate) : new Date()
  // Normalize to start of day
  projectStart.setHours(0, 0, 0, 0)

  const sortedPhases = [...phases].sort((a, b) => a.position - b.position)

  // Build phase_id → actions map
  const phaseActions = new Map()
  const unassigned = []

  for (const action of actions) {
    if (action.phase_id) {
      const list = phaseActions.get(action.phase_id) || []
      list.push(action)
      phaseActions.set(action.phase_id, list)
    } else {
      unassigned.push(action)
    }
  }

  const scheduled = new Map()
  let currentStart = projectStart

  for (const phase of sortedPhases) {
    const phaseActionList = phaseActions.get(phase.id) || []
    let maxEnd = currentStart

    for (const action of phaseActionList) {
      // Skip actions with manually-set dates
      if (action.start_date && action.end_date) {
        const existingEnd = new Date(action.end_date)
        if (existingEnd > maxEnd) maxEnd = existingEnd
        scheduled.set(action.id, { start_date: action.start_date, end_date: action.end_date })
        continue
      }

      const days = action.estimated_days || 5
      const end = addBusinessDays(currentStart, days)

      scheduled.set(action.id, {
        start_date: formatDate(currentStart),
        end_date: formatDate(end),
      })

      if (end > maxEnd) maxEnd = end
    }

    // Next phase starts after the longest action in this phase
    currentStart = addBusinessDays(maxEnd, 1)
  }

  return actions.map((action) => {
    const dates = scheduled.get(action.id)
    if (dates) return { ...action, ...dates }
    return action
  })
}

function addBusinessDays(date, days) {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

function formatDate(date) {
  return date.toISOString().split("T")[0]
}
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/utils/computeSchedule.js
git commit -m "feat: add auto-scheduler utility for phase-based timeline"
```

---

## Task 9: Fix Kanban drag & drop

**Files:**
- Modify: `src/components/ui/actions-kanban-view.jsx:1-11,34-70,72-78,81,131-151`

**Step 1: Add useDroppable import**

Line 6, add `useDroppable` to the imports:

```javascript
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core"
```

**Step 2: Add useDroppable to KanbanColumn**

Replace the `KanbanColumn` function (lines 34-70) with:

```javascript
function KanbanColumn({ group, onEdit, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id: group.key })

  return (
    <div className="flex-shrink-0 w-64 flex flex-col">
      <div
        className="rounded-t-lg px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: `${group.colorHex}12` }}
      >
        <span className="font-bold text-xs" style={{ color: group.colorHex }}>
          {group.label}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {group.actions.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-b-lg border border-t-0 border-border p-2 space-y-2 min-h-[120px] transition-colors ${
          isOver ? "bg-primary/5 border-primary/30" : "bg-muted/20"
        }`}
      >
        <SortableContext
          items={group.actions.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {group.actions.map((action) => (
            <SortableCard
              key={action.id}
              action={action}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {group.actions.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">
            Drop here
          </p>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Update component props to accept phases**

Update the component signature (line 72-78):

```javascript
export default function ActionsKanbanView({
  actions,
  groupBy,
  uuidToTeam,
  phases,
  onEdit,
  onDelete,
  onUpdateAction,
}) {
```

Update the `groupActions` call (line 81):

```javascript
  const groups = groupActions(actions, groupBy, uuidToTeam, phases)
```

**Step 4: Update handleDragEnd to check droppable columns**

The `handleDragEnd` function (line 99-118) already checks for column keys. The `useDroppable` makes columns actual drop targets, so `over.id` will now correctly be the column key when dropping on an empty column. No logic changes needed — the fix is in making columns droppable.

**Step 5: Verify build passes**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/components/ui/actions-kanban-view.jsx
git commit -m "fix: add useDroppable to Kanban columns for proper drag & drop"
```

---

## Task 10: Add "Phase" to toolbar group-by dropdown

**Files:**
- Modify: `src/components/ui/actions-view-toolbar.jsx:11-16`

**Step 1: Add Phase option**

Add to `GROUP_OPTIONS` array (after line 15):

```javascript
const GROUP_OPTIONS = [
  { key: "status", label: "Status" },
  { key: "channel", label: "Channel" },
  { key: "priority", label: "Priority" },
  { key: "phase", label: "Phase" },
  { key: "team", label: "Team" },
]
```

**Step 2: Show group-by for all views including gantt when grouped by phase**

Update the `showGroupBy` logic (line 25) — actually keep it as-is. The Gantt view has its own phase display logic.

**Step 3: Commit**

```bash
git add src/components/ui/actions-view-toolbar.jsx
git commit -m "feat: add Phase option to Kanban group-by dropdown"
```

---

## Task 11: Update action-form with phase picker + estimated_days

**Files:**
- Modify: `src/components/ui/action-form.jsx:26-36,96-100,44-61`

**Step 1: Add phase state and estimated_days state**

After the existing state declarations (line 36), add:

```javascript
  const [phaseId, setPhaseId] = useState(initialData?.phase_id || "")
  const [estimatedDays, setEstimatedDays] = useState(initialData?.estimated_days || 10)
```

**Step 2: Update props to include phases**

Update the component signature (line 26):

```javascript
export default function ActionForm({ onSubmit, onCancel, initialData, selected, krStatuses, phases }) {
```

**Step 3: Add phase_id and estimated_days to submit payload**

In `handleSubmit` (after line 60, before the closing `}`):

```javascript
      phase_id: phaseId || null,
      estimated_days: estimatedDays ? Number(estimatedDays) : 5,
```

**Step 4: Add Phase picker + Duration fields in the form**

After the channel/type/priority grid (line 100), add:

```jsx
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Phase</label>
          <select
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-xs bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">-- no phase --</option>
            {(phases || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Est. days</label>
          <Input
            type="number"
            min={1}
            max={90}
            value={estimatedDays}
            onChange={(e) => setEstimatedDays(e.target.value)}
            className="text-xs"
          />
        </div>
      </div>
```

**Step 5: Verify build passes**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/components/ui/action-form.jsx
git commit -m "feat: add phase picker and estimated days to action form"
```

---

## Task 12: Update Gantt view with phase grouping + auto-schedule

**Files:**
- Modify: `src/components/ui/actions-gantt-view.jsx:1-22,24`

**Step 1: Update component props**

```javascript
export default function ActionsGanttView({ actions, phases, onUpdateAction, onEdit }) {
```

**Step 2: Import computeSchedule and use it**

Add import:

```javascript
import { computeSchedule } from "../../utils/computeSchedule"
```

Replace the `scheduled` memo (line 34) to use auto-scheduled data:

```javascript
  const autoScheduled = useMemo(
    () => (phases?.length > 0 ? computeSchedule(phases, actions) : actions),
    [phases, actions]
  )
  const scheduled = useMemo(() => toGanttTasks(autoScheduled), [autoScheduled])
  const unscheduled = useMemo(
    () => autoScheduled.filter((a) => !a.start_date || !a.end_date),
    [autoScheduled]
  )
```

**Step 3: Update toGanttTasks to include phase info for grouping**

Add a `dependencies` field for phase-to-phase visual links (optional enhancement):

```javascript
function toGanttTasks(actions) {
  return actions
    .filter((a) => a.start_date && a.end_date)
    .map((a) => {
      const channel = ACTION_CHANNELS[a.channel]
      const status = ACTION_STATUSES[a.status]
      return {
        id: a.id,
        name: a.title,
        start: a.start_date,
        end: a.end_date,
        progress: a.status === "done" ? 100 : a.status === "in_progress" ? 50 : 0,
        custom_class: `gantt-bar--${a.channel || "default"}`,
        _color: channel?.colorHex || status?.colorHex || "#8B5CF6",
      }
    })
}
```

**Step 4: Verify build passes**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/components/ui/actions-gantt-view.jsx
git commit -m "feat: integrate auto-scheduler into Gantt view"
```

---

## Task 13: Wire everything in ActionsStep + App.jsx

**Files:**
- Modify: `src/components/steps/ActionsStep.jsx:1-25,89-115,165-198,232-240`
- Modify: `src/App.jsx:8,36-37,176-191`

**Step 1: Add phases prop to ActionsStep**

Update the component signature to accept `phases`, `ensureDefaultPhases`:

```javascript
export default function ActionsStep({
  selected,
  actions,
  actionsLoading,
  krStatuses,
  activeSetId,
  templates,
  phases,
  ensureDefaultPhases,
  onCreateAction,
  onBatchCreateActions,
  onUpdateAction,
  onDeleteAction,
  onBack,
  onBackToSets,
}) {
```

**Step 2: Call ensureDefaultPhases on mount**

After the existing state declarations, add:

```javascript
  useEffect(() => {
    if (ensureDefaultPhases) ensureDefaultPhases()
  }, [ensureDefaultPhases])
```

**Step 3: Update handleAddFromTemplate to include phase_id**

Modify `handleAddFromTemplate` (line 89-100) to resolve the default_phase to a phase_id:

```javascript
  const resolvePhaseId = useCallback((defaultPhase) => {
    if (!defaultPhase || !phases?.length) return null
    const match = phases.find((p) =>
      p.name.toLowerCase().includes(defaultPhase) || defaultPhase.includes(p.name.toLowerCase().split(" ")[0].toLowerCase())
    )
    return match?.id || null
  }, [phases])

  const handleAddFromTemplate = useCallback(async (tpl) => {
    await onCreateAction({
      title: tpl.title,
      description: tpl.description,
      channel: tpl.channel,
      action_type: tpl.action_type,
      source: "template",
      template_id: tpl.id,
      priority: "medium",
      kr_ids: resolveKrUuids(tpl.relevant_kr_ids),
      phase_id: resolvePhaseId(tpl.default_phase),
      estimated_days: tpl.estimated_days || 10,
    })
  }, [onCreateAction, resolveKrUuids, resolvePhaseId])
```

Update `handleBatchAdd` similarly to include phase_id and estimated_days.

**Step 4: Pass phases to views**

Pass `phases` prop to Kanban and Gantt views:

```jsx
      {viewMode === "kanban" && (
        <ActionsKanbanView
          actions={actions}
          groupBy={groupBy}
          uuidToTeam={uuidToTeam}
          phases={phases}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateAction={handleInlineUpdate}
        />
      )}
      {viewMode === "gantt" && (
        <ActionsGanttView
          actions={actions}
          phases={phases}
          onUpdateAction={handleInlineUpdate}
          onEdit={handleEdit}
        />
      )}
```

Pass `phases` to ActionForm:

```jsx
        <ActionForm
          initialData={editingAction}
          selected={selected}
          krStatuses={krStatuses}
          phases={phases}
          onSubmit={handleUpdate}
          onCancel={() => setEditingAction(null)}
        />
```

(Do this for all 3 ActionForm renders)

**Step 5: Wire usePhases in App.jsx**

Add import:

```javascript
import { usePhases } from "./hooks/usePhases"
```

Add hook call (after `useTemplates` on line 37):

```javascript
  const { phases, ensureDefaultPhases } = usePhases(activeSetId)
```

Pass props to ActionsStep (line 176-191):

```jsx
      {state.step === 4 && (
        <ActionsStep
          selected={state.selected}
          actions={actions}
          actionsLoading={actionsLoading}
          krStatuses={krStatuses}
          activeSetId={activeSetId}
          templates={templates}
          phases={phases}
          ensureDefaultPhases={ensureDefaultPhases}
          onCreateAction={createAction}
          onBatchCreateActions={batchCreateActions}
          onUpdateAction={updateAction}
          onDeleteAction={deleteAction}
          onBack={() => setStep(3)}
          onBackToSets={handleBackToSets}
        />
      )}
```

**Step 6: Verify build passes**

Run: `npm run build`

**Step 7: Commit**

```bash
git add src/components/steps/ActionsStep.jsx src/App.jsx
git commit -m "feat: wire phases throughout ActionsStep and App"
```

---

## Task 14: Deploy and verify

**Step 1: Push all changes**

```bash
git push origin main
```

**Step 2: Force deploy**

```bash
npx vercel --prod
```

**Step 3: Verify on production**

1. Open the set → navigate to Actions step
2. Verify default phases are created (check Supabase)
3. Click "Add all" → verify actions get assigned to phases
4. Switch to Kanban → Group by Phase → verify columns show phases
5. Drag a card between phase columns → verify phase_id updates
6. Switch to Gantt → verify auto-scheduled dates appear
7. Edit an action → verify Phase picker and Est. days fields work
