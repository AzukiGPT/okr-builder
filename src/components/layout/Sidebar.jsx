const STEPS = [
  { label: "Context", icon: "1" },
  { label: "Select", icon: "2" },
  { label: "Funnel", icon: "3" },
  { label: "System", icon: "4" },
]

function StepButton({ step, index, currentStep, onClick }) {
  const isDone = index < currentStep
  const isActive = index === currentStep
  const isClickable = index <= currentStep

  const circleClass = isDone
    ? "bg-csm"
    : isActive
      ? "bg-accent"
      : "bg-white/20"

  const labelClass = isActive
    ? "text-white font-bold"
    : isDone
      ? "text-white/80"
      : "text-white/40"

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => onClick(index)}
      className={`flex items-center gap-3 w-full px-4 py-2 rounded-lg transition-colors ${
        isClickable ? "hover:bg-white/10 cursor-pointer" : "cursor-default"
      }`}
    >
      <span
        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-mono font-bold text-white shrink-0 ${circleClass}`}
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
    <div className="bg-white/10 rounded-lg p-3 space-y-2">
      <p className="text-white/60 text-xs font-mono tracking-wide">RECAP</p>
      {ctx.stage && (
        <p className="text-white text-xs">
          <span className="text-white/60">Stage:</span> {ctx.stage}
        </p>
      )}
      {ctx.bottleneck && (
        <p className="text-white text-xs">
          <span className="text-white/60">Focus:</span> {ctx.bottleneck}
        </p>
      )}
      {totalSelected > 0 && (
        <p className="text-white text-xs">
          <span className="text-white/60">Objectives:</span> {totalSelected}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-white/60 hover:text-white transition-colors"
        >
          Reset
        </button>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="text-[11px] text-white/60 hover:text-white transition-colors"
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
      <nav className="w-full bg-chrome px-4 py-3 flex items-center gap-2">
        <span className="font-display text-white text-lg mr-4">OKR Builder</span>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const isDone = i < step
            const isActive = i === step
            const isClickable = i <= step

            const circleClass = isDone
              ? "bg-csm"
              : isActive
                ? "bg-accent"
                : "bg-white/20"

            return (
              <button
                key={s.label}
                type="button"
                disabled={!isClickable}
                onClick={() => setStep(i)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-mono font-bold text-white shrink-0 ${circleClass} ${
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
    <nav className="w-56 h-screen sticky top-0 bg-chrome flex flex-col">
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-display text-white text-xl">OKR Builder</h1>
        {ctx.company && (
          <p className="text-white/40 text-xs mt-1 truncate">{ctx.company}</p>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-1 px-2 py-2">
        {STEPS.map((s, i) => (
          <StepButton
            key={s.label}
            step={s}
            index={i}
            currentStep={step}
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
