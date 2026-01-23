'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, clearSession, Session } from '@/lib/session'
import { signOut, restoreSession } from '@/lib/atproto'
import { AtpAgent } from '@atproto/api'
import { SphereMask } from '@/components/magicui/sphere-mask'
import { AppHeader } from '@/components/AppHeader'
import Link from 'next/link'

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

export default function AttestationsPage() {
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
    fetchAttestations(currentSession)
  }, [router])

  // Fetch all attestations in the social.attps.assurance.age collection
  const fetchAttestations = useCallback(async (currentSession: Session) => {
    setIsLoading(true)
    setError(null)

    try {
      // Use unauthenticated agent for read-only listRecords (faster, no OAuth init needed)
      const agent = new AtpAgent({ service: currentSession.pdsUrl })
      const response = await agent.com.atproto.repo.listRecords({
        repo: currentSession.did,
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
      {/* Sunrise gradient background - same as homepage */}
      <div
        className="absolute inset-x-0 top-0 h-[420px] -z-10"
        style={{
          background: 'linear-gradient(to bottom, #16213e 0%, #2d3561 15%, #4a3f6b 30%, #6d5578 45%, #9d6b7a 65%, #e8a87c 100%)'
        }}
      />
      <AppHeader />
      <SphereMask />

      {/* Hero Section with title */}
      <section className="text-center px-8 -mt-64 relative z-10">
        <h1 className="text-5xl md:text-7xl text-white" style={{ fontFamily: 'var(--font-dm-serif-text)' }}>
          Attestations
        </h1>
        <p className="text-gray-300 mt-4">
          Welcome, <span className="font-medium text-white">@{session.handle}</span>
        </p>
      </section>

      <div className="flex flex-col items-center p-8 pt-16">
        <main className="flex flex-col items-center gap-8 max-w-lg w-full">

          <div className="w-full bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4 text-center">
              Your Attestations
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-white text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {attestations.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-500"
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
                <p className="text-gray-400 mb-4">No attestations found</p>
                <Link
                  href="/assure"
                  className="text-orange-500 hover:text-orange-400 font-medium"
                >
                  Create an attestation
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {attestations.map((attestation) => (
                  <div
                    key={attestation.uri}
                    className="border border-gray-700 rounded-lg p-4 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
                            {attestation.value.ageAtLeast18 ? '18+' : 'Under 18'}
                          </span>
                          <span className="text-xs text-gray-500">
                            rkey: {attestation.rkey}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-1">
                          <span className="font-medium text-gray-300">Assured at:</span>{' '}
                          {new Date(attestation.value.assuredAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-400 mb-1">
                          <span className="font-medium text-gray-300">Assurer:</span>{' '}
                          <span className="font-mono text-xs break-all">
                            {attestation.value.assurer}
                          </span>
                        </p>
                        {attestation.value.sig && (
                          <p className="text-sm text-orange-400">
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
                        className="flex-shrink-0 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete attestation"
                      >
                        {isDeleting === attestation.rkey ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-400"></div>
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
            <Link
              href="/assure"
              className="text-sm text-orange-500 hover:text-orange-400 font-medium"
            >
              Add attestation
            </Link>
            <span className="text-gray-600">|</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-400 underline"
            >
              Sign out
            </button>
          </div>
        </main>
      </div>
    </>
  )
}
