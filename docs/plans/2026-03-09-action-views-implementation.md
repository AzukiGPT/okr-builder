# Action Views (Table, Kanban, Gantt) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current flat card list in ActionsStep with 3 switchable views: Table, Kanban (drag & drop), and Gantt (interactive timeline).

**Architecture:** ActionsStep becomes a thin container holding a toolbar and the active view component. Each view receives the same `actions[]` array and CRUD callbacks. View/groupBy state is local (useState). No API or DB changes.

**Tech Stack:** React 19, Tailwind v4, @dnd-kit/core + @dnd-kit/sortable (Kanban DnD), frappe-gantt (Gantt chart), lucide-react (icons).

**Design doc:** `docs/plans/2026-03-09-action-views-design.md`

---

## Task 1: Install dependencies

**Step 1: Install @dnd-kit and frappe-gantt**

Run:
```bash
cd "/Users/tomhalimi/Desktop/OKR Builder"
npm install @dnd-kit/core @dnd-kit/sortable frappe-gantt
```

Expected: packages added to `package.json` dependencies.

**Step 2: Verify build still passes**

Run: `npm run build`
Expected: `built in ~5s`, no errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit and frappe-gantt dependencies"
```

---

## Task 2: Grouping utility

Shared logic for grouping actions by any axis. Used by Table and Kanban views.

**Files:**
- Create: `src/utils/groupActions.js`

**Step 1: Create grouping utility**

```javascript
// src/utils/groupActions.js
import { ACTION_STATUSES, ACTION_CHANNELS, ACTION_PRIORITIES } from "../data/actions-config"
import { TEAM_CONFIG } from "../data/config"

const GROUP_CONFIGS = {
  status: {
    getKey: (a) => a.status || "todo",
    columns: Object.entries(ACTION_STATUSES).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      colorHex: cfg.colorHex,
    })),
  },
  channel: {
    getKey: (a) => a.channel || "other",
    columns: [
      ...Object.entries(ACTION_CHANNELS).map(([key, cfg]) => ({
        key,
        label: cfg.label,
        colorHex: cfg.colorHex,
      })),
      { key: "other", label: "Other", colorHex: "#6B7280" },
    ],
  },
  priority: {
    getKey: (a) => a.priority || "medium",
    columns: Object.entries(ACTION_PRIORITIES).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      colorHex: cfg.colorHex,
    })),
  },
  team: {
    getKey: (a, uuidToTeam) => {
      const firstKrUuid = a.kr_ids?.[0]
      return firstKrUuid ? (uuidToTeam[firstKrUuid] || "unlinked") : "unlinked"
    },
    columns: [
      ...Object.entries(TEAM_CONFIG).map(([key, cfg]) => ({
        key,
        label: cfg.label,
        colorHex: cfg.colorHex,
      })),
      { key: "unlinked", label: "Unlinked", colorHex: "#6B7280" },
    ],
  },
}

export function getGroupConfig(groupBy) {
  return GROUP_CONFIGS[groupBy] || GROUP_CONFIGS.status
}

export function groupActions(actions, groupBy, uuidToTeam) {
  const config = getGroupConfig(groupBy)
  const groups = new Map()

  for (const col of config.columns) {
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
      const fallback = groups.values().next().value
      if (fallback) fallback.actions.push(action)
    }
  }

  return [...groups.values()]
}

export function getGroupFieldName(groupBy) {
  const map = { status: "status", channel: "channel", priority: "priority", team: null }
  return map[groupBy] ?? "status"
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/utils/groupActions.js
git commit -m "feat: add groupActions utility for table/kanban views"
```

---

## Task 3: View Toolbar

**Files:**
- Create: `src/components/ui/actions-view-toolbar.jsx`

**Step 1: Create toolbar component**

```jsx
// src/components/ui/actions-view-toolbar.jsx
import { Table2, Kanban, GanttChart, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

const VIEW_MODES = [
  { key: "table", label: "Table", Icon: Table2 },
  { key: "kanban", label: "Kanban", Icon: Kanban },
  { key: "gantt", label: "Gantt", Icon: GanttChart },
]

const GROUP_OPTIONS = [
  { key: "status", label: "Status" },
  { key: "channel", label: "Channel" },
  { key: "priority", label: "Priority" },
  { key: "team", label: "Team" },
]

export default function ActionsViewToolbar({
  viewMode,
  onViewModeChange,
  groupBy,
  onGroupByChange,
  onAddAction,
}) {
  const showGroupBy = viewMode !== "gantt"

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/50">
        {VIEW_MODES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onViewModeChange(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {showGroupBy && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
              Group by
            </span>
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value)}
              className="px-2 py-1 border rounded text-xs bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        <Button size="sm" onClick={onAddAction}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add action
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS (component not yet wired up)

**Step 3: Commit**

```bash
git add src/components/ui/actions-view-toolbar.jsx
git commit -m "feat: add ActionsViewToolbar with view toggle and group by"
```

---

## Task 4: Table View

**Files:**
- Create: `src/components/ui/actions-table-view.jsx`

**Step 1: Create table view component**

The table shows all actions in a sortable table with inline status/priority editing.

```jsx
// src/components/ui/actions-table-view.jsx
import { useState, useMemo } from "react"
import { ACTION_CHANNELS, ACTION_STATUSES, ACTION_PRIORITIES } from "../../data/actions-config"
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Tag from "./tag-custom"

const COLUMNS = [
  { key: "title", label: "Title", sortable: true },
  { key: "channel", label: "Channel", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "priority", label: "Priority", sortable: true },
  { key: "dates", label: "Dates", sortable: true },
  { key: "budget", label: "Budget", sortable: true },
  { key: "actions_col", label: "", sortable: false },
]

function sortActions(actions, sortColumn, sortDirection) {
  if (!sortColumn) return actions
  const sorted = [...actions]
  const dir = sortDirection === "asc" ? 1 : -1

  sorted.sort((a, b) => {
    switch (sortColumn) {
      case "title": return dir * (a.title || "").localeCompare(b.title || "")
      case "channel": return dir * (a.channel || "").localeCompare(b.channel || "")
      case "status": return dir * (a.status || "").localeCompare(b.status || "")
      case "priority": {
        const order = { critical: 0, high: 1, medium: 2, low: 3 }
        return dir * ((order[a.priority] ?? 2) - (order[b.priority] ?? 2))
      }
      case "dates": return dir * ((a.start_date || "") > (b.start_date || "") ? 1 : -1)
      case "budget": return dir * ((a.budget_estimated || 0) - (b.budget_estimated || 0))
      default: return 0
    }
  })
  return sorted
}

export default function ActionsTableView({ actions, onEdit, onDelete, onUpdateAction }) {
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState("asc")

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(key)
      setSortDirection("asc")
    }
  }

  const sorted = useMemo(
    () => sortActions(actions, sortColumn, sortDirection),
    [actions, sortColumn, sortDirection]
  )

  const handleInlineChange = (action, field, value) => {
    onUpdateAction(action.id, { [field]: value })
  }

  const SortIcon = ({ col }) => {
    if (sortColumn !== col) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/40" />
    return sortDirection === "asc"
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
        <p className="text-muted-foreground text-sm">No actions yet. Add your first action above.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 text-left text-[10px] uppercase font-semibold text-muted-foreground tracking-wide ${
                  col.sortable ? "cursor-pointer hover:text-foreground select-none" : ""
                }`}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && <SortIcon col={col.key} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((action, i) => {
            const channel = ACTION_CHANNELS[action.channel]
            const status = ACTION_STATUSES[action.status] || ACTION_STATUSES.todo
            const priority = ACTION_PRIORITIES[action.priority] || ACTION_PRIORITIES.medium

            return (
              <tr
                key={action.id}
                className={`border-t border-border hover:bg-muted/30 transition-colors ${
                  i % 2 === 0 ? "bg-card/50" : "bg-card"
                }`}
              >
                <td className="px-3 py-2.5 font-medium text-foreground max-w-[250px]">
                  <span className="line-clamp-1">{action.title}</span>
                </td>
                <td className="px-3 py-2.5">
                  {channel && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: `${channel.colorHex}15`, color: channel.colorHex }}
                    >
                      {channel.label}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={action.status || "todo"}
                    onChange={(e) => handleInlineChange(action, "status", e.target.value)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-border bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ color: status.colorHex }}
                  >
                    {Object.entries(ACTION_STATUSES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={action.priority || "medium"}
                    onChange={(e) => handleInlineChange(action, "priority", e.target.value)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-border bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ color: priority.colorHex }}
                  >
                    {Object.entries(ACTION_PRIORITIES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {action.start_date && new Date(action.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  {action.start_date && action.end_date && " \u2192 "}
                  {action.end_date && new Date(action.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </td>
                <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {action.budget_estimated > 0 && `${action.budget_estimated.toLocaleString()} ${action.currency || "EUR"}`}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(action)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete(action.id)}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/ui/actions-table-view.jsx
git commit -m "feat: add sortable table view for actions"
```

---

## Task 5: Compact ActionCard for Kanban

**Files:**
- Modify: `src/components/ui/action-card.jsx`

**Step 1: Add compact prop to ActionCard**

Add a `compact` boolean prop. When true, render a minimal card (title + channel badge + priority badge). Keep the existing full card as default.

Add this block right after the opening of the function, before the existing return:

```jsx
// Add compact prop to function signature:
// export default function ActionCard({ action, onEdit, onDelete, compact = false }) {

// Add compact render before the main return:
//  if (compact) {
//    return (
//      <div className="rounded-md border border-border bg-card p-2.5 space-y-1.5 hover:border-primary/30 transition-colors">
//        <p className="font-medium text-xs text-foreground line-clamp-2">{action.title}</p>
//        <div className="flex items-center gap-1 flex-wrap">
//          {channel && (
//            <span
//              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
//              style={{ backgroundColor: `${channel.colorHex}15`, color: channel.colorHex }}
//            >
//              {channel.label}
//            </span>
//          )}
//          <Tag variant={action.priority}>{priority.label}</Tag>
//        </div>
//      </div>
//    )
//  }
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/ui/action-card.jsx
git commit -m "feat: add compact variant to ActionCard for kanban"
```

---

## Task 6: Kanban View

**Files:**
- Create: `src/components/ui/actions-kanban-view.jsx`

**Step 1: Create kanban view component**

Uses @dnd-kit for drag & drop. Columns are generated from `groupBy` config. Dropping a card into a different column calls `onUpdateAction(id, { [field]: newValue })`.

```jsx
// src/components/ui/actions-kanban-view.jsx
import { useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useState } from "react"
import { groupActions, getGroupConfig, getGroupFieldName } from "../../utils/groupActions"
import ActionCard from "./action-card"

function SortableCard({ action, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: action.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ActionCard action={action} onEdit={onEdit} onDelete={onDelete} compact />
    </div>
  )
}

function KanbanColumn({ group, onEdit, onDelete }) {
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
      <div className="flex-1 rounded-b-lg border border-t-0 border-border bg-muted/20 p-2 space-y-2 min-h-[120px]">
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

export default function ActionsKanbanView({
  actions,
  groupBy,
  uuidToTeam,
  onEdit,
  onDelete,
  onUpdateAction,
}) {
  const [activeId, setActiveId] = useState(null)
  const groups = groupActions(actions, groupBy, uuidToTeam)
  const fieldName = getGroupFieldName(groupBy)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const findContainer = useCallback((id) => {
    for (const group of groups) {
      if (group.actions.some((a) => a.id === id)) return group.key
    }
    return null
  }, [groups])

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || !fieldName) return

    const activeContainer = findContainer(active.id)

    // Determine target container: could be an action id or a column droppable
    let overContainer = findContainer(over.id)
    if (!overContainer) {
      // over.id might be the column key itself
      const groupKeys = groups.map((g) => g.key)
      if (groupKeys.includes(over.id)) {
        overContainer = over.id
      }
    }

    if (!overContainer || activeContainer === overContainer) return

    onUpdateAction(active.id, { [fieldName]: overContainer })
  }, [findContainer, groups, fieldName, onUpdateAction])

  const activeAction = activeId ? actions.find((a) => a.id === activeId) : null

  if (actions.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
        <p className="text-muted-foreground text-sm">No actions yet. Add your first action above.</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {groups.map((group) => (
          <KanbanColumn
            key={group.key}
            group={group}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeAction ? <ActionCard action={activeAction} onEdit={() => {}} onDelete={() => {}} compact /> : null}
      </DragOverlay>
    </DndContext>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/ui/actions-kanban-view.jsx
git commit -m "feat: add kanban view with @dnd-kit drag & drop"
```

---

## Task 7: Gantt View

**Files:**
- Create: `src/components/ui/actions-gantt-view.jsx`

**Step 1: Create Gantt wrapper component**

Wraps `frappe-gantt` in a React component. Manages DOM ref, syncs props to instance. Handles `on_date_change` to call `onUpdateAction`.

```jsx
// src/components/ui/actions-gantt-view.jsx
import { useRef, useEffect, useMemo } from "react"
import Gantt from "frappe-gantt"
import { ACTION_CHANNELS, ACTION_STATUSES } from "../../data/actions-config"

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

export default function ActionsGanttView({ actions, onUpdateAction, onEdit }) {
  const containerRef = useRef(null)
  const ganttRef = useRef(null)
  const callbackRef = useRef({ onUpdateAction, onEdit })

  // Keep callbacks fresh without re-creating Gantt
  useEffect(() => {
    callbackRef.current = { onUpdateAction, onEdit }
  }, [onUpdateAction, onEdit])

  const scheduled = useMemo(() => toGanttTasks(actions), [actions])
  const unscheduled = useMemo(
    () => actions.filter((a) => !a.start_date || !a.end_date),
    [actions]
  )

  useEffect(() => {
    if (!containerRef.current || scheduled.length === 0) {
      ganttRef.current = null
      return
    }

    try {
      ganttRef.current = new Gantt(containerRef.current, scheduled, {
        view_mode: "Week",
        date_format: "YYYY-MM-DD",
        language: "fr",
        on_click: (task) => {
          const action = actions.find((a) => a.id === task.id)
          if (action) callbackRef.current.onEdit(action)
        },
        on_date_change: (task, start, end) => {
          const startStr = start.toISOString().split("T")[0]
          const endStr = end.toISOString().split("T")[0]
          callbackRef.current.onUpdateAction(task.id, {
            start_date: startStr,
            end_date: endStr,
          })
        },
        on_progress_change: () => {
          // Ignore native progress changes, we manage status separately
        },
      })
    } catch {
      ganttRef.current = null
    }

    return () => {
      ganttRef.current = null
    }
  }, [scheduled, actions])

  // Inject custom bar colors via CSS variables
  useEffect(() => {
    if (!containerRef.current) return
    const bars = containerRef.current.querySelectorAll(".bar-wrapper")
    bars.forEach((bar, i) => {
      if (scheduled[i]?._color) {
        const rect = bar.querySelector(".bar")
        if (rect) {
          rect.style.fill = scheduled[i]._color
          rect.style.opacity = "0.8"
        }
        const progress = bar.querySelector(".bar-progress")
        if (progress) {
          progress.style.fill = scheduled[i]._color
        }
      }
    })
  }, [scheduled])

  return (
    <div className="space-y-4">
      {scheduled.length > 0 ? (
        <div
          ref={containerRef}
          className="rounded-lg border border-border overflow-x-auto bg-card gantt-container"
        />
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No actions with dates yet. Add start and end dates to see the Gantt chart.
          </p>
        </div>
      )}

      {unscheduled.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
            Unscheduled ({unscheduled.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onEdit(a)}
                className="text-xs px-2.5 py-1 rounded-md border border-border bg-card hover:border-primary/40 transition-colors cursor-pointer text-foreground"
              >
                {a.title}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Click to edit and add dates.
          </p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add Gantt CSS overrides to index.css**

Append to `src/index.css`:

```css
/* Gantt overrides */
.gantt-container .gantt {
  background: transparent;
}
.gantt-container .grid-header {
  fill: hsl(var(--muted));
}
.gantt-container .grid-row {
  fill: transparent;
}
.gantt-container .grid-row:nth-child(even) {
  fill: hsl(var(--muted) / 0.3);
}
.gantt-container .lower-text, .gantt-container .upper-text {
  font-size: 11px;
  fill: hsl(var(--muted-foreground));
}
.gantt-container .bar-label {
  font-size: 11px;
  fill: white;
  font-weight: 600;
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/ui/actions-gantt-view.jsx src/index.css
git commit -m "feat: add interactive Gantt view with frappe-gantt"
```

---

## Task 8: Refactor ActionsStep as view container

**Files:**
- Modify: `src/components/steps/ActionsStep.jsx`

**Step 1: Refactor ActionsStep**

Replace the current card list with the toolbar + active view pattern. Keep progress summary, template suggestions, navigation, and form handling. Add `viewMode` and `groupBy` local state.

Key changes:
- Import `ActionsViewToolbar`, `ActionsTableView`, `ActionsKanbanView`, `ActionsGanttView`
- Add `useState` for `viewMode` (default "table") and `groupBy` (default "status")
- Build `uuidToTeam` map from `krStatuses` for team grouping
- Remove the per-objective grouping logic (replaced by view components)
- Render active view based on `viewMode`
- Keep: progress summary, template suggestions, ActionForm (inline), navigation buttons

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Verify in browser**

Navigate to `http://localhost:5173`, log in, go to Step 5. Verify:
- Toolbar appears with Table/Kanban/Gantt toggle
- Table view shows sortable columns
- Kanban shows columns grouped by status (default)
- Gantt shows timeline for actions with dates
- Group by dropdown changes Kanban/Table grouping
- Drag & drop works in Kanban (updates action field)
- Drag/resize works in Gantt (updates dates)
- Add action, edit, delete work in all views

**Step 4: Commit**

```bash
git add src/components/steps/ActionsStep.jsx
git commit -m "feat: refactor ActionsStep with table/kanban/gantt views"
```

---

## Task 9: Build, push, deploy

**Step 1: Full build verification**

Run: `npm run build`
Expected: PASS, no errors

**Step 2: Push to GitHub**

```bash
git push origin main
```

Expected: Vercel auto-deploys

**Step 3: Verify production**

Navigate to `https://okr-builder.vercel.app`, log in, go to Step 5.
Verify all 3 views work correctly.
