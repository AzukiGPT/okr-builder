import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { Calendar, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import GanttHeader from "./GanttHeader"
import GanttPhaseGroup from "./GanttPhaseGroup"
import {
  computeTimelineRange,
  generateHeaderCells,
  groupActionsByPhase,
  todayMarkerX,
  ZOOM_LEVELS,
} from "./gantt-utils"
import { ROW_HEIGHT } from "./GanttBar"

const TITLE_COL_WIDTH = 200

export default function GanttChart({ actions, phases, onUpdateAction, onEdit }) {
  const [zoom, setZoom] = useState("week")
  const scrollRef = useRef(null)

  const zoomCfg = ZOOM_LEVELS[zoom]
  const { columnWidth } = zoomCfg

  // Compute timeline range from all scheduled actions
  const { start: timelineStart, totalDays } = useMemo(
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
