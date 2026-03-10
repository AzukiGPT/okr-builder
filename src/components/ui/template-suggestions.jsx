import { useState, useMemo } from "react"
import { ACTION_CHANNELS } from "../../data/actions-config"
import { OBJECTIVES } from "../../data/objectives"
import { Sparkles, Plus, Zap, Loader2, Check, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Build a lookup: krId → { id, text, team, objectiveId, objectiveTitle } */
function buildKrLabelMap() {
  const map = {}
  for (const [team, objs] of Object.entries(OBJECTIVES)) {
    for (const obj of objs) {
      for (const kr of obj.krs || []) {
        map[kr.id] = {
          id: kr.id,
          text: kr.text,
          team,
          objectiveId: obj.id,
          objectiveTitle: obj.title,
        }
      }
    }
  }
  return map
}

const KR_LABEL_MAP = buildKrLabelMap()

const TEAM_COLORS = {
  sales: "#3B82F6",
  marketing: "#8B5CF6",
  csm: "#22C55E",
}

const TEAM_LABELS = {
  sales: "Sales",
  marketing: "Marketing",
  csm: "CSM",
}

export default function TemplateSuggestions({
  templates, onAddFromTemplate, onBatchAdd, onEditTemplate, existingTemplateIds,
}) {
  const [batchAdding, setBatchAdding] = useState(false)
  const [batchAddingKr, setBatchAddingKr] = useState(null)
  const [addingId, setAddingId] = useState(null)
  const [justAdded, setJustAdded] = useState(new Set())
  const [expandedKrs, setExpandedKrs] = useState(new Set())

  const newTemplates = useMemo(() => {
    if (!existingTemplateIds) return templates || []
    return (templates || []).filter((tpl) => !existingTemplateIds.has(tpl.id))
  }, [templates, existingTemplateIds])

  // Group templates by KR
  const krGroups = useMemo(() => {
    const groups = new Map()

    for (const tpl of newTemplates) {
      const krIds = tpl.relevant_kr_ids || []
      for (const krId of krIds) {
        if (!groups.has(krId)) {
          groups.set(krId, { krId, krInfo: KR_LABEL_MAP[krId], templates: [] })
        }
        const group = groups.get(krId)
        if (!group.templates.some((t) => t.id === tpl.id)) {
          group.templates.push(tpl)
        }
      }
    }

    const teamOrder = { sales: 0, marketing: 1, csm: 2 }
    return [...groups.values()].sort((a, b) => {
      const aTeam = teamOrder[a.krInfo?.team] ?? 99
      const bTeam = teamOrder[b.krInfo?.team] ?? 99
      if (aTeam !== bTeam) return aTeam - bTeam
      return a.krId.localeCompare(b.krId, undefined, { numeric: true })
    })
  }, [newTemplates])

  if (!templates || templates.length === 0) return null

  const handleBatchAddAll = async () => {
    if (!onBatchAdd || newTemplates.length === 0) return
    setBatchAdding(true)
    try {
      await onBatchAdd(newTemplates)
    } finally {
      setBatchAdding(false)
    }
  }

  const handleBatchAddKr = async (e, krId, krTemplates) => {
    e.stopPropagation()
    if (!onBatchAdd) return
    const toAdd = krTemplates.filter((tpl) => !justAdded.has(tpl.id))
    if (toAdd.length === 0) return
    setBatchAddingKr(krId)
    try {
      await onBatchAdd(toAdd)
      setJustAdded((prev) => {
        const next = new Set(prev)
        for (const tpl of toAdd) next.add(tpl.id)
        return next
      })
    } finally {
      setBatchAddingKr(null)
    }
  }

  const handleSingleAdd = async (tpl) => {
    setAddingId(tpl.id)
    try {
      await onAddFromTemplate(tpl)
      setJustAdded((prev) => new Set([...prev, tpl.id]))
    } finally {
      setAddingId(null)
    }
  }

  const toggleKr = (krId) => {
    setExpandedKrs((prev) => {
      const next = new Set(prev)
      if (next.has(krId)) next.delete(krId)
      else next.add(krId)
      return next
    })
  }

  const anyBusy = batchAdding || batchAddingKr != null

  return (
    <div className="space-y-4">
      {/* Global header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-sans font-bold text-sm text-foreground">Suggested actions by KR</h3>
          <span className="text-[10px] text-muted-foreground">
            {newTemplates.length} suggestion{newTemplates.length !== 1 ? "s" : ""} across {krGroups.length} KR{krGroups.length !== 1 ? "s" : ""}
          </span>
        </div>
        {onBatchAdd && newTemplates.length > 0 && (
          <Button
            size="sm"
            onClick={handleBatchAddAll}
            disabled={anyBusy}
            className="gap-1.5"
          >
            {batchAdding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            {batchAdding ? "Adding..." : `Add all (${newTemplates.length})`}
          </Button>
        )}
      </div>

      {/* KR Groups */}
      {krGroups.map((group) => {
        const { krId, krInfo, templates: krTemplates } = group
        const isCollapsed = !expandedKrs.has(krId)
        const remainingCount = krTemplates.filter((t) => !justAdded.has(t.id)).length
        const teamColor = krInfo ? TEAM_COLORS[krInfo.team] || "#6B7280" : "#6B7280"
        const teamLabel = krInfo ? TEAM_LABELS[krInfo.team] || krInfo.team : ""

        return (
          <div
            key={krId}
            className="rounded-lg border border-border overflow-hidden"
          >
            {/* KR Header */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-muted/30 transition-colors"
              style={{ borderLeft: `3px solid ${teamColor}` }}
              onClick={() => toggleKr(krId)}
            >
              <ChevronRight
                className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
              />
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${teamColor}15`, color: teamColor }}
              >
                {krId}
              </span>
              <span className="text-xs text-foreground font-medium flex-1 truncate">
                {krInfo?.text || krId}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {remainingCount} action{remainingCount !== 1 ? "s" : ""}
              </span>
              {onBatchAdd && remainingCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => handleBatchAddKr(e, krId, krTemplates)}
                  disabled={anyBusy}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {batchAddingKr === krId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  {batchAddingKr === krId ? "..." : `Add ${remainingCount}`}
                </button>
              )}
            </div>

            {/* KR Objective context */}
            {!isCollapsed && krInfo?.objectiveTitle && (
              <div className="px-4 py-1 bg-muted/20 border-t border-border/50">
                <span className="text-[9px] text-muted-foreground">
                  <span className="font-semibold" style={{ color: teamColor }}>{teamLabel}</span>
                  {" \u00B7 "}{krInfo.objectiveId} &mdash; {krInfo.objectiveTitle}
                </span>
              </div>
            )}

            {/* Template cards */}
            {!isCollapsed && (
              <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2 border-t border-border/50">
                {krTemplates.map((tpl) => {
                  const channel = ACTION_CHANNELS[tpl.channel]
                  const isAdding = addingId === tpl.id
                  const wasAdded = justAdded.has(tpl.id)

                  return (
                    <div
                      key={tpl.id}
                      className={`rounded-lg border p-3 space-y-2 transition-colors ${
                        wasAdded
                          ? "border-emerald-200 bg-emerald-50/30"
                          : "border-border bg-card/50 hover:border-amber-300 cursor-pointer"
                      }`}
                      onClick={() => !wasAdded && onEditTemplate && onEditTemplate(tpl)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs text-foreground leading-tight flex-1">
                          {tpl.title}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSingleAdd(tpl) }}
                          disabled={isAdding || wasAdded || anyBusy}
                          className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                            wasAdded
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isAdding ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : wasAdded ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          {isAdding ? "..." : wasAdded ? "Added" : "Add"}
                        </button>
                      </div>

                      {tpl.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1 flex-wrap">
                        {channel && (
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${channel.colorHex}15`, color: channel.colorHex }}
                          >
                            {channel.label}
                          </span>
                        )}
                        {tpl.effort && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {tpl.effort}
                          </span>
                        )}
                        {tpl.impact && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Impact: {tpl.impact}
                          </span>
                        )}
                        {/* Other KRs this template also covers */}
                        {(tpl.relevant_kr_ids || []).filter((id) => id !== krId).map((otherId) => (
                          <span
                            key={otherId}
                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            +{otherId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {existingTemplateIds && newTemplates.length === 0 && templates.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          All suggested actions have been added to your plan.
        </p>
      )}
    </div>
  )
}
