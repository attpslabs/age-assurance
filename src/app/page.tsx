'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginButton from '@/components/LoginButton'
import { restoreSession } from '@/lib/atproto'
import { saveSession, getSession } from '@/lib/session'

export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      // First check if we have a saved session
      const existingSession = getSession()
      if (existingSession) {
        router.push('/assure')
        return
      }

      // Try to restore/complete OAuth session (handles callback automatically)
      // This also processes OAuth callbacks from URL fragment params
      const restored = await restoreSession()
      if (restored) {
        saveSession({
          did: restored.did,
          handle: restored.handle,
          pdsUrl: restored.pdsUrl,
        })
        router.push('/assure')
        return
      }

      setIsChecking(false)
    }

    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center gap-8 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ATTPS Age Assurance
          </h1>
          <p className="text-gray-600">
            Verify your age once, use it everywhere on the AT Protocol network.
          </p>
        </div>

        <div className="w-full bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            Sign in with your Bluesky account
          </h2>
          <LoginButton />
        </div>

        <div className="w-full bg-gray-50 rounded-xl p-6">
          <p className="text-sm text-gray-600 text-center">
            <a
              href="https://self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Self
            </a>{' '}
            generates a zero-knowledge proof (ZKP) that verifies identity
            attributes, without exposing personal information. It&apos;s fast,
            secure, and completely private.
          </p>
          <p className="text-sm text-gray-500 text-center mt-3">
            <a
              href="https://map.self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Country coverage map
            </a>{' '}
            — see supported documents and countries.
          </p>
        </div>

        <div className="text-center text-sm text-gray-500 max-w-sm">
          <p>
            Your age verification is stored as an attestation in your AT Protocol
            repository. No personal data is shared.
          </p>
        </div>
      </main>

      <footer className="mt-16 text-center text-sm text-gray-400">
        <p>
          Powered by{' '}
          <a
            href="https://self.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            Self Protocol
          </a>{' '}
          and{' '}
          <a
            href="https://atproto.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            AT Protocol
          </a>
        </p>
      </footer>
    </div>
  )
}
