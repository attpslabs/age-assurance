'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { restoreSession } from '@/lib/atproto'
import { saveSession } from '@/lib/session'

export default function CallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function processCallback() {
      try {
        // restoreSession() calls client.init() which handles OAuth callbacks
        // from both query params and URL fragments
        const result = await restoreSession()

        if (result) {
          // Save session to sessionStorage
          saveSession({
            did: result.did,
            handle: result.handle,
            pdsUrl: result.pdsUrl,
          })

          // Redirect based on where the user came from (stored in OAuth state)
          if (result.state?.startsWith('/playground')) {
            router.push('/playground/assure')
          } else {
            router.push('/assure')
          }
        } else {
          // No OAuth session, redirect to home
          router.push('/')
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    processCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Authentication Failed
          </h1>
          <p className="text-gray-500 mb-4">{error}</p>
          <a href="/" className="text-blue-600 hover:underline">
            Return to home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Completing authentication...</p>
      </div>
    </div>
  )
}
