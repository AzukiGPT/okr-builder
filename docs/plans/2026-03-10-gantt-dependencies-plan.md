# Custom Gantt + Dependencies Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace frappe-gantt with a custom React Gantt component, add inter-action dependencies (FS/SS/FF/SF), and render dependency arrows as SVG overlays.

**Architecture:** Progressive 3-phase delivery. Phase 1 builds a custom Gantt in pure React (CSS Grid + Tailwind). Phase 2 adds an `action_dependencies` table with cascade propagation via topological sort. Phase 3 overlays SVG Bezier arrows for visual dependency links.

**Tech Stack:** React 19, CSS Grid, Tailwind v4, SVG, Supabase (Postgres + Edge Functions), Vite 7

**Design doc:** `docs/plans/2026-03-10-gantt-dependencies-design.md`

---

## Phase 1 — Custom Gantt Component

### Task 1: gantt-utils.js — Date math utilities

**Files:**
- Create: `src/components/ui/gantt/gantt-utils.js`

**Context:** This module provides all date/grid math for the Gantt chart. The existing `computeSchedule.js` handles phase-based scheduling. This module handles timeline rendering math: converting dates to pixel positions, computing grid columns, formatting date headers.

**Step 1: Create the gantt-utils module**

```javascript
// src/components/ui/gantt/gantt-utils.js

/**
 * Pure utility functions for the custom Gantt chart.
 * No React, no side effects — just date math and grid calculations.
 */

const MS_PER_DAY = 86_400_000

/** Parse a "YYYY-MM-DD" string into a Date at midnight UTC */
export function parseDate(str) {
  if (!str) return null
  const d = new Date(str + "T00:00:00")
  return isNaN(d.getTime()) ? null : d
}

/** Format a Date to "YYYY-MM-DD" */
export function formatDate(d) {
  return d.toISOString().split("T")[0]
}

/** Number of calendar days between two dates (inclusive of start, exclusive of end) */
export function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY)
}

/** Add calendar days to a date (returns new Date) */
export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Compute the visible timeline range from actions. Returns { start, end, totalDays }. */
export function computeTimelineRange(actions, paddingDays = 7) {
  let min = null
  let max = null

  for (const a of actions) {
    const s = parseDate(a.start_date)
    const e = parseDate(a.end_date)
    if (s && (!min || s < min)) min = s
    if (e && (!max || e > max)) max = e
  }

  if (!min || !max) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    min = today
    max = addDays(today, 90)
  }

  const start = addDays(min, -paddingDays)
  const end = addDays(max, paddingDays)

  return { start, end, totalDays: daysBetween(start, end) }
}

/** Zoom level configs */
export const ZOOM_LEVELS = {
  day: { label: "Day", columnWidth: 36, unit: "day" },
  week: { label: "Week", columnWidth: 120, unit: "week" },
  month: { label: "Month", columnWidth: 200, unit: "month" },
}

/** Convert a date to a pixel X offset within the timeline. */
export function dateToX(date, timelineStart, columnWidth, zoom) {
  const days = daysBetween(timelineStart, date)
  if (zoom === "week") return (days / 7) * columnWidth
  if (zoom === "month") return (days / 30) * columnWidth
  return days * columnWidth
}

/** Convert a pixel X offset back to a date. */
export function xToDate(x, timelineStart, columnWidth, zoom) {
  let days
  if (zoom === "week") days = Math.round((x / columnWidth) * 7)
  else if (zoom === "month") days = Math.round((x / columnWidth) * 30)
  else days = Math.round(x / columnWidth)
  return addDays(timelineStart, days)
}

/** Compute bar position { left, width } in pixels for an action. */
export function computeBarPosition(action, timelineStart, columnWidth, zoom) {
  const start = parseDate(action.start_date)
  const end = parseDate(action.end_date)
  if (!start || !end) return null

  const left = dateToX(start, timelineStart, columnWidth, zoom)
  const right = dateToX(end, timelineStart, columnWidth, zoom)
  const width = Math.max(right - left, columnWidth * 0.3) // min width

  return { left, width }
}

/** Generate header labels for the timeline. Returns array of { label, x, width }. */
export function generateHeaderCells(timelineStart, totalDays, columnWidth, zoom) {
  const cells = []

  if (zoom === "day") {
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(timelineStart, i)
      const dow = d.getDay()
      cells.push({
        label: d.getDate().toString(),
        x: i * columnWidth,
        width: columnWidth,
        isWeekend: dow === 0 || dow === 6,
        date: d,
      })
    }
  } else if (zoom === "week") {
    const totalWeeks = Math.ceil(totalDays / 7)
    for (let i = 0; i < totalWeeks; i++) {
      const d = addDays(timelineStart, i * 7)
      const weekEnd = addDays(d, 6)
      cells.push({
        label: `${d.getDate()}/${d.getMonth() + 1} – ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
        x: i * columnWidth,
        width: columnWidth,
        isWeekend: false,
        date: d,
      })
    }
  } else {
    const totalMonths = Math.ceil(totalDays / 30)
    for (let i = 0; i < totalMonths; i++) {
      const d = addDays(timelineStart, i * 30)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      cells.push({
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        x: i * columnWidth,
        width: columnWidth,
        isWeekend: false,
        date: d,
      })
    }
  }

  return cells
}

/** Compute the "today" marker X position. Returns null if today is outside the range. */
export function todayMarkerX(timelineStart, totalDays, columnWidth, zoom) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysFromStart = daysBetween(timelineStart, today)
  if (daysFromStart < 0 || daysFromStart > totalDays) return null
  return dateToX(today, timelineStart, columnWidth, zoom)
}

/** Group actions by phase for the Gantt rows. Returns [{ phase, actions }]. */
export function groupActionsByPhase(actions, phases) {
  const phaseMap = new Map()
  const unassigned = []

  for (const phase of (phases || []).sort((a, b) => a.position - b.position)) {
    phaseMap.set(phase.id, { phase, actions: [] })
  }

  for (const action of actions) {
    if (action.phase_id && phaseMap.has(action.phase_id)) {
      phaseMap.get(action.phase_id).actions.push(action)
    } else {
      unassigned.push(action)
    }
  }

  const groups = [...phaseMap.values()]
  if (unassigned.length > 0) {
    groups.push({
      phase: { id: "unassigned", name: "Unassigned", color_hex: "#6B7280", position: 999 },
      actions: unassigned,
    })
  }

  return groups
}
```

**Step 2: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds (file is not imported yet, tree-shaken out)

**Step 3: Commit**

```bash
git add src/components/ui/gantt/gantt-utils.js
git commit -m "feat(gantt): add date math utility module for custom Gantt"
```

---

### Task 2: GanttHeader.jsx — Date header row

**Files:**
- Create: `src/components/ui/gantt/GanttHeader.jsx`

**Context:** This is the sticky top header that shows date labels. It receives pre-computed `cells` from `generateHeaderCells` and the timeline width. The header sticks to the top during vertical scroll.

**Step 1: Create the header component**

```jsx
// src/components/ui/gantt/GanttHeader.jsx
import { todayMarkerX } from "./gantt-utils"

export default function GanttHeader({ cells, timelineWidth, timelineStart, totalDays, columnWidth, zoom }) {
  const todayX = todayMarkerX(timelineStart, totalDays, columnWidth, zoom)

  return (
    <div
      className="sticky top-0 z-20 flex border-b border-border bg-card"
      style={{ width: timelineWidth }}
    >
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`shrink-0 border-r border-border px-1 py-2 text-center text-[10px] font-medium text-muted-foreground select-none ${
            cell.isWeekend ? "bg-muted/40" : ""
          }`}
          style={{ width: cell.width }}
        >
          {cell.label}
        </div>
      ))}

      {/* Today marker */}
      {todayX != null && (
        <div
          className="absolute top-0 bottom-0 w-px bg-primary z-30 pointer-events-none"
          style={{ left: todayX }}
        >
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/gantt/GanttHeader.jsx
git commit -m "feat(gantt): add GanttHeader date labels component"
```

---

### Task 3: GanttBar.jsx — Action bar with drag

**Files:**
- Create: `src/components/ui/gantt/GanttBar.jsx`

**Context:** Each action renders as a horizontal bar. Supports 3 drag modes: move (body), resize-left (left edge), resize-right (right edge). Uses native `onPointerDown`/`onPointerMove`/`onPointerUp` for dragging. Calls `onUpdateAction(id, { start_date, end_date })` when drag ends.

**Step 1: Create the bar component**

```jsx
// src/components/ui/gantt/GanttBar.jsx
import { useState, useRef, useCallback } from "react"
import { ACTION_STATUSES } from "../../../data/actions-config"
import { xToDate, formatDate } from "./gantt-utils"

const ROW_HEIGHT = 40
const EDGE_WIDTH = 6

export default function GanttBar({
  action,
  left,
  width,
  phaseColor,
  timelineStart,
  columnWidth,
  zoom,
  onUpdateAction,
  onEdit,
}) {
  const [dragState, setDragState] = useState(null) // { mode, startX, origLeft, origWidth }
  const barRef = useRef(null)

  const statusCfg = ACTION_STATUSES[action.status]

  const handlePointerDown = useCallback((e, mode) => {
    e.preventDefault()
    e.stopPropagation()
    barRef.current?.setPointerCapture(e.pointerId)
    setDragState({
      mode,
      startX: e.clientX,
      origLeft: left,
      origWidth: width,
    })
  }, [left, width])

  const handlePointerMove = useCallback((e) => {
    if (!dragState) return
    const dx = e.clientX - dragState.startX
    let newLeft = dragState.origLeft
    let newWidth = dragState.origWidth

    if (dragState.mode === "move") {
      newLeft = dragState.origLeft + dx
    } else if (dragState.mode === "resize-right") {
      newWidth = Math.max(dragState.origWidth + dx, columnWidth * 0.3)
    } else if (dragState.mode === "resize-left") {
      newLeft = dragState.origLeft + dx
      newWidth = Math.max(dragState.origWidth - dx, columnWidth * 0.3)
    }

    setDragState((prev) => ({ ...prev, currentLeft: newLeft, currentWidth: newWidth }))
  }, [dragState, columnWidth])

  const handlePointerUp = useCallback((e) => {
    if (!dragState) return
    barRef.current?.releasePointerCapture(e.pointerId)

    const finalLeft = dragState.currentLeft ?? dragState.origLeft
    const finalWidth = dragState.currentWidth ?? dragState.origWidth

    const newStart = xToDate(finalLeft, timelineStart, columnWidth, zoom)
    const newEnd = xToDate(finalLeft + finalWidth, timelineStart, columnWidth, zoom)

    setDragState(null)

    if (finalLeft !== dragState.origLeft || finalWidth !== dragState.origWidth) {
      onUpdateAction(action.id, {
        start_date: formatDate(newStart),
        end_date: formatDate(newEnd),
      })
    }
  }, [dragState, timelineStart, columnWidth, zoom, onUpdateAction, action.id])

  const displayLeft = dragState?.currentLeft ?? left
  const displayWidth = dragState?.currentWidth ?? width

  return (
    <div
      ref={barRef}
      className="absolute flex items-center group"
      style={{
        left: displayLeft,
        width: displayWidth,
        top: 4,
        height: ROW_HEIGHT - 8,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Ghost bar showing original position during drag */}
      {dragState && (
        <div
          className="absolute rounded-md border border-dashed border-muted-foreground/30 pointer-events-none"
          style={{ left: left - displayLeft, width, top: 0, bottom: 0 }}
        />
      )}

      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 cursor-ew-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: EDGE_WIDTH }}
        onPointerDown={(e) => handlePointerDown(e, "resize-left")}
      />

      {/* Bar body */}
      <div
        className="w-full h-full rounded-md flex items-center gap-1.5 px-2 cursor-grab active:cursor-grabbing overflow-hidden select-none"
        style={{
          backgroundColor: `${phaseColor}20`,
          borderLeft: `3px solid ${phaseColor}`,
        }}
        onPointerDown={(e) => handlePointerDown(e, "move")}
        onDoubleClick={() => onEdit(action)}
      >
        {/* Status dot */}
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: statusCfg?.colorHex || "#6B7280" }}
        />
        {/* Title */}
        <span className="text-[11px] text-foreground truncate leading-tight">
          {action.title}
        </span>
      </div>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 cursor-ew-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: EDGE_WIDTH }}
        onPointerDown={(e) => handlePointerDown(e, "resize-right")}
      />
    </div>
  )
}

export { ROW_HEIGHT }
```

**Step 2: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/gantt/GanttBar.jsx
git commit -m "feat(gantt): add GanttBar with move/resize drag interactions"
```

---

### Task 4: GanttPhaseGroup.jsx — Collapsible phase rows

**Files:**
- Create: `src/components/ui/gantt/GanttPhaseGroup.jsx`

**Context:** Groups action bars under a colored phase header. Click the header to collapse/expand the group. Each action row is 40px tall. The phase header spans the full timeline width.

**Step 1: Create the phase group component**

```jsx
// src/components/ui/gantt/GanttPhaseGroup.jsx
import { useState, useMemo } from "react"
import { ChevronRight } from "lucide-react"
import GanttBar from "./GanttBar"
import { computeBarPosition } from "./gantt-utils"
import { ROW_HEIGHT } from "./GanttBar"

export default function GanttPhaseGroup({
  phase,
  actions,
  timelineStart,
  timelineWidth,
  columnWidth,
  zoom,
  onUpdateAction,
  onEdit,
}) {
  const [collapsed, setCollapsed] = useState(false)

  const bars = useMemo(() => {
    return actions
      .map((action) => {
        const pos = computeBarPosition(action, timelineStart, columnWidth, zoom)
        if (!pos) return null
        return { action, ...pos }
      })
      .filter(Boolean)
  }, [actions, timelineStart, columnWidth, zoom])

  const scheduledCount = bars.length
  const totalCount = actions.length

  return (
    <div>
      {/* Phase header */}
      <div
        className="sticky left-0 flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none z-10 border-b border-border"
        style={{ backgroundColor: `${phase.color_hex}15` }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`}
        />
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: phase.color_hex }}
        />
        <span className="text-xs font-semibold text-foreground">{phase.name}</span>
        <span className="text-[10px] text-muted-foreground">
          {scheduledCount}/{totalCount}
        </span>
      </div>

      {/* Action rows */}
      {!collapsed && (
        <div>
          {actions.map((action) => {
            const bar = bars.find((b) => b.action.id === action.id)
            return (
              <div
                key={action.id}
                className="relative border-b border-border/50"
                style={{ height: ROW_HEIGHT, width: timelineWidth }}
              >
                {bar && (
                  <GanttBar
                    action={bar.action}
                    left={bar.left}
                    width={bar.width}
                    phaseColor={phase.color_hex}
                    timelineStart={timelineStart}
                    columnWidth={columnWidth}
                    zoom={zoom}
                    onUpdateAction={onUpdateAction}
                    onEdit={onEdit}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/gantt/GanttPhaseGroup.jsx
git commit -m "feat(gantt): add GanttPhaseGroup collapsible rows"
```

---

### Task 5: GanttChart.jsx — Main container

**Files:**
- Create: `src/components/ui/gantt/GanttChart.jsx`

**Context:** The main Gantt component that assembles header, phase groups, and scroll container. Receives `actions`, `phases`, callbacks. Manages zoom state, computes timeline range, renders the full chart. Also renders the sticky left-side action titles column.

**Step 1: Create the chart container**

```jsx
// src/components/ui/gantt/GanttChart.jsx
import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { Calendar, ZoomIn, ZoomOut, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import GanttHeader from "./GanttHeader"
import GanttPhaseGroup from "./GanttPhaseGroup"
import {
  computeTimelineRange,
  generateHeaderCells,
  groupActionsByPhase,
  todayMarkerX,
  ZOOM_LEVELS,
  dateToX,
} from "./gantt-utils"
import { ROW_HEIGHT } from "./GanttBar"

const TITLE_COL_WIDTH = 200

export default function GanttChart({ actions, phases, onUpdateAction, onEdit }) {
  const [zoom, setZoom] = useState("week")
  const scrollRef = useRef(null)

  const zoomCfg = ZOOM_LEVELS[zoom]
  const { columnWidth } = zoomCfg

  // Compute timeline range from all scheduled actions
  const { start: timelineStart, end: timelineEnd, totalDays } = useMemo(
    () => computeTimelineRange(actions),
    [actions]
  )

  // Header cells
  const cells = useMemo(
    () => generateHeaderCells(timelineStart, totalDays, columnWidth, zoom),
    [timelineStart, totalDays, columnWidth, zoom]
  )

  const timelineWidth = useMemo(() => {
    if (cells.length === 0) return 800
    const last = cells[cells.length - 1]
    return last.x + last.width
  }, [cells])

  // Group actions by phase
  const groups = useMemo(() => groupActionsByPhase(actions, phases), [actions, phases])

  // Scroll to today on mount
  const scrolledRef = useRef(false)
  useEffect(() => {
    if (scrolledRef.current || !scrollRef.current) return
    scrolledRef.current = true
    const tx = todayMarkerX(timelineStart, totalDays, columnWidth, zoom)
    if (tx != null) {
      scrollRef.current.scrollLeft = Math.max(0, tx - scrollRef.current.clientWidth / 3)
    }
  }, [timelineStart, totalDays, columnWidth, zoom])

  const handleScrollToToday = useCallback(() => {
    if (!scrollRef.current) return
    const tx = todayMarkerX(timelineStart, totalDays, columnWidth, zoom)
    if (tx != null) {
      scrollRef.current.scrollTo({ left: Math.max(0, tx - scrollRef.current.clientWidth / 3), behavior: "smooth" })
    }
  }, [timelineStart, totalDays, columnWidth, zoom])

  const zoomKeys = Object.keys(ZOOM_LEVELS)
  const currentIndex = zoomKeys.indexOf(zoom)

  const handleZoomIn = useCallback(() => {
    if (currentIndex > 0) setZoom(zoomKeys[currentIndex - 1])
  }, [currentIndex, zoomKeys])

  const handleZoomOut = useCallback(() => {
    if (currentIndex < zoomKeys.length - 1) setZoom(zoomKeys[currentIndex + 1])
  }, [currentIndex, zoomKeys])

  const scheduledActions = actions.filter((a) => a.start_date && a.end_date)

  if (scheduledActions.length === 0 && actions.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
        <p className="text-muted-foreground text-sm">
          No actions yet. Add actions to see the Gantt chart.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {zoomKeys.map((key) => (
            <Button
              key={key}
              variant={zoom === key ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setZoom(key)}
            >
              {ZOOM_LEVELS[key].label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleZoomIn}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleZoomOut}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={handleScrollToToday}>
            <Calendar className="w-3.5 h-3.5" />
            Today
          </Button>
        </div>
      </div>

      {/* Chart area */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex">
          {/* Sticky left title column */}
          <div
            className="shrink-0 border-r border-border bg-card z-20 sticky left-0"
            style={{ width: TITLE_COL_WIDTH }}
          >
            {/* Header spacer */}
            <div className="h-[33px] border-b border-border flex items-center px-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Action</span>
            </div>
            {/* Phase groups titles */}
            {groups.map((group) => (
              <div key={group.phase.id}>
                {/* Phase header row */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 border-b border-border"
                  style={{ backgroundColor: `${group.phase.color_hex}15` }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: group.phase.color_hex }}
                  />
                  <span className="text-xs font-semibold text-foreground truncate">{group.phase.name}</span>
                </div>
                {/* Action title rows */}
                {group.actions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center px-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onEdit(action)}
                  >
                    <span className="text-[11px] text-foreground truncate">{action.title}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Scrollable timeline area */}
          <div ref={scrollRef} className="overflow-x-auto flex-1">
            <div style={{ width: timelineWidth, minWidth: "100%" }}>
              {/* Header */}
              <GanttHeader
                cells={cells}
                timelineWidth={timelineWidth}
                timelineStart={timelineStart}
                totalDays={totalDays}
                columnWidth={columnWidth}
                zoom={zoom}
              />

              {/* Phase groups with bars */}
              {groups.map((group) => (
                <GanttPhaseGroup
                  key={group.phase.id}
                  phase={group.phase}
                  actions={group.actions}
                  timelineStart={timelineStart}
                  timelineWidth={timelineWidth}
                  columnWidth={columnWidth}
                  zoom={zoom}
                  onUpdateAction={onUpdateAction}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        {(phases || []).map((p) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color_hex }} />
            <span className="text-[10px] text-muted-foreground">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/gantt/GanttChart.jsx
git commit -m "feat(gantt): add GanttChart main container with zoom, scroll, phase groups"
```

---

### Task 6: Replace frappe-gantt in actions-gantt-view.jsx

**Files:**
- Modify: `src/components/ui/actions-gantt-view.jsx`
- Delete: `src/styles/frappe-gantt.css`

**Context:** The current `actions-gantt-view.jsx` imports `frappe-gantt` and `frappe-gantt.css`. Replace the entire file to use the new `<GanttChart />`. The `computeSchedule` integration stays — it auto-schedules actions before passing to the chart.

**Step 1: Rewrite actions-gantt-view.jsx**

Replace the entire content of `src/components/ui/actions-gantt-view.jsx` with:

```jsx
// src/components/ui/actions-gantt-view.jsx
import { useMemo } from "react"
import { computeSchedule } from "../../utils/computeSchedule"
import GanttChart from "./gantt/GanttChart"

export default function ActionsGanttView({ actions, phases, onUpdateAction, onEdit }) {
  // Auto-schedule actions that don't have dates using phase order
  const scheduled = useMemo(
    () => (phases?.length > 0 ? computeSchedule(phases, actions) : actions),
    [phases, actions]
  )

  // Split into scheduled (have dates) and unscheduled
  const withDates = useMemo(() => scheduled.filter((a) => a.start_date && a.end_date), [scheduled])
  const withoutDates = useMemo(() => scheduled.filter((a) => !a.start_date || !a.end_date), [scheduled])

  return (
    <div className="space-y-4">
      <GanttChart
        actions={withDates}
        phases={phases}
        onUpdateAction={onUpdateAction}
        onEdit={onEdit}
      />

      {withoutDates.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
            Unscheduled ({withoutDates.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {withoutDates.map((a) => (
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
          <p className="text-[10px] text-muted-foreground">Click to edit and add dates.</p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Delete frappe-gantt.css**

```bash
rm src/styles/frappe-gantt.css
```

**Step 3: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds. The `frappe-gantt` package is still in `package.json` but is now unused (tree-shaken out).

**Step 4: Remove frappe-gantt from package.json**

```bash
cd "/Users/tomhalimi/Desktop/OKR Builder" && npm uninstall frappe-gantt
```

**Step 5: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(gantt): replace frappe-gantt with custom React Gantt component

- Remove frappe-gantt dependency and CSS
- Use GanttChart with CSS Grid, phase groups, zoom, drag
- Preserve auto-schedule via computeSchedule integration"
```

---

### Task 7: Visual polish and build verification

**Files:**
- Modify: `src/components/ui/gantt/GanttChart.jsx` (if needed)
- Modify: `src/components/ui/gantt/GanttBar.jsx` (if needed)

**Context:** Deploy and verify the Phase 1 Gantt visually in the browser. Fix any layout issues, scrolling bugs, or visual glitches.

**Step 1: Run dev server and test**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run dev`

Open browser, navigate to an OKR set with actions, go to the Actions step, switch to Gantt view. Verify:
- Phase groups are displayed with colored headers
- Action bars are positioned correctly
- Zoom Day/Week/Month switches work
- "Today" button scrolls to the marker
- Drag-to-move works
- Drag-to-resize works
- Double-click opens edit form
- Unscheduled actions section shows actions without dates
- Left title column stays sticky during horizontal scroll

**Step 2: Fix any issues found**

Address layout/scroll/drag bugs. Common fixes:
- If bars overlap: check `computeBarPosition` math
- If scroll is broken: verify `overflow-x-auto` on the scroll container
- If left column doesn't stick: verify `sticky left-0 z-20` classes

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit if changes made**

```bash
git add -A
git commit -m "fix(gantt): visual polish for Phase 1 custom Gantt"
```

**Step 5: Deploy**

```bash
npx vercel --prod
```

---

## Phase 2 — Dependencies Data Model

### Task 8: Database migration for action_dependencies

**Files:**
- Create: `supabase/migrations/20260310_action_dependencies.sql`

**Context:** This SQL must be run in the Supabase SQL editor. It creates the `action_dependencies` table with RLS policies. The table supports 4 dependency types: FS, SS, FF, SF, with a lag_days field.

**Step 1: Create the migration file**

```sql
-- supabase/migrations/20260310_action_dependencies.sql

-- Dependencies between actions
CREATE TABLE IF NOT EXISTS public.action_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  successor_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  dep_type text NOT NULL DEFAULT 'FS'
    CHECK (dep_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (predecessor_id, successor_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_action_deps_predecessor ON public.action_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_action_deps_successor ON public.action_dependencies(successor_id);

-- RLS
ALTER TABLE public.action_dependencies ENABLE ROW LEVEL SECURITY;

-- Anyone can read (filtered by set access at the API layer)
CREATE POLICY "deps_select" ON public.action_dependencies FOR SELECT USING (true);

-- Authenticated users can insert/update/delete (API layer checks set access)
CREATE POLICY "deps_insert" ON public.action_dependencies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "deps_update" ON public.action_dependencies FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "deps_delete" ON public.action_dependencies FOR DELETE
  USING (auth.role() = 'authenticated');
```

**Step 2: Run in Supabase SQL editor**

Navigate to Supabase dashboard → SQL Editor → paste and run.
Expected: "Success. No rows returned"

**Step 3: Commit**

```bash
git add supabase/migrations/20260310_action_dependencies.sql
git commit -m "feat(deps): add action_dependencies table migration"
```

---

### Task 9: API endpoint for dependencies

**Files:**
- Create: `api/action-dependencies.js`

**Context:** Same patterns as `api/actions.js` and `api/action-phases.js`: Edge runtime, `getUser`, `checkSetAccess`, CORS headers. Supports GET (by set_id), POST (create with circular check), DELETE.

**Step 1: Create the API endpoint**

```javascript
// api/action-dependencies.js
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
      .from("okr_sets")
      .select("id")
      .eq("id", setId)
      .eq("user_id", userId)
      .maybeSingle()

    if (!legacySet) return { allowed: false, role: null }
    return { allowed: true, role: "owner" }
  }

  const roleHierarchy = { owner: 3, editor: 2, viewer: 1 }
  const userLevel = roleHierarchy[member.role] || 0
  const requiredLevel = roleHierarchy[minRole] || 0

  return { allowed: userLevel >= requiredLevel, role: member.role }
}

/** BFS check for circular dependency */
async function wouldCreateCycle(predecessorId, successorId) {
  // Check: can we reach predecessorId by following successors from successorId?
  const visited = new Set()
  const queue = [successorId]

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === predecessorId) return true
    if (visited.has(current)) continue
    visited.add(current)

    const { data: deps } = await supabaseAdmin
      .from("action_dependencies")
      .select("successor_id")
      .eq("predecessor_id", current)

    for (const dep of deps || []) {
      queue.push(dep.successor_id)
    }
  }

  return false
}

// ─── GET ─────────────────────────────────────────────────────
async function handleGet(req, user) {
  const url = new URL(req.url)
  const setId = url.searchParams.get("set_id")
  if (!setId) return json({ error: "Missing set_id parameter" }, 400, req)

  const access = await checkSetAccess(user.id, setId, "viewer")
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  // Get all action IDs for this set
  const { data: setActions } = await supabaseAdmin
    .from("actions")
    .select("id")
    .eq("set_id", setId)

  const actionIds = (setActions || []).map((a) => a.id)
  if (actionIds.length === 0) return json({ data: [] }, 200, req)

  // Get all dependencies where predecessor or successor is in this set
  const { data: deps, error } = await supabaseAdmin
    .from("action_dependencies")
    .select("*")
    .or(`predecessor_id.in.(${actionIds.join(",")}),successor_id.in.(${actionIds.join(",")})`)

  if (error) return json({ error: error.message }, 500, req)

  return json({ data: deps || [] }, 200, req)
}

// ─── POST ────────────────────────────────────────────────────
async function handlePost(req, user) {
  const body = await req.json()
  const { predecessor_id, successor_id, dep_type, lag_days } = body

  if (!predecessor_id || !successor_id) {
    return json({ error: "Missing predecessor_id or successor_id" }, 400, req)
  }

  if (predecessor_id === successor_id) {
    return json({ error: "Cannot create self-dependency" }, 400, req)
  }

  // Check both actions exist and belong to same set
  const { data: predAction } = await supabaseAdmin
    .from("actions")
    .select("set_id")
    .eq("id", predecessor_id)
    .single()

  const { data: succAction } = await supabaseAdmin
    .from("actions")
    .select("set_id")
    .eq("id", successor_id)
    .single()

  if (!predAction || !succAction) {
    return json({ error: "Action not found" }, 404, req)
  }

  if (predAction.set_id !== succAction.set_id) {
    return json({ error: "Actions must belong to the same set" }, 400, req)
  }

  const access = await checkSetAccess(user.id, predAction.set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  // Check for circular dependency
  const isCyclic = await wouldCreateCycle(predecessor_id, successor_id)
  if (isCyclic) {
    return json({ error: "This dependency would create a circular reference" }, 400, req)
  }

  const { data: dep, error } = await supabaseAdmin
    .from("action_dependencies")
    .insert({
      predecessor_id,
      successor_id,
      dep_type: dep_type || "FS",
      lag_days: lag_days || 0,
    })
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      return json({ error: "This dependency already exists" }, 409, req)
    }
    return json({ error: error.message }, 500, req)
  }

  return json({ data: dep }, 201, req)
}

// ─── DELETE ──────────────────────────────────────────────────
async function handleDelete(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  // Get the dependency to check access
  const { data: dep } = await supabaseAdmin
    .from("action_dependencies")
    .select("predecessor_id")
    .eq("id", id)
    .single()

  if (!dep) return json({ error: "Not found" }, 404, req)

  // Get the set_id from the predecessor action
  const { data: action } = await supabaseAdmin
    .from("actions")
    .select("set_id")
    .eq("id", dep.predecessor_id)
    .single()

  if (!action) return json({ error: "Action not found" }, 404, req)

  const access = await checkSetAccess(user.id, action.set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const { error } = await supabaseAdmin
    .from("action_dependencies")
    .delete()
    .eq("id", id)

  if (error) return json({ error: error.message }, 500, req)
  return json({ success: true }, 200, req)
}

// ─── Router ──────────────────────────────────────────────────
export default async function handler(req) {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const user = await getUser(req)
  if (!user) return json({ error: "Unauthorized" }, 401, req)

  switch (req.method) {
    case "GET": return handleGet(req, user)
    case "POST": return handlePost(req, user)
    case "DELETE": return handleDelete(req, user)
    default: return json({ error: "Method not allowed" }, 405, req)
  }
}
```

**Step 2: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds (API files are not bundled by Vite, they're Edge Functions)

**Step 3: Commit**

```bash
git add api/action-dependencies.js
git commit -m "feat(deps): add action-dependencies API endpoint with cycle detection"
```

---

### Task 10: API client + useDependencies hook

**Files:**
- Modify: `src/lib/api.js` — Add 3 dependency methods
- Create: `src/hooks/useDependencies.js`

**Context:** Same patterns as `usePhases.js` and `useActions.js`. The hook fetches all dependencies for a set, provides CRUD, and exposes a flat array + lookup maps.

**Step 1: Add API methods to src/lib/api.js**

Add these 3 lines after the `deletePhase` line (line 35) and before `listKRStatuses`:

```javascript
  listDependencies: (setId) => apiFetch(`/action-dependencies?set_id=${setId}`),
  createDependency: (payload) => apiFetch("/action-dependencies", { method: "POST", body: JSON.stringify(payload) }),
  deleteDependency: (id) => apiFetch(`/action-dependencies?id=${id}`, { method: "DELETE" }),
```

**Step 2: Create useDependencies hook**

```javascript
// src/hooks/useDependencies.js
import { useState, useCallback, useEffect } from "react"
import { api } from "../lib/api"

export function useDependencies(activeSetId) {
  const [dependencies, setDependencies] = useState([])
  const [depsLoading, setDepsLoading] = useState(false)

  const loadDependencies = useCallback(async () => {
    if (!activeSetId) {
      setDependencies([])
      return
    }
    setDepsLoading(true)
    try {
      const { data } = await api.listDependencies(activeSetId)
      setDependencies(data || [])
    } catch {
      setDependencies([])
    } finally {
      setDepsLoading(false)
    }
  }, [activeSetId])

  useEffect(() => {
    loadDependencies()
  }, [loadDependencies])

  const createDependency = useCallback(async (payload) => {
    const { data } = await api.createDependency(payload)
    setDependencies((prev) => [...prev, data])
    return data
  }, [])

  const deleteDependency = useCallback(async (id) => {
    await api.deleteDependency(id)
    setDependencies((prev) => prev.filter((d) => d.id !== id))
  }, [])

  return {
    dependencies,
    depsLoading,
    loadDependencies,
    createDependency,
    deleteDependency,
  }
}
```

**Step 3: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/lib/api.js src/hooks/useDependencies.js
git commit -m "feat(deps): add API client methods and useDependencies hook"
```

---

### Task 11: Update computeSchedule to respect dependencies

**Files:**
- Modify: `src/utils/computeSchedule.js`

**Context:** The current scheduler only uses phase order. We need to add dependency-aware scheduling. The updated function accepts an optional `dependencies` array. When present, it runs a topological sort and respects FS/SS/FF/SF constraints with lag_days. Phase ordering is a secondary constraint.

**Step 1: Rewrite computeSchedule.js**

Replace the entire content of `src/utils/computeSchedule.js` with:

```javascript
/**
 * Compute auto-scheduled dates for actions based on phase order AND dependencies.
 *
 * Priority: explicit dependencies > phase ordering > manual dates.
 *
 * @param {Array} phases - sorted by position ascending
 * @param {Array} actions - all actions for the set
 * @param {string} startDate - ISO date string for the project start (defaults to today)
 * @param {Array} dependencies - optional array of { predecessor_id, successor_id, dep_type, lag_days }
 * @returns {Array} actions with computed start_date and end_date
 */
export function computeSchedule(phases, actions, startDate, dependencies) {
  const projectStart = startDate ? new Date(startDate) : new Date()
  projectStart.setHours(0, 0, 0, 0)

  // Phase-based scheduling first (produces initial dates)
  const phaseScheduled = scheduleByPhases(phases, actions, projectStart)

  // If no dependencies, return phase-only schedule
  if (!dependencies || dependencies.length === 0) {
    return phaseScheduled
  }

  // Dependency-aware scheduling on top
  return scheduleByDependencies(phaseScheduled, dependencies)
}

/** Phase-based scheduling (original logic). */
function scheduleByPhases(phases, actions, projectStart) {
  const sortedPhases = [...phases].sort((a, b) => a.position - b.position)

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

    currentStart = addBusinessDays(maxEnd, 1)
  }

  return actions.map((action) => {
    const dates = scheduled.get(action.id)
    if (dates) return { ...action, ...dates }
    return action
  })
}

/** Dependency-aware scheduling using topological sort. */
function scheduleByDependencies(actions, dependencies) {
  const actionMap = new Map(actions.map((a) => [a.id, { ...a }]))

  // Build adjacency list: predecessor → [{ successor_id, dep_type, lag_days }]
  const graph = new Map()
  const inDegree = new Map()

  for (const a of actions) {
    graph.set(a.id, [])
    inDegree.set(a.id, 0)
  }

  for (const dep of dependencies) {
    if (!graph.has(dep.predecessor_id) || !graph.has(dep.successor_id)) continue
    graph.get(dep.predecessor_id).push(dep)
    inDegree.set(dep.successor_id, (inDegree.get(dep.successor_id) || 0) + 1)
  }

  // Topological sort (Kahn's algorithm)
  const queue = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted = []
  while (queue.length > 0) {
    const id = queue.shift()
    sorted.push(id)

    for (const dep of graph.get(id) || []) {
      const newDeg = (inDegree.get(dep.successor_id) || 1) - 1
      inDegree.set(dep.successor_id, newDeg)
      if (newDeg === 0) queue.push(dep.successor_id)
    }
  }

  // Process in topological order — apply dependency constraints
  for (const id of sorted) {
    const action = actionMap.get(id)
    if (!action) continue

    // Collect all predecessor constraints
    const predecessorDeps = dependencies.filter((d) => d.successor_id === id)
    if (predecessorDeps.length === 0) continue

    let earliestStart = null
    let earliestEnd = null

    for (const dep of predecessorDeps) {
      const pred = actionMap.get(dep.predecessor_id)
      if (!pred?.start_date || !pred?.end_date) continue

      const predStart = new Date(pred.start_date)
      const predEnd = new Date(pred.end_date)
      const lag = dep.lag_days || 0

      let constrainedDate
      switch (dep.dep_type) {
        case "FS": // successor starts after predecessor finishes + lag
          constrainedDate = addBusinessDays(predEnd, lag + 1)
          if (!earliestStart || constrainedDate > earliestStart) earliestStart = constrainedDate
          break
        case "SS": // successor starts when predecessor starts + lag
          constrainedDate = addBusinessDays(predStart, lag)
          if (!earliestStart || constrainedDate > earliestStart) earliestStart = constrainedDate
          break
        case "FF": // successor finishes when predecessor finishes + lag
          constrainedDate = addBusinessDays(predEnd, lag)
          if (!earliestEnd || constrainedDate > earliestEnd) earliestEnd = constrainedDate
          break
        case "SF": // successor finishes when predecessor starts + lag
          constrainedDate = addBusinessDays(predStart, lag)
          if (!earliestEnd || constrainedDate > earliestEnd) earliestEnd = constrainedDate
          break
      }
    }

    // Apply constraints
    const duration = action.estimated_days || 5
    const currentStart = action.start_date ? new Date(action.start_date) : null
    const currentEnd = action.end_date ? new Date(action.end_date) : null

    if (earliestStart) {
      // FS or SS constraint: shift start if needed
      if (!currentStart || earliestStart > currentStart) {
        action.start_date = formatDate(earliestStart)
        action.end_date = formatDate(addBusinessDays(earliestStart, duration))
      }
    }

    if (earliestEnd) {
      // FF or SF constraint: shift end if needed, then backfill start
      if (!currentEnd || earliestEnd > currentEnd) {
        action.end_date = formatDate(earliestEnd)
        // Backfill start from end - duration
        const backStart = addBusinessDays(earliestEnd, -duration)
        if (!action.start_date || backStart > new Date(action.start_date)) {
          action.start_date = formatDate(backStart)
        }
      }
    }
  }

  return actions.map((a) => actionMap.get(a.id) || a)
}

function addBusinessDays(date, days) {
  const result = new Date(date)
  if (days === 0) return result
  const direction = days > 0 ? 1 : -1
  let added = 0
  while (added < Math.abs(days)) {
    result.setDate(result.getDate() + direction)
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

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/utils/computeSchedule.js
git commit -m "feat(deps): update computeSchedule with dependency-aware topological sort"
```

---

### Task 12: Wire dependencies into App.jsx + ActionsStep

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/steps/ActionsStep.jsx`
- Modify: `src/components/ui/actions-gantt-view.jsx`

**Context:** Pass `dependencies` from `useDependencies` down to ActionsStep, then to the Gantt view, which passes them to `computeSchedule`.

**Step 1: Wire useDependencies in App.jsx**

In `src/App.jsx`:

1. Add import: `import { useDependencies } from "./hooks/useDependencies"`
2. After the `usePhases` line (line 39), add:
   ```javascript
   const { dependencies, createDependency, deleteDependency } = useDependencies(activeSetId)
   ```
3. Add these props to the `<ActionsStep>` component (after `ensureDefaultPhases`):
   ```jsx
   dependencies={dependencies}
   onCreateDependency={createDependency}
   onDeleteDependency={deleteDependency}
   ```

**Step 2: Update ActionsStep props**

In `src/components/steps/ActionsStep.jsx`:

1. Add to destructured props: `dependencies`, `onCreateDependency`, `onDeleteDependency`
2. Pass to `<ActionsGanttView>`:
   ```jsx
   dependencies={dependencies}
   onCreateDependency={onCreateDependency}
   onDeleteDependency={onDeleteDependency}
   ```

**Step 3: Update actions-gantt-view.jsx**

In `src/components/ui/actions-gantt-view.jsx`:

1. Add `dependencies`, `onCreateDependency`, `onDeleteDependency` to props
2. Update the `computeSchedule` call to pass dependencies:
   ```javascript
   const scheduled = useMemo(
     () => (phases?.length > 0 ? computeSchedule(phases, actions, undefined, dependencies) : actions),
     [phases, actions, dependencies]
   )
   ```
3. Pass to `<GanttChart>`:
   ```jsx
   dependencies={dependencies}
   onCreateDependency={onCreateDependency}
   onDeleteDependency={onDeleteDependency}
   ```

**Step 4: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/App.jsx src/components/steps/ActionsStep.jsx src/components/ui/actions-gantt-view.jsx
git commit -m "feat(deps): wire dependencies through App → ActionsStep → GanttView"
```

---

## Phase 3 — SVG Dependency Arrows

### Task 13: GanttArrow.jsx — Single arrow path

**Files:**
- Create: `src/components/ui/gantt/GanttArrow.jsx`

**Context:** A single SVG path component that renders a Bezier curve between two bars. Receives start/end coordinates, dep_type, and violation state. Handles hover and click.

**Step 1: Create the arrow component**

```jsx
// src/components/ui/gantt/GanttArrow.jsx
import { useState, useMemo } from "react"

/**
 * Compute SVG connection points based on dependency type.
 * FS: right-of-predecessor → left-of-successor
 * SS: left → left
 * FF: right → right
 * SF: left-of-predecessor → right-of-successor
 */
function getEndpoints(predBar, succBar, depType) {
  const predMidY = predBar.top + predBar.height / 2
  const succMidY = succBar.top + succBar.height / 2

  switch (depType) {
    case "SS":
      return { x1: predBar.left, y1: predMidY, x2: succBar.left, y2: succMidY }
    case "FF":
      return { x1: predBar.left + predBar.width, y1: predMidY, x2: succBar.left + succBar.width, y2: succMidY }
    case "SF":
      return { x1: predBar.left, y1: predMidY, x2: succBar.left + succBar.width, y2: succMidY }
    case "FS":
    default:
      return { x1: predBar.left + predBar.width, y1: predMidY, x2: succBar.left, y2: succMidY }
  }
}

/** Build a cubic Bezier path between two points. */
function buildPath(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1)
  const cpOffset = Math.max(20, dx * 0.3)
  return `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`
}

export default function GanttArrow({
  dependency,
  predBar,
  succBar,
  isViolation,
  onDelete,
}) {
  const [hovered, setHovered] = useState(false)

  const { x1, y1, x2, y2 } = useMemo(
    () => getEndpoints(predBar, succBar, dependency.dep_type),
    [predBar, succBar, dependency.dep_type]
  )

  const pathD = useMemo(() => buildPath(x1, y1, x2, y2), [x1, y1, x2, y2])

  const strokeColor = isViolation
    ? "var(--destructive, #EF4444)"
    : hovered
      ? "var(--primary, #8B5CF6)"
      : "var(--border, #e5e7eb)"

  const strokeWidth = hovered ? 3 : 2
  const opacity = hovered ? 1 : 0.6

  return (
    <g
      className="cursor-pointer"
      style={{ pointerEvents: "auto" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onDelete?.(dependency.id)}
    >
      {/* Invisible wider path for easier hover target */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />

      {/* Visible arrow path */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        strokeDasharray={isViolation ? "6 3" : "none"}
        className="transition-all duration-150"
      />

      {/* Arrowhead */}
      <circle
        cx={x2}
        cy={y2}
        r={hovered ? 4 : 3}
        fill={strokeColor}
        opacity={opacity}
        className="transition-all duration-150"
      />

      {/* Hover tooltip */}
      {hovered && (
        <foreignObject x={Math.min(x1, x2)} y={Math.min(y1, y2) - 28} width={120} height={24}>
          <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-md border border-border whitespace-nowrap">
            {dependency.dep_type}{dependency.lag_days > 0 ? ` +${dependency.lag_days}d` : ""}
            {isViolation && " (violation)"}
          </div>
        </foreignObject>
      )}
    </g>
  )
}

export { getEndpoints }
```

**Step 2: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/gantt/GanttArrow.jsx
git commit -m "feat(gantt): add GanttArrow SVG Bezier path component"
```

---

### Task 14: GanttArrows.jsx — SVG overlay container

**Files:**
- Create: `src/components/ui/gantt/GanttArrows.jsx`

**Context:** The SVG overlay that contains all dependency arrows. Positioned absolutely over the Gantt grid, matching its dimensions. Computes bar positions for all actions and renders a `<GanttArrow>` for each dependency. Also detects violations.

**Step 1: Create the arrows overlay**

```jsx
// src/components/ui/gantt/GanttArrows.jsx
import { useMemo } from "react"
import GanttArrow from "./GanttArrow"
import { computeBarPosition, parseDate } from "./gantt-utils"
import { ROW_HEIGHT } from "./GanttBar"

/** Check if a dependency constraint is violated by current dates. */
function isViolated(dep, predAction, succAction) {
  const predStart = parseDate(predAction?.start_date)
  const predEnd = parseDate(predAction?.end_date)
  const succStart = parseDate(succAction?.start_date)
  const succEnd = parseDate(succAction?.end_date)

  if (!predStart || !predEnd || !succStart || !succEnd) return false

  const lag = (dep.lag_days || 0) * 86_400_000 // ms

  switch (dep.dep_type) {
    case "FS":
      return succStart.getTime() < predEnd.getTime() + lag
    case "SS":
      return succStart.getTime() < predStart.getTime() + lag
    case "FF":
      return succEnd.getTime() < predEnd.getTime() + lag
    case "SF":
      return succEnd.getTime() < predStart.getTime() + lag
    default:
      return false
  }
}

export default function GanttArrows({
  dependencies,
  actions,
  phases,
  timelineStart,
  timelineWidth,
  columnWidth,
  zoom,
  onDeleteDependency,
}) {
  // Build a map: actionId → { top, left, width, height } in the Gantt grid
  const barPositions = useMemo(() => {
    const map = new Map()
    const groups = groupForPositioning(actions, phases)
    let currentTop = 0 // accumulate Y offsets

    for (const group of groups) {
      currentTop += 28 // phase header height
      for (const action of group.actions) {
        const pos = computeBarPosition(action, timelineStart, columnWidth, zoom)
        if (pos) {
          map.set(action.id, {
            left: pos.left,
            width: pos.width,
            top: currentTop + 4,
            height: ROW_HEIGHT - 8,
          })
        }
        currentTop += ROW_HEIGHT
      }
    }

    return map
  }, [actions, phases, timelineStart, columnWidth, zoom])

  const actionMap = useMemo(() => new Map(actions.map((a) => [a.id, a])), [actions])

  // Filter to only renderable deps (both bars visible)
  const renderableDeps = useMemo(() => {
    return (dependencies || []).filter(
      (d) => barPositions.has(d.predecessor_id) && barPositions.has(d.successor_id)
    )
  }, [dependencies, barPositions])

  if (renderableDeps.length === 0) return null

  // Compute SVG dimensions to cover the entire chart
  let maxY = 0
  for (const pos of barPositions.values()) {
    const bottom = pos.top + pos.height + 20
    if (bottom > maxY) maxY = bottom
  }

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none z-10"
      width={timelineWidth}
      height={maxY}
      style={{ overflow: "visible" }}
    >
      {renderableDeps.map((dep) => (
        <GanttArrow
          key={dep.id}
          dependency={dep}
          predBar={barPositions.get(dep.predecessor_id)}
          succBar={barPositions.get(dep.successor_id)}
          isViolation={isViolated(dep, actionMap.get(dep.predecessor_id), actionMap.get(dep.successor_id))}
          onDelete={onDeleteDependency}
        />
      ))}
    </svg>
  )
}

/** Same grouping logic as GanttChart to compute correct Y offsets. */
function groupForPositioning(actions, phases) {
  const phaseMap = new Map()
  const unassigned = []

  for (const phase of (phases || []).sort((a, b) => a.position - b.position)) {
    phaseMap.set(phase.id, { phase, actions: [] })
  }

  for (const action of actions) {
    if (action.phase_id && phaseMap.has(action.phase_id)) {
      phaseMap.get(action.phase_id).actions.push(action)
    } else {
      unassigned.push(action)
    }
  }

  const groups = [...phaseMap.values()]
  if (unassigned.length > 0) {
    groups.push({
      phase: { id: "unassigned", name: "Unassigned", color_hex: "#6B7280", position: 999 },
      actions: unassigned,
    })
  }

  return groups
}
```

**Step 2: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/gantt/GanttArrows.jsx
git commit -m "feat(gantt): add GanttArrows SVG overlay with violation detection"
```

---

### Task 15: DependencyCreator.jsx — Shift+drag to create

**Files:**
- Create: `src/components/ui/gantt/DependencyCreator.jsx`

**Context:** Handles Shift+drag from one bar to another to create a dependency. Shows a dashed line following the cursor during drag. On drop over a valid bar, opens a mini-form to choose dep_type and lag_days.

**Step 1: Create the dependency creator component**

```jsx
// src/components/ui/gantt/DependencyCreator.jsx
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

const DEP_TYPES = [
  { value: "FS", label: "Finish → Start" },
  { value: "SS", label: "Start → Start" },
  { value: "FF", label: "Finish → Finish" },
  { value: "SF", label: "Start → Finish" },
]

export default function DependencyCreator({
  dragState, // { fromId, fromX, fromY, currentX, currentY } or null
  onComplete,
  onCancel,
}) {
  const [formState, setFormState] = useState(null) // { fromId, toId, x, y }

  const handleDrop = useCallback((toId, x, y) => {
    if (!dragState || toId === dragState.fromId) {
      onCancel()
      return
    }
    setFormState({
      fromId: dragState.fromId,
      toId,
      x,
      y,
    })
  }, [dragState, onCancel])

  const handleSubmit = useCallback((depType, lagDays) => {
    if (!formState) return
    onComplete({
      predecessor_id: formState.fromId,
      successor_id: formState.toId,
      dep_type: depType,
      lag_days: lagDays,
    })
    setFormState(null)
  }, [formState, onComplete])

  const handleCancel = useCallback(() => {
    setFormState(null)
    onCancel()
  }, [onCancel])

  return (
    <>
      {/* Drag line */}
      {dragState && !formState && (
        <svg
          className="absolute top-0 left-0 pointer-events-none z-30"
          width="100%"
          height="100%"
          style={{ overflow: "visible" }}
        >
          <line
            x1={dragState.fromX}
            y1={dragState.fromY}
            x2={dragState.currentX}
            y2={dragState.currentY}
            stroke="var(--primary, #8B5CF6)"
            strokeWidth={2}
            strokeDasharray="6 3"
            opacity={0.8}
          />
          <circle
            cx={dragState.currentX}
            cy={dragState.currentY}
            r={4}
            fill="var(--primary, #8B5CF6)"
            opacity={0.8}
          />
        </svg>
      )}

      {/* Mini-form popup */}
      {formState && (
        <div
          className="absolute z-40 bg-popover border border-border rounded-lg shadow-lg p-3 space-y-2"
          style={{
            left: formState.x,
            top: formState.y,
            minWidth: 180,
          }}
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            New dependency
          </p>
          <div className="space-y-1">
            {DEP_TYPES.map((dt) => (
              <button
                key={dt.value}
                type="button"
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors"
                onClick={() => handleSubmit(dt.value, 0)}
              >
                {dt.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}
    </>
  )
}

export { DependencyCreator }
```

**Step 2: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/gantt/DependencyCreator.jsx
git commit -m "feat(gantt): add DependencyCreator for Shift+drag link creation"
```

---

### Task 16: Integrate arrows + drag-to-create into GanttChart

**Files:**
- Modify: `src/components/ui/gantt/GanttChart.jsx`
- Modify: `src/components/ui/gantt/GanttBar.jsx`

**Context:** Add the SVG overlay and drag-to-create interaction into the main chart. GanttBar needs anchor points for Shift+drag. GanttChart needs to manage drag state and render `<GanttArrows>` + `<DependencyCreator>`.

**Step 1: Update GanttBar to support Shift+drag anchor**

In `src/components/ui/gantt/GanttBar.jsx`, add a new prop `onDependencyDragStart` and render anchor dots on the right edge when holding Shift:

Add to the component props: `onDependencyDragStart`

Add after the right resize handle (before the closing `</div>`):

```jsx
{/* Dependency anchor (right edge) — visible on hover */}
<div
  className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-crosshair z-20 transition-opacity"
  onPointerDown={(e) => {
    if (onDependencyDragStart) {
      e.preventDefault()
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      onDependencyDragStart(action.id, rect.left + rect.width / 2, rect.top + rect.height / 2)
    }
  }}
/>
```

**Step 2: Update GanttChart to render arrows and manage drag state**

In `src/components/ui/gantt/GanttChart.jsx`:

1. Add imports:
   ```jsx
   import GanttArrows from "./GanttArrows"
   import { DependencyCreator } from "./DependencyCreator"
   ```

2. Add props: `dependencies`, `onCreateDependency`, `onDeleteDependency`

3. Add drag state inside the component:
   ```jsx
   const [depDragState, setDepDragState] = useState(null)
   ```

4. Add handlers:
   ```jsx
   const handleDepDragStart = useCallback((fromId, fromX, fromY) => {
     setDepDragState({ fromId, fromX, fromY, currentX: fromX, currentY: fromY })
   }, [])

   const handleDepDragMove = useCallback((e) => {
     if (!depDragState) return
     const scrollEl = scrollRef.current
     if (!scrollEl) return
     const rect = scrollEl.getBoundingClientRect()
     setDepDragState((prev) => ({
       ...prev,
       currentX: e.clientX - rect.left + scrollEl.scrollLeft,
       currentY: e.clientY - rect.top + scrollEl.scrollTop,
     }))
   }, [depDragState])

   const handleDepDragEnd = useCallback(() => {
     setDepDragState(null)
   }, [])

   const handleDepComplete = useCallback(async (payload) => {
     if (onCreateDependency) await onCreateDependency(payload)
     setDepDragState(null)
   }, [onCreateDependency])
   ```

5. Add `onPointerMove` and `onPointerUp` to the scrollable timeline div:
   ```jsx
   onPointerMove={handleDepDragMove}
   onPointerUp={handleDepDragEnd}
   ```

6. Inside the scrollable timeline's inner div (after the phase groups), add:
   ```jsx
   {/* Dependency arrows overlay */}
   <GanttArrows
     dependencies={dependencies}
     actions={withDates}
     phases={phases}
     timelineStart={timelineStart}
     timelineWidth={timelineWidth}
     columnWidth={columnWidth}
     zoom={zoom}
     onDeleteDependency={onDeleteDependency}
   />

   {/* Drag-to-create dependency */}
   <DependencyCreator
     dragState={depDragState}
     onComplete={handleDepComplete}
     onCancel={handleDepDragEnd}
   />
   ```

7. Pass `onDependencyDragStart={handleDepDragStart}` to each `<GanttBar>` via `GanttPhaseGroup`.

**Step 3: Update GanttPhaseGroup to pass onDependencyDragStart**

Add `onDependencyDragStart` to props and pass it to each `<GanttBar>`.

**Step 4: Verify build passes**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/ui/gantt/GanttChart.jsx src/components/ui/gantt/GanttBar.jsx src/components/ui/gantt/GanttPhaseGroup.jsx
git commit -m "feat(gantt): integrate SVG arrows overlay and drag-to-create dependencies"
```

---

### Task 17: Build, deploy, and verify

**Files:** None (verification only)

**Step 1: Full build check**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`
Expected: Build succeeds

**Step 2: Run dev server and test**

Run: `npm run dev`

Open browser and verify:
- Custom Gantt with phase groups, colored bars, zoom
- Drag-to-move and drag-to-resize bars
- Today marker and scroll-to-today
- Phase legend
- Dependency arrows appear between linked actions
- Hover on arrow shows tooltip
- Click arrow to delete
- Anchor dot visible on bar hover
- Violation arrows render in red dashed style

**Step 3: Deploy**

```bash
npx vercel --prod
```

**Step 4: Push to remote**

```bash
git push
```

**Step 5: Final commit if any polish needed**

```bash
git add -A
git commit -m "fix(gantt): final visual polish for custom Gantt + dependencies"
```
