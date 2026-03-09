import { useState, useEffect, useCallback } from "react"
import AuthCallback from "./components/auth/AuthCallback"
import AuthGuard from "./components/auth/AuthGuard"
import AdminPanel from "./components/admin/AdminPanel"
import App from "./App"

export default function AppRouter() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const navigate = useCallback((to) => {
    window.history.pushState({}, "", to)
    setPath(to)
  }, [])

  const handleAuthComplete = useCallback(() => {
    window.history.replaceState({}, "", "/")
    setPath("/")
  }, [])

  if (path === "/auth/callback") {
    return <AuthCallback onComplete={handleAuthComplete} />
  }

  if (path === "/admin") {
    return (
      <AuthGuard>
        <AdminPanel onBack={() => navigate("/")} />
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <App onNavigate={navigate} />
    </AuthGuard>
  )
}
