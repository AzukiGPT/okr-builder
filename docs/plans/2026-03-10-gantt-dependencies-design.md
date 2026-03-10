# Custom Gantt + Dependencies Design

**Goal:** Replace frappe-gantt with a custom React Gantt component, add inter-action dependencies (FS/SS/FF/SF), and render dependency arrows as SVG overlays.

**Architecture:** Progressive 3-phase delivery. Phase 1 builds a custom Gantt in pure React (CSS Grid + Tailwind). Phase 2 adds a `action_dependencies` table with cascade propagation via topological sort. Phase 3 overlays SVG Bezier arrows for visual dependency links.

**Tech Stack:** React 19, CSS Grid, Tailwind v4, SVG, Supabase (Postgres + Edge Functions)

---

## Section 1 — Custom Gantt Component (Phase 1)

### Timeline Grid

- CSS Grid: rows = actions grouped by phase, columns = time units
- 3 zoom levels: Day (1 col/day), Week (1 col/week), Month (1 col/month)
- Sticky left column with action titles (200px)
- Sticky top header with date labels
- Today marker: vertical dashed line in primary color

### Phase Row Groups

- Each phase gets a colored header row spanning the full timeline width
- Phase color from `action_phases.color_hex`
- Collapsible: click phase header to toggle action rows
- "Unassigned" group at bottom for actions without `phase_id`

### Action Bars

- `position: absolute` divs inside each row cell
- Width = `(end_date - start_date)` in time units
- Left offset = `(start_date - timeline_start)` in time units
- Color: phase color with 80% opacity
- Border-left: 3px solid phase color (full opacity)
- Content: truncated title + status icon
- Hover tooltip: full title, dates, status, priority

### Drag Interactions

- Horizontal drag on bar body: move start+end dates (preserve duration)
- Drag right edge: extend/shrink end_date
- Drag left edge: extend/shrink start_date
- All drags call `onUpdateAction(id, { start_date, end_date })`
- Visual feedback: ghost bar at original position during drag

### Legend & Controls

- Zoom selector: Day / Week / Month buttons
- Phase color legend (auto-generated from phases)
- "Fit all" button: auto-zoom to show all actions
- "Today" button: scroll to today marker

### Files

- **Create:** `src/components/ui/gantt/GanttChart.jsx` — Main container (grid, scroll, zoom)
- **Create:** `src/components/ui/gantt/GanttHeader.jsx` — Date header row
- **Create:** `src/components/ui/gantt/GanttPhaseGroup.jsx` — Phase header + collapsible rows
- **Create:** `src/components/ui/gantt/GanttBar.jsx` — Action bar (drag, tooltip)
- **Create:** `src/components/ui/gantt/gantt-utils.js` — Date math, grid calculations
- **Modify:** `src/components/ui/actions-gantt-view.jsx` — Replace frappe-gantt with `<GanttChart />`
- **Delete:** `src/styles/frappe-gantt.css` — No longer needed

---

## Section 2 — Dependencies Data Model (Phase 2)

### Database Table

```sql
CREATE TABLE public.action_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  successor_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  dep_type text NOT NULL DEFAULT 'FS'
    CHECK (dep_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (predecessor_id, successor_id)
);
```

Dependency types:
- **FS** (Finish-to-Start): successor starts after predecessor finishes + lag
- **SS** (Start-to-Start): successor starts when predecessor starts + lag
- **FF** (Finish-to-Finish): successor finishes when predecessor finishes + lag
- **SF** (Start-to-Finish): successor finishes when predecessor starts + lag

### API Endpoint

**File:** `api/action-dependencies.js`

- `GET ?action_id=<uuid>` — All dependencies where action is predecessor or successor
- `GET ?set_id=<uuid>` — All dependencies for actions in this set
- `POST` — Create dependency `{ predecessor_id, successor_id, dep_type, lag_days }`
  - Validate: no self-reference, no circular dependency (BFS check)
  - Validate: both actions belong to same set
- `DELETE ?id=<uuid>` — Remove dependency
- Auth via `checkSetAccess` (same pattern as actions.js)

### Cascade Propagation

**File:** `src/utils/computeSchedule.js` (modify)

Update the scheduler to respect dependencies:
1. Build dependency graph from `action_dependencies`
2. Topological sort all actions
3. For each action in topo order:
   - Collect all dependency constraints (predecessor date + dep_type + lag)
   - Earliest possible start = max of all constraints
   - If action has manual dates AND they satisfy constraints, keep them
   - Otherwise, shift to earliest valid position
4. Preserve phase ordering as secondary constraint

### Hook

**File:** `src/hooks/useDependencies.js` (new)

- State: `Map<actionId, { predecessors: Dep[], successors: Dep[] }>`
- Fetch on mount via `api.listDependencies(setId)`
- Expose: `createDependency`, `deleteDependency`, `getDepsForAction`
- On create/delete: refetch + trigger schedule recalculation

### API Client

**File:** `src/lib/api.js` (modify)

Add: `listDependencies(setId)`, `createDependency(payload)`, `deleteDependency(id)`

---

## Section 3 — SVG Dependency Arrows (Phase 3)

### SVG Overlay

- `<svg>` element absolutely positioned over the Gantt grid
- Same dimensions as scrollable content area
- `pointer-events: none` on SVG, `pointer-events: auto` on individual paths
- Re-renders when bars move (dates change) or scroll

### Arrow Rendering

Each dependency renders as a Bezier curve path:
- **FS:** from right edge of predecessor → left edge of successor
- **SS:** from left edge of predecessor → left edge of successor
- **FF:** from right edge of predecessor → right edge of successor
- **SF:** from left edge of predecessor → right edge of successor

Control points: horizontal offset of 20px for smooth curves.

### Color States

- **Normal:** `stroke: var(--border)`, 2px, 60% opacity
- **Hover:** `stroke: var(--primary)`, 3px, 100% opacity + glow filter
- **Violation:** `stroke: var(--destructive)`, 2px dashed, pulsing animation
  - Violation = successor date violates the constraint

### Interactions

- **Hover arrow:** highlight + show tooltip (dep type, lag, predecessor/successor names)
- **Click arrow:** select it, show delete option
- **Drag-to-create:** hold Shift + drag from bar edge to another bar
  - Visual: dashed line follows cursor
  - On drop: open mini-form to choose dep_type + lag_days
  - Cancel: release outside a bar or press Escape

### Violation Detection

- After any date change, check all dependencies
- If successor.start < predecessor.end + lag (for FS), mark as violation
- Violation arrows render in red dashed style
- Optional: auto-fix button that cascades dates forward

### Files

- **Create:** `src/components/ui/gantt/GanttArrows.jsx` — SVG overlay container
- **Create:** `src/components/ui/gantt/GanttArrow.jsx` — Single arrow path (Bezier, states)
- **Create:** `src/components/ui/gantt/DependencyCreator.jsx` — Shift+drag interaction
- **Modify:** `src/components/ui/gantt/GanttChart.jsx` — Add SVG overlay + dependency props
- **Modify:** `src/components/ui/gantt/GanttBar.jsx` — Add drag-to-create anchor points

---

## File Summary

| File | Action | Phase |
|------|--------|-------|
| `src/components/ui/gantt/GanttChart.jsx` | Create | 1 |
| `src/components/ui/gantt/GanttHeader.jsx` | Create | 1 |
| `src/components/ui/gantt/GanttPhaseGroup.jsx` | Create | 1 |
| `src/components/ui/gantt/GanttBar.jsx` | Create | 1 |
| `src/components/ui/gantt/gantt-utils.js` | Create | 1 |
| `src/components/ui/actions-gantt-view.jsx` | Modify | 1 |
| `src/styles/frappe-gantt.css` | Delete | 1 |
| `supabase/migrations/20260310_action_dependencies.sql` | Create | 2 |
| `api/action-dependencies.js` | Create | 2 |
| `src/hooks/useDependencies.js` | Create | 2 |
| `src/lib/api.js` | Modify | 2 |
| `src/utils/computeSchedule.js` | Modify | 2 |
| `src/components/ui/gantt/GanttArrows.jsx` | Create | 3 |
| `src/components/ui/gantt/GanttArrow.jsx` | Create | 3 |
| `src/components/ui/gantt/DependencyCreator.jsx` | Create | 3 |
| `src/components/ui/gantt/GanttChart.jsx` | Modify | 3 |
| `src/components/ui/gantt/GanttBar.jsx` | Modify | 3 |

**Total: ~11 new files, 5 modified, 1 deleted**

---

## Implementation Order

```
Phase 1 (Custom Gantt) → Phase 2 (Dependencies DB + Scheduler) → Phase 3 (SVG Arrows)
```

Each phase is independently deployable. Phase 1 replaces frappe-gantt with identical+ functionality. Phase 2 adds the data layer. Phase 3 adds the visual layer.
