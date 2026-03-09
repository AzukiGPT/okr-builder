import { Button } from "@/components/ui/button"
import { useAuth } from "../../contexts/AuthContext"

export default function SetSelector({ sets, onLoadSet, onCreateNew, loading }) {
  const { user, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sans font-bold text-3xl gradient-heading">OKR Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-bold text-lg text-foreground">Your OKR sets</h2>
            <Button onClick={onCreateNew}>+ New set</Button>
          </div>

          {sets.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center glass-card">
              <p className="text-muted-foreground mb-4">
                No OKR sets yet. Create your first one to get started.
              </p>
              <Button onClick={onCreateNew}>Create my first OKR set</Button>
            </div>
          )}

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
                  className="w-full text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all cursor-pointer glass-card"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {set.name || "Untitled"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {objCount} objective{objCount !== 1 ? "s" : ""}
                        {set.ctx?.stage && ` \u00b7 ${set.ctx.stage}`}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(set.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
