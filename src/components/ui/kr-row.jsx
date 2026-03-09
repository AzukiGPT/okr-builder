import Tag from "./tag-custom"

export default function KRRow({
  kr,
  index,
  teamConfig,
  suggestedTarget,
  customTarget,
  onTargetChange,
}) {
  const { colorHex } = teamConfig
  const rowBg = index % 2 === 0 ? "bg-card/50" : "bg-card"
  const tagVariant = kr.type === "Leading" ? "leading" : "lagging"
  const displayValue = customTarget ?? suggestedTarget ?? ""

  const handleChange = (e) => {
    onTargetChange(kr.id, e.target.value)
  }

  return (
    <div className={`grid grid-cols-[40px_36px_1fr_160px_80px] items-center px-5 py-3 ${rowBg}`}>
      <span
        className="font-mono font-bold text-xs"
        style={{ color: colorHex }}
      >
        {index + 1}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">{kr.id}</span>
      <span className="text-sm text-foreground">{kr.text}</span>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        className="w-full px-2 py-1 border rounded text-xs font-mono text-center bg-background border-border text-foreground focus:outline-none focus:ring-1"
        style={{ "--tw-ring-color": colorHex }}
      />
      <div className="flex justify-end">
        <Tag variant={tagVariant}>{kr.type}</Tag>
      </div>
    </div>
  )
}
