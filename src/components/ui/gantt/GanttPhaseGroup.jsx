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
}) {

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
