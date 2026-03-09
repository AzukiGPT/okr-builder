const STEPS = [
  { label: "Context", icon: "1" },
  { label: "Select", icon: "2" },
  { label: "Funnel", icon: "3" },
  { label: "System", icon: "4" },
]

function StepButton({ step, index, currentStep, maxStep, onClick }) {
  const isDone = index < currentStep
  const isActive = index === currentStep
  const isClickable = index <= maxStep

  const circleClass = isDone
    ? "bg-emerald-500"
    : isActive
      ? "bg-primary"
      : "bg-sidebar-accent/50"

  const labelClass = isActive
    ? "text-sidebar-foreground font-bold"
    : isDone
      ? "text-sidebar-foreground/80"
      : "text-sidebar-foreground/40"

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => onClick(index)}
      className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition-all ${
        isActive ? "bg-primary/10 border border-primary/20" : "border border-transparent"
      } ${
        isClickable && !isActive ? "hover:bg-sidebar-accent cursor-pointer" : isClickable ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <span
        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-mono font-bold shrink-0 ${circleClass}${isActive ? " glow-sm" : ""} ${isDone || isActive ? "text-white" : "text-muted-foreground"}`}
      >
        {isDone ? "\u2713" : step.icon}
      </span>
      <span className={`text-sm ${labelClass}`}>{step.label}</span>
    </button>
  )
}

function MiniRecap({ ctx, selected, onReset, onShare, shared }) {
  const totalSelected =
    selected.sales.length + selected.marketing.length + selected.csm.length

  return (
    <div className="bg-sidebar-accent rounded-lg p-3 space-y-2 glass-card">
      <p className="text-sidebar-foreground/60 text-xs font-mono tracking-wide">RECAP</p>
      {ctx.stage && (
        <p className="text-sidebar-foreground text-xs">
          <span className="text-sidebar-foreground/60">Stage:</span> {ctx.stage}
        </p>
      )}
      {ctx.bottleneck && (
        <p className="text-sidebar-foreground text-xs">
          <span className="text-sidebar-foreground/60">Focus:</span> {ctx.bottleneck}
        </p>
      )}
      {totalSelected > 0 && (
        <p className="text-sidebar-foreground text-xs">
          <span className="text-sidebar-foreground/60">Objectives:</span> {totalSelected}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          Reset
        </button>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            {shared ? "Copied!" : "Share"}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Sidebar({
  step,
  maxStep,
  setStep,
  ctx,
  selected,
  onReset,
  onShare,
  shared,
  mobile,
}) {
  if (mobile) {
    return (
      <nav className="w-full bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center gap-2 shadow-sm">
        <span className="font-sans font-bold text-sidebar-foreground text-lg mr-4">OKR Builder</span>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const isDone = i < step
            const isActive = i === step
            const isClickable = i <= maxStep

            const circleClass = isDone
              ? "bg-emerald-500"
              : isActive
                ? "bg-primary"
                : "bg-sidebar-accent/50"

            return (
              <button
                key={s.label}
                type="button"
                disabled={!isClickable}
                onClick={() => setStep(i)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-mono font-bold shrink-0 ${circleClass} ${isDone || isActive ? "text-white" : "text-muted-foreground"} ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {isDone ? "\u2713" : s.icon}
              </button>
            )
          })}
        </div>
      </nav>
    )
  }

  return (
    <nav className="w-56 h-screen sticky top-0 border-r border-sidebar-border/50 flex flex-col bg-sidebar">
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-sans font-bold text-xl gradient-heading">OKR Builder</h1>
        {ctx.company && (
          <p className="text-sidebar-foreground/40 text-xs mt-1 truncate">{ctx.company}</p>
        )}
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

      <div className="flex-1 flex flex-col gap-1 px-2 py-3">
        {STEPS.map((s, i) => (
          <StepButton
            key={s.label}
            step={s}
            index={i}
            currentStep={step}
            maxStep={maxStep}
            onClick={setStep}
          />
        ))}
      </div>

      {ctx.stage && (
        <div className="px-3 pb-4">
          <MiniRecap
            ctx={ctx}
            selected={selected}
            onReset={onReset}
            onShare={onShare}
            shared={shared}
          />
        </div>
      )}
    </nav>
  )
}
