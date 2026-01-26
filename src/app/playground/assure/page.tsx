'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, clearSession, Session } from '@/lib/session'
import { signOut, restoreSession } from '@/lib/atproto'
import { SelfQRcodeWrapper, SelfAppBuilder } from '@selfxyz/qrcode'
import { logo } from '@/lib/logo'
import { v5 as uuidv5 } from 'uuid'
import { AppHeader } from '@/components/AppHeader'
import Link from 'next/link'

// Namespace UUID for generating deterministic UUIDs from DIDs
const DID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8' // DNS namespace

type VerificationStatus = 'idle' | 'consent' | 'scanning' | 'fetching' | 'review' | 'writing' | 'done' | 'error'

// Signed attestation from the backend
interface SignedAttestation {
  subject: string
  ageAtLeast18: boolean
  assuredAt: string
  assurer: string
  sig: string
  sigKey: string
}

// API response type
interface AttestationResponse {
  success: boolean
  attestation?: SignedAttestation
  error?: string
}

export default function PlaygroundAssurePage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const [selfApp, setSelfApp] = useState<ReturnType<
    typeof SelfAppBuilder.prototype.build
  > | null>(null)
  const [signedAttestation, setSignedAttestation] = useState<SignedAttestation | null>(null)

  // Initialize session
  useEffect(() => {
    const currentSession = getSession()
    if (!currentSession) {
      router.push('/playground')
      return
    }
    setSession(currentSession)
    setIsLoading(false)
    setStatus('consent')
  }, [router])

  // Initialize Self app and start scanning
  function handleStartVerification() {
    if (!session || !consentChecked) return

    // Generate a deterministic UUID from the DID for Self SDK
    const userUuid = uuidv5(session.did, DID_NAMESPACE)

    const app = new SelfAppBuilder({
      appName: 'ATTPS Age Assurance (Test)',
      scope: 'attps-age-assurance-playground',
      endpoint: `${window.location.origin}/api/playground/assure`,
      logoBase64: logo,
      userId: userUuid,
      userIdType: 'uuid',
      disclosures: {
        minimumAge: 18,
      },
      devMode: true, // TEST MODE - uses mock passports
    }).build()

    setSelfApp(app)
    setStatus('scanning')
  }

  // Fetch signed attestation from backend
  const fetchSignedAttestation = useCallback(async () => {
    if (!session) return

    setStatus('fetching')

    try {
      // Generate the same UUID that was used for Self SDK
      const userUuid = uuidv5(session.did, DID_NAMESPACE)
      const response = await fetch(`/api/playground/assure?did=${encodeURIComponent(session.did)}&uuid=${encodeURIComponent(userUuid)}`)
      const data: AttestationResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get signed attestation')
      }

      if (data.attestation) {
        setSignedAttestation(data.attestation)
      }
      setStatus('review')
    } catch (err) {
      console.error('Failed to fetch signed attestation:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to get signed attestation'
      )
      setStatus('error')
    }
  }, [session])

  // Write attestation to PDS (test collection)
  const writeAttestation = useCallback(
    async () => {
      if (!session || !signedAttestation) return

      setStatus('writing')

      try {
        // Get a fresh agent with valid session
        const restored = await restoreSession()
        if (!restored?.agent) {
          throw new Error('Could not restore session')
        }

        await restored.agent.com.atproto.repo.putRecord({
          repo: session.did,
          collection: 'social.attps.ageassurance.test',
          rkey: 'self',
          record: {
            $type: 'social.attps.ageassurance.test',
            subject: signedAttestation.subject,
            ageAtLeast18: signedAttestation.ageAtLeast18,
            assuredAt: signedAttestation.assuredAt,
            assurer: signedAttestation.assurer,
            sig: signedAttestation.sig,
            sigKey: signedAttestation.sigKey,
          },
        })

        setStatus('done')
      } catch (err) {
        console.error('Failed to write attestation:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to write attestation'
        )
        setStatus('error')
      }
    },
    [session, signedAttestation]
  )

  // Handle Self verification success
  const handleSelfSuccess = useCallback(() => {
    fetchSignedAttestation()
  }, [fetchSignedAttestation])

  async function handleSignOut() {
    await signOut()
    clearSession()
    router.push('/')
  }

  function handleRetry() {
    setError(null)
    setSelfApp(null)
    setSignedAttestation(null)
    setConsentChecked(false)
    setStatus('consent')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <AppHeader variant="dark" />

      {/* Hero Section with title - positioned same as /assure and /attestations */}
      <section className="text-center px-8 pt-48 relative z-10">
        <h1 className="text-5xl md:text-7xl text-white" style={{ fontFamily: 'var(--font-dm-serif-text)' }}>
          Test Playground
        </h1>
        <p className="mt-4" style={{ color: '#F5F5F7' }}>
          Welcome, <span className="font-medium text-white">@{session.handle}</span>
        </p>
      </section>

      <div className="flex flex-col items-center p-8 pt-16 bg-black min-h-screen">
        <main className="flex flex-col items-center gap-8 max-w-md w-full">
          <div className="w-full rounded-xl shadow-lg p-6" style={{ backgroundColor: '#1D1D1F' }}>
            {status === 'consent' && (
              <>
                <h2 className="text-lg font-semibold text-white mb-4 text-center">
                  Test Attestation
                </h2>
                <div className="bg-yellow-500/10 rounded-lg p-3 mb-4">
                  <p className="text-yellow-500 text-lg text-center">
                    This is a test flow using mock passports. The attestation will be written to a test collection.
                  </p>
                </div>
                <label className="flex items-start gap-3 p-4 rounded-lg cursor-pointer hover:bg-gray-800 mb-6">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500 bg-gray-800"
                  />
                  <div>
                    <span className="font-medium text-white">
                      Test: Prove I am 18 or older
                    </span>
                    <p className="text-lg text-gray-500 mt-1">
                      Use a mock passport in the Self app to test the verification flow.
                    </p>
                  </div>
                </label>
                <button
                  onClick={handleStartVerification}
                  disabled={!consentChecked}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    consentChecked
                      ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Generate QR Code
                </button>
              </>
            )}

            {status === 'scanning' && selfApp && (
              <>
                <h2 className="text-lg font-semibold text-white mb-4 text-center">
                  Scan with Self App
                </h2>
                <div className="flex justify-center mb-4">
                  <SelfQRcodeWrapper
                    selfApp={selfApp}
                    onSuccess={handleSelfSuccess}
                    onError={(error) => {
                      console.error('Self QR error:', error)
                      setError(
                        error?.reason || error?.error_code || 'Verification failed'
                      )
                      setStatus('error')
                    }}
                    size={250}
                  />
                </div>
                <p className="text-lg text-gray-400 text-center">
                  Open the Self app and scan the QR code. Use a{' '}
                  <a
                    href="https://docs.self.xyz/use-self/using-mock-passports#generating-mock-passport"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:text-orange-500"
                  >
                    mock passport
                  </a>{' '}
                  to test the flow.
                </p>
              </>
            )}

            {status === 'fetching' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">
                  Getting test attestation...
                </p>
              </div>
            )}

            {status === 'review' && signedAttestation && (
              <div className="py-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-yellow-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2 text-center">
                  Test Verified!
                </h2>
                <p className="text-lg text-gray-400 mb-4 text-center">
                  Review the test attestation that will be written:
                </p>
                <div className="bg-gray-800 rounded-lg p-4 mb-4 font-mono text-sm">
                  <div className="text-yellow-500 mb-2">social.attps.ageassurance.test</div>
                  <pre className="text-gray-300 whitespace-pre-wrap break-all">
{JSON.stringify(
  {
    $type: 'social.attps.ageassurance.test',
    subject: signedAttestation.subject,
    ageAtLeast18: signedAttestation.ageAtLeast18,
    assuredAt: signedAttestation.assuredAt,
    assurer: signedAttestation.assurer,
    sig: signedAttestation.sig.slice(0, 20) + '...',
    sigKey: signedAttestation.sigKey,
  },
  null,
  2
)}
                  </pre>
                </div>
                <p className="text-lg text-gray-500 mb-4 text-center">
                  This is a TEST attestation and is NOT a valid age verification.
                </p>
                <button
                  onClick={writeAttestation}
                  className="w-full bg-yellow-500 text-black py-3 px-4 rounded-lg font-medium hover:bg-yellow-400 transition-colors"
                >
                  Write test attestation
                </button>
              </div>
            )}

            {status === 'writing' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">
                  Writing test attestation...
                </p>
              </div>
            )}

            {status === 'done' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-yellow-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Test Complete!
                </h2>
                <p className="text-gray-400 mb-4">
                  The test attestation has been written to your account.
                </p>
                <div className="bg-yellow-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-500 text-lg font-medium mb-2">
                    This is NOT a valid verification
                  </p>
                  <p className="text-gray-400 text-lg">
                    To complete a real age verification, go to the main page and use your real passport.
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-block bg-orange-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-400 transition-colors"
                >
                  Complete real verification →
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-red-500 mb-2">
                  Test Failed
                </h2>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={handleRetry}
                  className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          <div className="w-full rounded-xl p-6" style={{ backgroundColor: '#1D1D1F' }}>
            <h2 className="text-white font-semibold mb-3">How it works</h2>
            <ol className="text-lg text-gray-400 space-y-2 list-decimal pl-5">
              <li className="line-through text-gray-500">Sign in with your Bluesky account</li>
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
            <p className="text-lg text-gray-500 mt-4">
              Test attestations are written to a separate collection and are not valid verifications.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-lg text-orange-500 hover:text-orange-500 font-medium"
            >
              Real verification
            </Link>
            <span className="text-gray-500">|</span>
            <button
              onClick={handleSignOut}
              className="text-lg text-gray-500 hover:text-gray-400 underline"
            >
              Sign out
            </button>
          </div>
        </main>
      </div>
    </>
  )
}
