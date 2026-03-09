import { useState, useCallback, useMemo } from "react"
import { ACTION_STATUSES } from "../../data/actions-config"
import ActionsViewToolbar from "../ui/actions-view-toolbar"
import ActionsTableView from "../ui/actions-table-view"
import ActionsKanbanView from "../ui/actions-kanban-view"
import ActionsGanttView from "../ui/actions-gantt-view"
import ActionForm from "../ui/action-form"
import TemplateSuggestions from "../ui/template-suggestions"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Zap } from "lucide-react"

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
  const [viewMode, setViewMode] = useState("table")
  const [groupBy, setGroupBy] = useState("status")
  const [showForm, setShowForm] = useState(false)
  const [editingAction, setEditingAction] = useState(null)

  const totalActions = actions.length
  const doneActions = actions.filter((a) => a.status === "done").length
  const progressPercent = totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0

  // Build uuid → team map for team grouping
  const uuidToTeam = useMemo(() => {
    const map = {}
    if (krStatuses) {
      for (const [krId, data] of Object.entries(krStatuses)) {
        if (data?.uuid && data?.team) {
          map[data.uuid] = data.team
        }
      }
    }
    return map
  }, [krStatuses])

  const handleCreate = useCallback(async (payload) => {
    await onCreateAction(payload)
    setShowForm(false)
  }, [onCreateAction])

  const handleUpdate = useCallback(async (payload) => {
    if (!editingAction) return
    await onUpdateAction(editingAction.id, payload)
    setEditingAction(null)
  }, [editingAction, onUpdateAction])

  const handleInlineUpdate = useCallback(async (id, updates) => {
    await onUpdateAction(id, updates)
  }, [onUpdateAction])

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

  const handleAddAction = useCallback(() => {
    setShowForm(true)
    setEditingAction(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Toolbar */}
      <ActionsViewToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        onAddAction={handleAddAction}
      />

      {/* Active view */}
      {viewMode === "table" && (
        <ActionsTableView
          actions={actions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateAction={handleInlineUpdate}
        />
      )}
      {viewMode === "kanban" && (
        <ActionsKanbanView
          actions={actions}
          groupBy={groupBy}
          uuidToTeam={uuidToTeam}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateAction={handleInlineUpdate}
        />
      )}
      {viewMode === "gantt" && (
        <ActionsGanttView
          actions={actions}
          onUpdateAction={handleInlineUpdate}
          onEdit={handleEdit}
        />
      )}

      {/* Edit form (for existing action) */}
      {editingAction && editingAction.id && (
        <ActionForm
          initialData={editingAction}
          selected={selected}
          krStatuses={krStatuses}
          onSubmit={handleUpdate}
          onCancel={() => setEditingAction(null)}
        />
      )}

      {/* Edit form (from template, no existing id) */}
      {editingAction && !editingAction.id && (
        <ActionForm
          initialData={editingAction}
          selected={selected}
          krStatuses={krStatuses}
          onSubmit={handleCreate}
          onCancel={() => setEditingAction(null)}
        />
      )}

      {/* New action form */}
      {showForm && (
        <ActionForm
          selected={selected}
          krStatuses={krStatuses}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Template suggestions */}
      {templates && templates.length > 0 && !showForm && !editingAction && (
        <TemplateSuggestions templates={templates} onAddFromTemplate={handleAddFromTemplate} />
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
