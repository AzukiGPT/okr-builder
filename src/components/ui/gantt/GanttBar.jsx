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
