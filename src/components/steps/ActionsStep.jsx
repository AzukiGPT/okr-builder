import { useState, useCallback } from "react"
import { OBJECTIVES } from "../../data/objectives"
import { TEAM_CONFIG, TEAMS } from "../../data/config"
import { ACTION_STATUSES } from "../../data/actions-config"
import ActionCard from "../ui/action-card"
import ActionForm from "../ui/action-form"
import TemplateSuggestions from "../ui/template-suggestions"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft, Zap } from "lucide-react"

export default function ActionsStep({
  selected,
  actions,
  actionsLoading,
  krStatuses,
  activeSetId,
  templates,
  onCreateAction,
  onUpdateAction,
  onDeleteAction,
  onBack,
  onBackToSets,
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingAction, setEditingAction] = useState(null)

  const totalActions = actions.length
  const doneActions = actions.filter((a) => a.status === "done").length
  const progressPercent = totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0

  // Map KR UUIDs to objective IDs for grouping actions per objective
  const uuidToObjId = {}
  if (krStatuses) {
    for (const [krId, data] of Object.entries(krStatuses)) {
      if (data?.uuid) {
        uuidToObjId[data.uuid] = krId.split(".")[0]
      }
    }
  }

  const getActionsForObjective = useCallback((objId) => {
    return actions.filter((action) =>
      (action.kr_ids || []).some((uuid) => uuidToObjId[uuid] === objId)
    )
  }, [actions, uuidToObjId])

  const unlinkedActions = actions.filter((action) =>
    !action.kr_ids?.length || action.kr_ids.every((uuid) => !uuidToObjId[uuid])
  )

  const handleCreate = useCallback(async (payload) => {
    await onCreateAction(payload)
    setShowForm(false)
  }, [onCreateAction])

  const handleUpdate = useCallback(async (payload) => {
    if (!editingAction) return
    await onUpdateAction(editingAction.id, payload)
    setEditingAction(null)
  }, [editingAction, onUpdateAction])

  const handleDelete = useCallback(async (id) => {
    await onDeleteAction(id)
  }, [onDeleteAction])

  const handleEdit = useCallback((action) => {
    setEditingAction(action)
    setShowForm(false)
  }, [])

  const handleAddFromTemplate = useCallback((tpl) => {
    setEditingAction({
      title: tpl.title,
      description: tpl.description,
      channel: tpl.channel,
      action_type: tpl.action_type,
      source: "template",
      template_id: tpl.id,
      priority: "medium",
      kr_ids: [],
    })
    setShowForm(false)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Zap className="w-7 h-7 text-primary" />
          <h2 className="font-sans font-bold text-3xl gradient-heading">Action Plan</h2>
        </div>
        <p className="text-muted-foreground mt-2">
          {totalActions} action{totalActions !== 1 ? "s" : ""} planned
          {totalActions > 0 && ` \u2014 ${doneActions} completed`}
        </p>
      </div>

      {/* Progress summary */}
      {totalActions > 0 && (
        <div className="rounded-lg p-4 gradient-border" style={{ "--gb-from": "#8B5CF6", "--gb-to": "#8B5CF640" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall progress</p>
            <span className="font-mono font-bold text-sm text-primary">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex gap-3 mt-2">
            {Object.entries(ACTION_STATUSES).map(([key, cfg]) => {
              const count = actions.filter((a) => a.status === key).length
              if (count === 0) return null
              return (
                <span key={key} className="text-[10px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.colorHex }} />
                  {cfg.label}: {count}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions grouped by objective */}
      {TEAMS.map((team) => {
        if (!selected[team]?.length) return null
        const cfg = TEAM_CONFIG[team]
        const objectives = OBJECTIVES[team].filter((obj) => selected[team].includes(obj.id))

        return objectives.map((obj) => {
          const objActions = getActionsForObjective(obj.id)

          return (
            <div key={obj.id} className="space-y-2">
              <div
                className="rounded-lg px-4 py-2 flex items-center justify-between"
                style={{ backgroundColor: `${cfg.colorHex}12` }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold" style={{ color: cfg.colorHex }}>
                    {obj.id}
                  </span>
                  <span className="font-bold text-sm text-foreground">{obj.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">{objActions.length} actions</span>
              </div>

              {objActions.map((action) => (
                editingAction?.id === action.id ? (
                  <ActionForm
                    key={action.id}
                    initialData={action}
                    selected={selected}
                    krStatuses={krStatuses}
                    onSubmit={handleUpdate}
                    onCancel={() => setEditingAction(null)}
                  />
                ) : (
                  <ActionCard
                    key={action.id}
                    action={action}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                )
              ))}

              {objActions.length === 0 && (
                <p className="text-xs text-muted-foreground pl-4 py-2">
                  No actions yet for this objective.
                </p>
              )}
            </div>
          )
        })
      })}

      {/* Unlinked actions */}
      {unlinkedActions.length > 0 && (
        <div className="space-y-2">
          <div className="rounded-lg px-4 py-2 bg-muted">
            <span className="font-bold text-sm text-foreground">Unlinked actions</span>
          </div>
          {unlinkedActions.map((action) => (
            editingAction?.id === action.id ? (
              <ActionForm
                key={action.id}
                initialData={action}
                selected={selected}
                krStatuses={krStatuses}
                onSubmit={handleUpdate}
                onCancel={() => setEditingAction(null)}
              />
            ) : (
              <ActionCard
                key={action.id}
                action={action}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )
          ))}
        </div>
      )}

      {/* Editing from template (no existing id) */}
      {editingAction && !editingAction.id && (
        <ActionForm
          initialData={editingAction}
          selected={selected}
          krStatuses={krStatuses}
          onSubmit={handleCreate}
          onCancel={() => setEditingAction(null)}
        />
      )}

      {/* Template suggestions */}
      {templates && templates.length > 0 && !showForm && !editingAction && (
        <TemplateSuggestions templates={templates} onAddFromTemplate={handleAddFromTemplate} />
      )}

      {/* New action form or button */}
      {showForm ? (
        <ActionForm
          selected={selected}
          krStatuses={krStatuses}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => { setShowForm(true); setEditingAction(null) }}
          className="w-full rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/60 p-4 flex items-center justify-center gap-2 text-sm text-primary font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add action
        </button>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to OKRs
        </Button>
        {onBackToSets && (
          <Button onClick={onBackToSets} size="lg" className="px-8">
            Done — back to my sets
          </Button>
        )}
      </div>
    </div>
  )
}
