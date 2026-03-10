import { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import GanttBar from "./GanttBar"
import { computeBarPosition } from "./gantt-utils"
import { ROW_HEIGHT } from "./GanttBar"

export default function GanttPhaseGroup({
  phase,
  actions,
  collapsed,
  onToggleCollapse,
  timelineStart,
  timelineWidth,
  columnWidth,
  zoom,
  onUpdateAction,
  onEdit,
  onDependencyDragStart,
}) {

  const barMap = useMemo(() => {
    const map = new Map()
    for (const action of actions) {
      const pos = computeBarPosition(action, timelineStart, columnWidth, zoom)
      if (pos) map.set(action.id, { action, ...pos })
    }
    return map
  }, [actions, timelineStart, columnWidth, zoom])

  const scheduledCount = barMap.size
  const totalCount = actions.length

  return (
    <div>
      {/* Phase header — keep in sync with GanttChart sticky left column header (layout constraint: sticky left vs scrollable) */}
      <div
        className="sticky left-0 flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none z-10 border-b border-border"
        style={{ backgroundColor: `${phase.color_hex}15` }}
        onClick={onToggleCollapse}
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
            const bar = barMap.get(action.id)
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
                    onDependencyDragStart={onDependencyDragStart}
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
