import { useMemo } from "react"
import GanttArrow from "./GanttArrow"
import { computeBarPosition, parseDate, groupActionsByPhase } from "./gantt-utils"
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
  // Build a map: actionId -> { top, left, width, height } in the Gantt grid
  const barPositions = useMemo(() => {
    const map = new Map()
    const groups = groupActionsByPhase(actions, phases)
    let currentTop = 0

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
