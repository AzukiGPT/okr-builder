import { useState, useCallback, useEffect } from "react"
import { parseContextValue } from "./utils/parseContextValue"
import { useOKRState } from "./hooks/useOKRState"
import { useFunnelCalc } from "./hooks/useFunnelCalc"
import { useCloudSync } from "./hooks/useCloudSync"
import { useKRSync } from "./hooks/useKRSync"
import { useActions } from "./hooks/useActions"
import { useTemplates } from "./hooks/useTemplates"
import { generatePDF } from "./utils/exportPDF"
import { generateExcel } from "./utils/exportExcel"
import { copyNotionMarkdown } from "./utils/exportNotion"
import { useShareableURL } from "./hooks/useShareableURL"
import AppShell from "./components/layout/AppShell"
import ContextStep from "./components/steps/ContextStep"
import SelectionStep from "./components/steps/SelectionStep"
import FunnelStep from "./components/steps/FunnelStep"
import OKRSystemStep from "./components/steps/OKRSystemStep"
import ActionsStep from "./components/steps/ActionsStep"
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

  const [setsLoading, setSetsLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSets().then(() => setSetsLoading(false))
  }, [loadSets])

  const handleContextNext = useCallback(() => {
    const parsedWinRate = parseContextValue(state.ctx.winRate)
    if (parsedWinRate != null && parsedWinRate > 0 && parsedWinRate <= 100) {
      syncCtxToFunnel({ winRate: parsedWinRate })
    }
    setStep(1)
  }, [state.ctx.winRate, syncCtxToFunnel, setStep])

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
    } catch (err) {
      setError(err.message || "Failed to create set. Please try again.")
    } finally {
      setCreating(false)
    }
  }, [reset, createSet, setActiveSetId])

  const handleBackToSets = useCallback(() => {
    setActiveSetId(null)
    reset()
    loadSets()
  }, [setActiveSetId, reset, loadSets])

  if (!activeSetId) {
    return (
      <SetSelector
        sets={sets}
        loading={setsLoading}
        creating={creating}
        error={error}
        onLoadSet={loadSet}
        onCreateNew={handleCreateNew}
        onDeleteSet={deleteSet}
        onRenameSet={renameSet}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <AppShell
      step={state.step}
      maxStep={state.maxStep}
      setStep={setStep}
      ctx={state.ctx}
      selected={state.selected}
      onReset={() => { reset(); setStep(0) }}
      onShare={share}
      shared={shared}
      saveStatus={saveStatus}
      onBackToSets={handleBackToSets}
      onNavigate={onNavigate}
    >
      {state.step === 0 && (
        <ContextStep
          ctx={state.ctx}
          setCtx={setCtx}
          onNext={handleContextNext}
        />
      )}
      {state.step === 1 && (
        <SelectionStep
          ctx={state.ctx}
          selected={state.selected}
          toggleObjective={toggleObjective}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {state.step === 2 && (
        <FunnelStep
          funnel={state.funnel}
          setFunnel={setFunnel}
          calc={calc}
          ctxArr={state.ctx.arr}
          ctxWinRate={state.ctx.winRate}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {state.step === 3 && (
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
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
          onReset={() => { reset(); setStep(0) }}
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
      {state.step === 4 && (
        <ActionsStep
          selected={state.selected}
          actions={actions}
          actionsLoading={actionsLoading}
          krStatuses={krStatuses}
          activeSetId={activeSetId}
          templates={templates}
          onCreateAction={createAction}
          onBatchCreateActions={batchCreateActions}
          onUpdateAction={updateAction}
          onDeleteAction={deleteAction}
          onBack={() => setStep(3)}
          onBackToSets={handleBackToSets}
        />
      )}
    </AppShell>
  )
}
