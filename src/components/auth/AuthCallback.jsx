import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function AuthCallback({ onComplete }) {
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error: err }) => {
          if (err) {
            setError(err.message)
          } else {
            // Restore shared URL params if they were saved before auth
            const savedParams = sessionStorage.getItem("okr-redirect-params")
            sessionStorage.removeItem("okr-redirect-params")

            if (savedParams) {
              window.history.replaceState({}, "", `/${savedParams}`)
            } else {
              window.history.replaceState({}, "", "/")
            }
            onComplete()
          }
        })
    } else {
      // Hash-based flow (fallback): Supabase client handles it automatically
      // via onAuthStateChange in AuthContext. Just wait.
      const timeout = setTimeout(() => onComplete(), 2000)
      return () => clearTimeout(timeout)
    }
  }, [onComplete])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-semibold">Authentication failed</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => window.location.replace("/")}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  )
}
