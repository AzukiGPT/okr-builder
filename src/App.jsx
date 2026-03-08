import { useOKRState } from "./hooks/useOKRState"
import AppShell from "./components/layout/AppShell"

export default function App() {
  const { state, setStep, reset } = useOKRState()

  return (
    <AppShell
      step={state.step}
      setStep={setStep}
      ctx={state.ctx}
      selected={state.selected}
      onReset={reset}
    >
      <h1 className="font-display text-3xl text-text">
        Step {state.step + 1}
      </h1>
      <p className="text-muted mt-2">Content placeholder</p>
    </AppShell>
  )
}
