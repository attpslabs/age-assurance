'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginButton from '@/components/LoginButton'
import { restoreSession } from '@/lib/atproto'
import { saveSession, getSession } from '@/lib/session'

const StarIcon = () => (
  <svg width="40" height="40" viewBox="0 0 150 148" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 0L76.2683 34.2209C77.0442 55.1571 93.8432 71.9475 114.78 72.7127L150 74L114.78 75.2873C93.8432 76.0525 77.0442 92.8429 76.2683 113.779L75 148L73.7317 113.779C72.9558 92.8429 56.1568 76.0525 35.2202 75.2873L0 74L35.2202 72.7127C56.1568 71.9475 72.9558 55.1571 73.7317 34.2209L75 0Z" fill="currentColor"/>
  </svg>
)

export default function PlaygroundHome() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      // First check if we have a saved session
      const existingSession = getSession()
      if (existingSession) {
        router.push('/playground/assure')
        return
      }

      // Try to restore/complete OAuth session (handles callback automatically)
      const restored = await restoreSession()
      if (restored) {
        saveSession({
          did: restored.did,
          handle: restored.handle,
          pdsUrl: restored.pdsUrl,
        })
        router.push('/playground/assure')
        return
      }

      setIsChecking(false)
    }

    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <>
      {/* Star icon header - same position as main homepage */}
      <header className="w-full py-6 sticky top-0 z-40">
        <div className="flex justify-center">
          <a href="/" className="text-orange-500 hover:text-orange-500 transition-colors">
            <StarIcon />
          </a>
        </div>
      </header>
      <div className="min-h-screen bg-black">
        <div className="flex flex-col items-center p-8 pt-8">
          <main className="flex flex-col items-center gap-8 max-w-md w-full">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl text-white mb-4" style={{ fontFamily: 'var(--font-dm-serif-text)' }}>
                Playground
              </h1>
              <p className="text-gray-400 mb-2">
                Test the age verification flow with a mock passport
              </p>
              <p className="text-gray-400">
                This is for testing only - not a valid verification
              </p>
            </div>

            <div className="w-full max-w-sm">
              <LoginButton />
            </div>

            <div className="w-full rounded-xl p-6" style={{ backgroundColor: '#1D1D1F' }}>
              <h2 className="text-white font-semibold mb-3">How it works</h2>
              <ol className="text-sm text-gray-400 space-y-2 list-decimal pl-5">
                <li>Sign in with your Bluesky account</li>
                <li>
                  Open the Self app on your phone
                  <div className="mt-1">
                    <span className="text-gray-500">Download for </span>
                    <a
                      href="https://apps.apple.com/us/app/self-zk/id6478563710"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:text-orange-500"
                    >
                      iOS
                    </a>
                    <span className="text-gray-500"> or </span>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.proofofpassportapp&pli=1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:text-orange-500"
                    >
                      Android
                    </a>
                  </div>
                </li>
                <li>
                  Use a mock passport to test the verification
                  <div className="mt-1">
                    <span className="text-gray-500">Generate a </span>
                    <a
                      href="https://docs.self.xyz/use-self/using-mock-passports#generating-mock-passport"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:text-orange-500"
                    >
                      mock passport
                    </a>
                  </div>
                </li>
                <li>See the attestation flow in action</li>
              </ol>
              <p className="text-xs text-gray-500 mt-4">
                Test attestations are written to a separate collection and are not valid verifications.
              </p>
            </div>

            <div className="text-center">
              <a
                href="/"
                className="text-orange-500 hover:text-orange-500 text-sm font-medium"
              >
                Go to real verification →
              </a>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
