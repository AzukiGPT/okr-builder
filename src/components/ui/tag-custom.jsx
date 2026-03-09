import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const VARIANT_STYLES = {
  recommended: "bg-primary/10 text-primary border-primary/20",
  relevant: "bg-muted text-muted-foreground border-border",
  leading: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lagging: "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  not_started: "bg-gray-50 text-gray-600 border-gray-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  at_risk: "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  todo: "bg-gray-50 text-gray-600 border-gray-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  low: "bg-gray-50 text-gray-600 border-gray-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-600 border-red-200",
  critical: "bg-red-100 text-red-800 border-red-300",
}

export default function Tag({ children, variant = "info" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-mono font-bold tracking-wide",
        VARIANT_STYLES[variant] ?? VARIANT_STYLES.info
      )}
    >
      {children}
    </Badge>
  )
}
