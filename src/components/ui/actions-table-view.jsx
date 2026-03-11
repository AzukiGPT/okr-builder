// src/components/ui/actions-table-view.jsx
import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { ACTION_CHANNELS, ACTION_STATUSES, ACTION_PRIORITIES } from "../../data/actions-config"
import { OBJECTIVES } from "../../data/objectives"
import { TEAM_CONFIG } from "../../data/config"
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

const COLUMNS = [
  { key: "title", label: "Title", sortable: true, defaultWidth: 250, minWidth: 120 },
  { key: "krs", label: "KRs", sortable: false, defaultWidth: 240, minWidth: 140 },
  { key: "channel", label: "Channel", sortable: true, defaultWidth: 100, minWidth: 80 },
  { key: "status", label: "Status", sortable: true, defaultWidth: 110, minWidth: 80 },
  { key: "priority", label: "Priority", sortable: true, defaultWidth: 110, minWidth: 80 },
  { key: "phase", label: "Phase", sortable: true, defaultWidth: 110, minWidth: 80 },
  { key: "dates", label: "Dates", sortable: true, defaultWidth: 130, minWidth: 80 },
  { key: "actions_col", label: "", sortable: false, defaultWidth: 70, minWidth: 60 },
]

const DEFAULT_WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.key, c.defaultWidth]))
const MIN_WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.key, c.minWidth]))

// Build a flat krId → text map from static OBJECTIVES data
function buildKrTextMap() {
  const map = {}
  for (const team of Object.keys(OBJECTIVES)) {
    for (const obj of OBJECTIVES[team]) {
      for (const kr of obj.krs) {
        map[kr.id] = kr.text
      }
    }
  }
  return map
}

const KR_TEXT_MAP = buildKrTextMap()

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
  const [colWidths, setColWidths] = useState(DEFAULT_WIDTHS)
  const resizingRef = useRef(null)

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
        if (data?.uuid) {
          map[data.uuid] = {
            krId,
            team: data.team,
            progress: data.progress || 0,
            text: KR_TEXT_MAP[krId] || "",
          }
        }
      }
    }
    return map
  }, [krStatuses])

  // ── Resize handlers ──────────────────────────────────────
  const onResizeMove = useCallback((e) => {
    if (!resizingRef.current) return
    const { colKey, startX, startWidth } = resizingRef.current
    const delta = e.clientX - startX
    const newWidth = Math.max(MIN_WIDTHS[colKey], startWidth + delta)
    setColWidths((prev) => ({ ...prev, [colKey]: newWidth }))
  }, [])

  const onResizeEnd = useCallback(() => {
    resizingRef.current = null
    document.removeEventListener("mousemove", onResizeMove)
    document.removeEventListener("mouseup", onResizeEnd)
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }, [onResizeMove])

  const onResizeStart = useCallback((colKey, e) => {
    e.preventDefault()
    e.stopPropagation()
    resizingRef.current = { colKey, startX: e.clientX, startWidth: colWidths[colKey] }
    document.addEventListener("mousemove", onResizeMove)
    document.addEventListener("mouseup", onResizeEnd)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [colWidths, onResizeMove, onResizeEnd])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", onResizeMove)
      document.removeEventListener("mouseup", onResizeEnd)
    }
  }, [onResizeMove, onResizeEnd])

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
      <table className="text-sm" style={{ tableLayout: "fixed", width: Object.values(colWidths).reduce((s, w) => s + w, 0) }}>
        <colgroup>
          {COLUMNS.map((col) => (
            <col key={col.key} style={{ width: colWidths[col.key] }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-muted">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`relative px-3 py-2 text-left text-[10px] uppercase font-semibold text-muted-foreground tracking-wide ${
                  col.sortable ? "cursor-pointer hover:text-foreground select-none" : ""
                }`}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && <SortIcon col={col.key} />}
                </span>
                {/* Resize handle */}
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 transition-colors z-10"
                  onMouseDown={(e) => onResizeStart(col.key, e)}
                  role="separator"
                />
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
                <td className="px-3 py-2.5 font-medium text-foreground overflow-hidden">
                  <span className="line-clamp-1">{action.title}</span>
                </td>
                <td className="px-3 py-2 overflow-hidden">
                  <div className="flex flex-col gap-1">
                    {visibleKrs.map((uuid) => {
                      const kr = uuidToKrId[uuid]
                      if (!kr) return null
                      const teamColor = TEAM_CONFIG[kr.team]?.colorHex || "#6B7280"
                      return (
                        <div
                          key={uuid}
                          className="flex items-center gap-1.5 min-w-0"
                        >
                          <span
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{ backgroundColor: `${teamColor}15`, color: teamColor }}
                          >
                            {kr.krId}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate" title={kr.text}>
                            {kr.text}
                          </span>
                          {kr.progress > 0 && (
                            <span
                              className="text-[9px] font-mono font-semibold shrink-0"
                              style={{ color: teamColor, opacity: 0.7 }}
                            >
                              {kr.progress}%
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {remainingCount > 0 && (
                      <span
                        className="text-[10px] text-muted-foreground"
                        title={krIds.slice(3).map((uuid) => {
                          const kr = uuidToKrId[uuid]
                          return kr ? `${kr.krId} ${kr.text}` : "?"
                        }).join(", ")}
                      >
                        +{remainingCount} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 overflow-hidden">
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
                <td className="px-3 py-2.5 overflow-hidden">
                  {phase && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: `${phase.color_hex}15`, color: phase.color_hex }}
                    >
                      {phase.name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap overflow-hidden">
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
