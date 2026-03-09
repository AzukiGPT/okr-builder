# Action Plan Views — Design Doc

**Date**: 2026-03-09
**Status**: Approved

## Summary

Add 3 view modes to the Actions Step (Step 5): Table, Kanban, and Gantt.
All views share the same data source (`actions[]`) and callbacks (`onCreateAction`, `onUpdateAction`, `onDeleteAction`). No API or DB changes required.

## Views

### Table View
- Sortable columns: Title, Channel, Status, Priority, Dates, Budget, KRs
- Inline editing: click status or priority to change via dropdown
- Row hover actions: Edit / Delete
- Grouping: respects `groupBy` toolbar setting (objective, channel, status, flat)
- No external dependency

### Kanban View
- Drag & drop cards between columns using `@dnd-kit/core` + `@dnd-kit/sortable`
- Columns generated dynamically from `groupBy` axis (status, channel, priority, team)
- Drop = `onUpdateAction(id, { [groupByField]: newValue })`
- Compact card variant: title, channel badge, priority badge, KR chips
- Column header with count
- Horizontal scroll if many columns

### Gantt View
- Interactive timeline using `frappe-gantt`
- Drag to move, resize to change duration
- Bar colors: by channel (colorHex) or status
- Sync: drag/resize triggers `onUpdateAction(id, { start_date, end_date })`
- View modes: day/week/month (native frappe-gantt)
- Unscheduled actions: displayed in a separate section below the chart
- React wrapper: `GanttChart.jsx` manages DOM ref and props-to-instance sync

## Shared Toolbar

- View toggle: 3 icon buttons (Table / Kanban / Gantt)
- Group by dropdown: Status, Channel, Priority, Team, Objective
  - Visible in Table and Kanban, hidden in Gantt
- "+ Add action" button always visible

## State (local, no DB persistence)

```
viewMode: "table" | "kanban" | "gantt"  (default: "table")
groupBy: "status" | "channel" | "priority" | "team" | "objective"  (default: "status")
sortColumn: string | null
sortDirection: "asc" | "desc"
```

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ui/actions-view-toolbar.jsx` | NEW | View toggle + group by + add button |
| `src/components/ui/actions-table-view.jsx` | NEW | Table view with sortable columns |
| `src/components/ui/actions-kanban-view.jsx` | NEW | Kanban board with @dnd-kit |
| `src/components/ui/actions-gantt-view.jsx` | NEW | Gantt wrapper around frappe-gantt |
| `src/components/steps/ActionsStep.jsx` | MODIFY | Refactor to view container |
| `src/components/ui/action-card.jsx` | MODIFY | Add compact variant for Kanban |

## Dependencies

| Package | Size (gzip) | Purpose |
|---------|-------------|---------|
| `@dnd-kit/core` | ~10 KB | Drag & drop primitives |
| `@dnd-kit/sortable` | ~5 KB | Sortable containers |
| `frappe-gantt` | ~30 KB | Interactive Gantt chart |

## Constraints

- No API changes: all 3 views use existing `actions[]` array and CRUD callbacks
- No DB schema changes
- Actions without `start_date`/`end_date` cannot appear on Gantt (shown in "Unscheduled" section)
- View state is local (not persisted to DB)
