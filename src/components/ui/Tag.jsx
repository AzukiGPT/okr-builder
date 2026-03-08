const VARIANT_STYLES = {
  recommended: "bg-accent-light text-accent",
  relevant: "bg-gray-100 text-gray-600",
  leading: "bg-csm-light text-csm",
  lagging: "bg-sales-light text-sales",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-blue-100 text-blue-700",
}

export default function Tag({ children, variant = "info" }) {
  const variantClass = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wide ${variantClass}`}
    >
      {children}
    </span>
  )
}
