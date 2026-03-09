export default function FunnelBar({ label, value, max, colorHex, weekly, daily }) {
  const fillPercent = max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <div className="flex items-baseline gap-2">
          <span
            className="text-2xl font-extrabold font-mono"
            style={{ color: colorHex }}
          >
            {value}
          </span>
          {(weekly !== undefined || daily !== undefined) && (
            <span className="text-xs text-muted-foreground">
              {weekly !== undefined && `${weekly}/wk`}
              {weekly !== undefined && daily !== undefined && " \u00B7 "}
              {daily !== undefined && `${daily}/day`}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${fillPercent}%`,
            backgroundColor: colorHex,
            boxShadow: `0 0 8px -2px ${colorHex}60`,
          }}
        />
      </div>
    </div>
  )
}
