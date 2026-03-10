# Action Phases, Timeline & Kanban DnD — Design

**Date**: 2026-03-10
**Status**: Approved

## Problem

1. Kanban drag & drop broken (columns lack `useDroppable`)
2. No way to group actions into phases or create a timeline
3. Actions have no estimated duration for auto-scheduling

## Decisions

- **Groupement logique** par phases (pas de blocage finish-to-start entre actions individuelles)
- **Auto-placement** : chaque action a une durée estimée, le système calcule les dates
- **Phases hybrides** : 5 phases par défaut via templates, renommables/ajoutables par l'utilisateur
- **Architecture** : table `action_phases` en base (Approche A)

## Data Schema

### New table: `action_phases`

```sql
CREATE TABLE action_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES okr_sets(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL,
  color_hex text DEFAULT '#8B5CF6',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_action_phases_set ON action_phases(set_id);
```

### Altered: `actions`

```sql
ALTER TABLE actions ADD COLUMN phase_id uuid REFERENCES action_phases(id) ON DELETE SET NULL;
ALTER TABLE actions ADD COLUMN estimated_days int DEFAULT 5;
```

### Altered: `action_templates`

```sql
ALTER TABLE action_templates ADD COLUMN default_phase text;
ALTER TABLE action_templates ADD COLUMN estimated_days int DEFAULT 5;
```

### Default phases (created on first Step 5 visit)

| Position | Name | Template key |
|----------|------|-------------|
| 0 | Audit & Research | audit |
| 1 | Foundation & Setup | setup |
| 2 | Launch & Execution | launch |
| 3 | Optimize & Iterate | optimize |
| 4 | Scale & Expand | scale |

## Auto-Scheduler Algorithm

Client-side utility `computeSchedule.js`:

1. For each phase (by position ascending):
   - `phase_start` = position 0 ? today : max(end_date) of previous phase's actions
   - Each action in phase: `start_date = phase_start`, `end_date = phase_start + estimated_days` (business days)
   - Actions within same phase run in PARALLEL
2. User can override dates manually; auto-scheduler only sets dates for actions without manual dates

## Kanban DnD Fix

1. Add `useDroppable({ id: group.key })` to `KanbanColumn`
2. Detect column drops in `handleDragEnd` (over.id = column key)
3. Update corresponding field on drop

## New: Group by Phase in Kanban

- Each column = one phase
- Drag between columns updates `phase_id`
- Added to toolbar dropdown: Status | Channel | Priority | **Phase**

## API

### New endpoint: `api/action-phases.js`

- `GET ?set_id=X` — list phases ordered by position
- `POST` — create phase `{ set_id, name, position, color_hex }`
- `PUT ?id=X` — rename, reorder, recolor
- `DELETE ?id=X` — delete (orphaned actions get `phase_id = NULL`)

### Modified: `api/actions.js`

- POST/PUT accept `phase_id` and `estimated_days`
- GET returns these fields

### New hook: `usePhases.js`

- Fetch phases for active set
- CRUD + API sync
- Auto-create default phases on first Step 5 visit if none exist

## Gantt Enhancements

- Group bars by phase (phase header rows)
- frappe-gantt `dependencies` field for inter-phase arrows
- Unscheduled section remains for actions without dates

## File Summary

| File | Action |
|------|--------|
| `supabase/migrations/20260310_action_phases.sql` | NEW — schema |
| `supabase/migrations/20260310_seed_template_phases.sql` | NEW — update templates with default_phase + estimated_days |
| `api/action-phases.js` | NEW — CRUD endpoint |
| `api/actions.js` | MODIFY — accept phase_id, estimated_days |
| `src/lib/api.js` | MODIFY — add phase API calls |
| `src/hooks/usePhases.js` | NEW — phases state + CRUD |
| `src/hooks/useActions.js` | MODIFY — include phase_id, estimated_days |
| `src/utils/computeSchedule.js` | NEW — auto-placement algorithm |
| `src/data/actions-config.js` | MODIFY — add DEFAULT_PHASES, phase grouping |
| `src/components/ui/actions-kanban-view.jsx` | FIX — useDroppable + phase grouping |
| `src/components/ui/actions-gantt-view.jsx` | MODIFY — phase grouping + auto-schedule |
| `src/components/ui/action-form.jsx` | MODIFY — phase picker + estimated_days field |
| `src/components/ui/actions-view-toolbar.jsx` | MODIFY — "Phase" in group-by dropdown |
| `src/components/steps/ActionsStep.jsx` | MODIFY — wire phases |
| `src/App.jsx` | MODIFY — wire usePhases |
