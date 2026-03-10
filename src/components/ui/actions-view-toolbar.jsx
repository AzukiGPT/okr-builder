// src/components/ui/actions-view-toolbar.jsx
import { Table2, Kanban, GanttChart, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

const VIEW_MODES = [
  { key: "table", label: "Table", Icon: Table2 },
  { key: "kanban", label: "Kanban", Icon: Kanban },
  { key: "gantt", label: "Gantt", Icon: GanttChart },
]

const GROUP_OPTIONS = [
  { key: "status", label: "Status" },
  { key: "channel", label: "Channel" },
  { key: "priority", label: "Priority" },
  { key: "phase", label: "Phase" },
  { key: "team", label: "Team" },
  { key: "kr", label: "Key Result" },
]

export default function ActionsViewToolbar({
  viewMode,
  onViewModeChange,
  groupBy,
  onGroupByChange,
  onAddAction,
}) {
  const showGroupBy = viewMode !== "gantt"

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/50">
        {VIEW_MODES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onViewModeChange(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {showGroupBy && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
              Group by
            </span>
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value)}
              className="px-2 py-1 border rounded text-xs bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        <Button size="sm" onClick={onAddAction}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add action
        </Button>
      </div>
    </div>
  )
}
