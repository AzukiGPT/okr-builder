/**
 * Pure utility functions for the custom Gantt chart.
 * No React, no side effects — just date math and grid calculations.
 */

const MS_PER_DAY = 86_400_000

/** Minimum bar width as a ratio of columnWidth */
export const MIN_BAR_WIDTH_RATIO = 0.3

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

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
  const width = Math.max(right - left, columnWidth * MIN_BAR_WIDTH_RATIO)

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
      cells.push({
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
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

  for (const phase of [...(phases || [])].sort((a, b) => a.position - b.position)) {
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
