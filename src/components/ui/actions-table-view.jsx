// src/components/ui/actions-table-view.jsx
import { useState, useMemo } from "react"
import { ACTION_CHANNELS, ACTION_STATUSES, ACTION_PRIORITIES } from "../../data/actions-config"
import { TEAM_CONFIG } from "../../data/config"
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Tag from "./tag-custom"

const COLUMNS = [
  { key: "title", label: "Title", sortable: true },
  { key: "krs", label: "KRs", sortable: false },
  { key: "channel", label: "Channel", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "priority", label: "Priority", sortable: true },
  { key: "phase", label: "Phase", sortable: true },
  { key: "dates", label: "Dates", sortable: true },
  { key: "actions_col", label: "", sortable: false },
]

function sortActions(actions, sortColumn, sortDirection, phaseLookup) {
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
      case "phase": {
        const posA = phaseLookup[a.phase_id]?.position ?? 999
        const posB = phaseLookup[b.phase_id]?.position ?? 999
        return dir * (posA - posB)
      }
      case "dates": return dir * ((a.start_date || "") > (b.start_date || "") ? 1 : -1)
      default: return 0
    }
  })
  return sorted
}

export default function ActionsTableView({ actions, onEdit, onDelete, onUpdateAction, krStatuses, phases }) {
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState("asc")

  const phaseLookup = useMemo(() => {
    const lookup = {}
    for (const p of (phases || [])) {
      lookup[p.id] = p
    }
    return lookup
  }, [phases])

  const uuidToKrId = useMemo(() => {
    const map = {}
    if (krStatuses) {
      for (const [krId, data] of Object.entries(krStatuses)) {
        if (data?.uuid) map[data.uuid] = { krId, team: data.team, progress: data.progress || 0 }
      }
    }
    return map
  }, [krStatuses])

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(key)
      setSortDirection("asc")
    }
  }

  const sorted = useMemo(
    () => sortActions(actions, sortColumn, sortDirection, phaseLookup),
    [actions, sortColumn, sortDirection, phaseLookup]
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
            const phase = phaseLookup[action.phase_id]
            const krIds = action.kr_ids || []
            const visibleKrs = krIds.slice(0, 3)
            const remainingCount = krIds.length - 3

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
                  <div className="flex items-center gap-1 flex-wrap">
                    {visibleKrs.map((uuid) => {
                      const kr = uuidToKrId[uuid]
                      if (!kr) return null
                      const teamColor = TEAM_CONFIG[kr.team]?.colorHex || "#6B7280"
                      return (
                        <span
                          key={uuid}
                          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"
                          style={{ backgroundColor: `${teamColor}15`, color: teamColor }}
                        >
                          {kr.krId}
                          {kr.progress > 0 && (
                            <span className="opacity-70">{kr.progress}%</span>
                          )}
                        </span>
                      )
                    })}
                    {remainingCount > 0 && (
                      <span
                        className="text-[10px] text-muted-foreground"
                        title={krIds.slice(3).map((uuid) => uuidToKrId[uuid]?.krId || "?").join(", ")}
                      >
                        +{remainingCount}
                      </span>
                    )}
                  </div>
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
                <td className="px-3 py-2.5">
                  {phase && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: `${phase.color_hex}15`, color: phase.color_hex }}
                    >
                      {phase.name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {action.start_date && new Date(action.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  {action.start_date && action.end_date && " → "}
                  {action.end_date && new Date(action.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
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
