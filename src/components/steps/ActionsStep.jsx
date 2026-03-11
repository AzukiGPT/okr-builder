import { useState, useCallback, useMemo, useEffect } from "react"
import { ACTION_STATUSES } from "../../data/actions-config"
import ActionsViewToolbar from "../ui/actions-view-toolbar"
import ExportActionsToolbar from "../ui/export-actions-toolbar"
import ActionsTableView from "../ui/actions-table-view"
import ActionsKanbanView from "../ui/actions-kanban-view"
import ActionsGanttView from "../ui/actions-gantt-view"
import ActionForm from "../ui/action-form"
import TemplateSuggestions from "../ui/template-suggestions"
import { Button } from "@/components/ui/button"
import {
  Rocket, Sparkles, Zap, Loader2, Plus,
  FileSpreadsheet, FileText, Copy, Link2, Check,
} from "lucide-react"

export default function ActionsStep({
  selected,
  actions,
  actionsLoading,
  krStatuses,
  activeSetId,
  templates,
  phases,
  ensureDefaultPhases,
  dependencies,
  onCreateDependency,
  onDeleteDependency,
  onCreateAction,
  onBatchCreateActions,
  onUpdateAction,
  onDeleteAction,
  onExportPDF,
  onExportExcel,
  onCopyNotion,
  onShareLink,
}) {
  const [viewMode, setViewMode] = useState("table")
  const [groupBy, setGroupBy] = useState("status")
  const [showForm, setShowForm] = useState(false)
  const [editingAction, setEditingAction] = useState(null)
  const [notionCopied, setNotionCopied] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    if (ensureDefaultPhases) ensureDefaultPhases()
  }, [ensureDefaultPhases])

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
    setEditingAction(null)
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

  const handleCopyNotion = useCallback(async () => {
    if (!onCopyNotion) return
    await onCopyNotion()
    setNotionCopied(true)
    setTimeout(() => setNotionCopied(false), 2000)
  }, [onCopyNotion])

  const handleShareLink = useCallback(async () => {
    if (!onShareLink) return
    await onShareLink()
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }, [onShareLink])

  // Resolve template's relevant_kr_ids (text like "S1.2") to set_key_results UUIDs
  const resolveKrUuids = useCallback((templateKrIds) => {
    if (!templateKrIds || !krStatuses) return []
    return templateKrIds
      .map((krId) => krStatuses[krId]?.uuid)
      .filter(Boolean)
  }, [krStatuses])

  // Track which templates are already added
  const existingTemplateIds = useMemo(() => {
    const ids = new Set()
    for (const action of actions) {
      if (action.template_id) ids.add(action.template_id)
    }
    return ids
  }, [actions])

  const resolvePhaseId = useCallback((defaultPhase) => {
    if (!defaultPhase || !phases?.length) return null
    const match = phases.find((p) =>
      p.name.toLowerCase().includes(defaultPhase) || defaultPhase.includes(p.name.toLowerCase().split(" ")[0].toLowerCase())
    )
    return match?.id || null
  }, [phases])

  const handleAddFromTemplate = useCallback(async (tpl) => {
    await onCreateAction({
      title: tpl.title,
      description: tpl.description,
      channel: tpl.channel,
      action_type: tpl.action_type,
      source: "template",
      template_id: tpl.id,
      priority: "medium",
      kr_ids: resolveKrUuids(tpl.relevant_kr_ids),
      phase_id: resolvePhaseId(tpl.default_phase),
      estimated_days: tpl.estimated_days || 10,
    })
  }, [onCreateAction, resolveKrUuids, resolvePhaseId])

  const handleBatchAdd = useCallback(async (templatesToAdd) => {
    if (!onBatchCreateActions) return
    const payloads = templatesToAdd.map((tpl) => ({
      title: tpl.title,
      description: tpl.description,
      channel: tpl.channel,
      action_type: tpl.action_type,
      source: "template",
      template_id: tpl.id,
      priority: "medium",
      kr_ids: resolveKrUuids(tpl.relevant_kr_ids),
      phase_id: resolvePhaseId(tpl.default_phase),
      estimated_days: tpl.estimated_days || 10,
    }))
    await onBatchCreateActions(payloads)
  }, [onBatchCreateActions, resolveKrUuids, resolvePhaseId])

  const handleEditTemplate = useCallback((tpl) => {
    setEditingAction({
      title: tpl.title,
      description: tpl.description,
      channel: tpl.channel,
      action_type: tpl.action_type,
      source: "template",
      template_id: tpl.id,
      priority: "medium",
      kr_ids: resolveKrUuids(tpl.relevant_kr_ids),
      phase_id: resolvePhaseId(tpl.default_phase),
      estimated_days: tpl.estimated_days || 10,
    })
    setShowForm(false)
  }, [resolveKrUuids, resolvePhaseId])

  const handleAddAction = useCallback(() => {
    setShowForm(true)
    setEditingAction(null)
  }, [])

  const [onboarding, setOnboarding] = useState(false)

  const handleOnboardingAdd = useCallback(async () => {
    if (!onBatchCreateActions || !templates?.length) return
    setOnboarding(true)
    try {
      const payloads = templates.map((tpl) => ({
        title: tpl.title,
        description: tpl.description,
        channel: tpl.channel,
        action_type: tpl.action_type,
        source: "template",
        template_id: tpl.id,
        priority: "medium",
        kr_ids: resolveKrUuids(tpl.relevant_kr_ids),
        phase_id: resolvePhaseId(tpl.default_phase),
        estimated_days: tpl.estimated_days || 10,
      }))
      await onBatchCreateActions(payloads)
    } finally {
      setOnboarding(false)
    }
  }, [onBatchCreateActions, templates, resolveKrUuids, resolvePhaseId])

  const newTemplateCount = useMemo(() => {
    if (!templates?.length || !existingTemplateIds) return templates?.length || 0
    return templates.filter((tpl) => !existingTemplateIds.has(tpl.id)).length
  }, [templates, existingTemplateIds])

  const showOnboarding = totalActions === 0 && newTemplateCount > 0 && !showForm && !editingAction

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Rocket className="w-7 h-7 text-primary" />
          <h2 className="font-sans font-bold text-3xl gradient-heading">Plan marketing</h2>
        </div>
        <p className="text-muted-foreground mt-2">
          {totalActions} action{totalActions !== 1 ? "s" : ""} planned
          {totalActions > 0 && ` \u2014 ${doneActions} completed`}
        </p>
      </div>

      {/* Onboarding: first visit with templates available */}
      {showOnboarding && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-foreground">
              {newTemplateCount} actions recommandées
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Basées sur vos OKRs, nous avons identifié des actions marketing prêtes à l'emploi.
              Ajoutez-les toutes d'un clic, ou parcourez-les une par une.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={handleOnboardingAdd} disabled={onboarding} className="gap-2">
              {onboarding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {onboarding ? "Ajout en cours..." : `Ajouter les ${newTemplateCount} actions`}
            </Button>
            <Button variant="outline" onClick={handleAddAction}>
              <Plus className="w-4 h-4 mr-1" />
              Créer manuellement
            </Button>
          </div>
        </div>
      )}

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

      {/* Toolbar + Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ActionsViewToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          onAddAction={handleAddAction}
        />
        <ExportActionsToolbar
          disabled={totalActions === 0}
          onExportPDF={onExportPDF}
          onExportExcel={onExportExcel}
          onCopyNotion={onCopyNotion}
          onShareLink={onShareLink}
        />
      </div>

      {/* Active view */}
      {viewMode === "table" && (
        <ActionsTableView
          actions={actions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateAction={handleInlineUpdate}
          krStatuses={krStatuses}
          phases={phases}
        />
      )}
      {viewMode === "kanban" && (
        <ActionsKanbanView
          actions={actions}
          groupBy={groupBy}
          uuidToTeam={uuidToTeam}
          krStatuses={krStatuses}
          phases={phases}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateAction={handleInlineUpdate}
        />
      )}
      {viewMode === "gantt" && (
        <ActionsGanttView
          actions={actions}
          phases={phases}
          dependencies={dependencies}
          onCreateDependency={onCreateDependency}
          onDeleteDependency={onDeleteDependency}
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
          phases={phases}
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
          phases={phases}
          onSubmit={handleCreate}
          onCancel={() => setEditingAction(null)}
        />
      )}

      {/* New action form */}
      {showForm && (
        <ActionForm
          selected={selected}
          krStatuses={krStatuses}
          phases={phases}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Export & Share */}
      {totalActions > 0 && !showForm && !editingAction && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 glass-card">
          <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Export &amp; Share
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={onExportExcel}
              className="group flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-emerald-50 hover:border-emerald-300 p-4 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-emerald-700">Excel</span>
              <span className="text-[10px] text-emerald-600/70 leading-tight text-center">
                Full action plan with timeline &amp; budget
              </span>
            </button>

            <button
              onClick={onExportPDF}
              className="group flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-violet-50 hover:border-violet-300 p-4 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
              <span className="text-sm font-semibold text-violet-700">PDF</span>
              <span className="text-[10px] text-violet-600/70 leading-tight text-center">
                One-page summary for leadership review
              </span>
            </button>

            <button
              onClick={handleCopyNotion}
              className="group flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-gray-50 hover:border-gray-300 p-4 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
                {notionCopied
                  ? <Check className="w-5 h-5 text-emerald-600" />
                  : <Copy className="w-5 h-5 text-gray-600" />
                }
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {notionCopied ? "Copied!" : "Notion"}
              </span>
              <span className="text-[10px] text-gray-500 leading-tight text-center">
                Markdown tables ready to paste
              </span>
            </button>

            <button
              onClick={handleShareLink}
              className="group flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-blue-50 hover:border-blue-300 p-4 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                {shareCopied
                  ? <Check className="w-5 h-5 text-emerald-600" />
                  : <Link2 className="w-5 h-5 text-blue-600" />
                }
              </div>
              <span className="text-sm font-semibold text-blue-700">
                {shareCopied ? "Copied!" : "Share link"}
              </span>
              <span className="text-[10px] text-blue-600/70 leading-tight text-center">
                Shareable URL with your full config
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Template suggestions */}
      {templates && templates.length > 0 && !showForm && !editingAction && (
        <TemplateSuggestions
          templates={templates}
          existingTemplateIds={existingTemplateIds}
          onAddFromTemplate={handleAddFromTemplate}
          onEditTemplate={handleEditTemplate}
          onBatchAdd={handleBatchAdd}
        />
      )}
    </div>
  )
}
