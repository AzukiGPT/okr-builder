import { useMemo } from "react"
import Tag from "./tag-custom"
import { ACTION_CHANNELS, ACTION_TYPES, ACTION_STATUSES, ACTION_PRIORITIES } from "../../data/actions-config"
import { TEAM_CONFIG } from "../../data/config"
import { Pencil, Trash2, Calendar, DollarSign } from "lucide-react"

export default function ActionCard({ action, onEdit, onDelete, krStatuses, phases, compact = false }) {
  const channel = ACTION_CHANNELS[action.channel]
  const actionType = ACTION_TYPES[action.action_type]
  const status = ACTION_STATUSES[action.status] || ACTION_STATUSES.todo
  const priority = ACTION_PRIORITIES[action.priority] || ACTION_PRIORITIES.medium

  const hasDateInfo = action.start_date || action.end_date
  const hasBudget = action.budget_estimated > 0

  // Resolve UUIDs to display KR IDs + team color + progress
  const uuidToKrId = useMemo(() => {
    const map = {}
    if (krStatuses) {
      for (const [krId, data] of Object.entries(krStatuses)) {
        if (data?.uuid) map[data.uuid] = { krId, team: data.team, progress: data.progress || 0 }
      }
    }
    return map
  }, [krStatuses])

  // Resolve phase
  const phase = useMemo(() => {
    if (!action.phase_id || !phases) return null
    return phases.find((p) => p.id === action.phase_id) || null
  }, [action.phase_id, phases])

  const krIds = action.kr_ids || []
  const maxKrs = compact ? 2 : 3
  const visibleKrs = krIds.slice(0, maxKrs)
  const remainingCount = krIds.length - maxKrs

  const krBadges = visibleKrs.map((uuid) => {
    const kr = uuidToKrId[uuid]
    if (!kr) return null
    const teamColor = TEAM_CONFIG[kr.team]?.colorHex || "#6B7280"
    return (
      <span
        key={uuid}
        className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"
        style={{ backgroundColor: `${teamColor}15`, color: teamColor }}
      >
        {kr.krId}
        {kr.progress > 0 && (
          <span className="opacity-70">{kr.progress}%</span>
        )}
      </span>
    )
  }).filter(Boolean)

  if (compact) {
    return (
      <div className="rounded-md border border-border bg-card p-2.5 space-y-1.5 hover:border-primary/30 transition-colors">
        <h4 className="font-medium text-xs text-foreground line-clamp-2">{action.title}</h4>
        <div className="flex items-center gap-1 flex-wrap">
          {channel && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${channel.colorHex}15`, color: channel.colorHex }}
            >
              {channel.label}
            </span>
          )}
          <Tag variant={action.priority}>{priority.label}</Tag>
        </div>
        {(krBadges.length > 0 || phase) && (
          <div className="flex items-center gap-1 flex-wrap">
            {krBadges}
            {remainingCount > 0 && (
              <span className="text-[9px] text-muted-foreground">+{remainingCount}</span>
            )}
            {phase && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${phase.color_hex}15`, color: phase.color_hex }}
              >
                {phase.name}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm text-foreground flex-1">{action.title}</h4>
        <div className="flex items-center gap-1 shrink-0">
          <Tag variant={action.priority}>{priority.label}</Tag>
          <Tag variant={action.status}>{status.label}</Tag>
        </div>
      </div>

      {action.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{action.description}</p>
      )}

      <div className="flex items-center gap-1 flex-wrap">
        {channel && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${channel.colorHex}15`, color: channel.colorHex }}
          >
            {channel.label}
          </span>
        )}
        {actionType && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {actionType.label}
          </span>
        )}
        {krBadges}
        {remainingCount > 0 && (
          <span className="text-[9px] text-muted-foreground">+{remainingCount}</span>
        )}
        {phase && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${phase.color_hex}15`, color: phase.color_hex }}
          >
            {phase.name}
          </span>
        )}
      </div>

      {(hasDateInfo || hasBudget) && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {hasDateInfo && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {action.start_date && new Date(action.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              {action.start_date && action.end_date && " \u2192 "}
              {action.end_date && new Date(action.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </span>
          )}
          {hasBudget && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {action.budget_estimated.toLocaleString()} {action.currency || "EUR"}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-1 pt-1">
        <button
          onClick={() => onEdit(action)}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors cursor-pointer"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={() => onDelete(action.id)}
          className="text-[10px] text-muted-foreground hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  )
}
