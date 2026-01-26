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
          <p className="text-lg text-gray-400 mt-16 text-center">
            Powered by{' '}
            <a href="https://self.xyz" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
              Self Protocol
            </a>
            {' '}and{' '}
            <a href="https://atproto.com" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
              AT Protocol
            </a>
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-8 pt-64 pb-16 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-center">
          {/* Steps - Left Side */}
          <div className="flex-1">
            <div className="flex flex-col gap-0">
              {/* Step 1 */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center text-gray-400 font-medium">
                    1
                  </div>
                  <div className="w-px h-44 bg-gray-600"></div>
                </div>
                <div className="pt-2">
                  <p className="text-gray-300 text-lg">
                    Download the free Self app
                  </p>
                  {/* Self App Info */}
                  <div className="flex items-center gap-3 mt-4">
                    <img
                      src="/assets/selfappicon.svg"
                      alt="Self App Icon"
                      className="w-[68px] h-[68px] rounded-xl"
                    />
                    <div>
                      <p className="text-white font-semibold text-lg -mt-1">Self - zk Passport &amp; Identity</p>
                      <div className="flex gap-2 mt-1">
                        <a
                          href="https://apps.apple.com/us/app/self-zk-passport-identity/id6478563710"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src="/assets/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg"
                            alt="Download on the App Store"
                            className="h-10"
                          />
                        </a>
                        <a
                          href="https://play.google.com/store/apps/details?id=xyz.self.selfapp"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src="/assets/GetItOnGooglePlay_Badge_Web_color_English.svg"
                            alt="Get it on Google Play"
                            className="h-10"
                          />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center text-gray-400 font-medium">
                    2
                  </div>
                  <div className="w-px h-44 bg-gray-600"></div>
                </div>
                <div className="pt-2">
                  <p className="text-gray-300 text-lg">
                    Follow the Self app instructions
                  </p>
                  <p className="text-gray-400 text-lg mt-4">
                    Your phone must be able to read NFC chips (most do). Ensure the required icon <img src="/assets/epassport-icon.svg" alt="ePassport Icon" className="inline-block w-7 h-7 mx-1 align-middle" /> is visible on your <a href="https://map.self.xyz" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">supported</a> passport or ID; the verification won&apos;t work without it.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center text-gray-400 font-medium">
                    3
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-gray-300 text-lg">
                    Scan the QR code on this site
                  </p>
                  <p className="text-gray-400 text-lg mt-4">
                    Sign in with Bluesky and scan the QR code on this site to verify your age. No personal data is shared, only whether your age is at least 18 or not.
                  </p>
                  <p className="font-mono text-lg text-gray-500 mt-2">&quot;ageAtLeast18&quot;: true</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box - Right Side */}
          <div className="flex-1 lg:max-w-md">
            <div className="rounded-xl p-8" style={{ backgroundColor: '#1D1D1F' }}>
              <h3 className="text-xl text-white font-semibold mb-2">Why we use Self</h3>
              <p className="text-lg text-gray-400 mb-4">It&apos;s fast, secure, and completely private.</p>
              <p className="text-lg text-gray-400 mb-4">
                Zero-knowledge (zk) technology ensures that nobody, not even the developers of Self protocol, have access to peoples private information.
              </p>
              <p className="text-lg text-gray-400 leading-relaxed">
                Self is a privacy-first, audited, open-source identity protocol that uses zero-knowledge proofs for secure identity verification.
              </p>
              {/* Self App Screenshot - peeking from bottom */}
              <div className="relative mt-6 -mb-8 flex justify-center">
                <img
                  src="/assets/selfapp.png"
                  alt="Self App"
                  className="w-64 rounded-t-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col items-center p-8 pt-8">
      {/* People Section */}
        <section id="people" className="w-full max-w-2xl mt-24 scroll-mt-24">
          <h2 className="text-4xl md:text-5xl text-white text-center mb-8" style={{ fontFamily: 'var(--font-dm-serif-text)' }}>For People</h2>
          <p className="text-lg text-gray-400 mb-6 text-center">
            You verify your identity by scanning a biometric passport or ID and selectively disclose unique attributes, such as age, while remaining fully anonymous. Nothing can ever be shared without your explicit consent.
          </p>
          <p className="text-center">
            <a
              href="/playground"
              className="text-orange-500 hover:text-orange-500 text-lg font-medium"
            >
              Try it first in the Playground →
            </a>
          </p>
        </section>

        {/* Apps Section */}
        <section id="apps" className="w-full max-w-2xl mt-24 scroll-mt-24">
          <h2 className="text-4xl md:text-5xl text-white text-center mb-8" style={{ fontFamily: 'var(--font-dm-serif-text)' }}>For Apps</h2>
          <p className="text-lg text-gray-400 text-center">
            Personal data is never stored by any party, and therefore, impossible to leak. Apps can confirm a user&apos;s age instantly and without storing any personal data. Apps that trust ATTPS can query our signature to verify that the attestation is valid.
          </p>
          <p className="text-center mt-6">
            <a
              href="https://github.com/attpslabs/age-assurance?tab=readme-ov-file#verifying-attestations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-500 text-lg font-medium"
            >
              Verify attestations →
            </a>
          </p>
        </section>
      </div>
    </>
  )
}
