import { useState, useEffect, useCallback } from "react"
import { api } from "../../lib/api"
import { useAuth } from "../../contexts/AuthContext"

function UserRow({ user, onApprove, onReject, busy }) {
  const createdAt = new Date(user.created_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  })

  return (
    <div className="flex items-center justify-between p-4 rounded-xl glass-card">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{user.email}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{createdAt}</span>
          {user.full_name && <span>{user.full_name}</span>}
          {user.company && <span>{user.company}</span>}
        </div>
        <div className="flex gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
            user.is_approved
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-amber-500/10 text-amber-500"
          }`}>
            {user.is_approved ? "approved" : "pending"}
          </span>
          {user.role === "admin" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 font-mono">
              admin
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {!user.is_approved && (
          <button
            type="button"
            onClick={() => onApprove(user.id)}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Approve
          </button>
        )}
        {user.is_approved && user.role !== "admin" && (
          <button
            type="button"
            onClick={() => onReject(user.id)}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminPanel({ onBack }) {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.adminListUsers(filter)
      setUsers(data || [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleApprove = useCallback(async (id) => {
    setBusy(true)
    try {
      await api.adminUpdateUser(id, { is_approved: true })
      await loadUsers()
    } finally {
      setBusy(false)
    }
  }, [loadUsers])

  const handleReject = useCallback(async (id) => {
    setBusy(true)
    try {
      await api.adminUpdateUser(id, { is_approved: false })
      await loadUsers()
    } finally {
      setBusy(false)
    }
  }, [loadUsers])

  if (profile?.role !== "admin") return null

  const pendingCount = users.filter(u => !u.is_approved).length

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-heading">Admin Panel</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage user access to OKR Builder
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            ← Back to app
          </button>
        </div>

        <div className="flex gap-2">
          {[
            { key: "all", label: "All users" },
            { key: "pending", label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filter === key
                  ? "bg-primary text-white"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {filter === "pending" ? "No pending users" : "No users found"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(u => (
              <UserRow
                key={u.id}
                user={u}
                onApprove={handleApprove}
                onReject={handleReject}
                busy={busy}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
