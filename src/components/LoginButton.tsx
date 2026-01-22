'use client'

import { useState } from 'react'
import { signIn } from '@/lib/atproto'

const BlueskyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 568 501" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748C507.222 323.8 536.444 388.56 473.333 453.32c-119.86 122.992-172.272-30.859-185.702-70.281-2.462-7.227-3.614-10.608-3.631-7.733-.017-2.875-1.169.506-3.631 7.733-13.43 39.422-65.842 193.273-185.702 70.281-63.111-64.76-33.89-129.52 80.986-149.071-65.72 11.185-139.6-7.295-159.875-79.748C9.945 203.659 0 75.291 0 57.946 0-28.906 76.135-1.612 123.121 33.664Z" fill="#0087FF"/>
  </svg>
)

export default function LoginButton() {
  const [handle, setHandle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!handle.trim()) {
      setError('Please enter your Bluesky handle')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await signIn(handle.trim())
      // signIn will redirect to Bluesky for auth
    } catch (err) {
      console.error('Sign in error:', err)
      const message = err instanceof Error ? err.message : 'Failed to sign in'
      // Don't show error for user-initiated navigation (back button, etc.)
      if (!message.toLowerCase().includes('user navigated')) {
        setError(message)
      }
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto">
      <div className="mb-2">
        <input
          type="text"
          id="handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="you.bsky.social"
          className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white text-center placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-white text-black py-2 px-4 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? 'Connecting...' : <><BlueskyIcon /> Sign in with Bluesky</>}
      </button>

      {error && <p className="text-red-600 text-sm mt-4 text-center">{error}</p>}
    </form>
  )
}
