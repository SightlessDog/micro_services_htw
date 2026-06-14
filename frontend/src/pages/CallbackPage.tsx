import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userManager } from '../lib/oidc'

export function CallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    userManager
      .signinRedirectCallback()
      .then(() => navigate('/products', { replace: true }))
      .catch((err: unknown) => {
        console.error('Sign-in callback failed:', err)
        setError('Sign-in failed. Please try again.')
      })
  }, [navigate])

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      {error ? (
        <p className="text-sm text-red-700 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
          {error}
        </p>
      ) : (
        <p className="font-mono text-sm text-text-muted">
          $ authenticating
          <span className="inline-block w-2 h-3.5 bg-text-muted align-middle ml-2 animate-blink" />
        </p>
      )}
    </div>
  )
}
