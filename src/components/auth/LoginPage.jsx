import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError("")

    try {
      if (isSignUp) {
        await signUp(email.trim(), password)
        setSignUpSuccess(true)
      } else {
        await signIn(email.trim(), password)
      }
    } catch (err) {
      setError(err.message || (isSignUp ? "Sign up failed" : "Sign in failed"))
    } finally {
      setLoading(false)
    }
  }

  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="font-sans font-bold text-2xl text-foreground">Account created</h1>
          <p className="text-muted-foreground text-sm">
            Your account has been created. An administrator will review and approve your access shortly.
          </p>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false)
              setSignUpSuccess(false)
              setPassword("")
            }}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            Sign in
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

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? "Min. 6 characters" : "Your password"}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full"
          >
            {loading
              ? (isSignUp ? "Creating account..." : "Signing in...")
              : (isSignUp ? "Create account" : "Sign in")
            }
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError("")
              setPassword("")
            }}
            className="text-primary hover:underline cursor-pointer font-medium"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  )
}
