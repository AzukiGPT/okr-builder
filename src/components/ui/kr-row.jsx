import Tag from "./tag-custom"

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "at_risk", label: "At Risk" },
  { value: "done", label: "Done" },
]

const STATUS_COLORS = {
  not_started: "#6B7280",
  in_progress: "#3B82F6",
  at_risk: "#F59E0B",
  done: "#22C55E",
}

export default function KRRow({
  kr,
  index,
  teamConfig,
  suggestedTarget,
  customTarget,
  onTargetChange,
  krStatus = "not_started",
  krProgress = 0,
  currentValue = 0,
  targetValue = 0,
  onStatusChange,
  onProgressChange,
  onValuesChange,
}) {
  const { colorHex } = teamConfig
  const rowBg = index % 2 === 0 ? "bg-card/50" : "bg-card"
  const tagVariant = kr.type === "Leading" ? "leading" : "lagging"

  const handleCurrentChange = (e) => {
    if (onValuesChange) {
      onValuesChange(kr.id, e.target.value, targetValue)
    }
  }

  const handleTargetChange = (e) => {
    if (onValuesChange) {
      onValuesChange(kr.id, currentValue, e.target.value)
    }
  }

  return (
    <div className={`grid grid-cols-[32px_36px_1fr_80px_80px_100px_56px_72px] items-center px-4 py-3 gap-1.5 ${rowBg}`}>
      <span
        className="font-mono font-bold text-xs"
        style={{ color: colorHex }}
      >
        {index + 1}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">{kr.id}</span>
      <span className="text-sm text-foreground pr-2">{kr.text}</span>
      {/* Current value */}
      {onValuesChange ? (
        <input
          type="number"
          value={currentValue ?? ""}
          onChange={handleCurrentChange}
          placeholder="0"
          className="w-full px-1.5 py-1 border rounded text-xs font-mono text-center bg-background border-border text-foreground focus:outline-none focus:ring-1"
          style={{ "--tw-ring-color": colorHex }}
        />
      ) : (
        <span className="text-xs font-mono text-center text-muted-foreground">{currentValue ?? "—"}</span>
      )}
      {/* Target value */}
      {onValuesChange ? (
        <input
          type="number"
          value={targetValue ?? ""}
          onChange={handleTargetChange}
          placeholder="0"
          className="w-full px-1.5 py-1 border rounded text-xs font-mono text-center bg-background border-border text-foreground focus:outline-none focus:ring-1"
          style={{ "--tw-ring-color": colorHex }}
        />
      ) : (
        <span className="text-xs font-mono text-center text-muted-foreground">{targetValue ?? "—"}</span>
      )}
      {/* Status */}
      {onStatusChange ? (
        <select
          value={krStatus}
          onChange={(e) => onStatusChange(kr.id, e.target.value)}
          className="w-full px-1 py-1 border rounded text-[10px] font-semibold bg-background border-border text-foreground focus:outline-none focus:ring-1 cursor-pointer"
          style={{
            "--tw-ring-color": STATUS_COLORS[krStatus] || colorHex,
            color: STATUS_COLORS[krStatus],
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <span />
      )}
      {/* Progress — auto-calculated from current/target */}
      <div className="relative w-full">
        <div className="absolute inset-0 rounded overflow-hidden bg-gray-100">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${krProgress}%`,
              backgroundColor: STATUS_COLORS[krStatus] || colorHex,
              opacity: 0.2,
            }}
          />
        </div>
        <span className="relative block w-full px-1 py-1 text-[10px] font-mono font-semibold text-center bg-transparent border border-border rounded">
          {krProgress}%
        </span>
      </div>
      <div className="flex justify-end">
        <Tag variant={tagVariant}>{kr.type}</Tag>
      </div>
    </div>
  )
}
