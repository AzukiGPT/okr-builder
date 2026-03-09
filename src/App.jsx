import { useOKRState } from "./hooks/useOKRState"
import { useFunnelCalc } from "./hooks/useFunnelCalc"
import { generatePDF } from "./utils/exportPDF"
import AppShell from "./components/layout/AppShell"
import ContextStep from "./components/steps/ContextStep"
import SelectionStep from "./components/steps/SelectionStep"
import FunnelStep from "./components/steps/FunnelStep"
import OKRSystemStep from "./components/steps/OKRSystemStep"

export default function App() {
  const {
    state, setStep, setCtx, toggleObjective,
    setFunnel, setCustomTarget, reset
  } = useOKRState()
  const calc = useFunnelCalc(state.funnel)

  return (
    <AppShell
      step={state.step}
      setStep={setStep}
      ctx={state.ctx}
      selected={state.selected}
      onReset={() => { reset(); setStep(0) }}
    >
      {state.step === 0 && (
        <ContextStep
          ctx={state.ctx}
          setCtx={setCtx}
          onNext={() => setStep(1)}
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
          onBack={() => setStep(2)}
          onReset={() => { reset(); setStep(0) }}
          onExportPDF={() => generatePDF({
            ctx: state.ctx,
            selected: state.selected,
            calc,
            customTargets: state.customTargets,
          })}
          onShare={() => {}}
          shared={false}
        />
      )}
    </AppShell>
  )
}
