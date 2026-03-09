import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const VARIANT_STYLES = {
  recommended: "bg-primary/20 text-primary border-primary/30",
  relevant: "bg-muted text-muted-foreground border-border",
  leading: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  lagging: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  info: "bg-sky-500/20 text-sky-400 border-sky-500/30",
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
