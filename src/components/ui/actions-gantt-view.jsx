import { useRef, useEffect, useMemo } from "react"
import Gantt from "frappe-gantt"
import "frappe-gantt/dist/frappe-gantt.css"
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

  // Inject custom bar colors after Gantt renders
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
