// src/components/ui/actions-table-view.jsx
import { useState, useMemo } from "react"
import { ACTION_CHANNELS, ACTION_STATUSES, ACTION_PRIORITIES } from "../../data/actions-config"
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Tag from "./tag-custom"

const COLUMNS = [
  { key: "title", label: "Title", sortable: true },
  { key: "channel", label: "Channel", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "priority", label: "Priority", sortable: true },
  { key: "dates", label: "Dates", sortable: true },
  { key: "budget", label: "Budget", sortable: true },
  { key: "actions_col", label: "", sortable: false },
]

function sortActions(actions, sortColumn, sortDirection) {
  if (!sortColumn) return actions
  const sorted = [...actions]
  const dir = sortDirection === "asc" ? 1 : -1

  sorted.sort((a, b) => {
    switch (sortColumn) {
      case "title": return dir * (a.title || "").localeCompare(b.title || "")
      case "channel": return dir * (a.channel || "").localeCompare(b.channel || "")
      case "status": return dir * (a.status || "").localeCompare(b.status || "")
      case "priority": {
        const order = { critical: 0, high: 1, medium: 2, low: 3 }
        return dir * ((order[a.priority] ?? 2) - (order[b.priority] ?? 2))
      }
      case "dates": return dir * ((a.start_date || "") > (b.start_date || "") ? 1 : -1)
      case "budget": return dir * ((a.budget_estimated || 0) - (b.budget_estimated || 0))
      default: return 0
    }
  })
  return sorted
}

export default function ActionsTableView({ actions, onEdit, onDelete, onUpdateAction }) {
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState("asc")

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(key)
      setSortDirection("asc")
    }
  }

  const sorted = useMemo(
    () => sortActions(actions, sortColumn, sortDirection),
    [actions, sortColumn, sortDirection]
  )

  const handleInlineChange = (action, field, value) => {
    onUpdateAction(action.id, { [field]: value })
  }

  const SortIcon = ({ col }) => {
    if (sortColumn !== col) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/40" />
    return sortDirection === "asc"
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
        <p className="text-muted-foreground text-sm">No actions yet. Add your first action above.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 text-left text-[10px] uppercase font-semibold text-muted-foreground tracking-wide ${
                  col.sortable ? "cursor-pointer hover:text-foreground select-none" : ""
                }`}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && <SortIcon col={col.key} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((action, i) => {
            const channel = ACTION_CHANNELS[action.channel]
            const status = ACTION_STATUSES[action.status] || ACTION_STATUSES.todo
            const priority = ACTION_PRIORITIES[action.priority] || ACTION_PRIORITIES.medium

            return (
              <tr
                key={action.id}
                className={`border-t border-border hover:bg-muted/30 transition-colors ${
                  i % 2 === 0 ? "bg-card/50" : "bg-card"
                }`}
              >
                <td className="px-3 py-2.5 font-medium text-foreground max-w-[250px]">
                  <span className="line-clamp-1">{action.title}</span>
                </td>
                <td className="px-3 py-2.5">
                  {channel && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: `${channel.colorHex}15`, color: channel.colorHex }}
                    >
                      {channel.label}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={action.status || "todo"}
                    onChange={(e) => handleInlineChange(action, "status", e.target.value)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-border bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ color: status.colorHex }}
                  >
                    {Object.entries(ACTION_STATUSES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={action.priority || "medium"}
                    onChange={(e) => handleInlineChange(action, "priority", e.target.value)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-border bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ color: priority.colorHex }}
                  >
                    {Object.entries(ACTION_PRIORITIES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {action.start_date && new Date(action.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  {action.start_date && action.end_date && " \u2192 "}
                  {action.end_date && new Date(action.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </td>
                <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {action.budget_estimated > 0 && `${action.budget_estimated.toLocaleString()} ${action.currency || "EUR"}`}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(action)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete(action.id)}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
