import { useMemo } from "react"
import { computeSchedule } from "../../utils/computeSchedule"
import GanttChart from "./gantt/GanttChart"

export default function ActionsGanttView({ actions, phases, dependencies, onCreateDependency, onDeleteDependency, onUpdateAction, onEdit }) {
  // Auto-schedule actions that don't have dates using phase order + dependencies
  const scheduled = useMemo(
    () => (phases?.length > 0 ? computeSchedule(phases, actions, undefined, dependencies) : actions),
    [phases, actions, dependencies]
  )

  // Split into scheduled (have dates) and unscheduled
  const withDates = useMemo(() => scheduled.filter((a) => a.start_date && a.end_date), [scheduled])
  const withoutDates = useMemo(() => scheduled.filter((a) => !a.start_date || !a.end_date), [scheduled])

  return (
    <div className="space-y-4">
      <GanttChart
        actions={withDates}
        phases={phases}
        dependencies={dependencies}
        onCreateDependency={onCreateDependency}
        onDeleteDependency={onDeleteDependency}
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
