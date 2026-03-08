import { STAGES, BOTTLENECKS } from "../../data/config"

function RadioGroup({ label, options, value, onChange, selectedBorderColor }) {
  return (
    <div
      className="bg-white rounded-xl p-5 border-2 transition-colors"
      style={{ borderColor: value ? selectedBorderColor : "#E8E8E8" }}
    >
      <p className="uppercase text-xs font-semibold tracking-wide text-muted mb-3">
        {label}
      </p>
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = value === opt

          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className="flex items-center gap-3 w-full text-left py-1.5 cursor-pointer group"
            >
              <span
                className="flex items-center justify-center shrink-0 rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  border: isSelected ? "none" : "2px solid #CCCCCC",
                  backgroundColor: isSelected ? selectedBorderColor : "transparent",
                }}
              >
                {isSelected && (
                  <span
                    className="block rounded-full bg-white"
                    style={{ width: 6, height: 6 }}
                  />
                )}
              </span>
              <span
                className={`text-sm ${
                  isSelected ? "font-semibold text-text" : "text-muted group-hover:text-text"
                } transition-colors`}
              >
                {opt}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TextInputCard({ label, value, placeholder, onChange }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-border">
      <label className="uppercase text-xs font-semibold tracking-wide text-muted block mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b-2 border-border bg-transparent text-sm font-semibold text-text outline-none focus:border-accent transition-colors py-1"
      />
    </div>
  )
}

export default function ContextStep({ ctx, setCtx, onNext }) {
  const contextReady = ctx.stage && ctx.bottleneck

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-text">
          What's your situation?
        </h2>
        <p className="text-muted mt-2">
          Your answers determine which objectives are recommended.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl p-5 border border-border">
            <label className="uppercase text-xs font-semibold tracking-wide text-muted block mb-2">
              Company name
            </label>
            <input
              type="text"
              value={ctx.company}
              placeholder="e.g. Acme Corp"
              onChange={(e) => setCtx("company", e.target.value)}
              className="w-full border-none bg-transparent text-lg font-semibold text-text outline-none"
            />
          </div>
        </div>

        <RadioGroup
          label="Company stage"
          options={STAGES}
          value={ctx.stage}
          onChange={(val) => setCtx("stage", val)}
          selectedBorderColor="#4A235A"
        />

        <RadioGroup
          label="Primary bottleneck"
          options={BOTTLENECKS}
          value={ctx.bottleneck}
          onChange={(val) => setCtx("bottleneck", val)}
          selectedBorderColor="#C0392B"
        />

        <TextInputCard
          label="Current ARR"
          value={ctx.arr}
          placeholder="e.g. \u20AC800k"
          onChange={(val) => setCtx("arr", val)}
        />
        <TextInputCard
          label="Win rate"
          value={ctx.winRate}
          placeholder="e.g. 20%"
          onChange={(val) => setCtx("winRate", val)}
        />
        <TextInputCard
          label="Annual churn"
          value={ctx.churn}
          placeholder="e.g. 8%"
          onChange={(val) => setCtx("churn", val)}
        />
        <TextInputCard
          label="Founder-led sales?"
          value={ctx.founderLed}
          placeholder="Yes / Partially / No"
          onChange={(val) => setCtx("founderLed", val)}
        />
      </div>

      {contextReady && (
        <div className="bg-accent-light rounded-xl p-5 border border-accent/20">
          <div className="flex items-start gap-3">
            <span className="text-accent text-xl shrink-0" aria-hidden="true">
              &#10003;
            </span>
            <div className="flex-1">
              <p className="font-semibold text-text">
                Context set. Recommendations are ready.
              </p>
              <p className="text-sm text-muted mt-1">
                Stage: <strong>{ctx.stage}</strong> &middot; Bottleneck:{" "}
                <strong>{ctx.bottleneck}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onNext}
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              View recommendations &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
