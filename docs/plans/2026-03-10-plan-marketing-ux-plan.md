# Implementation Plan: Plan Marketing UX/UI Redesign

## Overview

Incremental UI polish across 4 files in the Plan Marketing page (ActionsStep). The changes improve KR readability in the form picker, reorganize form fields into logical sections, add KR and Phase columns to the table view, and enrich Kanban cards with KR/Phase context. Estimated ~200 lines changed, no architecture or data-model modifications.

## Requirements

- KR picker shows structured list (team > objective > KR) with checkbox, badge, and truncated text
- Form is reorganized into 4 sections: Essentials, Planning, Budget (collapsed), KR Links
- Table view gains KRs column (colored badges, max 3 + "+N") and Phase column (colored badge), Budget column removed
- Kanban cards show 1-2 KR badges and Phase text below existing content
- All data flows through existing props; no new API calls or state management

## Architecture Changes

- `src/components/ui/action-form.jsx` -- restructured JSX layout + new KR picker rendering
- `src/components/ui/actions-table-view.jsx` -- new COLUMNS definition, new cell renderers, new props
- `src/components/ui/action-card.jsx` -- new optional props, additional badge row
- `src/components/steps/ActionsStep.jsx` -- pass `krStatuses` and `phases` to `ActionsTableView`; pass `krStatuses` and `phases` to `ActionCard` via Kanban

## Data Flow Analysis

### Key data structures already available

- `krStatuses` (from `ActionsStep` props): `{ "S1.1": { uuid: "abc-123", team: "sales", progress: 0 }, ... }`
- `OBJECTIVES` (from `src/data/objectives.js`): `{ sales: [{ id: "S1", title: "...", krs: [{ id: "S1.1", text: "..." }] }] }`
- `TEAM_CONFIG` (from `src/data/config.js`): `{ sales: { label: "Sales", colorHex: "#3B82F6" }, ... }`
- `TEAMS` (from `src/data/config.js`): `["sales", "marketing", "csm"]`
- `phases` (from `ActionsStep` props): `[{ id: "uuid", name: "Audit & Research", color_hex: "#06B6D4", position: 0 }]`
- `action.kr_ids`: array of KR UUIDs (not text IDs like "S1.1")

### UUID-to-text-ID resolution

The form already has access to both `krStatuses` (text ID -> uuid mapping) and `OBJECTIVES` (text ID -> text). For the table and cards, we need to build a reverse map (uuid -> text ID) to render badges. This reverse map already exists partially in `groupActions.js` as `uuidToKr`. We will build it inline in each component to avoid coupling.

## Implementation Steps

### Phase 1: KR Picker Redesign (action-form.jsx)

**1.1 Replace flat badge grid with structured tree** (File: `src/components/ui/action-form.jsx`, lines 192-233)

- Action: Replace the current `TEAMS.map` -> `objectives.flatMap` -> badge buttons with a three-level nested structure:
  - Level 1: Team header (colored label, e.g., "Sales" in `#3B82F6`)
  - Level 2: Objective line (e.g., "S1 -- Generate new ARR..." truncated)
  - Level 3: Each KR as a row: checkbox input + `S1.1` badge + KR text truncated at 50 chars
- The checkbox and badge should be in a horizontal flex row
- Container gets `max-h-56 overflow-y-auto` (currently `max-h-48`)
- Each KR row should use `toggleKR(krData.uuid)` on click (entire row clickable, not just checkbox)
- Why: Current picker shows only IDs ("S1.1") which are meaningless without context
- Dependencies: None
- Risk: Low -- purely presentational change, same data flow

**1.2 Adjust default selection logic** (File: `src/components/ui/action-form.jsx`, lines 52-57)

- Action: When `initialData` is absent (new manual action) AND no `initialData.kr_ids`, set default to `[]` (empty) instead of calling `computeDefaultKRs`
- Keep `computeDefaultKRs` only when `initialData?.source === "template"` AND `initialData.kr_ids` is not already set
- Current behavior: `computeDefaultKRs` pre-selects ALL KRs from selected objectives. Design says: "none selected" for manual, "template KRs" for template.
- Specifically: change the `useState` initializer at line 52 to:
  ```
  if (initialData?.kr_ids) return initialData.kr_ids
  if (initialData?.source === "template") return computeDefaultKRs(selected, krStatuses)
  return []
  ```
- Why: Pre-selecting all KRs by default is confusing when creating manually
- Dependencies: None
- Risk: Low -- behavioral change but aligns with design doc intent

### Phase 2: Form Layout Reorganization (action-form.jsx)

**2.1 Add section headers and group fields** (File: `src/components/ui/action-form.jsx`, lines 94-233)

- Action: Wrap existing fields into 4 visual sections with small uppercase headers:
  - **Essentials** (always visible): Title (lines 99-108), Description (lines 110-119), Channel/Type/Priority 3-col grid (lines 121-125)
  - **Planning** (always visible): Phase + Est. days 2-col (lines 127-152), Start/End dates 2-col (lines 154-163)
  - **Budget** (collapsed by default): Budget + Currency 2-col (lines 165-189)
  - **KR Links** (always visible): The new KR picker from Phase 1
- Each section gets a small divider and a label like:
  ```jsx
  <div className="pt-2">
    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide border-b border-border pb-1 mb-2">Planning</p>
    ...fields...
  </div>
  ```
- Why: Current form is a flat scroll of 10+ fields with no hierarchy
- Dependencies: Phase 1 (KR picker) should be done first so the KR Links section references the new picker
- Risk: Low -- purely layout rearrangement

**2.2 Add collapsed Budget section with chevron toggle** (File: `src/components/ui/action-form.jsx`)

- Action: Add a `const [showBudget, setShowBudget] = useState(false)` state (or default to `true` if `initialData?.budget_estimated > 0`)
- Render the Budget section header with a `ChevronDown` / `ChevronRight` icon from lucide-react
- Clicking the header toggles `showBudget`
- Conditionally render the Budget + Currency fields when `showBudget` is true
- Import `ChevronDown`, `ChevronRight` from `lucide-react`
- Why: Budget is rarely filled; collapsing it reduces visual noise
- Dependencies: Step 2.1 (section structure must exist)
- Risk: Low -- new state variable, simple toggle

### Phase 3: Table View -- KRs and Phase Columns (actions-table-view.jsx)

**3.1 Update COLUMNS definition** (File: `src/components/ui/actions-table-view.jsx`, lines 7-15)

- Action: Replace current COLUMNS array with:
  ```js
  const COLUMNS = [
    { key: "title", label: "Title", sortable: true },
    { key: "krs", label: "KRs", sortable: false },
    { key: "channel", label: "Channel", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "priority", label: "Priority", sortable: true },
    { key: "phase", label: "Phase", sortable: true },
    { key: "dates", label: "Dates", sortable: true },
    { key: "actions_col", label: "", sortable: false },
  ]
  ```
- Removed: `budget` column
- Added: `krs` (after title), `phase` (after priority)
- Why: KRs and Phase are key information currently hidden; Budget is rarely used
- Dependencies: None
- Risk: Low

**3.2 Update sort function for phase column** (File: `src/components/ui/actions-table-view.jsx`, lines 17-37)

- Action: Remove the `budget` sort case. Add a `phase` case that sorts by phase position:
  ```js
  case "phase": {
    const posA = phaseLookup[a.phase_id]?.position ?? 999
    const posB = phaseLookup[b.phase_id]?.position ?? 999
    return dir * (posA - posB)
  }
  ```
- Build `phaseLookup` as a `useMemo` inside the component: `phases.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})`
- Why: Phase sorting should follow position order, not alphabetical
- Dependencies: Step 3.3 (needs `phases` prop)
- Risk: Low

**3.3 Update component signature to accept new props** (File: `src/components/ui/actions-table-view.jsx`, line 39)

- Action: Change from:
  ```js
  export default function ActionsTableView({ actions, onEdit, onDelete, onUpdateAction })
  ```
  To:
  ```js
  export default function ActionsTableView({ actions, onEdit, onDelete, onUpdateAction, krStatuses, phases })
  ```
- Why: Needed to render KR badges and Phase badges
- Dependencies: Step 3.5 (caller must pass these props)
- Risk: Low -- additive change, existing callers unaffected until props are passed

**3.4 Add KRs cell renderer** (File: `src/components/ui/actions-table-view.jsx`, inside the `<tbody>` row)

- Action: Build a `uuidToKrId` map from `krStatuses` (reverse lookup: `{ uuid: { krId, team } }`). Use `useMemo` to avoid rebuilding on every render.
- For the KRs column cell:
  ```jsx
  <td className="px-3 py-2.5">
    <div className="flex items-center gap-1 flex-wrap">
      {(action.kr_ids || []).slice(0, 3).map((uuid) => {
        const kr = uuidToKrId[uuid]
        if (!kr) return null
        const teamColor = TEAM_CONFIG[kr.team]?.colorHex || "#6B7280"
        return (
          <span
            key={uuid}
            className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${teamColor}15`, color: teamColor }}
          >
            {kr.krId}
          </span>
        )
      })}
      {(action.kr_ids || []).length > 3 && (
        <span className="text-[10px] text-muted-foreground" title={remainingKrIds}>
          +{action.kr_ids.length - 3}
        </span>
      )}
    </div>
  </td>
  ```
- Import `TEAM_CONFIG` from `../../data/config`
- The `+N` element should have a `title` attribute showing the full list of remaining KR IDs for tooltip
- Why: Core feature -- KR visibility in the table
- Dependencies: Step 3.3 (needs `krStatuses` prop)
- Risk: Low -- read-only rendering

**3.5 Add Phase cell renderer** (File: `src/components/ui/actions-table-view.jsx`, inside the `<tbody>` row)

- Action: Build `phaseLookup` from `phases` prop (same `useMemo` as step 3.2).
- For the Phase column cell:
  ```jsx
  <td className="px-3 py-2.5">
    {phaseLookup[action.phase_id] && (
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{
          backgroundColor: `${phaseLookup[action.phase_id].color_hex}15`,
          color: phaseLookup[action.phase_id].color_hex,
        }}
      >
        {phaseLookup[action.phase_id].name}
      </span>
    )}
  </td>
  ```
- Why: Phase context is critical for planning view
- Dependencies: Step 3.3 (needs `phases` prop)
- Risk: Low

**3.6 Remove Budget cell** (File: `src/components/ui/actions-table-view.jsx`, lines 152-154)

- Action: Delete the `<td>` that renders `action.budget_estimated`
- Why: Design specifies removing Budget from table (still available in form)
- Dependencies: Step 3.1 (column must already be removed from COLUMNS)
- Risk: Low

### Phase 4: Pass Props from ActionsStep (ActionsStep.jsx)

**4.1 Pass krStatuses and phases to ActionsTableView** (File: `src/components/steps/ActionsStep.jsx`, lines 272-278)

- Action: Update the `<ActionsTableView>` call to include:
  ```jsx
  <ActionsTableView
    actions={actions}
    onEdit={handleEdit}
    onDelete={handleDelete}
    onUpdateAction={handleInlineUpdate}
    krStatuses={krStatuses}
    phases={phases}
  />
  ```
- Why: Table view needs these props for KR badges and Phase badges
- Dependencies: Phase 3 (table view must accept these props)
- Risk: Low

**4.2 Pass krStatuses and phases through Kanban to ActionCard** (File: `src/components/ui/actions-kanban-view.jsx`)

- Action: The Kanban view already receives `krStatuses` and `phases` as props (line 84-85). Pass them down to `SortableCard` and then to `ActionCard`:
  - `SortableCard` signature: add `krStatuses`, `phases` props
  - `KanbanColumn` signature: add `krStatuses`, `phases` props
  - `ActionCard` call: add `krStatuses={krStatuses} phases={phases}`
  - Also update the `DragOverlay` `ActionCard` call
- Why: Cards need these props to render KR badges and phase text
- Dependencies: Phase 5 (card must accept these props)
- Risk: Low -- prop threading only

### Phase 5: Kanban Card Enrichment (action-card.jsx)

**5.1 Update ActionCard signature** (File: `src/components/ui/action-card.jsx`, line 5)

- Action: Change from:
  ```js
  export default function ActionCard({ action, onEdit, onDelete, compact = false })
  ```
  To:
  ```js
  export default function ActionCard({ action, onEdit, onDelete, compact = false, krStatuses, phases })
  ```
- Why: Needed to render KR and Phase info
- Dependencies: None
- Risk: Low -- additive, existing callers without these props still work (undefined is handled gracefully)

**5.2 Build reverse lookup inside ActionCard** (File: `src/components/ui/action-card.jsx`)

- Action: At the top of the function body, build `uuidToKrId` from `krStatuses` (same pattern as table view). Use inline computation (no `useMemo` needed in card -- it is a lightweight component rendered per-card).
  ```js
  const uuidToKrId = {}
  if (krStatuses) {
    for (const [krId, data] of Object.entries(krStatuses)) {
      if (data?.uuid) uuidToKrId[data.uuid] = { krId, team: data.team }
    }
  }
  ```
- Also build `phaseLookup`:
  ```js
  const phase = phases?.find((p) => p.id === action.phase_id)
  ```
- Import `TEAM_CONFIG` from `../../data/config`
- Why: Needed to resolve UUIDs to display text IDs and team colors
- Dependencies: Step 5.1
- Risk: Low

**5.3 Add KR badges to compact card** (File: `src/components/ui/action-card.jsx`, after the channel/priority badges around line 18-28)

- Action: After the existing `<div className="flex items-center gap-1 flex-wrap">` block (channel + priority), add:
  ```jsx
  {(action.kr_ids || []).length > 0 && (
    <div className="flex items-center gap-1 flex-wrap">
      {(action.kr_ids || []).slice(0, 2).map((uuid) => {
        const kr = uuidToKrId[uuid]
        if (!kr) return null
        const teamColor = TEAM_CONFIG[kr.team]?.colorHex || "#6B7280"
        return (
          <span
            key={uuid}
            className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${teamColor}15`, color: teamColor }}
          >
            {kr.krId}
          </span>
        )
      })}
    </div>
  )}
  ```
- Limit to 2 badges in compact mode (Kanban cards)
- Why: Design specifies 1-2 KR badges on cards
- Dependencies: Step 5.2
- Risk: Low

**5.4 Add Phase text to compact card** (File: `src/components/ui/action-card.jsx`, after KR badges)

- Action: After the KR badges block, add:
  ```jsx
  {phase && (
    <p className="text-[9px] text-muted-foreground">
      {phase.name}
    </p>
  )}
  ```
- Why: Phase context on cards helps with planning overview
- Dependencies: Step 5.2
- Risk: Low

**5.5 Add KR badges and Phase to full card** (File: `src/components/ui/action-card.jsx`, around line 47-61)

- Action: After the channel/type badges `<div>` block in the non-compact card, add a similar KR badges row (up to 2 badges) and Phase text. Same pattern as compact card but with `text-[10px]` instead of `text-[9px]`.
- Why: Full cards (used outside Kanban, e.g., DragOverlay) should also show enriched data
- Dependencies: Step 5.2
- Risk: Low

## Testing Strategy

### Manual Testing (Primary -- no automated tests exist in codebase)

1. **KR Picker**
   - Open "New action" form -- verify KRs are grouped by team > objective > KR
   - Verify each KR row shows checkbox + badge + truncated text
   - Verify no KRs are pre-selected for manual creation
   - Open form from template -- verify template KRs are pre-selected
   - Edit existing action -- verify existing kr_ids are checked
   - Scroll test: select many objectives, verify `max-h-56` scroll works

2. **Form Layout**
   - Verify 4 sections are visually distinct with headers
   - Verify Budget section is collapsed by default
   - Verify Budget section expands on chevron click
   - Verify Budget section is open by default when editing an action with budget > 0
   - Submit form and verify all field values are preserved

3. **Table View**
   - Verify column order: Title | KRs | Channel | Status | Priority | Phase | Dates | Actions
   - Verify Budget column is gone
   - Verify KR badges show team colors and correct IDs
   - Verify max 3 KR badges with "+N" overflow and tooltip
   - Verify Phase badge shows with correct color
   - Verify Phase column sorting works (by position order)
   - Verify actions with no KRs or no Phase show empty cells (no errors)

4. **Kanban Cards**
   - Verify compact cards show 1-2 KR badges
   - Verify Phase text appears below badges
   - Verify drag-and-drop still works after adding new elements
   - Verify DragOverlay card also shows KR/Phase info

### Edge Cases to Verify

- Action with 0 kr_ids -- all views show empty gracefully
- Action with kr_ids referencing a deleted KR (uuid not in krStatuses) -- badge should not render
- Action with no phase_id -- phase cell/text should be empty
- `krStatuses` is null or empty -- KR picker hides, table/card KR cells are empty
- `phases` is null or empty -- phase column/text shows nothing

## Risks and Mitigations

- **Risk**: KR picker becomes too tall with many objectives selected (e.g., 10+ objectives across 3 teams)
  - Mitigation: `max-h-56` with overflow scroll. Objective headers are collapsible in future iteration if needed.

- **Risk**: Table becomes too wide with new columns on small screens
  - Mitigation: Table already has `overflow-x-auto`. KR badges use compact `text-[10px]` sizing. Phase badge uses `whitespace-nowrap`.

- **Risk**: Kanban card height increases, breaking visual rhythm
  - Mitigation: KR badges limited to 2, Phase is single-line `text-[9px]`. Total height increase is ~20px per card.

- **Risk**: Prop threading through Kanban (3 levels: KanbanView -> KanbanColumn -> SortableCard -> ActionCard) is verbose
  - Mitigation: Acceptable for 2 additional props. No context/provider needed for this scope.

## Success Criteria

- [ ] KR picker shows team > objective > KR hierarchy with checkbox, badge, and truncated text (50 chars)
- [ ] Manual creation form defaults to 0 KRs selected
- [ ] Template-based creation pre-selects template KRs
- [ ] Form has 4 clearly labeled sections; Budget is collapsed by default
- [ ] Budget section auto-expands when editing action with existing budget
- [ ] Table view shows KRs column with colored badges (max 3 + "+N")
- [ ] Table view shows Phase column with colored badge
- [ ] Table view no longer shows Budget column
- [ ] Phase column is sortable by position
- [ ] Kanban cards show 1-2 KR badges and Phase text
- [ ] All views handle missing/null krStatuses and phases gracefully
- [ ] No console errors or warnings introduced
- [ ] Drag-and-drop in Kanban still works correctly

## Anti-Goals

- Do NOT introduce new components or files -- all changes are inline in existing files
- Do NOT add a modal/drawer form layout (out of scope, Approach B)
- Do NOT add filter bars (out of scope, Approach C)
- Do NOT change the data model, API calls, or Supabase schema
- Do NOT add i18n or language switching
- Do NOT refactor groupActions.js or other utilities
- Do NOT abstract the "uuid-to-krId reverse map" into a shared utility (only 2 call sites; revisit if a 3rd appears)

## Files Modified (Summary)

| File | Lines Changed (Est.) | What |
|------|---------------------|------|
| `src/components/ui/action-form.jsx` | ~80 | KR picker tree + section layout + budget toggle |
| `src/components/ui/actions-table-view.jsx` | ~50 | New columns, cell renderers, remove budget |
| `src/components/ui/action-card.jsx` | ~30 | KR badges + phase text in both card modes |
| `src/components/steps/ActionsStep.jsx` | ~4 | Pass krStatuses + phases to table view |
| `src/components/ui/actions-kanban-view.jsx` | ~10 | Thread krStatuses + phases to ActionCard |

**Total estimated: ~174 lines changed across 5 files**
