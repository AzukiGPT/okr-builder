import { Button } from "@/components/ui/button"
import { useAuth } from "../../contexts/AuthContext"

export default function SetSelector({ sets, onLoadSet, onCreateNew, loading, creating, error, onNavigate }) {
  const { user, profile, signOut } = useAuth()

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

              return (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => onLoadSet(set)}
                  className="w-full text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer glass-card group"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {set.name || "Untitled"}
                      </p>
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
                    <div className="text-right shrink-0 ml-4">
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
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
