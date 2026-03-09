import { useState, useEffect, useCallback } from "react"
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
