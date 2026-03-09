import Tag from "./tag-custom"
import { cn } from "@/lib/utils"

export default function ObjectiveCard({
  objective,
  isSelected,
  isDisabled,
  recommendation,
  teamConfig,
  onToggle,
}) {
  const { colorHex } = teamConfig
  const krCount = objective.krs.length

  const handleClick = () => {
    if (isDisabled) return
    onToggle(objective.id)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleClick()
    }
  }

  const isRecommended = recommendation === "recommended" && !isSelected

  const outerClasses = cn(
    "flex items-start gap-3 p-4 rounded-lg border transition-all duration-150",
    isDisabled
      ? "opacity-40 cursor-not-allowed"
      : "cursor-pointer",
    !isDisabled && "hover:bg-accent/50 hover:border-primary/30"
  )

  const borderStyle = {
    borderLeftWidth: isSelected || isRecommended ? "3px" : undefined,
    borderLeftColor: isSelected
      ? colorHex
      : isRecommended
        ? "#8B5CF6"
        : undefined,
    backgroundColor: isSelected
      ? `${colorHex}10`
      : isRecommended
        ? `${colorHex}08`
        : undefined,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    boxShadow: isSelected
      ? `0 0 20px -5px ${colorHex}30, 0 4px 24px -4px oklch(0 0 0 / 0.2)`
      : "0 4px 24px -4px oklch(0 0 0 / 0.2)",
  }

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      className={outerClasses}
      style={borderStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span
        className="flex items-center justify-center w-5 h-5 rounded shrink-0 mt-0.5 text-[11px] font-bold text-white"
        style={{
          backgroundColor: isSelected ? colorHex : "transparent",
          border: isSelected ? "none" : "2px solid hsl(240 4% 20%)",
          color: isSelected ? "#FFFFFF" : "transparent",
        }}
      >
        {isSelected ? "\u2713" : ""}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono text-xs font-bold"
            style={{ color: colorHex }}
          >
            {objective.id}
          </span>
          <span className="font-semibold text-sm text-foreground">
            {objective.title}
          </span>
          {recommendation && recommendation !== "none" && (
            <Tag variant={recommendation}>{recommendation}</Tag>
          )}
        </div>
        <p className="text-xs italic text-muted-foreground mt-1">{objective.when}</p>
        {isSelected && (
          <div className="flex flex-wrap gap-1 mt-2">
            {objective.krs.map((kr) => (
              <span
                key={kr.id}
                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${colorHex}15`,
                  color: colorHex,
                }}
              >
                {kr.id}
              </span>
            ))}
          </div>
        )}
      </div>

      <span className="font-mono text-xs text-muted-foreground shrink-0 mt-0.5">
        {krCount} KRs
      </span>
    </div>
  )
}
