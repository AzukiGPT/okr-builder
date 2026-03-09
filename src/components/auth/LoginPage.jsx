import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Button } from "@/components/ui/button"

const STATUS = { idle: "idle", sending: "sending", sent: "sent", error: "error" }

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState(STATUS.idle)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    // Preserve shared URL params across auth redirect
    const currentSearch = window.location.search
    if (currentSearch) {
      sessionStorage.setItem("okr-redirect-params", currentSearch)
    }

    setStatus(STATUS.sending)
    setErrorMsg("")

    try {
      await signIn(email.trim())
      setStatus(STATUS.sent)
    } catch (err) {
      setErrorMsg(err.message || "Failed to send magic link")
      setStatus(STATUS.error)
    }
  }

  if (status === STATUS.sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">✉️</div>
          <h1 className="font-sans font-bold text-2xl text-foreground">Check your inbox</h1>
          <p className="text-muted-foreground text-sm">
            We sent a login link to <span className="font-semibold text-foreground">{email}</span>.
            Click the link in the email to sign in.
          </p>
          <button
            type="button"
            onClick={() => setStatus(STATUS.idle)}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-sans font-bold text-3xl gradient-heading">OKR Builder</h1>
          <p className="text-muted-foreground text-sm">
            Build data-driven OKRs for your B2B SaaS team
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {status === STATUS.error && (
            <p className="text-sm text-red-500">{errorMsg}</p>
          )}

          <Button
            type="submit"
            disabled={status === STATUS.sending || !email.trim()}
            className="w-full"
          >
            {status === STATUS.sending ? "Sending..." : "Send magic link"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          No password needed. We'll email you a secure login link.
        </p>
      </div>
    </div>
  )
}
