import { useAuth } from "../../contexts/AuthContext"

export default function PendingApprovalPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
          <span className="text-3xl">⏳</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold gradient-heading">Account pending</h1>
          <p className="text-muted-foreground mt-2">
            Your account <strong className="text-foreground">{user?.email}</strong> has been created
            but needs to be approved by an administrator before you can access OKR Builder.
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 text-sm text-muted-foreground">
          You'll be able to access the app once an admin approves your account.
          Try refreshing this page later.
        </div>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={signOut}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
