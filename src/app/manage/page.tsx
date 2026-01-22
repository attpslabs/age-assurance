'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, clearSession, Session } from '@/lib/session'
import { signOut, restoreSession } from '@/lib/atproto'

interface AgeAttestation {
  uri: string
  cid: string
  rkey: string
  value: {
    $type: string
    subject?: string
    ageAtLeast18: boolean
    assuredAt: string
    assurer: string
    sig?: string
    sigKey?: string
  }
}

export default function ManagePage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [attestations, setAttestations] = useState<AgeAttestation[]>([])
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize session and fetch attestations
  useEffect(() => {
    const currentSession = getSession()
    if (!currentSession) {
      router.push('/')
      return
    }
    setSession(currentSession)
    fetchAttestations(currentSession.did)
  }, [router])

  // Fetch all attestations in the social.attps.assurance.age collection
  const fetchAttestations = useCallback(async (did: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const restored = await restoreSession()
      if (!restored?.agent) {
        throw new Error('Could not restore session')
      }

      const response = await restored.agent.com.atproto.repo.listRecords({
        repo: did,
        collection: 'social.attps.ageassurance',
        limit: 100,
      })

      const records = response.data.records.map((record) => ({
        uri: record.uri,
        cid: record.cid,
        rkey: record.uri.split('/').pop() || '',
        value: record.value as AgeAttestation['value'],
      }))

      setAttestations(records)
    } catch (err) {
      console.error('Failed to fetch attestations:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch attestations'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Delete an attestation
  async function handleDelete(rkey: string) {
    if (!session) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this attestation? This action cannot be undone.'
    )
    if (!confirmed) return

    setIsDeleting(rkey)
    setError(null)

    try {
      const restored = await restoreSession()
      if (!restored?.agent) {
        throw new Error('Could not restore session')
      }

      await restored.agent.com.atproto.repo.deleteRecord({
        repo: session.did,
        collection: 'social.attps.ageassurance',
        rkey,
      })

      // Remove from local state
      setAttestations((prev) => prev.filter((a) => a.rkey !== rkey))
    } catch (err) {
      console.error('Failed to delete attestation:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to delete attestation'
      )
    } finally {
      setIsDeleting(null)
    }
  }

  async function handleSignOut() {
    await signOut()
    clearSession()
    router.push('/')
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
      <main className="flex flex-col items-center gap-8 max-w-lg w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Manage Attestations
          </h1>
          <p className="text-gray-600">
            <span className="font-medium">@{session.handle}</span>
          </p>
        </div>

        <div className="w-full bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Your Attestations
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {attestations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 mb-4">No attestations found</p>
              <button
                onClick={() => router.push('/assure')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create an attestation
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {attestations.map((attestation) => (
                <div
                  key={attestation.uri}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {attestation.value.ageAtLeast18 ? '18+' : 'Under 18'}
                        </span>
                        <span className="text-xs text-gray-500">
                          rkey: {attestation.rkey}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Assured at:</span>{' '}
                        {new Date(attestation.value.assuredAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Assurer:</span>{' '}
                        <span className="font-mono text-xs break-all">
                          {attestation.value.assurer}
                        </span>
                      </p>
                      {attestation.value.sig && (
                        <p className="text-sm text-green-600">
                          <span className="font-medium">Signed:</span>{' '}
                          <span className="text-xs">
                            {attestation.value.sigKey || 'yes'}
                          </span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(attestation.rkey)}
                      disabled={isDeleting === attestation.rkey}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete attestation"
                    >
                      {isDeleting === attestation.rkey ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/assure')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Add attestation
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
