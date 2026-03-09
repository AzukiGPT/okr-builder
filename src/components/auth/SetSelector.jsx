import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "../../contexts/AuthContext"
import { Trash2, Pencil, Check, X } from "lucide-react"

export default function SetSelector({
  sets, onLoadSet, onCreateNew, onDeleteSet, onRenameSet,
  loading, creating, error, onNavigate,
}) {
  const { user, profile, signOut } = useAuth()
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const handleStartRename = useCallback((e, set) => {
    e.stopPropagation()
    setEditingId(set.id)
    setEditName(set.name || "")
  }, [])

  const handleConfirmRename = useCallback(async (e) => {
    e.stopPropagation()
    if (!editName.trim()) return
    await onRenameSet(editingId, editName.trim())
    setEditingId(null)
  }, [editingId, editName, onRenameSet])

  const handleCancelRename = useCallback((e) => {
    e.stopPropagation()
    setEditingId(null)
  }, [])

  const handleDeleteClick = useCallback((e, id) => {
    e.stopPropagation()
    setConfirmDeleteId(id)
  }, [])

  const handleConfirmDelete = useCallback(async (e) => {
    e.stopPropagation()
    setDeleting(true)
    try {
      await onDeleteSet(confirmDeleteId)
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }, [confirmDeleteId, onDeleteSet])

  const handleCancelDelete = useCallback((e) => {
    e.stopPropagation()
    setConfirmDeleteId(null)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-sans font-bold text-2xl gradient-heading">OKR Builder</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {profile?.role === "admin" && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("/admin")}
                className="text-xs text-violet-500 hover:text-violet-400 transition-colors cursor-pointer font-medium"
              >
                Admin
              </button>
            )}
            <button
              type="button"
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-sans font-bold text-lg text-foreground">Your OKR sets</h2>
          <Button onClick={onCreateNew} disabled={creating}>
            {creating ? "Creating..." : "+ New set"}
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {sets.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-3xl">🎯</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">No OKR sets yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first set to start building data-driven OKRs.
              </p>
            </div>
            <Button onClick={onCreateNew} disabled={creating} size="lg">
              {creating ? "Creating..." : "Create my first OKR set"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sets.map((set) => {
              const objCount = (set.selected?.sales?.length || 0)
                + (set.selected?.marketing?.length || 0)
                + (set.selected?.csm?.length || 0)
              const isEditing = editingId === set.id
              const isConfirmingDelete = confirmDeleteId === set.id

              return (
                <div
                  key={set.id}
                  className="relative rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all glass-card group"
                >
                  {isConfirmingDelete && (
                    <div className="absolute inset-0 z-10 rounded-xl bg-card/95 backdrop-blur-sm flex items-center justify-center gap-3 p-4">
                      <p className="text-sm text-foreground font-medium">Delete this set?</p>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleting}
                        onClick={handleConfirmDelete}
                      >
                        {deleting ? "..." : "Delete"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelDelete}>
                        Cancel
                      </Button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => !isEditing && onLoadSet(set)}
                    className="w-full text-left p-5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleConfirmRename(e)
                                if (e.key === "Escape") handleCancelRename(e)
                              }}
                              className="flex-1 text-sm font-semibold bg-background border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleConfirmRename}
                              className="p-1 rounded hover:bg-emerald-100 text-emerald-600 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelRename}
                              className="p-1 rounded hover:bg-gray-100 text-muted-foreground cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {set.name || "Untitled"}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          {objCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                              {objCount} obj.
                            </span>
                          )}
                          {set.ctx?.stage && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 font-mono">
                              {set.ctx.stage.split(" ")[0]}
                            </span>
                          )}
                          {set.ctx?.company && (
                            <span className="text-xs text-muted-foreground truncate">
                              {set.ctx.company}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {!isEditing && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(e, set)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Rename"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(e, set.id)}
                              className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(set.updated_at).toLocaleDateString("fr-FR", {
                              day: "numeric", month: "short",
                            })}
                          </p>
                          <span className="text-muted-foreground/40 group-hover:text-primary transition-colors text-lg">
                            →
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
