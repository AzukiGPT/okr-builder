import { useState, useEffect } from "react"
import { Building2, Target, Rocket, Palette, ChevronDown, ChevronRight } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { SECTIONS, getActiveSectionForStep } from "../../lib/navigation"

const ICON_MAP = { Building2, Target, Rocket, Palette }

// ── Helpers ──────────────────────────────────────────────────────────

function getInitials(email) {
  if (!email) return "?"
  const parts = email.split("@")[0].split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function resolveActive(activePage, step) {
  if (activePage === "company") return { sectionId: "company" }
  if (activePage === "marketing-assets") return { sectionId: "marketing-assets" }
  return getActiveSectionForStep(step)
}

// ── User Footer ──────────────────────────────────────────────────────

function UserFooter({ saveStatus, onNavigate }) {
  const { user, profile, signOut } = useAuth()
  if (!user) return null

  const statusLabel = {
    idle: "", saving: "Saving...", saved: "\u2713 Saved", error: "\u26a0 Error",
  }[saveStatus] || ""
  const statusColor = {
    saving: "text-amber-500", saved: "text-emerald-500", error: "text-red-500",
  }[saveStatus] || "text-transparent"

  return (
    <div className="px-3 pb-4 space-y-2">
      <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-primary">{getInitials(user.email)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-sidebar-foreground/70 truncate">{user.email}</p>
          <span className={`text-[10px] ${statusColor}`}>{statusLabel}</span>
        </div>
      </div>
      <div className="flex gap-2 pl-9">
        {profile?.role === "admin" && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("/admin")}
            className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
          >
            Admin
          </button>
        )}
        <button
          type="button"
          onClick={signOut}
          className="text-[11px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── Section Item ─────────────────────────────────────────────────────

function SectionItem({ section, isActive, disabled, hasChevron, expanded, onClick }) {
  const Icon = ICON_MAP[section.icon]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all ${
        disabled ? "opacity-40 cursor-default" : "cursor-pointer"
      } ${
        isActive
          ? "bg-primary/10 border-l-2 border-primary ml-0 pl-2.5"
          : "border-l-2 border-transparent hover:bg-sidebar-accent"
      }`}
    >
      {Icon && (
        <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-primary" : "text-sidebar-foreground/50"}`} />
      )}
      <span className={`text-sm flex-1 text-left ${isActive ? "text-sidebar-foreground font-semibold" : "text-sidebar-foreground/70"}`}>
        {section.label}
      </span>
      {section.placeholder && (
        <span className="text-[9px] text-sidebar-foreground/30 font-mono uppercase tracking-wider">soon</span>
      )}
      {hasChevron && !disabled && (
        expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground/40" />
          : <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground/40" />
      )}
    </button>
  )
}

// ── Sub-Page Item ────────────────────────────────────────────────────

function SubPageItem({ subPage, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full pl-10 pr-3 py-1.5 rounded-md transition-all cursor-pointer ${
        isActive ? "bg-primary/5" : "hover:bg-sidebar-accent/50"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-primary" : "bg-sidebar-foreground/20"}`} />
      <span className={`text-[13px] ${isActive ? "text-sidebar-foreground font-semibold" : "text-sidebar-foreground/55"}`}>
        {subPage.label}
      </span>
    </button>
  )
}

// ── Desktop Sidebar ──────────────────────────────────────────────────

function DesktopSidebar({
  step, setStep, activeSetId, activeSetName,
  saveStatus, onNavigate,
  activePage, onSetActivePage,
}) {
  const active = resolveActive(activePage, step)
  const [okrsExpanded, setOkrsExpanded] = useState(true)

  useEffect(() => {
    if (active.sectionId === "okrs") setOkrsExpanded(true)
  }, [active.sectionId])

  function handleSectionClick(section) {
    if (section.id === "company") {
      onSetActivePage("company")
      return
    }
    if (section.id === "okrs") {
      setOkrsExpanded((prev) => !prev)
      if (active.sectionId !== "okrs") {
        setStep(0)
      }
      return
    }
    if (section.placeholder) {
      onSetActivePage(section.id)
      return
    }
    if (section.requiresSet && !activeSetId) return
    if (section.step != null) {
      setStep(section.step)
    }
  }

  function handleSubPageClick(subPage) {
    if (subPage.step != null) {
      setStep(subPage.step)
    }
  }

  return (
    <nav className="w-60 h-screen sticky top-0 border-r border-sidebar-border/50 flex flex-col bg-sidebar">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-sans font-bold text-xl gradient-heading">OKR Builder</h1>
        <p className="text-sidebar-foreground/40 text-xs mt-1 truncate">
          {activeSetName || "OKR Builder"}
        </p>
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

      {/* Sections */}
      <div className="flex-1 flex flex-col gap-0.5 px-2 py-3 overflow-y-auto">
        {SECTIONS.map((section) => {
          const isSectionActive = active.sectionId === section.id
          const hasSubPages = Boolean(section.subPages)
          const sectionDisabled = section.requiresSet && !activeSetId

          return (
            <div key={section.id}>
              <SectionItem
                section={section}
                isActive={isSectionActive && !hasSubPages}
                disabled={sectionDisabled && !hasSubPages}
                hasChevron={hasSubPages}
                expanded={hasSubPages && okrsExpanded}
                onClick={() => handleSectionClick(section)}
              />
              {hasSubPages && okrsExpanded && (
                <div className="mt-0.5 mb-1 space-y-0.5">
                  {section.subPages.map((sub) => (
                    <SubPageItem
                      key={sub.id}
                      subPage={sub}
                      isActive={isSectionActive && active.subPageId === sub.id}
                      onClick={() => handleSubPageClick(sub)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <UserFooter saveStatus={saveStatus} onNavigate={onNavigate} />
    </nav>
  )
}

// ── Mobile Sidebar ───────────────────────────────────────────────────

function MobileSidebar({ step, setStep, activeSetId, activePage, onSetActivePage }) {
  const active = resolveActive(activePage, step)

  function handleTap(section) {
    if (section.id === "company") { onSetActivePage("company"); return }
    if (section.placeholder) { onSetActivePage(section.id); return }
    if (section.subPages) {
      setStep(0)
      return
    }
    if (section.requiresSet && !activeSetId) return
    if (section.step != null) setStep(section.step)
  }

  return (
    <nav className="w-full bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center gap-2 shadow-sm">
      <span className="font-sans font-bold text-sidebar-foreground text-lg mr-3">OKR Builder</span>
      <div className="flex items-center gap-1">
        {SECTIONS.map((section) => {
          const Icon = ICON_MAP[section.icon]
          const isActive = active.sectionId === section.id
          const disabled = section.requiresSet && !activeSetId

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => handleTap(section)}
              disabled={disabled}
              className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                disabled ? "opacity-30 cursor-default" : "cursor-pointer"
              } ${
                isActive
                  ? "bg-primary text-white glow-sm"
                  : "bg-sidebar-accent/50 text-sidebar-foreground/50 hover:bg-sidebar-accent"
              }`}
              title={section.label}
            >
              {Icon && <Icon className="w-4 h-4" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Export ────────────────────────────────────────────────────────────

export default function Sidebar({ mobile, ...props }) {
  if (mobile) return <MobileSidebar {...props} />
  return <DesktopSidebar {...props} />
}
