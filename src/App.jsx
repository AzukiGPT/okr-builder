import { useState, useCallback, useEffect } from "react"
import { parseContextValue } from "./utils/parseContextValue"
import { useOKRState } from "./hooks/useOKRState"
import { useFunnelCalc } from "./hooks/useFunnelCalc"
import { useCloudSync } from "./hooks/useCloudSync"
import { useKRSync } from "./hooks/useKRSync"
import { useActions } from "./hooks/useActions"
import { useTemplates } from "./hooks/useTemplates"
import { usePhases } from "./hooks/usePhases"
import { useDependencies } from "./hooks/useDependencies"
import { generatePDF } from "./utils/exportPDF"
import { generateExcel } from "./utils/exportExcel"
import { copyNotionMarkdown } from "./utils/exportNotion"
import { useShareableURL } from "./hooks/useShareableURL"
import { generateActionsPDF } from "./utils/exportActionsPDF"
import { generateActionsExcel } from "./utils/exportActionsExcel"
import { copyActionsMarkdown } from "./utils/exportActionsNotion"
import { shareActionsURL } from "./utils/shareActionsURL"
import AppShell from "./components/layout/AppShell"
import ContextStep from "./components/steps/ContextStep"
import SelectionStep from "./components/steps/SelectionStep"
import FunnelStep from "./components/steps/FunnelStep"
import OKRSystemStep from "./components/steps/OKRSystemStep"
import ActionsStep from "./components/steps/ActionsStep"
import CompanyPage from "./components/steps/CompanyPage"
import MarketingAssetsPage from "./components/steps/MarketingAssetsPage"
import SetSelector from "./components/auth/SetSelector"

export default function App({ onNavigate }) {
  const {
    state, dispatch, setStep, setCtx, toggleObjective,
    setFunnel, setCustomTarget, syncCtxToFunnel, reset
  } = useOKRState()
  const calc = useFunnelCalc(state.funnel)
  const { share, shared } = useShareableURL(state, dispatch)
  const [notionCopied, setNotionCopied] = useState(false)

  const {
    activeSetId, saveStatus, sets,
    loadSets, loadSet, createSet, deleteSet, renameSet, setActiveSetId,
  } = useCloudSync(state, dispatch)

  const { krStatuses, setKRStatus, setKRProgress } = useKRSync(activeSetId)
  const { actions, createAction, batchCreateActions, updateAction, deleteAction, actionsLoading } = useActions(activeSetId)
  const { templates } = useTemplates(state.selected)
  const { phases, ensureDefaultPhases } = usePhases(activeSetId)
  const { dependencies, createDependency, deleteDependency } = useDependencies(activeSetId)
  const activeSetName = sets.find((s) => s.id === activeSetId)?.name || "Action Plan"

  const [activePage, setActivePage] = useState(null)
  const [setsLoading, setSetsLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSets().then(() => setSetsLoading(false))
  }, [loadSets])

  // Navigate to a step (clears activePage so step content shows)
  const handleSetStep = useCallback((s) => {
    setActivePage(null)
    setStep(s)
  }, [setStep])

  const handleSetActivePage = useCallback((pageId) => {
    setActivePage(pageId)
  }, [])

  const handleContextNext = useCallback(() => {
    const parsedWinRate = parseContextValue(state.ctx.winRate)
    if (parsedWinRate != null && parsedWinRate > 0 && parsedWinRate <= 100) {
      syncCtxToFunnel({ winRate: parsedWinRate })
    }
    handleSetStep(1)
  }, [state.ctx.winRate, syncCtxToFunnel, handleSetStep])

  const handleCopyNotion = useCallback(async () => {
    await copyNotionMarkdown({
      ctx: state.ctx,
      selected: state.selected,
      calc,
      customTargets: state.customTargets,
    })
    setNotionCopied(true)
    setTimeout(() => setNotionCopied(false), 2000)
  }, [state.ctx, state.selected, calc, state.customTargets])

  const handleCreateNew = useCallback(async () => {
    setCreating(true)
    setError(null)
    try {
      reset()
      const newSet = await createSet("Mon OKR Set")
      setActiveSetId(newSet.id)
      setActivePage(null)
    } catch (err) {
      setError(err.message || "Failed to create set. Please try again.")
    } finally {
      setCreating(false)
    }
  }, [reset, createSet, setActiveSetId])

  const handleBackToSets = useCallback(() => {
    setActiveSetId(null)
    reset()
    setActivePage("sets")
    loadSets()
  }, [setActiveSetId, reset, loadSets])

  // Determine page key for CSS transitions
  const pageKey = activePage || (!activeSetId ? "sets" : `step-${state.step}`)

  // Determine what content to show
  const showSets = activePage === "sets" || (!activeSetId && !activePage)
  const showStep = activeSetId && !activePage

  return (
    <AppShell
      step={state.step}
      setStep={handleSetStep}
      activeSetId={activeSetId}
      activeSetName={activeSetName}
      saveStatus={saveStatus}
      onBackToSets={handleBackToSets}
      onNavigate={onNavigate}
      activePage={activePage}
      onSetActivePage={handleSetActivePage}
      pageKey={pageKey}
    >
      {activePage === "company" && <CompanyPage />}
      {activePage === "marketing-assets" && <MarketingAssetsPage />}
      {showSets && (
        <SetSelector
          sets={sets}
          loading={setsLoading}
          creating={creating}
          error={error}
          onLoadSet={loadSet}
          onCreateNew={handleCreateNew}
          onDeleteSet={deleteSet}
          onRenameSet={renameSet}
        />
      )}
      {showStep && state.step === 0 && (
        <ContextStep
          ctx={state.ctx}
          setCtx={setCtx}
          onNext={handleContextNext}
        />
      )}
      {showStep && state.step === 1 && (
        <SelectionStep
          ctx={state.ctx}
          selected={state.selected}
          toggleObjective={toggleObjective}
          onNext={() => handleSetStep(2)}
          onBack={() => handleSetStep(0)}
        />
      )}
      {showStep && state.step === 2 && (
        <FunnelStep
          funnel={state.funnel}
          setFunnel={setFunnel}
          calc={calc}
          ctxArr={state.ctx.arr}
          ctxWinRate={state.ctx.winRate}
          onNext={() => handleSetStep(3)}
          onBack={() => handleSetStep(1)}
        />
      )}
      {showStep && state.step === 3 && (
        <OKRSystemStep
          ctx={state.ctx}
          selected={state.selected}
          funnel={state.funnel}
          calc={calc}
          customTargets={state.customTargets}
          setCustomTarget={setCustomTarget}
          krStatuses={krStatuses}
          onKRStatusChange={setKRStatus}
          onKRProgressChange={setKRProgress}
          onBack={() => handleSetStep(2)}
          onNext={() => handleSetStep(4)}
          onReset={() => { reset(); handleSetStep(0) }}
          onExportPDF={() => generatePDF({
            ctx: state.ctx,
            selected: state.selected,
            calc,
            customTargets: state.customTargets,
          })}
          onExportExcel={() => generateExcel({
            ctx: state.ctx,
            selected: state.selected,
            funnel: state.funnel,
            calc,
            customTargets: state.customTargets,
          })}
          onCopyNotion={handleCopyNotion}
          notionCopied={notionCopied}
          onShare={share}
          shared={shared}
        />
      )}
      {showStep && state.step === 4 && (
        <ActionsStep
          selected={state.selected}
          actions={actions}
          actionsLoading={actionsLoading}
          krStatuses={krStatuses}
          activeSetId={activeSetId}
          templates={templates}
          phases={phases}
          ensureDefaultPhases={ensureDefaultPhases}
          onCreateAction={createAction}
          onBatchCreateActions={batchCreateActions}
          onUpdateAction={updateAction}
          dependencies={dependencies}
          onCreateDependency={createDependency}
          onDeleteDependency={deleteDependency}
          onDeleteAction={deleteAction}
          onBack={() => handleSetStep(3)}
          onBackToSets={handleBackToSets}
          onExportPDF={() => generateActionsPDF({
            actions,
            phases,
            krStatuses,
            setName: activeSetName,
          })}
          onExportExcel={() => generateActionsExcel({
            actions,
            phases,
            krStatuses,
            setName: activeSetName,
          })}
          onCopyNotion={() => copyActionsMarkdown({
            actions,
            phases,
            krStatuses,
            setName: activeSetName,
          })}
          onShareLink={() => shareActionsURL({ actions, phases })}
        />
      )}
    </AppShell>
  )
}
