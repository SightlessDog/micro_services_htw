import { useState } from 'react'
import { Link } from 'react-router-dom'
import { userManager } from '../lib/oidc'
import { Button } from '../components/ui/Button'

const sessionLines = [
  { type: 'cmd', text: 'crate status' },
  { type: 'out', text: 'storefront   online' },
  { type: 'out', text: 'catalog      synced' },
  { type: 'out', text: 'auth         zitadel · oidc' },
  { type: 'cmd', text: 'whoami' },
  { type: 'out', text: 'guest' },
] as const

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    try {
      await userManager.signinRedirect({ extraQueryParams: { prompt: 'login' } })
    } catch {
      setError('Could not reach the identity provider. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-surface border-r border-border px-12 py-16">
        <Link
          to="/products"
          className="font-mono text-xs font-bold tracking-[0.3em] text-accent uppercase"
        >
          CRATE
        </Link>

        <div className="font-mono text-sm leading-7 space-y-1">
          {sessionLines.map((line, i) =>
            line.type === 'cmd' ? (
              <p key={i} className="text-text">
                <span className="text-text-faint">$</span> {line.text}
              </p>
            ) : (
              <p key={i} className="text-text-muted pl-4">
                {line.text}
              </p>
            ),
          )}
          <p className="text-text">
            <span className="text-text-faint">$</span>{' '}
            <span className="inline-block w-2 h-3.5 bg-text-muted align-middle animate-blink" />
          </p>
        </div>

        <p className="text-xs text-text-faint max-w-xs">
          Terminal-native commerce, for the quiet console.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="card text-center">
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-text-muted">
              You'll be redirected to our identity provider to sign in or create an account.
            </p>

            <Button size="lg" className="w-full mt-8" onClick={handleSignIn} disabled={loading}>
              {loading ? 'Redirecting…' : 'Continue'}
            </Button>

            {error && (
              <p className="mt-4 text-sm text-red-700 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
