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
