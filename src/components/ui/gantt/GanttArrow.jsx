import { useState, useMemo } from "react"

/**
 * Compute SVG connection points based on dependency type.
 * FS: right-of-predecessor -> left-of-successor
 * SS: left -> left
 * FF: right -> right
 * SF: left-of-predecessor -> right-of-successor
 */
function getEndpoints(predBar, succBar, depType) {
  const predMidY = predBar.top + predBar.height / 2
  const succMidY = succBar.top + succBar.height / 2

  switch (depType) {
    case "SS":
      return { x1: predBar.left, y1: predMidY, x2: succBar.left, y2: succMidY }
    case "FF":
      return { x1: predBar.left + predBar.width, y1: predMidY, x2: succBar.left + succBar.width, y2: succMidY }
    case "SF":
      return { x1: predBar.left, y1: predMidY, x2: succBar.left + succBar.width, y2: succMidY }
    case "FS":
    default:
      return { x1: predBar.left + predBar.width, y1: predMidY, x2: succBar.left, y2: succMidY }
  }
}

/** Build a cubic Bezier path between two points. */
function buildPath(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1)
  const cpOffset = Math.max(20, dx * 0.3)
  return `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`
}

export default function GanttArrow({
  dependency,
  predBar,
  succBar,
  isViolation,
  onDelete,
}) {
  const [hovered, setHovered] = useState(false)

  const { x1, y1, x2, y2 } = useMemo(
    () => getEndpoints(predBar, succBar, dependency.dep_type),
    [predBar, succBar, dependency.dep_type]
  )

  const pathD = useMemo(() => buildPath(x1, y1, x2, y2), [x1, y1, x2, y2])

  const strokeColor = isViolation
    ? "var(--destructive, #EF4444)"
    : hovered
      ? "var(--primary, #8B5CF6)"
      : "var(--border, #e5e7eb)"

  const strokeWidth = hovered ? 3 : 2
  const opacity = hovered ? 1 : 0.6

  return (
    <g
      className="cursor-pointer"
      style={{ pointerEvents: "auto" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onDelete?.(dependency.id)}
    >
      {/* Invisible wider path for easier hover target */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />

      {/* Visible arrow path */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        strokeDasharray={isViolation ? "6 3" : "none"}
        className="transition-all duration-150"
      />

      {/* Arrowhead */}
      <circle
        cx={x2}
        cy={y2}
        r={hovered ? 4 : 3}
        fill={strokeColor}
        opacity={opacity}
        className="transition-all duration-150"
      />

      {/* Hover tooltip */}
      {hovered && (
        <foreignObject x={Math.min(x1, x2)} y={Math.min(y1, y2) - 28} width={120} height={24}>
          <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-md border border-border whitespace-nowrap">
            {dependency.dep_type}{dependency.lag_days > 0 ? ` +${dependency.lag_days}d` : ""}
            {isViolation && " (violation)"}
          </div>
        </foreignObject>
      )}
    </g>
  )
}

export { getEndpoints }
