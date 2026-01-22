'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, clearSession, Session } from '@/lib/session'
import { signOut, restoreSession } from '@/lib/atproto'
import { SelfQRcodeWrapper, SelfAppBuilder } from '@selfxyz/qrcode'
import { logo } from '@/lib/logo'
import { v5 as uuidv5 } from 'uuid'

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

export default function AssurePage() {
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
      router.push('/')
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
      appName: 'ATTPS Age Assurance',
      scope: 'attps-age-assurance',
      endpoint: `${window.location.origin}/api/assure`,
      logoBase64: logo,
      userId: userUuid,
      userIdType: 'uuid',
      disclosures: {
        minimumAge: 18,
      },
      devMode: false, // Production mode - requires real passport
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
      const response = await fetch(`/api/assure?did=${encodeURIComponent(session.did)}&uuid=${encodeURIComponent(userUuid)}`)
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

  // Write attestation to PDS
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
          collection: 'social.attps.assurance.age',
          rkey: 'self',
          record: {
            $type: 'social.attps.assurance.age',
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
  // Fetch the signed attestation from the backend
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center gap-8 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Age Verification
          </h1>
          <p className="text-gray-600">
            Welcome, <span className="font-medium">@{session.handle}</span>
          </p>
        </div>

        <div className="w-full bg-white rounded-xl shadow-lg p-6">
          {status === 'consent' && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Choose Your Attestation
              </h2>
              <p className="text-sm text-gray-600 mb-6 text-center">
                Select what you would like to prove and add to your AT Protocol
                account. This information will be publicly visible.
              </p>
              <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 mb-6">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-800">
                    Prove I am 18 or older
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    Verify your age using your passport via the Self app. Only a
                    cryptographic proof is stored - no personal data.
                  </p>
                </div>
              </label>
              <button
                onClick={handleStartVerification}
                disabled={!consentChecked}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  consentChecked
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Generate QR Code
              </button>
            </>
          )}

          {status === 'scanning' && selfApp && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Verify Your Age
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
              <p className="text-sm text-gray-600 text-center">
                Scan the QR code with the Self app to verify your age using your
                passport. No personal data is stored - only a cryptographic
                proof that you are 18+.
              </p>
            </>
          )}

          {status === 'fetching' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                Getting signed attestation...
              </p>
            </div>
          )}

          {status === 'review' && signedAttestation && (
            <div className="py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
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
              <h2 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                Age Verified!
              </h2>
              <p className="text-sm text-gray-600 mb-4 text-center">
                Review the signed attestation that will be written to your account:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 font-mono text-sm">
                <div className="text-gray-500 mb-2">social.attps.assurance.age</div>
                <pre className="text-gray-800 whitespace-pre-wrap break-all">
{JSON.stringify(
  {
    $type: 'social.attps.assurance.age',
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
              <p className="text-xs text-gray-500 mb-4 text-center">
                This record includes a cryptographic signature from @attps.social
                that proves the attestation is authentic.
              </p>
              <button
                onClick={writeAttestation}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Write to my account
              </button>
            </div>
          )}

          {status === 'writing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                Writing attestation to your account...
              </p>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
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
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                Verification Complete!
              </h2>
              <p className="text-gray-600 mb-4">
                Your age has been verified and the attestation has been written
                to your AT Protocol account.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Apps that trust @attps.social can now verify you are 18+.
              </p>
              <button
                onClick={() => router.push('/manage')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                View & manage your attestations
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
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
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/manage')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage attestations
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  )
}
