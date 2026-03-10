import { useState, useCallback } from "react"
import { FileText, FileSpreadsheet, Copy, Link2, Check, Loader2 } from "lucide-react"

const BUTTONS = [
  { key: "pdf", label: "PDF", Icon: FileText, colorClass: "text-violet-600", bgClass: "bg-violet-50 hover:bg-violet-100" },
  { key: "excel", label: "Excel", Icon: FileSpreadsheet, colorClass: "text-emerald-600", bgClass: "bg-emerald-50 hover:bg-emerald-100" },
  { key: "notion", label: "Notion", Icon: Copy, colorClass: "text-gray-600", bgClass: "bg-gray-50 hover:bg-gray-100", hasCopied: true },
  { key: "link", label: "Link", Icon: Link2, colorClass: "text-blue-600", bgClass: "bg-blue-50 hover:bg-blue-100", hasCopied: true },
]

export default function ExportActionsToolbar({
  disabled,
  onExportPDF,
  onExportExcel,
  onCopyNotion,
  onShareLink,
}) {
  const [loading, setLoading] = useState(null)
  const [copied, setCopied] = useState(null)

  const handleClick = useCallback(async (key, handler, hasCopied) => {
    if (!handler) return
    setLoading(key)
    try {
      await handler()
      if (hasCopied) {
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
      }
    } catch (err) {
      console.error(`Export ${key} failed:`, err)
    } finally {
      setLoading(null)
    }
  }, [])

  const handlers = { pdf: onExportPDF, excel: onExportExcel, notion: onCopyNotion, link: onShareLink }

  return (
    <div className="flex items-center gap-1.5">
      {BUTTONS.map(({ key, label, Icon, colorClass, bgClass, hasCopied }) => {
        const isLoading = loading === key
        const isCopied = copied === key
        const ActiveIcon = isCopied ? Check : isLoading ? Loader2 : Icon

        return (
          <button
            key={key}
            type="button"
            disabled={disabled || isLoading}
            onClick={() => handleClick(key, handlers[key], hasCopied)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${bgClass}`}
            title={isCopied ? "Copied!" : `Export as ${label}`}
          >
            <ActiveIcon className={`w-3.5 h-3.5 ${isCopied ? "text-emerald-600" : colorClass} ${isLoading ? "animate-spin" : ""}`} />
            <span className={isCopied ? "text-emerald-600" : ""}>
              {isCopied ? "Copied!" : label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
