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
    loadSets, loadSet, createSet, setActiveSetId,
  } = useCloudSync(state, dispatch)

  const { krStatuses, setKRStatus, setKRProgress, setKRValues } = useKRSync(activeSetId)
  const { actions, createAction, batchCreateActions, updateAction, deleteAction, actionsLoading } = useActions(activeSetId)
  const { templates } = useTemplates(state.selected)
  const { phases, ensureDefaultPhases } = usePhases(activeSetId)
  const { dependencies, createDependency, deleteDependency } = useDependencies(activeSetId)
  const activeSetName = sets.find((s) => s.id === activeSetId)?.name || "Mon OKR Set"

  const [activePage, setActivePage] = useState(null)
  const [setsLoading, setSetsLoading] = useState(true)

  // Auto-init: load or create the single OKR set
  useEffect(() => {
    let cancelled = false
    async function initSet() {
      const existingSets = await loadSets()
      if (cancelled) return
      if (existingSets.length > 0) {
        loadSet(existingSets[0])
      } else {
        reset()
        const newSet = await createSet("Mon OKR Set")
        if (cancelled) return
        setActiveSetId(newSet.id)
      }
      setSetsLoading(false)
    }
    initSet().catch(() => setSetsLoading(false))
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Page key for CSS transitions
  const pageKey = activePage || `step-${state.step}`

  const showStep = activeSetId && !activePage

  if (setsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AppShell
      step={state.step}
      setStep={handleSetStep}
      activeSetId={activeSetId}
      activeSetName={activeSetName}
      saveStatus={saveStatus}
      onNavigate={onNavigate}
      activePage={activePage}
      onSetActivePage={handleSetActivePage}
      pageKey={pageKey}
    >
      {activePage === "company" && <CompanyPage />}
      {activePage === "marketing-assets" && <MarketingAssetsPage />}
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
          onKRValuesChange={setKRValues}
          onBack={() => handleSetStep(2)}
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
