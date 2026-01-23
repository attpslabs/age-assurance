'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginButton from '@/components/LoginButton'
import { restoreSession } from '@/lib/atproto'
import { saveSession, getSession } from '@/lib/session'
import { SphereMask } from '@/components/magicui/sphere-mask'
import { Header } from '@/components/Header'

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
        // Check OAuth state for return path (playground vs main)
        if (restored.state?.startsWith('/playground')) {
          router.push('/playground/assure')
        } else {
          router.push('/assure')
        }
        return
      }

      setIsChecking(false)
    }

    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <>
      {/* Sunrise gradient background - only covers hero/sphere area */}
      <div
        className="absolute inset-x-0 top-0 h-[420px] -z-10"
        style={{
          background: 'linear-gradient(to bottom, #16213e 0%, #2d3561 15%, #4a3f6b 30%, #6d5578 45%, #9d6b7a 65%, #e8a87c 100%)'
        }}
      />
      <Header />
      <SphereMask />

      {/* Hero Section */}
      <section className="text-center px-8 -mt-64 relative z-10">
        <h1 className="text-5xl md:text-7xl text-white" style={{ fontFamily: 'var(--font-dm-serif-text)' }}>
          Private<br />
          Age Assurance<br />
          on Bluesky
        </h1>

        <div className="mt-12 max-w-md mx-auto">
          <LoginButton />
        </div>
      </section>

      <div className="flex flex-col items-center p-8 pt-32">
        <main className="flex flex-col items-center gap-8 max-w-md w-full">

        <div className="w-full rounded-xl p-6" style={{ backgroundColor: '#1D1D1F' }}>
          <p className="text-sm text-gray-400 text-center">
            <a
              href="https://self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500"
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
              className="text-orange-500"
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
          <p className="mt-2 font-mono text-xs text-gray-500">"ageAtLeast18": true</p>
        </div>
      </main>

      {/* People Section */}
        <section id="people" className="w-full max-w-2xl mt-24 scroll-mt-24">
          <h2 className="text-4xl md:text-5xl text-white text-center mb-8" style={{ fontFamily: 'var(--font-dm-serif-text)' }}>For People</h2>
          <p className="text-center">
            <a
              href="/playground"
              className="text-orange-500 hover:text-orange-500 text-sm font-medium"
            >
              Try it first in the Playground →
            </a>
          </p>
        </section>

        {/* Apps Section */}
        <section id="apps" className="w-full max-w-2xl mt-24 scroll-mt-24">
          <h2 className="text-4xl md:text-5xl text-white text-center mb-8" style={{ fontFamily: 'var(--font-dm-serif-text)' }}>For Apps</h2>
        </section>

      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>
          Powered by{' '}
          <a
            href="https://self.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-300"
          >
            Self Protocol
          </a>{' '}
          and{' '}
          <a
            href="https://atproto.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-300"
          >
            AT Protocol
          </a>
        </p>
      </footer>
      </div>
    </>
  )
}
