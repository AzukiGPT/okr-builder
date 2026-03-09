import { useAuth } from "../../contexts/AuthContext"
import LoginPage from "./LoginPage"
import PendingApprovalPage from "./PendingApprovalPage"

export default function AuthGuard({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  if (profile && !profile.is_approved) return <PendingApprovalPage />

  return children
}
