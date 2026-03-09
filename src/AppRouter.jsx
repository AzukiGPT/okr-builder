import { useState, useEffect, useCallback } from "react"
import AuthCallback from "./components/auth/AuthCallback"
import AuthGuard from "./components/auth/AuthGuard"
import App from "./App"

export default function AppRouter() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const handleAuthComplete = useCallback(() => {
    window.history.replaceState({}, "", "/")
    setPath("/")
  }, [])

  if (path === "/auth/callback") {
    return <AuthCallback onComplete={handleAuthComplete} />
  }

  return (
    <AuthGuard>
      <App />
    </AuthGuard>
  )
}
